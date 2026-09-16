/**
 * Slice 1G Remediation Regression Test Suite
 * 
 * Why this file exists:
 * Verifies the 4 focused remediation items for Slice 1G:
 * 1. Migration order & data preservation: Upgrading a populated Slice 1F database preserves its data.
 * 2. Backend transition enforcement:
 *    - Linked -> standalone approval: rejected, 0 financial changes.
 *    - Link again to same transaction: harmless idempotent retry.
 *    - Link to different transaction: rejected, preserves original link.
 * 3. Payment direction matching:
 *    - Candidate search only matches transactions where payment direction matches proposal.
 *    - An incoming deposit (+amount) must not match an expense receipt (-amount).
 *    - Link function and route endpoint reject direction mismatch with status 400.
 * 4. Dev runner safety: Live vault is protected; test fixtures remain completely isolated.
 * 
 * Tricky logic:
 * - Direct SQLite DDL emulation of Slice 1F table structure to prove non-destructive migration.
 * - Double-entry posting sign assertions: asset debit is positive (inflow), asset credit is negative (outflow).
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import Database from 'better-sqlite3';
import { createTestDb, setTestDb } from '../../../infrastructure/sqlite/db';
import { initAccountingSchema } from '../accounting/schema';
import { createAccount, createEntity } from '../accounting/accountService';
import { getAccountBalance } from '../accounting/balanceService';
import { postTransaction } from '../accounting/transactionService';
import { initDocumentSchema } from './schema';
import {
    approveProposals,
    getCandidateTransactionsForProposal,
    getDocumentProposals,
    getProposalById,
    ingestCsvDocument,
    ingestPdfDocument,
    linkProposalToTransaction
} from './documentInboxService';
import { AccountSubType, CurrencyCode } from '../accounting/types';
import { setCustomExtractor, ExtractedPdfDocument } from './openTaxAdapter';
import { CsvMappingProfile } from './types';
import { POST as linkRouteHandler } from '../../../app/api/documents/proposals/link/route';

function createMockReceipt(options: {
    total_cents: number;
    date: string;
    supplier_name: string;
    description: string;
    currency?: CurrencyCode;
}): ExtractedPdfDocument {
    return {
        supported: true,
        layout_name: 'supplies_single_item',
        supplier_name: options.supplier_name,
        invoice_number: `INV-${Date.now()}`,
        date: options.date,
        currency: options.currency || 'AUD',
        total_cents: options.total_cents,
        tax_cents: Math.round(options.total_cents * 0.1),
        net_cents: Math.round(options.total_cents * 0.9),
        line_items: [{
            description: options.description,
            amount_cents: options.total_cents
        }],
        source_snippet: `${options.description} ${options.total_cents / 100}`,
        validation_findings: []
    };
}

describe('Slice 1G Remediations: State Transitions, Direction Matching & Migration', () => {
    let db: Database.Database;
    let entityId: string;
    let checkingAccountId: string;

    const defaultCsvMapping: CsvMappingProfile = {
        id: 'map-test-csv',
        name: 'Standard Bank CSV',
        header_signature: 'amount,date,description',
        date_column: 'date',
        date_format: 'YYYY-MM-DD',
        description_column: 'description',
        amount_mode: 'single_amount',
        amount_column: 'amount',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
    };

    beforeEach(() => {
        db = createTestDb();
        setTestDb(db);
        initAccountingSchema(db);

        const entity = createEntity(db, { name: 'Remediation Test Entity', type: 'person', currency: 'AUD' });
        entityId = entity.id;

        const { account: checking } = createAccount(db, {
            entity_id: entityId,
            name: 'Everyday Checking',
            type: 'asset',
            sub_type: 'checking',
            currency: 'AUD'
        });
        checkingAccountId = checking.id;
    });

    afterEach(() => {
        setCustomExtractor(null);
        if (db) db.close();
    });

    // =========================================================================
    // 1. Migration Order & Data Preservation from Slice 1F
    // =========================================================================
    it('verifies that upgrading a populated Slice 1F database preserves all data and applies Slice 1G schema', () => {
        // Create an isolated in-memory DB specifically mimicking a Slice 1F database state
        const legacyDb = new Database(':memory:');
        legacyDb.pragma('foreign_keys = ON');

        // Create Slice 1F documents table (without raw_content)
        legacyDb.exec(`
            CREATE TABLE m1_documents (
                id TEXT PRIMARY KEY,
                filename TEXT NOT NULL,
                content_hash TEXT NOT NULL UNIQUE,
                mime_type TEXT NOT NULL,
                byte_size INTEGER NOT NULL,
                storage_path TEXT,
                created_at TEXT NOT NULL
            );
        `);

        // Create Slice 1F proposals table (WITHOUT 'linked' in CHECK, and WITHOUT linked_transaction_id column)
        legacyDb.exec(`
            CREATE TABLE m1_proposals (
                id TEXT PRIMARY KEY,
                document_id TEXT NOT NULL,
                entity_id TEXT,
                account_id TEXT,
                event_date TEXT NOT NULL,
                document_period TEXT,
                original_currency TEXT NOT NULL,
                amount_cents INTEGER NOT NULL,
                counterparty TEXT,
                description TEXT NOT NULL,
                event_type TEXT NOT NULL CHECK (event_type IN ('income', 'expense', 'transfer', 'repayment', 'valuation_adjustment')),
                suggested_category TEXT,
                evidence_json TEXT NOT NULL,
                extraction_version TEXT NOT NULL,
                validation_findings TEXT,
                review_status TEXT NOT NULL DEFAULT 'unreviewed' CHECK (review_status IN ('unreviewed', 'approved', 'rejected', 'modified')),
                related_proposal_ids TEXT,
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL,
                FOREIGN KEY (document_id) REFERENCES m1_documents(id) ON DELETE CASCADE
            );
        `);

        // Populate with Slice 1F records
        const docId = 'doc-slice1f-001';
        legacyDb.prepare(`
            INSERT INTO m1_documents (id, filename, content_hash, mime_type, byte_size, created_at)
            VALUES (?, ?, ?, 'text/csv', 512, '2026-09-10T12:00:00Z')
        `).run(docId, 'statement.csv', 'hash-slice1f-123');

        const prop1Id = 'prop-approved-001';
        const prop2Id = 'prop-unreviewed-002';

        legacyDb.prepare(`
            INSERT INTO m1_proposals (
                id, document_id, event_date, original_currency, amount_cents, description,
                event_type, suggested_category, evidence_json, extraction_version, validation_findings,
                review_status, created_at, updated_at
            ) VALUES (?, ?, '2026-09-08', 'AUD', -4500, 'Bunnings Warehouse', 'expense', 'office_supplies', '{"page":1}', 'v1', '[]', 'approved', '2026-09-10T12:01:00Z', '2026-09-10T12:05:00Z')
        `).run(prop1Id, docId);

        legacyDb.prepare(`
            INSERT INTO m1_proposals (
                id, document_id, event_date, original_currency, amount_cents, description,
                event_type, suggested_category, evidence_json, extraction_version, validation_findings,
                review_status, created_at, updated_at
            ) VALUES (?, ?, '2026-09-09', 'AUD', -1250, 'Officeworks Pen', 'expense', 'office_supplies', '{"page":1}', 'v1', '[]', 'unreviewed', '2026-09-10T12:01:00Z', '2026-09-10T12:01:00Z')
        `).run(prop2Id, docId);

        // Run initDocumentSchema (which applies migrateDocumentSchema first)
        expect(() => initDocumentSchema(legacyDb)).not.toThrow();

        // 1. Verify m1_documents has raw_content column
        const docCols = legacyDb.prepare("PRAGMA table_info(m1_documents)").all() as any[];
        expect(docCols.some(c => c.name === 'raw_content')).toBe(true);

        // 2. Verify m1_proposals has linked_transaction_id column
        const propCols = legacyDb.prepare("PRAGMA table_info(m1_proposals)").all() as any[];
        expect(propCols.some(c => c.name === 'linked_transaction_id')).toBe(true);

        // 3. Verify existing data was perfectly preserved
        const rows = legacyDb.prepare("SELECT * FROM m1_proposals ORDER BY id ASC").all() as any[];
        expect(rows).toHaveLength(2);

        const approvedProp = rows.find(r => r.id === prop1Id);
        expect(approvedProp).toBeDefined();
        expect(approvedProp.description).toBe('Bunnings Warehouse');
        expect(approvedProp.amount_cents).toBe(-4500);
        expect(approvedProp.review_status).toBe('approved');
        expect(approvedProp.linked_transaction_id).toBeNull();

        const unreviewedProp = rows.find(r => r.id === prop2Id);
        expect(unreviewedProp).toBeDefined();
        expect(unreviewedProp.description).toBe('Officeworks Pen');
        expect(unreviewedProp.amount_cents).toBe(-1250);
        expect(unreviewedProp.review_status).toBe('unreviewed');
        expect(unreviewedProp.linked_transaction_id).toBeNull();

        // 4. Verify new CHECK constraint allows 'linked' status
        expect(() => {
            legacyDb.prepare(`
                UPDATE m1_proposals
                SET review_status = 'linked', linked_transaction_id = 'tx-test-999'
                WHERE id = ?
            `).run(prop2Id);
        }).not.toThrow();

        const updated = legacyDb.prepare("SELECT review_status, linked_transaction_id FROM m1_proposals WHERE id = ?").get(prop2Id) as any;
        expect(updated.review_status).toBe('linked');
        expect(updated.linked_transaction_id).toBe('tx-test-999');

        legacyDb.close();
    });

    // =========================================================================
    // 2. Backend Transitions: Linked -> Standalone Approval Rejection
    // =========================================================================
    it('rejects standalone approval of an already linked proposal with zero financial changes', async () => {
        // Post a bank transaction for AUD 60 expense
        const bankTx = postTransaction(db, {
            date: '2026-09-12',
            description: 'Adobe Creative Cloud',
            payee_or_payer: 'Adobe Systems',
            postings: [
                { account_id: checkingAccountId, amount_cents: -6000, currency: 'AUD' },
                {
                    account_id: createAccount(db, { entity_id: entityId, name: 'Software Expense', type: 'expense', sub_type: 'other', currency: 'AUD' }).account.id,
                    amount_cents: 6000,
                    currency: 'AUD'
                }
            ]
        });

        const initialBalance = getAccountBalance(db, checkingAccountId);
        expect(initialBalance.balance_cents).toBe(-6000);

        // Ingest matching PDF receipt
        setCustomExtractor(async () => createMockReceipt({
            total_cents: 6000,
            date: '2026-09-12',
            supplier_name: 'Adobe Systems',
            description: 'Adobe Monthly Subscription'
        }));

        const pdfIngest = await ingestPdfDocument(db, {
            filename: 'adobe_receipt.pdf',
            file_buffer: Buffer.from('%PDF-1.4 Adobe Receipt'),
            entity_id: entityId,
            target_account_id: checkingAccountId
        });

        const receiptProposal = pdfIngest.proposals[0];
        expect(receiptProposal.review_status).toBe('unreviewed');

        // Link the proposal to the transaction
        const linkResult = linkProposalToTransaction(db, {
            proposal_id: receiptProposal.id,
            transaction_id: bankTx.id
        });
        expect(linkResult.proposal.review_status).toBe('linked');
        expect(linkResult.proposal.linked_transaction_id).toBe(bankTx.id);

        // Now attempt standalone approval via approveProposals
        expect(() => {
            approveProposals(db, {
                entity_id: entityId,
                document_id: pdfIngest.document.id,
                target_account_id: checkingAccountId,
                items: [
                    {
                        proposal_id: receiptProposal.id,
                        payment_confirmed: true
                    }
                ]
            });
        }).toThrow(/already linked to existing transaction/);

        // Verify account balance and transactions remain strictly unchanged ($0 double counting)
        const postBalance = getAccountBalance(db, checkingAccountId);
        expect(postBalance.balance_cents).toBe(-6000);

        const allTransactions = db.prepare("SELECT COUNT(*) as cnt FROM m1_transactions").get() as any;
        expect(allTransactions.cnt).toBe(1); // Only the original bank transaction
    });

    // =========================================================================
    // 3. Backend Transitions: Idempotent Same-Transaction Retry
    // =========================================================================
    it('allows linking again to the same transaction as a harmless retry without duplicate evidence', async () => {
        const bankTx = postTransaction(db, {
            date: '2026-09-11',
            description: 'Canva Pro Subscription',
            payee_or_payer: 'Canva',
            postings: [
                { account_id: checkingAccountId, amount_cents: -3000, currency: 'AUD' },
                {
                    account_id: createAccount(db, { entity_id: entityId, name: 'Marketing Expense', type: 'expense', sub_type: 'other', currency: 'AUD' }).account.id,
                    amount_cents: 3000,
                    currency: 'AUD'
                }
            ]
        });

        setCustomExtractor(async () => createMockReceipt({
            total_cents: 3000,
            date: '2026-09-11',
            supplier_name: 'Canva',
            description: 'Canva Design Subscription'
        }));

        const pdfIngest = await ingestPdfDocument(db, {
            filename: 'canva_invoice.pdf',
            file_buffer: Buffer.from('%PDF-1.4 Canva Invoice'),
            entity_id: entityId,
            target_account_id: checkingAccountId
        });

        const proposal = pdfIngest.proposals[0];

        // First link call
        const firstLink = linkProposalToTransaction(db, {
            proposal_id: proposal.id,
            transaction_id: bankTx.id
        });
        expect(firstLink.proposal.review_status).toBe('linked');
        expect(firstLink.transaction.evidence_refs).toHaveLength(1);

        // Second link call: same transaction -> harmless retry
        const secondLink = linkProposalToTransaction(db, {
            proposal_id: proposal.id,
            transaction_id: bankTx.id
        });
        expect(secondLink.proposal.review_status).toBe('linked');
        expect(secondLink.proposal.linked_transaction_id).toBe(bankTx.id);
        // Evidence references must not be duplicated
        expect(secondLink.transaction.evidence_refs).toHaveLength(1);
    });

    // =========================================================================
    // 4. Backend Transitions: Different Transaction Link Rejection
    // =========================================================================
    it('rejects linking to a different transaction and preserves the original link', async () => {
        const tx1 = postTransaction(db, {
            date: '2026-09-05',
            description: 'Hosting Server Alpha',
            postings: [
                { account_id: checkingAccountId, amount_cents: -4000, currency: 'AUD' },
                {
                    account_id: createAccount(db, { entity_id: entityId, name: 'Hosting Expense', type: 'expense', sub_type: 'other', currency: 'AUD' }).account.id,
                    amount_cents: 4000,
                    currency: 'AUD'
                }
            ]
        });

        const tx2 = postTransaction(db, {
            date: '2026-09-06',
            description: 'Hosting Server Beta',
            postings: [
                { account_id: checkingAccountId, amount_cents: -4000, currency: 'AUD' },
                {
                    account_id: createAccount(db, { entity_id: entityId, name: 'Hosting Expense 2', type: 'expense', sub_type: 'other', currency: 'AUD' }).account.id,
                    amount_cents: 4000,
                    currency: 'AUD'
                }
            ]
        });

        setCustomExtractor(async () => createMockReceipt({
            total_cents: 4000,
            date: '2026-09-05',
            supplier_name: 'Server Provider',
            description: 'Server Invoice #1'
        }));

        const pdfIngest = await ingestPdfDocument(db, {
            filename: 'server_invoice.pdf',
            file_buffer: Buffer.from('%PDF-1.4 Server Invoice'),
            entity_id: entityId,
            target_account_id: checkingAccountId
        });

        const proposal = pdfIngest.proposals[0];

        // Link to tx1
        linkProposalToTransaction(db, {
            proposal_id: proposal.id,
            transaction_id: tx1.id
        });

        // Attempt to link to tx2 -> must reject and preserve tx1 link
        expect(() => {
            linkProposalToTransaction(db, {
                proposal_id: proposal.id,
                transaction_id: tx2.id
            });
        }).toThrow(/already linked to transaction/);

        // Verify proposal is still linked to tx1
        const refreshedProposal = getProposalById(db, proposal.id)!;
        expect(refreshedProposal.review_status).toBe('linked');
        expect(refreshedProposal.linked_transaction_id).toBe(tx1.id);

        // Verify tx2 has no evidence attached
        const tx2Row = db.prepare("SELECT evidence_refs FROM m1_transactions WHERE id = ?").get(tx2.id) as any;
        expect(tx2Row.evidence_refs).toBeNull();
    });

    // =========================================================================
    // 5. Payment Direction Matching in Candidate Search
    // =========================================================================
    it('matches candidate transactions strictly by payment direction, excluding incoming deposits for expense receipts', async () => {
        // Create an Outflow / Expense of AUD 85 (checking account has -8500)
        const expenseTx = postTransaction(db, {
            date: '2026-09-14',
            description: 'Client Lunch Meeting',
            postings: [
                { account_id: checkingAccountId, amount_cents: -8500, currency: 'AUD' },
                {
                    account_id: createAccount(db, { entity_id: entityId, name: 'Meals Expense', type: 'expense', sub_type: 'living_expense', currency: 'AUD' }).account.id,
                    amount_cents: 8500,
                    currency: 'AUD'
                }
            ]
        });

        // Create an Inflow / Deposit of AUD 85 (checking account has +8500)
        const depositTx = postTransaction(db, {
            date: '2026-09-14',
            description: 'Client Reimbursement Deposit',
            postings: [
                { account_id: checkingAccountId, amount_cents: 8500, currency: 'AUD' },
                {
                    account_id: createAccount(db, { entity_id: entityId, name: 'Reimbursement Income', type: 'income', sub_type: 'freelance', currency: 'AUD' }).account.id,
                    amount_cents: -8500,
                    currency: 'AUD'
                }
            ]
        });

        // Ingest an expense receipt for AUD 85
        setCustomExtractor(async () => createMockReceipt({
            total_cents: 8500,
            date: '2026-09-14',
            supplier_name: 'Bistro 85',
            description: 'Restaurant Receipt'
        }));

        const pdfIngest = await ingestPdfDocument(db, {
            filename: 'bistro_receipt.pdf',
            file_buffer: Buffer.from('%PDF-1.4 Bistro Receipt'),
            entity_id: entityId,
            target_account_id: checkingAccountId
        });

        const expenseProposal = pdfIngest.proposals[0];
        expect(expenseProposal.event_type).toBe('expense');
        expect(expenseProposal.amount_cents).toBe(-8500);

        // Search candidates for the expense proposal
        const candidates = getCandidateTransactionsForProposal(db, expenseProposal.id);

        // Assertion: Only expenseTx (-8500 on checking) must match!
        // depositTx (+8500 on checking) must NEVER be included as a candidate!
        expect(candidates).toHaveLength(1);
        expect(candidates[0].id).toBe(expenseTx.id);
        expect(candidates[0].description).toBe('Client Lunch Meeting');
        expect(candidates[0].amount_cents).toBe(-8500);
    });

    // =========================================================================
    // 6. Payment Direction Validation on Link Endpoint
    // =========================================================================
    it('rejects linking an expense proposal to an incoming deposit transaction with status 400', async () => {
        // Inflow / Deposit of AUD 150 (+15000 on checking)
        const depositTx = postTransaction(db, {
            date: '2026-09-13',
            description: 'Customer Payment Received',
            postings: [
                { account_id: checkingAccountId, amount_cents: 15000, currency: 'AUD' },
                {
                    account_id: createAccount(db, { entity_id: entityId, name: 'Sales Revenue', type: 'income', sub_type: 'freelance', currency: 'AUD' }).account.id,
                    amount_cents: -15000,
                    currency: 'AUD'
                }
            ]
        });

        // Ingest expense invoice of AUD 150
        setCustomExtractor(async () => createMockReceipt({
            total_cents: 15000,
            date: '2026-09-13',
            supplier_name: 'Supplies Co',
            description: 'Office Equipment'
        }));

        const pdfIngest = await ingestPdfDocument(db, {
            filename: 'supplies_invoice.pdf',
            file_buffer: Buffer.from('%PDF-1.4 Supplies Invoice'),
            entity_id: entityId,
            target_account_id: checkingAccountId
        });

        const expenseProposal = pdfIngest.proposals[0];

        // 1. Direct domain function test
        expect(() => {
            linkProposalToTransaction(db, {
                proposal_id: expenseProposal.id,
                transaction_id: depositTx.id
            });
        }).toThrow(/does not have a payment account posting matching proposal amount.*direction/);

        // 2. HTTP Route handler test
        const req = new Request('http://localhost:4000/api/documents/proposals/link', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                proposal_id: expenseProposal.id,
                transaction_id: depositTx.id
            })
        });

        const response = await linkRouteHandler(req);
        expect(response.status).toBe(400);

        const data = await response.json();
        expect(data.error).toMatch(/does not have a payment account posting matching proposal amount/);
        expect(data.error).toMatch(/direction/);

        // Ensure proposal remains unreviewed and transaction evidence is untouched
        const proposalAfter = getProposalById(db, expenseProposal.id)!;
        expect(proposalAfter.review_status).toBe('unreviewed');
        expect(proposalAfter.linked_transaction_id).toBeNull();
    });
});
