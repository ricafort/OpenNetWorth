/**
 * Batch A Remediation Tests: Financial Consistency and Usability
 * 
 * Why this file exists:
 * Formally validates and prevents regression for Batch A remediation requirements:
 * - A1: Consistent Reporting Dates (eliminating UTC off-by-one errors during Sydney morning,
 *   aligning dashboard balances, and eliminating false cash flow discrepancies).
 * - A2: Report Totals, Categories and Exchange-Rate Messages (expense-only periods with zero income,
 *   typed category mapping, and readable exchange rate relationships).
 * - A3: Account Matching Respects Owner Contradictions (preventing silent assignment of Alice Smith's
 *   statement to Bob Jones's account, single-line owner extraction, and low-effort consistent matching).
 * 
 * Tricky logic:
 * - Uses in-memory SQLite instances to guarantee complete database isolation.
 * - Simulates local date boundaries and tests future-dated transaction exclusion.
 * - Tests joint-owner matching and single candidate contradiction guards.
 * 
 * TODO: In Milestone 2, expand automated multi-currency cross-entity transfer tests.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import Database from 'better-sqlite3';
import { jsPDF } from 'jspdf';
import { initAccountingSchema } from './schema';
import { initDocumentSchema } from '../document/schema';
import { createEntity, createAccount } from './accountService';
import { recordExpense, postTransaction } from './transactionService';
import {
    getAccountBalance,
    getEntityNetWorth,
    getPeriodIncomeAndExpenses,
    getActualCashFlowStatement
} from './balanceService';
import { getSharedFinancialSummary } from './sharedFinancialSummaryService';
import { getLocalTodayCalendarDate, formatCalendarDate } from '../calendarDate';
import {
    inspectPageHeaderContext,
    isOwnerCompatible,
    extractStatementBalancesFromPdf
} from '../document/pdfStatementExtractor';
import { CurrencyCode } from './types';

describe('Batch A Remediation Tests', () => {
    let db: Database.Database;

    beforeEach(() => {
        db = new Database(':memory:');
        initAccountingSchema(db);
        initDocumentSchema(db);
    });

    afterEach(() => {
        db.close();
    });

    describe('A1: Consistent Reporting Dates', () => {
        it('includes today transaction in default dashboard balance and eliminates cash flow discrepancy during Sydney morning', () => {
            const today = getLocalTodayCalendarDate();

            // 1. Create personal entity and bank account with AUD 5,000 opening balance
            const entity = createEntity(db, { name: 'Alice Smith', type: 'person', currency: 'AUD' });
            const { account: bankAcc } = createAccount(db, {
                entity_id: entity.id,
                name: 'Everyday Checking',
                type: 'asset',
                sub_type: 'checking',
                currency: 'AUD',
                opening_balance_cents: 500000,
                opening_date: '2026-09-01'
            });

            // 2. Post an AUD 10.23 expense on today's local reporting date
            const { account: expenseAcc } = createAccount(db, {
                entity_id: entity.id,
                name: 'Groceries',
                type: 'expense',
                sub_type: 'groceries',
                currency: 'AUD'
            });

            recordExpense(db, {
                entity_id: entity.id,
                amount_cents: 1023,
                date: today,
                payment_account_id: bankAcc.id,
                expense_account_id: expenseAcc.id,
                description: 'Supermarket shopping'
            });

            // 3. Verify Account balance as of today is AUD 4,989.77 (5000.00 - 10.23)
            const accBal = getAccountBalance(db, bankAcc.id);
            expect(accBal.balance_cents).toBe(498977);
            expect(accBal.formatted_balance).toBe('A$4,989.77');

            // 4. Verify Shared Financial Summary (Dashboard default without asOfDate) includes today's expense
            const summary = getSharedFinancialSummary(db, { reporting_currency: 'AUD' });
            expect(summary.as_of_date).toBe(today);
            expect(summary.total_assets_cents_by_currency['AUD']).toBe(498977);
            expect(summary.net_worth_cents_by_currency['AUD']).toBe(498977);

            // 5. Verify Cash Flow Statement default period (without endDate) bounds to local today
            // Ending liquid cash must match independent ledger balance with ZERO discrepancy!
            const cashFlow = getActualCashFlowStatement(db, entity.id);
            expect(cashFlow.end_date).toBe(today);
            expect(cashFlow.operating_outflows_cents_by_currency['AUD']).toBe(1023);
            expect(cashFlow.ending_cash_cents_by_currency['AUD']).toBe(498977);
            expect(cashFlow.ledger_closing_cash_cents_by_currency?.['AUD']).toBe(498977);
            expect(cashFlow.reconciliation_discrepancy_cents_by_currency?.['AUD']).toBe(0);
            expect(cashFlow.is_reconciled_by_currency?.['AUD']).toBe(true);
        });

        it('does not leak future-dated activity into current-period calculations', () => {
            const today = getLocalTodayCalendarDate();
            const futureDate = '2099-12-31';

            const entity = createEntity(db, { name: 'Alice Smith', type: 'person', currency: 'AUD' });
            const { account: bankAcc } = createAccount(db, {
                entity_id: entity.id,
                name: 'Savings',
                type: 'asset',
                sub_type: 'savings',
                currency: 'AUD',
                opening_balance_cents: 100000,
                opening_date: '2026-01-01'
            });
            const { account: expenseAcc } = createAccount(db, {
                entity_id: entity.id,
                name: 'Travel',
                type: 'expense',
                sub_type: 'living_expense',
                currency: 'AUD'
            });

            // Post a future transaction (scheduled or post-dated)
            recordExpense(db, {
                entity_id: entity.id,
                amount_cents: 50000,
                date: futureDate,
                payment_account_id: bankAcc.id,
                expense_account_id: expenseAcc.id,
                description: 'Future flight booking'
            });

            // Current balance up to today should remain AUD 1,000.00
            const currentBal = getAccountBalance(db, bankAcc.id);
            expect(currentBal.balance_cents).toBe(100000);

            // Current period income and expenses up to today should NOT include the future expense
            const currentPeriod = getPeriodIncomeAndExpenses(db, entity.id);
            expect(currentPeriod.total_expenses_cents_by_currency['AUD'] || 0).toBe(0);

            // But querying explicitly for the future period includes it
            const futurePeriod = getPeriodIncomeAndExpenses(db, entity.id, undefined, futureDate);
            expect(futurePeriod.total_expenses_cents_by_currency['AUD']).toBe(50000);
        });
    });

    describe('A2: Report Totals, Categories and Exchange-Rate Messages', () => {
        it('renders legitimate zero income in an expense-only period with typed category names', () => {
            const entity = createEntity(db, { name: 'Bob Jones', type: 'person', currency: 'AUD' });
            const { account: bankAcc } = createAccount(db, {
                entity_id: entity.id,
                name: 'Everyday Checking',
                type: 'asset',
                sub_type: 'checking',
                currency: 'AUD',
                opening_balance_cents: 200000,
                opening_date: '2026-09-01'
            });
            const { account: groceryAcc } = createAccount(db, {
                entity_id: entity.id,
                name: 'Groceries',
                type: 'expense',
                sub_type: 'groceries',
                currency: 'AUD'
            });

            // Post AUD 10.23 expense in Groceries, no income posted
            recordExpense(db, {
                entity_id: entity.id,
                amount_cents: 1023,
                date: '2026-09-23',
                payment_account_id: bankAcc.id,
                expense_account_id: groceryAcc.id,
                description: 'Supermarket trip'
            });

            const report = getPeriodIncomeAndExpenses(db, entity.id, '2026-09-01', '2026-09-30');

            // Expenses are AUD 10.23, Income is AUD 0.00, Net savings is -AUD 10.23
            expect(report.total_income_cents_by_currency['AUD'] || 0).toBe(0);
            expect(report.total_expenses_cents_by_currency['AUD']).toBe(1023);
            expect(report.net_savings_cents_by_currency['AUD']).toBe(-1023);
            expect(report.formatted_expenses_by_currency['AUD']).toBe('A$10.23');
            expect(report.formatted_income_by_currency['AUD']).toBe('A$0.00');
            expect(report.formatted_net_savings_by_currency['AUD']).toBe('-A$10.23');

            // Category breakdown includes typed account_name "Groceries"
            expect(report.breakdown_by_category).toHaveLength(1);
            expect(report.breakdown_by_category[0].account_name).toBe('Groceries');
            expect(report.breakdown_by_category[0].formatted_total).toBe('A$10.23');
        });

        /**
         * Fulfills Batch A Narrow Closing Correction 1 (Reproduction Case):
         * Create an AUD 5,000 opening balance dated after the report end date.
         * Request cash flow without a start date.
         * 
         * Expected result:
         * Starting/ending cash excludes AUD 5,000, ledger closing cash is zero, discrepancy is zero, is_reconciled is true.
         */
        it('excludes future-dated opening balances from cash flow statement when startDate is omitted', () => {
            const entity = createEntity(db, { name: 'Acme Corp', type: 'business', currency: 'AUD' });
            
            // Create cash account with AUD 5,000 opening balance dated in the future: 2026-10-01
            const { account: bankAcc } = createAccount(db, {
                entity_id: entity.id,
                name: 'Business Checking',
                type: 'asset',
                sub_type: 'checking',
                currency: 'AUD',
                opening_balance_cents: 500000,
                opening_date: '2026-10-01'
            });

            // Request cash flow without startDate, bounding endDate to 2026-09-23 (before opening date)
            const cf = getActualCashFlowStatement(db, entity.id, undefined, '2026-09-23');

            // Future opening balance must NOT leak into starting or ending cash!
            expect(cf.end_date).toBe('2026-09-23');
            expect(cf.starting_cash_cents_by_currency['AUD']).toBe(0);
            expect(cf.ending_cash_cents_by_currency['AUD']).toBe(0);
            expect(cf.ledger_closing_cash_cents_by_currency).toBeDefined();
            expect(cf.ledger_closing_cash_cents_by_currency!['AUD']).toBe(0);
            expect(cf.reconciliation_discrepancy_cents_by_currency).toBeDefined();
            expect(cf.reconciliation_discrepancy_cents_by_currency!['AUD']).toBe(0);
            expect(cf.is_reconciled_by_currency).toBeDefined();
            expect(cf.is_reconciled_by_currency!['AUD']).toBe(true);
        });

        it('excludes opening balance in a historical report dated before account opening date', () => {
            const entity = createEntity(db, { name: 'Historical Test Entity', type: 'person', currency: 'AUD' });
            
            // Account opened on 2026-06-01 with $5,000
            createAccount(db, {
                entity_id: entity.id,
                name: 'Savings',
                type: 'asset',
                sub_type: 'savings',
                currency: 'AUD',
                opening_balance_cents: 500000,
                opening_date: '2026-06-01'
            });

            // Historical report for Q1 2026 (2026-01-01 to 2026-03-31)
            const cfHistorical = getActualCashFlowStatement(db, entity.id, '2026-01-01', '2026-03-31');
            expect(cfHistorical.starting_cash_cents_by_currency['AUD']).toBe(0);
            expect(cfHistorical.ending_cash_cents_by_currency['AUD']).toBe(0);
            expect(cfHistorical.ledger_closing_cash_cents_by_currency).toBeDefined();
            expect(cfHistorical.ledger_closing_cash_cents_by_currency!['AUD']).toBe(0);
            expect(cfHistorical.is_reconciled_by_currency).toBeDefined();
            expect(cfHistorical.is_reconciled_by_currency!['AUD']).toBe(true);

            // Historical report with no start date ending 2026-03-31
            const cfNoStart = getActualCashFlowStatement(db, entity.id, undefined, '2026-03-31');
            expect(cfNoStart.starting_cash_cents_by_currency['AUD']).toBe(0);
            expect(cfNoStart.ending_cash_cents_by_currency['AUD']).toBe(0);
            expect(cfNoStart.ledger_closing_cash_cents_by_currency).toBeDefined();
            expect(cfNoStart.ledger_closing_cash_cents_by_currency!['AUD']).toBe(0);
            expect(cfNoStart.is_reconciled_by_currency).toBeDefined();
            expect(cfNoStart.is_reconciled_by_currency!['AUD']).toBe(true);
        });

        it('includes opening balance when report period encompasses the opening date', () => {
            const entity = createEntity(db, { name: 'Current Period Entity', type: 'person', currency: 'AUD' });
            
            // Account opened on 2026-06-01 with $5,000
            createAccount(db, {
                entity_id: entity.id,
                name: 'Savings',
                type: 'asset',
                sub_type: 'savings',
                currency: 'AUD',
                opening_balance_cents: 500000,
                opening_date: '2026-06-01'
            });

            // Report starting on opening date: 2026-06-01 to 2026-06-30
            const cfWithStart = getActualCashFlowStatement(db, entity.id, '2026-06-01', '2026-06-30');
            expect(cfWithStart.starting_cash_cents_by_currency['AUD']).toBe(500000);
            expect(cfWithStart.ending_cash_cents_by_currency['AUD']).toBe(500000);
            expect(cfWithStart.ledger_closing_cash_cents_by_currency).toBeDefined();
            expect(cfWithStart.ledger_closing_cash_cents_by_currency!['AUD']).toBe(500000);
            expect(cfWithStart.is_reconciled_by_currency).toBeDefined();
            expect(cfWithStart.is_reconciled_by_currency!['AUD']).toBe(true);

            // Report without start date ending 2026-06-30
            const cfNoStart = getActualCashFlowStatement(db, entity.id, undefined, '2026-06-30');
            expect(cfNoStart.starting_cash_cents_by_currency['AUD']).toBe(500000);
            expect(cfNoStart.ending_cash_cents_by_currency['AUD']).toBe(500000);
            expect(cfNoStart.ledger_closing_cash_cents_by_currency).toBeDefined();
            expect(cfNoStart.ledger_closing_cash_cents_by_currency!['AUD']).toBe(500000);
            expect(cfNoStart.is_reconciled_by_currency).toBeDefined();
            expect(cfNoStart.is_reconciled_by_currency!['AUD']).toBe(true);
        });

        it('returns resolved end date consistently, including empty cash accounts', () => {
            const entity = createEntity(db, { name: 'Empty Cash Entity', type: 'person', currency: 'AUD' });

            // Call with explicit endDate
            const cfExplicit = getActualCashFlowStatement(db, entity.id, undefined, '2026-03-31');
            expect(cfExplicit.end_date).toBe('2026-03-31');

            // Call without endDate (defaults to local today calendar date)
            const cfDefault = getActualCashFlowStatement(db, entity.id);
            expect(cfDefault.end_date).toBe(getLocalTodayCalendarDate());
        });

        /**
         * Fulfills Batch A Final Focused Recheck (Correction 2):
         * Exercise the omitted-end-date path with controlled clock and timezone conditions,
         * restoring test environment changes afterwards.
         */
        it('exercises omitted-end-date path with frozen clock and controlled timezones, restoring environment afterwards', () => {
            const entity = createEntity(db, { name: 'Clock Entity', type: 'person', currency: 'AUD' });
            createAccount(db, {
                entity_id: entity.id,
                name: 'Checking',
                type: 'asset',
                sub_type: 'checking',
                currency: 'AUD',
                opening_balance_cents: 250000,
                opening_date: '2026-10-05' // Future opening balance relative to September
            });

            const originalTz = process.env.TZ;
            try {
                // Case 1: Sydney morning (AEST UTC+10) at 6:00 AM on 2026-09-23 -> UTC is 2026-09-22 20:00:00
                process.env.TZ = 'Australia/Sydney';
                vi.useFakeTimers();
                vi.setSystemTime(new Date('2026-09-22T20:00:00.000Z'));

                // Omitted start_date and omitted end_date: resolvedEndDate evaluates via local wall-clock
                const cfSydney = getActualCashFlowStatement(db, entity.id);
                expect(cfSydney.end_date).toBe('2026-09-23');
                expect(cfSydney.starting_cash_cents_by_currency['AUD']).toBe(0);
                expect(cfSydney.ending_cash_cents_by_currency['AUD']).toBe(0);
                expect(cfSydney.ledger_closing_cash_cents_by_currency).toBeDefined();
                expect(cfSydney.ledger_closing_cash_cents_by_currency!['AUD']).toBe(0);
                expect(cfSydney.is_reconciled_by_currency).toBeDefined();
                expect(cfSydney.is_reconciled_by_currency!['AUD']).toBe(true);

                // Case 2: Opposite offset (US Pacific UTC-7 / PDT) at 5:00 PM on 2026-09-22 -> UTC is 2026-09-23 00:00:00
                process.env.TZ = 'America/Los_Angeles';
                vi.setSystemTime(new Date('2026-09-23T00:00:00.000Z'));

                // Omitted end-date evaluates to 2026-09-22 under PDT
                const cfPacific = getActualCashFlowStatement(db, entity.id);
                expect(cfPacific.end_date).toBe('2026-09-22');
                expect(cfPacific.starting_cash_cents_by_currency['AUD']).toBe(0);
                expect(cfPacific.ending_cash_cents_by_currency['AUD']).toBe(0);
                expect(cfPacific.ledger_closing_cash_cents_by_currency).toBeDefined();
                expect(cfPacific.ledger_closing_cash_cents_by_currency!['AUD']).toBe(0);
                expect(cfPacific.is_reconciled_by_currency).toBeDefined();
                expect(cfPacific.is_reconciled_by_currency!['AUD']).toBe(true);

                // Case 3: Sydney DST transition (AEDT UTC+11 in October) at 10:00 AM on 2026-10-10 -> UTC is 2026-10-09 23:00:00
                process.env.TZ = 'Australia/Sydney';
                vi.setSystemTime(new Date('2026-10-09T23:00:00.000Z'));

                // Omitted end-date evaluates to 2026-10-10 under AEDT, which encompasses 2026-10-05 opening balance
                const cfDst = getActualCashFlowStatement(db, entity.id);
                expect(cfDst.end_date).toBe('2026-10-10');
                expect(cfDst.starting_cash_cents_by_currency['AUD']).toBe(250000);
                expect(cfDst.ending_cash_cents_by_currency['AUD']).toBe(250000);
                expect(cfDst.ledger_closing_cash_cents_by_currency).toBeDefined();
                expect(cfDst.ledger_closing_cash_cents_by_currency!['AUD']).toBe(250000);
                expect(cfDst.is_reconciled_by_currency).toBeDefined();
                expect(cfDst.is_reconciled_by_currency!['AUD']).toBe(true);
            } finally {
                // Guaranteed restoration of test environment changes
                process.env.TZ = originalTz;
                vi.useRealTimers();
            }
        });
    });

    describe('A3: Account Matching Respects Owner Contradictions', () => {
        it('does not absorb following header lines when extracting account holder', () => {
            const pageText = `
Commonwealth Bank of Australia
Account Holder: Alice Smith
Statement Period: 01 Mar 2026 to 31 Mar 2026
Account Number: •••• 4421
Closing Balance: $4,989.77
            `;
            const header = inspectPageHeaderContext(pageText);
            expect(header.owner).toBe('Alice Smith');
            expect(header.account_mask).toBe('4421');
            expect(header.effective_date).toBe('2026-03-31');
        });

        it('correctly evaluates owner compatibility', () => {
            const bobEntity = { id: 'ent-1', name: 'Bob Jones' };
            const aliceEntity = { id: 'ent-2', name: 'Alice Smith' };

            // Explicit contradiction: Alice Smith vs Bob Jones
            const contradiction = isOwnerCompatible('Alice Smith', bobEntity);
            expect(contradiction.compatible).toBe(false);
            expect(contradiction.reason).toContain('This statement names Alice Smith, but the matching account belongs to Bob Jones. Choose the correct account.');

            // Direct match
            const directMatch = isOwnerCompatible('Alice Smith', aliceEntity);
            expect(directMatch.compatible).toBe(true);

            // Joint ownership match
            const jointMatch = isOwnerCompatible('Alice Smith', bobEntity, [{ name: 'Alice Smith' }]);
            expect(jointMatch.compatible).toBe(true);

            // Absent statement owner -> compatible
            const noOwner = isOwnerCompatible(null, bobEntity);
            expect(noOwner.compatible).toBe(true);
        });

        /**
         * Fulfills Batch A Final Focused Recheck (Correction 1 - Reproduction Case):
         * Statement owner: Acme Services Pty Ltd
         * Candidate owner: Acme Services Holdings Pty Ltd
         * Matching institution and account suffix.
         * 
         * Requirement:
         * Do not treat a subset of business-name tokens as proof of identity.
         * Unproven business-name equivalence must remain unresolved with a visible explanation.
         */
        it('rejects business-name subset matching without owner warning (Acme Services Pty Ltd vs Acme Services Holdings Pty Ltd)', () => {
            const holdingsCompany = { id: 'ent-holdings', name: 'Acme Services Holdings Pty Ltd', type: 'business' };
            const servicesCompany = { id: 'ent-services', name: 'Acme Services Pty Ltd', type: 'business' };

            // Reproduction: Subset of business-name tokens must NOT be accepted as proof of identity
            const result = isOwnerCompatible('Acme Services Pty Ltd', holdingsCompany);
            expect(result.compatible).toBe(false);
            expect(result.reason).toBe('This statement names Acme Services Pty Ltd, but the matching account belongs to Acme Services Holdings Pty Ltd. Choose the correct account.');

            // Normalised equivalent names still receive low-effort workflow
            expect(isOwnerCompatible('Acme Services Pty Ltd', servicesCompany).compatible).toBe(true);
            expect(isOwnerCompatible('Acme Services Pty. Ltd.', servicesCompany).compatible).toBe(true);
            expect(isOwnerCompatible('Acme Services Limited', servicesCompany).compatible).toBe(true);

            // Actual joint-owner relationships still work
            expect(isOwnerCompatible('Acme Services Pty Ltd', holdingsCompany, [{ name: 'Acme Services Pty Ltd' }]).compatible).toBe(true);
        });

        it('rejects company matching when only generic legal suffixes match (Alice Smith Pty Ltd vs Bob Jones Pty Ltd)', () => {
            const bobCompany = { id: 'ent-comp-1', name: 'Bob Jones Pty Ltd', type: 'business' };
            const aliceCompany = { id: 'ent-comp-2', name: 'Alice Smith Pty Ltd', type: 'business' };

            // "Pty" and "Ltd" must NOT satisfy the matching threshold
            const result = isOwnerCompatible('Alice Smith Pty Ltd', bobCompany);
            expect(result.compatible).toBe(false);
            expect(result.reason).toBe('This statement names Alice Smith Pty Ltd, but the matching account belongs to Bob Jones Pty Ltd. Choose the correct account.');

            // Exact normalized match still receives low-effort workflow
            const matchResult = isOwnerCompatible('Alice Smith Pty Ltd', aliceCompany);
            expect(matchResult.compatible).toBe(true);

            // Punctuation variation match: "Alice Smith Pty. Ltd."
            const punctResult = isOwnerCompatible('Alice Smith Pty. Ltd.', aliceCompany);
            expect(punctResult.compatible).toBe(true);
        });

        it('rejects personal matching based merely on substring containment (John Smith vs John Smithson)', () => {
            const smithsonEntity = { id: 'ent-3', name: 'John Smithson', type: 'person' };
            const smithEntity = { id: 'ent-4', name: 'John Smith', type: 'person' };

            // Statement says John Smith, account belongs to John Smithson
            const result1 = isOwnerCompatible('John Smith', smithsonEntity);
            expect(result1.compatible).toBe(false);
            expect(result1.reason).toContain('This statement names John Smith, but the matching account belongs to John Smithson. Choose the correct account.');

            // Statement says John Smithson, account belongs to John Smith
            const result2 = isOwnerCompatible('John Smithson', smithEntity);
            expect(result2.compatible).toBe(false);
            expect(result2.reason).toContain('This statement names John Smithson, but the matching account belongs to John Smith. Choose the correct account.');

            // Distinct first names sharing surname (Alice Smith vs Bob Smith)
            const bobSmith = { id: 'ent-5', name: 'Bob Smith', type: 'person' };
            const result3 = isOwnerCompatible('Alice Smith', bobSmith);
            expect(result3.compatible).toBe(false);
        });

        it('supports narrowly defined personal middle initials while requiring explicit evidence for separate entities', () => {
            const trustEntity = { id: 'ent-trust', name: 'The Alice Smith Family Trust', type: 'trust' };
            const aliceEntity = { id: 'ent-alice', name: 'Alice Smith', type: 'person' };

            // Unproven trust entity without joint-ownership evidence remains unresolved
            expect(isOwnerCompatible('Alice Smith', trustEntity).compatible).toBe(false);

            // Established joint-ownership / trustee relationship in m1_account_ownership succeeds
            expect(isOwnerCompatible('Alice Smith', trustEntity, [{ name: 'Alice Smith' }]).compatible).toBe(true);

            // Narrow personal middle-initial allowance: [First, M, Last] vs [First, Last]
            expect(isOwnerCompatible('Alice M. Smith', aliceEntity).compatible).toBe(true);
            expect(isOwnerCompatible('Alice Smith', { id: 'ent-alice-m', name: 'Alice M. Smith', type: 'person' }).compatible).toBe(true);
        });

        it('leaves account assignment unresolved when statement owner contradicts candidate account owner', async () => {
            // Setup DB with CBA account ending 4421 owned by Bob Jones
            const bobEntity = createEntity(db, { name: 'Bob Jones', type: 'person', currency: 'AUD' });
            createAccount(db, {
                entity_id: bobEntity.id,
                name: 'Bob CBA Checking',
                type: 'asset',
                sub_type: 'checking',
                currency: 'AUD',
                account_number_mask: '4421',
                institution: 'Commonwealth Bank'
            });

            // Generate a valid PDF using jsPDF
            const doc = new jsPDF();
            doc.text('Commonwealth Bank', 10, 10);
            doc.text('Account Holder: Alice Smith', 10, 20);
            doc.text('Statement Date: 23 Mar 2026', 10, 30);
            doc.text('Account: 4421', 10, 40);
            doc.text('Smart Access Closing Balance: $3,500.00', 10, 50);
            const pdfBytes = Buffer.from(doc.output('arraybuffer'));

            const result = await extractStatementBalancesFromPdf(db, pdfBytes, 'cba_alice_statement.pdf');

            expect(result.supported).toBe(true);
            expect(result.proposals).toHaveLength(1);
            const prop = result.proposals[0];

            // Must NOT be silently assigned to Bob Jones's account!
            expect(prop.account_id).toBeNull();
            expect(prop.unresolved_fields).toContain('owner');
            expect(prop.unresolved_fields).toContain('account');
            expect(prop.owner_conflict_message).toContain('This statement names Alice Smith, but the matching account belongs to Bob Jones. Choose the correct account.');
            expect(result.disclosures.some(d => d.includes('names Alice Smith, but the matching account belongs to Bob Jones'))).toBe(true);
        });

        /**
         * Fulfills Batch A Final Focused Recheck (Reproduction Acceptance):
         * Statement: Acme Services Pty Ltd
         * Candidate owner: Acme Services Holdings Pty Ltd
         * Matching institution (CBA) and account suffix (4421).
         * 
         * Acceptance:
         * The reproduction remains unresolved with a visible explanation.
         * The Holdings account is NOT automatically selected.
         */
        it('leaves account assignment unresolved when candidate belongs to Acme Services Holdings Pty Ltd but statement names Acme Services Pty Ltd', async () => {
            // Setup DB with CBA account ending 4421 owned by Acme Services Holdings Pty Ltd
            const holdingsCompany = createEntity(db, { name: 'Acme Services Holdings Pty Ltd', type: 'business', currency: 'AUD' });
            createAccount(db, {
                entity_id: holdingsCompany.id,
                name: 'Acme Holdings CBA Account',
                type: 'asset',
                sub_type: 'checking',
                currency: 'AUD',
                account_number_mask: '4421',
                institution: 'Commonwealth Bank'
            });

            // PDF statement names Acme Services Pty Ltd
            const doc = new jsPDF();
            doc.text('Commonwealth Bank', 10, 10);
            doc.text('Account Holder: Acme Services Pty Ltd', 10, 20);
            doc.text('Statement Date: 23 Mar 2026', 10, 30);
            doc.text('Account: 4421', 10, 40);
            doc.text('Business Account Closing Balance: $25,000.00', 10, 50);
            const pdfBytes = Buffer.from(doc.output('arraybuffer'));

            const result = await extractStatementBalancesFromPdf(db, pdfBytes, 'cba_acme_services_statement.pdf');

            expect(result.proposals).toHaveLength(1);
            const prop = result.proposals[0];

            // Must NOT automatically select the Holdings account!
            expect(prop.account_id).toBeNull();
            expect(prop.unresolved_fields).toContain('owner');
            expect(prop.unresolved_fields).toContain('account');
            expect(prop.owner_conflict_message).toBe('This statement names Acme Services Pty Ltd, but the matching account belongs to Acme Services Holdings Pty Ltd. Choose the correct account.');
            expect(result.disclosures.some(d => d.includes('This statement names Acme Services Pty Ltd, but the matching account belongs to Acme Services Holdings Pty Ltd'))).toBe(true);
        });

        it('leaves account assignment unresolved when company candidate owner contradicts statement owner', async () => {
            // Setup DB with CBA account ending 4421 owned by Bob Jones Pty Ltd
            const bobCompany = createEntity(db, { name: 'Bob Jones Pty Ltd', type: 'business', currency: 'AUD' });
            createAccount(db, {
                entity_id: bobCompany.id,
                name: 'Bob Jones CBA Account',
                type: 'asset',
                sub_type: 'checking',
                currency: 'AUD',
                account_number_mask: '4421',
                institution: 'Commonwealth Bank'
            });

            // PDF is issued to Alice Smith Pty Ltd
            const doc = new jsPDF();
            doc.text('Commonwealth Bank', 10, 10);
            doc.text('Account Holder: Alice Smith Pty Ltd', 10, 20);
            doc.text('Statement Date: 23 Mar 2026', 10, 30);
            doc.text('Account: 4421', 10, 40);
            doc.text('Business Account Closing Balance: $12,500.00', 10, 50);
            const pdfBytes = Buffer.from(doc.output('arraybuffer'));

            const result = await extractStatementBalancesFromPdf(db, pdfBytes, 'cba_alice_pty_ltd.pdf');

            expect(result.proposals).toHaveLength(1);
            const prop = result.proposals[0];

            // Must NOT silently match Bob Jones Pty Ltd!
            expect(prop.account_id).toBeNull();
            expect(prop.unresolved_fields).toContain('owner');
            expect(prop.unresolved_fields).toContain('account');
            expect(prop.owner_conflict_message).toBe('This statement names Alice Smith Pty Ltd, but the matching account belongs to Bob Jones Pty Ltd. Choose the correct account.');
        });

        it('auto-assigns when single candidate has matching owner', async () => {
            // Setup DB with CBA account ending 4421 owned by Alice Smith
            const aliceEntity = createEntity(db, { name: 'Alice Smith', type: 'person', currency: 'AUD' });
            const { account: aliceAcc } = createAccount(db, {
                entity_id: aliceEntity.id,
                name: 'Alice CBA Checking',
                type: 'asset',
                sub_type: 'checking',
                currency: 'AUD',
                account_number_mask: '4421',
                institution: 'Commonwealth Bank'
            });

            const doc = new jsPDF();
            doc.text('Commonwealth Bank', 10, 10);
            doc.text('Account Holder: Alice Smith', 10, 20);
            doc.text('Statement Date: 23 Mar 2026', 10, 30);
            doc.text('Account: 4421', 10, 40);
            doc.text('Smart Access Closing Balance: $3,500.00', 10, 50);
            const pdfBytes = Buffer.from(doc.output('arraybuffer'));

            const result = await extractStatementBalancesFromPdf(db, pdfBytes, 'cba_alice_statement.pdf');

            expect(result.proposals).toHaveLength(1);
            const prop = result.proposals[0];

            // Consistent owner: normal low-effort matching works!
            expect(prop.account_id).toBe(aliceAcc.id);
            expect(prop.unresolved_fields).not.toContain('owner');
            expect(prop.unresolved_fields).not.toContain('account');
        });
    });
});
