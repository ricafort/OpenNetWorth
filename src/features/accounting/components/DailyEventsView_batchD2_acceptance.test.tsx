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
import { setCustomExtractor, ExtractedPdfDocument } from '@/lib/domain/document/openTaxAdapter';
import { DailyEventsView } from './DailyEventsView';
import { GET, POST } from '@/app/api/accounting/route';
import { Entity } from '@/lib/domain/accounting/types';

vi.mock('next/navigation', () => ({
    useRouter: () => ({ push: vi.fn(), replace: vi.fn(), refresh: vi.fn() }),
    useSearchParams: () => new URLSearchParams()
}));

describe('DailyEventsView Batch D2 Acceptance Test', () => {
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
        initAccountingSchema(db);

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

    it('D2 Journey: Converts a posted personal transaction to a business reimbursement workflow', async () => {
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
    });
});
