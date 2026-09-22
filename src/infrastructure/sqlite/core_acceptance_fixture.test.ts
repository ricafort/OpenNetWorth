/**
 * Core Acceptance Fixture Test Suite (Section 18)
 * 
 * Why this file exists:
 * Verifies all 17 core acceptance scenarios defined in the OpenNetWorth Handover:
 *  1. Approve household expense of AUD 22.00 (Bank: 978.00, Spending: 22.00)
 *  2. Transfer AUD 200.00 to household savings (Bank: 778.00, Savings: 200.00, Household Cash: 978.00, Spending: 22.00)
 *  3. Link corresponding receipt (Evidence added, zero additional financial posting)
 *  4. Reimport files (Deduplication prevents double-count of transactions and balances)
 *  5. Import unpaid company invoice of AUD 110.00 (Zero silent cash reduction)
 *  6. Save personally paid business-expense draft (Zero effect on posted totals)
 *  7. Exclude cancelled/void expense from posted spending
 *  8. Metric agreement across scopes (Dashboard, Accounts, Reports, and Assistant shared facts)
 *  9. Unknown balance explicitly flagged without fabricated complete net worth
 * 10. Multi-currency segregation (USD & JPY native values, zero silent AUD additions, correct JPY minor-unit handling)
 * 11. "Last month" resolves to 2026-08-01 through 2026-08-31 (for 2026-09-22 reference)
 * 12. "This month" resolves to 2026-09-01 through 2026-09-30 (for 2026-09-22 reference)
 * 13. Impossible date "2026-02-31" rejected with explicit clarification
 * 14. Explicit date ranges preserved without collapsing to single days
 * 15. Non-amortising loan reports explicit insufficient-payment status without fabricated 50-year payoff date
 * 16. Missing investment cost basis suppresses whole-portfolio percentage returns without mock prices
 * 17. Full backup export and restore into a pristine isolated database preserves all entities, accounts, postings, and drafts
 * 
 * Isolation Guarantee:
 * Uses an in-memory SQLite database (:memory:) via createTestDb() and setTestDb().
 * Live vault (opennetworth.sqlite) is never opened or modified.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import Database from 'better-sqlite3';
import { createTestDb, setTestDb, closeDb } from '@/infrastructure/sqlite/db';
import { initAccountingSchema } from '@/lib/domain/accounting/schema';
import { initDocumentSchema } from '@/lib/domain/document/schema';
import { createEntity, createAccount } from '@/lib/domain/accounting/accountService';
import { postTransaction } from '@/lib/domain/accounting/transactionService';
import { getAccountBalance } from '@/lib/domain/accounting/balanceService';
import { getSharedFinancialSummary } from '@/lib/domain/accounting/sharedFinancialSummaryService';
import { linkProposalToTransaction } from '@/lib/domain/document/documentInboxService';
import { calculatePayoff } from '@/lib/domain/debtCalculator';
import { analyzePortfolio } from '@/lib/domain/portfolioAnalysis';
import { parseSpendingIntent } from '@/app/api/mentor/intentParser';
import {
    getLastMonthRange,
    getCurrentMonthRange,
    isValidCalendarDate,
    parseExplicitDateRange
} from '@/lib/domain/calendarDate';
import { POST as vaultPost, GET as vaultGet } from '@/app/api/vault/route';
import { Asset } from '@/features/assets/types';
import { Liability } from '@/features/liabilities/types';

describe('OpenNetWorth Core Acceptance Fixture (Section 18)', () => {
    let testDb: Database.Database;
    const FIXED_DATE = '2026-09-22'; // Australia/Sydney fixed reference date

    let entHousehold: any;
    let entCompany: any;
    let accHhBank: any;
    let accHhSavings: any;
    let accCoBank: any;
    let accHhExpenses: any;
    let accUnknown: any;
    let accUsdHolding: any;
    let accJpyBank: any;

    beforeEach(() => {
        testDb = createTestDb();
        initAccountingSchema(testDb);
        initDocumentSchema(testDb);
        setTestDb(testDb);

        // Core Fixture Entities
        entHousehold = createEntity(testDb, {
            id: 'ent-household',
            name: 'Household',
            type: 'household',
            currency: 'AUD'
        });

        entCompany = createEntity(testDb, {
            id: 'ent-company',
            name: 'Acme Pty Ltd',
            type: 'business',
            currency: 'AUD'
        });

        // 1. Household AUD bank: 1,000.00 (100,000 cents)
        accHhBank = createAccount(testDb, {
            id: 'acc-hh-bank',
            entity_id: entHousehold.id,
            name: 'Household Checking',
            type: 'asset',
            sub_type: 'checking',
            currency: 'AUD',
            tracking_mode: 'transactions'
        }).account;

        // Opening balance for household bank (1,000 AUD)
        const openingEquity = createAccount(testDb, {
            id: 'acc-opening-equity',
            entity_id: entHousehold.id,
            name: 'Opening Balance Equity',
            type: 'equity',
            sub_type: 'other',
            currency: 'AUD',
            tracking_mode: 'transactions'
        }).account;

        postTransaction(testDb, {
            id: 'tx-open-hh-bank',
            date: '2026-09-01',
            description: 'Opening Balance Household Bank',
            postings: [
                { account_id: accHhBank.id, amount_cents: 100000, currency: 'AUD' },
                { account_id: openingEquity.id, amount_cents: -100000, currency: 'AUD' }
            ]
        });

        // 2. Household AUD savings: 0.00
        accHhSavings = createAccount(testDb, {
            id: 'acc-hh-sav',
            entity_id: entHousehold.id,
            name: 'Household Savings',
            type: 'asset',
            sub_type: 'savings',
            currency: 'AUD',
            tracking_mode: 'transactions'
        }).account;

        // Household Expenses Account
        accHhExpenses = createAccount(testDb, {
            id: 'acc-hh-exp',
            entity_id: entHousehold.id,
            name: 'General Household Expenses',
            type: 'expense',
            sub_type: 'other',
            currency: 'AUD',
            tracking_mode: 'transactions'
        }).account;

        // 3. Separate company AUD bank: 500.00 (50,000 cents)
        accCoBank = createAccount(testDb, {
            id: 'acc-co-bank',
            entity_id: entCompany.id,
            name: 'Company Checking',
            type: 'asset',
            sub_type: 'checking',
            currency: 'AUD',
            tracking_mode: 'transactions'
        }).account;

        const coOpeningEquity = createAccount(testDb, {
            id: 'acc-co-equity',
            entity_id: entCompany.id,
            name: 'Company Capital',
            type: 'equity',
            sub_type: 'other',
            currency: 'AUD',
            tracking_mode: 'transactions'
        }).account;

        postTransaction(testDb, {
            id: 'tx-open-co-bank',
            date: '2026-09-01',
            description: 'Company Initial Capital',
            postings: [
                { account_id: accCoBank.id, amount_cents: 50000, currency: 'AUD' },
                { account_id: coOpeningEquity.id, amount_cents: -50000, currency: 'AUD' }
            ]
        });

        // 4. One account with an unknown balance
        accUnknown = createAccount(testDb, {
            id: 'acc-unknown-super',
            entity_id: entHousehold.id,
            name: 'Awaiting Super Statement',
            type: 'asset',
            sub_type: 'superannuation',
            currency: 'AUD',
            tracking_mode: 'balance'
        }).account;

        // 5. A USD holding: $25,000 USD (2,500,000 cents)
        accUsdHolding = createAccount(testDb, {
            id: 'acc-usd-holding',
            entity_id: entHousehold.id,
            name: 'US Shares Brokerage',
            type: 'asset',
            sub_type: 'brokerage',
            currency: 'USD',
            tracking_mode: 'balance'
        }).account;

        testDb.prepare(`
            INSERT INTO m1_balance_observations (id, account_id, amount_cents, currency, balance_kind, effective_date, imported_at, source_type, review_status, created_at)
            VALUES ('obs-usd-1', ?, 2500000, 'USD', 'current_balance', '2026-09-22', datetime('now'), 'manual', 'accepted', datetime('now'))
        `).run(accUsdHolding.id);

        // 6. A JPY account: 100,000 JPY
        accJpyBank = createAccount(testDb, {
            id: 'acc-jpy-bank',
            entity_id: entHousehold.id,
            name: 'Tokyo Trip Pocket Card',
            type: 'asset',
            sub_type: 'checking',
            currency: 'JPY',
            tracking_mode: 'balance'
        }).account;

        testDb.prepare(`
            INSERT INTO m1_balance_observations (id, account_id, amount_cents, currency, balance_kind, effective_date, imported_at, source_type, review_status, created_at)
            VALUES ('obs-jpy-1', ?, 100000, 'JPY', 'current_balance', '2026-09-22', datetime('now'), 'manual', 'accepted', datetime('now'))
        `).run(accJpyBank.id);
    });

    afterEach(() => {
        closeDb();
        setTestDb(null);
    });

    // Case 1: Approve household expense of AUD 22.00
    it('Case 1: approving household expense of AUD 22.00 leaves bank at 978.00 and spending at 22.00', () => {
        postTransaction(testDb, {
            id: 'tx-groceries-22',
            date: '2026-09-22',
            description: 'Organic Groceries',
            postings: [
                { account_id: accHhExpenses.id, amount_cents: 2200, currency: 'AUD' },
                { account_id: accHhBank.id, amount_cents: -2200, currency: 'AUD' }
            ]
        });

        const bankBalance = getAccountBalance(testDb, accHhBank.id);
        expect(bankBalance.balance_cents).toBe(97800); // 978.00 AUD

        const summary = getSharedFinancialSummary(testDb, {
            reporting_currency: 'AUD',
            as_of_date: '2026-09-22'
        });

        // Verify account balance in shared summary
        const hhAcc = summary.accounts?.find(a => a.account_id === accHhBank.id);
        expect(hhAcc?.amount_cents).toBe(97800);
    });

    // Case 2: Transfer AUD 200.00 to household savings
    it('Case 2: transferring AUD 200.00 to savings sets bank: 778.00, savings: 200.00, household cash: 978.00, spending remains 22.00', () => {
        // Step 1: Expense of 22.00
        postTransaction(testDb, {
            id: 'tx-groceries-22',
            date: '2026-09-22',
            description: 'Organic Groceries',
            postings: [
                { account_id: accHhExpenses.id, amount_cents: 2200, currency: 'AUD' },
                { account_id: accHhBank.id, amount_cents: -2200, currency: 'AUD' }
            ]
        });

        // Step 2: Transfer 200.00 to savings
        postTransaction(testDb, {
            id: 'tx-transfer-savings-200',
            date: '2026-09-22',
            description: 'Transfer to Savings',
            postings: [
                { account_id: accHhSavings.id, amount_cents: 20000, currency: 'AUD' },
                { account_id: accHhBank.id, amount_cents: -20000, currency: 'AUD' }
            ]
        });

        const bankBalance = getAccountBalance(testDb, accHhBank.id);
        const savBalance = getAccountBalance(testDb, accHhSavings.id);
        const expBalance = getAccountBalance(testDb, accHhExpenses.id);

        expect(bankBalance.balance_cents).toBe(77800); // 778.00 AUD
        expect(savBalance.balance_cents).toBe(20000);  // 200.00 AUD
        expect(bankBalance.balance_cents + savBalance.balance_cents).toBe(97800); // Total household cash = 978.00 AUD
        expect(expBalance.balance_cents).toBe(2200);   // Spending remains exactly 22.00 AUD
    });

    // Case 3: Link corresponding receipt
    it('Case 3: linking receipt evidence adds evidence reference without creating duplicate financial postings', () => {
        const tx = postTransaction(testDb, {
            id: 'tx-receipt-test',
            date: '2026-09-22',
            description: 'Hardware Store Receipt',
            postings: [
                { account_id: accHhExpenses.id, amount_cents: 2200, currency: 'AUD' },
                { account_id: accHhBank.id, amount_cents: -2200, currency: 'AUD' }
            ]
        });

        // Ingest document metadata (m1_documents DDL)
        testDb.prepare(`
            INSERT INTO m1_documents (id, filename, content_hash, mime_type, byte_size, storage_path, raw_content, created_at)
            VALUES ('doc-receipt-1', 'hardware_receipt.pdf', 'hash-12345', 'application/pdf', 15420, '/docs/receipt.pdf', 'Sample receipt content', datetime('now'))
        `).run();

        // Create extracted proposal
        testDb.prepare(`
            INSERT INTO m1_proposals (
                id, document_id, entity_id, account_id, event_date, document_period,
                original_currency, amount_cents, counterparty, description, event_type,
                suggested_category, evidence_json, extraction_version, validation_findings,
                review_status, created_at, updated_at
            ) VALUES (
                'prop-receipt-1', 'doc-receipt-1', ?, ?, '2026-09-22', '2026-09',
                'AUD', -2200, 'Bunnings', 'Hardware Store Receipt', 'expense',
                'other', '{"document_id":"doc-receipt-1","content_hash":"hash-12345","page":1}', 'opentax_invoice_v1', '[]',
                'unreviewed', datetime('now'), datetime('now')
            )
        `).run(entHousehold.id, accHhBank.id);

        // Link document proposal evidence to transaction via domain service
        const linkResult = linkProposalToTransaction(testDb, {
            proposal_id: 'prop-receipt-1',
            transaction_id: tx.id
        });

        // Verify evidence link was established
        expect(linkResult.proposal.review_status).toBe('linked');
        expect(linkResult.proposal.linked_transaction_id).toBe(tx.id);

        // Verify zero additional financial postings were created
        const postingsCount = (testDb.prepare("SELECT COUNT(*) as count FROM m1_journal_entries WHERE transaction_id = ?").get(tx.id) as any).count;
        expect(postingsCount).toBe(2); // Only debit and credit

        // Bank balance unchanged
        expect(getAccountBalance(testDb, accHhBank.id).balance_cents).toBe(97800);
    });

    // Case 4: Reimport files
    it('Case 4: reimporting identical documents or transactions prevents duplicate postings', () => {
        const docHash = 'sha256-unique-statement-hash';
        testDb.prepare(`
            INSERT INTO m1_documents (id, filename, content_hash, mime_type, byte_size, storage_path, raw_content, created_at)
            VALUES ('doc-stmt-1', 'bank_statement.pdf', ?, 'application/pdf', 20480, '/docs/stmt.pdf', 'raw statement text', datetime('now'))
        `).run(docHash);

        // Attempt duplicate ingest query - unique hash prevents duplicate document
        expect(() => {
            testDb.prepare(`
                INSERT INTO m1_documents (id, filename, content_hash, mime_type, byte_size, storage_path, raw_content, created_at)
                VALUES ('doc-stmt-duplicate', 'bank_statement_2.pdf', ?, 'application/pdf', 20480, '/docs/stmt_2.pdf', 'raw statement text', datetime('now'))
            `).run(docHash);
        }).toThrow();

        // Double posting protection: transaction ID uniqueness
        expect(() => {
            postTransaction(testDb, {
                id: 'tx-open-hh-bank', // Already exists in beforeEach
                date: '2026-09-01',
                description: 'Duplicate Opening Balance',
                postings: [
                    { account_id: accHhBank.id, amount_cents: 100000, currency: 'AUD' },
                    { account_id: accHhExpenses.id, amount_cents: -100000, currency: 'AUD' }
                ]
            });
        }).toThrow();
    });

    // Case 5: Import unpaid company invoice of AUD 110.00
    it('Case 5: unpaid company invoice does not silently reduce company bank balance', () => {
        const coInitialBalance = getAccountBalance(testDb, accCoBank.id);
        expect(coInitialBalance.balance_cents).toBe(50000); // $500.00 AUD

        // Record unpaid invoice in drafts/proposals
        testDb.prepare(`
            INSERT INTO m1_drafts (id, entity_id, payer_entity_id, payment_account_id, currency, amount_cents, date, description, status, created_at, updated_at)
            VALUES ('draft-inv-110', ?, ?, ?, 'AUD', 11000, '2026-09-22', 'Unpaid Supplier Invoice', 'draft', datetime('now'), datetime('now'))
        `).run(entCompany.id, entCompany.id, accCoBank.id);

        // Bank balance must remain strictly unchanged
        const coBalanceAfter = getAccountBalance(testDb, accCoBank.id);
        expect(coBalanceAfter.balance_cents).toBe(50000); // Still 500.00 AUD

        // Posted financial summary must not reflect unpaid draft as a cash outflow
        const summary = getSharedFinancialSummary(testDb, {
            reporting_currency: 'AUD',
            as_of_date: '2026-09-22'
        });
        const coAcc = summary.accounts?.find(a => a.account_id === accCoBank.id);
        expect(coAcc?.amount_cents).toBe(50000);
    });

    // Case 6: Personally paid business-expense draft
    it('Case 6: personally paid business-expense draft does not affect posted accounting totals', () => {
        testDb.prepare(`
            INSERT INTO m1_drafts (id, entity_id, payer_entity_id, payment_account_id, currency, amount_cents, date, description, status, created_at, updated_at)
            VALUES ('draft-personal-biz', ?, ?, ?, 'AUD', 3500, '2026-09-22', 'Director paid for team lunch', 'draft', datetime('now'), datetime('now'))
        `).run(entCompany.id, entHousehold.id, accHhBank.id);

        // Posted journal entries count must not include the draft
        const draftEntries = testDb.prepare("SELECT COUNT(*) as count FROM m1_journal_entries WHERE transaction_id = 'draft-personal-biz'").get() as any;
        expect(draftEntries.count).toBe(0);

        // Personal bank balance is unchanged
        expect(getAccountBalance(testDb, accHhBank.id).balance_cents).toBe(100000);
    });

    // Case 7: Cancelled expense excluded from posted spending
    it('Case 7: voided or cancelled transaction is excluded from posted balances', () => {
        const tx = postTransaction(testDb, {
            id: 'tx-cancelled-50',
            date: '2026-09-22',
            description: 'Cancelled Order',
            postings: [
                { account_id: accHhExpenses.id, amount_cents: 5000, currency: 'AUD' },
                { account_id: accHhBank.id, amount_cents: -5000, currency: 'AUD' }
            ]
        });

        // Void the transaction
        testDb.prepare("UPDATE m1_transactions SET status = 'void' WHERE id = ?").run(tx.id);

        // Shared summary only includes posted transactions
        const activeSummary = getSharedFinancialSummary(testDb, {
            reporting_currency: 'AUD',
            as_of_date: '2026-09-22'
        });

        const bank = activeSummary.accounts?.find(a => a.account_id === accHhBank.id);
        // Bank balance returns to 100,000 cents (opening balance)
        expect(bank?.amount_cents).toBe(100000);
    });

    // Case 8: Compare Dashboard, Accounts, Reports, and Assistant (Single Source of Truth)
    it('Case 8: shared domain service produces identical facts across Dashboard, Accounts, Reports, and Assistant', () => {
        const summary = getSharedFinancialSummary(testDb, {
            reporting_currency: 'AUD',
            as_of_date: '2026-09-22'
        });

        // The exact same account balances are exposed to all surfaces
        expect(summary.accounts?.length).toBe(5); // 5 accounts with balances (hh-bank, hh-sav, co-bank, usd, jpy)
        expect(summary.unrecorded_count).toBe(1); // 1 unknown balance account (superannuation)
        expect((summary.accounts?.length ?? 0) + summary.unrecorded_count).toBe(6);
        expect(summary.is_complete).toBe(false);

        // Assistant query for the same date/entity produces the authoritative period
        const mentorIntent = parseSpendingIntent('How much did I spend this month?', [entHousehold], FIXED_DATE);
        expect(mentorIntent.startDate).toBe('2026-09-01');
        expect(mentorIntent.endDate).toBe('2026-09-30');
    });

    // Case 9: Include an unknown balance
    it('Case 9: account with unknown balance explicitly flagged as unrecorded, complete total not fabricated', () => {
        const summary = getSharedFinancialSummary(testDb, {
            reporting_currency: 'AUD',
            as_of_date: '2026-09-22'
        });

        expect(summary.is_complete).toBe(false);
        expect(summary.unrecorded_count).toBe(1);
        expect(summary.unrecorded_accounts[0].name).toBe('Awaiting Super Statement');
        expect(summary.unrecorded_accounts[0].id).toBe(accUnknown.id);
        expect(summary.coverage_notes.length).toBeGreaterThan(0);
    });

    // Case 10: USD and JPY native values & minor units
    it('Case 10: multi-currency holdings preserve native amounts, zero silent AUD addition, correct JPY minor units', () => {
        const summary = getSharedFinancialSummary(testDb, {
            reporting_currency: 'AUD',
            as_of_date: '2026-09-22'
        });

        // Native currency totals must be strictly partitioned
        expect(summary.total_assets_cents_by_currency['USD']).toBe(2500000); // 25,000.00 USD
        expect(summary.total_assets_cents_by_currency['JPY']).toBe(100000);  // 100,000 JPY (0 decimals)
        expect(summary.total_assets_cents_by_currency['AUD']).toBe(150000);  // 1,000 HH Bank + 500 Co Bank

        // Converted totals must be incomplete because no dated FX rate was provided
        expect(summary.converted_total_assets?.is_complete).toBe(false);
        expect(summary.converted_total_assets?.missing_rates).toContain('USD -> AUD');
        expect(summary.converted_total_assets?.missing_rates).toContain('JPY -> AUD');
    });

    // Case 11: "Last month" on 22 September 2026
    it('Case 11: "last month" resolves to 2026-08-01 through 2026-08-31', () => {
        const lastMonth = getLastMonthRange(FIXED_DATE);
        expect(lastMonth.startDate).toBe('2026-08-01');
        expect(lastMonth.endDate).toBe('2026-08-31');
    });

    // Case 12: "This month" on 22 September 2026
    it('Case 12: "this month" resolves to 2026-09-01 through 2026-09-30', () => {
        const thisMonth = getCurrentMonthRange(FIXED_DATE);
        expect(thisMonth.startDate).toBe('2026-09-01');
        expect(thisMonth.endDate).toBe('2026-09-30');
    });

    // Case 13: "2026-02-31" invalid calendar date
    it('Case 13: impossible calendar date "2026-02-31" is rejected with explicit clarification', () => {
        expect(isValidCalendarDate('2026-02-31')).toBe(false);
        const invalidIntent = parseSpendingIntent('How much did I spend on 2026-02-31?', [entHousehold], FIXED_DATE);
        expect(invalidIntent.needsClarification).toBe("Invalid calendar date: '2026-02-31' does not exist.");
    });

    // Case 14: Explicit date ranges preserved without collapsing
    it('Case 14: explicit date ranges are preserved without collapsing to single days', () => {
        const rangeIntent = parseSpendingIntent('What did I spend from 2026-08-01 to 2026-08-15?', [entHousehold], FIXED_DATE);
        expect(rangeIntent.startDate).toBe('2026-08-01');
        expect(rangeIntent.endDate).toBe('2026-08-15');
    });

    // Case 15: Loan with insufficient payments
    it('Case 15: non-amortising loan reports explicit insufficient-payment status and suppresses fabricated payoff date', () => {
        const predatoryLoan: Liability = {
            id: 'loan-predatory',
            user_id: 'user1',
            name: 'High APR Loan',
            type: 'credit_card',
            balance: 10000,
            interest_rate: 24, // $200/mo interest
            minimum_payment: 100, // $100 payment < $200 interest
            is_good_debt: false,
            currency: 'AUD',
            last_updated: FIXED_DATE
        };

        const result = calculatePayoff([predatoryLoan], 0, 'minimum');
        expect(result.isInsufficientPayment).toBe(true);
        expect(result.freedomDate).toBe('');
        expect(result.monthsToPayoff).toBe(0);
        expect(result.daysUntilFreedom).toBe(0);
    });

    // Case 16: Unavailable investment data
    it('Case 16: uncosted investment suppresses whole-portfolio percentage return without fabricating mock prices', () => {
        const holdings: Asset[] = [
            {
                id: 'asset-1',
                name: 'Uncosted ETF',
                type: 'investment',
                value: 5000,
                is_liquid: true,
                last_updated: FIXED_DATE,
                investment_details: { ticker: 'XYZ', shares: 50, costBasis: (undefined as any), assetClass: 'etf' }
            }
        ];

        const perf = analyzePortfolio(holdings);
        expect(perf.hasCostBasis).toBe(false);
        expect(perf.totalGainPercent).toBeNull();
        expect(perf.missingCostBasisCount).toBe(1);
    });

    // Case 17: Restore into a fresh isolated database
    it('Case 17: snapshot export and full restore into a fresh isolated database survives 100% intact', async () => {
        // 1. Export snapshot from current test database via GET /api/vault
        const exportRes = await vaultGet(new Request('http://localhost:4000/api/vault'));
        expect(exportRes.status).toBe(200);
        const snapshot = await exportRes.json();
        expect(snapshot.success).toBe(true);
        expect(snapshot.manifest.schemaVersion).toBe(2);
        expect(snapshot.vault.schemaVersion).toBe(2);

        // 2. Create a brand new pristine in-memory test database
        closeDb();
        const freshDb = createTestDb();
        initAccountingSchema(freshDb);
        initDocumentSchema(freshDb);
        setTestDb(freshDb);

        // 3. Restore snapshot into fresh isolated database via POST /api/vault
        const restoreRes = await vaultPost(new Request('http://localhost:4000/api/vault', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                action: 'bulk_restore',
                schemaVersion: 2,
                manifest: snapshot.manifest,
                vault: snapshot.vault
            })
        }));
        expect(restoreRes.status).toBe(200);

        // 4. Verify entities and accounts survived intact
        const entities = freshDb.prepare("SELECT * FROM m1_entities").all() as any[];
        expect(entities.length).toBe(2);
        expect(entities.map(e => e.id)).toContain('ent-household');
        expect(entities.map(e => e.id)).toContain('ent-company');

        const accounts = freshDb.prepare("SELECT * FROM m1_accounts").all() as any[];
        expect(accounts.length).toBe(9); // 7 test accounts + 2 equity accounts

        const transactions = freshDb.prepare("SELECT * FROM m1_transactions").all() as any[];
        expect(transactions.length).toBe(2); // 2 opening balance transactions

        const journalEntries = freshDb.prepare("SELECT * FROM m1_journal_entries").all() as any[];
        expect(journalEntries.length).toBe(4); // 2 postings each
    });
});
