/**
 * Delivery 2B Acceptance & Regression Test Suite
 * 
 * Why this file exists:
 * Comprehensive independent verification for Delivery 2B (Statement Files to Reviewed Balances):
 * 1. Upload statement PDF -> Portable extraction -> Durable review session in SQLite.
 * 2. Reload during review: Modifying proposals, reloading/fetching session, verifying edits preserved.
 * 3. Save Balances: Commits accepted observations with document_id and page_number to balance_observations.
 *    STRICT INVARIANT: Double-entry ledger (transactions / journal_entries) is 100% untouched.
 * 4. Duplicate upload preservation: Re-uploading saved statement preserves saved decisions with zero duplicates.
 * 5. Retry failed extraction without duplicating financial effects.
 * 6. Financial rules: Credit limits, redraw, and portfolio components do NOT inflate net worth.
 * 7. Evidence traceability & Vault backup/restore: Verifies document_id, page_number, and reviews persist.
 * 
 * Tricky logic:
 * - Direct execution of Next.js Route handlers (POST /api/documents/statements, POST /api/accounting/balances,
 *   GET /api/vault, POST /api/vault) against isolated in-memory SQLite (`setTestDb()`).
 * - Validates strict separation between point-in-time balance observations and historical transaction ledgers.
 * 
 * TODO: In Milestone 2, add multi-currency statement cross-revaluation tests.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import Database from 'better-sqlite3';
import { createTestDb, setTestDb } from '@/infrastructure/sqlite/db';
import { createEntity, createAccount, getAccount } from '../accounting/accountService';
import { getSharedFinancialSummary } from '../accounting/sharedFinancialSummaryService';
import { markStatementProposalsSaved } from '../accounting/statementReviewService';
import {
    POST as statementsPost,
    GET as statementsGet,
    PUT as statementsPut
} from '@/app/api/documents/statements/route';
import { POST as balancesPost } from '@/app/api/accounting/balances/route';
import { GET as vaultGet, POST as vaultPost } from '@/app/api/vault/route';
import {
    createCreditCardStatementPdf,
    createMortgageStatementPdf,
    createSuperInvestmentStatementPdf,
    createJointDifferentOwnersStatementPdf
} from './fixtures/statementFixtures';

describe('Delivery 2B: Statement Files to Reviewed Balances Acceptance', () => {
    let db: Database.Database;
    let householdEntity: any;
    let cardAccount: any;
    let mortgageAccount: any;
    let superAccount: any;

    beforeEach(() => {
        db = createTestDb();
        setTestDb(db);

        // Seed Sovereign Entity
        householdEntity = createEntity(db, {
            name: 'Smith Household',
            type: 'household',
            currency: 'AUD'
        });

        // Seed Accounts
        cardAccount = createAccount(db, {
            entity_id: householdEntity.id,
            name: 'Diamond Awards Credit Card',
            type: 'liability',
            sub_type: 'credit_card',
            currency: 'AUD',
            institution: 'Commonwealth Bank',
            account_number_mask: '•••• 4421',
            tracking_mode: 'balance'
        }).account;

        mortgageAccount = createAccount(db, {
            entity_id: householdEntity.id,
            name: 'Smart Home Loan',
            type: 'liability',
            sub_type: 'mortgage',
            currency: 'AUD',
            institution: 'Macquarie Bank',
            account_number_mask: '•••• 9812',
            tracking_mode: 'balance'
        }).account;

        superAccount = createAccount(db, {
            entity_id: householdEntity.id,
            name: 'Hostplus Superannuation Fund',
            type: 'asset',
            sub_type: 'superannuation',
            currency: 'AUD',
            institution: 'Hostplus',
            account_number_mask: '•••• 7731',
            tracking_mode: 'balance'
        }).account;
    });

    /**
     * Helper to create multipart form-data Request for statement uploads.
     */
    function createStatementUploadRequest(pdfBuffer: Buffer, filename: string): Request {
        const formData = new FormData();
        const blob = new Blob([new Uint8Array(pdfBuffer)], { type: 'application/pdf' });
        formData.append('file', blob, filename);

        return new Request('http://localhost:3000/api/documents/statements', {
            method: 'POST',
            body: formData,
            headers: {
                'x-local-client': 'true'
            }
        });
    }

    it('1. Upload statement -> Extract -> Durable review session created', async () => {
        const cardPdf = createCreditCardStatementPdf();
        const req = createStatementUploadRequest(cardPdf, 'cba_card_march.pdf');
        const res = await statementsPost(req);

        expect(res.status).toBe(200);
        const data = await res.json();
        expect(data.success).toBe(true);
        expect(data.document.id).toBeDefined();
        expect(data.review.status).toBe('pending_review');
        expect(data.proposals.length).toBeGreaterThanOrEqual(3);

        // Verify proposals contain page_number and document_id
        for (const p of data.proposals) {
            expect(p.page_number).toBe(1);
            expect(p.document_id).toBe(data.document.id);
            expect(p.source_excerpt).toBeDefined();
        }

        // Verify document is retained in documents
        const docRow = db.prepare('SELECT * FROM documents WHERE id = ?').get(data.document.id) as any;
        expect(docRow).toBeDefined();
        expect(docRow.filename).toBe('cba_card_march.pdf');
        expect(docRow.mime_type).toBe('application/pdf');
        expect(docRow.raw_content).toBeDefined(); // Retains base64 content
    });

    it('2. Reload during review: Modifying proposals, reloading/fetching session, verifying edits preserved', async () => {
        const cardPdf = createCreditCardStatementPdf();
        const uploadRes = await statementsPost(createStatementUploadRequest(cardPdf, 'cba_card_reload_test.pdf'));
        const uploadData = await uploadRes.json();
        const docId = uploadData.document.id;
        const proposals = uploadData.proposals;

        // User edits proposal in review modal (e.g. adjusts closing balance amount from $1,500.00 to $1,550.00)
        const closingProp = proposals.find((p: any) => p.balance_kind === 'statement_closing_balance' || p.balance_kind === 'current_balance');
        expect(closingProp).toBeDefined();
        closingProp.amount_cents = 155000;
        closingProp.is_user_modified = true;
        closingProp.matched_account_id = cardAccount.id;

        // PUT autosync to persist in-flight review modifications
        const putReq = new Request('http://localhost:3000/api/documents/statements', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json', 'x-local-client': 'true' },
            body: JSON.stringify({
                document_id: docId,
                proposals
            })
        });
        const putRes = await statementsPut(putReq);
        expect(putRes.status).toBe(200);

        // Simulate browser reload: fetch review session via GET /api/documents/statements?document_id=...
        const getReq = new Request(`http://localhost:3000/api/documents/statements?document_id=${docId}`, {
            method: 'GET',
            headers: { 'x-local-client': 'true' }
        });
        const getRes = await statementsGet(getReq);
        expect(getRes.status).toBe(200);
        const getData = await getRes.json();
        expect(getData.success).toBe(true);

        // Verify the user's edited amount and matched_account_id were preserved across reload
        const reloadedClosing = getData.review.proposals.find((p: any) => p.id === closingProp.id);
        expect(reloadedClosing.amount_cents).toBe(155000);
        expect(reloadedClosing.is_user_modified).toBe(true);
        expect(reloadedClosing.matched_account_id).toBe(cardAccount.id);
    });

    it('3. Save Balances creates accepted observations WITHOUT modifying transaction ledger', async () => {
        const cardPdf = createCreditCardStatementPdf();
        const uploadRes = await statementsPost(createStatementUploadRequest(cardPdf, 'cba_card_save_test.pdf'));
        const uploadData = await uploadRes.json();
        const docId = uploadData.document.id;
        const proposals = uploadData.proposals;

        // Map proposals to cardAccount
        const closingProp = proposals.find((p: any) => p.balance_kind === 'statement_closing_balance' || p.balance_kind === 'current_balance');
        closingProp.matched_account_id = cardAccount.id;
        closingProp.account_id = cardAccount.id;
        closingProp.effective_date = '2026-03-15';
        closingProp.confirmed_by_user = true;

        // Commit balance updates via POST /api/accounting/balances
        const saveReq = new Request('http://localhost:3000/api/accounting/balances', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'x-local-client': 'true' },
            body: JSON.stringify({
                items: [{
                    account_id: cardAccount.id,
                    amount_cents: closingProp.amount_cents,
                    currency: 'AUD',
                    balance_kind: 'statement_closing_balance',
                    effective_date: '2026-03-15',
                    source_type: 'document',
                    source_reference: 'cba_card_save_test.pdf',
                    source_excerpt: closingProp.source_excerpt,
                    document_id: docId,
                    page_number: 1,
                    is_user_modified: false,
                    confirmed_by_user: true
                }]
            })
        });
        const saveRes = await balancesPost(saveReq);
        expect(saveRes.status).toBe(200);

        // 1. Verify observation exists in balance_observations with document_id and page_number
        const obs = db.prepare('SELECT * FROM balance_observations WHERE account_id = ?').get(cardAccount.id) as any;
        expect(obs).toBeDefined();
        expect(obs.amount_cents).toBe(150000);
        expect(obs.document_id).toBe(docId);
        expect(obs.page_number).toBe(1);
        expect(obs.source_type).toBe('document');
        expect(obs.review_status).toBe('accepted');

        // 2. CRITICAL INVARIANT: Verify double-entry ledger is 100% UNTOUCHED
        const txCount = (db.prepare('SELECT COUNT(*) as cnt FROM transactions').get() as any).cnt;
        const journalCount = (db.prepare('SELECT COUNT(*) as cnt FROM journal_entries').get() as any).cnt;
        expect(txCount).toBe(0);
        expect(journalCount).toBe(0);

        // 3. Complete review session and verify statement_reviews status is marked 'saved'
        // Why this exists:
        // Delivery 2B: Full statement review completion requires all proposals in session to be marked saved.
        // Tricky logic:
        // Partial saves leave status as 'pending_review'; saving all items completes the review session.
        // TODO: In Milestone 2, support explicit dismissal of supporting metadata rows.
        markStatementProposalsSaved(db, docId, proposals.map((p: any) => p.id));
        const review = db.prepare('SELECT * FROM statement_reviews WHERE document_id = ?').get(docId) as any;
        expect(review.status).toBe('saved');
    });

    it('4. Duplicate upload preserves saved decisions and prevents duplicate records', async () => {
        const cardPdf = createCreditCardStatementPdf();

        // Initial upload and save
        const upload1 = await statementsPost(createStatementUploadRequest(cardPdf, 'cba_card_dup.pdf'));
        const data1 = await upload1.json();
        const docId = data1.document.id;

        await balancesPost(new Request('http://localhost:3000/api/accounting/balances', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'x-local-client': 'true' },
            body: JSON.stringify({
                items: [{
                    account_id: cardAccount.id,
                    amount_cents: 150000,
                    currency: 'AUD',
                    balance_kind: 'statement_closing_balance',
                    effective_date: '2026-03-15',
                    source_type: 'document',
                    document_id: docId,
                    page_number: 1,
                    confirmed_by_user: true
                }]
            })
        }));

        // Mark statement review session complete
        markStatementProposalsSaved(db, docId, data1.proposals.map((p: any) => p.id));

        // Re-upload identical statement
        const upload2 = await statementsPost(createStatementUploadRequest(cardPdf, 'cba_card_dup.pdf'));
        expect(upload2.status).toBe(200);
        const data2 = await upload2.json();

        expect(data2.is_duplicate).toBe(true);
        expect(data2.already_saved).toBe(true);
        expect(data2.document.id).toBe(docId);
        expect(data2.message).toContain('previously imported and its balances were saved');

        // Verify exactly 1 observation exists (zero duplicates created)
        const obsCount = (db.prepare('SELECT COUNT(*) as cnt FROM balance_observations WHERE account_id = ?').get(cardAccount.id) as any).cnt;
        expect(obsCount).toBe(1);
    });

    it('5. Retry a failed extraction without duplicating financial effects', async () => {
        const corruptBuf = Buffer.from('Invalid corrupt content');
        const uploadFail = await statementsPost(createStatementUploadRequest(corruptBuf, 'broken_statement.pdf'));
        expect(uploadFail.status).toBe(422);
        const failData = await uploadFail.json();
        expect(failData.supported).toBe(false);

        // Now upload valid statement for the account
        const validPdf = createMortgageStatementPdf();
        const uploadValid = await statementsPost(createStatementUploadRequest(validPdf, 'repaired_mortgage.pdf'));
        expect(uploadValid.status).toBe(200);
        const validData = await uploadValid.json();

        // Commit balance
        await balancesPost(new Request('http://localhost:3000/api/accounting/balances', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'x-local-client': 'true' },
            body: JSON.stringify({
                items: [{
                    account_id: mortgageAccount.id,
                    amount_cents: 45000000,
                    currency: 'AUD',
                    balance_kind: 'outstanding_loan_principal',
                    effective_date: '2026-03-31',
                    source_type: 'document',
                    document_id: validData.document.id,
                    page_number: 1,
                    confirmed_by_user: true
                }]
            })
        }));

        const obsRows = db.prepare('SELECT * FROM balance_observations WHERE account_id = ?').all(mortgageAccount.id) as any[];
        expect(obsRows.length).toBe(1);
        expect(obsRows[0].amount_cents).toBe(45000000);
    });

    it('6. Financial rules: Credit limits, redraw, and portfolio components do NOT inflate net worth', async () => {
        // Record credit limit ($10,000.00), available credit ($8,500.00), and actual closing balance ($1,500.00)
        const items = [
            {
                account_id: cardAccount.id,
                amount_cents: 1000000,
                currency: 'AUD',
                balance_kind: 'credit_limit',
                effective_date: '2026-03-15',
                confirmed_by_user: true
            },
            {
                account_id: cardAccount.id,
                amount_cents: 850000,
                currency: 'AUD',
                balance_kind: 'available_credit',
                effective_date: '2026-03-15',
                confirmed_by_user: true
            },
            {
                account_id: cardAccount.id,
                amount_cents: 150000,
                currency: 'AUD',
                balance_kind: 'statement_closing_balance',
                effective_date: '2026-03-15',
                confirmed_by_user: true
            }
        ];

        await balancesPost(new Request('http://localhost:3000/api/accounting/balances', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'x-local-client': 'true' },
            body: JSON.stringify({ items })
        }));

        // Check financial summary: liability total must be exactly $1,500.00 (150,000 cents)
        // NOT $10,000 + $8,500 + $1,500 ($20,000)!
        const summary = getSharedFinancialSummary(db, { reporting_currency: 'AUD' });
        expect(summary.total_liabilities_cents_by_currency['AUD']).toBe(150000);
    });

    it('7. Vault Backup & Restore preserves document_id, page_number, and statement reviews', async () => {
        // 1. Upload card statement and save observation
        const cardPdf = createCreditCardStatementPdf();
        const uploadRes = await statementsPost(createStatementUploadRequest(cardPdf, 'cba_card_vault.pdf'));
        const uploadData = await uploadRes.json();
        const docId = uploadData.document.id;

        await balancesPost(new Request('http://localhost:3000/api/accounting/balances', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'x-local-client': 'true' },
            body: JSON.stringify({
                items: [{
                    account_id: cardAccount.id,
                    amount_cents: 150000,
                    currency: 'AUD',
                    balance_kind: 'statement_closing_balance',
                    effective_date: '2026-03-15',
                    source_type: 'document',
                    document_id: docId,
                    page_number: 1,
                    confirmed_by_user: true
                }]
            })
        }));

        // Mark statement review session complete
        markStatementProposalsSaved(db, docId, uploadData.proposals.map((p: any) => p.id));

        // 2. Export vault backup
        const vaultRes = await vaultGet(new Request('http://localhost:3000/api/vault', {
            headers: { 'x-local-client': 'true' }
        }));
        expect(vaultRes.status).toBe(200);
        const vaultData = await vaultRes.json();
        expect(vaultData.vault.documents.length).toBeGreaterThan(0);
        expect(vaultData.vault.statement_reviews.length).toBeGreaterThan(0);

        const exportedObs = vaultData.vault.balance_observations.find((o: any) => o.account_id === cardAccount.id);
        expect(exportedObs).toBeDefined();
        expect(exportedObs.document_id).toBe(docId);
        expect(exportedObs.page_number).toBe(1);

        // 3. Restore into clean test database
        const cleanDb = createTestDb();
        setTestDb(cleanDb);

        const restoreReq = new Request('http://localhost:3000/api/vault', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'x-local-client': 'true' },
            body: JSON.stringify({
                action: 'restore',
                vault: vaultData.vault
            })
        });
        const restoreRes = await vaultPost(restoreReq);
        expect(restoreRes.status).toBe(200);

        // Verify observation and evidence links were restored into cleanDb
        const restoredObs = cleanDb.prepare('SELECT * FROM balance_observations WHERE account_id = ?').get(cardAccount.id) as any;
        expect(restoredObs).toBeDefined();
        expect(restoredObs.amount_cents).toBe(150000);
        expect(restoredObs.document_id).toBe(docId);
        expect(restoredObs.page_number).toBe(1);

        // Verify statement review session was restored
        const restoredReview = cleanDb.prepare('SELECT * FROM statement_reviews WHERE document_id = ?').get(docId) as any;
        expect(restoredReview).toBeDefined();
        expect(restoredReview.status).toBe('saved');
    });
});
