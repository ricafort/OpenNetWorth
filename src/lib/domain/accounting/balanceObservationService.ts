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
    BalanceImportBatch,
    AccountSourceMapping,
    ReconciliationComparison,
    ValuationBalanceKind,
    VALUATION_BALANCE_KINDS,
    isValuationBalanceKind,
    CURRENCY_DECIMALS,
    CurrencyCode,
    assertValidMoneyCents
} from './types';
import { getAccount, getEntity, ValidationError, ConflictError } from './accountService';
import { getAccountBalance } from './balanceService';
import { assertValidCalendarDate } from './transactionService';
import { getLocalTodayCalendarDate } from '../calendarDate';

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
    source_excerpt?: string | null;
    is_user_modified?: boolean;
    explicit_correction?: boolean;
    /**
     * Dedicated explicit flag for supporting-detail classification overrides.
     * 
     * Why this exists:
     * Fulfills Delivery 2A Narrow Closing Corrections (Item 1):
     * Set only when the user deliberately alters supporting-detail status.
     * Prevents general confirmation (Confirm Row) or unrelated edits from authorizing an override.
     */
    explicit_classification_correction?: boolean;
    is_correction?: boolean;
    is_component_of_total?: boolean;
    parent_observation_id?: string | null;
    /**
     * Delivery 2B: Retained document ID in m1_documents when balance is extracted from a statement PDF.
     */
    document_id?: string | null;
    /**
     * Delivery 2B: 1-indexed page number in the statement document where the balance was sourced.
     */
    page_number?: number | null;
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
        // Idempotency & Deliberate Classification Corrections:
        // Why this exists:
        // Fulfills Delivery 2A & 2B (Finding 3):
        // 1. Prevents duplicate observations when saving unchanged documents or batches.
        // 2. Repeating an unchanged save returns the existing observation without creating a new row or incrementing revision.
        // 3. Deliberate classification changes require explicit correction intent (explicit_classification_correction / explicit_correction).
        // 4. Verifies expected_balance_revision before mutating: rejects stale concurrent updates with ConflictError (HTTP 409).
        // 
        // Tricky logic:
        // Supports both document-based persistence (document_id + page_number) and text batch persistence (source_batch_id + source_reference).
        // Preserves user's reviewed classification on unchanged retries.
        // 
        // TODO: Support multi-user audit trail logging for deliberate classification overrides.
        const isDocumentSave = Boolean(input.document_id);
        const isBatchSave = Boolean(input.source_batch_id && input.source_reference);

        let existing: any = null;

        if (isDocumentSave) {
            existing = db.prepare(`
                SELECT * FROM m1_balance_observations
                WHERE account_id = ?
                  AND balance_kind = ?
                  AND effective_date = ?
                  AND amount_cents = ?
                  AND document_id = ?
                  AND (page_number = ? OR (page_number IS NULL AND ? IS NULL))
                  AND review_status IN ('accepted', 'superseded')
                ORDER BY created_at DESC
                LIMIT 1
            `).get(
                input.account_id,
                input.balance_kind,
                input.effective_date,
                input.amount_cents,
                input.document_id,
                input.page_number ?? null,
                input.page_number ?? null
            );
        } else if (isBatchSave) {
            existing = db.prepare(`
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
            );
        }

        if (existing) {
            const isClassificationChanged = Boolean(input.is_component_of_total) !== Boolean(existing.is_component_of_total);
            const hasExplicitCorrectionIntent = Boolean(
                input.explicit_classification_correction || input.explicit_correction || input.is_correction
            );

            if (isClassificationChanged && hasExplicitCorrectionIntent) {
                // Check expected_balance_revision before changing saved classification
                if (input.expected_balance_revision !== undefined) {
                    const currentRev = (account.balance_revision !== undefined) ? account.balance_revision : 1;
                    if (currentRev !== input.expected_balance_revision) {
                        throw new ConflictError(
                            `Concurrent balance observation detected for account "${account.name}". Expected revision ${input.expected_balance_revision}, found ${currentRev}. Please refresh and review updated balances.`
                        );
                    }
                }

                // Apply deliberate classification correction
                db.prepare(`
                    UPDATE m1_balance_observations
                    SET is_component_of_total = ?, is_user_modified = 1
                    WHERE id = ?
                `).run(input.is_component_of_total ? 1 : 0, existing.id);

                db.prepare(`
                    UPDATE m1_accounts
                    SET balance_revision = balance_revision + 1, updated_at = ?
                    WHERE id = ?
                `).run(now, input.account_id);

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
                    source_excerpt: existing.source_excerpt || null,
                    is_user_modified: true,
                    is_component_of_total: Boolean(input.is_component_of_total),
                    parent_observation_id: existing.parent_observation_id || null,
                    document_id: existing.document_id || input.document_id || null,
                    page_number: typeof existing.page_number === 'number' ? existing.page_number : (typeof input.page_number === 'number' ? input.page_number : null),
                    superseded_by_id: existing.superseded_by_id,
                    review_status: existing.review_status,
                    raw_label: existing.raw_label,
                    created_at: existing.created_at
                };
                return;
            }

            // Ordinary reimport (no explicit correction intent) or unchanged retry:
            // Preserves user's reviewed classification without mutating or incrementing balance revision.
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
                source_excerpt: existing.source_excerpt || null,
                is_user_modified: Boolean(existing.is_user_modified),
                is_component_of_total: Boolean(existing.is_component_of_total),
                parent_observation_id: existing.parent_observation_id || null,
                document_id: existing.document_id || input.document_id || null,
                page_number: typeof existing.page_number === 'number' ? existing.page_number : (typeof input.page_number === 'number' ? input.page_number : null),
                superseded_by_id: existing.superseded_by_id,
                review_status: existing.review_status,
                raw_label: existing.raw_label,
                created_at: existing.created_at
            };
            return;
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
                source_reference, source_batch_id, source_excerpt,
                is_user_modified, is_component_of_total, parent_observation_id,
                document_id, page_number,
                superseded_by_id, review_status, raw_label, created_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
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
            input.source_excerpt || null,
            input.is_user_modified ? 1 : 0,
            input.is_component_of_total ? 1 : 0,
            input.parent_observation_id || null,
            input.document_id || null,
            typeof input.page_number === 'number' ? input.page_number : null,
            null,
            reviewStatus,
            input.raw_label || null,
            now
        );

        // 3. If committing an accepted observation, supersede prior accepted observations
        // on the exact same account, effective date, and balance kind.
        // Why this logic exists:
        // Fulfills Delivery 2A Requirement A: If this observation is an included component of a total
        // (is_component_of_total = 1), it must NEVER supersede or replace a portfolio total on the same account!
        // It only supersedes prior component observations of the exact same kind and date.
        // Conversely, a portfolio total only supersedes prior non-component observations.
        if (reviewStatus === 'accepted') {
            const componentClause = input.is_component_of_total
                ? `AND is_component_of_total = 1`
                : `AND (is_component_of_total = 0 OR is_component_of_total IS NULL)`;

            const prior = db.prepare(`
                SELECT id FROM m1_balance_observations
                WHERE account_id = ? AND effective_date = ? AND balance_kind = ? AND review_status = 'accepted' AND id != ?
                ${componentClause}
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
            source_excerpt: input.source_excerpt || null,
            is_user_modified: Boolean(input.is_user_modified),
            is_component_of_total: Boolean(input.is_component_of_total),
            parent_observation_id: input.parent_observation_id || null,
            document_id: input.document_id || null,
            page_number: typeof input.page_number === 'number' ? input.page_number : null,
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
 * Records an import batch preserving raw pasted statement text and metadata.
 * Idempotent: If a batch with this id already exists, returns the existing record.
 * 
 * Why this exists:
 * Fulfills Delivery 2A Requirement C:
 * Retains verbatim raw pasted statement text once per batch for auditability and replay.
 */
export function recordBalanceImportBatch(
    db: Database.Database,
    batch: BalanceImportBatch
): BalanceImportBatch {
    const existing = db.prepare(`SELECT * FROM m1_balance_import_batches WHERE id = ?`).get(batch.id) as any;
    if (existing) {
        return {
            id: existing.id,
            raw_text: existing.raw_text,
            extraction_method: existing.extraction_method,
            model_identifier: existing.model_identifier || null,
            created_at: existing.created_at
        };
    }
    const now = batch.created_at || new Date().toISOString();
    db.prepare(`
        INSERT INTO m1_balance_import_batches (id, raw_text, extraction_method, model_identifier, created_at)
        VALUES (?, ?, ?, ?, ?)
    `).run(
        batch.id,
        batch.raw_text,
        batch.extraction_method,
        batch.model_identifier || null,
        now
    );
    return {
        id: batch.id,
        raw_text: batch.raw_text,
        extraction_method: batch.extraction_method,
        model_identifier: batch.model_identifier || null,
        created_at: now
    };
}

/**
 * Retrieves the latest accepted observation eligible for wealth valuation on or before asOfDate.
 * 
 * Why this exists:
 * Strictly filters by VALUATION_BALANCE_KINDS so credit limits, available redraw, and projected
 * values are NEVER aggregated into current wealth.
 * Filters out included portfolio components (is_component_of_total = 1) so cash or sub-holdings
 * already included in a portfolio total never inflate net worth.
 * Returns null if no eligible valuation observation exists (indicating incomplete coverage).
 */
export function getLatestValuationObservation(
    db: Database.Database,
    accountId: string,
    asOfDate?: string
): BalanceObservation | null {
    const targetDate = asOfDate || getLocalTodayCalendarDate();
    const placeholders = VALUATION_BALANCE_KINDS.map(() => '?').join(', ');

    const row = db.prepare(`
        SELECT * FROM m1_balance_observations
        WHERE account_id = ?
          AND review_status = 'accepted'
          AND effective_date <= ?
          AND balance_kind IN (${placeholders})
          AND (is_component_of_total = 0 OR is_component_of_total IS NULL)
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
        source_excerpt: row.source_excerpt || null,
        is_user_modified: Boolean(row.is_user_modified),
        is_component_of_total: Boolean(row.is_component_of_total),
        parent_observation_id: row.parent_observation_id || null,
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
        source_excerpt: row.source_excerpt || null,
        is_user_modified: Boolean(row.is_user_modified),
        is_component_of_total: Boolean(row.is_component_of_total),
        parent_observation_id: row.parent_observation_id || null,
        superseded_by_id: row.superseded_by_id,
        review_status: row.review_status,
        raw_label: row.raw_label,
        document_id: row.document_id,
        page_number: row.page_number,
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
    
    if (observation.account_id !== accountId) {
        throw new ValidationError('Failed to reconcile: Observation does not match the requested account.');
    }

    if (!Number.isSafeInteger(observation.amount_cents)) {
        throw new ValidationError('Amount must be a safe integer of minor units (cents).');
    }

    if (observation.currency !== account.currency) {
        throw new ValidationError(`Currency mismatch: Expected ${account.currency} but got ${observation.currency}.`);
    }

    const validBalanceKinds = [
        'posted_balance',
        'current_balance',
        'available_balance',
        'statement_closing_balance',
        'credit_limit',
        'available_credit',
        'outstanding_loan_principal',
        'available_redraw',
        'brokerage_cash',
        'buying_power',
        'securities_market_value',
        'total_portfolio_value',
        'projected_future_value',
        'unresolved'
    ];
    if (!validBalanceKinds.includes(observation.balance_kind)) {
        throw new ValidationError(`Invalid or unsupported balance kind: ${observation.balance_kind}`);
    }

    // Validate effective date: Reconciliation strictly requires an explicit, valid calendar date (YYYY-MM-DD)
    // Why this exists:
    // Fulfills Delivery 2A Narrow Closing Corrections (Item 2):
    // Rejects missing/blank/invalid dates with ValidationError (HTTP 400).
    // Prevents calculation using an implicit "today" when date is cleared or omitted.
    // 
    // Tricky logic:
    // Throws ValidationError if effective_date is absent, empty, or not a real calendar date.
    // 
    // TODO: Support historical time-of-day intraday reconciliation in Milestone 2.
    if (!observation.effective_date || typeof observation.effective_date !== 'string' || !observation.effective_date.trim()) {
        throw new ValidationError('Observation effective date is required for reconciliation.');
    }
    assertValidCalendarDate(observation.effective_date.trim(), 'Reconciliation effective date');

    // Calculate ledger balance as of the observation's effective date
    const ledgerCalc = getAccountBalance(db, accountId, observation.effective_date.trim());
    const recordedCents = ledgerCalc.balance_cents;
    const reportedCents = observation.amount_cents;

    // Fetch owner and source details
    const entity = getEntity(db, account.entity_id);
    const ownerName = entity ? entity.name : undefined;
    
    let sourceDocumentName: string | undefined;
    let documentId: string | undefined;
    if (observation.document_id) {
        documentId = observation.document_id;
        try {
            const docRow = db.prepare('SELECT filename FROM m1_documents WHERE id = ?').get(observation.document_id) as any;
            if (docRow && docRow.filename) {
                sourceDocumentName = docRow.filename;
            }
        } catch (e) {
            // Ignore error if table missing or document not found
        }
    }

    // Check balance comparability: non-valuation kinds, credit limits, and holds cannot directly reconcile with posted ledger
    const nonComparableKinds: BalanceKind[] = [
        'available_balance',
        'credit_limit',
        'available_credit',
        'available_redraw',
        'buying_power',
        'projected_future_value',
        'unresolved'
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
            owner_name: ownerName,
            source_document_name: sourceDocumentName,
            document_id: documentId,
            currency: account.currency,
            effective_date: observation.effective_date,
            account_opening_date: account.opening_date,
            reported_amount_cents: reportedCents,
            reported_balance_kind: observation.balance_kind,
            recorded_ledger_cents: recordedCents,
            diff_cents: reportedCents - recordedCents,
            is_comparable: false,
            status: 'not_directly_comparable',
            notes: noteMsg
        };
    }

    // Check for balance-only tracking mode
    if (account.tracking_mode === 'balance') {
        return {
            account_id: accountId,
            account_name: account.name,
            owner_name: ownerName,
            source_document_name: sourceDocumentName,
            document_id: documentId,
            currency: account.currency,
            effective_date: observation.effective_date,
            account_opening_date: account.opening_date,
            reported_amount_cents: reportedCents,
            reported_balance_kind: observation.balance_kind,
            recorded_ledger_cents: 0,
            diff_cents: 0,
            is_comparable: false,
            status: 'balance_only',
            notes: 'Balance-only account'
        };
    }

    // Check for insufficient history
    const isMissingOpeningBalance = account.opening_balance_cents === null || account.opening_balance_cents === undefined;
    let isOpeningDateInvalid = false;
    if (account.opening_date) {
        if (account.opening_date > observation.effective_date) {
            isOpeningDateInvalid = true;
        } else {
            // Also validate that if opening_date is set, it's a real calendar date format
            try {
                if (!/^\d{4}-\d{2}-\d{2}$/.test(account.opening_date)) throw new Error();
                assertValidCalendarDate(account.opening_date, 'Opening date');
            } catch (e) {
                isOpeningDateInvalid = true;
            }
        }
    } else if (!isMissingOpeningBalance) {
        // If it has a balance but no date, it's invalid
        isOpeningDateInvalid = true;
    }

    if (isMissingOpeningBalance || isOpeningDateInvalid) {
        let notes = 'More information is needed to compare this balance. An opening balance is required.';
        if (isOpeningDateInvalid) {
            notes = `The account's established opening date (${account.opening_date}) is after the statement date (${observation.effective_date}).`;
        }

        return {
            account_id: accountId,
            account_name: account.name,
            owner_name: ownerName,
            source_document_name: sourceDocumentName,
            document_id: documentId,
            currency: account.currency,
            effective_date: observation.effective_date,
            account_opening_date: account.opening_date,
            reported_amount_cents: reportedCents,
            reported_balance_kind: observation.balance_kind,
            recorded_ledger_cents: recordedCents,
            diff_cents: reportedCents - recordedCents,
            is_comparable: false,
            status: 'insufficient_history',
            notes
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
        owner_name: ownerName,
        source_document_name: sourceDocumentName,
        document_id: documentId,
        currency: account.currency,
        effective_date: observation.effective_date,
        account_opening_date: account.opening_date,
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
 * Retrieves a specific balance observation by its ID.
 */
export function getObservationById(
    db: Database.Database,
    observationId: string
): BalanceObservation | null {
    const row = db.prepare(`
        SELECT * FROM m1_balance_observations
        WHERE id = ?
    `).get(observationId) as any;

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
        source_excerpt: row.source_excerpt || null,
        is_user_modified: Boolean(row.is_user_modified),
        is_component_of_total: Boolean(row.is_component_of_total),
        parent_observation_id: row.parent_observation_id || null,
        superseded_by_id: row.superseded_by_id,
        review_status: row.review_status,
        raw_label: row.raw_label,
        document_id: row.document_id,
        page_number: row.page_number,
        created_at: row.created_at
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
