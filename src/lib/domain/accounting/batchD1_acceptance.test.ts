import { describe, it, expect, beforeEach } from 'vitest';
import Database from 'better-sqlite3';
import { createTestDb } from '@/infrastructure/sqlite/db';
import { initAccountingSchema } from '../accounting/schema';
import { createEntity, createAccount } from '../accounting/accountService';
import { postTransaction } from '../accounting/transactionService';
import { saveDraft } from '../accounting/draftService';
import { processPersonallyPaidBusinessExpense, getOrCreateClearingAccounts, matchReimbursement } from '../../../features/reimbursement/reimbursementService';
import { getSharedFinancialSummary } from '../accounting/sharedFinancialSummaryService';
import { getAccountBalance } from '../accounting/balanceService';

describe('Batch D1 Acceptance: Personally Paid Business Expenses', () => {
    let db: Database.Database;
    let personalEntityId: string;
    let businessEntityId: string;
    let personalBankId: string;
    let businessBankId: string;
    let businessExpenseId: string;

    beforeEach(() => {
        db = createTestDb();
        initAccountingSchema(db);

        // 1. Setup entities
        personalEntityId = createEntity(db, { name: 'Household', type: 'household', currency: 'AUD' }).id;
        businessEntityId = createEntity(db, { name: 'Acme LLC', type: 'business', currency: 'AUD' }).id;

        // 2. Setup accounts (Starting balances: Personal \, Business \)
        personalBankId = createAccount(db, {
            entity_id: personalEntityId, name: 'Personal Checking', type: 'asset', sub_type: 'checking', currency: 'AUD', tracking_mode: 'transactions', opening_balance_cents: 100000, opening_date: '2025-01-01'
        }).account.id;

        businessBankId = createAccount(db, {
            entity_id: businessEntityId, name: 'Business Bank', type: 'asset', sub_type: 'checking', currency: 'AUD', tracking_mode: 'transactions', opening_balance_cents: 50000, opening_date: '2025-01-01'
        }).account.id;

        businessExpenseId = createAccount(db, {
            entity_id: businessEntityId, name: 'Office Supplies', type: 'expense', sub_type: 'other', currency: 'AUD', tracking_mode: 'transactions'
        }).account.id;
    });

    it('processes a new draft, matches reimbursement, and eliminates in combined report', () => {
        // Step 1: Create a draft
        const draft = saveDraft(db, {
            payer_entity_id: personalEntityId,
            payment_account_id: personalBankId,
            amount_cents: 11000,
            currency: 'AUD',
            date: '2025-01-01',
            merchant: 'Officeworks',
            description: 'Printer ink',
            reimbursement_intent: 'yes',
            entity_id: businessEntityId
        });
        const draftId = draft.id;

        // Pre-purchase balances
        let personalBal = getAccountBalance(db, personalBankId, '2025-01-01').balance_cents;
        let businessBal = getAccountBalance(db, businessBankId, '2025-01-01').balance_cents;
        expect(personalBal).toBe(100000);
        expect(businessBal).toBe(50000);

        // Process expense
        const wf = processPersonallyPaidBusinessExpense(db, {
            personalEntityId,
            businessEntityId,
            currency: 'AUD',
            amountCents: 11000,
            date: '2025-01-01',
            merchant: 'Officeworks',
            description: 'Printer ink (Personally Paid)',
            sourceType: 'draft',
            sourceId: draftId,
            paymentAccountId: personalBankId,
            businessExpenseAccountId: businessExpenseId,
            performedBy: 'TestUser'
        });

        expect(wf.status).toBe('awaiting_reimbursement');
        
        // After Purchase:
        // Personal Bank = \ (100000 - 11000 = 89000)
        personalBal = getAccountBalance(db, personalBankId, '2025-01-01').balance_cents;
        expect(personalBal).toBe(89000);

        // Due from Business = \
        const dueFromBal = getAccountBalance(db, wf.due_from_account_id, '2025-01-01').balance_cents;
        expect(dueFromBal).toBe(11000);

        // Due to Owner = \ (Liabilities are positive balances natively)
        const dueToBal = getAccountBalance(db, wf.due_to_account_id, '2025-01-01').balance_cents;
        expect(dueToBal).toBe(11000);

        // Combined Report Treatment BEFORE Reimbursement
        const combinedReport = getSharedFinancialSummary(db, { asOfDate: '2025-01-01' });
        // Assets should be 89000 (Personal Bank) + 50000 (Business Bank) = 139000
        // Due From (11000) is eliminated. Due To (11000) is eliminated.
        expect(combinedReport.total_assets_cents_by_currency['AUD']).toBe(139000);
        expect(combinedReport.total_liabilities_cents_by_currency['AUD'] ?? 0).toBe(0);

        // Per-Owner report (Personal)
        const personalReport = getSharedFinancialSummary(db, { asOfDate: '2025-01-01', scopeEntityId: personalEntityId });
        expect(personalReport.total_assets_cents_by_currency['AUD']).toBe(100000); // 89000 + 11000 due from

        // Perform Reimbursement (Neither bank side imported yet, manual flow)
        const matchedWf = matchReimbursement(db, {
            workflowId: wf.id,
            date: '2025-01-10',
            description: 'Reimbursement for Printer Ink',
            personalReceivingAccountId: personalBankId,
            businessBankAccountId: businessBankId,
            performedBy: 'TestUser'
        });

        expect(matchedWf.status).toBe('reimbursed');

        // After Reimbursement:
        // Personal Bank = \
        personalBal = getAccountBalance(db, personalBankId, '2025-01-10').balance_cents;
        expect(personalBal).toBe(100000);

        // Business Bank = \ (50000 - 11000)
        businessBal = getAccountBalance(db, businessBankId, '2025-01-10').balance_cents;
        expect(businessBal).toBe(39000);

        // Internal balances = 0
        expect(getAccountBalance(db, wf.due_from_account_id, '2025-01-10').balance_cents).toBe(0);
        expect(getAccountBalance(db, wf.due_to_account_id, '2025-01-10').balance_cents).toBe(0);
    });

    it('corrects an already posted personal expense without duplicate charges', () => {
        // Step 1: Create a posted personal transaction simulating a bank feed import
        const suspenseAcc = createAccount(db, { entity_id: personalEntityId, name: 'Suspense', type: 'expense', sub_type: 'other', currency: 'AUD', tracking_mode: 'transactions' }).account;

        const importedTx = postTransaction(db, {
            date: '2025-01-02',
            description: 'Officeworks',
            origin: 'document_extraction',
            postings: [
                { account_id: suspenseAcc.id, amount_cents: 11000, currency: 'AUD' },
                { account_id: personalBankId, amount_cents: -11000, currency: 'AUD' }
            ]
        });

        expect(getAccountBalance(db, personalBankId, '2025-01-02').balance_cents).toBe(89000);

        // Process expense
        const wf = processPersonallyPaidBusinessExpense(db, {
            personalEntityId,
            businessEntityId,
            currency: 'AUD',
            amountCents: 11000,
            date: '2025-01-02',
            merchant: 'Officeworks',
            description: 'Officeworks (Personally Paid)',
            sourceType: 'posted_transaction',
            sourceId: importedTx.id,
            paymentAccountId: personalBankId,
            businessExpenseAccountId: businessExpenseId,
            performedBy: 'TestUser'
        });

        // The bank account is still exactly 89000 (no duplicate charge)
        expect(getAccountBalance(db, personalBankId, '2025-01-02').balance_cents).toBe(89000);

        // Suspense is empty
        expect(getAccountBalance(db, suspenseAcc.id, '2025-01-02').balance_cents).toBe(0);

        // Due From is populated
        expect(getAccountBalance(db, wf.due_from_account_id, '2025-01-02').balance_cents).toBe(11000);

        // Check auditable correction was recorded
        const corrections = db.prepare('SELECT * FROM m1_transaction_corrections WHERE transaction_id = ?').all(importedTx.id);
        expect(corrections.length).toBe(1);
    });

    it('validates draft facts and rejects silent overrides', () => {
        const draft = saveDraft(db, {
            payer_entity_id: personalEntityId,
            entity_id: businessEntityId,
            payment_account_id: personalBankId,
            amount_cents: 11000,
            currency: 'AUD',
            date: '2025-01-01',
            reimbursement_intent: 'not_sure'
        });

        // Intent must be 'yes'
        expect(() => processPersonallyPaidBusinessExpense(db, {
            personalEntityId, businessEntityId, currency: 'AUD', amountCents: 11000, date: '2025-01-01', description: 'desc',
            sourceType: 'draft', sourceId: draft.id, paymentAccountId: personalBankId, businessExpenseAccountId: businessExpenseId, performedBy: 'user'
        })).toThrow('Draft must have reimbursement intent');

        db.prepare(`UPDATE m1_drafts SET reimbursement_intent = 'yes' WHERE id = ?`).run(draft.id);

        // Conflicting amount
        expect(() => processPersonallyPaidBusinessExpense(db, {
            personalEntityId, businessEntityId, currency: 'AUD', amountCents: 12000, date: '2025-01-01', description: 'desc',
            sourceType: 'draft', sourceId: draft.id, paymentAccountId: personalBankId, businessExpenseAccountId: businessExpenseId, performedBy: 'user'
        })).toThrow('Draft facts do not match provided input');
    });

    it('rejects identical retries with changed facts but accepts true idempotency', () => {
        const draft = saveDraft(db, {
            payer_entity_id: personalEntityId, entity_id: businessEntityId, payment_account_id: personalBankId, amount_cents: 5000, currency: 'AUD', date: '2025-01-01', reimbursement_intent: 'yes'
        });

        const wf1 = processPersonallyPaidBusinessExpense(db, {
            personalEntityId, businessEntityId, currency: 'AUD', amountCents: 5000, date: '2025-01-01', description: 'first',
            sourceType: 'draft', sourceId: draft.id, paymentAccountId: personalBankId, businessExpenseAccountId: businessExpenseId, performedBy: 'user'
        });

        // True idempotency (same details) returns the same workflow
        const wf2 = processPersonallyPaidBusinessExpense(db, {
            personalEntityId, businessEntityId, currency: 'AUD', amountCents: 5000, date: '2025-01-01', description: 'first',
            sourceType: 'draft', sourceId: draft.id, paymentAccountId: personalBankId, businessExpenseAccountId: businessExpenseId, performedBy: 'user'
        });
        expect(wf1.id).toBe(wf2.id);

        // Update the draft facts so it passes draft validation but conflicts with the workflow
        db.prepare(`UPDATE m1_drafts SET amount_cents = 6000 WHERE id = ?`).run(draft.id);

        // Changed financial details throws conflict
        expect(() => processPersonallyPaidBusinessExpense(db, {
            personalEntityId, businessEntityId, currency: 'AUD', amountCents: 6000, date: '2025-01-01', description: 'first',
            sourceType: 'draft', sourceId: draft.id, paymentAccountId: personalBankId, businessExpenseAccountId: businessExpenseId, performedBy: 'user'
        })).toThrow('Conflicting reimbursement workflow exists');
    });

    it('validates account roles correctly', () => {
        // Business bank account instead of personal payment account
        expect(() => processPersonallyPaidBusinessExpense(db, {
            personalEntityId, businessEntityId, currency: 'AUD', amountCents: 11000, date: '2025-01-01', description: 'desc',
            sourceType: 'draft', sourceId: 'fake', paymentAccountId: businessBankId, businessExpenseAccountId: businessExpenseId, performedBy: 'user'
        })).toThrow('Payment account must belong to the selected personal entity');

        // Asset account instead of expense account for business
        expect(() => processPersonallyPaidBusinessExpense(db, {
            personalEntityId, businessEntityId, currency: 'AUD', amountCents: 11000, date: '2025-01-01', description: 'desc',
            sourceType: 'draft', sourceId: 'fake', paymentAccountId: personalBankId, businessExpenseAccountId: businessBankId, performedBy: 'user'
        })).toThrow('Business expense account must belong to the business entity and be of type expense');
    });

    it('prevents exclusive matching violations', () => {
        const wf = processPersonallyPaidBusinessExpense(db, {
            personalEntityId, businessEntityId, currency: 'AUD', amountCents: 11000, date: '2025-01-01', description: 'desc',
            sourceType: 'draft', sourceId: saveDraft(db, { payer_entity_id: personalEntityId, entity_id: businessEntityId, amount_cents: 11000, currency: 'AUD', date: '2025-01-01', reimbursement_intent: 'yes' }).id,
            paymentAccountId: personalBankId, businessExpenseAccountId: businessExpenseId, performedBy: 'user'
        });

        const matchedWf = matchReimbursement(db, {
            workflowId: wf.id, date: '2025-01-10', description: 'desc', personalReceivingAccountId: personalBankId, businessBankAccountId: businessBankId, performedBy: 'user'
        });

        // Now attempt to use the newly created reimbursement transaction to settle ANOTHER workflow
        const wf2 = processPersonallyPaidBusinessExpense(db, {
            personalEntityId, businessEntityId, currency: 'AUD', amountCents: 11000, date: '2025-01-01', description: 'desc',
            sourceType: 'draft', sourceId: saveDraft(db, { payer_entity_id: personalEntityId, entity_id: businessEntityId, amount_cents: 11000, currency: 'AUD', date: '2025-01-01', reimbursement_intent: 'yes' }).id,
            paymentAccountId: personalBankId, businessExpenseAccountId: businessExpenseId, performedBy: 'user'
        });

        expect(() => matchReimbursement(db, {
            workflowId: wf2.id, date: '2025-01-10', description: 'desc',
            personalReceivingBankTxId: matchedWf.personal_reimbursement_tx_id!,
            personalReceivingAccountId: personalBankId, businessBankAccountId: businessBankId, performedBy: 'user'
        })).toThrow('Personal transaction is already matched to another workflow');
    });
});
