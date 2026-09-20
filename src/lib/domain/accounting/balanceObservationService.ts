/**
 * Balance Observation & Account Reconciliation Service
 * 
 * Why this file exists:
 * Implements Delivery 1 of the Balance Updates, Local Extraction, and Account Reconciliation engine.
 * Records dated balance observations as historical evidence without creating artificial ledger transactions.
 * Provides date-matched reconciliation against double-entry ledger balances and manages confirmed
 * account source mappings.
 * 
 * Tricky logic:
 * - Concurrency control: Increments `m1_accounts.balance_revision` upon every accepted observation
 *   commit to prevent concurrent overwrite races between multi-tab reviews.
 * - Supersession chain: When a new observation is committed for the same account, effective date,
 *   and balance kind, any prior accepted observation is marked 'superseded' with `superseded_by_id`.
 * - Date-matched reconciliation: Reconciles an observation against the recorded ledger balance
 *   as of the observation's *effective date*, NOT today's date, preventing false discrepancies
 *   when later transactions have settled.
 * - Balance kind comparability: `available_balance` (which includes pending holds) is flagged as
 *   'not_directly_comparable' when compared against settled double-entry journal postings.
 * 
 * TODO: Support automated import batch undo/rollback via `source_batch_id` in future milestones.
 */

import Database from 'better-sqlite3';
import {
    BalanceKind,
    BalanceObservation,
    AccountSourceMapping,
    ReconciliationComparison,
    ValuationBalanceKind,
    VALUATION_BALANCE_KINDS,
    isValuationBalanceKind,
    CURRENCY_DECIMALS,
    CurrencyCode,
    assertValidMoneyCents
} from './types';
import { getAccount, ValidationError, ConflictError } from './accountService';
import { getAccountBalance } from './balanceService';
import { assertValidCalendarDate } from './transactionService';

export interface RecordObservationInput {
    id?: string;
    account_id: string;
    amount_cents: number;
    currency?: CurrencyCode;
    balance_kind: BalanceKind;
    effective_date: string; // YYYY-MM-DD
    effective_time?: string | null;
    source_type: 'manual' | 'table_paste' | 'document' | 'api';
    source_reference?: string | null;
    source_batch_id?: string | null;
    review_status?: 'proposed' | 'accepted' | 'superseded' | 'rejected';
    raw_label?: string | null;
    expected_balance_revision?: number;
}

/**
 * Records a dated balance observation for an account.
 * Atomically advances the account's balance_revision when review_status is 'accepted'.
 */
export function recordBalanceObservation(
    db: Database.Database,
    input: RecordObservationInput
): BalanceObservation {
    assertValidMoneyCents(input.amount_cents, 'Observation amount cents');
    assertValidCalendarDate(input.effective_date, 'Observation effective date');

    const account = getAccount(db, input.account_id);
    if (!account) {
        throw new ValidationError(`Account not found: ${input.account_id}`);
    }

    const currency = (input.currency || account.currency).toUpperCase();
    if (!(currency in CURRENCY_DECIMALS)) {
        throw new ValidationError(`Unsupported currency code: "${currency}". Supported currencies: ${Object.keys(CURRENCY_DECIMALS).join(', ')}`);
    }

    if (account.currency !== currency) {
        throw new ValidationError(`Observation currency "${currency}" does not match account currency "${account.currency}".`);
    }

    const id = input.id || crypto.randomUUID();
    const now = new Date().toISOString();
    const reviewStatus = input.review_status || 'accepted';

    let createdObservation: BalanceObservation;

    const tx = db.transaction(() => {
        // Idempotency: If this exact source event was already imported and recorded, return the existing row.
        // Why this exists:
        // Prevents duplicate observations and ensures reimporting an already-imported source file is a safe, idempotent no-op.
        // Tricky logic:
        // Look up across historical statuses ('accepted', 'superseded'). If an observation from this source was previously accepted
        // but subsequently superseded by a later manual correction, reimporting the old source file must NOT resurrect the old value
        // over the user's manual correction or increment the revision count. It returns the existing record idempotently.
        // Note: 'rejected' and 'proposed' statuses are excluded so unaccepted or discarded items can be re-proposed.
        // TODO: Support intentional source-level rollbacks if an explicit user preference flag is provided.
        if (input.source_batch_id && input.source_reference) {
            const existing = db.prepare(`
                SELECT * FROM m1_balance_observations
                WHERE account_id = ?
                  AND balance_kind = ?
                  AND effective_date = ?
                  AND amount_cents = ?
                  AND source_batch_id = ?
                  AND source_reference = ?
                  AND review_status IN ('accepted', 'superseded')
                ORDER BY created_at DESC
                LIMIT 1
            `).get(
                input.account_id,
                input.balance_kind,
                input.effective_date,
                input.amount_cents,
                input.source_batch_id,
                input.source_reference
            ) as any;

            if (existing) {
                createdObservation = {
                    id: existing.id,
                    account_id: existing.account_id,
                    amount_cents: existing.amount_cents,
                    currency: existing.currency,
                    balance_kind: existing.balance_kind,
                    effective_date: existing.effective_date,
                    effective_time: existing.effective_time,
                    imported_at: existing.imported_at,
                    source_type: existing.source_type,
                    source_reference: existing.source_reference,
                    source_batch_id: existing.source_batch_id,
                    superseded_by_id: existing.superseded_by_id,
                    review_status: existing.review_status,
                    raw_label: existing.raw_label,
                    created_at: existing.created_at
                };
                return;
            }
        }

        // 1. Concurrency check if caller provided an expected balance revision
        if (input.expected_balance_revision !== undefined && reviewStatus === 'accepted') {
            const currentRev = (account.balance_revision !== undefined) ? account.balance_revision : 1;
            if (currentRev !== input.expected_balance_revision) {
                throw new ConflictError(
                    `Concurrent balance observation detected for account "${account.name}". Expected revision ${input.expected_balance_revision}, found ${currentRev}. Please refresh and review updated balances.`
                );
            }
        }

        // 2. Insert the new observation first (so its ID exists for foreign key constraints)
        db.prepare(`
            INSERT INTO m1_balance_observations (
                id, account_id, amount_cents, currency, balance_kind,
                effective_date, effective_time, imported_at, source_type,
                source_reference, source_batch_id, superseded_by_id,
                review_status, raw_label, created_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).run(
            id,
            input.account_id,
            input.amount_cents,
            currency,
            input.balance_kind,
            input.effective_date,
            input.effective_time || null,
            now,
            input.source_type,
            input.source_reference || null,
            input.source_batch_id || null,
            null,
            reviewStatus,
            input.raw_label || null,
            now
        );

        // 3. If committing an accepted observation, supersede prior accepted observations
        // on the exact same account, effective date, and balance kind
        if (reviewStatus === 'accepted') {
            const prior = db.prepare(`
                SELECT id FROM m1_balance_observations
                WHERE account_id = ? AND effective_date = ? AND balance_kind = ? AND review_status = 'accepted' AND id != ?
            `).all(input.account_id, input.effective_date, input.balance_kind, id) as Array<{ id: string }>;

            for (const p of prior) {
                db.prepare(`
                    UPDATE m1_balance_observations
                    SET review_status = 'superseded', superseded_by_id = ?
                    WHERE id = ?
                `).run(id, p.id);
            }

            // Increment account's balance revision to guard future commits
            db.prepare(`
                UPDATE m1_accounts
                SET balance_revision = balance_revision + 1, updated_at = ?
                WHERE id = ?
            `).run(now, input.account_id);
        }

        createdObservation = {
            id,
            account_id: input.account_id,
            amount_cents: input.amount_cents,
            currency,
            balance_kind: input.balance_kind,
            effective_date: input.effective_date,
            effective_time: input.effective_time || null,
            imported_at: now,
            source_type: input.source_type,
            source_reference: input.source_reference || null,
            source_batch_id: input.source_batch_id || null,
            superseded_by_id: null,
            review_status: reviewStatus,
            raw_label: input.raw_label || null,
            created_at: now
        };
    });

    tx();
    return createdObservation!;
}

/**
 * Retrieves the latest accepted observation eligible for wealth valuation on or before asOfDate.
 * 
 * Why this exists:
 * Strictly filters by VALUATION_BALANCE_KINDS so credit limits, available redraw, and projected
 * values are NEVER aggregated into current wealth.
 * Returns null if no eligible valuation observation exists (indicating incomplete coverage).
 */
export function getLatestValuationObservation(
    db: Database.Database,
    accountId: string,
    asOfDate?: string
): BalanceObservation | null {
    const targetDate = asOfDate || new Date().toISOString().split('T')[0];
    const placeholders = VALUATION_BALANCE_KINDS.map(() => '?').join(', ');

    const row = db.prepare(`
        SELECT * FROM m1_balance_observations
        WHERE account_id = ?
          AND review_status = 'accepted'
          AND effective_date <= ?
          AND balance_kind IN (${placeholders})
        ORDER BY effective_date DESC, created_at DESC, id DESC
        LIMIT 1
    `).get(accountId, targetDate, ...VALUATION_BALANCE_KINDS) as any;

    if (!row) return null;

    return {
        id: row.id,
        account_id: row.account_id,
        amount_cents: row.amount_cents,
        currency: row.currency,
        balance_kind: row.balance_kind,
        effective_date: row.effective_date,
        effective_time: row.effective_time,
        imported_at: row.imported_at,
        source_type: row.source_type,
        source_reference: row.source_reference,
        source_batch_id: row.source_batch_id,
        superseded_by_id: row.superseded_by_id,
        review_status: row.review_status,
        raw_label: row.raw_label,
        created_at: row.created_at
    };
}

/**
 * Retrieves the newest observation of any kind for an account (for freshness display).
 */
export function getLatestObservation(
    db: Database.Database,
    accountId: string
): BalanceObservation | null {
    const row = db.prepare(`
        SELECT * FROM m1_balance_observations
        WHERE account_id = ? AND review_status = 'accepted'
        ORDER BY effective_date DESC, created_at DESC, id DESC
        LIMIT 1
    `).get(accountId) as any;

    if (!row) return null;

    return {
        id: row.id,
        account_id: row.account_id,
        amount_cents: row.amount_cents,
        currency: row.currency,
        balance_kind: row.balance_kind,
        effective_date: row.effective_date,
        effective_time: row.effective_time,
        imported_at: row.imported_at,
        source_type: row.source_type,
        source_reference: row.source_reference,
        source_batch_id: row.source_batch_id,
        superseded_by_id: row.superseded_by_id,
        review_status: row.review_status,
        raw_label: row.raw_label,
        created_at: row.created_at
    };
}

/**
 * Compares an observation against the recorded double-entry ledger balance as of the observation's effective date.
 * 
 * Why this exists:
 * For transaction-tracked accounts, compares reported balance with recorded ledger balance.
 * Prevents false discrepancies by reconciling against the observation's *effective date*, NOT today's date.
 */
export function getReconciliationComparison(
    db: Database.Database,
    accountId: string,
    observation: BalanceObservation
): ReconciliationComparison {
    const account = getAccount(db, accountId);
    if (!account) {
        throw new ValidationError(`Account not found with ID: ${accountId}`);
    }

    // Calculate ledger balance as of the observation's effective date
    const ledgerCalc = getAccountBalance(db, accountId, observation.effective_date);
    const recordedCents = ledgerCalc.balance_cents;
    const reportedCents = observation.amount_cents;

    // Check balance comparability: non-valuation kinds, credit limits, and holds cannot directly reconcile with posted ledger
    const nonComparableKinds: BalanceKind[] = [
        'available_balance',
        'credit_limit',
        'available_credit',
        'available_redraw',
        'buying_power',
        'projected_future_value'
    ];

    if (nonComparableKinds.includes(observation.balance_kind)) {
        let noteMsg = `Reported ${observation.balance_kind.replace(/_/g, ' ')} cannot be reconciled directly against settled double-entry journal postings.`;
        if (observation.balance_kind === 'available_balance') {
            noteMsg = 'Reported available balance accounts for pending holds and cannot be reconciled directly against settled double-entry journal postings.';
        } else if (observation.balance_kind === 'credit_limit') {
            noteMsg = 'Credit limit represents borrowing capacity rather than an account ledger balance.';
        }
        return {
            account_id: accountId,
            account_name: account.name,
            currency: account.currency,
            effective_date: observation.effective_date,
            reported_amount_cents: reportedCents,
            reported_balance_kind: observation.balance_kind,
            recorded_ledger_cents: recordedCents,
            diff_cents: reportedCents - recordedCents,
            is_comparable: false,
            status: 'not_directly_comparable',
            notes: noteMsg
        };
    }

    // Sign normalization:
    // Both assets and liabilities in OpenNetWorth are reported as positive magnitude in balance observations.
    // For liabilities, getAccountBalance() also normalizes the normal balance to positive (credit-normal).
    const diffCents = reportedCents - recordedCents;
    const isMatched = diffCents === 0;

    return {
        account_id: accountId,
        account_name: account.name,
        currency: account.currency,
        effective_date: observation.effective_date,
        reported_amount_cents: reportedCents,
        reported_balance_kind: observation.balance_kind,
        recorded_ledger_cents: recordedCents,
        diff_cents: diffCents,
        is_comparable: true,
        status: isMatched ? 'matched' : 'discrepancy',
        notes: isMatched ? undefined : `Discrepancy of ${diffCents} cents between reported ${observation.balance_kind} and recorded ledger balance on ${observation.effective_date}.`
    };
}

/**
 * Saves a confirmed external institution source mapping.
 */
export function recordSourceMapping(
    db: Database.Database,
    input: {
        accountId: string;
        provider: string;
        connectionId?: string;
        sourceAccountId: string;
        institution?: string | null;
    }
): AccountSourceMapping {
    const connectionId = input.connectionId || 'default';
    const id = crypto.randomUUID();
    const now = new Date().toISOString();

    db.prepare(`
        INSERT INTO m1_account_source_mappings (
            id, account_id, provider, connection_id, source_account_id, institution, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(provider, connection_id, source_account_id) DO UPDATE SET
            account_id = excluded.account_id,
            institution = excluded.institution
    `).run(
        id,
        input.accountId,
        input.provider,
        connectionId,
        input.sourceAccountId,
        input.institution || null,
        now
    );

    return {
        id,
        account_id: input.accountId,
        provider: input.provider,
        connection_id: connectionId,
        source_account_id: input.sourceAccountId,
        institution: input.institution || null,
        created_at: now
    };
}

/**
 * Finds an account ID by confirmed provider and source account identifier.
 */
export function findAccountBySourceMapping(
    db: Database.Database,
    provider: string,
    sourceAccountId: string,
    connectionId = 'default'
): string | null {
    const row = db.prepare(`
        SELECT account_id FROM m1_account_source_mappings
        WHERE provider = ? AND connection_id = ? AND source_account_id = ?
    `).get(provider, connectionId, sourceAccountId) as { account_id: string } | undefined;

    return row ? row.account_id : null;
}
