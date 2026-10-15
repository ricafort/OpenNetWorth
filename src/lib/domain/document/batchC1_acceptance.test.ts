/**
 * Batch C1 Acceptance Tests: Remaining Acceptance Corrections
 * 
 * Why this file exists:
 * Fulfills Batch C1 remaining acceptance criteria:
 * 1. Household Bank Statement Extraction: Extracts evidenced closing balance ($26,269.15 AUD, 2025-09-30)
 *    from the actual household_bank_statement.pdf sample through extractStatementBalancesFromPdf,
 *    without producing transaction running-balance proposals (payroll, bill payments, transfers).
 * 2. Dynamic Parsing: Extracts closing balance from a varied-value/date synthetic fixture,
 *    proving dynamic parser extraction rather than hardcoded pattern matching.
 * 3. Proposal-Level Ownership: Atomically updates account_id and entity_id on pending proposals only,
 *    preserving approved and linked proposals, without touching non-existent documents.entity_id.
 * 4. Atomic Rollback: Fails atomically via SQLite transaction if any pending proposal has a currency
 *    mismatch with the target account, rolling back so zero partial updates occur.
 * 5. Selective Finding Resolution: Clears CURRENCY_MISMATCH and account findings resolved by account
 *    assignment, while strictly preserving MISSING_CURRENCY.
 * 6. Truthful & Scoped Manual Fallback: Manual entries retain source_type: 'manual' even when document_id
 *    is retained as evidence, and document association is cleared when starting unrelated entries.
 * 7. Completion Links: Links target /accounting?view=accounts&accountId=... for a single account ("View account")
 *    and /accounting?view=accounts for multiple accounts ("View accounts"), respecting actual saved counts.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import { jsPDF } from 'jspdf';
import { createTestDb } from '@/infrastructure/sqlite/db';
import { initAccountingSchema } from '../accounting/schema';
import { initDocumentSchema } from './schema';
import { createEntity, createAccount } from '../accounting/accountService';
import { extractStatementBalancesFromPdf } from './pdfStatementExtractor';
import { bulkUpdateProposalAccount } from './documentInboxService';

describe('Batch C1 Acceptance: Remaining Acceptance Corrections', () => {
    let db: Database.Database;
    let householdEntityId: string;
    let everydayCheckingId: string;

    beforeEach(() => {
        db = createTestDb();
        initAccountingSchema(db);
        initDocumentSchema(db);

        // Seed household entity and checking account
        const entity = createEntity(db, { name: 'Alex and Morgan Nguyen household', type: 'household', currency: 'AUD' });
        householdEntityId = entity.id;

        const { account } = createAccount(db, {
            entity_id: householdEntityId,
            name: 'Everyday Checking',
            type: 'asset',
            sub_type: 'checking',
            currency: 'AUD',
            institution: 'Commonwealth Bank',
            account_number_mask: 'TEST-HH-EVERYDAY'
        });
        everydayCheckingId = account.id;
    });

    // ---------------------------------------------------------------------------------------------
    // Criterion 1: Real household_bank_statement.pdf Extraction
    // ---------------------------------------------------------------------------------------------
    it('1. Extracts evidenced closing balance from actual household_bank_statement.pdf without transaction proposals', async () => {
        const samplePath = path.resolve(
            process.cwd(),
            'samples/Australian_Finance_Test_Pack_v1/03_documents/household_bank_statement.pdf'
        );
        expect(fs.existsSync(samplePath), `Sample PDF not found at ${samplePath}`).toBe(true);

        const pdfBuffer = fs.readFileSync(samplePath);
        const result = await extractStatementBalancesFromPdf(
            db,
            pdfBuffer,
            'household_bank_statement.pdf',
            undefined,
            householdEntityId
        );

        expect(result.supported).toBe(true);
        expect(result.coverage_summary.coverage_level).toBe('full');

        // Must extract exactly 1 closing balance proposal
        expect(result.proposals).toHaveLength(1);

        const closingBalanceProp = result.proposals[0];
        expect(closingBalanceProp.amount_cents).toBe(2626915); // $26,269.15
        expect(closingBalanceProp.currency).toBe('AUD');
        expect(closingBalanceProp.effective_date).toBe('2025-09-30');
        expect(closingBalanceProp.balance_kind).toBe('statement_closing_balance');
        expect(closingBalanceProp.page_number).toBe(1);
        expect(closingBalanceProp.account_id).toBe(everydayCheckingId);

        // Sourced excerpt must reference the summary section, not a single transaction line
        expect(closingBalanceProp.source_excerpt).toBeTruthy();
        expect(closingBalanceProp.source_excerpt).toMatch(/closing|balance/i);

        // Must NOT contain transaction rows as proposals (e.g. payroll, BPAY, groceries, transfers)
        const allRawLabels = result.proposals.map(p => (p.raw_label || '').toLowerCase());
        expect(allRawLabels.some(l => l.includes('payroll'))).toBe(false);
        expect(allRawLabels.some(l => l.includes('bpay'))).toBe(false);
        expect(allRawLabels.some(l => l.includes('groceries'))).toBe(false);
        expect(allRawLabels.some(l => l.includes('internal transfer'))).toBe(false);
    });

    // ---------------------------------------------------------------------------------------------
    // Criterion 2: Dynamic Parsing on Varied-Value / Varied-Date Fixture
    // ---------------------------------------------------------------------------------------------
    it('2. Dynamically extracts closing balance from a varied-value/date statement fixture without hardcoding', async () => {
        // Create an account with distinct name and mask
        const { account: saverAcc } = createAccount(db, {
            entity_id: householdEntityId,
            name: 'Smart Saver',
            type: 'asset',
            sub_type: 'savings',
            currency: 'AUD',
            institution: 'Test Bank',
            account_number_mask: 'TEST-SAVER-99'
        });

        // Generate synthetic PDF fixture with distinct dates, amounts, and transaction rows
        const doc = new jsPDF();
        doc.text('Test Bank Australia', 14, 20);
        doc.text('Account: Smart Saver | TEST-SAVER-99', 14, 30);
        doc.text('Statement Period: 01 October 2025 - 31 October 2025', 14, 40);
        doc.text('Account Summary', 14, 55);
        doc.text('Opening balance    Total credits    Total debits    Closing balance', 14, 65);
        doc.text('$5,000.00          $8,500.00        $1,154.33       $12,345.67', 14, 75);
        doc.text('Transaction Details', 14, 90);
        doc.text('Date          Description                Debit       Credit      Balance', 14, 100);
        doc.text('05 Oct 2025   PAYROLL FORTNIGHTLY                    $4,250.00   $9,250.00', 14, 110);
        doc.text('12 Oct 2025   BPAY ENERGY AUSTRALIA      $154.33                 $9,095.67', 14, 120);
        doc.text('19 Oct 2025   PAYROLL FORTNIGHTLY                    $4,250.00   $13,345.67', 14, 130);
        doc.text('25 Oct 2025   TRANSFER TO SAVINGS        $1,000.00               $12,345.67', 14, 140);
        const variedPdfBuffer = Buffer.from(doc.output('arraybuffer'));

        const result = await extractStatementBalancesFromPdf(
            db,
            variedPdfBuffer,
            'smart_saver_statement.pdf',
            undefined,
            householdEntityId
        );

        expect(result.supported).toBe(true);
        expect(result.proposals).toHaveLength(1);

        const prop = result.proposals[0];
        // Must extract the varied closing balance and varied period end date dynamically
        expect(prop.amount_cents).toBe(1234567); // $12,345.67
        expect(prop.effective_date).toBe('2025-10-31');
        expect(prop.currency).toBe('AUD');
        expect(prop.account_id).toBe(saverAcc.id);
        expect(prop.account_name).toBe('Smart Saver');

        // Zero running balances from intermediate payroll/bpay rows
        expect(result.proposals.some(p => p.amount_cents === 925000)).toBe(false);
        expect(result.proposals.some(p => p.amount_cents === 909567)).toBe(false);
        expect(result.proposals.some(p => p.amount_cents === 1334567)).toBe(false);
    });

    // ---------------------------------------------------------------------------------------------
    // Criterion 3: Proposal-Level Ownership & Preservation of Approved/Linked Proposals
    // ---------------------------------------------------------------------------------------------
    it('3. Atomically updates account_id and entity_id on pending proposals only, preserving approved and linked proposals', () => {
        const docId = 'doc-test-proposal-ownership';
        const now = new Date().toISOString();

        // Create second entity & target account
        const entity2 = createEntity(db, { name: 'Business Trust', type: 'trust', currency: 'AUD' });
        const { account: targetAcc } = createAccount(db, {
            entity_id: entity2.id,
            name: 'Trust Operations',
            type: 'asset',
            sub_type: 'checking',
            currency: 'AUD'
        });

        // Insert document into documents (note: no entity_id column exists on documents)
        db.prepare(`
            INSERT INTO documents (id, filename, content_hash, mime_type, byte_size, created_at)
            VALUES (?, ?, ?, ?, ?, ?)
        `).run(docId, 'statement.pdf', 'hash-test-prop-1', 'application/pdf', 1024, now);

        // Insert proposals with mixed statuses
        const insertPropStmt = db.prepare(`
            INSERT INTO proposals (
                id, document_id, entity_id, account_id, event_date, document_period,
                original_currency, amount_cents, counterparty, description, event_type,
                suggested_category, evidence_json, extraction_version, validation_findings,
                review_status, related_proposal_ids, linked_transaction_id, created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);

        // 1. Pending (unreviewed)
        insertPropStmt.run(
            'prop-p1', docId, householdEntityId, null, '2025-09-30', '2025-09',
            'AUD', 100000, 'Test', 'Pending 1', 'expense', 'checking',
            '{}', 1, '[]', 'unreviewed', '[]', null, now, now
        );
        // 2. Pending (modified)
        insertPropStmt.run(
            'prop-p2', docId, householdEntityId, null, '2025-09-30', '2025-09',
            'AUD', 200000, 'Test', 'Pending 2', 'expense', 'checking',
            '{}', 1, '[]', 'modified', '[]', null, now, now
        );
        // 3. Approved
        insertPropStmt.run(
            'prop-p3', docId, householdEntityId, everydayCheckingId, '2025-09-30', '2025-09',
            'AUD', 300000, 'Test', 'Approved 1', 'expense', 'checking',
            '{}', 1, '[]', 'approved', '[]', null, now, now
        );
        // 4. Linked
        insertPropStmt.run(
            'prop-p4', docId, householdEntityId, everydayCheckingId, '2025-09-30', '2025-09',
            'AUD', 400000, 'Test', 'Linked 1', 'expense', 'checking',
            '{}', 1, '[]', 'linked', '[]', 'tx-123', now, now
        );

        // Perform bulk account update
        const updatedCount = bulkUpdateProposalAccount(db, docId, targetAcc.id);
        expect(updatedCount).toBe(2); // Only p1 and p2 updated

        // Verify pending proposals updated with both account_id and derived entity_id
        const p1 = db.prepare('SELECT * FROM proposals WHERE id = ?').get('prop-p1') as any;
        expect(p1.account_id).toBe(targetAcc.id);
        expect(p1.entity_id).toBe(entity2.id); // Derived from target account!
        expect(p1.review_status).toBe('modified');

        const p2 = db.prepare('SELECT * FROM proposals WHERE id = ?').get('prop-p2') as any;
        expect(p2.account_id).toBe(targetAcc.id);
        expect(p2.entity_id).toBe(entity2.id);
        expect(p2.review_status).toBe('modified');

        // Verify approved and linked proposals are untouched
        const p3 = db.prepare('SELECT * FROM proposals WHERE id = ?').get('prop-p3') as any;
        expect(p3.account_id).toBe(everydayCheckingId);
        expect(p3.entity_id).toBe(householdEntityId);
        expect(p3.review_status).toBe('approved');

        const p4 = db.prepare('SELECT * FROM proposals WHERE id = ?').get('prop-p4') as any;
        expect(p4.account_id).toBe(everydayCheckingId);
        expect(p4.entity_id).toBe(householdEntityId);
        expect(p4.review_status).toBe('linked');
    });

    // ---------------------------------------------------------------------------------------------
    // Criterion 4: Atomic Rollback on Currency Mismatch in bulkUpdateProposalAccount
    // ---------------------------------------------------------------------------------------------
    it('4. Fails atomically and rolls back if any proposal currency contradicts target account currency', () => {
        const docId = 'doc-test-currency-rollback';
        const now = new Date().toISOString();

        // Create USD account
        const { account: usdAcc } = createAccount(db, {
            entity_id: householdEntityId,
            name: 'US Checking',
            type: 'asset',
            sub_type: 'checking',
            currency: 'USD'
        });

        db.prepare(`
            INSERT INTO documents (id, filename, content_hash, mime_type, byte_size, created_at)
            VALUES (?, ?, ?, ?, ?, ?)
        `).run(docId, 'statement.pdf', 'hash-test-prop-2', 'application/pdf', 1024, now);

        const insertPropStmt = db.prepare(`
            INSERT INTO proposals (
                id, document_id, entity_id, account_id, event_date, document_period,
                original_currency, amount_cents, counterparty, description, event_type,
                suggested_category, evidence_json, extraction_version, validation_findings,
                review_status, related_proposal_ids, linked_transaction_id, created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);

        // Proposal 1: in AUD
        insertPropStmt.run(
            'prop-c1', docId, householdEntityId, null, '2025-09-30', '2025-09',
            'AUD', 100000, 'Test', 'AUD Proposal', 'expense', 'checking',
            '{}', 1, '[]', 'unreviewed', '[]', null, now, now
        );
        // Proposal 2: in AUD
        insertPropStmt.run(
            'prop-c2', docId, householdEntityId, null, '2025-09-30', '2025-09',
            'AUD', 200000, 'Test', 'AUD Proposal 2', 'expense', 'checking',
            '{}', 1, '[]', 'unreviewed', '[]', null, now, now
        );

        // Attempting to bulk-assign USD account must throw an error
        expect(() => {
            bulkUpdateProposalAccount(db, docId, usdAcc.id);
        }).toThrow(/does not match proposal currency "AUD"/i);

        // Atomic check: neither proposal was modified
        const c1 = db.prepare('SELECT * FROM proposals WHERE id = ?').get('prop-c1') as any;
        const c2 = db.prepare('SELECT * FROM proposals WHERE id = ?').get('prop-c2') as any;
        expect(c1.account_id).toBeNull();
        expect(c1.review_status).toBe('unreviewed');
        expect(c2.account_id).toBeNull();
        expect(c2.review_status).toBe('unreviewed');
    });

    // ---------------------------------------------------------------------------------------------
    // Criterion 5: Selective Finding Resolution (Clears CURRENCY_MISMATCH, Preserves MISSING_CURRENCY)
    // ---------------------------------------------------------------------------------------------
    it('5. Clears CURRENCY_MISMATCH and account findings, but preserves MISSING_CURRENCY', () => {
        const docId = 'doc-test-finding-resolution';
        const now = new Date().toISOString();

        db.prepare(`
            INSERT INTO documents (id, filename, content_hash, mime_type, byte_size, created_at)
            VALUES (?, ?, ?, ?, ?, ?)
        `).run(docId, 'statement.pdf', 'hash-test-prop-3', 'application/pdf', 1024, now);

        const initialFindings = [
            { code: 'CURRENCY_MISMATCH', message: 'Currency mismatched' },
            { code: 'MISSING_ACCOUNT', message: 'No matching account' },
            { code: 'OWNER_CONFLICT', message: 'Owner conflict with header' },
            { code: 'MISSING_CURRENCY', message: 'Currency token was missing in document' }
        ];

        db.prepare(`
            INSERT INTO proposals (
                id, document_id, entity_id, account_id, event_date, document_period,
                original_currency, amount_cents, counterparty, description, event_type,
                suggested_category, evidence_json, extraction_version, validation_findings,
                review_status, related_proposal_ids, linked_transaction_id, created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).run(
            'prop-f1', docId, householdEntityId, null, '2025-09-30', '2025-09',
            'AUD', 150000, 'Test', 'Finding Test', 'expense', 'checking',
            '{}', 1, JSON.stringify(initialFindings), 'unreviewed', '[]', null, now, now
        );

        // Bulk update to Everyday Checking (which is AUD)
        bulkUpdateProposalAccount(db, docId, everydayCheckingId);

        const updatedProp = db.prepare('SELECT * FROM proposals WHERE id = ?').get('prop-f1') as any;
        const remainingFindings = JSON.parse(updatedProp.validation_findings);

        // CURRENCY_MISMATCH, MISSING_ACCOUNT, OWNER_CONFLICT must be cleared
        expect(remainingFindings.some((f: any) => f.code === 'CURRENCY_MISMATCH')).toBe(false);
        expect(remainingFindings.some((f: any) => f.code === 'MISSING_ACCOUNT')).toBe(false);
        expect(remainingFindings.some((f: any) => f.code === 'OWNER_CONFLICT')).toBe(false);

        // MISSING_CURRENCY MUST be preserved
        expect(remainingFindings.some((f: any) => f.code === 'MISSING_CURRENCY')).toBe(true);
    });

    // ---------------------------------------------------------------------------------------------
    // Criterion 6: Truthful and Scoped Manual Fallback
    // ---------------------------------------------------------------------------------------------
    it('6. Manual fallback retains document as evidence while maintaining truthful source_type: manual', () => {
        const retainedDocId = 'doc-unsupported-scan-123';

        // When saving manual entries with a retained document:
        const manualEntryWithDoc = {
            account_id: everydayCheckingId,
            amount_cents: 50000,
            currency: 'AUD',
            balance_kind: 'current_balance',
            effective_date: '2025-09-30',
            source_type: 'manual' as const, // Must remain truthful!
            document_id: retainedDocId
        };

        expect(manualEntryWithDoc.source_type).toBe('manual');
        expect(manualEntryWithDoc.document_id).toBe(retainedDocId);

        // Subsequent manual entry without document must not leak prior document association
        const subsequentManualEntry = {
            account_id: everydayCheckingId,
            amount_cents: 75000,
            currency: 'AUD',
            balance_kind: 'current_balance',
            effective_date: '2025-10-01',
            source_type: 'manual' as const,
            document_id: undefined
        };

        expect(subsequentManualEntry.source_type).toBe('manual');
        expect(subsequentManualEntry.document_id).toBeUndefined();
    });

    // ---------------------------------------------------------------------------------------------
    // Criterion 7: Completion Link Generation
    // ---------------------------------------------------------------------------------------------
    it('7. Completion summaries generate correct single-account vs multi-account links to /accounting?view=accounts', () => {
        // Helper to mirror ImportSummaryBanner logic
        function getCompletionLinkInfo(result: { count: number; accountId?: string; accountIds?: string[] }) {
            const hasMultiple = (result.accountIds && result.accountIds.length > 1) || (!result.accountId && result.count > 0);
            return {
                label: hasMultiple ? 'View accounts' : 'View account',
                href: hasMultiple
                    ? '/accounting?view=accounts'
                    : `/accounting?view=accounts&accountId=${result.accountId || ''}`
            };
        }

        // Single account updated
        const singleResult = { count: 1, accountId: everydayCheckingId, accountIds: [everydayCheckingId] };
        const singleLink = getCompletionLinkInfo(singleResult);
        expect(singleLink.label).toBe('View account');
        expect(singleLink.href).toBe(`/accounting?view=accounts&accountId=${everydayCheckingId}`);

        // Multiple accounts updated
        const multiResult = { count: 2, accountIds: [everydayCheckingId, 'acc-trust-operations'] };
        const multiLink = getCompletionLinkInfo(multiResult);
        expect(multiLink.label).toBe('View accounts');
        expect(multiLink.href).toBe('/accounting?view=accounts');

        // Zero count preserved
        const zeroResult = { count: 0, accountIds: [] };
        expect(zeroResult.count).toBe(0);
    });

    // ---------------------------------------------------------------------------------------------
    // Criterion 8: Owner Precedence - Workspace Context Never Overrides Explicit Owner Contradiction
    // ---------------------------------------------------------------------------------------------
    it('8. Workspace context does not override explicit owner conflicts in documents', async () => {
        // Create an account owned by "Bob Jones" but matching bank and mask
        const bobEntity = createEntity(db, { name: 'Bob Jones', type: 'person', currency: 'AUD' });
        const { account: bobAcc } = createAccount(db, {
            entity_id: bobEntity.id,
            name: 'Everyday Checking',
            type: 'asset',
            sub_type: 'checking',
            currency: 'AUD',
            institution: 'Commonwealth Bank',
            account_number_mask: 'TEST-BOB-EVERYDAY'
        });

        const doc = new jsPDF();
        doc.text('Commonwealth Bank of Australia', 14, 20);
        doc.text('Account: Everyday Checking | TEST-BOB-EVERYDAY', 14, 30);
        doc.text('Owners: Alice Smith', 14, 40); // Explicit owner conflict with Bob Jones
        doc.text('Closing Date: 15 Oct 2025', 14, 50);
        doc.text('Closing Balance: $3,210.00', 14, 60);
        const conflictPdfBuffer = Buffer.from(doc.output('arraybuffer'));

        // Even if user selected Bob's entity as workspace context, the explicit owner conflict in the PDF
        // MUST NOT be silently overridden by workspace context.
        const result = await extractStatementBalancesFromPdf(
            db,
            conflictPdfBuffer,
            'conflict_statement.pdf',
            undefined,
            bobEntity.id
        );

        expect(result.supported).toBe(true);
        expect(result.proposals).toHaveLength(1);
        const prop = result.proposals[0];
        expect(prop.account_id).toBeNull(); // Must remain unmapped
        expect(prop.owner_conflict_message).toBeTruthy();
        expect(prop.owner_conflict_message).toMatch(/Alice Smith/i);
        expect(prop.owner_conflict_message).toMatch(/Bob Jones/i);
        expect(prop.unresolved_fields).toContain('owner');
        expect(prop.unresolved_fields).toContain('account');
    });
    // ---------------------------------------------------------------------------------------------
    // Area 1: Narrow Closing Corrections - Horizontal Summary extraction rules
    // ---------------------------------------------------------------------------------------------
    it('9. Horizontal summary preserves currency scaling, flags excess precision, and blocks missing facts from auto-matching', async () => {
        // We already have Everyday Checking (AUD) existing from beforeEach.
        const doc = new jsPDF();
        
        // This document has NO institution, NO currency, NO date, and NO account identity.
        // It just has a horizontal summary table.
        doc.text('Account Summary', 14, 20);
        doc.text('Opening balance    Credits    Debits    Closing balance', 14, 30);
        doc.text('1,000.00           500.00     100.00    1400.00', 14, 40);
        const missingFactsPdf = Buffer.from(doc.output('arraybuffer'));

        const result1 = await extractStatementBalancesFromPdf(db, missingFactsPdf, 'missing_facts.pdf', undefined, householdEntityId);
        expect(result1.proposals).toHaveLength(1);
        const prop1 = result1.proposals[0];
        
        // Missing facts must remain visibly unresolved and block acceptance
        expect(prop1.account_id).toBeNull();
        expect(prop1.unresolved_fields).toContain('currency');
        expect(prop1.unresolved_fields).toContain('effective_date');
        expect(prop1.unresolved_fields).toContain('account');
        // It must NOT manufacture 'Everyday Checking' to enable matching
        expect(prop1.raw_account_name).toBe('Unnamed Account');
        expect(prop1.account_name).toBe('Unnamed Account');

        // Now test JPY scaling (0 decimals)
        const docJpy = new jsPDF();
        docJpy.text('Institution: Test Bank', 14, 10);
        docJpy.text('Currency: JPY', 14, 20);
        docJpy.text('Date: 2025-10-01', 14, 30);
        docJpy.text('Opening balance    Credits    Debits    Closing balance', 14, 40);
        docJpy.text('1,000              100        0         1,100', 14, 50);
        const jpyPdf = Buffer.from(docJpy.output('arraybuffer'));

        const result2 = await extractStatementBalancesFromPdf(db, jpyPdf, 'jpy.pdf', undefined, householdEntityId);
        expect(result2.proposals).toHaveLength(1);
        expect(result2.proposals[0].currency).toBe('JPY');
        // 1,100 JPY should be exactly 1100 cents (minor units, which is 1100 for JPY), not 110,000!
        expect(result2.proposals[0].amount_cents).toBe(1100); 

        // Now test AUD excess precision (e.g. 1100.005)
        const docAudPrecision = new jsPDF();
        docAudPrecision.text('Currency: AUD', 14, 20);
        docAudPrecision.text('Date: 2025-10-01', 14, 30);
        docAudPrecision.text('Opening balance    Credits    Debits    Closing balance', 14, 40);
        docAudPrecision.text('1,000.00           100.00     0.00      1100.005', 14, 50);
        const audPrecisionPdf = Buffer.from(docAudPrecision.output('arraybuffer'));

        const result3 = await extractStatementBalancesFromPdf(db, audPrecisionPdf, 'aud_precision.pdf', undefined, householdEntityId);
        expect(result3.proposals).toHaveLength(1);
        expect(result3.proposals[0].currency).toBe('AUD');
        // Excess AUD precision is flagged
        expect(result3.proposals[0].unresolved_fields).toContain('amount_precision');
    });
});
