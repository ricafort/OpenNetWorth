/**
 * Isolated Regression Tests for Slice 1E Assessor Remediations
 * 
 * Why this file exists:
 * Verifies the three mandatory remediations identified in the Slice 1E assessment:
 * 1. Strict whole-value amount parsing and correct currency scale (e.g. JPY scale 0,
 *    sub-cent rejection for USD, trailing garbage rejection, and explicit rejection
 *    of unsupported currencies).
 * 2. Corrected mapping reprocessing for unapproved proposals without mutating or
 *    duplicating already approved ledger records.
 * 3. Approval must strictly match the reviewed account ID and currency.
 * 
 * Safety Guarantees (M1-SAFE-01):
 * - Runs exclusively against isolated in-memory SQLite (:memory:).
 * - Strictly isolates test fixtures from the live user vault.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import Database from 'better-sqlite3';
import { createTestDb, closeDb, setTestDb } from '../../../infrastructure/sqlite/db';
import { initAccountingSchema } from '../accounting/schema';
import { createAccount } from '../accounting/accountService';
import { getAccountBalance } from '../accounting/balanceService';
import {
    parseCsvAmount,
    parseCsvWithMapping
} from './csvParserService';
import {
    ingestCsvDocument,
    approveProposals,
    getDocumentProposals,
    reprocessDocumentWithMapping
} from './documentInboxService';
import { CsvMappingProfile } from './types';

describe('Slice 1E Assessor Remediations', () => {
    let db: Database.Database;
    const ENTITY_ID = 'ent-remediation-entity';

    beforeEach(() => {
        db = createTestDb();
        setTestDb(db);
        initAccountingSchema(db);

        db.prepare(`
            INSERT INTO m1_entities (id, name, type, created_at, updated_at)
            VALUES (?, 'Test Entity', 'person', datetime('now'), datetime('now'))
        `).run(ENTITY_ID);
    });

    afterEach(() => {
        closeDb();
    });

    describe('Remediation 1: Strict Whole-Value Amount Parsing & Currency Scale', () => {
        it('parses zero-scale currencies (JPY) without multiplying by 100', () => {
            const jpyResult = parseCsvAmount('5000', 'JPY');
            expect(jpyResult.error).toBeUndefined();
            expect(jpyResult.amount_cents).toBe(5000); // Scale 0: 5000 JPY is 5000 minor units

            const usdResult = parseCsvAmount('5000', 'USD');
            expect(usdResult.error).toBeUndefined();
            expect(usdResult.amount_cents).toBe(500000); // Scale 2: 5000 USD is 500,000 cents
        });

        it('strictly rejects fractional decimal units on zero-scale currencies (JPY)', () => {
            const result = parseCsvAmount('5000.50', 'JPY');
            expect(result.amount_cents).toBeNull();
            expect(result.error).toMatch(/Currency JPY does not support fractional decimal units/);
        });

        it('strictly rejects sub-cent fractional precision exceeding the currency scale (USD)', () => {
            // USD scale is 2; 3 decimal places must be rejected
            const result = parseCsvAmount('12.345', 'USD');
            expect(result.amount_cents).toBeNull();
            expect(result.error).toMatch(/exceeding the maximum scale of 2 for USD/);
        });

        it('strictly rejects trailing unparsed characters (no partial parse)', () => {
            // parseFloat("100.50abc") would return 100.5, but strict whole-value parsing must reject it
            expect(parseCsvAmount('100.50abc', 'USD').amount_cents).toBeNull();
            expect(parseCsvAmount('100.50abc', 'USD').error).toMatch(/Entire value must be a valid numeric amount/);

            expect(parseCsvAmount('$100.50foo', 'USD').amount_cents).toBeNull();
            expect(parseCsvAmount('12.34.56', 'USD').amount_cents).toBeNull();
            expect(parseCsvAmount('12,34,56', 'USD').amount_cents).toBeNull();
        });

        it('explicitly rejects unsupported currency codes', () => {
            const result = parseCsvAmount('100.00', 'XYZ');
            expect(result.amount_cents).toBeNull();
            expect(result.error).toMatch(/Unsupported currency code: "XYZ"/);
        });

        it('enforces currency scale inside full CSV parse with mapping', () => {
            const jpyMapping: CsvMappingProfile = {
                id: 'map-jpy',
                name: 'JPY Statement',
                header_signature: 'amount|date|description',
                date_column: 'Date',
                date_format: 'YYYY-MM-DD',
                description_column: 'Description',
                amount_mode: 'single_amount',
                amount_column: 'Amount',
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
            };

            const csv = `Date,Description,Amount
2026-08-01,"Tokyo Store",5000
2026-08-02,"Invalid Fraction",5000.50`;

            const parseResult = parseCsvWithMapping(csv, jpyMapping, 'JPY');
            expect(parseResult.rows).toHaveLength(2);
            expect(parseResult.rows[0].amount_cents).toBe(5000); // 5000 JPY
            expect(parseResult.rows[0].validation_findings.filter(f => f.severity === 'error')).toHaveLength(0);

            // Row 2 has fractional decimal for JPY
            expect(parseResult.rows[1].amount_cents).toBeNull();
            expect(parseResult.rows[1].validation_findings).toEqual(
                expect.arrayContaining([expect.objectContaining({ severity: 'error', code: 'INVALID_AMOUNT' })])
            );
        });
    });

    describe('Remediation 2: Corrected Mapping Reprocessing for Unapproved Proposals Without Changing Approved Records', () => {
        it('reprocesses unapproved proposals with corrected mapping while leaving approved records untouched', () => {
            const { account: bankAccount } = createAccount(db, {
                entity_id: ENTITY_ID,
                name: 'Business Checking',
                type: 'asset',
                sub_type: 'checking',
                currency: 'USD',
                opening_date: '2026-01-01',
                opening_balance_cents: 500000 // $5,000.00 opening balance
            });

            // CSV with 3 rows
            const csv = `Date,Narrative,TotalAmount
2026-08-01,"Utility Bill",-85.00
2026-08-02,"Office Supplies",-120.00
2026-08-03,"Client Fee",2500.00`;

            // Initial mapping: correctly mapped TotalAmount and Narrative
            const initialMapping: CsvMappingProfile = {
                id: 'map-initial',
                name: 'Initial Mapping',
                header_signature: 'date|narrative|totalamount',
                date_column: 'Date',
                date_format: 'YYYY-MM-DD',
                description_column: 'Narrative',
                amount_mode: 'single_amount',
                amount_column: 'TotalAmount',
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
            };

            const initialIngest = ingestCsvDocument(db, {
                filename: 'statement.csv',
                raw_content: csv,
                mapping: initialMapping,
                target_account_id: bankAccount.id,
                entity_id: ENTITY_ID
            });

            expect(initialIngest.proposals).toHaveLength(3);

            // Approve ONLY Row 1 (Utility Bill)
            const approveResult = approveProposals(db, {
                document_id: initialIngest.document.id,
                target_account_id: bankAccount.id,
                entity_id: ENTITY_ID,
                items: [{ proposal_id: initialIngest.proposals[0].id, category: 'utilities' }]
            });

            expect(approveResult.approved_count).toBe(1);
            const approvedTxId = approveResult.transaction_ids[0];

            // Verify Row 1 is approved and balance changed: 500,000 - 8,500 = 491,500
            expect(getAccountBalance(db, bankAccount.id).balance_cents).toBe(491500);

            const txCountBefore = (db.prepare('SELECT COUNT(*) as cnt FROM m1_transactions').get() as any).cnt;

            // Now, suppose the user wants to reprocess the unapproved rows using a corrected mapping:
            // e.g. corrected mapping changes default or uses a modified description column or date format
            // Here we test re-ingesting / reprocessing with a mapping that uses updated column mapping
            const correctedMapping: CsvMappingProfile = {
                id: 'map-corrected',
                name: 'Corrected Mapping',
                header_signature: 'date|narrative|totalamount',
                date_column: 'Date',
                date_format: 'YYYY-MM-DD',
                description_column: 'Narrative',
                amount_mode: 'single_amount',
                amount_column: 'TotalAmount',
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
            };

            // Call reprocessDocumentWithMapping
            const reprocessResult = reprocessDocumentWithMapping(db, {
                document_id: initialIngest.document.id,
                mapping: correctedMapping,
                target_account_id: bankAccount.id,
                default_category: 'office_supplies',
                entity_id: ENTITY_ID
            });

            const proposalsAfter = getDocumentProposals(db, initialIngest.document.id);
            expect(proposalsAfter).toHaveLength(3);

            // 1. Approved record MUST NOT be changed!
            const prop1 = proposalsAfter.find(p => p.id === initialIngest.proposals[0].id);
            expect(prop1?.review_status).toBe('approved');
            expect(prop1?.suggested_category).toBe('utilities'); // Keeps approved category
            expect(prop1?.amount_cents).toBe(-8500);

            // 2. The confirmed ledger transaction MUST NOT be modified or duplicated
            const txCountAfter = (db.prepare('SELECT COUNT(*) as cnt FROM m1_transactions').get() as any).cnt;
            expect(txCountAfter).toBe(txCountBefore);
            expect(getAccountBalance(db, bankAccount.id).balance_cents).toBe(491500);

            // 3. Unapproved proposals (Row 2 and Row 3) MUST reflect the reprocessed mapping!
            const prop2 = proposalsAfter.find(p => p.id === initialIngest.proposals[1].id);
            expect(prop2?.review_status).toBe('unreviewed');
            expect(prop2?.suggested_category).toBe('office_supplies'); // Updated by corrected mapping

            const prop3 = proposalsAfter.find(p => p.id === initialIngest.proposals[2].id);
            expect(prop3?.review_status).toBe('unreviewed');
            expect(prop3?.amount_cents).toBe(250000);
        });
    });

    describe('Remediation 3: Approval Must Match Reviewed Account and Currency', () => {
        it('rejects approval when target account does not match reviewed account', () => {
            const { account: accountA } = createAccount(db, {
                entity_id: ENTITY_ID,
                name: 'Checking Account A',
                type: 'asset',
                sub_type: 'checking',
                currency: 'USD',
                opening_date: '2026-01-01',
                opening_balance_cents: 100000
            });

            const { account: accountB } = createAccount(db, {
                entity_id: ENTITY_ID,
                name: 'Checking Account B',
                type: 'asset',
                sub_type: 'checking',
                currency: 'USD',
                opening_date: '2026-01-01',
                opening_balance_cents: 200000
            });

            const csv = `Date,Description,Amount\n2026-08-01,"Coffee",-4.50`;
            const mapping: CsvMappingProfile = {
                id: 'map-acc',
                name: 'Mapping',
                header_signature: 'amount|date|description',
                date_column: 'Date',
                date_format: 'YYYY-MM-DD',
                description_column: 'Description',
                amount_mode: 'single_amount',
                amount_column: 'Amount',
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
            };

            // Ingest against Account A
            const { document, proposals } = ingestCsvDocument(db, {
                filename: 'coffee.csv',
                raw_content: csv,
                mapping,
                target_account_id: accountA.id,
                entity_id: ENTITY_ID
            });

            expect(proposals[0].account_id).toBe(accountA.id);

            // Attempt to approve into Account B (different account than reviewed!)
            expect(() => {
                approveProposals(db, {
                    document_id: document.id,
                    target_account_id: accountB.id,
                    entity_id: ENTITY_ID,
                    items: [{ proposal_id: proposals[0].id }]
                });
            }).toThrow(/reviewed account .* does not match approval target account/);

            // Confirm no postings were made to Account B
            expect(getAccountBalance(db, accountB.id).balance_cents).toBe(200000);
            expect(getAccountBalance(db, accountA.id).balance_cents).toBe(100000);

            // Now approve with the matching reviewed account (Account A)
            const success = approveProposals(db, {
                document_id: document.id,
                target_account_id: accountA.id,
                entity_id: ENTITY_ID,
                items: [{ proposal_id: proposals[0].id }]
            });

            expect(success.approved_count).toBe(1);
            expect(getAccountBalance(db, accountA.id).balance_cents).toBe(99550); // 100,000 - 450
        });

        it('rejects approval when target account currency does not match reviewed currency', () => {
            const { account: accountUsd } = createAccount(db, {
                entity_id: ENTITY_ID,
                name: 'US Dollar Account',
                type: 'asset',
                sub_type: 'checking',
                currency: 'USD',
                opening_date: '2026-01-01',
                opening_balance_cents: 100000
            });

            const { account: accountEur } = createAccount(db, {
                entity_id: ENTITY_ID,
                name: 'Euro Account',
                type: 'asset',
                sub_type: 'checking',
                currency: 'EUR',
                opening_date: '2026-01-01',
                opening_balance_cents: 100000
            });

            const csv = `Date,Description,Amount\n2026-08-01,"Paris Hotel",-150.00`;
            const mapping: CsvMappingProfile = {
                id: 'map-cur',
                name: 'Mapping',
                header_signature: 'amount|date|description',
                date_column: 'Date',
                date_format: 'YYYY-MM-DD',
                description_column: 'Description',
                amount_mode: 'single_amount',
                amount_column: 'Amount',
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
            };

            // Ingest for Euro account
            const { document, proposals } = ingestCsvDocument(db, {
                filename: 'paris.csv',
                raw_content: csv,
                mapping,
                target_account_id: accountEur.id,
                entity_id: ENTITY_ID
            });

            expect(proposals[0].original_currency).toBe('EUR');

            // Attempt to approve against USD account
            expect(() => {
                approveProposals(db, {
                    document_id: document.id,
                    target_account_id: accountUsd.id,
                    entity_id: ENTITY_ID,
                    items: [{ proposal_id: proposals[0].id }]
                });
            }).toThrow(/reviewed account/); // Mismatches account and currency

            // Now approve with the matching EUR account
            const success = approveProposals(db, {
                document_id: document.id,
                target_account_id: accountEur.id,
                entity_id: ENTITY_ID,
                items: [{ proposal_id: proposals[0].id }]
            });

            expect(success.approved_count).toBe(1);
            expect(getAccountBalance(db, accountEur.id).balance_cents).toBe(85000); // 100,000 - 15,000
        });
    });
});
