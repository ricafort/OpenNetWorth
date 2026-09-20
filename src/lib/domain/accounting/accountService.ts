/**
 * Milestone 1 Account & Entity Management Service
 * 
 * Why this file exists:
 * Provides transactional domain services to create, list, and update sovereign financial entities
 * (persons, households, businesses, trusts) and double-entry financial accounts.
 * When an account is created with an opening balance, this service atomically generates
 * and commits a balanced double-entry opening balance transaction with an explicit
 * `Opening Balance Equity` counterpart (M1-FLOW-01, T1).
 * 
 * Tricky logic:
 * - Opening balance posting parity:
 *   * For Assets: Debit Asset (+amount_cents), Credit Opening Balance Equity (-amount_cents).
 *   * For Liabilities: Credit Liability (-amount_cents), Debit Opening Balance Equity (+amount_cents).
 *   Both satisfy: Sum(amount_cents) = 0.
 * - Idempotent equity account lookup: If the entity doesn't have an 'Opening Balance Equity' account yet,
 *   we auto-provision one deterministically for that entity and currency.
 * - Optimistic concurrency control (M1-SAFE-06): Updates require `expected_revision` and increment `revision + 1`.
 *   If the row in SQLite has already been incremented by another operation, the update updates 0 rows
 *   and throws a ConflictError.
 * 
 * TODO: Support automated multi-entity ownership splits on account creation in Slice 1D.
 */

import Database from 'better-sqlite3';
import {
    Account,
    AccountOwnership,
    AccountSubType,
    AccountType,
    CurrencyCode,
    Entity,
    EntityType,
    Posting,
    TrackingMode,
    Transaction,
    assertValidMoneyCents,
    validateTransactionBalance
} from './types';

export interface CreateEntityInput {
    id?: string;
    name: string;
    type: EntityType;
    currency: CurrencyCode;
    parent_entity_id?: string | null;
}

export interface CreateAccountInput {
    id?: string;
    entity_id: string;
    name: string;
    type: AccountType;
    sub_type: AccountSubType;
    currency: CurrencyCode;
    institution?: string | null;
    account_number_mask?: string | null;
    opening_date?: string | null; // YYYY-MM-DD
    opening_balance_cents?: number | null; // Integer cents
    tracking_mode?: TrackingMode;
}

export interface UpdateAccountInput {
    name?: string;
    sub_type?: AccountSubType;
    institution?: string | null;
    account_number_mask?: string | null;
    is_active?: boolean;
    tracking_mode?: TrackingMode;
}

export class ConflictError extends Error {
    constructor(message: string) {
        super(message);
        this.name = 'ConflictError';
    }
}

export class ValidationError extends Error {
    constructor(message: string) {
        super(message);
        this.name = 'ValidationError';
    }
}

/**
 * Creates an entity (Person, Household, Business, Trust).
 */
export function createEntity(db: Database.Database, input: CreateEntityInput): Entity {
    if (!input.name || input.name.trim().length === 0) {
        throw new ValidationError('Entity name is required and cannot be blank.');
    }
    const validTypes: EntityType[] = ['person', 'household', 'business', 'trust'];
    if (!validTypes.includes(input.type)) {
        throw new ValidationError(`Invalid entity type: ${input.type}. Must be one of: ${validTypes.join(', ')}`);
    }
    const currency = (input.currency || 'USD').toUpperCase();
    const id = input.id || crypto.randomUUID();
    const now = new Date().toISOString();

    const stmt = db.prepare(`
        INSERT INTO m1_entities (id, name, type, currency, parent_entity_id, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?)
    `);
    stmt.run(id, input.name.trim(), input.type, currency, input.parent_entity_id || null, now, now);

    return {
        id,
        name: input.name.trim(),
        type: input.type,
        currency,
        parent_entity_id: input.parent_entity_id || null,
        created_at: now,
        updated_at: now
    };
}

/**
 * Lists all entities in the ledger.
 */
export function listEntities(db: Database.Database): Entity[] {
    const rows = db.prepare('SELECT * FROM m1_entities ORDER BY name ASC').all() as any[];
    return rows.map(r => ({
        id: r.id,
        name: r.name,
        type: r.type,
        currency: r.currency,
        parent_entity_id: r.parent_entity_id,
        created_at: r.created_at,
        updated_at: r.updated_at
    }));
}

/**
 * Retrieves an entity by ID.
 */
export function getEntity(db: Database.Database, id: string): Entity | null {
    const row = db.prepare('SELECT * FROM m1_entities WHERE id = ?').get(id) as any;
    if (!row) return null;
    return {
        id: row.id,
        name: row.name,
        type: row.type,
        currency: row.currency,
        parent_entity_id: row.parent_entity_id,
        created_at: row.created_at,
        updated_at: row.updated_at
    };
}

/**
 * Ensures an 'Opening Balance Equity' account exists for the given entity and currency.
 */
function ensureOpeningEquityAccount(db: Database.Database, entityId: string, currency: CurrencyCode): Account {
    const existing = db.prepare(`
        SELECT * FROM m1_accounts
        WHERE entity_id = ? AND type = 'equity' AND sub_type = 'opening_balance_equity' AND currency = ?
    `).get(entityId, currency) as any;

    if (existing) {
        return {
            id: existing.id,
            entity_id: existing.entity_id,
            name: existing.name,
            type: existing.type,
            sub_type: existing.sub_type,
            currency: existing.currency,
            is_active: Boolean(existing.is_active),
            institution: existing.institution,
            account_number_mask: existing.account_number_mask,
            opening_date: existing.opening_date,
            opening_balance_cents: existing.opening_balance_cents,
            revision: existing.revision,
            created_at: existing.created_at,
            updated_at: existing.updated_at
        };
    }

    const id = `acc-equity-${entityId}-${currency.toLowerCase()}`;
    const now = new Date().toISOString();
    db.prepare(`
        INSERT INTO m1_accounts (id, entity_id, name, type, sub_type, currency, is_active, revision, created_at, updated_at)
        VALUES (?, ?, 'Opening Balance Equity', 'equity', 'opening_balance_equity', ?, 1, 1, ?, ?)
    `).run(id, entityId, currency, now, now);

    return {
        id,
        entity_id: entityId,
        name: 'Opening Balance Equity',
        type: 'equity',
        sub_type: 'opening_balance_equity',
        currency,
        is_active: true,
        revision: 1,
        created_at: now,
        updated_at: now
    };
}

/**
 * Creates a financial account, optionally posting a balanced opening balance entry.
 * 
 * Why this exists:
 * Implements M1-DOM-02 and M1-FLOW-01. Guarantees that opening balances create
 * a balanced double-entry record atomically, ensuring immediate agreement between
 * account balances, opening equity, and net worth.
 */
export function createAccount(db: Database.Database, input: CreateAccountInput): { account: Account; openingTransaction?: Transaction } {
    if (!input.name || input.name.trim().length === 0) {
        throw new ValidationError('Account name is required and cannot be blank.');
    }
    const entity = getEntity(db, input.entity_id);
    if (!entity) {
        throw new ValidationError(`Entity not found with ID: ${input.entity_id}`);
    }

    const validTypes: AccountType[] = ['asset', 'liability', 'equity', 'income', 'expense', 'suspense'];
    if (!validTypes.includes(input.type)) {
        throw new ValidationError(`Invalid account type: ${input.type}. Must be one of: ${validTypes.join(', ')}`);
    }

    const currency = input.currency.toUpperCase();
    const accountId = input.id || crypto.randomUUID();
    const now = new Date().toISOString();

    const hasOpeningBalance = input.opening_balance_cents !== undefined &&
        input.opening_balance_cents !== null &&
        input.opening_balance_cents !== 0;

    if (hasOpeningBalance) {
        assertValidMoneyCents(input.opening_balance_cents!, 'Opening balance cents');
        if (!input.opening_date || !/^\d{4}-\d{2}-\d{2}$/.test(input.opening_date)) {
            throw new ValidationError('A valid opening date (YYYY-MM-DD) is required when specifying an opening balance.');
        }
    }

    let createdAccount: Account;
    let createdTx: Transaction | undefined;

    // Atomic SQLite transaction enclosing account creation and opening balance posting
    const tx = db.transaction(() => {
        // 1. Insert Account
        const trackingMode = input.tracking_mode || 'transactions';
        const subType = input.sub_type || (
            input.type === 'asset' ? 'checking' :
            input.type === 'liability' ? 'credit_card' :
            input.type === 'equity' ? 'opening_balance_equity' : 'other'
        );
        db.prepare(`
            INSERT INTO m1_accounts (
                id, entity_id, name, type, sub_type, currency, is_active,
                institution, account_number_mask, opening_date, opening_balance_cents,
                tracking_mode, balance_revision, revision, created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, 1, ?, ?, ?, ?, ?, 1, 1, ?, ?)
        `).run(
            accountId,
            input.entity_id,
            input.name.trim(),
            input.type,
            subType,
            currency,
            input.institution || null,
            input.account_number_mask || null,
            input.opening_date || null,
            hasOpeningBalance ? input.opening_balance_cents : null,
            trackingMode,
            now,
            now
        );

        createdAccount = {
            id: accountId,
            entity_id: input.entity_id,
            name: input.name.trim(),
            type: input.type,
            sub_type: input.sub_type,
            currency,
            is_active: true,
            institution: input.institution || null,
            account_number_mask: input.account_number_mask || null,
            opening_date: input.opening_date || null,
            opening_balance_cents: hasOpeningBalance ? input.opening_balance_cents : null,
            tracking_mode: trackingMode,
            balance_revision: 1,
            revision: 1,
            created_at: now,
            updated_at: now
        };

        // 2. If opening balance provided, post balanced double-entry transaction (M1-FLOW-01, T1)
        if (hasOpeningBalance) {
            const equityAccount = ensureOpeningEquityAccount(db, input.entity_id, currency);
            const txId = `tx-open-${accountId}`;
            const txDate = input.opening_date!;
            const balanceCents = input.opening_balance_cents!;

            // Calculate postings according to normal balance:
            // Asset (+balance Debit, -balance Equity Credit)
            // Liability (-balance Credit, +balance Equity Debit)
            const isAsset = input.type === 'asset';
            const accountLegCents = isAsset ? balanceCents : -balanceCents;
            const equityLegCents = isAsset ? -balanceCents : balanceCents;

            const postings: Posting[] = [
                {
                    id: `post-acc-${accountId}`,
                    transaction_id: txId,
                    account_id: accountId,
                    amount_cents: accountLegCents,
                    currency,
                    memo: `Opening Balance for ${input.name.trim()}`
                },
                {
                    id: `post-eq-${accountId}`,
                    transaction_id: txId,
                    account_id: equityAccount.id,
                    amount_cents: equityLegCents,
                    currency,
                    memo: `Opening Balance Offset for ${input.name.trim()}`
                }
            ];

            // Verify invariant: Sum must be 0
            validateTransactionBalance(postings);

            db.prepare(`
                INSERT INTO m1_transactions (
                    id, date, description, status, origin, idempotency_key, revision, created_at, updated_at
                ) VALUES (?, ?, ?, 'posted', 'opening_balance', ?, 1, ?, ?)
            `).run(
                txId,
                txDate,
                `Opening Balance - ${input.name.trim()}`,
                `idemp-open-${accountId}`,
                now,
                now
            );

            const insertPosting = db.prepare(`
                INSERT INTO m1_journal_entries (id, transaction_id, account_id, amount_cents, currency, memo)
                VALUES (?, ?, ?, ?, ?, ?)
            `);

            for (const p of postings) {
                insertPosting.run(p.id, p.transaction_id, p.account_id, p.amount_cents, p.currency, p.memo || null);
            }

            createdTx = {
                id: txId,
                date: txDate,
                description: `Opening Balance - ${input.name.trim()}`,
                status: 'posted',
                origin: 'opening_balance',
                idempotency_key: `idemp-open-${accountId}`,
                revision: 1,
                created_at: now,
                updated_at: now
            };
        }
    });

    tx();
    return { account: createdAccount!, openingTransaction: createdTx };
}

/**
 * Updates an account with optimistic concurrency revision checking (M1-SAFE-06).
 */
export function updateAccount(
    db: Database.Database,
    accountId: string,
    expectedRevision: number,
    updates: UpdateAccountInput
): Account {
    const existing = db.prepare('SELECT * FROM m1_accounts WHERE id = ?').get(accountId) as any;
    if (!existing) {
        throw new ValidationError(`Account not found with ID: ${accountId}`);
    }

    const now = new Date().toISOString();
    const newName = updates.name !== undefined ? updates.name.trim() : existing.name;
    const newSubType = updates.sub_type !== undefined ? updates.sub_type : existing.sub_type;
    const newInst = updates.institution !== undefined ? updates.institution : existing.institution;
    const newMask = updates.account_number_mask !== undefined ? updates.account_number_mask : existing.account_number_mask;
    const newActive = updates.is_active !== undefined ? (updates.is_active ? 1 : 0) : existing.is_active;
    const newTracking = updates.tracking_mode !== undefined ? updates.tracking_mode : (existing.tracking_mode || 'transactions');

    const res = db.prepare(`
        UPDATE m1_accounts
        SET name = ?, sub_type = ?, institution = ?, account_number_mask = ?, is_active = ?, tracking_mode = ?, revision = revision + 1, updated_at = ?
        WHERE id = ? AND revision = ?
    `).run(newName, newSubType, newInst, newMask, newActive, newTracking, now, accountId, expectedRevision);

    if (res.changes === 0) {
        throw new ConflictError(`Account update failed due to stale revision (expected revision ${expectedRevision}). Another update has occurred.`);
    }

    return {
        id: existing.id,
        entity_id: existing.entity_id,
        name: newName,
        type: existing.type,
        sub_type: newSubType,
        currency: existing.currency,
        is_active: Boolean(newActive),
        institution: newInst,
        account_number_mask: newMask,
        opening_date: existing.opening_date,
        opening_balance_cents: existing.opening_balance_cents,
        tracking_mode: newTracking,
        balance_revision: existing.balance_revision || 1,
        revision: expectedRevision + 1,
        created_at: existing.created_at,
        updated_at: now
    };
}

/**
 * Retrieves a single account by ID.
 */
export function getAccount(db: Database.Database, accountId: string): Account | null {
    const r = db.prepare('SELECT * FROM m1_accounts WHERE id = ?').get(accountId) as any;
    if (!r) return null;

    return {
        id: r.id,
        entity_id: r.entity_id,
        name: r.name,
        type: r.type,
        sub_type: r.sub_type,
        currency: r.currency,
        is_active: Boolean(r.is_active),
        institution: r.institution,
        account_number_mask: r.account_number_mask,
        opening_date: r.opening_date,
        opening_balance_cents: r.opening_balance_cents,
        tracking_mode: r.tracking_mode || 'transactions',
        balance_revision: r.balance_revision || 1,
        revision: r.revision,
        created_at: r.created_at,
        updated_at: r.updated_at
    };
}

/**
 * Lists accounts belonging to an entity.
 */
export function listAccounts(db: Database.Database, entityId?: string): Account[] {
    const query = entityId
        ? db.prepare('SELECT * FROM m1_accounts WHERE entity_id = ? ORDER BY type ASC, name ASC').all(entityId)
        : db.prepare('SELECT * FROM m1_accounts ORDER BY type ASC, name ASC').all();

    return (query as any[]).map(r => ({
        id: r.id,
        entity_id: r.entity_id,
        name: r.name,
        type: r.type,
        sub_type: r.sub_type,
        currency: r.currency,
        is_active: Boolean(r.is_active),
        institution: r.institution,
        account_number_mask: r.account_number_mask,
        opening_date: r.opening_date,
        opening_balance_cents: r.opening_balance_cents,
        tracking_mode: r.tracking_mode || 'transactions',
        balance_revision: r.balance_revision || 1,
        revision: r.revision,
        created_at: r.created_at,
        updated_at: r.updated_at
    }));
}

export interface AccountOwnershipInput {
    entity_id: string;
    share_percentage?: number;
    ownership_percentage?: number;
}

/**
 * Sets joint ownership allocations for an account (M1-FLOW-07, T7).
 * 
 * Why this exists:
 * In a household or shared financial setting, assets (e.g. real estate) or liabilities (e.g. joint mortgage)
 * may be co-owned between multiple entities (e.g. 50/50, 60/40).
 * Storing explicit ownership percentages enables individual net worth reports to accurately allocate
 * each owner's share while enabling household views to report the asset once without double-counting.
 * 
 * Tricky logic:
 * - Validates each entity exists before saving.
 * - Enforces that each share_percentage > 0 and <= 100.
 * - Enforces that total allocated percentage across all entities does not exceed 100%.
 * - Atomic replacement: wipes previous allocations for this account and inserts the new distribution.
 * 
 * TODO: Support automated ownership distribution on initial account creation modal in future UI polish.
 */
export function setAccountOwnership(
    db: Database.Database,
    accountId: string,
    allocations: AccountOwnershipInput[]
): AccountOwnership[] {
    const account = db.prepare('SELECT id, name, entity_id FROM m1_accounts WHERE id = ?').get(accountId) as any;
    if (!account) {
        throw new ValidationError(`Account not found: ${accountId}`);
    }

    if (!allocations || allocations.length === 0) {
        // Clearing joint ownership - account belongs 100% to primary entity
        db.prepare('DELETE FROM m1_account_ownership WHERE account_id = ?').run(accountId);
        return [];
    }

    let totalPercentage = 0;
    const entityLookup = db.prepare('SELECT id, name FROM m1_entities WHERE id = ?');
    const seenEntities = new Set<string>();

    for (const alloc of allocations) {
        if (!alloc.entity_id) {
            throw new ValidationError('Entity ID is required for each ownership allocation.');
        }
        if (seenEntities.has(alloc.entity_id)) {
            throw new ValidationError(`Duplicate entity in ownership allocation: ${alloc.entity_id}`);
        }
        seenEntities.add(alloc.entity_id);

        const entity = entityLookup.get(alloc.entity_id);
        if (!entity) {
            throw new ValidationError(`Entity not found for ownership allocation: ${alloc.entity_id}`);
        }

        const pct = (alloc as any).ownership_percentage !== undefined ? (alloc as any).ownership_percentage : alloc.share_percentage;
        if (typeof pct !== 'number' || !Number.isFinite(pct)) {
            throw new ValidationError(`Invalid share percentage: "${pct}". Must be a valid number.`);
        }
        if (pct <= 0 || pct > 100) {
            throw new ValidationError(`Share percentage must be between 0 and 100 (exclusive of 0), received: ${pct}%.`);
        }

        totalPercentage += pct;
    }

    // Floating-point safety: allow tiny round-off up to 100.0001
    if (totalPercentage > 100.0001) {
        throw new ValidationError(`Total ownership percentage cannot exceed 100%, calculated: ${totalPercentage}%.`);
    }

    // Resubmission Item 6: Reject ambiguous allocations.
    // If the primary account owner is explicitly listed in the allocations,
    // the allocations must account for 100% of ownership.
    // If the primary owner is listed but total < 100%, it is ambiguous whether the remainder
    // was intended to be retained by the primary owner or unallocated.
    const primaryEntityInAllocations = allocations.some(a => a.entity_id === account.entity_id);
    if (primaryEntityInAllocations && totalPercentage < 99.9999) {
        throw new ValidationError(
            `Ambiguous ownership allocation: The primary account owner "${account.entity_id}" is explicitly specified, but total allocations sum to ${totalPercentage}% (less than 100%). When the primary owner is explicitly specified, total allocations must equal 100%.`
        );
    }

    const now = new Date().toISOString();
    const results: AccountOwnership[] = [];

    const runAtomic = db.transaction(() => {
        db.prepare('DELETE FROM m1_account_ownership WHERE account_id = ?').run(accountId);
        const insertStmt = db.prepare(`
            INSERT INTO m1_account_ownership (id, account_id, entity_id, share_percentage, created_at)
            VALUES (?, ?, ?, ?, ?)
        `);

        for (const alloc of allocations) {
            const id = crypto.randomUUID();
            const pct = (alloc as any).ownership_percentage !== undefined ? (alloc as any).ownership_percentage : alloc.share_percentage;
            insertStmt.run(id, accountId, alloc.entity_id, pct, now);
            results.push({
                id,
                account_id: accountId,
                entity_id: alloc.entity_id,
                share_percentage: pct,
                ownership_percentage: pct,
                created_at: now
            });
        }
    });

    runAtomic();
    return results;
}

/**
 * Retrieves configured joint ownership allocations for an account.
 * 
 * Why this exists:
 * Required by calculation services and UI views to display and apply ownership splits.
 */
export function getAccountOwnership(db: Database.Database, accountId: string): AccountOwnership[] {
    const rows = db.prepare(`
        SELECT * FROM m1_account_ownership WHERE account_id = ? ORDER BY share_percentage DESC
    `).all(accountId) as any[];

    return rows.map(r => ({
        id: r.id,
        account_id: r.account_id,
        entity_id: r.entity_id,
        share_percentage: r.share_percentage,
        ownership_percentage: r.share_percentage,
        created_at: r.created_at
    }));
}

/**
 * Lists all member entities belonging to a household scope.
 * 
 * Why this exists:
 * Enables household-level reporting by aggregating all individuals whose parent_entity_id
 * points to the household entity (M1-FLOW-07).
 * 
 * Tricky logic:
 * Includes the household entity itself plus any child entities whose parent_entity_id equals householdEntityId.
 * 
 * TODO: Support arbitrary n-level corporate subsidiary hierarchies in future milestones.
 */
export function listEntityMembers(db: Database.Database, householdEntityId: string): Entity[] {
    const rows = db.prepare(`
        SELECT * FROM m1_entities WHERE id = ? OR parent_entity_id = ? ORDER BY type DESC, name ASC
    `).all(householdEntityId, householdEntityId) as any[];

    return rows.map(r => ({
        id: r.id,
        name: r.name,
        type: r.type,
        currency: r.currency,
        parent_entity_id: r.parent_entity_id,
        created_at: r.created_at,
        updated_at: r.updated_at
    }));
}

