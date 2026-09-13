/**
 * Integration Test Suite for Milestone 1 Slice 1E:
 * Document Inbox and Basic Bank CSV Import Review
 * 
 * Why this file exists:
 * Formally validates that untrusted bank CSV files can be imported, validated, reviewed,
 * and approved into the double-entry accounting ledger with exact mathematical correctness,
 * complete file/evidence retention, duplicate detection, and safe reimport idempotency.
 * 
 * Safety Guarantees (M1-SAFE-01):
 * - Runs exclusively against isolated in-memory SQLite (:memory:).
 * - Strictly forbids mutating or connecting to the live vault (data/opennetworth.sqlite).
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import Database from 'better-sqlite3';
import { createTestDb, closeDb, setTestDb } from '../../../infrastructure/sqlite/db';
import { initAccountingSchema } from '../accounting/schema';
import { createAccount } from '../accounting/accountService';
import { getAccountBalance } from '../accounting/balanceService';
import { postTransaction, ensureExpenseAccount } from '../accounting/transactionService';
import {
    saveCsvMapping,
    listCsvMappings,
    findMatchingMapping,
    ingestCsvDocument,
    listDocuments,
    getDocumentProposals,
    approveProposals
} from './documentInboxService';
import { CsvMappingProfile } from './types';
import { computeHeaderSignature } from './csvParserService';

describe('Slice 1E: Document Inbox and Basic Bank CSV Import Review', () => {
    let db: Database.Database;

    const ENTITY_ID = 'ent-person-alice';
    let bankAccountId: string;

    const standardMapping: CsvMappingProfile = {
        id: 'map-standard-bank-csv',
        name: 'Standard Bank CSV',
        header_signature: 'amount|date|description',
        date_column: 'Date',
        date_format: 'YYYY-MM-DD',
        description_column: 'Description',
        amount_mode: 'single_amount',
        amount_column: 'Amount',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
    };

    beforeEach(() => {
        // Isolated in-memory database setup (M1-SAFE-01)
        db = createTestDb();
        setTestDb(db);
        initAccountingSchema(db);

        // Seed person entity
        db.prepare(`
            INSERT INTO m1_entities (id, name, type, created_at, updated_at)
            VALUES (?, 'Alice Smith', 'person', datetime('now'), datetime('now'))
        `).run(ENTITY_ID);

        // Seed primary liquid checking account
        const { account: bankAccount } = createAccount(db, {
            entity_id: ENTITY_ID,
            name: 'Everyday Checking',
            type: 'asset',
            sub_type: 'checking',
            currency: 'USD',
            opening_date: '2026-01-01',
            opening_balance_cents: 100000 // $1,000.00 opening balance
        });
        bankAccountId = bankAccount.id;
    });

    afterEach(() => {
        closeDb();
    });

    it('Test 1: File Preservation & Byte Retention (SHA-256)', () => {
        const rawCsv = `Date,Description,Amount\n2026-08-01,"Coffee Shop",-4.50\n2026-08-02,"Supermarket",-65.20`;

        const result = ingestCsvDocument(db, {
            filename: 'august_statement.csv',
            raw_content: rawCsv,
            mapping: standardMapping,
            target_account_id: bankAccountId,
            entity_id: ENTITY_ID
        });

        expect(result.document).toBeDefined();
        expect(result.document.filename).toBe('august_statement.csv');
        expect(result.document.byte_size).toBe(Buffer.byteLength(rawCsv, 'utf8'));
        expect(result.document.content_hash).toMatch(/^[a-f0-9]{64}$/);

        // Verify stored in m1_documents with raw content retained
        const stored = db.prepare('SELECT * FROM m1_documents WHERE id = ?').get(result.document.id) as any;
        expect(stored.raw_content).toBe(rawCsv);
        expect(stored.content_hash).toBe(result.document.content_hash);
    });

    it('Test 2: Reusable Mapping Profiles & Header Matching', () => {
        // Save reusable mapping profile
        const saved = saveCsvMapping(db, standardMapping);
        expect(saved.id).toBe('map-standard-bank-csv');

        const list = listCsvMappings(db);
        expect(list.some(m => m.id === saved.id)).toBe(true);

        // Match against incoming headers
        const incomingHeaders = ['Amount', 'Description', 'Date'];
        const incomingSig = computeHeaderSignature(incomingHeaders);
        const matched = findMatchingMapping(db, incomingSig);

        expect(matched).toBeDefined();
        expect(matched?.id).toBe(saved.id);
        expect(matched?.date_column).toBe('Date');
    });

    it('Test 3: Row Validation & Error Flagging (Unsupported Rows Remain Unresolved)', () => {
        const malformedCsv = `Date,Description,Amount
2026-08-01,"Valid Salary Deposit",3500.00
2026-02-31,"Impossible Calendar Day",-25.00
2026-08-03,"Missing Amount",
2026-08-04,"Non Numeric Amount",not_a_number`;

        const result = ingestCsvDocument(db, {
            filename: 'malformed.csv',
            raw_content: malformedCsv,
            mapping: standardMapping,
            target_account_id: bankAccountId,
            entity_id: ENTITY_ID
        });

        expect(result.proposals).toHaveLength(4);

        // Row 1: Valid
        expect(result.proposals[0].validation_findings.filter(f => f.severity === 'error')).toHaveLength(0);
        expect(result.proposals[0].amount_cents).toBe(350000);

        // Row 2: Invalid Date
        expect(result.proposals[1].validation_findings).toEqual(
            expect.arrayContaining([expect.objectContaining({ severity: 'error', code: 'INVALID_DATE' })])
        );

        // Row 3: Missing Amount (never guessed)
        expect(result.proposals[2].validation_findings).toEqual(
            expect.arrayContaining([expect.objectContaining({ severity: 'error', code: 'INVALID_AMOUNT' })])
        );

        // Row 4: Non-numeric Amount
        expect(result.proposals[3].validation_findings).toEqual(
            expect.arrayContaining([expect.objectContaining({ severity: 'error', code: 'INVALID_AMOUNT' })])
        );

        // Verify that trying to approve an erroneous proposal throws and is rejected atomically
        expect(() => {
            approveProposals(db, {
                document_id: result.document.id,
                target_account_id: bankAccountId,
                entity_id: ENTITY_ID,
                items: [{ proposal_id: result.proposals[1].id }]
            });
        }).toThrow(/unresolved error findings/);
    });

    it('Test 4: Internal and External Duplicate Detection Flags', () => {
        // First, record an existing confirmed transaction in the ledger
        const utilityAccount = ensureExpenseAccount(db, ENTITY_ID, 'utilities', 'USD');
        postTransaction(db, {
            date: '2026-08-10',
            description: 'Existing Electric Bill',
            postings: [
                { account_id: utilityAccount.id, amount_cents: 8520, currency: 'USD' },
                { account_id: bankAccountId, amount_cents: -8520, currency: 'USD' }
            ]
        });

        // CSV containing:
        // Row 1: Matches the already-posted transaction in the ledger (External duplicate)
        // Row 2: Standard transaction
        // Row 3: Exact repeat of Row 2 (Internal duplicate within this file)
        const duplicateCsv = `Date,Description,Amount
2026-08-10,"Electric Bill",-85.20
2026-08-11,"Book Purchase",-24.99
2026-08-11,"Book Purchase",-24.99`;

        const result = ingestCsvDocument(db, {
            filename: 'duplicates.csv',
            raw_content: duplicateCsv,
            mapping: standardMapping,
            target_account_id: bankAccountId,
            entity_id: ENTITY_ID
        });

        expect(result.proposals).toHaveLength(3);

        // Row 1: External duplicate warning
        const row1Warnings = result.proposals[0].validation_findings.filter(f => f.code === 'POSSIBLE_DUPLICATE_EXISTING');
        expect(row1Warnings).toHaveLength(1);

        // Row 2: Clean
        const row2Warnings = result.proposals[1].validation_findings.filter(f => f.code === 'SUSPECTED_DUPLICATE_INTERNAL');
        expect(row2Warnings).toHaveLength(0);

        // Row 3: Internal duplicate warning
        const row3Warnings = result.proposals[2].validation_findings.filter(f => f.code === 'SUSPECTED_DUPLICATE_INTERNAL');
        expect(row3Warnings).toHaveLength(1);
    });

    it('Test 5: Atomic, Double-Entry Approval through Existing Accounting Services', () => {
        const cleanCsv = `Date,Description,Amount
2026-08-01,"Direct Deposit Employer",3200.00
2026-08-02,"Supermarket Groceries",-125.50
2026-08-03,"Gas Station",-45.00`;

        const { document, proposals } = ingestCsvDocument(db, {
            filename: 'clean_import.csv',
            raw_content: cleanCsv,
            mapping: standardMapping,
            target_account_id: bankAccountId,
            entity_id: ENTITY_ID
        });

        expect(proposals).toHaveLength(3);
        const initialBalance = getAccountBalance(db, bankAccountId);
        expect(initialBalance.balance_cents).toBe(100000); // $1,000.00

        // Approve all 3 proposals atomically
        const approveResult = approveProposals(db, {
            document_id: document.id,
            target_account_id: bankAccountId,
            entity_id: ENTITY_ID,
            items: [
                { proposal_id: proposals[0].id, category: 'salary' },
                { proposal_id: proposals[1].id, category: 'groceries' },
                { proposal_id: proposals[2].id, category: 'transportation' }
            ]
        });

        expect(approveResult.approved_count).toBe(3);
        expect(approveResult.transaction_ids).toHaveLength(3);

        // Verify proposals are marked 'approved'
        const updatedProposals = getDocumentProposals(db, document.id);
        expect(updatedProposals.every(p => p.review_status === 'approved')).toBe(true);

        // Verify ledger balance: 100,000 + 320,000 - 12,550 - 4,500 = 402,950 cents ($4,029.50)
        const finalBalance = getAccountBalance(db, bankAccountId);
        expect(finalBalance.balance_cents).toBe(402950);
    });

    it('Test 6: Source-Row Evidence Links Drillable to Original Snippet', () => {
        const csv = `Date,Description,Amount\n2026-08-05,"Pharmacy Rx",-32.10`;

        const { document, proposals } = ingestCsvDocument(db, {
            filename: 'rx.csv',
            raw_content: csv,
            mapping: standardMapping,
            target_account_id: bankAccountId,
            entity_id: ENTITY_ID
        });

        const approveResult = approveProposals(db, {
            document_id: document.id,
            target_account_id: bankAccountId,
            entity_id: ENTITY_ID,
            items: [{ proposal_id: proposals[0].id, category: 'medical' }]
        });

        const txId = approveResult.transaction_ids[0];
        const tx = db.prepare('SELECT * FROM m1_transactions WHERE id = ?').get(txId) as any;
        expect(tx).toBeDefined();

        const evidence = JSON.parse(tx.evidence_refs);
        expect(evidence).toHaveLength(1);
        expect(evidence[0].document_id).toBe(document.id);
        expect(evidence[0].content_hash).toBe(document.content_hash);
        expect(evidence[0].cell_reference).toBe('Row 2');
        expect(evidence[0].source_snippet).toBe('2026-08-05,"Pharmacy Rx",-32.10');
    });

    it('Test 7: Safe Reimport Without Duplicate Financial Effects ($0 Double Counting)', () => {
        const statementCsv = `Date,Description,Amount
2026-08-01,"Freelance Payment",500.00
2026-08-02,"Office Supplies",-50.00`;

        // 1. First import
        const firstImport = ingestCsvDocument(db, {
            filename: 'august.csv',
            raw_content: statementCsv,
            mapping: standardMapping,
            target_account_id: bankAccountId,
            entity_id: ENTITY_ID
        });

        // Approve both rows
        approveProposals(db, {
            document_id: firstImport.document.id,
            target_account_id: bankAccountId,
            entity_id: ENTITY_ID,
            items: [
                { proposal_id: firstImport.proposals[0].id },
                { proposal_id: firstImport.proposals[1].id }
            ]
        });

        const balanceAfterFirst = getAccountBalance(db, bankAccountId).balance_cents;
        // 100,000 + 50,000 - 5,000 = 145,000 cents
        expect(balanceAfterFirst).toBe(145000);

        // 2. Reimport the identical file
        const secondImport = ingestCsvDocument(db, {
            filename: 'august_again.csv', // different name, identical content
            raw_content: statementCsv,
            mapping: standardMapping,
            target_account_id: bankAccountId,
            entity_id: ENTITY_ID
        });

        // Content hash matches existing document
        expect(secondImport.document.id).toBe(firstImport.document.id);
        expect(secondImport.document.content_hash).toBe(firstImport.document.content_hash);

        // Verify status remains 'approved'
        expect(secondImport.proposals[0].review_status).toBe('approved');
        expect(secondImport.proposals[1].review_status).toBe('approved');

        const txCountAfterFirst = (db.prepare('SELECT COUNT(*) as cnt FROM m1_transactions').get() as any).cnt;
        expect(txCountAfterFirst).toBe(3); // 1 opening balance tx + 2 imported txs

        // 3. Attempting to approve the same proposals again must be completely idempotent
        approveProposals(db, {
            document_id: secondImport.document.id,
            target_account_id: bankAccountId,
            entity_id: ENTITY_ID,
            items: [
                { proposal_id: secondImport.proposals[0].id },
                { proposal_id: secondImport.proposals[1].id }
            ]
        });

        // Balance must remain unchanged: $0 duplicate financial impact
        const balanceAfterSecond = getAccountBalance(db, bankAccountId).balance_cents;
        expect(balanceAfterSecond).toBe(145000);

        // Confirm total transactions in the ledger has not increased
        const txCountAfterSecond = (db.prepare('SELECT COUNT(*) as cnt FROM m1_transactions').get() as any).cnt;
        expect(txCountAfterSecond).toBe(txCountAfterFirst);
    });

    it('Test 8: Document Inbox Listing and Statistics', () => {
        const csv1 = `Date,Description,Amount\n2026-08-01,"Coffee",-4.50\n2026-08-02,"Gas",-30.00`;
        const csv2 = `Date,Description,Amount\n2026-08-03,"Lunch",-15.00`;

        const d1 = ingestCsvDocument(db, {
            filename: 'file1.csv',
            raw_content: csv1,
            mapping: standardMapping,
            target_account_id: bankAccountId,
            entity_id: ENTITY_ID
        });

        ingestCsvDocument(db, {
            filename: 'file2.csv',
            raw_content: csv2,
            mapping: standardMapping,
            target_account_id: bankAccountId,
            entity_id: ENTITY_ID
        });

        // Approve 1 row of file1
        approveProposals(db, {
            document_id: d1.document.id,
            target_account_id: bankAccountId,
            entity_id: ENTITY_ID,
            items: [{ proposal_id: d1.proposals[0].id }]
        });

        const docs = listDocuments(db);
        expect(docs).toHaveLength(2);

        const doc1 = docs.find(d => d.id === d1.document.id);
        expect(doc1).toBeDefined();
        expect(doc1?.total_proposals).toBe(2);
        expect(doc1?.approved_proposals).toBe(1);
        expect(doc1?.unreviewed_proposals).toBe(1);
    });
});
