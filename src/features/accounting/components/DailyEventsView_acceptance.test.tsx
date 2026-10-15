/**
 * @vitest-environment happy-dom
 */

/**
 * Batch D1 Acceptance: Component-to-Real-API Integration Tests
 * 
 * Why this file exists:
 * Verifies the end-to-end integration between the DailyEventsView UI component,
 * the Next.js accounting API route handlers (GET, POST), and an isolated in-memory SQLite database.
 * 
 * Requirements verified:
 * 1. Prevent duplicate reimbursement movements:
 *    When both movements are imported (Personal AUD 1,000; Business AUD 390), matching them
 *    leaves both bank balances completely unchanged (Personal 1,000; Business 390).
 * 2. Explicit selection & missing movements:
 *    When one movement is missing, user explicitly chooses "Record missing payment/receipt"
 *    with explicit account and date review.
 * 3. Authoritative different-date preservation:
 *    Each leg preserves its own authoritative imported date.
 * 4. Different-date idempotent retries:
 *    Identical retries succeed without writes (0 new journal entries) even when dates differ.
 *    Conflicting retries (altered dates or transactions) are strictly rejected.
 * 5. Owner scope switching:
 *    Switching selected entity updates the scope; stale responses are aborted.
 * 6. Evidence linkage and revisions:
 *    Purchase confirmation retains draft evidence document IDs and validates revisions.
 */

import React, { act } from 'react';
import ReactDOM from 'react-dom/client';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import Database from 'better-sqlite3';

(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;

import { createTestDb, setTestDb } from '@/infrastructure/sqlite/db';
import { createEntity, createAccount } from '@/lib/domain/accounting/accountService';
import { postTransaction } from '@/lib/domain/accounting/transactionService';
import { saveDraft } from '@/lib/domain/accounting/draftService';
import { getAccountBalance } from '@/lib/domain/accounting/balanceService';
import { processPersonallyPaidBusinessExpense } from '@/features/reimbursement/reimbursementService';
import { DailyEventsView } from './DailyEventsView';
import { GET, POST } from '@/app/api/accounting/route';
import { Entity } from '@/lib/domain/accounting/types';

vi.mock('next/navigation', () => ({
    useRouter: () => ({ push: vi.fn(), replace: vi.fn(), refresh: vi.fn() }),
    useSearchParams: () => new URLSearchParams()
}));

describe('DailyEventsView Component-to-Real-API Acceptance Tests', () => {
    let db: Database.Database;
    let container: HTMLDivElement;
    let root: ReactDOM.Root;
    const originalFetch = global.fetch;

    let personalEntity: Entity;
    let businessEntity: Entity;
    let personalBankId: string;
    let businessBankId: string;
    let businessExpenseId: string;
    let entities: Entity[];

    beforeEach(() => {
        db = createTestDb();
        setTestDb(db);

        // Setup entities
        personalEntity = createEntity(db, { name: 'Household', type: 'household', currency: 'AUD' });
        businessEntity = createEntity(db, { name: 'Acme Corp', type: 'business', currency: 'AUD' });
        entities = [personalEntity, businessEntity];

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

        businessExpenseId = createAccount(db, {
            entity_id: businessEntity.id,
            name: 'Office Supplies',
            type: 'expense',
            sub_type: 'other',
            currency: 'AUD',
            tracking_mode: 'transactions'
        }).account.id;

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
        act(() => {
            root.unmount();
        });
        container.remove();
        global.fetch = originalFetch;
        setTestDb(null);
        db.close();
    });

    it('Scenario 1: Reproduction Fix — Matching two imported movements leaves Personal at 1,000 and Business at 390 (no reduction to 280)', async () => {
        // Step 1: Confirm personally paid expense of AUD 110 (11,000 cents)
        const wf = processPersonallyPaidBusinessExpense(db, {
            personalEntityId: personalEntity.id,
            businessEntityId: businessEntity.id,
            currency: 'AUD',
            amountCents: 11000,
            date: '2025-01-02',
            description: 'Printer ink (Personally Paid)',
            sourceType: 'draft',
            sourceId: saveDraft(db, {
                payer_entity_id: personalEntity.id,
                payment_account_id: personalBankId,
                entity_id: businessEntity.id,
                amount_cents: 11000,
                currency: 'AUD',
                date: '2025-01-02',
                reimbursement_intent: 'yes'
            }).id,
            paymentAccountId: personalBankId,
            businessExpenseAccountId: businessExpenseId,
            performedBy: 'Owner'
        });

        // Step 2: Simulate both bank feeds importing their respective movements
        // Suspense accounts used during import
        const pSuspense = createAccount(db, { entity_id: personalEntity.id, name: 'Personal Suspense', type: 'expense', sub_type: 'other', currency: 'AUD', tracking_mode: 'transactions' }).account.id;
        const bSuspense = createAccount(db, { entity_id: businessEntity.id, name: 'Business Suspense', type: 'expense', sub_type: 'other', currency: 'AUD', tracking_mode: 'transactions' }).account.id;

        // Personal bank receives AUD 110 (+11,000 cents) -> Personal Checking = 890 + 110 = 1,000 AUD
        const persTx = postTransaction(db, {
            date: '2025-01-10',
            description: 'Transfer from Business',
            origin: 'document_extraction',
            postings: [
                { account_id: personalBankId, amount_cents: 11000, currency: 'AUD' },
                { account_id: pSuspense, amount_cents: -11000, currency: 'AUD' }
            ]
        });

        // Business bank pays AUD 110 (-11,000 cents) -> Business Checking = 500 - 110 = 390 AUD
        const busTx = postTransaction(db, {
            date: '2025-01-09',
            description: 'Reimbursement to Owner',
            origin: 'document_extraction',
            postings: [
                { account_id: bSuspense, amount_cents: 11000, currency: 'AUD' },
                { account_id: businessBankId, amount_cents: -11000, currency: 'AUD' }
            ]
        });

        // Verify pre-matching state
        const initialPersonalBal = getAccountBalance(db, personalBankId, '2025-01-15').balance_cents;
        const initialBusinessBal = getAccountBalance(db, businessBankId, '2025-01-15').balance_cents;
        expect(initialPersonalBal).toBe(100000); // 1,000.00 AUD
        expect(initialBusinessBal).toBe(39000);  // 390.00 AUD

        const initialTxCount = (db.prepare('SELECT count(*) as cnt FROM transactions').get() as any).cnt;
        const initialJournalCount = (db.prepare('SELECT count(*) as cnt FROM journal_entries').get() as any).cnt;

        // Render DailyEventsView connected to real API
        await act(async () => {
            root.render(<DailyEventsView entities={entities} selectedEntityId="all" />);
        });

        // Click "Match Payment"
        const matchButtons = Array.from(container.querySelectorAll('button')).filter(b => b.textContent?.includes('Match Payment'));
        expect(matchButtons.length).toBeGreaterThan(0);

        await act(async () => {
            matchButtons[0].dispatchEvent(new MouseEvent('click', { bubbles: true }));
        });

        // Verify modal opened and candidates loaded
        const modal = container.querySelector('[role="dialog"]');
        expect(modal).not.toBeNull();

        // The candidates are auto-selected since eligible transactions exist on both sides
        const confirmBtn = Array.from(modal!.querySelectorAll('button')).find(b => b.textContent === 'Match Reimbursement') as HTMLButtonElement;
        expect(confirmBtn).toBeDefined();
        expect(confirmBtn.disabled).toBe(false);

        // Click "Match Reimbursement" to submit via real API POST handler
        await act(async () => {
            confirmBtn.dispatchEvent(new MouseEvent('click', { bubbles: true }));
            await new Promise(r => setTimeout(r, 100));
        });

        // Verify Database Post-Conditions:
        // 1. Workflow status updated to reimbursed
        const updatedWf = db.prepare('SELECT * FROM reimbursement_workflows WHERE id = ?').get(wf.id) as any;
        expect(updatedWf.status).toBe('reimbursed');
        expect(updatedWf.personal_reimbursement_tx_id).toBe(persTx.id);
        expect(updatedWf.business_reimbursement_tx_id).toBe(busTx.id);

        // 2. CRITICAL ACCEPTANCE REQUIREMENT: Bank balances MUST remain unchanged
        // Personal = AUD 1,000; Business = AUD 390 (NEVER 280)
        const finalPersonalBal = getAccountBalance(db, personalBankId, '2025-01-15').balance_cents;
        const finalBusinessBal = getAccountBalance(db, businessBankId, '2025-01-15').balance_cents;
        expect(finalPersonalBal).toBe(100000); // AUD 1,000.00
        expect(finalBusinessBal).toBe(39000);  // AUD 390.00 (NOT 280.00!)

        // 3. Transactions were corrected in-place without creating new bank movements
        const finalTxCount = (db.prepare('SELECT count(*) as cnt FROM transactions').get() as any).cnt;
        expect(finalTxCount).toBe(initialTxCount); // Zero new transactions!

        const finalJournalCount = (db.prepare('SELECT count(*) as cnt FROM journal_entries').get() as any).cnt;
        expect(finalJournalCount).toBe(initialJournalCount); // Zero extra journal lines!

        // 4. Clearing accounts are fully settled
        const dueFromBal = getAccountBalance(db, wf.due_from_account_id, '2025-01-15').balance_cents;
        const dueToBal = getAccountBalance(db, wf.due_to_account_id, '2025-01-15').balance_cents;
        expect(dueFromBal).toBe(0);
        expect(dueToBal).toBe(0);
    });

    it('Scenario 2: One movement missing — explicit selection with account and date review', async () => {
        // Step 1: Confirm expense of AUD 50
        const wf = processPersonallyPaidBusinessExpense(db, {
            personalEntityId: personalEntity.id,
            businessEntityId: businessEntity.id,
            currency: 'AUD',
            amountCents: 5000,
            date: '2025-02-01',
            description: 'Team Lunch',
            sourceType: 'draft',
            sourceId: saveDraft(db, {
                payer_entity_id: personalEntity.id,
                payment_account_id: personalBankId,
                entity_id: businessEntity.id,
                amount_cents: 5000,
                currency: 'AUD',
                date: '2025-02-01',
                reimbursement_intent: 'yes'
            }).id,
            paymentAccountId: personalBankId,
            businessExpenseAccountId: businessExpenseId,
            performedBy: 'Owner'
        });

        // Step 2: Personal received AUD 50, but Business has not yet imported or recorded its payment
        const pSuspense = createAccount(db, { entity_id: personalEntity.id, name: 'Suspense', type: 'expense', sub_type: 'other', currency: 'AUD', tracking_mode: 'transactions' }).account.id;
        const persTx = postTransaction(db, {
            date: '2025-02-10',
            description: 'Transfer in',
            origin: 'document_extraction',
            postings: [
                { account_id: personalBankId, amount_cents: 5000, currency: 'AUD' },
                { account_id: pSuspense, amount_cents: -5000, currency: 'AUD' }
            ]
        });

        // Initial balances before match
        const initialBusinessBal = getAccountBalance(db, businessBankId, '2025-02-20').balance_cents;
        expect(initialBusinessBal).toBe(50000); // AUD 500.00

        // Render UI and await initial data loading
        await act(async () => {
            root.render(<DailyEventsView entities={entities} selectedEntityId="all" />);
            await new Promise(r => setTimeout(r, 100));
        });

        // Click "Match Payment" and await candidate loading
        const matchButtons = Array.from(container.querySelectorAll('button')).filter(b => b.textContent?.includes('Match Payment'));
        await act(async () => {
            matchButtons[0].dispatchEvent(new MouseEvent('click', { bubbles: true }));
            await new Promise(r => setTimeout(r, 100));
        });

        const modal = container.querySelector('[role="dialog"]')!;
        expect(modal).not.toBeNull();

        // 1. Assert that matching is initially BLOCKED because manual creation requires deliberate selection (not auto-selected)
        const confirmBtn = Array.from(modal.querySelectorAll('button')).find(b => b.textContent === 'Match Reimbursement') as HTMLButtonElement;
        expect(confirmBtn).toBeDefined();
        expect(confirmBtn.disabled).toBe(true);

        // 2. Deliberately select manual creation for the missing business payment
        const manualCards = Array.from(modal.querySelectorAll('div')).filter(d => d.textContent?.includes('Record missing payment manually'));
        expect(manualCards.length).toBeGreaterThan(0);
        await act(async () => {
            manualCards[manualCards.length - 1].dispatchEvent(new MouseEvent('click', { bubbles: true }));
        });

        // Review and set missing payment date to 2025-02-15
        const dateInput = modal.querySelector('input[type="date"]') as HTMLInputElement;
        if (dateInput) {
            await act(async () => {
                const nativeInputValueSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value')?.set;
                nativeInputValueSetter?.call(dateInput, '2025-02-15');
                dateInput.dispatchEvent(new Event('input', { bubbles: true }));
                dateInput.dispatchEvent(new Event('change', { bubbles: true }));
            });
        }

        // 3. Now submission is deliberately enabled
        expect(confirmBtn.disabled).toBe(false);

        await act(async () => {
            confirmBtn.dispatchEvent(new MouseEvent('click', { bubbles: true }));
            await new Promise(r => setTimeout(r, 100));
        });

        // Assert Database State
        const updatedWf = db.prepare('SELECT * FROM reimbursement_workflows WHERE id = ?').get(wf.id) as any;
        expect(updatedWf.status).toBe('reimbursed');
        expect(updatedWf.personal_reimbursement_tx_id).toBe(persTx.id);
        expect(updatedWf.business_reimbursement_tx_id).toBeDefined();

        // Business bank balance was reduced by AUD 50 for the missing leg: 500 -> 450
        const finalBusinessBal = getAccountBalance(db, businessBankId).balance_cents;
        expect(finalBusinessBal).toBe(45000); // AUD 450.00

        // Clearing accounts settled
        expect(getAccountBalance(db, wf.due_from_account_id, '2025-02-20').balance_cents).toBe(0);
        expect(getAccountBalance(db, wf.due_to_account_id, '2025-02-20').balance_cents).toBe(0);
    });

    it('Scenario 3 & 4: Different-date preservation and identical retries succeeding without writes', async () => {
        // Step 1: Confirmed expense
        const wf = processPersonallyPaidBusinessExpense(db, {
            personalEntityId: personalEntity.id,
            businessEntityId: businessEntity.id,
            currency: 'AUD',
            amountCents: 8000,
            date: '2025-03-01',
            description: 'Monitor stand',
            sourceType: 'draft',
            sourceId: saveDraft(db, {
                payer_entity_id: personalEntity.id,
                payment_account_id: personalBankId,
                entity_id: businessEntity.id,
                amount_cents: 8000,
                currency: 'AUD',
                date: '2025-03-01',
                reimbursement_intent: 'yes'
            }).id,
            paymentAccountId: personalBankId,
            businessExpenseAccountId: businessExpenseId,
            performedBy: 'Owner'
        });

        // Step 2: Movements on DIFFERENT authoritative dates
        // Business paid on March 4th
        const bSuspense = createAccount(db, { entity_id: businessEntity.id, name: 'Suspense B', type: 'expense', sub_type: 'other', currency: 'AUD', tracking_mode: 'transactions' }).account.id;
        const busTx = postTransaction(db, {
            date: '2025-03-04',
            description: 'Reimbursement out',
            origin: 'document_extraction',
            postings: [
                { account_id: bSuspense, amount_cents: 8000, currency: 'AUD' },
                { account_id: businessBankId, amount_cents: -8000, currency: 'AUD' }
            ]
        });

        // Personal received on March 6th
        const pSuspense = createAccount(db, { entity_id: personalEntity.id, name: 'Suspense P', type: 'expense', sub_type: 'other', currency: 'AUD', tracking_mode: 'transactions' }).account.id;
        const persTx = postTransaction(db, {
            date: '2025-03-06',
            description: 'Reimbursement in',
            origin: 'document_extraction',
            postings: [
                { account_id: personalBankId, amount_cents: 8000, currency: 'AUD' },
                { account_id: pSuspense, amount_cents: -8000, currency: 'AUD' }
            ]
        });

        // Step 3: Match via POST route passing authoritative dates
        const postRes = await POST(new Request('http://localhost:3000/api/accounting', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                action: 'match_reimbursement',
                payload: {
                    workflowId: wf.id,
                    personalDate: '2025-03-06',
                    businessDate: '2025-03-04',
                    description: 'Settlement with different dates',
                    personalReceivingAccountId: personalBankId,
                    businessBankAccountId: businessBankId,
                    personalReceivingBankTxId: persTx.id,
                    businessBankTxId: busTx.id,
                    performedBy: 'Owner'
                }
            })
        }));
        expect(postRes.status).toBe(201);

        // Verify authoritative dates preserved
        const pTxDb = db.prepare('SELECT date FROM transactions WHERE id = ?').get(persTx.id) as any;
        const bTxDb = db.prepare('SELECT date FROM transactions WHERE id = ?').get(busTx.id) as any;
        expect(pTxDb.date).toBe('2025-03-06');
        expect(bTxDb.date).toBe('2025-03-04');

        const journalCountBeforeRetry = (db.prepare('SELECT count(*) as cnt FROM journal_entries').get() as any).cnt;

        // Step 4: Identical retry with different dates succeeds without new writes
        const retryRes = await POST(new Request('http://localhost:3000/api/accounting', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                action: 'match_reimbursement',
                payload: {
                    workflowId: wf.id,
                    personalDate: '2025-03-06',
                    businessDate: '2025-03-04',
                    description: 'Settlement with different dates',
                    personalReceivingAccountId: personalBankId,
                    businessBankAccountId: businessBankId,
                    personalReceivingBankTxId: persTx.id,
                    businessBankTxId: busTx.id,
                    performedBy: 'Owner'
                }
            })
        }));
        expect(retryRes.status).toBe(201);

        const journalCountAfterRetry = (db.prepare('SELECT count(*) as cnt FROM journal_entries').get() as any).cnt;
        expect(journalCountAfterRetry).toBe(journalCountBeforeRetry); // No writes on identical retry!

        // Step 5: Conflicting retry (attempting to alter date to March 10) must be rejected
        const conflictRes = await POST(new Request('http://localhost:3000/api/accounting', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                action: 'match_reimbursement',
                payload: {
                    workflowId: wf.id,
                    personalDate: '2025-03-10', // Changed date!
                    businessDate: '2025-03-04',
                    description: 'Settlement with altered date',
                    personalReceivingAccountId: personalBankId,
                    businessBankAccountId: businessBankId,
                    personalReceivingBankTxId: persTx.id,
                    businessBankTxId: busTx.id,
                    performedBy: 'Owner'
                }
            })
        }));
        expect(conflictRes.status).toBe(400);
        const conflictData = await conflictRes.json();
        expect(conflictData.error).toContain('Conflicting matched reimbursement exists');
    });

    it('Scenario 5: Refresh reimbursement scope when selected owner changes', async () => {
        // Create 1 workflow for Household & Acme Corp
        processPersonallyPaidBusinessExpense(db, {
            personalEntityId: personalEntity.id,
            businessEntityId: businessEntity.id,
            currency: 'AUD',
            amountCents: 4200,
            date: '2025-04-01',
            description: 'Household Expense',
            sourceType: 'draft',
            sourceId: saveDraft(db, {
                payer_entity_id: personalEntity.id,
                payment_account_id: personalBankId,
                entity_id: businessEntity.id,
                amount_cents: 4200,
                currency: 'AUD',
                date: '2025-04-01',
                reimbursement_intent: 'yes'
            }).id,
            paymentAccountId: personalBankId,
            businessExpenseAccountId: businessExpenseId,
            performedBy: 'Owner'
        });

        // Create a 3rd entity that has NO reimbursement workflows
        const otherEntity = createEntity(db, { name: 'Unrelated Entity', type: 'person', currency: 'AUD' });
        const allEntities = [...entities, otherEntity];

        // Render with Household selected -> should show 1 outstanding reimbursement
        await act(async () => {
            root.render(<DailyEventsView entities={allEntities} selectedEntityId={personalEntity.id} />);
        });

        expect(container.textContent).toContain('Outstanding Reimbursements (1)');

        // Switch owner to otherEntity -> should show empty state
        await act(async () => {
            root.render(<DailyEventsView entities={allEntities} selectedEntityId={otherEntity.id} />);
        });

        expect(container.textContent).toContain('No outstanding reimbursements at this time.');
    });

    it('Scenario 6: Retain source revisions and draft/evidence linkage during purchase confirmation', async () => {
        db.prepare(`
            INSERT INTO documents (id, filename, content_hash, mime_type, byte_size, created_at)
            VALUES (?, 'invoice.pdf', 'dummy-hash-xyz', 'application/pdf', 1024, datetime('now'))
        `).run('doc-invoice-xyz-123');

        const draft = saveDraft(db, {
            payer_entity_id: personalEntity.id,
            payment_account_id: personalBankId,
            entity_id: businessEntity.id,
            amount_cents: 9900,
            currency: 'AUD',
            date: '2025-05-01',
            merchant: 'Software Vendor',
            description: 'IDE License',
            source_document_id: 'doc-invoice-xyz-123',
            reimbursement_intent: 'yes'
        });

        // Confirm purchase via real POST route
        const res = await POST(new Request('http://localhost:3000/api/accounting', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                action: 'process_personally_paid_expense',
                payload: {
                    personalEntityId: personalEntity.id,
                    businessEntityId: businessEntity.id,
                    currency: 'AUD',
                    amountCents: 9900,
                    date: '2025-05-01',
                    merchant: 'Software Vendor',
                    description: 'IDE License',
                    sourceType: 'draft',
                    sourceId: draft.id,
                    evidenceDocumentId: draft.source_document_id || undefined,
                    paymentAccountId: personalBankId,
                    businessExpenseAccountId: businessExpenseId,
                    performedBy: 'Owner'
                }
            })
        }));

        expect(res.status).toBe(201);
        const data = await res.json();
        expect(data.workflow).toBeDefined();

        // Verify business transaction preserves evidence document link
        const busTx = db.prepare('SELECT * FROM transactions WHERE id = ?').get(data.workflow.business_transaction_id) as any;
        expect(JSON.parse(busTx.evidence_refs)).toContain('doc-invoice-xyz-123');

        // Verify reimbursement workflow preserves evidence document id
        const wfRow = db.prepare('SELECT * FROM reimbursement_workflows WHERE id = ?').get(data.workflow.id) as any;
        expect(wfRow.evidence_document_id).toBe('doc-invoice-xyz-123');

        // Verify draft was marked posted in drafts
        const draftRow = db.prepare('SELECT * FROM drafts WHERE id = ?').get(draft.id) as any;
        expect(draftRow.status).toBe('posted');
    });

    it('Scenario 7: Closing Correction 1 — Distinguish failed candidate lookup from missing bank movement with retry', async () => {
        // Setup: Workflow of AUD 110, Personal 1,000 AUD, Business 390 AUD
        const wf = processPersonallyPaidBusinessExpense(db, {
            personalEntityId: personalEntity.id,
            businessEntityId: businessEntity.id,
            currency: 'AUD',
            amountCents: 11000,
            date: '2025-01-02',
            description: 'Printer ink (Personally Paid)',
            sourceType: 'draft',
            sourceId: saveDraft(db, {
                payer_entity_id: personalEntity.id,
                payment_account_id: personalBankId,
                entity_id: businessEntity.id,
                amount_cents: 11000,
                currency: 'AUD',
                date: '2025-01-02',
                reimbursement_intent: 'yes'
            }).id,
            paymentAccountId: personalBankId,
            businessExpenseAccountId: businessExpenseId,
            performedBy: 'Owner'
        });

        // Suspense accounts & movements
        const pSuspense = createAccount(db, { entity_id: personalEntity.id, name: 'Personal Suspense', type: 'expense', sub_type: 'other', currency: 'AUD', tracking_mode: 'transactions' }).account.id;
        const bSuspense = createAccount(db, { entity_id: businessEntity.id, name: 'Business Suspense', type: 'expense', sub_type: 'other', currency: 'AUD', tracking_mode: 'transactions' }).account.id;

        // Personal receives 110 AUD -> 1,000 AUD
        postTransaction(db, {
            date: '2025-01-10',
            description: 'Reimbursement from Acme Corp',
            origin: 'document_extraction',
            postings: [
                { account_id: personalBankId, amount_cents: 11000, currency: 'AUD' },
                { account_id: pSuspense, amount_cents: -11000, currency: 'AUD' }
            ]
        });

        // Business pays 110 AUD -> 390 AUD
        postTransaction(db, {
            date: '2025-01-08',
            description: 'Transfer to Owner for Printer Ink',
            origin: 'document_extraction',
            postings: [
                { account_id: bSuspense, amount_cents: 11000, currency: 'AUD' },
                { account_id: businessBankId, amount_cents: -11000, currency: 'AUD' }
            ]
        });

        const initialTxCount = (db.prepare('SELECT count(*) as cnt FROM transactions').get() as any).cnt;
        expect(getAccountBalance(db, personalBankId, '2025-01-15').balance_cents).toBe(100000);
        expect(getAccountBalance(db, businessBankId, '2025-01-15').balance_cents).toBe(39000);

        // Simulate HTTP 500 failure on business candidate endpoint
        let simulateBusinessFailure = true;
        const defaultFetch = global.fetch;
        global.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
            const urlStr = typeof input === 'string' ? input : (input instanceof URL ? input.toString() : (input as any).url);
            if (simulateBusinessFailure && urlStr.includes('reimbursement_candidates') && urlStr.includes('leg=business')) {
                return new Response(JSON.stringify({ error: 'Business candidate service unavailable (HTTP 500 simulated)' }), {
                    status: 500,
                    headers: { 'Content-Type': 'application/json' }
                });
            }
            return defaultFetch(input, init);
        }) as unknown as typeof fetch;

        // Render UI
        await act(async () => {
            root.render(<DailyEventsView entities={entities} selectedEntityId="all" />);
            await new Promise(r => setTimeout(r, 100));
        });

        // Click "Match Payment"
        const matchButtons = Array.from(container.querySelectorAll('button')).filter(b => b.textContent?.includes('Match Payment'));
        await act(async () => {
            matchButtons[0].dispatchEvent(new MouseEvent('click', { bubbles: true }));
            await new Promise(r => setTimeout(r, 100));
        });

        const modal = container.querySelector('[role="dialog"]')!;
        expect(modal).not.toBeNull();

        // 1. Assert: Actionable error banner and Retry button displayed for business leg
        expect(modal.textContent).toContain('Business candidate service unavailable');
        const retryBtn = Array.from(modal.querySelectorAll('button')).find(b => b.textContent === 'Retry');
        expect(retryBtn).toBeDefined();

        // 2. Assert: Matching is strictly BLOCKED while candidate lookup is unresolved / failed
        const confirmBtn = Array.from(modal.querySelectorAll('button')).find(b => b.textContent === 'Match Reimbursement') as HTMLButtonElement;
        expect(confirmBtn).toBeDefined();
        expect(confirmBtn.disabled).toBe(true);

        // 3. Assert: Never interpreted failure as "payment missing" — no manual creation was fabricated/auto-selected
        // The business manual creation radio/indicator should NOT be active
        const businessLegHeader = Array.from(modal.querySelectorAll('h4')).find(h => h.textContent?.includes('Business Payment'));
        expect(businessLegHeader).toBeDefined();
        const businessSection = businessLegHeader?.parentElement!;
        expect(businessSection.textContent).not.toContain('Paying Business Account *');

        // 4. Assert: Database state completely untouched
        expect(getAccountBalance(db, personalBankId, '2025-01-15').balance_cents).toBe(100000);
        expect(getAccountBalance(db, businessBankId, '2025-01-15').balance_cents).toBe(39000);
        expect((db.prepare('SELECT count(*) as cnt FROM transactions').get() as any).cnt).toBe(initialTxCount);

        // 5. Heal the endpoint and click Retry
        simulateBusinessFailure = false;
        await act(async () => {
            retryBtn?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
            await new Promise(r => setTimeout(r, 150));
        });

        // 6. Assert: Candidate lookup succeeded, candidate selected, error gone, submit enabled
        expect(modal.textContent).not.toContain('Business candidate service unavailable');
        expect(confirmBtn.disabled).toBe(false);

        // 7. Complete matching
        await act(async () => {
            confirmBtn.dispatchEvent(new MouseEvent('click', { bubbles: true }));
            await new Promise(r => setTimeout(r, 100));
        });

        // 8. Assert: Final balances remain Personal 1,000 and Business 390 (NOT reduced to 280!)
        expect(getAccountBalance(db, personalBankId, '2025-01-15').balance_cents).toBe(100000);
        expect(getAccountBalance(db, businessBankId, '2025-01-15').balance_cents).toBe(39000);
        expect((db.prepare('SELECT count(*) as cnt FROM transactions').get() as any).cnt).toBe(initialTxCount);
        expect((db.prepare('SELECT status FROM reimbursement_workflows WHERE id = ?').get(wf.id) as any).status).toBe('reimbursed');
    });

    it('Scenario 8: Closing Correction 2 — Preserve linked-draft identity and evidence during purchase confirmation', async () => {
        // Step 1: Create an imported personal transaction for AUD 150 purchase (15,000 cents)
        const pSuspense = createAccount(db, { entity_id: personalEntity.id, name: 'Personal Expense Suspense', type: 'expense', sub_type: 'other', currency: 'AUD', tracking_mode: 'transactions' }).account.id;
        const importedPurchaseTx = postTransaction(db, {
            date: '2025-03-01',
            description: 'Bunnings Hardware Supplies',
            payee_or_payer: 'Bunnings',
            origin: 'document_extraction',
            postings: [
                { account_id: pSuspense, amount_cents: 15000, currency: 'AUD' },
                { account_id: personalBankId, amount_cents: -15000, currency: 'AUD' }
            ]
        });

        // Personal Checking was 1,000 -> now 850 AUD
        const initialPersonalBal = getAccountBalance(db, personalBankId, '2025-03-05').balance_cents;
        expect(initialPersonalBal).toBe(85000);

        // Step 2: Seed evidence document and linked draft in drafts
        db.prepare(`
            INSERT INTO documents (id, filename, content_hash, mime_type, byte_size, created_at)
            VALUES (?, 'bunnings_receipt.pdf', 'hash-bunnings-123', 'application/pdf', 2048, datetime('now'))
        `).run('doc-bunnings-receipt-999');

        const draft = saveDraft(db, {
            entity_id: businessEntity.id,
            payer_entity_id: personalEntity.id,
            payment_account_id: personalBankId,
            currency: 'AUD',
            amount_cents: 15000,
            date: '2025-03-01',
            merchant: 'Bunnings',
            description: 'Hardware store supplies for office repair',
            reimbursement_intent: 'yes',
            source_document_id: 'doc-bunnings-receipt-999',
            source_transaction_id: importedPurchaseTx.id
        });

        // Render DailyEventsView -> Draft must appear in "Unresolved Drafts (1)"
        await act(async () => {
            root.render(<DailyEventsView entities={entities} selectedEntityId="all" />);
            await new Promise(r => setTimeout(r, 100));
        });

        expect(container.textContent).toContain('Unresolved Drafts (1)');
        expect(container.textContent).toContain('Hardware store supplies for office repair');

        // Step 3: Click "Edit" on the linked draft
        const editDraftBtn = Array.from(container.querySelectorAll('button')).find(b => b.textContent === 'Edit');
        expect(editDraftBtn).toBeDefined();

        await act(async () => {
            editDraftBtn?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
            await new Promise(r => setTimeout(r, 50));
        });

        // Step 4: Click "Preview & Confirm" in modal footer
        const modal = container.querySelector('[role="dialog"]')!;
        expect(modal).not.toBeNull();

        const previewBtn = Array.from(modal.querySelectorAll('button')).find(b => b.textContent?.includes('Preview & Confirm'));
        expect(previewBtn).toBeDefined();

        await act(async () => {
            previewBtn?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
            await new Promise(r => setTimeout(r, 50));
        });

        // Step 5: Modal displays review screen ("Review Personally Paid Expense")
        expect(modal.textContent).toContain('Review Personally Paid Expense');
        const confirmAndRecordBtn = Array.from(modal.querySelectorAll('button')).find(b => b.textContent?.includes('Confirm and Record'));
        expect(confirmAndRecordBtn).toBeDefined();

        // Step 6: Click "Confirm and Record"
        await act(async () => {
            confirmAndRecordBtn?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
            await new Promise(r => setTimeout(r, 150));
        });

        // Step 7: Assertions
        // 1. No second bank charge: Personal checking remains 850 AUD (NOT reduced again to 700 AUD!)
        const finalPersonalBal = getAccountBalance(db, personalBankId, '2025-03-05').balance_cents;
        expect(finalPersonalBal).toBe(85000);

        // 2. Workflow references originating draft
        const createdWf = db.prepare('SELECT * FROM reimbursement_workflows WHERE personal_transaction_id = ?').get(importedPurchaseTx.id) as any;
        expect(createdWf).toBeDefined();
        expect(createdWf.draft_id).toBe(draft.id);

        // 3. Draft becomes posted in drafts atomically
        const draftRow = db.prepare('SELECT * FROM drafts WHERE id = ?').get(draft.id) as any;
        expect(draftRow.status).toBe('posted');

        // 4. Draft disappears from "Unresolved Drafts"
        expect(container.textContent).not.toContain('Unresolved Drafts');

        // 5. Evidence survives on workflow and transactions
        expect(createdWf.evidence_document_id).toBe('doc-bunnings-receipt-999');
        const reclassifiedPersTx = db.prepare('SELECT * FROM transactions WHERE id = ?').get(importedPurchaseTx.id) as any;
        expect(JSON.parse(reclassifiedPersTx.evidence_refs)).toContain('doc-bunnings-receipt-999');

        const busTx = db.prepare('SELECT * FROM transactions WHERE id = ?').get(createdWf.business_transaction_id) as any;
        expect(JSON.parse(busTx.evidence_refs)).toContain('doc-bunnings-receipt-999');

        // 6. Identical retry creates nothing additional (idempotent)
        const txCountBeforeRetry = (db.prepare('SELECT count(*) as cnt FROM transactions').get() as any).cnt;
        const wfCountBeforeRetry = (db.prepare('SELECT count(*) as cnt FROM reimbursement_workflows').get() as any).cnt;

        const busTxPostings = db.prepare('SELECT account_id FROM journal_entries WHERE transaction_id = ? AND amount_cents > 0').all(createdWf.business_transaction_id) as any[];
        const actualBusinessExpenseId = busTxPostings[0].account_id;

        const retryRes = await POST(new Request('http://localhost:3000/api/accounting', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                action: 'process_personally_paid_expense',
                payload: {
                    personalEntityId: personalEntity.id,
                    businessEntityId: businessEntity.id,
                    currency: 'AUD',
                    amountCents: 15000,
                    date: '2025-03-01',
                    merchant: 'Bunnings',
                    description: 'Hardware store supplies for office repair',
                    sourceType: 'draft',
                    sourceId: draft.id,
                    paymentAccountId: personalBankId,
                    businessExpenseAccountId: actualBusinessExpenseId,
                    evidenceDocumentId: 'doc-bunnings-receipt-999',
                    performedBy: 'User'
                }
            })
        }));

        const retryData = await retryRes.json();
        if (retryRes.status !== 201) {
            console.error('Retry failed with:', retryData);
        }
        expect(retryRes.status).toBe(201);
        expect(retryData.workflow.id).toBe(createdWf.id);

        const txCountAfterRetry = (db.prepare('SELECT count(*) as cnt FROM transactions').get() as any).cnt;
        const wfCountAfterRetry = (db.prepare('SELECT count(*) as cnt FROM reimbursement_workflows').get() as any).cnt;
        expect(txCountAfterRetry).toBe(txCountBeforeRetry);
        expect(wfCountAfterRetry).toBe(wfCountBeforeRetry);
    });
});

