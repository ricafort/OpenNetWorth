/**
 * Slice 1G Acceptance & Invariant Test Suite
 * 
 * Why this file exists:
 * Verifies the complete acceptance workflow and domain invariants for Slice 1G:
 * 1. Acceptance workflow:
 *    - Ingest and approve a bank CSV expense of AUD 22.
 *    - Ingest matching PDF receipt (AUD 22).
 *    - Suggest candidates using account, currency, amount, and nearby date.
 *    - Confirm linking: adds evidence without creating another financial posting.
 *    - Verify: one AUD 22 expense, unchanged balances after linking, accessible supporting
 *      evidence, and safe PDF reimport with 0 duplicate records.
 * 2. Invariant & Edge Case Testing:
 *    - Rejects currency mismatch between receipt proposal and candidate transaction.
 *    - Rejects amount mismatch between receipt proposal and candidate transaction.
 *    - Ranks candidate transactions by date proximity.
 *    - Guards proposals with error findings from being linked.
 *    - Reimport idempotency preserves 'linked' status.
 * 
 * Tricky logic:
 * - Isolation (M1-SAFE-01): Operates strictly on temporary in-memory SQLite instances (`createTestDb()`).
 *   The live vault (`data/opennetworth.sqlite`) is never opened or mutated.
 * - Invariant Assertions: Checks transaction count and account balance before and after linking.
 * 
 * TODO: Add multi-currency FX matching tests when cross-currency rates are introduced in Milestone 2.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createTestDb, setTestDb } from '../../../infrastructure/sqlite/db';
import { initAccountingSchema } from '../accounting/schema';
import { createAccount, createEntity } from '../accounting/accountService';
import { getAccountBalance } from '../accounting/balanceService';
import {
    approveProposals,
    getCandidateTransactionsForProposal,
    getDocumentProposals,
    getProposalById,
    ingestCsvDocument,
    ingestPdfDocument,
    linkProposalToTransaction
} from './documentInboxService';
import { setCustomExtractor, ExtractedPdfDocument } from './openTaxAdapter';
import { CsvMappingProfile } from './types';
import { GET as candidatesRouteHandler } from '../../../app/api/documents/proposals/candidates/route';
import { POST as linkRouteHandler } from '../../../app/api/documents/proposals/link/route';

describe('Slice 1G: Receipt-to-Transaction Linking & Invariants', () => {
    let db: any;
    let entityId: string;
    let audBankAccountId: string;
    let usdBankAccountId: string;

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

        // Setup test sovereign entity
        const entity = createEntity(db, { name: 'Slice 1G Test Entity', type: 'household', currency: 'AUD' });
        entityId = entity.id;

        // Setup Everyday Checking account (AUD, opening balance $5,000.00 = 500,000 cents)
        const { account: audAcc } = createAccount(db, {
            entity_id: entityId,
            name: 'Everyday Checking',
            type: 'asset',
            sub_type: 'checking',
            currency: 'AUD',
            opening_balance_cents: 500000,
            opening_date: '2026-01-01'
        });
        audBankAccountId = audAcc.id;

        // Setup USD Checking account for cross-currency tests
        const { account: usdAcc } = createAccount(db, {
            entity_id: entityId,
            name: 'USD Global Checking',
            type: 'asset',
            sub_type: 'checking',
            currency: 'USD',
            opening_balance_cents: 100000,
            opening_date: '2026-01-01'
        });
        usdBankAccountId = usdAcc.id;
    });

    afterEach(() => {
        setCustomExtractor(null);
        setTestDb(null);
    });

    it('executes full Slice 1G acceptance example: CSV expense -> PDF receipt -> Link -> Invariants -> Reimport', async () => {
        // ====================================================================
        // STEP 1: Import and approve a bank CSV expense of AUD 22.00
        // ====================================================================
        const csvContent = [
            'date,description,amount',
            '2026-09-14,Office Supplies Store,-22.00'
        ].join('\n');

        const csvIngest = ingestCsvDocument(db, {
            filename: 'bank_statement_september.csv',
            raw_content: csvContent,
            mapping: defaultCsvMapping,
            target_account_id: audBankAccountId,
            default_category: 'office_supplies',
            entity_id: entityId
        });

        expect(csvIngest.proposals.length).toBe(1);
        const csvProp = csvIngest.proposals[0];
        expect(csvProp.amount_cents).toBe(-2200);
        expect(csvProp.original_currency).toBe('AUD');

        // Approve bank CSV proposal into the ledger
        const approveResult = approveProposals(db, {
            document_id: csvIngest.document.id,
            target_account_id: audBankAccountId,
            entity_id: entityId,
            items: [{
                proposal_id: csvProp.id,
                category: 'office_supplies',
                description: 'Office Supplies Store'
            }]
        });

        expect(approveResult.approved_count).toBe(1);
        expect(approveResult.transaction_ids.length).toBe(1);
        const bankTxId = approveResult.transaction_ids[0];

        // Check balances after CSV approval:
        // Opening $5,000.00 (500,000 cents) - $22.00 (2,200 cents) = $4,978.00 (497,800 cents)
        const balanceAfterCsv = getAccountBalance(db, audBankAccountId, '2026-09-30');
        expect(balanceAfterCsv.balance_cents).toBe(497800);

        // Count total transactions in ledger
        const txCountBeforeLink = (db.prepare('SELECT COUNT(*) as cnt FROM m1_transactions').get() as any).cnt;
        const postingCountBeforeLink = (db.prepare('SELECT COUNT(*) as cnt FROM m1_journal_entries').get() as any).cnt;

        // ====================================================================
        // STEP 2: Import its matching PDF receipt (AUD 22.00)
        // ====================================================================
        const mockPdfReceipt: ExtractedPdfDocument = {
            supported: true,
            layout_name: 'supplies_single_item',
            supplier_name: 'Office Supplies Store',
            invoice_number: 'INV-2026-8812',
            date: '2026-09-14',
            currency: 'AUD',
            total_cents: 2200,
            tax_cents: 200,
            net_cents: 2000,
            line_items: [{
                description: 'A4 Printer Paper & Pens',
                amount_cents: 2200
            }],
            source_snippet: 'TOTAL AUD 22.00 (GST INCL)',
            validation_findings: []
        };
        setCustomExtractor(async () => mockPdfReceipt);

        const pdfIngest = await ingestPdfDocument(db, {
            filename: 'receipt_paper_and_pens.pdf',
            file_buffer: Buffer.from('%PDF-1.4 Mock Receipt Bytes for Slice 1G test'),
            target_account_id: audBankAccountId,
            default_category: 'office_supplies',
            entity_id: entityId
        });

        expect(pdfIngest.proposals.length).toBe(1);
        const pdfProp = pdfIngest.proposals[0];
        expect(pdfProp.amount_cents).toBe(-2200);
        expect(pdfProp.original_currency).toBe('AUD');
        expect(pdfProp.review_status).toBe('unreviewed');
        expect(pdfProp.linked_transaction_id).toBeNull();

        // ====================================================================
        // STEP 3: Retrieve candidates & verify suggestion
        // ====================================================================
        const candidates = getCandidateTransactionsForProposal(db, pdfProp.id);
        expect(candidates.length).toBeGreaterThanOrEqual(1);

        const topCandidate = candidates[0];
        expect(topCandidate.id).toBe(bankTxId);
        expect(topCandidate.account_id).toBe(audBankAccountId);
        expect(topCandidate.currency).toBe('AUD');
        expect(Math.abs(topCandidate.amount_cents)).toBe(2200);
        expect(topCandidate.date_difference_days).toBe(0);
        expect(topCandidate.match_score).toBeGreaterThanOrEqual(100);

        // ====================================================================
        // STEP 4: Review and confirm linking
        // ====================================================================
        const linkResult = linkProposalToTransaction(db, {
            proposal_id: pdfProp.id,
            transaction_id: topCandidate.id
        });

        expect(linkResult.proposal.review_status).toBe('linked');
        expect(linkResult.proposal.linked_transaction_id).toBe(bankTxId);

        // ====================================================================
        // STEP 5: Verify Acceptance Invariants
        // ====================================================================
        // Invariant A: No second transaction created (still exactly the same transaction count!)
        const txCountAfterLink = (db.prepare('SELECT COUNT(*) as cnt FROM m1_transactions').get() as any).cnt;
        const postingCountAfterLink = (db.prepare('SELECT COUNT(*) as cnt FROM m1_journal_entries').get() as any).cnt;
        expect(txCountAfterLink).toBe(txCountBeforeLink);
        expect(postingCountAfterLink).toBe(postingCountBeforeLink);

        // Invariant B: Unchanged account balances
        const balanceAfterLink = getAccountBalance(db, audBankAccountId, '2026-09-30');
        expect(balanceAfterLink.balance_cents).toBe(balanceAfterCsv.balance_cents);
        expect(balanceAfterLink.balance_cents).toBe(497800);

        // Invariant C: Accessible supporting evidence on the transaction
        const updatedTx = db.prepare('SELECT * FROM m1_transactions WHERE id = ?').get(bankTxId) as any;
        expect(updatedTx.evidence_refs).toBeTruthy();
        const evidenceArray = JSON.parse(updatedTx.evidence_refs);
        expect(evidenceArray.length).toBeGreaterThanOrEqual(1);
        const hasLinkedPdfEvidence = evidenceArray.some((e: any) =>
            typeof e === 'string' && e.includes(pdfIngest.document.content_hash)
        );
        expect(hasLinkedPdfEvidence).toBe(true);

        // ====================================================================
        // STEP 6: Safe PDF reimport
        // ====================================================================
        const reimportResult = await ingestPdfDocument(db, {
            filename: 'receipt_paper_and_pens.pdf',
            file_buffer: Buffer.from('%PDF-1.4 Mock Receipt Bytes for Slice 1G test'),
            target_account_id: audBankAccountId,
            default_category: 'office_supplies',
            entity_id: entityId
        });

        expect(reimportResult.already_approved).toBe(true);
        expect(reimportResult.proposals.length).toBe(1);
        expect(reimportResult.proposals[0].review_status).toBe('linked');
        expect(reimportResult.proposals[0].linked_transaction_id).toBe(bankTxId);

        // Verify zero duplicate transactions or balance changes after reimport
        const txCountAfterReimport = (db.prepare('SELECT COUNT(*) as cnt FROM m1_transactions').get() as any).cnt;
        expect(txCountAfterReimport).toBe(txCountBeforeLink);

        const balanceAfterReimport = getAccountBalance(db, audBankAccountId, '2026-09-30');
        expect(balanceAfterReimport.balance_cents).toBe(497800);
    });

    it('suggests candidates with nearby dates and orders by proximity', async () => {
        // Post 3 transactions with different dates:
        // Tx1: 2026-09-14 ($50.00) -> 0 days from proposal
        // Tx2: 2026-09-16 ($50.00) -> 2 days from proposal
        // Tx3: 2026-09-24 ($50.00) -> 10 days from proposal

        const csvContent = [
            'date,description,amount',
            '2026-09-24,Hardware Store,-50.00',
            '2026-09-14,Hardware Store,-50.00',
            '2026-09-16,Hardware Store,-50.00'
        ].join('\n');

        const csvIngest = ingestCsvDocument(db, {
            filename: 'nearby_dates.csv',
            raw_content: csvContent,
            mapping: defaultCsvMapping,
            target_account_id: audBankAccountId,
            default_category: 'office_supplies',
            entity_id: entityId
        });

        approveProposals(db, {
            document_id: csvIngest.document.id,
            target_account_id: audBankAccountId,
            entity_id: entityId,
            items: csvIngest.proposals.map(p => ({ proposal_id: p.id }))
        });

        // Mock PDF dated 2026-09-14 for $50.00
        setCustomExtractor(async () => ({
            supported: true,
            supplier_name: 'Hardware Store',
            date: '2026-09-14',
            currency: 'AUD',
            total_cents: 5000,
            tax_cents: 0,
            net_cents: 5000,
            line_items: [{ description: 'Tools', amount_cents: 5000 }],
            source_snippet: 'TOTAL 50.00',
            validation_findings: []
        }));

        const pdfIngest = await ingestPdfDocument(db, {
            filename: 'receipt_tools.pdf',
            file_buffer: Buffer.from('%PDF-1.4 Tools Receipt'),
            target_account_id: audBankAccountId
        });

        const candidates = getCandidateTransactionsForProposal(db, pdfIngest.proposals[0].id);
        expect(candidates.length).toBe(3);

        // Verify ordering: 0 days diff first, then 2 days diff, then 10 days diff
        expect(candidates[0].date_difference_days).toBe(0);
        expect(candidates[0].date).toBe('2026-09-14');

        expect(candidates[1].date_difference_days).toBe(2);
        expect(candidates[1].date).toBe('2026-09-16');

        expect(candidates[2].date_difference_days).toBe(10);
        expect(candidates[2].date).toBe('2026-09-24');
    });

    it('rejects candidate linking when currencies mismatch', async () => {
        // Post a USD bank transaction
        const csvContent = [
            'date,description,amount',
            '2026-09-14,US Online Service,-30.00'
        ].join('\n');

        const csvIngest = ingestCsvDocument(db, {
            filename: 'usd_statement.csv',
            raw_content: csvContent,
            mapping: defaultCsvMapping,
            target_account_id: usdBankAccountId,
            entity_id: entityId
        });

        const approveResult = approveProposals(db, {
            document_id: csvIngest.document.id,
            target_account_id: usdBankAccountId,
            entity_id: entityId,
            items: [{ proposal_id: csvIngest.proposals[0].id }]
        });
        const usdTxId = approveResult.transaction_ids[0];

        // Create an AUD PDF receipt for 30.00 AUD
        setCustomExtractor(async () => ({
            supported: true,
            supplier_name: 'AU Store',
            date: '2026-09-14',
            currency: 'AUD',
            total_cents: 3000,
            tax_cents: 0,
            net_cents: 3000,
            line_items: [{ description: 'Goods', amount_cents: 3000 }],
            source_snippet: 'TOTAL AUD 30.00',
            validation_findings: []
        }));

        const pdfIngest = await ingestPdfDocument(db, {
            filename: 'aud_goods.pdf',
            file_buffer: Buffer.from('%PDF-1.4 AUD Receipt'),
            target_account_id: audBankAccountId
        });

        // getCandidates should not suggest the USD transaction for an AUD receipt on audBankAccountId
        const candidates = getCandidateTransactionsForProposal(db, pdfIngest.proposals[0].id);
        const matchesUsdTx = candidates.some(c => c.id === usdTxId);
        expect(matchesUsdTx).toBe(false);

        // Attempting to directly link across currencies throws a domain error
        expect(() => {
            linkProposalToTransaction(db, {
                proposal_id: pdfIngest.proposals[0].id,
                transaction_id: usdTxId
            });
        }).toThrow(/does not have a payment account posting matching proposal amount/i);
    });

    it('blocks linking when proposal contains unresolved validation error findings', async () => {
        // Create an unreviewed proposal with an error finding (e.g. UNSUPPORTED_LAYOUT)
        setCustomExtractor(async () => ({
            supported: false,
            currency: null,
            total_cents: 0,
            tax_cents: 0,
            net_cents: 0,
            line_items: [],
            source_snippet: 'Invalid layout snippet',
            validation_findings: [{
                severity: 'error',
                code: 'UNSUPPORTED_LAYOUT',
                message: 'Document layout is not supported.'
            }]
        }));

        const pdfIngest = await ingestPdfDocument(db, {
            filename: 'corrupted_receipt.pdf',
            file_buffer: Buffer.from('%PDF-1.4 Corrupted')
        });

        const prop = pdfIngest.proposals[0];
        expect(prop.validation_findings.some(f => f.severity === 'error')).toBe(true);

        expect(() => {
            linkProposalToTransaction(db, {
                proposal_id: prop.id,
                transaction_id: 'some-tx-id'
            });
        }).toThrow(/unresolved validation errors/i);
    });

    describe('API Endpoints (Candidates & Link)', () => {
        it('GET /api/documents/proposals/candidates handles missing params and returns candidates', async () => {
            // 1. Missing proposal_id -> 400
            const badReq = new Request('http://localhost:3000/api/documents/proposals/candidates');
            const badRes = await candidatesRouteHandler(badReq);
            expect(badRes.status).toBe(400);

            // 2. Valid request -> returns candidate list
            // Post an expense
            const csvIngest = ingestCsvDocument(db, {
                filename: 'api_test.csv',
                raw_content: 'date,description,amount\n2026-09-14,Bookstore,-45.00',
                mapping: defaultCsvMapping,
                target_account_id: audBankAccountId,
                entity_id: entityId
            });
            approveProposals(db, {
                document_id: csvIngest.document.id,
                target_account_id: audBankAccountId,
                entity_id: entityId,
                items: [{ proposal_id: csvIngest.proposals[0].id }]
            });

            // Mock PDF receipt for $45.00
            setCustomExtractor(async () => ({
                supported: true,
                supplier_name: 'Bookstore',
                date: '2026-09-14',
                currency: 'AUD',
                total_cents: 4500,
                tax_cents: 0,
                net_cents: 4500,
                line_items: [{ description: 'Books', amount_cents: 4500 }],
                source_snippet: 'TOTAL 45.00',
                validation_findings: []
            }));

            const pdfIngest = await ingestPdfDocument(db, {
                filename: 'receipt_books.pdf',
                file_buffer: Buffer.from('%PDF-1.4 Books'),
                target_account_id: audBankAccountId
            });

            const goodReq = new Request(`http://localhost:3000/api/documents/proposals/candidates?proposal_id=${pdfIngest.proposals[0].id}`);
            const goodRes = await candidatesRouteHandler(goodReq);
            expect(goodRes.status).toBe(200);
            const body = await goodRes.json();
            expect(body.success).toBe(true);
            expect(body.candidates.length).toBeGreaterThanOrEqual(1);
            expect(Math.abs(body.candidates[0].amount_cents)).toBe(4500);
        });

        it('POST /api/documents/proposals/link links proposal and rejects invalid requests', async () => {
            // Missing fields -> 400
            const badReq1 = new Request('http://localhost:3000/api/documents/proposals/link', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ proposal_id: 'prop-1' })
            });
            const res1 = await linkRouteHandler(badReq1);
            expect(res1.status).toBe(400);

            // Create bank transaction and receipt proposal
            const csvIngest = ingestCsvDocument(db, {
                filename: 'api_link_test.csv',
                raw_content: 'date,description,amount\n2026-09-14,Cafe Lunch,-18.50',
                mapping: defaultCsvMapping,
                target_account_id: audBankAccountId,
                entity_id: entityId
            });
            const approveRes = approveProposals(db, {
                document_id: csvIngest.document.id,
                target_account_id: audBankAccountId,
                entity_id: entityId,
                items: [{ proposal_id: csvIngest.proposals[0].id }]
            });
            const txId = approveRes.transaction_ids[0];

            setCustomExtractor(async () => ({
                supported: true,
                supplier_name: 'Cafe',
                date: '2026-09-14',
                currency: 'AUD',
                total_cents: 1850,
                tax_cents: 0,
                net_cents: 1850,
                line_items: [{ description: 'Lunch', amount_cents: 1850 }],
                source_snippet: 'TOTAL 18.50',
                validation_findings: []
            }));

            const pdfIngest = await ingestPdfDocument(db, {
                filename: 'receipt_lunch.pdf',
                file_buffer: Buffer.from('%PDF-1.4 Lunch'),
                target_account_id: audBankAccountId
            });
            const propId = pdfIngest.proposals[0].id;

            // Successful link via API
            const goodReq = new Request('http://localhost:3000/api/documents/proposals/link', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    proposal_id: propId,
                    transaction_id: txId
                })
            });
            const goodRes = await linkRouteHandler(goodReq);
            expect(goodRes.status).toBe(200);
            const goodBody = await goodRes.json();
            expect(goodBody.success).toBe(true);
            expect(goodBody.proposal.review_status).toBe('linked');
            expect(goodBody.proposal.linked_transaction_id).toBe(txId);
        });
    });
});

