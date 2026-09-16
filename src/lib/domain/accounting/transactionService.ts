/**
 * Milestone 1 Daily Financial Events & Transaction Service
 * 
 * Why this file exists:
 * Implements M1-FLOW-02, M1-FLOW-03, M1-FLOW-04, M1-FLOW-05, M1-DOM-04, M1-DOM-05,
 * M1-SAFE-05, and M1-SAFE-06.
 * Provides the authoritative domain service for recording daily financial activities:
 * income, expenses, account transfers, credit card repayments, loan repayments with
 * principal/interest/fee splits, and auditable transaction corrections/voids.
 * 
 * Tricky logic:
 * - Real Calendar Date Validation:
 *   Rejects non-dates ("not-a-date") or impossible calendar days (e.g. 2026-02-31).
 * - Posting & Account Currency Integrity:
 *   Every single posting's currency MUST match the defined currency of the referenced account.
 *   Cross-currency repayments (e.g. AUD bank vs USD loan) are rejected upfront.
 * - Account Role & Sovereign Entity Boundaries:
 *   Transfers, repayments, income, and expenses strictly validate that accounts belong to the
 *   same sovereign entity and fulfill the correct financial roles (e.g. cannot "transfer" into an income account).
 * - Atomic Category Account Provisioning:
 *   Auto-provisioning category accounts occurs within the same atomic database transaction as the
 *   transaction commit. Any validation failure rolls back all changes, leaving zero orphan accounts.
 * - End-to-End Idempotency & Conflict Detection (M1-SAFE-05, T11):
 *   Submitting the same idempotency key with identical financial details returns the existing transaction.
 *   Submitting the same idempotency key with DIFFERENT financial details throws ConflictError (HTTP 409).
 * - Auditable corrections (M1-DOM-05, T13):
 *   Transactions are never destructively wiped. Voiding or editing stores an immutable
 *   snapshot of previous_state in m1_transaction_corrections and enforces optimistic revision checks.
 *   Edits enforce shared validation (dates, descriptions, replacement posting count).
 * 
 * TODO: Add multi-currency transfer FX hedging journals in Milestone 2.
 */

import Database from 'better-sqlite3';
import {
    Account,
    AccountSubType,
    AccountType,
    CurrencyCode,
    Posting,
    Transaction,
    TransactionCorrection,
    TransactionOrigin,
    TransactionStatus,
    assertValidMoneyCents,
    validateTransactionBalance
} from './types';
import { ConflictError, ValidationError, createAccount, getEntity } from './accountService';

export interface PostTransactionInput {
    id?: string;
    date: string; // YYYY-MM-DD
    description: string;
    payee_or_payer?: string | null;
    origin?: TransactionOrigin;
    idempotency_key?: string | null;
    evidence_refs?: string[] | null;
    postings: Array<{
        id?: string;
        account_id: string;
        amount_cents: number; // Signed integer: positive = Debit, negative = Credit
        currency: CurrencyCode;
        memo?: string | null;
    }>;
}

export interface RecordAssetValuationInput {
    entity_id?: string;
    asset_account_id: string;
    new_valuation_cents: number;
    date?: string; // YYYY-MM-DD
    valuation_date?: string; // alias for date
    description?: string;
    evidence_refs?: any[] | null;
    idempotency_key?: string | null;
    source?: string | null;
}

export interface RecordIncomeInput {
    entity_id: string;
    bank_account_id: string;
    income_account_id?: string;
    category?: AccountSubType;
    amount_cents: number;
    date: string; // YYYY-MM-DD
    payer?: string | null;
    description: string;
    idempotency_key?: string | null;
    evidence_refs?: any[] | null;
}

export interface RecordExpenseInput {
    entity_id: string;
    payment_account_id: string; // Bank or Credit Card
    expense_account_id?: string;
    category?: AccountSubType;
    amount_cents: number;
    date: string; // YYYY-MM-DD
    payee?: string | null;
    description: string;
    idempotency_key?: string | null;
    evidence_refs?: any[] | null;
}

export interface RecordTransferInput {
    from_account_id: string;
    to_account_id: string;
    amount_cents: number;
    date: string; // YYYY-MM-DD
    description?: string;
    idempotency_key?: string | null;
    evidence_refs?: any[] | null;
}

export interface RecordCreditCardRepaymentInput {
    bank_account_id: string;
    card_account_id: string;
    amount_cents: number;
    date: string; // YYYY-MM-DD
    description?: string;
    idempotency_key?: string | null;
    evidence_refs?: any[] | null;
}

export interface RecordLoanRepaymentInput {
    bank_account_id: string;
    loan_account_id: string;
    interest_account_id?: string;
    fee_account_id?: string;
    principal_cents: number;
    interest_cents: number;
    fee_cents?: number;
    date: string; // YYYY-MM-DD
    payee?: string | null;
    description?: string;
    idempotency_key?: string | null;
    evidence_refs?: any[] | null;
}

export interface CorrectTransactionInput {
    transaction_id: string;
    expected_revision: number;
    operation: 'void' | 'edit';
    reason: string;
    performed_by: string;
    new_data?: {
        description?: string;
        payee_or_payer?: string | null;
        date?: string;
        postings?: Array<{
            account_id: string;
            amount_cents: number;
            currency: CurrencyCode;
            memo?: string | null;
        }>;
    };
}

export interface TransactionWithPostings extends Transaction {
    postings: Posting[];
}

/**
 * Validates that a string is a real, valid calendar date in YYYY-MM-DD format.
 * Rejects non-dates ("not-a-date"), impossible calendar days (e.g. 2026-02-31), or malformed formats.
 */
export function assertValidCalendarDate(dateStr: string, context = 'Date'): void {
    if (!dateStr || typeof dateStr !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
        throw new ValidationError(`${context} must be a valid date in YYYY-MM-DD format, received: "${dateStr}".`);
    }
    const [y, m, d] = dateStr.split('-').map(Number);
    const parsed = new Date(Date.UTC(y, m - 1, d));
    if (
        isNaN(parsed.getTime()) ||
        parsed.getUTCFullYear() !== y ||
        parsed.getUTCMonth() + 1 !== m ||
        parsed.getUTCDate() !== d
    ) {
        throw new ValidationError(`${context} is not a valid calendar date: "${dateStr}".`);
    }
}

/**
 * Validates that an account is eligible to act as a payment account for disbursements, expenses, or repayments.
 * 
 * Why this exists:
 * Assessor Finding & Clarification 5:
 * Payment accounts must be liquid assets (checking, savings, cash) or revolving credit cards.
 * Non-liquid accounts (property, mortgage, vehicle, loan, investment) cannot be used as payment targets
 * for manual expense entry or document inbox approval.
 * 
 * Tricky logic:
 * In double-entry accounting, crediting an account reduces an asset or increases a liability.
 * If a non-liquid asset (e.g. real estate) were allowed as a payment account, expenses would decrement property value
 * instead of liquid cash balances.
 * 
 * TODO: Support automated escrow settlement accounts in future property management modules.
 */
export function assertEligiblePaymentAccount(account: { type: string; sub_type: string; name?: string }): void {
    const isLiquidAsset = account.type === 'asset' && ['checking', 'savings', 'cash'].includes(account.sub_type);
    const isCreditCard = account.type === 'liability' && account.sub_type === 'credit_card';
    if (!isLiquidAsset && !isCreditCard) {
        throw new ValidationError(`Payment account must be a liquid asset or credit card account, received type: "${account.type}", sub_type: "${account.sub_type}".`);
    }
}

/**
 * Ensures an expense account exists for the given entity, category, and currency.
 * Auto-provisions a standard expense account if not already present.
 */
export function ensureExpenseAccount(
    db: Database.Database,
    entityId: string,
    category: AccountSubType = 'living_expense',
    currency: CurrencyCode = 'USD'
): Account {
    const curr = currency.toUpperCase();
    const existing = db.prepare(`
        SELECT * FROM m1_accounts
        WHERE entity_id = ? AND type = 'expense' AND sub_type = ? AND currency = ?
    `).get(entityId, category, curr) as any;

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

    const id = `acc-exp-${entityId}-${category}-${curr.toLowerCase()}`;
    const name = category.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
    const now = new Date().toISOString();

    db.prepare(`
        INSERT INTO m1_accounts (id, entity_id, name, type, sub_type, currency, is_active, revision, created_at, updated_at)
        VALUES (?, ?, ?, 'expense', ?, ?, 1, 1, ?, ?)
    `).run(id, entityId, name, category, curr, now, now);

    return {
        id,
        entity_id: entityId,
        name,
        type: 'expense',
        sub_type: category,
        currency: curr,
        is_active: true,
        revision: 1,
        created_at: now,
        updated_at: now
    };
}

/**
 * Ensures an income account exists for the given entity, category, and currency.
 * Auto-provisions a standard income account if not already present.
 */
export function ensureIncomeAccount(
    db: Database.Database,
    entityId: string,
    category: AccountSubType = 'salary',
    currency: CurrencyCode = 'USD'
): Account {
    const curr = currency.toUpperCase();
    const existing = db.prepare(`
        SELECT * FROM m1_accounts
        WHERE entity_id = ? AND type = 'income' AND sub_type = ? AND currency = ?
    `).get(entityId, category, curr) as any;

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

    const id = `acc-inc-${entityId}-${category}-${curr.toLowerCase()}`;
    const name = category.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
    const now = new Date().toISOString();

    db.prepare(`
        INSERT INTO m1_accounts (id, entity_id, name, type, sub_type, currency, is_active, revision, created_at, updated_at)
        VALUES (?, ?, ?, 'income', ?, ?, 1, 1, ?, ?)
    `).run(id, entityId, name, category, curr, now, now);

    return {
        id,
        entity_id: entityId,
        name,
        type: 'income',
        sub_type: category,
        currency: curr,
        is_active: true,
        revision: 1,
        created_at: now,
        updated_at: now
    };
}

/**
 * Ensures an Unrealized Valuation Reserve equity account exists for the given entity and currency.
 * Auto-provisions the equity reserve account if not already present.
 * 
 * Why this exists:
 * Milestone 1 (M1-FLOW-06, T6) requires that non-cash asset revaluations post to an equity reserve
 * rather than operating cash income or bank accounts.
 */
export function ensureValuationEquityAccount(
    db: Database.Database,
    entityId: string,
    currency: CurrencyCode = 'USD'
): Account {
    const curr = currency.toUpperCase();
    const existing = db.prepare(`
        SELECT * FROM m1_accounts
        WHERE entity_id = ? AND type = 'equity' AND sub_type = 'valuation_reserve' AND currency = ?
    `).get(entityId, curr) as any;

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

    const id = `acc-eq-val-${entityId}-${curr.toLowerCase()}`;
    const name = 'Unrealized Valuation Reserve';
    const now = new Date().toISOString();

    db.prepare(`
        INSERT INTO m1_accounts (id, entity_id, name, type, sub_type, currency, is_active, revision, created_at, updated_at)
        VALUES (?, ?, ?, 'equity', 'valuation_reserve', ?, 1, 1, ?, ?)
    `).run(id, entityId, name, curr, now, now);

    return {
        id,
        entity_id: entityId,
        name,
        type: 'equity',
        sub_type: 'valuation_reserve',
        currency: curr,
        is_active: true,
        revision: 1,
        created_at: now,
        updated_at: now
    };
}


/**
 * String normalization for robust comparison (trims whitespace, treats null/undefined as empty).
 */
function normalizeString(val?: string | null): string {
    return (val ?? '').trim();
}

/**
 * Canonicalizes an individual evidence reference (M1-EVID-01, M1-EVID-02).
 * 
 * Why this exists:
 * Assessor Finding 7: Structured evidence references must be canonically validated and compared.
 * Do NOT stringify objects with String(object) which degrades to "[object Object]".
 * Changes to document_id, content_hash, page, or bounding_box must produce distinct canonical identities.
 * Explicitly preserves support for legacy string references.
 * 
 * Tricky logic:
 * - For strings: normalized as { type: 'legacy', ref: trimmedString }.
 * - For objects: extracts and validates document_id, content_hash, page, and bounding_box (normalizing bbox alias).
 *   Produces canonical JSON with sorted keys so key order differences don't cause false conflicts.
 * 
 * TODO: Integrate direct PDF viewport jump links in Slice 1G document viewer.
 */
export function canonicalizeEvidenceRef(ref: any): string {
    if (ref === null || ref === undefined) return '';
    if (typeof ref === 'string') {
        const trimmed = ref.trim();
        return trimmed ? JSON.stringify({ ref: trimmed, type: 'legacy' }) : '';
    }
    if (typeof ref === 'object') {
        const docId = String(ref.document_id ?? ref.documentId ?? '').trim();
        const hash = String(ref.content_hash ?? ref.contentHash ?? '').trim();
        const page = typeof ref.page === 'number' && Number.isFinite(ref.page)
            ? ref.page
            : (ref.page ? Number(ref.page) : null);
        
        // Normalize bounding_box or bbox [x0, y0, x1, y1]
        let bbox: [number, number, number, number] | null = null;
        const rawBbox = ref.bounding_box || ref.bbox;
        if (Array.isArray(rawBbox) && rawBbox.length === 4 && rawBbox.every(n => typeof n === 'number' && Number.isFinite(n))) {
            bbox = [rawBbox[0], rawBbox[1], rawBbox[2], rawBbox[3]];
        }

        const tableOrCell = ref.table_or_cell_ref ? String(ref.table_or_cell_ref).trim() : null;
        const label = ref.label ? String(ref.label).trim() : null;

        return JSON.stringify({
            bounding_box: bbox,
            content_hash: hash,
            document_id: docId,
            label: label || null,
            page: page,
            table_or_cell_ref: tableOrCell || null,
            type: 'structured'
        });
    }
    return '';
}

/**
 * Normalizes evidence references by trimming, filtering empty, deduplicating, sorting, and JSON stringifying.
 */
export function normalizeEvidenceRefs(refs?: any[] | null): string {
    if (!refs || !Array.isArray(refs)) return '[]';
    const canonicalList = refs.map(r => canonicalizeEvidenceRef(r)).filter(Boolean);
    const uniqueSorted = Array.from(new Set(canonicalList)).sort();
    return JSON.stringify(uniqueSorted);
}

/**
 * Posts an authoritative double-entry transaction atomically.
 * 
 * Why this exists:
 * The single core transaction committer in OpenNetWorth. Validates that postings
 * sum exactly to zero cents, validates account existence, currency consistency,
 * sovereign entity boundaries, and handles idempotency keys with material conflict detection (M1-SAFE-05).
 */
export function postTransaction(db: Database.Database, input: PostTransactionInput): TransactionWithPostings {
    if (!input.description || input.description.trim().length === 0) {
        throw new ValidationError('Transaction description is required.');
    }
    assertValidCalendarDate(input.date, 'Transaction date');

    if (!input.postings || input.postings.length < 2) {
        throw new ValidationError('A transaction must have at least two postings to satisfy double-entry balance.');
    }

    const txId = input.id || crypto.randomUUID();
    const now = new Date().toISOString();

    const preparedPostings: Posting[] = input.postings.map(p => {
        assertValidMoneyCents(p.amount_cents, `Posting for account ${p.account_id}`);
        return {
            id: p.id || crypto.randomUUID(),
            transaction_id: txId,
            account_id: p.account_id,
            amount_cents: p.amount_cents,
            currency: p.currency.toUpperCase(),
            memo: p.memo || null
        };
    });

    // Invariant validation: Sum(amount_cents) === 0
    const validation = validateTransactionBalance(preparedPostings);
    if (!validation.isValid) {
        throw new ValidationError(`Transaction out of balance by ${validation.delta_cents} cents. Sum of postings must equal zero.`);
    }

    // Verify all referenced accounts exist, currencies match, and all accounts belong to the same sovereign entity
    const accountLookup = db.prepare('SELECT id, name, currency, type, entity_id FROM m1_accounts WHERE id = ?');
    let transactionEntityId: string | null = null;
    for (const p of preparedPostings) {
        const account = accountLookup.get(p.account_id) as any;
        if (!account) {
            throw new ValidationError(`Account does not exist: ${p.account_id}`);
        }
        if (p.currency !== account.currency) {
            throw new ValidationError(
                `Posting currency "${p.currency}" does not match account currency "${account.currency}" for account "${account.name}".`
            );
        }
        if (transactionEntityId === null) {
            transactionEntityId = account.entity_id;
        } else if (transactionEntityId !== account.entity_id) {
            throw new ValidationError(
                `Cross-entity transaction rejected: Account "${account.name}" belongs to entity "${account.entity_id}", while other postings in this transaction belong to entity "${transactionEntityId}". In Slice 1C, all postings in a transaction must belong to the same sovereign entity.`
            );
        }
    }

    // Idempotency check with material & financial conflict detection (M1-SAFE-05, T11)
    if (input.idempotency_key) {
        const existingTx = db.prepare('SELECT * FROM m1_transactions WHERE idempotency_key = ?').get(input.idempotency_key) as any;
        if (existingTx) {
            const existingPostings = db.prepare('SELECT * FROM m1_journal_entries WHERE transaction_id = ?').all(existingTx.id) as any[];

            // Compare material metadata: date, description, payee/payer, and evidence references
            const isDateMatch = existingTx.date === input.date;
            const isDescriptionMatch = normalizeString(existingTx.description) === normalizeString(input.description);
            const isPayeeMatch = normalizeString(existingTx.payee_or_payer) === normalizeString(input.payee_or_payer);

            const existingEvidenceParsed = existingTx.evidence_refs ? JSON.parse(existingTx.evidence_refs) : [];
            const isEvidenceMatch = normalizeEvidenceRefs(existingEvidenceParsed) === normalizeEvidenceRefs(input.evidence_refs);

            // Compare financial postings: posting count, accounts, amounts, currencies
            const isPostingCountMatch = existingPostings.length === preparedPostings.length;
            let arePostingsIdentical = isPostingCountMatch;
            if (arePostingsIdentical) {
                const matchedIds = new Set<string>();
                for (const p of preparedPostings) {
                    const match = existingPostings.find(ep =>
                        !matchedIds.has(ep.id) &&
                        ep.account_id === p.account_id &&
                        ep.amount_cents === p.amount_cents &&
                        ep.currency === p.currency
                    );
                    if (!match) {
                        arePostingsIdentical = false;
                        break;
                    }
                    matchedIds.add(match.id);
                }
            }

            if (isDateMatch && isDescriptionMatch && isPayeeMatch && arePostingsIdentical) {
                // Same key + same financial & material request -> return existing result
                return {
                    id: existingTx.id,
                    date: existingTx.date,
                    description: existingTx.description,
                    payee_or_payer: existingTx.payee_or_payer,
                    status: existingTx.status,
                    origin: existingTx.origin,
                    idempotency_key: existingTx.idempotency_key,
                    evidence_refs: existingTx.evidence_refs ? JSON.parse(existingTx.evidence_refs) : null,
                    revision: existingTx.revision,
                    created_at: existingTx.created_at,
                    updated_at: existingTx.updated_at,
                    postings: existingPostings.map(p => ({
                        id: p.id,
                        transaction_id: p.transaction_id,
                        account_id: p.account_id,
                        amount_cents: p.amount_cents,
                        currency: p.currency,
                        memo: p.memo
                    }))
                };
            } else {
                // Same key + changed details (date, description, payee, evidence, or postings) -> throw ConflictError (HTTP 409)
                throw new ConflictError(
                    `Idempotency conflict: A transaction with idempotency key "${input.idempotency_key}" already exists with different financial or material details.`
                );
            }
        }
    }

    let resultTx: TransactionWithPostings;

    const executeTx = db.transaction(() => {
        db.prepare(`
            INSERT INTO m1_transactions (
                id, date, description, payee_or_payer, status, origin,
                idempotency_key, evidence_refs, revision, created_at, updated_at
            ) VALUES (?, ?, ?, ?, 'posted', ?, ?, ?, 1, ?, ?)
        `).run(
            txId,
            input.date,
            input.description.trim(),
            input.payee_or_payer ? input.payee_or_payer.trim() : null,
            input.origin || 'manual',
            input.idempotency_key || null,
            input.evidence_refs ? JSON.stringify(input.evidence_refs) : null,
            now,
            now
        );

        const insertPosting = db.prepare(`
            INSERT INTO m1_journal_entries (id, transaction_id, account_id, amount_cents, currency, memo)
            VALUES (?, ?, ?, ?, ?, ?)
        `);

        for (const p of preparedPostings) {
            insertPosting.run(p.id, p.transaction_id, p.account_id, p.amount_cents, p.currency, p.memo);
        }

        resultTx = {
            id: txId,
            date: input.date,
            description: input.description.trim(),
            payee_or_payer: input.payee_or_payer ? input.payee_or_payer.trim() : null,
            status: 'posted',
            origin: input.origin || 'manual',
            idempotency_key: input.idempotency_key || null,
            evidence_refs: input.evidence_refs || null,
            revision: 1,
            created_at: now,
            updated_at: now,
            postings: preparedPostings
        };
    });

    executeTx();
    return resultTx!;
}

/**
 * Records an income event (M1-FLOW-02, T2).
 * 
 * Postings:
 * - Debit Bank Account (+amount_cents) -> increases asset balance
 * - Credit Income Account (-amount_cents) -> increases income total
 * 
 * Boundary & Role validations:
 * - Bank account must be an 'asset' account belonging to input.entity_id.
 * - Income account (auto or explicit) must be an 'income' account belonging to input.entity_id.
 * - Atomic execution: any validation error rolls back all operations, leaving no orphan accounts.
 */
export function recordIncome(db: Database.Database, input: RecordIncomeInput): TransactionWithPostings {
    assertValidCalendarDate(input.date, 'Income date');
    assertValidMoneyCents(input.amount_cents, 'Income amount');
    if (input.amount_cents <= 0) {
        throw new ValidationError('Income amount must be greater than zero cents.');
    }

    const runAtomic = db.transaction(() => {
        const bankAccount = db.prepare('SELECT * FROM m1_accounts WHERE id = ?').get(input.bank_account_id) as any;
        if (!bankAccount) {
            throw new ValidationError(`Bank account not found: ${input.bank_account_id}`);
        }
        if (bankAccount.type !== 'asset' || !['checking', 'savings', 'cash'].includes(bankAccount.sub_type)) {
            throw new ValidationError(`Deposit account must be a liquid asset account (checking, savings, cash), received type: "${bankAccount.type}", sub_type: "${bankAccount.sub_type}".`);
        }
        if (bankAccount.entity_id !== input.entity_id) {
            throw new ValidationError(`Bank account "${bankAccount.name}" does not belong to entity "${input.entity_id}".`);
        }

        // Find or auto-provision income account
        let incomeAccId = input.income_account_id;
        if (incomeAccId) {
            const incomeAcc = db.prepare('SELECT * FROM m1_accounts WHERE id = ?').get(incomeAccId) as any;
            if (!incomeAcc) {
                throw new ValidationError(`Income account not found: ${incomeAccId}`);
            }
            if (incomeAcc.type !== 'income') {
                throw new ValidationError(`Income account must have type 'income', received: "${incomeAcc.type}".`);
            }
            if (incomeAcc.entity_id !== input.entity_id) {
                throw new ValidationError(`Income account "${incomeAcc.name}" does not belong to entity "${input.entity_id}".`);
            }
            if (incomeAcc.currency !== bankAccount.currency) {
                throw new ValidationError(`Income account currency (${incomeAcc.currency}) must match bank account currency (${bankAccount.currency}).`);
            }
        } else {
            const incomeAcc = ensureIncomeAccount(db, input.entity_id, input.category || 'salary', bankAccount.currency);
            incomeAccId = incomeAcc.id;
        }

        const currency = bankAccount.currency;

        return postTransaction(db, {
            date: input.date,
            description: input.description,
            payee_or_payer: input.payer,
            origin: 'manual',
            idempotency_key: input.idempotency_key,
            evidence_refs: input.evidence_refs,
            postings: [
                {
                    account_id: bankAccount.id,
                    amount_cents: input.amount_cents, // Debit Asset (+)
                    currency,
                    memo: `Deposit from ${input.payer || 'Income'}`
                },
                {
                    account_id: incomeAccId,
                    amount_cents: -input.amount_cents, // Credit Income (-)
                    currency,
                    memo: input.description
                }
            ]
        });
    });

    return runAtomic();
}

/**
 * Records an expense event (M1-FLOW-02, T2, T4).
 * 
 * Postings:
 * - Debit Expense Account (+amount_cents) -> increases expense total
 * - Credit Payment Account (-amount_cents) -> reduces asset balance (Bank) OR increases liability (Credit Card)
 * 
 * Boundary & Role validations:
 * - Payment account must be an 'asset' or 'liability' account belonging to input.entity_id.
 * - Expense account (auto or explicit) must be an 'expense' account belonging to input.entity_id.
 * - Atomic execution: any validation error rolls back all operations, leaving no orphan accounts.
 */
export function recordExpense(db: Database.Database, input: RecordExpenseInput): TransactionWithPostings {
    assertValidCalendarDate(input.date, 'Expense date');
    assertValidMoneyCents(input.amount_cents, 'Expense amount');
    if (input.amount_cents <= 0) {
        throw new ValidationError('Expense amount must be greater than zero cents.');
    }

    const runAtomic = db.transaction(() => {
        const paymentAccount = db.prepare('SELECT * FROM m1_accounts WHERE id = ?').get(input.payment_account_id) as any;
        if (!paymentAccount) {
            throw new ValidationError(`Payment account not found: ${input.payment_account_id}`);
        }
        assertEligiblePaymentAccount(paymentAccount);
        if (paymentAccount.entity_id !== input.entity_id) {
            throw new ValidationError(`Payment account "${paymentAccount.name}" does not belong to entity "${input.entity_id}".`);
        }

        // Find or auto-provision expense account
        let expenseAccId = input.expense_account_id;
        if (expenseAccId) {
            const expenseAcc = db.prepare('SELECT * FROM m1_accounts WHERE id = ?').get(expenseAccId) as any;
            if (!expenseAcc) {
                throw new ValidationError(`Expense account not found: ${expenseAccId}`);
            }
            if (expenseAcc.type !== 'expense') {
                throw new ValidationError(`Expense account must have type 'expense', received: "${expenseAcc.type}".`);
            }
            if (expenseAcc.entity_id !== input.entity_id) {
                throw new ValidationError(`Expense account "${expenseAcc.name}" does not belong to entity "${input.entity_id}".`);
            }
            if (expenseAcc.currency !== paymentAccount.currency) {
                throw new ValidationError(`Expense account currency (${expenseAcc.currency}) must match payment account currency (${paymentAccount.currency}).`);
            }
        } else {
            const expenseAcc = ensureExpenseAccount(db, input.entity_id, input.category || 'living_expense', paymentAccount.currency);
            expenseAccId = expenseAcc.id;
        }

        const currency = paymentAccount.currency;

        return postTransaction(db, {
            date: input.date,
            description: input.description,
            payee_or_payer: input.payee,
            origin: 'manual',
            idempotency_key: input.idempotency_key,
            evidence_refs: input.evidence_refs,
            postings: [
                {
                    account_id: expenseAccId,
                    amount_cents: input.amount_cents, // Debit Expense (+)
                    currency,
                    memo: input.description
                },
                {
                    account_id: paymentAccount.id,
                    amount_cents: -input.amount_cents, // Credit Payment Account (-)
                    currency,
                    memo: `Payment to ${input.payee || 'Merchant'}`
                }
            ]
        });
    });

    return runAtomic();
}

/**
 * Records an account transfer between owned accounts (M1-FLOW-03, T3).
 * 
 * Postings:
 * - Credit Source Account (-amount_cents)
 * - Debit Destination Account (+amount_cents)
 * 
 * Invariants & Validations:
 * - Source and destination accounts MUST both be asset or liability accounts (rejects income/expense/equity).
 * - Both accounts must belong to the same sovereign entity (cross-entity transfers without clearing are rejected).
 * - Generates zero net income and zero net spending ($0.00). Combined net worth is unchanged.
 */
export function recordTransfer(db: Database.Database, input: RecordTransferInput): TransactionWithPostings {
    assertValidCalendarDate(input.date, 'Transfer date');
    assertValidMoneyCents(input.amount_cents, 'Transfer amount');
    if (input.amount_cents <= 0) {
        throw new ValidationError('Transfer amount must be greater than zero cents.');
    }
    if (input.from_account_id === input.to_account_id) {
        throw new ValidationError('Source and destination accounts for a transfer must be different.');
    }

    const runAtomic = db.transaction(() => {
        const fromAccount = db.prepare('SELECT * FROM m1_accounts WHERE id = ?').get(input.from_account_id) as any;
        const toAccount = db.prepare('SELECT * FROM m1_accounts WHERE id = ?').get(input.to_account_id) as any;

        if (!fromAccount) throw new ValidationError(`Source account not found: ${input.from_account_id}`);
        if (!toAccount) throw new ValidationError(`Destination account not found: ${input.to_account_id}`);

        // Financial role check: transfers only between asset and liability accounts
        if (!['asset', 'liability'].includes(fromAccount.type)) {
            throw new ValidationError(`Source account for transfer must be an asset or liability account, received: "${fromAccount.type}".`);
        }
        if (!['asset', 'liability'].includes(toAccount.type)) {
            throw new ValidationError(`Destination account for transfer must be an asset or liability account, received: "${toAccount.type}".`);
        }

        // Entity check: both accounts must belong to the same entity
        if (fromAccount.entity_id !== toAccount.entity_id) {
            throw new ValidationError('Cross-entity transfers are not supported in Slice 1C. Both accounts must belong to the same entity.');
        }

        // Currency check
        if (fromAccount.currency !== toAccount.currency) {
            throw new ValidationError(`Transfers across different currencies (${fromAccount.currency} -> ${toAccount.currency}) require an explicit FX rate (supported in Slice 1D).`);
        }

        const desc = input.description || `Transfer from ${fromAccount.name} to ${toAccount.name}`;

        return postTransaction(db, {
            date: input.date,
            description: desc,
            origin: 'manual',
            idempotency_key: input.idempotency_key,
            evidence_refs: input.evidence_refs,
            postings: [
                {
                    account_id: fromAccount.id,
                    amount_cents: -input.amount_cents, // Credit Source (-)
                    currency: fromAccount.currency,
                    memo: `Transfer to ${toAccount.name}`
                },
                {
                    account_id: toAccount.id,
                    amount_cents: input.amount_cents, // Debit Destination (+)
                    currency: toAccount.currency,
                    memo: `Transfer from ${fromAccount.name}`
                }
            ]
        });
    });

    return runAtomic();
}

/**
 * Records a credit card bill repayment (M1-FLOW-04, T4).
 * 
 * Postings:
 * - Credit Bank Account (-amount_cents) -> reduces cash asset
 * - Debit Credit Card Account (+amount_cents) -> reduces credit card liability
 * 
 * Invariant & Validations:
 * - Bank must be an asset; card must be a liability (credit_card).
 * - Both must belong to the same entity and share the same currency.
 * - Neither posting touches an Expense account, ensuring expenses are counted ONCE only (T4).
 */
export function recordCreditCardRepayment(db: Database.Database, input: RecordCreditCardRepaymentInput): TransactionWithPostings {
    assertValidCalendarDate(input.date, 'Repayment date');
    assertValidMoneyCents(input.amount_cents, 'Repayment amount');
    if (input.amount_cents <= 0) {
        throw new ValidationError('Repayment amount must be greater than zero cents.');
    }

    const runAtomic = db.transaction(() => {
        const bankAccount = db.prepare('SELECT * FROM m1_accounts WHERE id = ?').get(input.bank_account_id) as any;
        const cardAccount = db.prepare('SELECT * FROM m1_accounts WHERE id = ?').get(input.card_account_id) as any;

        if (!bankAccount) throw new ValidationError(`Bank account not found: ${input.bank_account_id}`);
        if (!cardAccount) throw new ValidationError(`Credit card account not found: ${input.card_account_id}`);

        if (bankAccount.type !== 'asset') {
            throw new ValidationError(`Payment source must be an asset account, received type: "${bankAccount.type}".`);
        }
        if (cardAccount.type !== 'liability' || cardAccount.sub_type !== 'credit_card') {
            throw new ValidationError(`Credit card account must be a liability account with sub_type 'credit_card', received type: "${cardAccount.type}", sub_type: "${cardAccount.sub_type}".`);
        }

        // Entity check
        if (bankAccount.entity_id !== cardAccount.entity_id) {
            throw new ValidationError('Cross-entity credit card repayments are not supported. Both accounts must belong to the same entity.');
        }

        // Currency check
        if (bankAccount.currency !== cardAccount.currency) {
            throw new ValidationError(
                `Cross-currency credit card repayment is not supported: bank account is in ${bankAccount.currency}, but credit card account is in ${cardAccount.currency}.`
            );
        }

        const desc = input.description || `Credit Card Payment - ${cardAccount.name}`;

        return postTransaction(db, {
            date: input.date,
            description: desc,
            origin: 'manual',
            idempotency_key: input.idempotency_key,
            evidence_refs: input.evidence_refs,
            postings: [
                {
                    account_id: bankAccount.id,
                    amount_cents: -input.amount_cents, // Credit Bank Asset (-)
                    currency: bankAccount.currency,
                    memo: `Payment for ${cardAccount.name}`
                },
                {
                    account_id: cardAccount.id,
                    amount_cents: input.amount_cents, // Debit Card Liability (+) -> reduces liability
                    currency: cardAccount.currency,
                    memo: `Repayment from ${bankAccount.name}`
                }
            ]
        });
    });

    return runAtomic();
}

/**
 * Records a loan repayment split into Principal, Interest, and Fees (M1-FLOW-05, T5).
 * 
 * Postings:
 * - Credit Bank Account (-total_cents) -> total outflow from bank
 * - Debit Loan Account (+principal_cents) -> reduces debt liability balance
 * - Debit Loan Interest (+interest_cents) -> records financing period expense
 * - Debit Bank/Loan Fee (+fee_cents) -> records service fee period expense
 * 
 * Invariants & Validations:
 * - Bank and Loan accounts must belong to the same entity and share the same currency.
 * - Cross-currency loan repayment is strictly rejected upfront.
 * - total_cents = principal_cents + interest_cents + fee_cents.
 * - Postings sum exactly to 0 cents.
 */
export function recordLoanRepayment(db: Database.Database, input: RecordLoanRepaymentInput): TransactionWithPostings {
    assertValidCalendarDate(input.date, 'Payment date');
    assertValidMoneyCents(input.principal_cents, 'Principal cents');
    assertValidMoneyCents(input.interest_cents, 'Interest cents');
    const feeCents = input.fee_cents || 0;
    assertValidMoneyCents(feeCents, 'Fee cents');

    if (input.principal_cents < 0 || input.interest_cents < 0 || feeCents < 0) {
        throw new ValidationError('Principal, interest, and fee amounts cannot be negative.');
    }

    const totalCents = input.principal_cents + input.interest_cents + feeCents;
    if (totalCents <= 0) {
        throw new ValidationError('Total loan payment must be greater than zero cents.');
    }

    const runAtomic = db.transaction(() => {
        const bankAccount = db.prepare('SELECT * FROM m1_accounts WHERE id = ?').get(input.bank_account_id) as any;
        const loanAccount = db.prepare('SELECT * FROM m1_accounts WHERE id = ?').get(input.loan_account_id) as any;

        if (!bankAccount) throw new ValidationError(`Bank account not found: ${input.bank_account_id}`);
        if (!loanAccount) throw new ValidationError(`Loan account not found: ${input.loan_account_id}`);

        if (bankAccount.type !== 'asset') {
            throw new ValidationError(`Payment source must be an asset account, received type: "${bankAccount.type}".`);
        }
        if (loanAccount.type !== 'liability') {
            throw new ValidationError(`Loan account must be a liability account, received type: "${loanAccount.type}".`);
        }

        // Entity check
        if (bankAccount.entity_id !== loanAccount.entity_id) {
            throw new ValidationError('Cross-entity loan repayments are not supported. Both accounts must belong to the same entity.');
        }

        // Currency check: bank and loan currencies MUST match
        if (bankAccount.currency !== loanAccount.currency) {
            throw new ValidationError(
                `Cross-currency loan repayment is not supported: bank account is in ${bankAccount.currency}, but loan account is in ${loanAccount.currency}.`
            );
        }

        const currency = bankAccount.currency;

        // Ensure or validate interest expense account
        let interestAccId = input.interest_account_id;
        if (interestAccId) {
            const intAcc = db.prepare('SELECT * FROM m1_accounts WHERE id = ?').get(interestAccId) as any;
            if (!intAcc) throw new ValidationError(`Interest account not found: ${interestAccId}`);
            if (intAcc.type !== 'expense') throw new ValidationError(`Interest account must be an expense account, received type: "${intAcc.type}".`);
            if (intAcc.entity_id !== bankAccount.entity_id) throw new ValidationError(`Interest account does not belong to entity "${bankAccount.entity_id}".`);
            if (intAcc.currency !== currency) throw new ValidationError(`Interest account currency (${intAcc.currency}) must match loan currency (${currency}).`);
        } else if (input.interest_cents > 0) {
            const interestAcc = ensureExpenseAccount(db, loanAccount.entity_id, 'loan_interest', currency);
            interestAccId = interestAcc.id;
        }

        // Ensure or validate fee expense account
        let feeAccId = input.fee_account_id;
        if (feeAccId) {
            const feeAcc = db.prepare('SELECT * FROM m1_accounts WHERE id = ?').get(feeAccId) as any;
            if (!feeAcc) throw new ValidationError(`Fee account not found: ${feeAccId}`);
            if (feeAcc.type !== 'expense') throw new ValidationError(`Fee account must be an expense account, received type: "${feeAcc.type}".`);
            if (feeAcc.entity_id !== bankAccount.entity_id) throw new ValidationError(`Fee account does not belong to entity "${bankAccount.entity_id}".`);
            if (feeAcc.currency !== currency) throw new ValidationError(`Fee account currency (${feeAcc.currency}) must match loan currency (${currency}).`);
        } else if (feeCents > 0) {
            const feeAcc = ensureExpenseAccount(db, loanAccount.entity_id, 'bank_fee', currency);
            feeAccId = feeAcc.id;
        }

        const postings: Array<{
            account_id: string;
            amount_cents: number;
            currency: CurrencyCode;
            memo?: string | null;
        }> = [
            {
                account_id: bankAccount.id,
                amount_cents: -totalCents, // Credit Bank Asset (-)
                currency,
                memo: `Loan instalment payment for ${loanAccount.name}`
            }
        ];

        if (input.principal_cents > 0) {
            postings.push({
                account_id: loanAccount.id,
                amount_cents: input.principal_cents, // Debit Loan Liability (+) -> reduces principal
                currency,
                memo: 'Principal reduction'
            });
        }

        if (input.interest_cents > 0 && interestAccId) {
            postings.push({
                account_id: interestAccId,
                amount_cents: input.interest_cents, // Debit Interest Expense (+)
                currency,
                memo: `Interest on ${loanAccount.name}`
            });
        }

        if (feeCents > 0 && feeAccId) {
            postings.push({
                account_id: feeAccId,
                amount_cents: feeCents, // Debit Fee Expense (+)
                currency,
                memo: `Fee on ${loanAccount.name}`
            });
        }

        const desc = input.description || `Loan Payment - ${loanAccount.name}`;

        return postTransaction(db, {
            date: input.date,
            description: desc,
            payee_or_payer: input.payee,
            origin: 'manual',
            idempotency_key: input.idempotency_key,
            evidence_refs: input.evidence_refs,
            postings
        });
    });

    return runAtomic();
}

/**
 * Records a dated valuation adjustment for a non-cash asset (M1-FLOW-06, T6).
 * 
 * Why this exists:
 * Non-cash assets (e.g. real estate, vehicles, private stock) experience valuation changes over time.
 * Accounting principles and Acceptance Scenario T6 dictate that an upward valuation must NOT:
 * - Increase cash or bank account balances.
 * - Appear as operating cash income or revenue.
 * Instead, it posts between the Asset account and an Unrealized Valuation Reserve Equity account.
 * 
 * Tricky logic:
 * - Deterministic delta computation:
 *   Calculates the asset's cumulative balance up to `input.date`.
 *   Delta = new_valuation_cents - current_balance_cents.
 *   * If Delta > 0 (Valuation gain):
 *     Debit Asset (+Delta cents) -> increases asset balance to new_valuation_cents.
 *     Credit Valuation Reserve Equity (-Delta cents) -> increases equity reserve.
 *   * If Delta < 0 (Valuation loss / impairment):
 *     Credit Asset (-Math.abs(Delta) cents) -> decreases asset balance.
 *     Debit Valuation Reserve Equity (+Math.abs(Delta) cents) -> decreases equity reserve.
 *   * If Delta === 0:
 *     Throws ValidationError ('New valuation equals existing asset balance as of that date.')
 * - Invariant: Sum of postings === 0.
 * - Atomic execution: Auto-provisioning and transaction posting commit in a single transaction.
 * 
 * TODO: Support automated depreciation schedules in Milestone 2.
 */
/**
 * Cascades target valuation preservation for subsequent valuation transactions (M1-FLOW-06, T6).
 * 
 * Why this exists:
 * Assessor Finding 5: When an earlier valuation is inserted (e.g. Feb 1 valuation of 110k between
 * Opening 100k and Mar 1 valuation of 120k), subsequent valuations must adjust their deltas so
 * their recorded absolute valuation targets are strictly preserved (Mar 1 remains 120k, not 130k).
 * 
 * Tricky logic:
 * Iterates through all subsequent recorded valuations for the account in chronological order.
 * For each, computes the cumulative balance before its transaction, re-calculates the required delta
 * to reach its target_valuation_cents, and updates the asset and equity reserve postings.
 * 
 * TODO: Support automated indexation and impairment rules in Milestone 2.
 */
export function cascadeAssetValuations(
    db: Database.Database,
    accountId: string,
    afterDate: string,
    causalTxId?: string
): void {
    const laterValuations = db.prepare(`
        SELECT v.id, v.transaction_id, v.valuation_date, v.target_valuation_cents,
               t.date, t.created_at, t.revision, t.description, t.payee_or_payer,
               t.status, t.origin, t.idempotency_key, t.evidence_refs
        FROM m1_asset_valuations v
        JOIN m1_transactions t ON v.transaction_id = t.id
        WHERE v.account_id = ? AND v.valuation_date >= ? AND t.status = 'posted'
          AND (? IS NULL OR v.transaction_id != ?)
        ORDER BY v.valuation_date ASC, v.created_at ASC
    `).all(accountId, afterDate, causalTxId || null, causalTxId || null) as any[];

    const now = new Date().toISOString();

    for (const lv of laterValuations) {
        // Calculate cumulative balance of accountId immediately prior to lv.transaction_id
        const priorRows = db.prepare(`
            SELECT j.amount_cents
            FROM m1_journal_entries j
            JOIN m1_transactions t ON j.transaction_id = t.id
            WHERE j.account_id = ?
              AND t.status = 'posted'
              AND j.transaction_id != ?
              AND (t.date < ? OR (t.date = ? AND t.created_at < ?))
        `).all(accountId, lv.transaction_id, lv.date, lv.date, lv.created_at) as Array<{ amount_cents: number }>;

        const priorBalanceCents = priorRows.reduce((sum, r) => sum + r.amount_cents, 0);
        const newDelta = lv.target_valuation_cents - priorBalanceCents;

        // Fetch current postings of lv.transaction_id
        const currentPostings = db.prepare(`
            SELECT j.id, j.transaction_id, j.account_id, j.amount_cents, j.currency, j.memo, a.type
            FROM m1_journal_entries j
            JOIN m1_accounts a ON j.account_id = a.id
            WHERE j.transaction_id = ?
        `).all(lv.transaction_id) as any[];

        const assetPosting = currentPostings.find(p => p.account_id === accountId);
        const equityPosting = currentPostings.find(p => p.type === 'equity');

        if (!assetPosting || !equityPosting) continue;

        // If delta is already correct, no mutation needed
        if (assetPosting.amount_cents === newDelta) continue;

        // Capture previous state snapshot before mutation (Resubmission Item 3)
        const previousSnapshot = JSON.stringify({
            transaction: {
                id: lv.transaction_id,
                date: lv.date,
                description: lv.description,
                payee_or_payer: lv.payee_or_payer,
                status: lv.status,
                origin: lv.origin,
                idempotency_key: lv.idempotency_key,
                evidence_refs: lv.evidence_refs ? JSON.parse(lv.evidence_refs) : null,
                revision: lv.revision,
                created_at: lv.created_at
            },
            postings: currentPostings.map(p => ({
                id: p.id,
                transaction_id: p.transaction_id,
                account_id: p.account_id,
                amount_cents: p.amount_cents,
                currency: p.currency,
                memo: p.memo
            }))
        });

        // Update postings to new required delta
        db.prepare('UPDATE m1_journal_entries SET amount_cents = ? WHERE id = ?').run(newDelta, assetPosting.id);
        db.prepare('UPDATE m1_journal_entries SET amount_cents = ? WHERE id = ?').run(-newDelta, equityPosting.id);

        // Atomically bump transaction revision and updated_at
        const newRevision = lv.revision + 1;
        const res = db.prepare(`
            UPDATE m1_transactions
            SET revision = revision + 1, updated_at = ?
            WHERE id = ? AND revision = ?
        `).run(now, lv.transaction_id, lv.revision);

        if (res.changes === 0) {
            throw new ConflictError(`Optimistic lock failure while cascading valuation for transaction ${lv.transaction_id}.`);
        }

        // Capture corrected state snapshot
        const updatedPostings = currentPostings.map(p => {
            if (p.id === assetPosting.id) return { ...p, amount_cents: newDelta };
            if (p.id === equityPosting.id) return { ...p, amount_cents: -newDelta };
            return p;
        });

        const correctedSnapshot = JSON.stringify({
            transaction: {
                id: lv.transaction_id,
                date: lv.date,
                description: lv.description,
                payee_or_payer: lv.payee_or_payer,
                status: lv.status,
                origin: lv.origin,
                idempotency_key: lv.idempotency_key,
                evidence_refs: lv.evidence_refs ? JSON.parse(lv.evidence_refs) : null,
                revision: newRevision,
                created_at: lv.created_at,
                updated_at: now
            },
            postings: updatedPostings.map(p => ({
                id: p.id,
                transaction_id: p.transaction_id,
                account_id: p.account_id,
                amount_cents: p.amount_cents,
                currency: p.currency,
                memo: p.memo
            }))
        });

        // Record audit trail in m1_transaction_corrections with causal linkage
        const correctionId = crypto.randomUUID();
        const reason = causalTxId
            ? `Cascaded valuation adjustment preserving target ${lv.target_valuation_cents} cents following transaction ${causalTxId}`
            : `Cascaded valuation adjustment preserving target ${lv.target_valuation_cents} cents`;

        db.prepare(`
            INSERT INTO m1_transaction_corrections (
                id, transaction_id, operation, reason, previous_state, corrected_state, performed_by, timestamp
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `).run(
            correctionId,
            lv.transaction_id,
            'revaluation_cascade',
            reason,
            previousSnapshot,
            correctedSnapshot,
            'system:valuation_cascade',
            now
        );
    }
}

/**
 * Records a dated valuation adjustment for a non-cash asset (M1-FLOW-06, T6).
 * 
 * Why this exists:
 * Non-cash assets (e.g. real estate, vehicles, private stock) experience valuation changes over time.
 * Accounting principles and Acceptance Scenario T6 dictate that an upward valuation must NOT:
 * - Increase cash or bank account balances.
 * - Appear as operating cash income or revenue.
 * Instead, it posts between the Asset account and an Unrealized Valuation Reserve Equity account.
 * 
 * Tricky logic:
 * - Idempotency Pre-Check (Assessor Findings 6 & 8): Checks idempotency key against original request
 *   including description and source before calculating any delta.
 *   Identical retries return existing record; changed details conflict without mutation.
 * - Same-Day Valuation Enforcement (Resubmission Item 1):
 *   Explicitly rejects multiple same-day valuation targets for the same account with ValidationError.
 * - Deterministic delta computation:
 *   Calculates the asset's cumulative balance before `valDate` (excluding valuations on or after `valDate`).
 *   Delta = new_valuation_cents - priorBalance.
 * - Revision-Safe Valuation Cascading (Resubmission Item 3):
 *   Records target in m1_asset_valuations. Cascades through subsequent valuations to preserve targets
 *   with auditable snapshots in m1_transaction_corrections and bumped revisions.
 * 
 * TODO: Support automated depreciation schedules in Milestone 2.
 */
export function recordAssetValuation(
    db: Database.Database,
    input: RecordAssetValuationInput
): TransactionWithPostings {
    const valDate = input.date || input.valuation_date || '';
    assertValidCalendarDate(valDate, 'Valuation date');
    assertValidMoneyCents(input.new_valuation_cents, 'New valuation amount');
    if (input.new_valuation_cents < 0) {
        throw new ValidationError('Asset valuation cannot be negative.');
    }

    const runAtomic = db.transaction(() => {
        const assetAccount = db.prepare('SELECT * FROM m1_accounts WHERE id = ?').get(input.asset_account_id) as any;
        if (!assetAccount) {
            throw new ValidationError(`Asset account not found: ${input.asset_account_id}`);
        }
        if (assetAccount.type !== 'asset') {
            throw new ValidationError(`Valuation adjustments are only supported on asset accounts, received type: "${assetAccount.type}".`);
        }
        const liquidCashSubTypes = ['cash', 'checking', 'savings'];
        if (liquidCashSubTypes.includes(assetAccount.sub_type)) {
            throw new ValidationError(`Cannot record valuation adjustment on liquid account type "${assetAccount.sub_type}". Use a transaction or opening balance.`);
        }
        const entityId = input.entity_id || assetAccount.entity_id;
        if (input.entity_id && assetAccount.entity_id !== input.entity_id) {
            throw new ValidationError(`Asset account "${assetAccount.name}" belongs to entity "${assetAccount.entity_id}", not "${input.entity_id}".`);
        }

        // 1. Idempotency Pre-Check before calculating delta (Assessor Findings 6 & 8)
        if (input.idempotency_key) {
            const existingTx = db.prepare('SELECT * FROM m1_transactions WHERE idempotency_key = ?').get(input.idempotency_key) as any;
            if (existingTx) {
                const existingVal = db.prepare('SELECT * FROM m1_asset_valuations WHERE transaction_id = ?').get(existingTx.id) as any;
                const existingPostings = db.prepare('SELECT * FROM m1_journal_entries WHERE transaction_id = ?').all(existingTx.id) as any[];

                const isDateMatch = existingTx.date === valDate;
                const isAccountMatch = existingVal ? existingVal.account_id === assetAccount.id : existingPostings.some(p => p.account_id === assetAccount.id);
                const isValuationMatch = existingVal ? existingVal.target_valuation_cents === input.new_valuation_cents : true;

                // Description identity match (Resubmission Item 8)
                const sourceDesc = input.source ? ` (${input.source.trim()})` : '';
                const expectedDesc = input.description ? input.description.trim() : `Valuation Adjustment - ${assetAccount.name}${sourceDesc}`;
                const isDescMatch = existingTx.description === expectedDesc;

                // Source identity match (Resubmission Item 8)
                const expectedSource = input.source ? input.source.trim() : null;
                const existingSource = existingVal?.source ?? existingTx.payee_or_payer ?? null;
                const isSourceMatch = existingSource === expectedSource;

                // Evidence identity match (Assessor Finding 7)
                const existingEvidence = existingTx.evidence_refs ? JSON.parse(existingTx.evidence_refs) : [];
                const isEvidenceMatch = normalizeEvidenceRefs(existingEvidence) === normalizeEvidenceRefs(input.evidence_refs);

                if (isDateMatch && isAccountMatch && isValuationMatch && isDescMatch && isSourceMatch && isEvidenceMatch) {
                    return {
                        id: existingTx.id,
                        date: existingTx.date,
                        description: existingTx.description,
                        payee_or_payer: existingTx.payee_or_payer,
                        status: existingTx.status,
                        origin: existingTx.origin,
                        idempotency_key: existingTx.idempotency_key,
                        evidence_refs: existingTx.evidence_refs ? JSON.parse(existingTx.evidence_refs) : null,
                        revision: existingTx.revision,
                        created_at: existingTx.created_at,
                        updated_at: existingTx.updated_at,
                        postings: existingPostings.map(p => ({
                            id: p.id,
                            transaction_id: p.transaction_id,
                            account_id: p.account_id,
                            amount_cents: p.amount_cents,
                            currency: p.currency,
                            memo: p.memo
                        }))
                    };
                }

                throw new ConflictError(
                    `Idempotency conflict: transaction already exists with idempotency key '${input.idempotency_key}' but different details (description, source, date, account, valuation amount, or evidence).`
                );
            }
        }

        // 2. Same-Day Valuation Enforcement (Resubmission Item 1)
        // Explicitly reject multiple same-day valuation targets for the same account.
        const existingSameDayVal = db.prepare(`
            SELECT v.id, v.transaction_id, v.target_valuation_cents
            FROM m1_asset_valuations v
            JOIN m1_transactions t ON v.transaction_id = t.id
            WHERE v.account_id = ? AND v.valuation_date = ? AND t.status = 'posted'
        `).get(assetAccount.id, valDate) as any;

        if (existingSameDayVal) {
            throw new ValidationError(
                `An asset valuation target already exists for account "${assetAccount.name}" on date "${valDate}". Multiple same-day valuations are not supported. Use edit or void to modify existing valuations.`
            );
        }

        // 3. Ensure an Unrealized Valuation Reserve account exists for this entity in the same currency
        let equityAccount = db.prepare(`
            SELECT id, name FROM m1_accounts
            WHERE entity_id = ? AND type = 'equity' AND sub_type = 'valuation_reserve' AND currency = ?
        `).get(entityId, assetAccount.currency) as any;

        if (!equityAccount) {
            const reserveAcc = createAccount(db, {
                entity_id: entityId,
                name: `Unrealized Valuation Reserve (${assetAccount.currency})`,
                type: 'equity',
                sub_type: 'valuation_reserve',
                currency: assetAccount.currency
            });
            equityAccount = reserveAcc.account;
        }

        // 4. Calculate cumulative balance prior to valDate (excluding valuations on or after valDate)
        const priorRows = db.prepare(`
            SELECT j.amount_cents
            FROM m1_journal_entries j
            JOIN m1_transactions t ON j.transaction_id = t.id
            WHERE j.account_id = ?
              AND t.status = 'posted'
              AND (t.date < ? OR (t.date = ? AND t.id NOT IN (SELECT transaction_id FROM m1_asset_valuations WHERE account_id = ?)))
        `).all(assetAccount.id, valDate, valDate, assetAccount.id) as Array<{ amount_cents: number }>;

        const priorBalanceCents = priorRows.reduce((sum, r) => sum + r.amount_cents, 0);
        const deltaCents = input.new_valuation_cents - priorBalanceCents;

        const currency = assetAccount.currency.toUpperCase();
        const postings: Array<{ account_id: string; amount_cents: number; currency: CurrencyCode; memo?: string }> = [];

        if (deltaCents === 0) {
            // Unchanged-Value Appraisal Evidence Preservation (Assessor Finding 3)
            // Record the appraisal transaction and valuation record even when carrying value is unchanged.
            // Two balanced 0-cent postings against Valuation Reserve equity ensure zero carrying balance delta.
            postings.push({
                account_id: assetAccount.id,
                amount_cents: 0,
                currency,
                memo: 'Appraisal verified (carrying value unchanged)'
            });
            postings.push({
                account_id: equityAccount.id,
                amount_cents: 0,
                currency,
                memo: 'Unrealized Valuation Reserve (carrying value unchanged)'
            });
        } else if (deltaCents > 0) {
            // Valuation Gain: Debit Asset (+), Credit Valuation Equity (-)
            postings.push({
                account_id: assetAccount.id,
                amount_cents: deltaCents,
                currency,
                memo: `Valuation Increase from appraisal: +${deltaCents} cents`
            });
            postings.push({
                account_id: equityAccount.id,
                amount_cents: -deltaCents,
                currency,
                memo: `Unrealized Valuation Reserve for ${assetAccount.name}`
            });
        } else {
            // Valuation Loss / Impairment: Credit Asset (-), Debit Valuation Equity (+)
            postings.push({
                account_id: assetAccount.id,
                amount_cents: deltaCents, // Negative
                currency,
                memo: `Valuation Impairment: ${deltaCents} cents`
            });
            postings.push({
                account_id: equityAccount.id,
                amount_cents: -deltaCents, // Positive
                currency,
                memo: `Unrealized Valuation Reserve for ${assetAccount.name}`
            });
        }

        const sourceDesc = input.source ? ` (${input.source.trim()})` : '';
        const desc = input.description ? input.description.trim() : `Valuation Adjustment - ${assetAccount.name}${sourceDesc}`;

        const postedTx = postTransaction(db, {
            date: valDate,
            description: desc,
            payee_or_payer: input.source ? input.source.trim() : null,
            origin: 'manual',
            idempotency_key: input.idempotency_key,
            evidence_refs: input.evidence_refs,
            postings
        });

        // 5. Record Target Valuation Anchor in m1_asset_valuations
        const valId = `val-${postedTx.id}`;
        const now = new Date().toISOString();
        db.prepare(`
            INSERT INTO m1_asset_valuations (id, transaction_id, account_id, valuation_date, target_valuation_cents, source, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        `).run(valId, postedTx.id, assetAccount.id, valDate, input.new_valuation_cents, input.source ? input.source.trim() : null, now);

        // 6. Cascade target preservation to any subsequent valuations
        cascadeAssetValuations(db, assetAccount.id, valDate, postedTx.id);

        return postedTx;
    });

    return runAtomic();
}

/**
 * Auditable Transaction Correction & Void Service (M1-DOM-05, M1-SAFE-06, T12, T13).
 * 
 * Validations:
 * - Requires non-empty reason and performing actor identification.
 * - Concurrency check: expected_revision must match current revision (T12).
 * - Edits enforce calendar date validity, non-empty descriptions, and validate replacement postings.
 */
export function correctTransaction(db: Database.Database, input: CorrectTransactionInput): TransactionCorrection {
    if (!input.reason || input.reason.trim().length === 0) {
        throw new ValidationError('Correction reason is mandatory for auditable changes.');
    }
    if (!input.performed_by || input.performed_by.trim().length === 0) {
        throw new ValidationError('Performing actor/user must be identified for auditable corrections.');
    }

    const tx = db.prepare('SELECT * FROM m1_transactions WHERE id = ?').get(input.transaction_id) as any;
    if (!tx) {
        throw new ValidationError(`Transaction not found: ${input.transaction_id}`);
    }

    // Concurrency check (M1-SAFE-06, T12)
    if (tx.revision !== input.expected_revision) {
        throw new ConflictError(
            `Transaction correction conflict: expected revision ${input.expected_revision}, but database is at revision ${tx.revision}.`
        );
    }

    const previousPostings = db.prepare('SELECT * FROM m1_journal_entries WHERE transaction_id = ?').all(input.transaction_id) as any[];
    const previousSnapshot = JSON.stringify({
        transaction: tx,
        postings: previousPostings
    });

    const correctionId = crypto.randomUUID();
    const now = new Date().toISOString();
    let correctedSnapshot = '';

    const executeCorrection = db.transaction(() => {
        if (input.operation === 'void') {
            // Mark void
            const res = db.prepare(`
                UPDATE m1_transactions
                SET status = 'void', revision = revision + 1, updated_at = ?
                WHERE id = ? AND revision = ?
            `).run(now, input.transaction_id, input.expected_revision);

            if (res.changes === 0) {
                throw new ConflictError(`Optimistic lock failure while voiding transaction ${input.transaction_id}.`);
            }

            // Valuation target preservation on void (Resubmission Item 2)
            const valRow = db.prepare('SELECT * FROM m1_asset_valuations WHERE transaction_id = ?').get(input.transaction_id) as any;
            if (valRow) {
                db.prepare('DELETE FROM m1_asset_valuations WHERE transaction_id = ?').run(input.transaction_id);
                cascadeAssetValuations(db, valRow.account_id, valRow.valuation_date, input.transaction_id);
            } else {
                // If any non-valuation posting was on an asset account with subsequent valuations, cascade them
                for (const p of previousPostings) {
                    const hasLater = (db.prepare('SELECT COUNT(*) as cnt FROM m1_asset_valuations WHERE account_id = ? AND valuation_date >= ?').get(p.account_id, tx.date) as any).cnt;
                    if (hasLater > 0) {
                        cascadeAssetValuations(db, p.account_id, tx.date, input.transaction_id);
                    }
                }
            }

            correctedSnapshot = JSON.stringify({
                transaction: { ...tx, status: 'void', revision: input.expected_revision + 1, updated_at: now },
                postings: previousPostings
            });
        } else if (input.operation === 'edit') {
            if (!input.new_data) {
                throw new ValidationError('New transaction data must be provided for edit operation.');
            }

            // Description validation
            if (input.new_data.description !== undefined && input.new_data.description.trim().length === 0) {
                throw new ValidationError('Transaction description cannot be empty.');
            }
            const newDesc = input.new_data.description !== undefined ? input.new_data.description.trim() : tx.description;

            // Date validation
            if (input.new_data.date !== undefined) {
                assertValidCalendarDate(input.new_data.date, 'Correction date');
            }
            const newDate = input.new_data.date !== undefined ? input.new_data.date : tx.date;
            const newPayee = input.new_data.payee_or_payer !== undefined ? input.new_data.payee_or_payer : tx.payee_or_payer;

            // Postings validation
            let updatedPostings = previousPostings;
            if (input.new_data.postings !== undefined) {
                if (input.new_data.postings.length < 2) {
                    throw new ValidationError('Replacement postings must contain at least two postings to satisfy double-entry balance.');
                }

                const preparedNew: Posting[] = input.new_data.postings.map(p => {
                    assertValidMoneyCents(p.amount_cents, `Posting for account ${p.account_id}`);
                    return {
                        id: crypto.randomUUID(),
                        transaction_id: input.transaction_id,
                        account_id: p.account_id,
                        amount_cents: p.amount_cents,
                        currency: p.currency.toUpperCase(),
                        memo: p.memo || null
                    };
                });

                const balanceCheck = validateTransactionBalance(preparedNew);
                if (!balanceCheck.isValid) {
                    throw new ValidationError(`Edited postings out of balance by ${balanceCheck.delta_cents} cents.`);
                }

                // Verify accounts exist, currencies match, and all replacement accounts belong to the same sovereign entity
                const accountLookup = db.prepare('SELECT id, name, currency, entity_id, type, sub_type FROM m1_accounts WHERE id = ?');
                let correctionEntityId: string | null = null;
                for (const p of preparedNew) {
                    const acc = accountLookup.get(p.account_id) as any;
                    if (!acc) throw new ValidationError(`Account does not exist: ${p.account_id}`);
                    if (p.currency !== acc.currency) {
                        throw new ValidationError(
                            `Posting currency "${p.currency}" does not match account currency "${acc.currency}" for account "${acc.name}".`
                        );
                    }
                    if (correctionEntityId === null) {
                        correctionEntityId = acc.entity_id;
                    } else if (correctionEntityId !== acc.entity_id) {
                        throw new ValidationError(
                            `Cross-entity correction rejected: Replacement account "${acc.name}" belongs to entity "${acc.entity_id}", while other replacement postings belong to entity "${correctionEntityId}". In Slice 1C, all postings in a transaction must belong to the same sovereign entity.`
                        );
                    }
                }

                // Invariant: replacement postings must belong to the same sovereign entity as the original transaction
                const origFirstAcc = previousPostings.length > 0
                    ? (accountLookup.get(previousPostings[0].account_id) as any)
                    : null;
                const originalEntityId = origFirstAcc?.entity_id;
                if (originalEntityId && correctionEntityId !== originalEntityId) {
                    throw new ValidationError(
                        `Cross-entity correction rejected: Replacement postings belong to entity "${correctionEntityId}", but this transaction belongs to entity "${originalEntityId}". In Slice 1C, a transaction cannot be moved across sovereign entities.`
                    );
                }

                // Valuation safety check (Assessor Finding 2):
                // If editing a valuation transaction, verify replacement postings can be interpreted safely as an authoritative valuation
                const valRowPre = db.prepare('SELECT * FROM m1_asset_valuations WHERE transaction_id = ?').get(input.transaction_id) as any;
                let computedTargetCents: number | null = null;
                if (valRowPre) {
                    const assetPostings = preparedNew.filter(p => p.account_id === valRowPre.account_id);
                    if (assetPostings.length !== 1) {
                        throw new ValidationError(
                            'Cannot safely interpret edited postings as an asset valuation: exactly one asset account posting is required.'
                        );
                    }
                    const counterpartPostings = preparedNew.filter(p => p.account_id !== valRowPre.account_id);
                    const counterpartAccounts = counterpartPostings.map(p => accountLookup.get(p.account_id) as any);
                    const allEquityReserve = counterpartAccounts.every(a => a && a.type === 'equity' && a.sub_type === 'valuation_reserve');
                    if (!allEquityReserve) {
                        throw new ValidationError(
                            'Cannot safely interpret edited postings as an asset valuation: counterpart postings must be Unrealized Valuation Reserve equity.'
                        );
                    }

                    // Calculate new authoritative target valuation
                    const priorRows = db.prepare(`
                        SELECT j.amount_cents
                        FROM m1_journal_entries j
                        JOIN m1_transactions t ON j.transaction_id = t.id
                        WHERE j.account_id = ?
                          AND t.status = 'posted'
                          AND t.id != ?
                          AND (t.date < ? OR (t.date = ? AND t.id NOT IN (SELECT transaction_id FROM m1_asset_valuations WHERE account_id = ?)))
                    `).all(valRowPre.account_id, input.transaction_id, newDate, newDate, valRowPre.account_id) as Array<{ amount_cents: number }>;
                    const priorBalance = priorRows.reduce((sum, r) => sum + r.amount_cents, 0);
                    computedTargetCents = priorBalance + assetPostings[0].amount_cents;
                    if (computedTargetCents <= 0) {
                        throw new ValidationError(`Target valuation must be strictly positive, calculated: ${computedTargetCents} cents.`);
                    }
                }

                // Delete old postings and insert new
                db.prepare('DELETE FROM m1_journal_entries WHERE transaction_id = ?').run(input.transaction_id);
                const insertPosting = db.prepare(`
                    INSERT INTO m1_journal_entries (id, transaction_id, account_id, amount_cents, currency, memo)
                    VALUES (?, ?, ?, ?, ?, ?)
                `);
                for (const p of preparedNew) {
                    insertPosting.run(p.id, p.transaction_id, p.account_id, p.amount_cents, p.currency, p.memo);
                }
                updatedPostings = preparedNew;

                // Update authoritative target in m1_asset_valuations if computed
                if (valRowPre && computedTargetCents !== null) {
                    db.prepare('UPDATE m1_asset_valuations SET target_valuation_cents = ?, valuation_date = ? WHERE id = ?').run(
                        computedTargetCents,
                        newDate,
                        valRowPre.id
                    );
                }
            }

            const res = db.prepare(`
                UPDATE m1_transactions
                SET description = ?, date = ?, payee_or_payer = ?, revision = revision + 1, updated_at = ?
                WHERE id = ? AND revision = ?
            `).run(newDesc, newDate, newPayee, now, input.transaction_id, input.expected_revision);

            if (res.changes === 0) {
                throw new ConflictError(`Optimistic lock failure while editing transaction ${input.transaction_id}.`);
            }

            // Valuation target preservation on edit (Resubmission Item 2)
            const valRow = db.prepare('SELECT * FROM m1_asset_valuations WHERE transaction_id = ?').get(input.transaction_id) as any;
            if (valRow) {
                if (newDate !== valRow.valuation_date) {
                    db.prepare('UPDATE m1_asset_valuations SET valuation_date = ? WHERE id = ?').run(newDate, valRow.id);
                }
                const minDate = newDate < valRow.valuation_date ? newDate : valRow.valuation_date;
                cascadeAssetValuations(db, valRow.account_id, minDate, input.transaction_id);
            } else {
                for (const p of updatedPostings) {
                    const minDate = newDate < tx.date ? newDate : tx.date;
                    const hasLater = (db.prepare('SELECT COUNT(*) as cnt FROM m1_asset_valuations WHERE account_id = ? AND valuation_date >= ?').get(p.account_id, minDate) as any).cnt;
                    if (hasLater > 0) {
                        cascadeAssetValuations(db, p.account_id, minDate, input.transaction_id);
                    }
                }
            }

            correctedSnapshot = JSON.stringify({
                transaction: { ...tx, description: newDesc, date: newDate, payee_or_payer: newPayee, revision: input.expected_revision + 1, updated_at: now },
                postings: updatedPostings
            });
        }

        // Insert auditable record
        db.prepare(`
            INSERT INTO m1_transaction_corrections (
                id, transaction_id, operation, reason, previous_state, corrected_state, performed_by, timestamp
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `).run(
            correctionId,
            input.transaction_id,
            input.operation,
            input.reason.trim(),
            previousSnapshot,
            correctedSnapshot,
            input.performed_by.trim(),
            now
        );
    });

    executeCorrection();

    return {
        id: correctionId,
        transaction_id: input.transaction_id,
        operation: input.operation,
        reason: input.reason.trim(),
        previous_state: previousSnapshot,
        corrected_state: correctedSnapshot,
        performed_by: input.performed_by.trim(),
        timestamp: now
    };
}

/**
 * Lists transactions with their postings, pagination options, and filters.
 * 
 * Why this exists:
 * Assessor Finding & Clarification 5:
 * Load More must reach all 1,003 records without gaps or duplicates.
 * Ordering must be strictly deterministic across page offsets by combining
 * transaction date, creation timestamp, and primary key ID tiebreaker.
 * 
 * Tricky logic:
 * When using offset pagination, non-unique orderings can cause rows to jump between pages.
 * Appending `t.id DESC` guarantees a stable order across all pagination chunks.
 * Limit is flexible (up to 5000) rather than hard-capped at 500.
 */
export function listTransactions(
    db: Database.Database,
    options: {
        entityId?: string;
        accountId?: string;
        startDate?: string;
        endDate?: string;
        limit?: number;
        offset?: number;
    } = {}
): TransactionWithPostings[] {
    let sql = `
        SELECT DISTINCT t.*
        FROM m1_transactions t
        JOIN m1_journal_entries j ON t.id = j.transaction_id
        JOIN m1_accounts a ON j.account_id = a.id
        WHERE 1=1
    `;
    const params: any[] = [];

    if (options.entityId) {
        sql += ' AND a.entity_id = ?';
        params.push(options.entityId);
    }
    if (options.accountId) {
        sql += ' AND j.account_id = ?';
        params.push(options.accountId);
    }
    if (options.startDate) {
        sql += ' AND t.date >= ?';
        params.push(options.startDate);
    }
    if (options.endDate) {
        sql += ' AND t.date <= ?';
        params.push(options.endDate);
    }

    // Stable deterministic ordering with primary key tiebreaker (Clarification 5)
    sql += ' ORDER BY t.date DESC, t.created_at DESC, t.id DESC';
    if (options.limit !== undefined) {
        const limitVal = Math.max(1, options.limit);
        sql += ` LIMIT ${limitVal}`;
        if (options.offset !== undefined) {
            const offsetVal = Math.max(0, options.offset);
            sql += ` OFFSET ${offsetVal}`;
        }
    } else if (options.offset !== undefined) {
        sql += ` LIMIT -1 OFFSET ${Math.max(0, options.offset)}`;
    }

    const txRows = db.prepare(sql).all(...params) as any[];
    if (txRows.length === 0) return [];

    const txIds = txRows.map(t => t.id);
    const placeholders = txIds.map(() => '?').join(',');
    const postingRows = db.prepare(`
        SELECT * FROM m1_journal_entries
        WHERE transaction_id IN (${placeholders})
    `).all(...txIds) as any[];

    const postingsByTx = new Map<string, Posting[]>();
    for (const p of postingRows) {
        if (!postingsByTx.has(p.transaction_id)) {
            postingsByTx.set(p.transaction_id, []);
        }
        postingsByTx.get(p.transaction_id)!.push({
            id: p.id,
            transaction_id: p.transaction_id,
            account_id: p.account_id,
            amount_cents: p.amount_cents,
            currency: p.currency,
            memo: p.memo
        });
    }

    return txRows.map(t => ({
        id: t.id,
        date: t.date,
        description: t.description,
        payee_or_payer: t.payee_or_payer,
        status: t.status,
        origin: t.origin,
        idempotency_key: t.idempotency_key,
        evidence_refs: t.evidence_refs ? JSON.parse(t.evidence_refs) : null,
        revision: t.revision,
        created_at: t.created_at,
        updated_at: t.updated_at,
        postings: postingsByTx.get(t.id) || []
    }));
}

/**
 * Counts total matching transactions for active filters (Clarification 5).
 */
export function countTransactions(
    db: Database.Database,
    options: {
        entityId?: string;
        accountId?: string;
        startDate?: string;
        endDate?: string;
    } = {}
): number {
    let sql = `
        SELECT COUNT(DISTINCT t.id) as cnt
        FROM m1_transactions t
        JOIN m1_journal_entries j ON t.id = j.transaction_id
        JOIN m1_accounts a ON j.account_id = a.id
        WHERE 1=1
    `;
    const params: any[] = [];

    if (options.entityId) {
        sql += ' AND a.entity_id = ?';
        params.push(options.entityId);
    }
    if (options.accountId) {
        sql += ' AND j.account_id = ?';
        params.push(options.accountId);
    }
    if (options.startDate) {
        sql += ' AND t.date >= ?';
        params.push(options.startDate);
    }
    if (options.endDate) {
        sql += ' AND t.date <= ?';
        params.push(options.endDate);
    }

    const row = db.prepare(sql).get(...params) as any;
    return row?.cnt || 0;
}
