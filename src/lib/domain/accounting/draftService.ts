/**
 * Milestone 1 Accounting Draft Service
 * 
 * Why this file exists:
 * Manages unposted financial drafts (e.g. personally paid business expenses).
 * Financial drafts must not live solely in browser localStorage, nor should they
 * pollute authoritative double-entry journal ledgers before resolution.
 * This service persists drafts into `m1_drafts` with exact facts intact.
 * 
 * Tricky logic:
 * - Drafts do NOT generate postings in `m1_transactions` or `m1_journal_entries`.
 *   Calculated account balances strictly ignore drafts.
 * - Missing facts (e.g. unknown amount or currency) are preserved as `null` rather than
 *   inventing false zeroes or guessing arbitrary currencies.
 * - `saveDraft` uses `ON CONFLICT(id) DO UPDATE` to ensure atomic updates when re-editing.
 * 
 * TODO: Support automated cross-entity journal generation (Owner Draw / Due To) in Slice 1E/Milestone 2.
 */

import Database from 'better-sqlite3';
import { DraftItem, CURRENCY_DECIMALS } from './types';

export interface SaveDraftInput {
    id?: string;
    entity_id?: string | null;
    payer_entity_id?: string | null;
    payment_account_id?: string | null;
    currency?: string | null;
    amount_cents?: number | null;
    date?: string | null;
    merchant?: string | null;
    description?: string | null;
    reimbursement_intent?: 'yes' | 'no' | 'not_sure' | null;
    source_document_id?: string | null;
    source_transaction_id?: string | null;
    status?: 'draft' | 'posted' | 'void' | 'archived';
}

/**
 * Saves or updates a draft item in the SQLite database with strict domain invariants.
 * 
 * Why this exists:
 * Persists unposted/unresolved financial tasks (e.g. personally paid business expenses)
 * without polluting double-entry journal postings or modifying account balances.
 * 
 * Tricky logic:
 * - Currency Integrity: Never defaults unknown draft currency to USD. If currency is unknown,
 *   it remains null until the user selects an account or enters one explicitly.
 * - Payment Account Eligibility: Payment accounts must be liquid asset accounts (checking, savings, cash)
 *   or credit cards. Non-payment accounts like properties, loans, equity, or income accounts are rejected.
 * - Currency Consistency: If both an account and currency are provided, they must agree.
 *   Business reporting currency must never override payment currency.
 * - Source Reference Preservation: If `source_document_id` or `source_transaction_id` is omitted (`undefined`),
 *   any existing reference on an update is preserved. Passing explicit `null` deliberately clears it.
 * 
 * TODO: Add automatic tax deduction categorization suggestions when converting drafts to journal entries.
 */
export function saveDraft(db: Database.Database, input: SaveDraftInput): DraftItem {
    const id = input.id || crypto.randomUUID();

    // Load existing draft first to properly handle partial updates (omitted = preserve, null = clear)
    const existing = db.prepare('SELECT * FROM m1_drafts WHERE id = ?').get(id) as DraftItem | undefined;

    const entity_id = input.entity_id !== undefined ? input.entity_id : (existing?.entity_id ?? null);
    const payer_entity_id = input.payer_entity_id !== undefined ? input.payer_entity_id : (existing?.payer_entity_id ?? null);
    const payment_account_id = input.payment_account_id !== undefined ? input.payment_account_id : (existing?.payment_account_id ?? null);
    const inputCurrency = input.currency !== undefined ? input.currency : (existing?.currency ?? null);
    const inputAmountCents = input.amount_cents !== undefined ? input.amount_cents : (existing?.amount_cents ?? null);
    const date = input.date !== undefined ? input.date : (existing?.date ?? null);
    const merchant = input.merchant !== undefined ? input.merchant : (existing?.merchant ?? null);
    const description = input.description !== undefined ? input.description : (existing?.description ?? null);
    const reimbursement_intent = input.reimbursement_intent !== undefined ? input.reimbursement_intent : (existing?.reimbursement_intent ?? null);
    const sourceDocumentId = input.source_document_id !== undefined ? input.source_document_id : (existing?.source_document_id ?? null);
    const sourceTransactionId = input.source_transaction_id !== undefined ? input.source_transaction_id : (existing?.source_transaction_id ?? null);
    const status = input.status || existing?.status || 'draft';

    // 1. Amount validation
    let amountCents: number | null = null;
    if (inputAmountCents !== null && (inputAmountCents as any) !== '') {
        amountCents = Number(inputAmountCents);
        if (!Number.isFinite(amountCents) || !Number.isInteger(amountCents) || !Number.isSafeInteger(amountCents)) {
            throw new Error('amount_cents must be a safe, finite integer minor unit or null');
        }
    }

    // 2. Currency validation
    let currency: string | null = null;
    if (inputCurrency !== null && inputCurrency.trim() !== '') {
        const currUpper = inputCurrency.trim().toUpperCase();
        if (!(currUpper in CURRENCY_DECIMALS)) {
            throw new Error(`Unsupported currency code: "${inputCurrency}". Supported currencies are: ${Object.keys(CURRENCY_DECIMALS).join(', ')}.`);
        }
        currency = currUpper;
    }

    // 3. Payment Account validation & eligibility
    if (payment_account_id) {
        const account = db.prepare(`
            SELECT a.*, e.type as entity_type, e.name as entity_name
            FROM m1_accounts a
            JOIN m1_entities e ON a.entity_id = e.id
            WHERE a.id = ?
        `).get(payment_account_id) as any;

        if (!account) {
            throw new Error(`Payment account not found: ${payment_account_id}`);
        }

        const isEligiblePayment = (account.type === 'asset' && ['checking', 'savings', 'cash'].includes(account.sub_type)) ||
                                  (account.type === 'liability' && account.sub_type === 'credit_card');
        if (!isEligiblePayment) {
            throw new Error(`Ineligible payment account: "${account.name}" (${account.type}/${account.sub_type}). Payment accounts must be checking, savings, cash, or credit card.`);
        }

        // Validate account ownership
        if (payer_entity_id && account.entity_id !== payer_entity_id) {
            throw new Error(`Ownership mismatch: payment account "${account.name}" does not belong to the selected payer entity.`);
        }

        // Account must belong to an individual or household
        if (account.entity_type !== 'person' && account.entity_type !== 'household') {
            throw new Error(`Personal payment account must belong to an individual or household, not a ${account.entity_type}.`);
        }

        // Derive or validate currency against account
        if (currency) {
            if (currency !== account.currency.toUpperCase()) {
                throw new Error(`Currency mismatch: draft currency (${currency}) does not match payment account currency (${account.currency}).`);
            }
        } else {
            currency = account.currency.toUpperCase();
        }
    }

    // 4. Target Business Entity validation
    if (entity_id) {
        const biz = db.prepare('SELECT id, type, name FROM m1_entities WHERE id = ?').get(entity_id) as any;
        if (!biz) {
            throw new Error(`Target business entity not found: ${entity_id}`);
        }
    }

    // 5. Payer Entity validation
    if (payer_entity_id) {
        const payer = db.prepare('SELECT id, type, name FROM m1_entities WHERE id = ?').get(payer_entity_id) as any;
        if (!payer) {
            throw new Error(`Payer entity not found: ${payer_entity_id}`);
        }
    }

    // 6. Source reference preservation & foreign key validation
    if (sourceDocumentId) {
        const doc = db.prepare('SELECT id FROM m1_documents WHERE id = ?').get(sourceDocumentId);
        if (!doc) {
            throw new Error(`Referenced source document not found: ${sourceDocumentId}`);
        }
    }

    if (sourceTransactionId) {
        const tx = db.prepare('SELECT id FROM m1_transactions WHERE id = ?').get(sourceTransactionId);
        if (!tx) {
            throw new Error(`Referenced source transaction not found: ${sourceTransactionId}`);
        }
    }

    if (reimbursement_intent && !['yes', 'no', 'not_sure'].includes(reimbursement_intent)) {
        throw new Error('reimbursement_intent must be "yes", "no", "not_sure", or null');
    }

    const now = new Date().toISOString();

    const stmt = db.prepare(`
        INSERT INTO m1_drafts (
            id, entity_id, payer_entity_id, payment_account_id, currency, amount_cents,
            date, merchant, description, reimbursement_intent, source_document_id,
            source_transaction_id, status, created_at, updated_at
        ) VALUES (
            @id, @entity_id, @payer_entity_id, @payment_account_id, @currency, @amount_cents,
            @date, @merchant, @description, @reimbursement_intent, @source_document_id,
            @source_transaction_id, @status, @created_at, @updated_at
        ) ON CONFLICT(id) DO UPDATE SET
            entity_id = excluded.entity_id,
            payer_entity_id = excluded.payer_entity_id,
            payment_account_id = excluded.payment_account_id,
            currency = excluded.currency,
            amount_cents = excluded.amount_cents,
            date = excluded.date,
            merchant = excluded.merchant,
            description = excluded.description,
            reimbursement_intent = excluded.reimbursement_intent,
            source_document_id = excluded.source_document_id,
            source_transaction_id = excluded.source_transaction_id,
            status = excluded.status,
            updated_at = excluded.updated_at
    `);

    stmt.run({
        id,
        entity_id,
        payer_entity_id,
        payment_account_id,
        currency,
        amount_cents: amountCents,
        date,
        merchant,
        description,
        reimbursement_intent,
        source_document_id: sourceDocumentId,
        source_transaction_id: sourceTransactionId,
        status,
        created_at: existing?.created_at || now,
        updated_at: now
    });

    const saved = db.prepare('SELECT * FROM m1_drafts WHERE id = ?').get(id) as DraftItem;
    return saved;
}

/**
 * Retrieves all active drafts, optionally filtered by entity_id.
 */
export function getDrafts(db: Database.Database, filter?: { entity_id?: string }): DraftItem[] {
    if (filter?.entity_id) {
        return db.prepare("SELECT * FROM m1_drafts WHERE entity_id = ? AND status = 'draft' ORDER BY created_at DESC").all(filter.entity_id) as DraftItem[];
    }
    return db.prepare("SELECT * FROM m1_drafts WHERE status = 'draft' ORDER BY created_at DESC").all() as DraftItem[];
}

/**
 * Deletes a draft item by ID.
 */
export function deleteDraft(db: Database.Database, id: string): boolean {
    const res = db.prepare('DELETE FROM m1_drafts WHERE id = ?').run(id);
    return res.changes > 0;
}
