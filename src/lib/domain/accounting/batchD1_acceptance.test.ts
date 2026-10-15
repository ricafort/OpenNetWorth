import { describe, it, expect, beforeEach } from 'vitest';
import Database from 'better-sqlite3';
import { createTestDb } from '@/infrastructure/sqlite/db';
import { createEntity, createAccount } from '../accounting/accountService';
import { postTransaction, correctTransaction } from '../accounting/transactionService';
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

        const matchedWf = matchReimbursement(db, {
            workflowId: wf.id,
            date: '2025-01-10',
            description: 'Reimbursement for Printer Ink',
            personalReceivingAccountId: personalBankId,
            businessBankAccountId: businessBankId,
            createMissingPersonalReceipt: true,
            createMissingBusinessPayment: true,
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
        const corrections = db.prepare('SELECT * FROM transaction_corrections WHERE transaction_id = ?').all(importedTx.id);
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

        db.prepare(`UPDATE drafts SET reimbursement_intent = 'yes' WHERE id = ?`).run(draft.id);

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
        db.prepare(`UPDATE drafts SET amount_cents = 6000 WHERE id = ?`).run(draft.id);

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
            sourceType: 'draft', sourceId: saveDraft(db, { payer_entity_id: personalEntityId, entity_id: businessEntityId, payment_account_id: personalBankId, amount_cents: 11000, currency: 'AUD', date: '2025-01-01', reimbursement_intent: 'yes' }).id,
            paymentAccountId: personalBankId, businessExpenseAccountId: businessExpenseId, performedBy: 'user'
        });

        const matchedWf = matchReimbursement(db, {
            workflowId: wf.id, date: '2025-01-10', description: 'desc', personalReceivingAccountId: personalBankId, businessBankAccountId: businessBankId, 
            createMissingPersonalReceipt: true, createMissingBusinessPayment: true, performedBy: 'user'
        });

        // Now attempt to use the newly created reimbursement transaction to settle ANOTHER workflow
        const wf2 = processPersonallyPaidBusinessExpense(db, {
            personalEntityId, businessEntityId, currency: 'AUD', amountCents: 11000, date: '2025-01-01', description: 'desc',
            sourceType: 'draft', sourceId: saveDraft(db, { payer_entity_id: personalEntityId, entity_id: businessEntityId, payment_account_id: personalBankId, amount_cents: 11000, currency: 'AUD', date: '2025-01-01', reimbursement_intent: 'yes' }).id,
            paymentAccountId: personalBankId, businessExpenseAccountId: businessExpenseId, performedBy: 'user'
        });

        expect(() => matchReimbursement(db, {
            workflowId: wf2.id, date: '2025-01-10', description: 'desc',
            personalReceivingBankTxId: matchedWf.personal_reimbursement_tx_id!,
            personalReceivingAccountId: personalBankId, businessBankAccountId: businessBankId,
            createMissingBusinessPayment: true, performedBy: 'user'
        })).toThrow('Personal transaction is already matched to another workflow');
    });

    it('enforces authoritative purchase dates (January 2 / January 9 regression)', () => {
        // Step 1: Create a posted personal transaction on Jan 2
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

        // Attempting to resolve this transaction with a conflicting date (Jan 9) must fail
        expect(() => processPersonallyPaidBusinessExpense(db, {
            personalEntityId, businessEntityId, currency: 'AUD', amountCents: 11000, date: '2025-01-09', merchant: 'Officeworks', description: 'Officeworks (Personally Paid)',
            sourceType: 'posted_transaction', sourceId: importedTx.id, paymentAccountId: personalBankId, businessExpenseAccountId: businessExpenseId, performedBy: 'TestUser'
        })).toThrow('Conflicting input date: must use authoritative purchase date.');

        // Providing the authoritative date succeeds
        const wf = processPersonallyPaidBusinessExpense(db, {
            personalEntityId, businessEntityId, currency: 'AUD', amountCents: 11000, date: '2025-01-02', merchant: 'Officeworks', description: 'Officeworks (Personally Paid)',
            sourceType: 'posted_transaction', sourceId: importedTx.id, paymentAccountId: personalBankId, businessExpenseAccountId: businessExpenseId, performedBy: 'TestUser'
        });

        // The business transaction MUST have inherited the Jan 2 date
        const busTx = db.prepare('SELECT date FROM transactions WHERE id = ?').get(wf.business_transaction_id) as any;
        expect(busTx.date).toBe('2025-01-02');
    });

    it('rejects stale revisions on transaction correction', () => {
        const suspenseAcc = createAccount(db, { entity_id: personalEntityId, name: 'Suspense', type: 'expense', sub_type: 'other', currency: 'AUD', tracking_mode: 'transactions' }).account;
        const importedTx = postTransaction(db, {
            date: '2025-01-02', description: 'Officeworks', origin: 'manual',
            postings: [{ account_id: suspenseAcc.id, amount_cents: 11000, currency: 'AUD' }, { account_id: personalBankId, amount_cents: -11000, currency: 'AUD' }]
        });

        expect(() => processPersonallyPaidBusinessExpense(db, {
            personalEntityId, businessEntityId, currency: 'AUD', amountCents: 11000, date: '2025-01-02', description: 'desc',
            sourceType: 'posted_transaction', sourceId: importedTx.id, paymentAccountId: personalBankId, businessExpenseAccountId: businessExpenseId,
            expectedRevision: 999, // stale/incorrect revision
            performedBy: 'TestUser'
        })).toThrow('Transaction revision mismatch');
    });

    it('rejects idempotency on changed purchase payment account', () => {
        const suspenseAcc = createAccount(db, { entity_id: personalEntityId, name: 'Suspense', type: 'expense', sub_type: 'other', currency: 'AUD', tracking_mode: 'transactions' }).account;
        const personalBankId2 = createAccount(db, { entity_id: personalEntityId, name: 'Another Bank', type: 'asset', sub_type: 'checking', currency: 'AUD', tracking_mode: 'transactions' }).account.id;
        
        const importedTx = postTransaction(db, {
            date: '2025-01-02', description: 'Officeworks', origin: 'manual',
            postings: [{ account_id: suspenseAcc.id, amount_cents: 11000, currency: 'AUD' }, { account_id: personalBankId, amount_cents: -11000, currency: 'AUD' }]
        });

        processPersonallyPaidBusinessExpense(db, {
            personalEntityId, businessEntityId, currency: 'AUD', amountCents: 11000, date: '2025-01-02', description: 'desc',
            sourceType: 'posted_transaction', sourceId: importedTx.id, paymentAccountId: personalBankId, businessExpenseAccountId: businessExpenseId,
            expectedRevision: 1,
            performedBy: 'TestUser'
        });

        // Retry with a different payment account -> should throw conflict
        expect(() => processPersonallyPaidBusinessExpense(db, {
            personalEntityId, businessEntityId, currency: 'AUD', amountCents: 11000, date: '2025-01-02', description: 'desc',
            sourceType: 'posted_transaction', sourceId: importedTx.id, paymentAccountId: personalBankId2, businessExpenseAccountId: businessExpenseId,
            expectedRevision: 1,
            performedBy: 'TestUser'
        })).toThrow('Conflicting reimbursement workflow exists for this transaction.');
    });

    it('accepts identical posted-expense retry using its original revision', () => {
        const suspenseAcc = createAccount(db, { entity_id: personalEntityId, name: 'Suspense', type: 'expense', sub_type: 'other', currency: 'AUD', tracking_mode: 'transactions' }).account;
        const importedTx = postTransaction(db, {
            date: '2025-01-02', description: 'Officeworks', origin: 'manual',
            postings: [{ account_id: suspenseAcc.id, amount_cents: 11000, currency: 'AUD' }, { account_id: personalBankId, amount_cents: -11000, currency: 'AUD' }]
        });

        const wf1 = processPersonallyPaidBusinessExpense(db, {
            personalEntityId, businessEntityId, currency: 'AUD', amountCents: 11000, date: '2025-01-02', description: 'desc',
            sourceType: 'posted_transaction', sourceId: importedTx.id, paymentAccountId: personalBankId, businessExpenseAccountId: businessExpenseId,
            expectedRevision: 1, // original revision
            performedBy: 'TestUser'
        });

        // The transaction was modified, so its revision is now 2 in DB.
        // However, a true idempotent retry with the exact same facts AND the original revision (1) must succeed.
        const wf2 = processPersonallyPaidBusinessExpense(db, {
            personalEntityId, businessEntityId, currency: 'AUD', amountCents: 11000, date: '2025-01-02', description: 'desc',
            sourceType: 'posted_transaction', sourceId: importedTx.id, paymentAccountId: personalBankId, businessExpenseAccountId: businessExpenseId,
            expectedRevision: 1, // original revision
            performedBy: 'TestUser'
        });
        
        expect(wf1.id).toBe(wf2.id);
    });

    it('rejects matchReimbursement on changed settlement date/account/transaction selection', () => {
        const wf = processPersonallyPaidBusinessExpense(db, {
            personalEntityId, businessEntityId, currency: 'AUD', amountCents: 11000, date: '2025-01-01', description: 'desc',
            sourceType: 'draft', sourceId: saveDraft(db, { payer_entity_id: personalEntityId, entity_id: businessEntityId, payment_account_id: personalBankId, amount_cents: 11000, currency: 'AUD', date: '2025-01-01', reimbursement_intent: 'yes' }).id,
            paymentAccountId: personalBankId, businessExpenseAccountId: businessExpenseId, performedBy: 'user'
        });

        const matchedWf = matchReimbursement(db, {
            workflowId: wf.id, date: '2025-01-10', description: 'desc', personalReceivingAccountId: personalBankId, businessBankAccountId: businessBankId, 
            createMissingPersonalReceipt: true, createMissingBusinessPayment: true, performedBy: 'user'
        });

        // Identical retry -> succeeds and returns workflow
        const matchedWfRetry = matchReimbursement(db, {
            workflowId: wf.id, date: '2025-01-10', description: 'desc', personalReceivingAccountId: personalBankId, businessBankAccountId: businessBankId, performedBy: 'user',
            personalReceivingBankTxId: matchedWf.personal_reimbursement_tx_id!, businessBankTxId: matchedWf.business_reimbursement_tx_id!
        });
        expect(matchedWf.id).toBe(matchedWfRetry.id);

        // Changed date -> throws conflict
        expect(() => matchReimbursement(db, {
            workflowId: wf.id, date: '2025-01-11', description: 'desc', personalReceivingAccountId: personalBankId, businessBankAccountId: businessBankId, performedBy: 'user',
            personalReceivingBankTxId: matchedWf.personal_reimbursement_tx_id!, businessBankTxId: matchedWf.business_reimbursement_tx_id!
        })).toThrow('Conflicting matched reimbursement exists.');

        // Changed receiving account -> throws conflict
        const personalBankId2 = createAccount(db, { entity_id: personalEntityId, name: 'Another Bank', type: 'asset', sub_type: 'checking', currency: 'AUD', tracking_mode: 'transactions' }).account.id;
        expect(() => matchReimbursement(db, {
            workflowId: wf.id, date: '2025-01-10', description: 'desc', personalReceivingAccountId: personalBankId2, businessBankAccountId: businessBankId, performedBy: 'user',
            personalReceivingBankTxId: matchedWf.personal_reimbursement_tx_id!, businessBankTxId: matchedWf.business_reimbursement_tx_id!
        })).toThrow('Conflicting matched reimbursement exists.');
    });

    it('extracts genuine document ID from structured evidence while preserving its metadata', () => {
        const suspenseAcc = createAccount(db, { entity_id: personalEntityId, name: 'Suspense', type: 'expense', sub_type: 'other', currency: 'AUD', tracking_mode: 'transactions' }).account;
        
        // Structured evidence array containing an object with document_id and metadata
        const structuredEvidence = JSON.stringify([
            { document_id: 'doc-structured-123', metadata: { confidence: 0.99, source: 'receipt_scanner' } },
            'doc-string-456'
        ]);

        const importedTx = postTransaction(db, {
            date: '2025-01-02', description: 'Officeworks', origin: 'document_extraction',
            evidence_refs: [structuredEvidence] as any, // bypassing type temporarily to simulate DB state
            postings: [{ account_id: suspenseAcc.id, amount_cents: 11000, currency: 'AUD' }, { account_id: personalBankId, amount_cents: -11000, currency: 'AUD' }]
        });

        // Manually inject the structured evidence JSON directly into DB as it would come from document service
        db.prepare('UPDATE transactions SET evidence_refs = ? WHERE id = ?').run(structuredEvidence, importedTx.id);

        const wf = processPersonallyPaidBusinessExpense(db, {
            personalEntityId, businessEntityId, currency: 'AUD', amountCents: 11000, date: '2025-01-02', description: 'desc',
            sourceType: 'posted_transaction', sourceId: importedTx.id, paymentAccountId: personalBankId, businessExpenseAccountId: businessExpenseId,
            performedBy: 'TestUser'
        });

        // Assert effectiveEvidenceDocId extracted correctly
        expect(wf.evidence_document_id).toBe('doc-structured-123');

        // Assert the new business transaction preserves the structured metadata in its evidence_refs
        const busTx = db.prepare('SELECT evidence_refs FROM transactions WHERE id = ?').get(wf.business_transaction_id) as any;
        const parsedBusRefs = JSON.parse(busTx.evidence_refs);
        expect(parsedBusRefs.length).toBe(2);
        expect(parsedBusRefs[0].document_id).toBe('doc-structured-123');
        expect(parsedBusRefs[0].metadata.source).toBe('receipt_scanner');
    });

    it('rejects a processing request whose payment account differs from the draft saved account', () => {
        const personalBankId2 = createAccount(db, { entity_id: personalEntityId, name: 'Another Bank', type: 'asset', sub_type: 'checking', currency: 'AUD', tracking_mode: 'transactions' }).account.id;
        
        const draft = saveDraft(db, {
            payer_entity_id: personalEntityId, entity_id: businessEntityId, payment_account_id: personalBankId, amount_cents: 5000, currency: 'AUD', date: '2025-01-01', reimbursement_intent: 'yes'
        });

        // Try to process with a different payment account
        expect(() => processPersonallyPaidBusinessExpense(db, {
            personalEntityId, businessEntityId, currency: 'AUD', amountCents: 5000, date: '2025-01-01', description: 'desc',
            sourceType: 'draft', sourceId: draft.id, paymentAccountId: personalBankId2, businessExpenseAccountId: businessExpenseId, performedBy: 'user'
        })).toThrow('Draft facts do not match provided input. Please explicitly correct the draft first.');

        // Normal processing succeeds
        const wf = processPersonallyPaidBusinessExpense(db, {
            personalEntityId, businessEntityId, currency: 'AUD', amountCents: 5000, date: '2025-01-01', description: 'desc',
            sourceType: 'draft', sourceId: draft.id, paymentAccountId: personalBankId, businessExpenseAccountId: businessExpenseId, performedBy: 'user'
        });
        expect(wf.status).toBe('awaiting_reimbursement');
    });

    it('protects reimbursement-linked records from ordinary edits and voids silently invalidating them', () => {
        const draft = saveDraft(db, {
            payer_entity_id: personalEntityId, entity_id: businessEntityId, payment_account_id: personalBankId, amount_cents: 5000, currency: 'AUD', date: '2025-01-01', reimbursement_intent: 'yes'
        });

        const wf = processPersonallyPaidBusinessExpense(db, {
            personalEntityId, businessEntityId, currency: 'AUD', amountCents: 5000, date: '2025-01-01', description: 'desc',
            sourceType: 'draft', sourceId: draft.id, paymentAccountId: personalBankId, businessExpenseAccountId: businessExpenseId, performedBy: 'user'
        });

        const tx = db.prepare('SELECT revision FROM transactions WHERE id = ?').get(wf.business_transaction_id) as any;

        // Attempting to void the linked transaction directly MUST throw a ValidationError guard
        expect(() => correctTransaction(db, {
            transaction_id: wf.business_transaction_id,
            expected_revision: tx.revision,
            operation: 'void',
            reason: 'Ordinary void',
            performed_by: 'user'
        })).toThrow('Ordinary edits or voids cannot be applied to transactions linked to an active reimbursement workflow.');
    });
});
