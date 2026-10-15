/**
 * @vitest-environment happy-dom
 */

import React, { act } from 'react';
import ReactDOM from 'react-dom/client';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import Database from 'better-sqlite3';

(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;

import { createTestDb, setTestDb } from '@/infrastructure/sqlite/db';
import { initAccountingSchema } from '@/lib/domain/accounting/schema';
import { createEntity, createAccount } from '@/lib/domain/accounting/accountService';
import { getAccountBalance } from '@/lib/domain/accounting/balanceService';
import { ingestCsvDocument, approveProposals, ingestPdfDocument, linkProposalToTransaction } from '@/lib/domain/document/documentInboxService';
import { DailyEventsView } from './DailyEventsView';
import { GET, POST } from '@/app/api/accounting/route';
import { Entity } from '@/lib/domain/accounting/types';
import { getSharedFinancialSummary } from '@/lib/domain/accounting/sharedFinancialSummaryService';
import { processPersonallyPaidBusinessExpense, matchReimbursement } from '@/features/reimbursement/reimbursementService';

vi.mock('next/navigation', () => ({
    useRouter: () => ({ push: vi.fn(), replace: vi.fn(), refresh: vi.fn() }),
    useSearchParams: () => new URLSearchParams()
}));

describe('DailyEventsView Batch D4 Undo Match Acceptance Test', () => {
    let db: Database.Database;
    let container: HTMLDivElement;
    let root: ReactDOM.Root;
    const originalFetch = global.fetch;

    let personalEntity: Entity;
    let businessEntity: Entity;
    let personalBankId: string;
    let businessBankId: string;
    let testTxId: string;
    let testDocId: string;
    let dueFromAccountId: string;
    let dueToAccountId: string;
    let unknownExpenseId: string;

    beforeEach(async () => {
        container = document.createElement('div');
        document.body.appendChild(container);

        db = createTestDb();
        setTestDb(db);
        initAccountingSchema(db);

        personalEntity = createEntity(db, { name: 'Household', type: 'household', currency: 'AUD' });
        businessEntity = createEntity(db, { name: 'Acme Corp', type: 'business', currency: 'AUD' });

        personalBankId = createAccount(db, {
            entity_id: personalEntity.id, name: 'Personal Checking', type: 'asset', sub_type: 'checking', currency: 'AUD', tracking_mode: 'transactions', opening_balance_cents: 100000, opening_date: '2025-01-01'
        }).account.id;

        businessBankId = createAccount(db, {
            entity_id: businessEntity.id, name: 'Business Checking', type: 'asset', sub_type: 'checking', currency: 'AUD', tracking_mode: 'transactions', opening_balance_cents: 50000, opening_date: '2025-01-01'
        }).account.id;

        const csv = `date,desc,amt\n2025-03-10,Staples,-110.00\n2025-03-15,Reimbursement,110.00`;
        const res = ingestCsvDocument(db, {
            filename: 'receipt.csv', raw_content: csv, mapping: { id: 'test-map', name: 'Test', header_signature: 'date,desc,amt', date_column: 'date', date_format: 'YYYY-MM-DD', description_column: 'desc', amount_mode: 'single_amount', amount_column: 'amt', created_at: '', updated_at: '' } as any, target_account_id: personalBankId, default_category: 'other'
        });

        approveProposals(db, {
            document_id: res.document.id,
            target_account_id: personalBankId,
            entity_id: personalEntity.id,
            items: [
                { proposal_id: res.proposals[0].id, category: 'other' },
                { proposal_id: res.proposals[1].id, category: 'other' }
            ]
        });
        
        const txs = db.prepare('SELECT id, description FROM transactions WHERE date = ?').all('2025-03-10') as any[];
        const staplesTx = txs.find(t => t.description === 'Staples');
        testTxId = staplesTx.id;

        const businessExpenseId = createAccount(db, {
            entity_id: businessEntity.id, name: 'Business Expense', type: 'expense', sub_type: 'other', currency: 'AUD', tracking_mode: 'transactions'
        }).account.id;

        const wf = processPersonallyPaidBusinessExpense(db, {
            personalEntityId: personalEntity.id,
            businessEntityId: businessEntity.id,
            currency: 'AUD',
            amountCents: 11000,
            date: '2025-03-10',
            description: 'Staples',
            sourceType: 'posted_transaction',
            sourceId: testTxId,
            paymentAccountId: personalBankId,
            businessExpenseAccountId: businessExpenseId,
            performedBy: 'test'
        });

        dueFromAccountId = wf.due_from_account_id;
        dueToAccountId = wf.due_to_account_id;

        const pReimbTx = db.prepare('SELECT * FROM transactions WHERE description = ?').get('Reimbursement') as any;

        // Match the reimbursement
        matchReimbursement(db, {
            workflowId: wf.id,
            personalReceivingAccountId: personalBankId,
            businessBankAccountId: businessBankId,
            personalReceivingBankTxId: pReimbTx.id, // linked from import
            expectedPersonalRevision: pReimbTx.revision,
            createMissingBusinessPayment: true, // manually created during match
            businessDate: '2025-03-15',
            description: 'Business Settlement',
            performedBy: 'test'
        });

        // Wire global.fetch directly to Next.js API route handlers using the isolated test database
        global.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
            let urlStr: string;
            if (typeof input === 'string') {
                urlStr = input;
            } else if (input instanceof URL) {
                urlStr = input.toString();
            } else {
                urlStr = (input as any).url;
            }

            const fullUrl = urlStr.startsWith('http') ? urlStr : `http://localhost:3000${urlStr.startsWith('/') ? '' : '/'}${urlStr}`;
            const method = (init?.method || (typeof input === 'object' && 'method' in input && (input as any).method) || 'GET').toUpperCase();

            const req = new Request(fullUrl, {
                method,
                headers: init?.headers,
                body: init?.body,
                signal: init?.signal
            });

            if (method === 'GET') {
                return await GET(req);
            } else if (method === 'POST') {
                return await POST(req);
            }
            return new Response(JSON.stringify({ error: 'Not found' }), { status: 404 });
        }) as unknown as typeof fetch;

        // Create a valid replacement account BEFORE mounting
        unknownExpenseId = createAccount(db, {
            entity_id: businessEntity.id, name: 'Unknown Expenses', type: 'expense', sub_type: 'other', currency: 'AUD', tracking_mode: 'transactions'
        }).account.id;

        await act(async () => {
            root = ReactDOM.createRoot(container);
            root.render(<DailyEventsView entities={[personalEntity, businessEntity]} selectedEntityId="all" initialStartDate="2025-03-01" initialEndDate="2025-03-31" />);
        });
        await new Promise(resolve => setTimeout(resolve, 0));
    });

    afterEach(() => {
        global.fetch = originalFetch;
        if (root) {
            act(() => {
                root.unmount();
            });
        }
        if (container) container.remove();
        vi.clearAllMocks();
    });

    it('D4 Journey: Undoes a mistaken reimbursement match via UI, checking rules and preserving manual legs', async () => {
        // 1. Valid replacement account already created in beforeEach

        // 2. Open the modal for the settled workflow
        let viewDetailsButtons: HTMLButtonElement[] = [];
        for (let i = 0; i < 50; i++) {
            await act(async () => { await new Promise(r => setTimeout(r, 20)); });
            viewDetailsButtons = Array.from(container.querySelectorAll('button')).filter(b => b.textContent === 'View reimbursement');
            if (viewDetailsButtons.length > 0) break;
        }
        expect(viewDetailsButtons.length).toBeGreaterThan(0);
        await act(async () => {
            viewDetailsButtons[0].dispatchEvent(new MouseEvent('click', { bubbles: true }));
        });

        // 3. Click "Undo payment match"
        expect(container.textContent).toContain('Settlement Complete');
        const undoBtn = Array.from(container.querySelectorAll('button')).find(b => b.textContent === 'Undo payment match');
        expect(undoBtn).toBeDefined();
        await act(async () => {
            undoBtn!.dispatchEvent(new MouseEvent('click', { bubbles: true }));
        });

        // 4. Wait for preview to load
        // It fetches from our mock global.fetch
        await new Promise(resolve => setTimeout(resolve, 100)); // wait for fetch and state update

        expect(container.textContent).toContain('Restoring imported personal receipt');
        expect(container.textContent).toContain('Where should this A$110.00 cash payment be recorded instead?');

        // 5. Check the dropdown for business replacement
        const select = container.querySelector('select');
        expect(select).not.toBeNull();
        
        // Assert that "Business Checking" and "Due to Acme Corp" are missing
        const options = Array.from(select!.querySelectorAll('option')).map(o => o.textContent);
        expect(options).not.toContain('Business Checking');
        expect(options).not.toContain('Due to Acme Corp');
        expect(options).toContain('Unknown Expenses');

        // 6. Select "Unknown Expenses"
        await act(async () => {
            select!.value = unknownExpenseId;
            select!.dispatchEvent(new Event('change', { bubbles: true }));
        });

        // 7. Click confirm
        const confirmBtn = Array.from(container.querySelectorAll('button')).find(b => b.textContent === 'Confirm Undo Match');
        expect(confirmBtn).toBeDefined();
        expect(confirmBtn!.disabled).toBe(false);

        await act(async () => {
            confirmBtn!.dispatchEvent(new MouseEvent('click', { bubbles: true }));
        });
        await new Promise(resolve => setTimeout(resolve, 100)); // Wait for submit

        // 8. Assert successful undo
        expect(container.textContent).toContain('Reimbursement match undone');

        // Check balances
        const dueFromBalance = getAccountBalance(db, dueFromAccountId, '2025-03-20').balance_cents;
        expect(dueFromBalance).toBe(11000);

        const busBankBalance = getAccountBalance(db, businessBankId, '2025-03-20').balance_cents;
        expect(busBankBalance).toBe(39000); // 500.00 opening - 110.00 payment = 390.00, preserved
        
        const unknownExpBalance = getAccountBalance(db, unknownExpenseId, '2025-03-20').balance_cents;
        expect(unknownExpBalance).toBe(11000);

        // 9. Test Idempotency directly via API (simulate identical retry payload)
        const wf = db.prepare('SELECT * FROM reimbursement_workflows WHERE amount_cents = 11000').get() as any;
        expect(wf.status).toBe('awaiting_reimbursement');

        const lastUndo = JSON.parse(wf.last_undo_request);
        const retryRes = await POST(new Request('http://localhost/api/accounting', {
            method: 'POST',
            body: JSON.stringify({
                action: 'undo_reimbursement_match',
                payload: lastUndo
            })
        }));
        const retryData = await retryRes.json();
        expect(retryData.success).toBe(true);
        expect(retryData.workflow.status).toBe('awaiting_reimbursement'); // Identical retry succeeds without error

        // 10. Regression: Re-matching and replaying the old undo with matching revisions but different TxIDs MUST fail.
        matchReimbursement(db, {
            workflowId: wf.id,
            personalReceivingAccountId: personalBankId,
            businessBankAccountId: businessBankId,
            createMissingPersonalReceipt: true,
            createMissingBusinessPayment: true,
            personalDate: '2025-03-16',
            businessDate: '2025-03-16',
            description: 'Replacement Settlement',
            performedBy: 'test'
        });

        const reMatchedWf = db.prepare('SELECT * FROM reimbursement_workflows WHERE id = ?').get(wf.id) as any;
        expect(reMatchedWf.status).toBe('reimbursed');

        // Force the revisions of the NEW transactions to exactly match the expected revisions in the old undo payload
        db.prepare('UPDATE transactions SET revision = ? WHERE id = ?').run(lastUndo.expectedPersonalRevision, reMatchedWf.personal_reimbursement_tx_id);
        db.prepare('UPDATE transactions SET revision = ? WHERE id = ?').run(lastUndo.expectedBusinessRevision, reMatchedWf.business_reimbursement_tx_id);

        // Replay the exact old undo payload again
        const regressionRes = await POST(new Request('http://localhost/api/accounting', {
            method: 'POST',
            body: JSON.stringify({
                action: 'undo_reimbursement_match',
                payload: lastUndo
            })
        }));
        const regressionData = await regressionRes.json();
        expect(regressionData.error).toContain('Underlying transactions have changed');
    });
});
