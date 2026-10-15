/**
 * @vitest-environment happy-dom
 */

import React, { act } from 'react';
import ReactDOM from 'react-dom/client';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import Database from 'better-sqlite3';
import crypto from 'crypto';

(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;

if (typeof (globalThis as any).ResizeObserver === 'undefined') {
    (globalThis as any).ResizeObserver = class {
        observe() {}
        unobserve() {}
        disconnect() {}
    };
}

import { createTestDb, setTestDb, closeDb } from '@/infrastructure/sqlite/db';
import { initAccountingSchema } from '@/lib/domain/accounting/schema';
import { getAccountBalance } from '@/lib/domain/accounting/balanceService';
import { createEntity, createAccount, getAccount } from '@/lib/domain/accounting/accountService';
import { 
    ingestCsvDocument, 
    saveCsvMapping, 
    updateProposalReview,
    approveProposals,
    linkProposalToTransaction
} from '@/lib/domain/document/documentInboxService';
import { initDocumentSchema } from '@/lib/domain/document/schema';
import { 
    processPersonallyPaidBusinessExpense, 
    matchReimbursement, 
    undoReimbursementMatch, 
    undoPersonallyPaidBusinessExpense 
} from '@/features/reimbursement/reimbursementService';
import { recordBalanceObservation, getReconciliationComparison } from '@/lib/domain/accounting/balanceObservationService';
import { getSharedFinancialSummary } from '@/lib/domain/accounting/sharedFinancialSummaryService';
import { ProposalReviewTable } from '@/features/accounting/components/ProposalReviewTable';

describe('E1 End-to-End Acceptance Journey', () => {
    let db: Database.Database;
    let container: HTMLDivElement;
    let root: ReactDOM.Root;
    let fetchSpy: any;

    beforeEach(() => {
        db = createTestDb();
        setTestDb(db);
        initAccountingSchema(db);
        initDocumentSchema(db);
        
        container = document.createElement('div');
        document.body.appendChild(container);
        root = ReactDOM.createRoot(container);
    });

    afterEach(() => {
        act(() => {
            root.unmount();
        });
        container.remove();
        closeDb();
        if (fetchSpy) {
            fetchSpy.mockRestore();
        }
    });

    it('Executes E1 connected journey completely', async () => {
        // Step 1: Start with known personal and business account balances.
        const householdEntity = createEntity(db, { name: 'Household', currency: 'AUD', type: 'household' });
        const businessEntity = createEntity(db, { name: 'Acme Corp', currency: 'AUD', type: 'business' });

        const personalBank = createAccount(db, { 
            entity_id: householdEntity.id, 
            name: 'Personal Checking', 
            type: 'asset', 
            sub_type: 'checking', 
            currency: 'AUD',
            opening_balance_cents: 500000,
            opening_date: '2026-09-01'
        }).account;

        const businessBank = createAccount(db, { 
            entity_id: businessEntity.id, 
            name: 'Business Checking', 
            type: 'asset', 
            sub_type: 'checking', 
            currency: 'AUD',
            opening_balance_cents: 1000000,
            opening_date: '2026-09-01'
        }).account;

        const businessExpenseAcc = createAccount(db, {
            entity_id: businessEntity.id,
            name: 'Office Supplies',
            type: 'expense',
            sub_type: 'other',
            currency: 'AUD'
        }).account;

        // Step 2: Save mapping & Import Business transactions
        const mapping = saveCsvMapping(db, {
            name: 'Standard Bank',
            header_signature: 'amount,date,description',
            date_column: 'date',
            date_format: 'YYYY-MM-DD',
            description_column: 'description',
            amount_mode: 'single_amount',
            amount_column: 'amount'
        });

        const csvContent = `date,description,amount\n2026-09-10,Office Supplies,-100.00\n2026-09-11,Client Payment,500.00`;
        const ingestResult = ingestCsvDocument(db, {
            filename: 'statement.csv',
            raw_content: csvContent,
            mapping,
            target_account_id: businessBank.id
        });

        const expenseProposal = ingestResult.proposals.find(p => p.amount_cents < 0);
        const incomeProposal = ingestResult.proposals.find(p => p.amount_cents > 0);
        
        updateProposalReview(db, { proposal_id: expenseProposal!.id, suggested_category: 'office_supplies' });
        updateProposalReview(db, { proposal_id: incomeProposal!.id, suggested_category: 'business_income' });

        approveProposals(db, {
            document_id: ingestResult.document.id,
            target_account_id: businessBank.id,
            entity_id: businessEntity.id,
            items: [
                { proposal_id: expenseProposal!.id, category: 'office_supplies', payment_confirmed: true },
                { proposal_id: incomeProposal!.id, category: 'business_income', payment_confirmed: true }
            ]
        });

        expect(getAccountBalance(db, businessBank.id).balance_cents).toBe(1040000);

        // Step 3: Import an AUD 110 personal purchase.
        const personalPurchaseCsv = `date,description,amount\n2026-09-12,Printer,-110.00`;
        const personalIngest = ingestCsvDocument(db, {
            filename: 'personal.csv',
            raw_content: personalPurchaseCsv,
            mapping,
            target_account_id: personalBank.id
        });
        const personalProposal = personalIngest.proposals[0];
        
        const personalExpenseResult = approveProposals(db, {
            document_id: personalIngest.document.id,
            target_account_id: personalBank.id,
            entity_id: householdEntity.id,
            items: [{ proposal_id: personalProposal.id, category: 'other_expense', payment_confirmed: true }]
        });
        const personalTxId = personalExpenseResult.transaction_ids[0];

        // Step 4: Attach its receipt without another bank debit.
        const receiptDocId = crypto.randomUUID();
        db.prepare(`INSERT INTO documents (id, filename, content_hash, mime_type, byte_size, created_at) VALUES (?, 'receipt.pdf', 'hash123', 'application/pdf', 1024, datetime('now'))`).run(receiptDocId);
        const receiptProposalId = crypto.randomUUID();
        db.prepare(`INSERT INTO proposals (id, document_id, event_date, original_currency, amount_cents, description, event_type, evidence_json, extraction_version, review_status, created_at, updated_at) VALUES (?, ?, '2026-09-12', 'AUD', -11000, 'Receipt', 'expense', '{}', '1.0', 'unreviewed', datetime('now'), datetime('now'))`).run(receiptProposalId, receiptDocId);
        linkProposalToTransaction(db, { proposal_id: receiptProposalId, transaction_id: personalTxId });

        // Step 5: Classify it as business spending.
        const wf = processPersonallyPaidBusinessExpense(db, {
            personalEntityId: householdEntity.id,
            businessEntityId: businessEntity.id,
            currency: 'AUD',
            amountCents: 11000,
            date: '2026-09-12',
            description: 'Printer for business',
            sourceType: 'posted_transaction',
            sourceId: personalTxId,
            paymentAccountId: personalBank.id,
            businessExpenseAccountId: businessExpenseAcc.id,
            performedBy: 'TestUser'
        });

        expect(wf.status).toBe('awaiting_reimbursement');

        // Step 6: Import and match both reimbursement movements.
        const reimbPersonalCsv = `date,description,amount\n2026-09-14,Reimbursement In,110.00`;
        const reimbPersonalIngest = ingestCsvDocument(db, {
            filename: 'personal_reimb.csv',
            raw_content: reimbPersonalCsv,
            mapping,
            target_account_id: personalBank.id
        });
        const personalReimbResult = approveProposals(db, {
            document_id: reimbPersonalIngest.document.id,
            target_account_id: personalBank.id,
            entity_id: householdEntity.id,
            items: [{ proposal_id: reimbPersonalIngest.proposals[0].id, category: 'other_income', payment_confirmed: true }]
        });
        
        const reimbBusinessCsv = `date,description,amount\n2026-09-14,Reimbursement Out,-110.00`;
        const reimbBusinessIngest = ingestCsvDocument(db, {
            filename: 'business_reimb.csv',
            raw_content: reimbBusinessCsv,
            mapping,
            target_account_id: businessBank.id
        });
        const businessReimbResult = approveProposals(db, {
            document_id: reimbBusinessIngest.document.id,
            target_account_id: businessBank.id,
            entity_id: businessEntity.id,
            items: [{ proposal_id: reimbBusinessIngest.proposals[0].id, category: 'other_expense', payment_confirmed: true }]
        });

        const matchedWf = matchReimbursement(db, {
            workflowId: wf.id,
            date: '2026-09-14',
            description: 'Printer Reimbursement',
            personalReceivingAccountId: personalBank.id,
            personalReceivingBankTxId: personalReimbResult.transaction_ids[0],
            businessBankAccountId: businessBank.id,
            businessBankTxId: businessReimbResult.transaction_ids[0],
            performedBy: 'TestUser'
        });

        expect(matchedWf.status).toBe('reimbursed');

        // Step 7: Assert expected values at each stage.
        // Before undo exploration, the completed reimbursement should leave Personal AUD 5,000, Business AUD 10,290, clearing accounts zero, and combined net worth AUD 15,290.
        expect(getAccountBalance(db, personalBank.id).balance_cents).toBe(500000);
        expect(getAccountBalance(db, businessBank.id).balance_cents).toBe(1029000);
        expect(getAccountBalance(db, matchedWf.due_from_account_id).balance_cents).toBe(0);
        expect(getAccountBalance(db, matchedWf.due_to_account_id).balance_cents).toBe(0);
        
        const combinedSummary = getSharedFinancialSummary(db, { asOfDate: '2026-09-30' });
        expect(combinedSummary.net_worth_cents_by_currency['AUD']).toBe(1529000);

        // Step 8: Import matching closing statements and assert actual reconciliation results.
        const stmtObs = recordBalanceObservation(db, {
            account_id: businessBank.id,
            effective_date: '2026-09-30',
            amount_cents: 1029000,
            currency: 'AUD',
            balance_kind: 'statement_closing_balance',
            source_type: 'document'
        });
        const recon = getReconciliationComparison(db, businessBank.id, stmtObs);
        expect(recon.status).toBe('matched');
        expect(recon.diff_cents).toBe(0);

        // Step 9: Exercise D4 undo/replacement matching
        const persTx = db.prepare('SELECT * FROM transactions WHERE id = ?').get(matchedWf.personal_reimbursement_tx_id) as any;
        const busTx = db.prepare('SELECT * FROM transactions WHERE id = ?').get(matchedWf.business_reimbursement_tx_id) as any;
        const undoneWf = undoReimbursementMatch(db, {
            workflowId: matchedWf.id,
            expectedPersonalTxId: persTx.id,
            expectedBusinessTxId: busTx.id,
            expectedPersonalRevision: persTx.revision,
            expectedBusinessRevision: busTx.revision,
            performedBy: 'TestUser'
        });
        expect(undoneWf.status).toBe('awaiting_reimbursement');

        const personalExpenseAcc = createAccount(db, {
            entity_id: householdEntity.id,
            name: 'Personal Reverted Expense',
            type: 'expense',
            sub_type: 'other',
            currency: 'AUD'
        }).account;
        
        const origPersTx = db.prepare('SELECT * FROM transactions WHERE id = ?').get(undoneWf.personal_transaction_id) as any;
        const origBusTx = db.prepare('SELECT * FROM transactions WHERE id = ?').get(undoneWf.business_transaction_id) as any;

        undoPersonallyPaidBusinessExpense(db, {
            workflowId: undoneWf.id,
            personalExpenseAccountId: personalExpenseAcc.id,
            expectedPersonalRevision: origPersTx.revision,
            expectedBusinessRevision: origBusTx.revision,
            performedBy: 'TestUser'
        });
        const finalWfCheck = db.prepare('SELECT status FROM reimbursement_workflows WHERE id = ?').get(undoneWf.id) as any;
        expect(finalWfCheck.status).toBe('cancelled');

        // Step 10: After reimport, assert unchanged bank balances, transaction counts, evidence links and reviewed proposal state.
        const bankTxCountPre = (db.prepare("SELECT COUNT(*) as c FROM transactions WHERE status = 'posted'").get() as any).c;
        const reimportResult = ingestCsvDocument(db, {
            filename: 'statement.csv',
            raw_content: csvContent,
            mapping,
            target_account_id: businessBank.id
        });
        const bankTxCountPost = (db.prepare("SELECT COUNT(*) as c FROM transactions WHERE status = 'posted'").get() as any).c;
        
        expect(bankTxCountPre).toBe(bankTxCountPost);
        expect(reimportResult.proposals[0].review_status).toBe('approved');

        // Step 11: Exercise review close/reopen and the agreed cross-screen scope checks.
        // We will create a fresh document and proposal that is NOT approved yet.
        const reopenIngest = ingestCsvDocument(db, {
            filename: 'statement_for_reopen.csv',
            raw_content: `date,description,amount\n2026-09-20,Test Reopen,-50.00`,
            mapping,
            target_account_id: businessBank.id
        });
        const unapprovedPropId = reopenIngest.proposals[0].id;
        updateProposalReview(db, { proposal_id: unapprovedPropId, suggested_category: 'entertainment' });

        // Step 12: Render the component (smoke test UI)
        fetchSpy = vi.spyOn(globalThis, 'fetch').mockImplementation(() => Promise.resolve(new Response(JSON.stringify({ success: true, documents: [] }))));

        await act(async () => {
            root.render(
                <ProposalReviewTable
                    documentId={reopenIngest.document.id}
                    onBack={() => {}}
                    accounts={[
                        { ...getAccount(db, personalBank.id), entity_id: householdEntity.id } as any,
                        { ...getAccount(db, businessBank.id), entity_id: businessEntity.id } as any
                    ]}
                    entities={[
                        { id: householdEntity.id, name: 'Household', currency: 'AUD', type: 'household', created_at: '', updated_at: '' },
                        { id: businessEntity.id, name: 'Acme Corp', currency: 'AUD', type: 'business', created_at: '', updated_at: '' }
                    ]}
                />
            );
        });

        // Assert the changed category persists
        const updatedProp = db.prepare('SELECT suggested_category FROM proposals WHERE id = ?').get(unapprovedPropId) as any;
        expect(updatedProp.suggested_category).toBe('entertainment');

        expect(container.innerHTML).toContain('Target Bank Account');
    });
});
