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
 * - Double-entry invariance: Every transaction must balance to zero cents (Sum(Debits) - Sum(Credits) === 0).
 * - Idempotency enforcement (M1-SAFE-05, T11):
 *   If an idempotency_key is provided and already exists in m1_transactions, the service
 *   returns the existing transaction and its postings rather than creating duplicate ledger rows.
 * - Non-duplication of expenses (M1-FLOW-04, T4):
 *   Credit card repayments move funds between Bank (Asset) and Card (Liability). Neither leg
 *   touches an Expense account, guaranteeing credit purchases are counted as expenses only once.
 * - Loan split precision (M1-FLOW-05, T5):
 *   Loan repayments split cash outflow into Liability reduction (Principal) and Period expenses
 *   (Interest and Fees), maintaining exact integer cent equality: total = principal + interest + fee.
 * - Auditable corrections (M1-DOM-05, T13):
 *   Transactions are never destructively wiped. Voiding or editing stores an immutable
 *   snapshot of previous_state in m1_transaction_corrections and enforces optimistic revision checks.
 * 
 * TODO: Add multi-currency transfer FX hedging journals in Slice 1D.
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
import { ConflictError, ValidationError, getEntity } from './accountService';

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
    evidence_refs?: string[] | null;
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
    evidence_refs?: string[] | null;
}

export interface RecordTransferInput {
    from_account_id: string;
    to_account_id: string;
    amount_cents: number;
    date: string; // YYYY-MM-DD
    description?: string;
    idempotency_key?: string | null;
    evidence_refs?: string[] | null;
}

export interface RecordCreditCardRepaymentInput {
    bank_account_id: string;
    card_account_id: string;
    amount_cents: number;
    date: string; // YYYY-MM-DD
    description?: string;
    idempotency_key?: string | null;
    evidence_refs?: string[] | null;
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
    evidence_refs?: string[] | null;
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
 * Posts an authoritative double-entry transaction atomically.
 * 
 * Why this exists:
 * The single core transaction committer in OpenNetWorth. Validates that postings
 * sum exactly to zero cents and handles idempotency keys to prevent duplicate commits.
 */
export function postTransaction(db: Database.Database, input: PostTransactionInput): TransactionWithPostings {
    if (!input.description || input.description.trim().length === 0) {
        throw new ValidationError('Transaction description is required.');
    }
    if (!input.date || !/^\d{4}-\d{2}-\d{2}$/.test(input.date)) {
        throw new ValidationError('A valid date (YYYY-MM-DD) is required for transactions.');
    }
    if (!input.postings || input.postings.length < 2) {
        throw new ValidationError('A transaction must have at least two postings to satisfy double-entry balance.');
    }

    // Idempotency check (M1-SAFE-05, T11)
    if (input.idempotency_key) {
        const existingTx = db.prepare('SELECT * FROM m1_transactions WHERE idempotency_key = ?').get(input.idempotency_key) as any;
        if (existingTx) {
            const existingPostings = db.prepare('SELECT * FROM m1_journal_entries WHERE transaction_id = ?').all(existingTx.id) as any[];
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

    // Verify all referenced accounts exist in SQLite
    const accountCheck = db.prepare('SELECT id FROM m1_accounts WHERE id = ?');
    for (const p of preparedPostings) {
        const row = accountCheck.get(p.account_id);
        if (!row) {
            throw new ValidationError(`Account does not exist: ${p.account_id}`);
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
 */
export function recordIncome(db: Database.Database, input: RecordIncomeInput): TransactionWithPostings {
    assertValidMoneyCents(input.amount_cents, 'Income amount');
    if (input.amount_cents <= 0) {
        throw new ValidationError('Income amount must be greater than zero cents.');
    }

    const bankAccount = db.prepare('SELECT * FROM m1_accounts WHERE id = ?').get(input.bank_account_id) as any;
    if (!bankAccount) {
        throw new ValidationError(`Bank account not found: ${input.bank_account_id}`);
    }

    // Find or auto-provision income account
    let incomeAccId = input.income_account_id;
    if (!incomeAccId) {
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
}

/**
 * Records an expense event (M1-FLOW-02, T2, T4).
 * 
 * Postings:
 * - Debit Expense Account (+amount_cents) -> increases expense total
 * - Credit Payment Account (-amount_cents) -> reduces asset balance (Bank) OR increases liability (Credit Card)
 */
export function recordExpense(db: Database.Database, input: RecordExpenseInput): TransactionWithPostings {
    assertValidMoneyCents(input.amount_cents, 'Expense amount');
    if (input.amount_cents <= 0) {
        throw new ValidationError('Expense amount must be greater than zero cents.');
    }

    const paymentAccount = db.prepare('SELECT * FROM m1_accounts WHERE id = ?').get(input.payment_account_id) as any;
    if (!paymentAccount) {
        throw new ValidationError(`Payment account not found: ${input.payment_account_id}`);
    }

    // Find or auto-provision expense account
    let expenseAccId = input.expense_account_id;
    if (!expenseAccId) {
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
}

/**
 * Records an account transfer between owned accounts (M1-FLOW-03, T3).
 * 
 * Postings:
 * - Credit Source Account (-amount_cents)
 * - Debit Destination Account (+amount_cents)
 * 
 * Invariant:
 * Generates zero net income and zero net spending ($0.00). Combined net worth is unchanged.
 */
export function recordTransfer(db: Database.Database, input: RecordTransferInput): TransactionWithPostings {
    assertValidMoneyCents(input.amount_cents, 'Transfer amount');
    if (input.amount_cents <= 0) {
        throw new ValidationError('Transfer amount must be greater than zero cents.');
    }
    if (input.from_account_id === input.to_account_id) {
        throw new ValidationError('Source and destination accounts for a transfer must be different.');
    }

    const fromAccount = db.prepare('SELECT * FROM m1_accounts WHERE id = ?').get(input.from_account_id) as any;
    const toAccount = db.prepare('SELECT * FROM m1_accounts WHERE id = ?').get(input.to_account_id) as any;

    if (!fromAccount) throw new ValidationError(`Source account not found: ${input.from_account_id}`);
    if (!toAccount) throw new ValidationError(`Destination account not found: ${input.to_account_id}`);

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
}

/**
 * Records a credit card bill repayment (M1-FLOW-04, T4).
 * 
 * Postings:
 * - Credit Bank Account (-amount_cents) -> reduces cash asset
 * - Debit Credit Card Account (+amount_cents) -> reduces credit card liability
 * 
 * Invariant:
 * Neither posting touches an Expense account. Expenses were already recognized at purchase time.
 * This ensures expenses are counted ONCE only (T4).
 */
export function recordCreditCardRepayment(db: Database.Database, input: RecordCreditCardRepaymentInput): TransactionWithPostings {
    assertValidMoneyCents(input.amount_cents, 'Repayment amount');
    if (input.amount_cents <= 0) {
        throw new ValidationError('Repayment amount must be greater than zero cents.');
    }

    const bankAccount = db.prepare('SELECT * FROM m1_accounts WHERE id = ?').get(input.bank_account_id) as any;
    const cardAccount = db.prepare('SELECT * FROM m1_accounts WHERE id = ?').get(input.card_account_id) as any;

    if (!bankAccount) throw new ValidationError(`Bank account not found: ${input.bank_account_id}`);
    if (!cardAccount) throw new ValidationError(`Credit card account not found: ${input.card_account_id}`);
    if (cardAccount.type !== 'liability') {
        throw new ValidationError(`Credit card account must be a liability account, received type: ${cardAccount.type}`);
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
 * Invariant:
 * total_cents = principal_cents + interest_cents + fee_cents.
 * Postings sum exactly to 0 cents.
 */
export function recordLoanRepayment(db: Database.Database, input: RecordLoanRepaymentInput): TransactionWithPostings {
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

    const bankAccount = db.prepare('SELECT * FROM m1_accounts WHERE id = ?').get(input.bank_account_id) as any;
    const loanAccount = db.prepare('SELECT * FROM m1_accounts WHERE id = ?').get(input.loan_account_id) as any;

    if (!bankAccount) throw new ValidationError(`Bank account not found: ${input.bank_account_id}`);
    if (!loanAccount) throw new ValidationError(`Loan account not found: ${input.loan_account_id}`);
    if (loanAccount.type !== 'liability') {
        throw new ValidationError(`Loan account must be a liability account, received type: ${loanAccount.type}`);
    }

    const currency = bankAccount.currency;

    // Ensure interest and fee expense accounts
    let interestAccId = input.interest_account_id;
    if (!interestAccId && input.interest_cents > 0) {
        const interestAcc = ensureExpenseAccount(db, loanAccount.entity_id, 'loan_interest', currency);
        interestAccId = interestAcc.id;
    }

    let feeAccId = input.fee_account_id;
    if (!feeAccId && feeCents > 0) {
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
}

/**
 * Auditable Transaction Correction & Void Service (M1-DOM-05, M1-SAFE-06, T12, T13).
 * 
 * Why this exists:
 * In double-entry accounting, history is immutable. We do not wipe rows silently.
 * Voiding marks the transaction status as 'void' so it ceases to affect ledger balances,
 * increments the revision number, and captures a complete JSON snapshot of the prior state
 * in m1_transaction_corrections.
 * 
 * Tricky logic:
 * - Optimistic concurrency check: Throws ConflictError if expected_revision !== current revision (T12).
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
        throw new ConflictError(`Transaction correction conflict: expected revision ${input.expected_revision}, but database is at revision ${tx.revision}.`);
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

            correctedSnapshot = JSON.stringify({
                transaction: { ...tx, status: 'void', revision: input.expected_revision + 1, updated_at: now },
                postings: previousPostings
            });
        } else if (input.operation === 'edit') {
            if (!input.new_data) {
                throw new ValidationError('New transaction data must be provided for edit operation.');
            }

            const newDesc = input.new_data.description !== undefined ? input.new_data.description.trim() : tx.description;
            const newDate = input.new_data.date !== undefined ? input.new_data.date : tx.date;
            const newPayee = input.new_data.payee_or_payer !== undefined ? input.new_data.payee_or_payer : tx.payee_or_payer;

            const res = db.prepare(`
                UPDATE m1_transactions
                SET description = ?, date = ?, payee_or_payer = ?, revision = revision + 1, updated_at = ?
                WHERE id = ? AND revision = ?
            `).run(newDesc, newDate, newPayee, now, input.transaction_id, input.expected_revision);

            if (res.changes === 0) {
                throw new ConflictError(`Optimistic lock failure while editing transaction ${input.transaction_id}.`);
            }

            // If postings updated
            let updatedPostings = previousPostings;
            if (input.new_data.postings && input.new_data.postings.length >= 2) {
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
 * Lists transactions with their postings and optional filters.
 */
export function listTransactions(
    db: Database.Database,
    options: {
        entityId?: string;
        accountId?: string;
        startDate?: string;
        endDate?: string;
        limit?: number;
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

    sql += ' ORDER BY t.date DESC, t.created_at DESC';
    if (options.limit) {
        sql += ` LIMIT ${Math.min(options.limit, 500)}`;
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
