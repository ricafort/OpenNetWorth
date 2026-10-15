/**
 * @vitest-environment happy-dom
 */

import React, { act } from 'react';
import ReactDOM from 'react-dom/client';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import Database from 'better-sqlite3';

(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;

import { createTestDb, setTestDb } from '@/infrastructure/sqlite/db';
import { createEntity, createAccount } from '@/lib/domain/accounting/accountService';
import { getAccountBalance } from '@/lib/domain/accounting/balanceService';
import { ingestCsvDocument, approveProposals, ingestPdfDocument, linkProposalToTransaction } from '@/lib/domain/document/documentInboxService';
import { setCustomExtractor, ExtractedPdfDocument } from '@/lib/domain/document/openTaxAdapter';
import { DailyEventsView } from './DailyEventsView';
import { GET, POST } from '@/app/api/accounting/route';
import { Entity } from '@/lib/domain/accounting/types';
import { getSharedFinancialSummary } from '@/lib/domain/accounting/sharedFinancialSummaryService';

vi.mock('next/navigation', () => ({
    useRouter: () => ({ push: vi.fn(), replace: vi.fn(), refresh: vi.fn() }),
    useSearchParams: () => new URLSearchParams()
}));

describe('DailyEventsView Batch D3 Undo Acceptance Test', () => {
    let db: Database.Database;
    let container: HTMLDivElement;
    let root: ReactDOM.Root;
    const originalFetch = global.fetch;

    let personalEntity: Entity;
    let businessEntity: Entity;
    let personalBankId: string;
    let businessBankId: string;
    let entities: Entity[];
    let testTxId: string;
    let testDocId: string;

    beforeEach(async () => {
        db = createTestDb();
        setTestDb(db);

        // Setup entities
        personalEntity = createEntity(db, { name: 'Household', type: 'household', currency: 'AUD' });
        businessEntity = createEntity(db, { name: 'Acme Corp', type: 'business', currency: 'AUD' });
        entities = [personalEntity, businessEntity];

        db.prepare(`
            INSERT INTO documents (id, filename, content_hash, mime_type, byte_size, storage_path, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        `).run('doc-123', 'receipt.pdf', 'hash-123', 'application/pdf', 1024, '/docs/receipt.pdf', '2025-03-10T12:00:00Z');

        // Setup accounts
        personalBankId = createAccount(db, {
            entity_id: personalEntity.id,
            name: 'Personal Checking',
            type: 'asset',
            sub_type: 'checking',
            currency: 'AUD',
            tracking_mode: 'transactions',
            opening_balance_cents: 100000, // 1,000.00
            opening_date: '2025-01-01'
        }).account.id;

        businessBankId = createAccount(db, {
            entity_id: businessEntity.id,
            name: 'Business Checking',
            type: 'asset',
            sub_type: 'checking',
            currency: 'AUD',
            tracking_mode: 'transactions',
            opening_balance_cents: 50000, // 500.00
            opening_date: '2025-01-01'
        }).account.id;

        const tempExpenseId = createAccount(db, {
            entity_id: personalEntity.id,
            name: 'Temp Expense',
            type: 'expense',
            sub_type: 'other',
            currency: 'AUD',
            tracking_mode: 'transactions'
        }).account.id;

        const csv = `date,desc,amt\n2025-03-10,Staples,-110.00`;
        const res = ingestCsvDocument(db, {
            filename: 'receipt.csv',
            raw_content: csv,
            mapping: {
                id: 'test-map', name: 'Test', header_signature: 'date,desc,amt', date_column: 'date', date_format: 'YYYY-MM-DD', description_column: 'desc', amount_mode: 'single_amount', amount_column: 'amt', created_at: '', updated_at: ''
            } as any,
            target_account_id: personalBankId,
            default_category: 'other'
        });

        approveProposals(db, {
            document_id: res.document.id,
            target_account_id: personalBankId,
            entity_id: personalEntity.id,
            items: [
                {
                    proposal_id: res.proposals[0].id,
                    category: 'other'
                }
            ]
        });

        const txRow = db.prepare('SELECT id FROM transactions WHERE origin = ?').get('document_extraction') as any;
        testTxId = txRow.id;

        // Attach supporting document using actual linkProposalToTransaction
        const mockPdfReceipt: ExtractedPdfDocument = {
            supported: true,
            layout_name: 'supplies_single_item',
            supplier_name: 'Staples',
            invoice_number: 'INV-2025-111',
            date: '2025-03-10',
            currency: 'AUD',
            total_cents: 11000,
            tax_cents: 1000,
            net_cents: 10000,
            line_items: [{
                description: 'Office Supplies',
                amount_cents: 11000
            }],
            source_snippet: 'TOTAL AUD 110.00',
            validation_findings: []
        };
        setCustomExtractor(async () => mockPdfReceipt);

        const pdfIngest = await ingestPdfDocument(db, {
            filename: 'receipt.pdf',
            file_buffer: Buffer.from('%PDF-1.4 Mock Receipt Bytes for D2'),
            target_account_id: personalBankId,
            default_category: 'other',
            entity_id: personalEntity.id
        });

        linkProposalToTransaction(db, {
            proposal_id: pdfIngest.proposals[0].id,
            transaction_id: testTxId
        });

        testDocId = pdfIngest.document.id;

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

        container = document.createElement('div');
        document.body.appendChild(container);
        root = ReactDOM.createRoot(container);
    });

    afterEach(() => {
        if (root) {
            act(() => {
                root.unmount();
            });
        }
        if (container) {
            container.remove();
        }
        global.fetch = originalFetch;
        setCustomExtractor(null);
        setTestDb(null);
        db.close();
    });

    it('D3 Journey: Undoes a mistaken business classification on an outstanding reimbursement', async () => {
        // 1. Initial balances
        const initialPersonal = getAccountBalance(db, personalBankId, '2025-03-15').balance_cents;
        const initialBusiness = getAccountBalance(db, businessBankId, '2025-03-15').balance_cents;
        expect(initialPersonal).toBe(89000); // 1000 - 110
        expect(initialBusiness).toBe(50000); // 500

        // 2. Render Component
        await act(async () => {
            root.render(<DailyEventsView entities={entities} selectedEntityId="all" initialStartDate="2025-03-01" initialEndDate="2025-03-15" />);
            await new Promise(r => setTimeout(r, 100)); // Let fetches settle
        });

        // 3. Click "This was a business expense" on the transaction
        const d2Button = Array.from(container.querySelectorAll('button')).find(b => b.textContent?.includes('This was a business expense'));
        expect(d2Button).toBeDefined();

        await act(async () => {
            d2Button?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
            await new Promise(r => setTimeout(r, 50));
        });

        const form = container.querySelector('form');
        expect(form).toBeDefined();

        const amountInput = form!.querySelector('input[type="number"]') as HTMLInputElement;
        expect(amountInput.disabled).toBe(true);
        expect(amountInput.value).toBe('110.00');

        const dateInput = form!.querySelector('input[type="date"]') as HTMLInputElement;
        expect(dateInput.disabled).toBe(true);
        expect(dateInput.value).toBe('2025-03-10');

        const payeeInput = Array.from(form!.querySelectorAll('input[type="text"]')).find(i => (i as HTMLInputElement).placeholder?.includes('Officeworks')) as HTMLInputElement;
        expect(payeeInput.disabled).toBe(true);
        expect(payeeInput.value).toBe('Staples');
        
        // 5. Select Business
        const businessSelect = Array.from(container.querySelectorAll('select')).find(s => s.innerHTML.includes('Acme Corp')) as HTMLSelectElement;
        expect(businessSelect).toBeDefined();
        await act(async () => {
            businessSelect.value = businessEntity.id;
            businessSelect.dispatchEvent(new Event('change', { bubbles: true }));
        });

        // 6. Select "Yes, I expect reimbursement"
        const reimbSelect = Array.from(container.querySelectorAll('select')).find(s => s.innerHTML.includes('Yes, I expect reimbursement')) as HTMLSelectElement;
        expect(reimbSelect).toBeDefined();
        await act(async () => {
            reimbSelect.value = 'yes';
            reimbSelect.dispatchEvent(new Event('change', { bubbles: true }));
        });

        // 7. Preview and Confirm
        const previewBtn = Array.from(container.querySelectorAll('button')).find(b => b.textContent?.includes('Preview & Confirm'));
        expect(previewBtn).toBeDefined();
        await act(async () => {
            previewBtn?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
            await new Promise(r => setTimeout(r, 50));
        });

        // Check confirmation message
        expect(container.textContent).toContain('Your bank balance will not change. This purchase will be recorded as a business expense owed back to you.');
        
        const confirmBtn = Array.from(container.querySelectorAll('button')).find(b => b.textContent?.includes('Confirm and Record'));
        expect(confirmBtn).toBeDefined();
        await act(async () => {
            confirmBtn?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
            await new Promise(r => setTimeout(r, 100)); // wait for fetch
        });

        // 8. Assert Balances and workflow
        const finalPersonal = getAccountBalance(db, personalBankId, '2025-03-15').balance_cents;
        const finalBusiness = getAccountBalance(db, businessBankId, '2025-03-15').balance_cents;
        
        // Neither bank balance should have changed!
        expect(finalPersonal).toBe(89000);
        expect(finalBusiness).toBe(50000);

        // Check workflow exists
        const workflow = db.prepare('SELECT * FROM reimbursement_workflows WHERE personal_transaction_id = ?').get(testTxId) as any;
        if (!workflow) {
            console.error('Workflow not found! DOM Content:', container.innerHTML);
        }
        expect(workflow).toBeDefined();
        expect(workflow.amount_cents).toBe(11000);
        expect(workflow.evidence_document_id).toBe(testDocId); // Should carry forward evidence!
        
        // Verify business expense exists (the reclassified or newly recorded part)
        const busTx = db.prepare('SELECT * FROM transactions WHERE id = ?').get(workflow.business_transaction_id) as any;
        expect(busTx).toBeDefined();
        expect(busTx.date).toBe('2025-03-10'); // Same date
        
        // Assert Source transaction and evidence remain linked.
        const sourceTx = db.prepare('SELECT * FROM transactions WHERE id = ?').get(workflow.personal_transaction_id) as any;
        expect(sourceTx.evidence_refs).toContain(testDocId);

        // --- D3 UNDO FLOW START ---
        // 9. Open Reimbursement Modal
        const viewReimbBtn = Array.from(container.querySelectorAll('button')).find(b => b.textContent?.includes('View reimbursement'));
        expect(viewReimbBtn).toBeDefined();
        await act(async () => {
            viewReimbBtn?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
            await new Promise(r => setTimeout(r, 50));
        });

        // 10. Click "Undo business classification"
        const undoLinkBtn = Array.from(container.querySelectorAll('button')).find(b => b.textContent?.includes('Undo business classification'));
        expect(undoLinkBtn).toBeDefined();
        await act(async () => {
            undoLinkBtn?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
            await new Promise(r => setTimeout(r, 100)); // wait for preview fetch
        });

        // 11. Assert preview state and select category
        expect(container.textContent).toContain('Your bank balance will not change');
        const confirmUndoBtn = Array.from(container.querySelectorAll('button')).find(b => b.textContent?.includes('Confirm Undo')) as HTMLButtonElement;
        expect(confirmUndoBtn).toBeDefined();
        // Since we didn't mock the original_category_account_id perfectly in the route (it should find it), let's just make sure the button is clickable if we have a category selected.
        // Wait, route.ts actually fetches it from transaction_corrections!
        
        // 12. Submit Undo
        await act(async () => {
            confirmUndoBtn.dispatchEvent(new MouseEvent('click', { bubbles: true }));
            await new Promise(r => setTimeout(r, 100));
        });

        // 13. Verify final state
        const finalPersonalAfterUndo = getAccountBalance(db, personalBankId, '2025-03-15').balance_cents;
        const finalBusinessAfterUndo = getAccountBalance(db, businessBankId, '2025-03-15').balance_cents;
        
        expect(finalPersonalAfterUndo).toBe(89000); // 1000 - 110
        expect(finalBusinessAfterUndo).toBe(50000); // 500
        
        const finalWorkflow = db.prepare('SELECT * FROM reimbursement_workflows WHERE id = ?').get(workflow.id) as any;
        expect(finalWorkflow.status).toBe('cancelled');

        const finalSourceTx = db.prepare('SELECT * FROM transactions WHERE id = ?').get(workflow.personal_transaction_id) as any;
        expect(finalSourceTx.evidence_refs).toContain(testDocId);

        // 14. Assert reporting state is complete and clearing accounts are zeroed out (Testing Issue 2)
        const dueFromAcc = db.prepare('SELECT id FROM accounts WHERE name = ?').get('Due from Acme Corp') as any;
        const dueToAcc = db.prepare('SELECT id FROM accounts WHERE name = ?').get('Due to Household') as any;

        const summary1 = getSharedFinancialSummary(db, { as_of_date: '2025-03-15', reporting_currency: 'AUD' });
        console.log('Unrecorded accounts:', summary1.unrecorded_accounts);
        expect(summary1.is_complete).toBe(true);
        expect(summary1.unrecorded_accounts || []).toHaveLength(0); // No missing balance prompts

        let foundDueFrom = false;
        let foundDueTo = false;

        summary1.accounts_included.forEach((a: any) => {
            if (a.account_id === dueFromAcc.id) {
                foundDueFrom = true;
                expect(a.amount_cents).toBe(0);
            }
            if (a.account_id === dueToAcc.id) {
                foundDueTo = true;
                expect(a.amount_cents).toBe(0);
            }
        });

        console.log('Accounts:', summary1.accounts_included.map((a: any) => a.account_name));
        expect(foundDueFrom).toBe(true);
        expect(foundDueTo).toBe(true);
        
        expect(summary1.net_worth_cents_by_currency['AUD']).toBe(139000); // 1000 + 500 - 110 = 1390 (Staples purchase)

        // 15. Classify again via UI (Testing Issue 1)
        const txRowAfterUndo = Array.from(container.querySelectorAll('div')).find(div => div.textContent?.includes('Staples') && div.textContent?.includes('110.00'));
        const btnBusinessExpense2 = Array.from(txRowAfterUndo!.querySelectorAll('button')).find(b => b.textContent?.includes('This was a business expense'));
        expect(btnBusinessExpense2).toBeDefined();

        await act(async () => {
            btnBusinessExpense2?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
        });

        // Use same form filling as before
        const businessSelect2 = Array.from(container.querySelectorAll('select')).find(s => s.innerHTML.includes('Acme Corp')) as HTMLSelectElement;
        await act(async () => {
            businessSelect2.value = businessEntity.id;
            businessSelect2.dispatchEvent(new Event('change', { bubbles: true }));
        });

        const reimbSelect2 = Array.from(container.querySelectorAll('select')).find(s => s.innerHTML.includes('Yes, I expect reimbursement')) as HTMLSelectElement;
        await act(async () => {
            reimbSelect2.value = 'yes';
            reimbSelect2.dispatchEvent(new Event('change', { bubbles: true }));
        });

        const previewBtn2 = Array.from(container.querySelectorAll('button')).find(b => b.textContent?.includes('Preview & Confirm'));
        await act(async () => {
            previewBtn2?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
            await new Promise(r => setTimeout(r, 50));
        });

        const confirmBtn2 = Array.from(container.querySelectorAll('button')).find(b => b.textContent?.includes('Confirm and Record'));
        await act(async () => {
            confirmBtn2?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
            await new Promise(r => setTimeout(r, 100)); // wait for api
        });

        // 16. Assertions on second workflow
        const workflows2 = db.prepare("SELECT * FROM reimbursement_workflows WHERE status != 'cancelled'").all() as any[];
        expect(workflows2.length).toBe(1); // the new one
        const wf2 = workflows2[0];
        
        expect(wf2.id).not.toBe(workflow.id); // Must be a genuinely new workflow

        const businessTx = db.prepare('SELECT * FROM transactions WHERE id = ?').get(wf2.business_transaction_id) as any;
        expect(businessTx).toBeDefined();
        expect(businessTx.origin).toBe('manual'); // Should be newly created, not voided
        expect(businessTx.id).not.toBe(workflow.business_transaction_id); // Must have a new identity!

        // Check balances
        const dueFromBalance = getAccountBalance(db, dueFromAcc.id, '2025-03-15').balance_cents;
        const dueToBalance = getAccountBalance(db, dueToAcc.id, '2025-03-15').balance_cents;
        
        expect(dueFromBalance).toBe(11000); // personal is owed 110
        expect(dueToBalance).toBe(11000);  // business owes 110

        const finalPersonalAfterRetry = getAccountBalance(db, personalBankId, '2025-03-15').balance_cents;
        const finalBusinessAfterRetry = getAccountBalance(db, businessBankId, '2025-03-15').balance_cents;
        
        expect(finalPersonalAfterRetry).toBe(89000); // 1000 - 110
        expect(finalBusinessAfterRetry).toBe(50000); // 500
        
        // Assert combined net worth remains unchanged because elimination correctly offsets the new workflow
        // Assert combined net worth remains unchanged because elimination correctly offsets the new workflow
        const summary2 = getSharedFinancialSummary(db, { as_of_date: '2025-03-15', reporting_currency: 'AUD' });
        expect(summary2.net_worth_cents_by_currency['AUD']).toBe(139000);
    });
});
