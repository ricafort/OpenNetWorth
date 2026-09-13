/**
 * Milestone 1 Slice 1F Acceptance & Regression Test Suite
 * 
 * Why this test suite exists:
 * Verifies the complete Slice 1F document extraction workflow:
 * 1. OpenTax-AU reader integration for text-based supplies invoice/receipt PDFs.
 * 2. Unambiguous retention of unsupported documents as unresolved without guessing missing amounts.
 * 3. Original PDF byte and SHA-256 preservation in local SQLite storage.
 * 4. User review field correction (supplier, date, category, account).
 * 5. Explicit payment confirmation enforcement prior to ledger expense recording.
 * 6. Atomic double-entry ledger posting with immutable evidence linking.
 * 7. Reimport idempotency guaranteeing $0 duplicate financial effects.
 * 8. CSV preview currency scaling regression check.
 * 
 * Tricky logic:
 * - Isolation (M1-SAFE-01): Operates solely against in-memory SQLite (`createTestDb()`).
 *   The live vault file (`data/opennetworth.sqlite`) is never opened or mutated.
 * - Double-Entry Ledger Validation: Checks that Debits and Credits strictly sum to zero,
 *   and verifies evidence references in transaction metadata.
 * - Offline / Bridge Testing: Tests the real Python bridge reader against OpenTax-AU's
 *   sample fixtures, with graceful fallback checks.
 * 
 * TODO: Add multi-currency invoice revaluation test when cross-currency payments are supported.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import fs from 'fs';
import path from 'path';
import { createTestDb, closeDb } from '../../../infrastructure/sqlite/db';
import { initAccountingSchema } from '../accounting/schema';
import { createAccount, createEntity } from '../accounting/accountService';
import {
    approveProposals,
    computeContentHash,
    getDocumentProposals,
    getProposalById,
    ingestPdfDocument,
    updateProposalReview
} from './documentInboxService';
import { extractInvoiceFromPdf } from './openTaxAdapter';
import { parseCsvWithMapping } from './csvParserService';
import { CsvMappingProfile } from './types';

const OPENTAX_SAMPLE_DIR = path.resolve('D:\\', 'AntiGravityProjects', 'opentax-au', 'samples');
const SUPPLIES_INVOICE_PDF = path.join(
    OPENTAX_SAMPLE_DIR,
    'employee_receipt_edge_cases_fy2025_26',
    'documents',
    '05_separate_supplies_invoice.pdf'
);
const UNSUPPORTED_STATEMENT_PDF = path.join(
    OPENTAX_SAMPLE_DIR,
    'side_hustle_income_pack_fy2025_26',
    'documents',
    '01_rideshare_annual_statement.pdf'
);

describe('Milestone 1 Slice 1F — First Document Extraction Integration', () => {
    let db: any;
    let entityId: string;
    let checkingAccountId: string;

    beforeEach(() => {
        // Ensure complete database isolation (M1-SAFE-01)
        db = createTestDb();
        initAccountingSchema(db);

        // Provision test entity and AUD bank account
        const entity = createEntity(db, { name: 'Grace Bell', type: 'person', currency: 'AUD' });
        entityId = entity.id;

        const { account: checking } = createAccount(db, {
            entity_id: entityId,
            name: 'Everyday Checking',
            type: 'asset',
            sub_type: 'checking',
            currency: 'AUD',
            opening_balance_cents: 100000, // $1,000.00 AUD
            opening_date: '2025-07-01'
        });
        checkingAccountId = checking.id;
    });

    it('1. OpenTax-AU adapter extracts supplier, date, currency, line items, and total from supported supplies PDF', async () => {
        // Verify fixture existence
        expect(fs.existsSync(SUPPLIES_INVOICE_PDF)).toBe(true);

        const pdfBuffer = fs.readFileSync(SUPPLIES_INVOICE_PDF);
        const result = await extractInvoiceFromPdf(pdfBuffer);

        expect(result.supported).toBe(true);
        expect(result.supplier_name).toBe('Holloway Office Equipment');
        expect(result.invoice_number).toBe('INV-HO-0301');
        expect(result.date).toBe('2025-11-20');
        expect(result.currency).toBe('AUD');
        expect(result.total_cents).toBe(2200); // $22.00 AUD
        expect(result.tax_cents).toBe(200); // $2.00 GST
        expect(result.net_cents).toBe(2000); // $20.00 subtotal
        expect(result.line_items.length).toBeGreaterThan(0);
        expect(result.line_items[0].description).toBe('Printer paper ream');
        expect(result.line_items[0].amount_cents).toBe(2200);
        expect(result.source_snippet).toContain('Holloway Office Equipment');
    });

    it('2. Retains unsupported document as unresolved without guessing missing amounts', async () => {
        expect(fs.existsSync(UNSUPPORTED_STATEMENT_PDF)).toBe(true);

        const pdfBuffer = fs.readFileSync(UNSUPPORTED_STATEMENT_PDF);
        const result = await ingestPdfDocument(db, {
            filename: '01_rideshare_annual_statement.pdf',
            file_buffer: pdfBuffer,
            target_account_id: checkingAccountId,
            entity_id: entityId
        });

        // Document is preserved in SQLite
        expect(result.document).toBeDefined();
        expect(result.supported).toBe(false);

        // Proposals retain unresolved layout error with 0 amount (zero guesswork)
        expect(result.proposals.length).toBe(1);
        const prop = result.proposals[0];
        expect(prop.amount_cents).toBe(0);
        expect(prop.review_status).toBe('unreviewed');
        expect(prop.validation_findings.some(f => f.code === 'UNSUPPORTED_LAYOUT')).toBe(true);
    });

    it('3. Ingesting supported PDF preserves original binary content and SHA-256 hash', async () => {
        const pdfBuffer = fs.readFileSync(SUPPLIES_INVOICE_PDF);
        const expectedHash = computeContentHash(pdfBuffer);

        const result = await ingestPdfDocument(db, {
            filename: '05_separate_supplies_invoice.pdf',
            file_buffer: pdfBuffer,
            target_account_id: checkingAccountId,
            entity_id: entityId,
            default_category: 'office_supplies'
        });

        expect(result.document.content_hash).toBe(expectedHash);
        expect(result.document.byte_size).toBe(pdfBuffer.length);
        expect(result.document.mime_type).toBe('application/pdf');

        // Check raw_content in database
        const storedDoc = db.prepare('SELECT raw_content FROM m1_documents WHERE id = ?').get(result.document.id) as any;
        expect(storedDoc.raw_content).toBe(pdfBuffer.toString('base64'));

        // Check proposal creation
        expect(result.proposals.length).toBe(1);
        const prop = result.proposals[0];
        expect(prop.counterparty).toBe('Holloway Office Equipment');
        expect(prop.amount_cents).toBe(-2200); // Outflow / Expense
        expect(prop.original_currency).toBe('AUD');
        expect(prop.suggested_category).toBe('office_supplies');
        expect(prop.evidence.document_id).toBe(result.document.id);
        expect(prop.evidence.content_hash).toBe(expectedHash);
    });

    it('4. Allows user to review and correct uncertain fields prior to approval', async () => {
        const pdfBuffer = fs.readFileSync(SUPPLIES_INVOICE_PDF);
        const { proposals } = await ingestPdfDocument(db, {
            filename: 'supplies.pdf',
            file_buffer: pdfBuffer,
            target_account_id: checkingAccountId,
            entity_id: entityId
        });

        const proposalId = proposals[0].id;

        // User corrects description, counterparty, and category
        const updated = updateProposalReview(db, {
            proposal_id: proposalId,
            counterparty: 'Holloway Stationers Pty Ltd',
            description: 'Printing supplies for home office',
            suggested_category: 'office_supplies'
        });

        expect(updated.counterparty).toBe('Holloway Stationers Pty Ltd');
        expect(updated.description).toBe('Printing supplies for home office');
        expect(updated.suggested_category).toBe('office_supplies');
        expect(updated.review_status).toBe('modified');

        // Verify persistence in database
        const fromDb = getProposalById(db, proposalId);
        expect(fromDb?.counterparty).toBe('Holloway Stationers Pty Ltd');
    });

    it('5. Strictly rejects approval without explicit payment confirmation', async () => {
        const pdfBuffer = fs.readFileSync(SUPPLIES_INVOICE_PDF);
        const { document, proposals } = await ingestPdfDocument(db, {
            filename: 'supplies.pdf',
            file_buffer: pdfBuffer,
            target_account_id: checkingAccountId,
            entity_id: entityId
        });

        const proposalId = proposals[0].id;

        // Attempting approval with payment_confirmed omitted or false must throw
        expect(() => {
            approveProposals(db, {
                document_id: document.id,
                target_account_id: checkingAccountId,
                entity_id: entityId,
                items: [
                    {
                        proposal_id: proposalId,
                        category: 'office_supplies',
                        payment_confirmed: false // Not confirmed!
                    }
                ]
            });
        }).toThrow(/payment must be explicitly confirmed/i);

        // Verify zero transactions posted
        const txCount = db.prepare("SELECT COUNT(*) as c FROM m1_transactions WHERE origin = 'document_extraction'").get() as any;
        expect(txCount.c).toBe(0);

        // Proposal status remains unreviewed
        const propAfter = getProposalById(db, proposalId);
        expect(propAfter?.review_status).toBe('unreviewed');
    });

    it('6. Approving with payment confirmed posts balanced ledger transactions with evidence link', async () => {
        const pdfBuffer = fs.readFileSync(SUPPLIES_INVOICE_PDF);
        const { document, proposals } = await ingestPdfDocument(db, {
            filename: 'supplies.pdf',
            file_buffer: pdfBuffer,
            target_account_id: checkingAccountId,
            entity_id: entityId
        });

        const proposalId = proposals[0].id;

        // Approve with explicit payment confirmation
        const approvalResult = approveProposals(db, {
            document_id: document.id,
            target_account_id: checkingAccountId,
            entity_id: entityId,
            items: [
                {
                    proposal_id: proposalId,
                    category: 'office_supplies',
                    payment_confirmed: true // Confirmed!
                }
            ]
        });

        expect(approvalResult.approved_count).toBe(1);
        expect(approvalResult.transaction_ids.length).toBe(1);

        // Verify ledger posting and balance:
        // Checking account credited -$22.00 (-2200 cents)
        // Office supplies expense account debited +$22.00 (+2200 cents)
        const txId = approvalResult.transaction_ids[0];
        const postings = db.prepare('SELECT * FROM m1_journal_entries WHERE transaction_id = ?').all(txId) as any[];
        expect(postings.length).toBe(2);

        const sum = postings.reduce((acc, p) => acc + p.amount_cents, 0);
        expect(sum).toBe(0); // Perfect double-entry balance

        const checkingPosting = postings.find(p => p.account_id === checkingAccountId);
        expect(checkingPosting.amount_cents).toBe(-2200);

        // Evidence reference check
        const tx = db.prepare('SELECT * FROM m1_transactions WHERE id = ?').get(txId) as any;
        expect(tx.evidence_refs).toContain(document.content_hash);

        // Proposal status updated to approved
        const propAfter = getProposalById(db, proposalId);
        expect(propAfter?.review_status).toBe('approved');
    });

    it('7. Re-importing identical PDF produces $0 duplicate financial impact (safe reimport)', async () => {
        const pdfBuffer = fs.readFileSync(SUPPLIES_INVOICE_PDF);

        // 1st Import & Approval
        const { document, proposals } = await ingestPdfDocument(db, {
            filename: 'supplies.pdf',
            file_buffer: pdfBuffer,
            target_account_id: checkingAccountId,
            entity_id: entityId
        });

        approveProposals(db, {
            document_id: document.id,
            target_account_id: checkingAccountId,
            entity_id: entityId,
            items: [
                {
                    proposal_id: proposals[0].id,
                    category: 'office_supplies',
                    payment_confirmed: true
                }
            ]
        });

        const initialTxCount = (db.prepare("SELECT COUNT(*) as c FROM m1_transactions WHERE origin = 'document_extraction'").get() as any).c;
        expect(initialTxCount).toBe(1);

        // 2nd Import of identical PDF
        const reimportResult = await ingestPdfDocument(db, {
            filename: 'supplies_reimported.pdf',
            file_buffer: pdfBuffer,
            target_account_id: checkingAccountId,
            entity_id: entityId
        });

        expect(reimportResult.already_approved).toBe(true);
        expect(reimportResult.document.id).toBe(document.id);

        // Zero duplicate financial effect
        const subsequentTxCount = (db.prepare("SELECT COUNT(*) as c FROM m1_transactions WHERE origin = 'document_extraction'").get() as any).c;
        expect(subsequentTxCount).toBe(1);
    });

    it('8. CSV import preview accurately respects selected account currency (Slice 1E follow-up)', () => {
        const csvContent = `Date,Description,Amount\n2026-08-01,"Coffee Shop",-500\n`;
        const mapping: CsvMappingProfile = {
            id: 'map-test',
            name: 'Test Mapping',
            header_signature: 'amount|date|description',
            date_column: 'Date',
            date_format: 'YYYY-MM-DD',
            description_column: 'Description',
            amount_mode: 'single_amount',
            amount_column: 'Amount',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
        };

        // When currency is JPY (scale 0), 500 should be exactly 500 cents (not multiplied by 100)
        const jpyResult = parseCsvWithMapping(csvContent, mapping, 'JPY');
        expect(jpyResult.rows[0].amount_cents).toBe(-500);

        // When currency is USD (scale 2), 500 should be 50000 cents
        const usdResult = parseCsvWithMapping(csvContent, mapping, 'USD');
        expect(usdResult.rows[0].amount_cents).toBe(-50000);
    });
});
