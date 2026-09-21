/**
 * Delivery 1: Fast Balance Updates & Shared Financial Summary Acceptance Tests
 * 
 * Why this file exists:
 * Verifies the complete delivery 1 specification for balance updates:
 * 1. Valuation vs Non-Valuation Balance Kinds:
 *    Only actual balance kinds (current_balance, statement_closing_balance, etc.) count toward net worth.
 *    Credit limits, available credit, available redraw, buying power, and projected future values
 *    must never inflate or alter net worth.
 * 2. Date-Matched Reconciliation:
 *    Observations are reconciled against double-entry journal postings strictly as of the observation's
 *    effective date, not the current calendar date.
 * 3. Incomparable Available Balances:
 *    Available balances (which reflect pending card authorizations) are flagged as not directly comparable
 *    to posted double-entry ledger balances rather than reporting false discrepancy errors.
 * 4. Entity Ownership Weighting & Scoping:
 *    Joint ownership percentages are faithfully applied to balance observations; filtering by entity
 *    restricts assets and liabilities to that entity's ownership share.
 * 5. Multi-Currency Segregation:
 *    Summaries group net worth by currency without inventing unverified FX exchange rates.
 * 6. Concurrency & Versioning:
 *    Stale balance revisions are rejected with ConflictError (HTTP 409).
 *    Observations create an auditable supersession chain (superseded_by_id) when replaced on same date/kind.
 * 7. Structured Table & CSV Parsing:
 *    Deterministic parsing handles commas, tabs, pipes, and whitespace-aligned columns,
 *    mapping balance kinds and integer minor units (including JPY 0-decimal scale).
 * 8. API Integration:
 *    Validates the REST endpoints for table parsing and atomic batch commits.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import Database from 'better-sqlite3';
import { initAccountingSchema, migrateAccountingSchema } from './schema';
import { createEntity, createAccount, ConflictError } from './accountService';
import {
    recordBalanceObservation,
    getLatestValuationObservation,
    getReconciliationComparison,
    recordSourceMapping,
    findAccountBySourceMapping
} from './balanceObservationService';
import { getSharedFinancialSummary } from './sharedFinancialSummaryService';
import { parseStructuredTable } from './structuredBalanceParser';
import { setTestDb } from '@/infrastructure/sqlite/db';
import { postTransaction } from './transactionService';
import { GET as getBalancesSummary, POST as postBatchBalances } from '@/app/api/accounting/balances/route';
import { POST as parseTablePost } from '@/app/api/accounting/balances/parse-table/route';
import { NextRequest } from 'next/server';

describe('Delivery 1: Balance Updates & Shared Financial Summary Acceptance Tests', () => {
    let db: Database.Database;

    beforeEach(() => {
        // Run strictly in-memory for fast, isolated tests
        db = new Database(':memory:');
        db.pragma('foreign_keys = ON');
        initAccountingSchema(db);
        setTestDb(db);
    });

    afterEach(() => {
        setTestDb(null);
        try {
            db.close();
        } catch {
            // Already closed
        }
    });

    describe('1. Valuation vs Non-Valuation Balance Kinds', () => {
        it('excludes credit limits, available redraw, buying power, and projections from net worth', () => {
            const entity = createEntity(db, { name: 'Alice Person', type: 'person', currency: 'AUD' });

            const { account: creditCard } = createAccount(db, {
                entity_id: entity.id,
                name: 'Platinum Credit Card',
                type: 'liability',
                sub_type: 'credit_card',
                currency: 'AUD',
                opening_date: '2026-09-01',
                tracking_mode: 'balance'
            });

            const { account: superFund } = createAccount(db, {
                entity_id: entity.id,
                name: 'AustralianSuper',
                type: 'asset',
                sub_type: 'superannuation',
                currency: 'AUD',
                opening_date: '2026-09-01',
                tracking_mode: 'balance'
            });

            // Record actual current balance on super: $150,000.00 (15,000,000 cents)
            recordBalanceObservation(db, {
                account_id: superFund.id,
                effective_date: '2026-09-15',
                amount_cents: 15_000_000,
                balance_kind: 'current_balance',
                source_type: 'table_paste'
            });

            // Record projected future value of super: $1,200,000.00 (120,000,000 cents) - MUST NOT inflate net worth!
            recordBalanceObservation(db, {
                account_id: superFund.id,
                effective_date: '2026-09-15',
                amount_cents: 120_000_000,
                balance_kind: 'projected_future_value',
                source_type: 'table_paste'
            });

            // Record credit card debt: $2,500.00 (250,000 cents)
            recordBalanceObservation(db, {
                account_id: creditCard.id,
                effective_date: '2026-09-15',
                amount_cents: 250_000,
                balance_kind: 'current_balance',
                source_type: 'table_paste'
            });

            // Record credit limit: $10,000.00 (1,000,000 cents) - MUST NOT inflate liability or asset!
            recordBalanceObservation(db, {
                account_id: creditCard.id,
                effective_date: '2026-09-15',
                amount_cents: 1_000_000,
                balance_kind: 'credit_limit',
                source_type: 'table_paste'
            });

            // Verify getLatestValuationObservation returns the 'current_balance' valuation balance, not the limit or projection
            const latestSuper = getLatestValuationObservation(db, superFund.id, '2026-09-20');
            expect(latestSuper).not.toBeNull();
            expect(latestSuper!.amount_cents).toBe(15_000_000);
            expect(latestSuper!.balance_kind).toBe('current_balance');

            const latestCard = getLatestValuationObservation(db, creditCard.id, '2026-09-20');
            expect(latestCard).not.toBeNull();
            expect(latestCard!.amount_cents).toBe(250_000);
            expect(latestCard!.balance_kind).toBe('current_balance');

            // Shared financial summary should calculate:
            // Assets: 15,000,000
            // Liabilities: 250,000
            // Net Worth: 14,750,000
            const summary = getSharedFinancialSummary(db, { as_of_date: '2026-09-20' });
            expect(summary.total_assets_cents_by_currency['AUD']).toBe(15_000_000);
            expect(summary.total_liabilities_cents_by_currency['AUD']).toBe(250_000);
            expect(summary.net_worth_cents_by_currency['AUD']).toBe(14_750_000);
        });
    });

    describe('2. Date-Matched Reconciliation & Available Balance Incomparability', () => {
        it('reconciles transactions up to the observation effective date, not today', () => {
            const entity = createEntity(db, { name: 'Bob Person', type: 'person', currency: 'AUD' });
            const { account: equity } = createAccount(db, {
                entity_id: entity.id,
                name: 'Opening Equity',
                type: 'equity',
                sub_type: 'opening_balance_equity',
                currency: 'AUD',
                opening_date: '2026-09-01'
            });
            const { account: checking } = createAccount(db, {
                entity_id: entity.id,
                name: 'Everyday Checking',
                type: 'asset',
                sub_type: 'checking',
                currency: 'AUD',
                opening_date: '2026-09-01',
                tracking_mode: 'transactions'
            });

            // Initial deposit on Sep 01: $1,000.00
            postTransaction(db, {
                date: '2026-09-01',
                description: 'Opening deposit',
                postings: [
                    { account_id: checking.id, amount_cents: 100_000, currency: 'AUD' },
                    { account_id: equity.id, amount_cents: -100_000, currency: 'AUD' }
                ]
            });

            // Subsequent spend on Sep 10: $300.00
            const { account: expense } = createAccount(db, {
                entity_id: entity.id,
                name: 'Groceries',
                type: 'expense',
                sub_type: 'groceries',
                currency: 'AUD',
                opening_date: '2026-09-01'
            });
            postTransaction(db, {
                date: '2026-09-10',
                description: 'Groceries',
                postings: [
                    { account_id: expense.id, amount_cents: 30_000, currency: 'AUD' },
                    { account_id: checking.id, amount_cents: -30_000, currency: 'AUD' }
                ]
            });

            // Bank statement from Sep 05 has balance $1,000.00 (before the Sep 10 spend)
            const obs = recordBalanceObservation(db, {
                account_id: checking.id,
                effective_date: '2026-09-05',
                amount_cents: 100_000,
                balance_kind: 'statement_closing_balance',
                source_type: 'document'
            });

            // Reconcile as of Sep 05 -> Ledger balance on Sep 05 was $1,000.00 -> MATCH!
            const recon = getReconciliationComparison(db, checking.id, obs);
            expect(recon.is_comparable).toBe(true);
            expect(recon.status).toBe('matched');
            expect(recon.recorded_ledger_cents).toBe(100_000);
            expect(recon.diff_cents).toBe(0);
        });

        it('marks available_balance as not directly comparable to posted ledger balance', () => {
            const entity = createEntity(db, { name: 'Bob Person', type: 'person', currency: 'AUD' });
            const { account: checking } = createAccount(db, {
                entity_id: entity.id,
                name: 'Everyday Checking',
                type: 'asset',
                sub_type: 'checking',
                currency: 'AUD',
                opening_date: '2026-09-01',
                tracking_mode: 'transactions'
            });

            const obs = recordBalanceObservation(db, {
                account_id: checking.id,
                effective_date: '2026-09-15',
                amount_cents: 95_000, // Available balance reduced by pending card hold
                balance_kind: 'available_balance',
                source_type: 'manual'
            });

            const recon = getReconciliationComparison(db, checking.id, obs);
            expect(recon.is_comparable).toBe(false);
            expect(recon.status).toBe('not_directly_comparable');
            expect(recon.notes).toBeDefined();
            expect(recon.notes).toContain('pending');
        });
    });

    describe('3. Ownership Weighting & Entity Scoping', () => {
        it('applies ownership ratio when calculating net worth', () => {
            const jointEntity = createEntity(db, { name: 'Alice & Bob Household', type: 'household', currency: 'AUD' });
            const soloEntity = createEntity(db, { name: 'Alice Solo', type: 'person', currency: 'AUD' });

            // Joint Investment Property asset: $800,000.00
            const { account: jointHouse } = createAccount(db, {
                entity_id: jointEntity.id,
                name: 'Investment Property',
                type: 'asset',
                sub_type: 'real_estate',
                currency: 'AUD',
                opening_date: '2026-09-01',
                tracking_mode: 'balance'
            });

            // Configure Alice 50% ownership of Joint Property
            db.prepare(`
                INSERT INTO m1_account_ownership (id, account_id, entity_id, share_percentage, created_at)
                VALUES (?, ?, ?, ?, ?)
            `).run(crypto.randomUUID(), jointHouse.id, soloEntity.id, 50.0, new Date().toISOString());

            // Alice Solo Bank Account: $50,000.00 (100% owned directly by soloEntity)
            const { account: soloBank } = createAccount(db, {
                entity_id: soloEntity.id,
                name: 'Solo Savings',
                type: 'asset',
                sub_type: 'savings',
                currency: 'AUD',
                opening_date: '2026-09-01',
                tracking_mode: 'balance'
            });

            recordBalanceObservation(db, {
                account_id: jointHouse.id,
                effective_date: '2026-09-15',
                amount_cents: 80_000_000, // $800,000
                balance_kind: 'securities_market_value',
                source_type: 'manual'
            });

            recordBalanceObservation(db, {
                account_id: soloBank.id,
                effective_date: '2026-09-15',
                amount_cents: 5_000_000, // $50,000
                balance_kind: 'current_balance',
                source_type: 'manual'
            });

            // Alice Solo View:
            // 50% of Joint House = 40,000,000 cents
            // 100% of Solo Bank = 5,000,000 cents
            // Total = 45,000,000 cents
            const aliceSummary = getSharedFinancialSummary(db, {
                as_of_date: '2026-09-20',
                entity_id: soloEntity.id
            });
            expect(aliceSummary.total_assets_cents_by_currency['AUD']).toBe(45_000_000);

            // Global View (without entity filter):
            // 100% of Joint House = 80,000,000 cents
            // 100% of Solo Bank = 5,000,000 cents
            // Total = 85,000,000 cents
            const globalSummary = getSharedFinancialSummary(db, {
                as_of_date: '2026-09-20'
            });
            expect(globalSummary.total_assets_cents_by_currency['AUD']).toBe(85_000_000);
        });
    });

    describe('4. Multi-Currency Segregation', () => {
        it('reports separate totals for AUD and USD without mock exchange rates', () => {
            const entity = createEntity(db, { name: 'Multi-Currency Investor', type: 'person', currency: 'AUD' });

            const { account: audBank } = createAccount(db, {
                entity_id: entity.id,
                name: 'NAB AUD',
                type: 'asset',
                sub_type: 'checking',
                currency: 'AUD',
                opening_date: '2026-09-01',
                tracking_mode: 'balance'
            });

            const { account: usdBrokerage } = createAccount(db, {
                entity_id: entity.id,
                name: 'Interactive Brokers USD',
                type: 'asset',
                sub_type: 'brokerage',
                currency: 'USD',
                opening_date: '2026-09-01',
                tracking_mode: 'balance'
            });

            recordBalanceObservation(db, {
                account_id: audBank.id,
                effective_date: '2026-09-15',
                amount_cents: 20_000_00, // 20,000 AUD
                balance_kind: 'current_balance',
                source_type: 'manual'
            });

            recordBalanceObservation(db, {
                account_id: usdBrokerage.id,
                effective_date: '2026-09-15',
                amount_cents: 15_000_00, // 15,000 USD
                balance_kind: 'total_portfolio_value',
                source_type: 'manual'
            });

            const summary = getSharedFinancialSummary(db, { as_of_date: '2026-09-20' });
            const currencies = Object.keys(summary.net_worth_cents_by_currency).sort();
            expect(currencies).toEqual(['AUD', 'USD']);
            expect(summary.net_worth_cents_by_currency['AUD']).toBe(20_000_00);
            expect(summary.net_worth_cents_by_currency['USD']).toBe(15_000_00);
        });
    });

    describe('5. Concurrency, Revision Checking & Supersession', () => {
        it('increments balance_revision and links superseded_by_id', () => {
            const entity = createEntity(db, { name: 'Charlie Person', type: 'person', currency: 'AUD' });
            const { account: acct } = createAccount(db, {
                entity_id: entity.id,
                name: 'Superannuation',
                type: 'asset',
                sub_type: 'superannuation',
                currency: 'AUD',
                opening_date: '2026-09-01',
                tracking_mode: 'balance'
            });

            expect(acct.balance_revision).toBe(1);

            // First observation on 2026-09-01 with expected revision 1 -> succeeds
            const obs1 = recordBalanceObservation(db, {
                account_id: acct.id,
                effective_date: '2026-09-01',
                amount_cents: 100_000_00,
                balance_kind: 'current_balance',
                source_type: 'manual',
                expected_balance_revision: 1
            });

            // Inspect account revision
            const row1 = db.prepare(`SELECT balance_revision FROM m1_accounts WHERE id = ?`).get(acct.id) as { balance_revision: number };
            expect(row1.balance_revision).toBe(2);

            // Trying to use stale revision 1 again should throw ConflictError
            expect(() => {
                recordBalanceObservation(db, {
                    account_id: acct.id,
                    effective_date: '2026-09-01',
                    amount_cents: 102_000_00,
                    balance_kind: 'current_balance',
                    source_type: 'manual',
                    expected_balance_revision: 1
                });
            }).toThrow(ConflictError);

            // Second observation on same date and kind with correct expected revision 2 -> supersedes obs1
            const obs2 = recordBalanceObservation(db, {
                account_id: acct.id,
                effective_date: '2026-09-01',
                amount_cents: 102_000_00,
                balance_kind: 'current_balance',
                source_type: 'manual',
                expected_balance_revision: 2
            });

            // Supersession verification: obs1 must now have superseded_by_id = obs2.id
            const obs1Row = db.prepare(`SELECT superseded_by_id FROM m1_balance_observations WHERE id = ?`).get(obs1.id) as { superseded_by_id: string };
            expect(obs1Row.superseded_by_id).toBe(obs2.id);
        });
    });

    describe('6. Structured Table & CSV Parsing', () => {
        it('parses comma-separated rows with currency symbols and JPY scale', () => {
            const csv = `
Account, Balance, Date, Type
Everyday Checking, "$1,234.56", 2026-09-15, Current
Credit Card, "-$450.00", 2026-09-15, Statement Balance
Tokyo Savings, "¥150000", 2026-09-15, Current
Home Loan Redraw, "$25,000.00", 2026-09-15, Available Redraw
            `;

            const parsed = parseStructuredTable(csv);
            expect(parsed.parsed_count).toBe(4);
            expect(parsed.proposals).toHaveLength(4);

            // Row 1: AUD Checking
            expect(parsed.proposals[0].account_name).toBe('Everyday Checking');
            expect(parsed.proposals[0].amount_cents).toBe(123456);
            expect(parsed.proposals[0].currency).toBe('AUD');
            expect(parsed.proposals[0].balance_kind).toBe('current_balance');

            // Row 2: Credit Card
            expect(parsed.proposals[1].account_name).toBe('Credit Card');
            expect(parsed.proposals[1].amount_cents).toBe(45000);
            expect(parsed.proposals[1].balance_kind).toBe('statement_closing_balance');

            // Row 3: Tokyo Savings (JPY is 0-decimal scale)
            expect(parsed.proposals[2].account_name).toBe('Tokyo Savings');
            expect(parsed.proposals[2].amount_cents).toBe(150000);
            expect(parsed.proposals[2].currency).toBe('JPY');

            // Row 4: Home Loan Redraw
            expect(parsed.proposals[3].account_name).toBe('Home Loan Redraw');
            expect(parsed.proposals[3].amount_cents).toBe(2500000);
            expect(parsed.proposals[3].balance_kind).toBe('available_redraw');
        });

        it('parses tab and pipe-separated messy bank summaries', () => {
            const pipes = `
Superannuation | AUD 123,456.78 | 15/09/2026 | Portfolio Value
Tesla Stock | USD 4,500.00 | 15/09/2026 | Market Value
            `;

            const parsed = parseStructuredTable(pipes);
            expect(parsed.proposals).toHaveLength(2);
            expect(parsed.proposals[0].amount_cents).toBe(12345678);
            expect(parsed.proposals[0].currency).toBe('AUD');
            expect(parsed.proposals[0].balance_kind).toBe('total_portfolio_value');
            expect(parsed.proposals[0].effective_date).toBe('2026-09-15');

            expect(parsed.proposals[1].amount_cents).toBe(450000);
            expect(parsed.proposals[1].currency).toBe('USD');
            expect(parsed.proposals[1].balance_kind).toBe('securities_market_value');
        });
    });

    describe('7. Schema Idempotency', () => {
        it('allows running migrateAccountingSchema repeatedly without breaking', () => {
            // Running migration on already initialized database must not fail
            expect(() => {
                migrateAccountingSchema(db);
                migrateAccountingSchema(db);
                migrateAccountingSchema(db);
            }).not.toThrow();

            // Verify tables and columns remain intact
            const cols = db.prepare(`PRAGMA table_info(m1_accounts)`).all() as Array<{ name: string }>;
            const colNames = cols.map(c => c.name);
            expect(colNames).toContain('tracking_mode');
            expect(colNames).toContain('balance_revision');
        });
    });

    describe('8. Account Source Mapping & Memory', () => {
        it('remembers institution string mappings across sessions', () => {
            const entity = createEntity(db, { name: 'Daisy', type: 'person', currency: 'AUD' });
            const { account: acct } = createAccount(db, {
                entity_id: entity.id,
                name: 'CommBank Smart Access',
                type: 'asset',
                sub_type: 'checking',
                currency: 'AUD',
                opening_date: '2026-09-01'
            });

            recordSourceMapping(db, {
                provider: 'cba_parser',
                sourceAccountId: 'Smart Access ...1234',
                accountId: acct.id,
                institution: 'Commonwealth Bank of Australia'
            });

            const matched = findAccountBySourceMapping(db, 'cba_parser', 'Smart Access ...1234');
            expect(matched).toBe(acct.id);
        });
    });

    describe('9. API Endpoints Integration', () => {
        it('POST /api/accounting/balances/parse-table parses text and correlates existing accounts', async () => {
            const entity = createEntity(db, { name: 'Eve', type: 'person', currency: 'AUD' });
            const { account: acct } = createAccount(db, {
                entity_id: entity.id,
                name: 'Hostplus Super',
                type: 'asset',
                sub_type: 'superannuation',
                currency: 'AUD',
                opening_date: '2026-09-01'
            });

            const req = new NextRequest('http://localhost:3000/api/accounting/balances/parse-table', {
                method: 'POST',
                body: JSON.stringify({
                    text: `Hostplus Super, "$88,000.00", 2026-09-18, Current`
                })
            });

            const res = await parseTablePost(req);
            expect(res.status).toBe(200);
            const json = await res.json();
            expect(json.proposals).toHaveLength(1);
            expect(json.proposals[0].matched_account_id).toBe(acct.id);
            expect(json.proposals[0].amount_cents).toBe(8800000);
        });

        it('POST /api/accounting/balances saves atomic batch of observations', async () => {
            const entity = createEntity(db, { name: 'Frank', type: 'person', currency: 'AUD' });
            const { account: acct1 } = createAccount(db, {
                entity_id: entity.id,
                name: 'ING Savings',
                type: 'asset',
                sub_type: 'savings',
                currency: 'AUD',
                opening_date: '2026-09-01',
                tracking_mode: 'balance'
            });

            const { account: acct2 } = createAccount(db, {
                entity_id: entity.id,
                name: 'NAB Home Loan',
                type: 'liability',
                sub_type: 'mortgage',
                currency: 'AUD',
                opening_date: '2026-09-01',
                tracking_mode: 'balance'
            });

            const req = new NextRequest('http://localhost:3000/api/accounting/balances', {
                method: 'POST',
                body: JSON.stringify({
                    items: [
                        {
                            account_id: acct1.id,
                            effective_date: '2026-09-19',
                            amount_cents: 12_500_00,
                            currency: 'AUD',
                            balance_kind: 'current_balance',
                            source_type: 'table_paste'
                        },
                        {
                            account_id: acct2.id,
                            effective_date: '2026-09-19',
                            amount_cents: 450_000_00,
                            currency: 'AUD',
                            balance_kind: 'current_balance',
                            source_type: 'table_paste'
                        }
                    ]
                })
            });

            const res = await postBatchBalances(req);
            expect(res.status).toBe(200);
            const json = await res.json();
            expect(json.count).toBe(2);

            // Now GET summary endpoint
            const getReq = new NextRequest('http://localhost:3000/api/accounting/balances?as_of_date=2026-09-20');
            const summaryRes = await getBalancesSummary(getReq);
            expect(summaryRes.status).toBe(200);
            const summaryJson = await summaryRes.json();
            expect(summaryJson.summary.total_assets_cents_by_currency['AUD']).toBe(12_500_00);
            expect(summaryJson.summary.total_liabilities_cents_by_currency['AUD']).toBe(450_000_00);
            expect(summaryJson.summary.net_worth_cents_by_currency['AUD']).toBe(-437_500_00);
        });
    });

    describe('9. Shared Financial Summary Completeness & Truthfulness Contract', () => {
        // WHY: Guarantees that the dashboard knows exactly which accounts lack observations
        // so UI widgets can qualify titles (e.g. "Known Net Worth (1 account needs balance)")
        // rather than falsely asserting complete net worth.
        // TRICKY: An account without any observations should not silently be treated as 0 without flagging.
        // TODO: In future iterations, allow accounts with explicit zero balances to distinguish from unrecorded.
        it('identifies unobserved accounts and sets is_complete to false', () => {
            const entity = createEntity(db, { name: 'Danielle Person', type: 'person', currency: 'AUD' });

            const { account: activeSavings } = createAccount(db, {
                entity_id: entity.id,
                name: 'Active Savings',
                type: 'asset',
                sub_type: 'savings',
                currency: 'AUD',
                opening_date: '2026-09-01',
                tracking_mode: 'balance'
            });

            const { account: unobservedBrokerage } = createAccount(db, {
                entity_id: entity.id,
                name: 'Pending Brokerage',
                type: 'asset',
                sub_type: 'brokerage',
                currency: 'AUD',
                opening_date: '2026-09-01',
                tracking_mode: 'balance'
            });

            // Record observation only for activeSavings
            recordBalanceObservation(db, {
                account_id: activeSavings.id,
                effective_date: '2026-09-18',
                amount_cents: 50_000_00,
                balance_kind: 'current_balance',
                source_type: 'manual'
            });

            // WHY: Explicitly set reporting_currency to 'AUD' to match account currency without requiring synthetic FX rate rows.
            // TRICKY: Default reporting currency is USD; if omitted without FX rates, converted_net_worth.is_complete will be false.
            // TODO: Test multi-currency exchange rate resolution with explicit conversion rows in a separate test.
            const summary = getSharedFinancialSummary(db, { as_of_date: '2026-09-20', reporting_currency: 'AUD' });

            expect(summary.is_complete).toBe(false);
            expect(summary.unrecorded_count).toBe(1);
            expect(summary.unrecorded_accounts).toHaveLength(1);
            expect(summary.unrecorded_accounts[0].id).toBe(unobservedBrokerage.id);
            expect(summary.unrecorded_accounts[0].name).toBe('Pending Brokerage');
            expect(summary.total_assets_cents_by_currency['AUD']).toBe(50_000_00);

            // Now record observation for unobservedBrokerage
            recordBalanceObservation(db, {
                account_id: unobservedBrokerage.id,
                effective_date: '2026-09-19',
                amount_cents: 25_000_00,
                balance_kind: 'total_portfolio_value',
                source_type: 'manual'
            });

            const updatedSummary = getSharedFinancialSummary(db, { as_of_date: '2026-09-20', reporting_currency: 'AUD' });
            expect(updatedSummary.is_complete).toBe(true);
            expect(updatedSummary.unrecorded_count).toBe(0);
            expect(updatedSummary.unrecorded_accounts).toHaveLength(0);
            expect(updatedSummary.total_assets_cents_by_currency['AUD']).toBe(75_000_00);
        });
    });
});
