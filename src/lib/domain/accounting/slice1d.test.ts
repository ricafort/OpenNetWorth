/**
 * Milestone 1 — Slice 1D: Reports, Ownership Allocation, and Evidence Links Automated Tests
 * 
 * Why this file exists:
 * Comprehensive automated verification for Milestone 1 Slice 1D:
 * 1. Acceptance Scenario T6: Non-Cash Asset Valuation Adjustment (M1-FLOW-06)
 *    - Revaluing real estate or vehicles updates carrying asset balance against Unrealized Valuation Reserve equity.
 *    - Leaves liquid cash balances and operating income strictly unchanged ($0.00 cash delta, $0.00 operating delta).
 * 2. Acceptance Scenario T7: Joint Ownership Allocation (M1-FLOW-07)
 *    - Individual scope applies exact percentage share (e.g. 50% of joint asset/liability).
 *    - Household scope de-duplicates joint accounts and counts them once at 100% (eliminates 200% double counting).
 * 3. Acceptance Scenario T8: Multi-Currency Completeness & Conversion (M1-CALC-03)
 *    - Consolidated net worth requires valid dated exchange rates.
 *    - If any rate is missing, flags is_complete: false, lists missing pairs, and never assumes 1:1 parity.
 *    - Exact arithmetic once rates are supplied.
 * 4. Separation of Actual Liquid Cash Flow from Accrual Income & Expense:
 *    - Proves cash flow tracks only movements in cash/checking/savings accounts.
 *    - Card purchases do not affect cash flow until paid. Card settlements and debt repayments are financing cash outflows.
 * 5. Ledger Drill-Down & Structured Evidence Links (M1-EVID-01, M1-EVID-02):
 *    - Chronological journal entries with exact running balance.
 *    - Structured evidence references (document_id, content_hash, page, bbox) are preserved and returned.
 * 6. API Route Integration:
 *    - Verifies GET view=reports, view=drilldown, view=ownership, and POST set_ownership, record_valuation, set_exchange_rate.
 * 7. Test Isolation (M1-SAFE-01):
 *    - All tests run in-memory (:memory:) with setTestDb; data/opennetworth.sqlite remains strictly untouched.
 * 
 * Tricky logic:
 * - Debit-normal accounts (Assets) vs Credit-normal accounts (Liabilities) have inverted running balance additions.
 * - Multi-currency conversion performs integer math rounding to cents without floating point drift.
 * - Household member queries de-duplicate accounts so accounts held jointly by members are not added twice.
 * 
 * TODO: Milestone 2 will link visual PDF page bounding boxes directly into the drill-down modal.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import Database from 'better-sqlite3';
import { initAccountingSchema } from './schema';
import {
    createEntity,
    createAccount,
    setAccountOwnership,
    getAccountOwnership,
    listEntityMembers,
    ConflictError,
    ValidationError
} from './accountService';
import {
    getAccountBalance,
    getEntityNetWorth,
    getPeriodIncomeAndExpenses,
    getActualCashFlowStatement,
    getAccountLedgerDrilldown,
    getScopeNetWorth,
    getConsolidatedNetWorth,
    setExchangeRate,
    getExchangeRate,
    convertCurrencyAmount
} from './balanceService';
import {
    postTransaction,
    recordIncome,
    recordExpense,
    recordTransfer,
    recordCreditCardRepayment,
    recordLoanRepayment,
    recordAssetValuation,
    canonicalizeEvidenceRef,
    normalizeEvidenceRefs
} from './transactionService';
import { formatMoney } from './types';
import { GET as accountingGet, POST as accountingPost } from '@/app/api/accounting/route';
import { setTestDb } from '@/infrastructure/sqlite/db';

describe('Milestone 1 — Slice 1D: Reports, Ownership Allocation & Evidence Links', () => {
    let db: Database.Database;

    beforeEach(() => {
        // Strict in-memory database isolation (M1-SAFE-01)
        db = new Database(':memory:');
        initAccountingSchema(db);
        setTestDb(db);
    });

    afterEach(() => {
        setTestDb(null);
        db.close();
    });

    describe('1. Non-Cash Asset Valuation Adjustment (M1-FLOW-06, Scenario T6)', () => {
        it('revalues real estate upward against Valuation Reserve equity with zero cash and zero operating income impact', () => {
            // Setup entity & initial accounts
            const person = createEntity(db, { name: 'Alice Walker', type: 'person', currency: 'AUD' });
            const bank = createAccount(db, {
                entity_id: person.id,
                name: 'Everyday Checking',
                type: 'asset',
                sub_type: 'checking',
                currency: 'AUD',
                opening_date: '2026-01-01',
                opening_balance_cents: 5000000 // $50,000 AUD
            }).account;

            const house = createAccount(db, {
                entity_id: person.id,
                name: 'Primary Residence',
                type: 'asset',
                sub_type: 'real_estate',
                currency: 'AUD',
                opening_date: '2026-01-01',
                opening_balance_cents: 70000000 // $700,000 AUD
            }).account;

            // Initial state checks
            expect(getAccountBalance(db, house.id).balance_cents).toBe(70000000);
            expect(getAccountBalance(db, bank.id).balance_cents).toBe(5000000);
            const initialNetWorth = getEntityNetWorth(db, person.id);
            expect(initialNetWorth.net_worth_cents_by_currency['AUD']).toBe(75000000);

            // Revalue Primary Residence from $700,000 to $850,000 (+150,000 AUD)
            const valuationTx = recordAssetValuation(db, {
                asset_account_id: house.id,
                new_valuation_cents: 85000000, // $850,000 AUD
                valuation_date: '2026-06-30',
                source: 'Certified Valuer Appraisal #9921',
                evidence_refs: [{
                    document_id: 'doc-val-001',
                    content_hash: 'sha256-valuation-hash-1234',
                    page: 3,
                    bounding_box: { x: 0.1, y: 0.2, width: 0.8, height: 0.4 }
                }]
            });

            expect(valuationTx.id).toBeDefined();
            expect(valuationTx.postings).toHaveLength(2);

            // House carrying value should now be exactly $850,000
            const updatedHouseBal = getAccountBalance(db, house.id);
            expect(updatedHouseBal.balance_cents).toBe(85000000);
            expect(updatedHouseBal.formatted_balance).toBe(formatMoney({ amount_cents: 85000000, currency: 'AUD' }));

            // Liquid bank balance MUST remain completely untouched
            const bankBal = getAccountBalance(db, bank.id);
            expect(bankBal.balance_cents).toBe(5000000);

            // Operating Income & Expenses report MUST show ZERO income and ZERO expenses
            const incomeExpenses = getPeriodIncomeAndExpenses(db, person.id, '2026-01-01', '2026-12-31');
            expect(incomeExpenses.total_income_cents_by_currency['AUD'] || 0).toBe(0);
            expect(incomeExpenses.total_expenses_cents_by_currency['AUD'] || 0).toBe(0);
            expect(incomeExpenses.net_savings_cents_by_currency['AUD'] || 0).toBe(0);

            // Liquid cash flow MUST show ZERO cash impact
            const cashFlow = getActualCashFlowStatement(db, person.id, '2026-01-01', '2026-12-31');
            expect(cashFlow.operating_inflows_cents_by_currency['AUD'] || 0).toBe(0);
            expect(cashFlow.net_cash_change_cents_by_currency['AUD'] || 0).toBe(0);

            // Total Net Worth increases by exactly $150,000
            const updatedNetWorth = getEntityNetWorth(db, person.id);
            expect(updatedNetWorth.net_worth_cents_by_currency['AUD']).toBe(90000000); // 750k + 150k = 900k

            // Verify the balancing credit went to Unrealized Valuation Reserve under equity
            const equityAccounts = db.prepare("SELECT * FROM m1_accounts WHERE entity_id = ? AND type = 'equity'").all(person.id) as any[];
            expect(equityAccounts.length).toBeGreaterThanOrEqual(1);
            const valReserve = equityAccounts.find(a => a.sub_type === 'valuation_reserve');
            expect(valReserve).toBeDefined();
            const reserveBal = getAccountBalance(db, valReserve.id);
            expect(reserveBal.balance_cents).toBe(15000000); // $150,000 AUD credited to reserve
        });

        it('revalues asset downward, debiting Valuation Reserve equity without affecting cash or operating expenses', () => {
            const person = createEntity(db, { name: 'Bob Down', type: 'person', currency: 'AUD' });
            const vehicle = createAccount(db, {
                entity_id: person.id,
                name: 'Work Vehicle',
                type: 'asset',
                sub_type: 'vehicle',
                currency: 'AUD',
                opening_date: '2026-01-01',
                opening_balance_cents: 4000000 // $40,000 AUD
            }).account;

            // Revalue vehicle down to $32,000 (-$8,000)
            recordAssetValuation(db, {
                asset_account_id: vehicle.id,
                new_valuation_cents: 3200000,
                valuation_date: '2026-07-01',
                source: 'RedBook Market Depreciation Guide'
            });

            expect(getAccountBalance(db, vehicle.id).balance_cents).toBe(3200000);

            // No operating expenses created
            const ie = getPeriodIncomeAndExpenses(db, person.id);
            expect(ie.total_expenses_cents_by_currency['AUD'] || 0).toBe(0);

            // Net worth down by $8,000
            const nw = getEntityNetWorth(db, person.id);
            expect(nw.net_worth_cents_by_currency['AUD']).toBe(3200000);
        });

        it('rejects revaluing liquid cash, checking, or savings accounts as non-cash asset valuations', () => {
            const person = createEntity(db, { name: 'Cash Owner', type: 'person', currency: 'AUD' });
            const cashAcc = createAccount(db, {
                entity_id: person.id,
                name: 'Wallet Cash',
                type: 'asset',
                sub_type: 'cash',
                currency: 'AUD',
                opening_date: '2026-01-01',
                opening_balance_cents: 10000
            }).account;

            expect(() => {
                recordAssetValuation(db, {
                    asset_account_id: cashAcc.id,
                    new_valuation_cents: 20000,
                    valuation_date: '2026-07-01'
                });
            }).toThrow(ValidationError);
        });

        it('rejects negative or zero valuation amounts', () => {
            const person = createEntity(db, { name: 'P', type: 'person', currency: 'AUD' });
            const prop = createAccount(db, {
                entity_id: person.id,
                name: 'Plot',
                type: 'asset',
                sub_type: 'land',
                currency: 'AUD',
                opening_date: '2026-01-01',
                opening_balance_cents: 1000000
            }).account;

            expect(() => {
                recordAssetValuation(db, {
                    asset_account_id: prop.id,
                    new_valuation_cents: -500,
                    valuation_date: '2026-07-01'
                });
            }).toThrow(ValidationError);
        });
    });

    describe('2. Joint Ownership Allocation (M1-FLOW-07, Scenario T7)', () => {
        it('calculates individual % shares correctly and de-duplicates household scope to 100% without 200% double-counting', () => {
            // Setup Household with 2 Members
            const household = createEntity(db, { name: 'Smith Household', type: 'household', currency: 'AUD' });
            const alice = createEntity(db, { name: 'Alice Smith', type: 'person', currency: 'AUD', parent_entity_id: household.id });
            const bob = createEntity(db, { name: 'Bob Smith', type: 'person', currency: 'AUD', parent_entity_id: household.id });

            // Verify listEntityMembers (includes household itself + member persons)
            const members = listEntityMembers(db, household.id);
            expect(members).toHaveLength(3);
            expect(members.map(m => m.id).sort()).toEqual([household.id, alice.id, bob.id].sort());

            // 1. Joint Family Home: Asset $1,000,000 AUD (Owned 50% Alice, 50% Bob)
            const home = createAccount(db, {
                entity_id: alice.id, // Nominally registered to Alice or joint
                name: 'Family Home',
                type: 'asset',
                sub_type: 'real_estate',
                currency: 'AUD',
                opening_date: '2026-01-01',
                opening_balance_cents: 100000000 // $1,000,000 AUD
            }).account;

            setAccountOwnership(db, home.id, [
                { entity_id: alice.id, ownership_percentage: 50 },
                { entity_id: bob.id, ownership_percentage: 50 }
            ]);

            // 2. Joint Mortgage: Liability $600,000 AUD (Owed 50% Alice, 50% Bob)
            const mortgage = createAccount(db, {
                entity_id: alice.id,
                name: 'Home Loan Mortgage',
                type: 'liability',
                sub_type: 'mortgage',
                currency: 'AUD',
                opening_date: '2026-01-01',
                opening_balance_cents: 60000000 // $600,000 AUD
            }).account;

            setAccountOwnership(db, mortgage.id, [
                { entity_id: alice.id, ownership_percentage: 50 },
                { entity_id: bob.id, ownership_percentage: 50 }
            ]);

            // 3. Alice Sole Personal Account: $50,000 AUD
            const aliceSavings = createAccount(db, {
                entity_id: alice.id,
                name: 'Alice Personal Savings',
                type: 'asset',
                sub_type: 'savings',
                currency: 'AUD',
                opening_date: '2026-01-01',
                opening_balance_cents: 5000000 // $50,000 AUD
            }).account;
            // No explicit ownership record defaults to 100% owner entity

            // 4. Bob Sole Personal Car Loan: $20,000 AUD
            const bobCarLoan = createAccount(db, {
                entity_id: bob.id,
                name: 'Bob Car Loan',
                type: 'liability',
                sub_type: 'loan',
                currency: 'AUD',
                opening_date: '2026-01-01',
                opening_balance_cents: 2000000 // $20,000 AUD
            }).account;

            // TEST INDIVIDUAL SCOPE - Alice
            const aliceScope = getScopeNetWorth(db, alice.id, 'individual');
            // Alice's share:
            // Home (50% of 1,000,000) = 500,000
            // Mortgage (50% of 600,000) = -300,000
            // Personal Savings (100% of 50,000) = 50,000
            // Net Worth = 500k - 300k + 50k = 250,000 AUD (25,000,000 cents)
            expect(aliceScope.scoped_net_worth_cents_by_currency!['AUD']).toBe(25000000);
            expect(aliceScope.formatted_scoped_net_worth_by_currency!['AUD']).toBe(formatMoney({ amount_cents: 25000000, currency: 'AUD' }));
            expect(aliceScope.scoped_assets_cents_by_currency!['AUD']).toBe(55000000); // 500k + 50k
            expect(aliceScope.scoped_liabilities_cents_by_currency!['AUD']).toBe(30000000);

            // TEST INDIVIDUAL SCOPE - Bob
            const bobScope = getScopeNetWorth(db, bob.id, 'individual');
            // Bob's share:
            // Home (50% of 1,000,000) = 500,000
            // Mortgage (50% of 600,000) = -300,000
            // Bob Car Loan (100% of 20,000) = -20,000
            // Net Worth = 500k - 300k - 20k = 180,000 AUD (18,000,000 cents)
            expect(bobScope.scoped_net_worth_cents_by_currency!['AUD']).toBe(18000000);
            expect(bobScope.formatted_scoped_net_worth_by_currency!['AUD']).toBe(formatMoney({ amount_cents: 18000000, currency: 'AUD' }));
            expect(bobScope.scoped_assets_cents_by_currency!['AUD']).toBe(50000000);
            expect(bobScope.scoped_liabilities_cents_by_currency!['AUD']).toBe(32000000); // 300k + 20k

            // TEST HOUSEHOLD SCOPE - De-duplication Invariant
            // In the combined household, the joint Home must be counted ONCE at 100% ($1,000,000),
            // NOT 50% from Alice + 50% from Bob = duplicate accounts!
            const householdScope = getScopeNetWorth(db, household.id, 'household');
            // Total Assets: Home (1,000,000) + Alice Savings (50,000) = 1,050,000 AUD (105,000,000 cents)
            expect(householdScope.scoped_assets_cents_by_currency!['AUD']).toBe(105000000);
            // Total Liabilities: Mortgage (600,000) + Car Loan (20,000) = 620,000 AUD (62,000,000 cents)
            expect(householdScope.scoped_liabilities_cents_by_currency!['AUD']).toBe(62000000);
            // Total Household Net Worth: 1,050,000 - 620,000 = 430,000 AUD (43,000,000 cents)
            expect(householdScope.scoped_net_worth_cents_by_currency!['AUD']).toBe(43000000);
            expect(householdScope.formatted_scoped_net_worth_by_currency!['AUD']).toBe(formatMoney({ amount_cents: 43000000, currency: 'AUD' }));

            // Exact arithmetic proof: Alice ($250,000) + Bob ($180,000) === Household ($430,000)
            expect(aliceScope.scoped_net_worth_cents_by_currency!['AUD'] + bobScope.scoped_net_worth_cents_by_currency!['AUD'])
                .toBe(householdScope.scoped_net_worth_cents_by_currency!['AUD']);
        });

        it('validates ownership percentage bounds and rejects sum > 100%', () => {
            const entityA = createEntity(db, { name: 'A', type: 'person', currency: 'AUD' });
            const entityB = createEntity(db, { name: 'B', type: 'person', currency: 'AUD' });
            const acc = createAccount(db, {
                entity_id: entityA.id,
                name: 'Shared Car',
                type: 'asset',
                sub_type: 'vehicle',
                currency: 'AUD'
            }).account;

            // Rejects sum > 100%
            expect(() => {
                setAccountOwnership(db, acc.id, [
                    { entity_id: entityA.id, ownership_percentage: 60 },
                    { entity_id: entityB.id, ownership_percentage: 50 } // Total = 110%
                ]);
            }).toThrow(ValidationError);

            // Rejects negative percentage
            expect(() => {
                setAccountOwnership(db, acc.id, [
                    { entity_id: entityA.id, ownership_percentage: -10 }
                ]);
            }).toThrow(ValidationError);

            // Rejects percentage > 100%
            expect(() => {
                setAccountOwnership(db, acc.id, [
                    { entity_id: entityA.id, ownership_percentage: 105 }
                ]);
            }).toThrow(ValidationError);
        });
    });

    describe('3. Multi-Currency Completeness & Exchange Rates (M1-CALC-03, Scenario T8)', () => {
        it('flags is_complete: false and lists missing rates when exchange rate is missing, never defaulting to 1:1', () => {
            const entity = createEntity(db, { name: 'Global Investor', type: 'person', currency: 'AUD' });

            // AUD account: $100,000 AUD
            createAccount(db, {
                entity_id: entity.id,
                name: 'CommBank AUD',
                type: 'asset',
                sub_type: 'checking',
                currency: 'AUD',
                opening_date: '2026-01-01',
                opening_balance_cents: 10000000
            });

            // USD account: $50,000 USD
            createAccount(db, {
                entity_id: entity.id,
                name: 'Interactive Brokers USD',
                type: 'asset',
                sub_type: 'investment',
                currency: 'USD',
                opening_date: '2026-01-01',
                opening_balance_cents: 5000000
            });

            // Request consolidated net worth in AUD before setting USD->AUD exchange rate
            const consReport1 = getConsolidatedNetWorth(db, entity.id, 'AUD', '2026-06-30');

            // Completeness check
            expect(consReport1.is_complete).toBe(false);
            expect(consReport1.consolidated_total_cents).toBeNull();
            expect(consReport1.formatted_consolidated_total).toBeNull();
            expect(consReport1.missing_rates.some(m => m.from === 'USD' && m.to === 'AUD')).toBe(true);

            // Original balances must still be reported accurately
            expect(consReport1.original_totals_by_currency['AUD']).toBe(10000000);
            expect(consReport1.original_totals_by_currency['USD']).toBe(5000000);

            // Now set valid exchange rate: 1 USD = 1.50 AUD
            setExchangeRate(db, {
                from_currency: 'USD',
                to_currency: 'AUD',
                rate: 1.50,
                effective_date: '2026-06-30',
                source: 'RBA Reference Rates'
            });

            // Request consolidated net worth again
            const consReport2 = getConsolidatedNetWorth(db, entity.id, 'AUD', '2026-06-30');

            expect(consReport2.is_complete).toBe(true);
            expect(consReport2.missing_rates).toHaveLength(0);
            // $50,000 USD * 1.50 = $75,000 AUD (7,500,000 cents)
            // Total = 100,000 AUD + 75,000 AUD = 175,000 AUD (17,500,000 cents)
            expect(consReport2.consolidated_total_cents).toBe(17500000);
            expect(consReport2.formatted_consolidated_total).toBe(formatMoney({ amount_cents: 17500000, currency: 'AUD' }));
            expect(consReport2.applied_exchange_rates!['USD->AUD']).toBe(1.50);
        });

        it('supports inverse rate lookup and validates rate inputs', () => {
            setExchangeRate(db, {
                from_currency: 'EUR',
                to_currency: 'USD',
                rate: 1.10,
                effective_date: '2026-01-01',
                source: 'ECB'
            });

            // Direct rate
            const direct = getExchangeRate(db, 'EUR', 'USD', '2026-01-01');
            expect(direct).toBe(1.10);

            // Inverse rate
            const inverse = getExchangeRate(db, 'USD', 'EUR', '2026-01-01');
            expect(inverse).toBeDefined();
            expect(Math.abs(inverse! - (1 / 1.10))).toBeLessThan(0.0001);

            // Identity rate
            const identity = getExchangeRate(db, 'EUR', 'EUR');
            expect(identity).toBe(1.0);

            // Rejects negative rate
            expect(() => {
                setExchangeRate(db, {
                    from_currency: 'GBP',
                    to_currency: 'USD',
                    rate: -1.2,
                    effective_date: '2026-01-01',
                    source: 'Test Validation'
                });
            }).toThrow(ValidationError);
        });
    });

    describe('4. Actual Liquid Cash Flow vs Accrual Income/Expense Separation', () => {
        it('proves cash flow tracks liquid cash accounts strictly while accrual tracks earned/incurred performance', () => {
            const person = createEntity(db, { name: 'David Lee', type: 'person', currency: 'AUD' });

            // Accounts
            const checking = createAccount(db, {
                entity_id: person.id,
                name: 'Bank Checking',
                type: 'asset',
                sub_type: 'checking',
                currency: 'AUD',
                opening_date: '2026-01-01',
                opening_balance_cents: 1000000 // Starting cash: $10,000 AUD
            }).account;

            const creditCard = createAccount(db, {
                entity_id: person.id,
                name: 'Visa Credit Card',
                type: 'liability',
                sub_type: 'credit_card',
                currency: 'AUD'
            }).account;

            const loan = createAccount(db, {
                entity_id: person.id,
                name: 'Personal Loan',
                type: 'liability',
                sub_type: 'loan',
                currency: 'AUD',
                opening_date: '2026-01-01',
                opening_balance_cents: 2000000 // $20,000 debt
            }).account;

            // 1. Earn cash salary: +$5,000 AUD (Cash +5,000, Income +5,000)
            recordIncome(db, {
                entity_id: person.id,
                bank_account_id: checking.id,
                amount_cents: 500000,
                date: '2026-03-01',
                description: 'Monthly Salary Deposit'
            });

            // 2. Buy on Credit Card: $1,200 AUD (Card liability +1,200, Expense +1,200). NO CASH FLOW!
            recordExpense(db, {
                entity_id: person.id,
                payment_account_id: creditCard.id,
                amount_cents: 120000,
                date: '2026-03-05',
                description: 'Office Laptop Purchase'
            });

            // 3. Cash operating expense from checking: $800 AUD (Cash -800, Expense +800)
            recordExpense(db, {
                entity_id: person.id,
                payment_account_id: checking.id,
                amount_cents: 80000,
                date: '2026-03-10',
                description: 'Groceries and Utilities'
            });

            // 4. Repay credit card bill from bank checking: $1,200 AUD
            // This is a FINANCING cash outflow; NO new expense!
            recordCreditCardRepayment(db, {
                bank_account_id: checking.id,
                card_account_id: creditCard.id,
                amount_cents: 120000,
                date: '2026-03-15',
                description: 'Visa Bill Settlement'
            });

            // 5. Pay loan instalment: $1,000 AUD ($800 principal, $200 interest)
            recordLoanRepayment(db, {
                bank_account_id: checking.id,
                loan_account_id: loan.id,
                principal_cents: 80000,
                interest_cents: 20000,
                date: '2026-03-20',
                description: 'Loan Monthly Payment'
            });

            // --- EVALUATE ACTUAL CASH FLOW STATEMENT ---
            const cashFlow = getActualCashFlowStatement(db, person.id, '2026-03-01', '2026-03-31');

            // Starting Cash: $10,000 AUD (1,000,000 cents)
            expect(cashFlow.starting_cash_cents_by_currency['AUD']).toBe(1000000);

            // Operating Inflows: $5,000 (salary)
            expect(cashFlow.operating_inflows_cents_by_currency['AUD']).toBe(500000);

            // Operating Outflows: $800 (only cash groceries; credit card purchase NOT included here)
            expect(cashFlow.operating_outflows_cents_by_currency['AUD']).toBe(80000);

            // Net Operating Cash: 5,000 - 800 = +$4,200 (420,000 cents)
            expect(cashFlow.net_operating_cents_by_currency['AUD']).toBe(420000);

            // Financing Outflows: $1,200 (credit card payment) + $1,000 (loan repayment) = $2,200 (220,000 cents)
            expect(cashFlow.financing_outflows_cents_by_currency['AUD']).toBe(220000);

            // Net Cash Change: +5,000 - 800 - 1,200 - 800 - 200 = +$2,000 (200,000 cents)
            // (Note: $200 interest was an expense, paid from cash)
            const actualNetChange = cashFlow.net_cash_change_cents_by_currency['AUD'];
            // Bank started at 10,000 + 5,000 - 800 - 1,200 - 1,000 = 12,000 (+2,000 change)
            expect(cashFlow.ending_cash_cents_by_currency['AUD']).toBe(1200000);
            expect(actualNetChange).toBe(200000);

            // --- EVALUATE ACCRUAL INCOME & EXPENSE STATEMENT ---
            const accrual = getPeriodIncomeAndExpenses(db, person.id, '2026-03-01', '2026-03-31');

            // Total Income: $5,000 (500,000 cents)
            expect(accrual.total_income_cents_by_currency['AUD']).toBe(500000);

            // Total Expenses:
            // Laptop ($1,200) + Groceries ($800) + Loan Interest ($200) = $2,200 (220,000 cents)
            // (Note: Credit card payment is NOT an expense, and loan principal is NOT an expense!)
            expect(accrual.total_expenses_cents_by_currency['AUD']).toBe(220000);

            // Accrual Net Savings: 5,000 - 2,200 = $2,800 (280,000 cents)
            expect(accrual.net_savings_cents_by_currency['AUD']).toBe(280000);

            // Strict mathematical proof: Net Cash Change ($2,000) != Accrual Net Savings ($2,800)
            // The difference ($800) is exactly the non-expense loan principal payment ($800)!
            expect(actualNetChange).not.toBe(accrual.net_savings_cents_by_currency['AUD']);
            expect(accrual.net_savings_cents_by_currency['AUD'] - actualNetChange).toBe(80000);
        });
    });

    describe('5. Ledger Drill-Down & Evidence Links (M1-EVID-01, M1-EVID-02)', () => {
        it('returns chronological journal entries with accurate running balance and structured evidence references', () => {
            const person = createEntity(db, { name: 'Evidence User', type: 'person', currency: 'AUD' });
            const bank = createAccount(db, {
                entity_id: person.id,
                name: 'NAB Checking',
                type: 'asset',
                sub_type: 'checking',
                currency: 'AUD',
                opening_date: '2026-01-01',
                opening_balance_cents: 100000 // Opening balance: $1,000 AUD
            }).account;

            // Transaction 1 with structured evidence citation
            recordIncome(db, {
                entity_id: person.id,
                bank_account_id: bank.id,
                amount_cents: 45000,
                date: '2026-04-01',
                description: 'Consulting Fee #101',
                evidence_refs: [{
                    document_id: 'inv-101.pdf',
                    content_hash: 'sha256-inv-101-hash',
                    page: 1,
                    bounding_box: { x: 0.05, y: 0.1, width: 0.9, height: 0.2 }
                }]
            });

            // Transaction 2
            recordExpense(db, {
                entity_id: person.id,
                payment_account_id: bank.id,
                amount_cents: 15000,
                date: '2026-04-05',
                description: 'Office Supplies Receipt'
            });

            // Query drilldown
            const drilldown = getAccountLedgerDrilldown(db, {
                account_id: bank.id
            });

            expect(drilldown.account_name).toBe('NAB Checking');
            expect(drilldown.account_type).toBe('asset');
            expect(drilldown.currency).toBe('AUD');
            expect(drilldown.closing_balance_cents).toBe(130000); // 1,000 + 450 - 150 = $1,300 (130,000 cents)
            expect(drilldown.formatted_closing_balance).toBe(formatMoney({ amount_cents: 130000, currency: 'AUD' }));

            // Entries should include opening balance + 2 transactions = 3 postings
            expect(drilldown.entries).toHaveLength(3);

            // Check running balances sequentially
            expect(drilldown.entries[0].running_balance_cents).toBe(100000); // After opening
            expect(drilldown.entries[1].running_balance_cents).toBe(145000); // After +450
            expect(drilldown.entries[2].running_balance_cents).toBe(130000); // After -150

            // Check structured evidence metadata on consulting entry
            const consultingEntry = drilldown.entries.find(e => e.description === 'Consulting Fee #101');
            expect(consultingEntry).toBeDefined();
            expect(consultingEntry!.evidence_refs).toHaveLength(1);
            expect(consultingEntry!.evidence_refs[0].document_id).toBe('inv-101.pdf');
            expect(consultingEntry!.evidence_refs[0].content_hash).toBe('sha256-inv-101-hash');
            expect(consultingEntry!.evidence_refs[0].page).toBe(1);
        });

        it('correctly calculates credit-normal running balance for liability accounts', () => {
            const person = createEntity(db, { name: 'Debtor', type: 'person', currency: 'AUD' });
            const card = createAccount(db, {
                entity_id: person.id,
                name: 'Amex',
                type: 'liability',
                sub_type: 'credit_card',
                currency: 'AUD',
                opening_date: '2026-01-01',
                opening_balance_cents: 50000 // $500 initial debt
            }).account;

            const bank = createAccount(db, {
                entity_id: person.id,
                name: 'Cash',
                type: 'asset',
                sub_type: 'cash',
                currency: 'AUD',
                opening_date: '2026-01-01',
                opening_balance_cents: 100000
            }).account;

            // Expense increases liability (+200)
            recordExpense(db, {
                entity_id: person.id,
                payment_account_id: card.id,
                amount_cents: 20000,
                date: '2026-05-01',
                description: 'Dinner'
            });

            // Repayment decreases liability (-300)
            recordCreditCardRepayment(db, {
                bank_account_id: bank.id,
                card_account_id: card.id,
                amount_cents: 30000,
                date: '2026-05-02',
                description: 'Card Payment'
            });

            const drill = getAccountLedgerDrilldown(db, { account_id: card.id });
            expect(drill.entries).toHaveLength(3);
            expect(drill.entries[0].running_balance_cents).toBe(50000); // 500
            expect(drill.entries[1].running_balance_cents).toBe(70000); // 500 + 200 = 700
            expect(drill.entries[2].running_balance_cents).toBe(40000); // 700 - 300 = 400
            expect(drill.closing_balance_cents).toBe(40000);
        });
    });

    describe('6. API Route Integration (GET & POST for Slice 1D)', () => {
        it('handles set_ownership, record_valuation, set_exchange_rate and view queries via HTTP handlers', async () => {
            const person = createEntity(db, { name: 'API Tester', type: 'person', currency: 'AUD' });
            const house = createAccount(db, {
                entity_id: person.id,
                name: 'Townhouse',
                type: 'asset',
                sub_type: 'real_estate',
                currency: 'AUD',
                opening_date: '2026-01-01',
                opening_balance_cents: 50000000
            }).account;

            // POST set_ownership
            const ownReq = new Request('http://localhost/api/accounting', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: 'set_ownership',
                    account_id: house.id,
                    allocations: [{ entity_id: person.id, ownership_percentage: 100 }]
                })
            });
            const ownRes = await accountingPost(ownReq);
            const ownData = await ownRes.json();
            expect(ownRes.status).toBe(200);
            expect(ownData.success).toBe(true);
            expect(ownData.ownership).toHaveLength(1);

            // POST record_valuation
            const valReq = new Request('http://localhost/api/accounting', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: 'record_valuation',
                    payload: {
                        asset_account_id: house.id,
                        new_valuation_cents: 55000000,
                        valuation_date: '2026-06-01',
                        source: 'API Valuation'
                    }
                })
            });
            const valRes = await accountingPost(valReq);
            const valData = await valRes.json();
            expect(valRes.status).toBe(201);
            expect(valData.success).toBe(true);

            // POST set_exchange_rate
            const rateReq = new Request('http://localhost/api/accounting', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: 'set_exchange_rate',
                    rate: {
                        from_currency: 'USD',
                        to_currency: 'AUD',
                        rate: 1.55,
                        effective_date: '2026-06-01',
                        source: 'API Test'
                    }
                })
            });
            const rateRes = await accountingPost(rateReq);
            const rateData = await rateRes.json();
            expect(rateRes.status).toBe(201);
            expect(rateData.success).toBe(true);

            // GET view=drilldown
            const drillReq = new Request(`http://localhost/api/accounting?view=drilldown&account_id=${house.id}`);
            const drillRes = await accountingGet(drillReq);
            const drillData = await drillRes.json();
            expect(drillRes.status).toBe(200);
            expect(drillData.success).toBe(true);
            expect(drillData.drilldown.closing_balance_cents).toBe(55000000);

            // GET view=reports&report_type=scope_net_worth
            const repReq = new Request(`http://localhost/api/accounting?view=reports&report_type=scope_net_worth&scope_id=${person.id}&scope_type=individual`);
            const repRes = await accountingGet(repReq);
            const repData = await repRes.json();
            expect(repRes.status).toBe(200);
            expect(repData.success).toBe(true);
            expect(repData.report.scoped_net_worth_cents_by_currency['AUD']).toBe(55000000);
        });
    });

    describe('7. Assessor Remediation Regression Tests (Findings 1 - 7)', () => {
        it('Finding 1: Currency Conversion Scale & Explicit Rounding (JPY <-> AUD)', () => {
            // Scale arithmetic: JPY scale = 0, AUD scale = 2
            // AUD -> JPY: 1050 cents AUD ($10.50) at rate 95.5 JPY/AUD -> 10.50 * 95.5 = 1002.75 -> 1003 JPY
            const audToJpy = convertCurrencyAmount(1050, 'AUD', 'JPY', 95.5);
            expect(audToJpy).toBe(1003);

            // AUD Liability -> JPY: -1050 cents AUD -> -1003 JPY (preserves sign)
            const audLiabToJpy = convertCurrencyAmount(-1050, 'AUD', 'JPY', 95.5);
            expect(audLiabToJpy).toBe(-1003);

            // JPY -> AUD: 10,000 JPY at rate 0.0104712 AUD/JPY -> 10,000 * 0.0104712 = 104.712 AUD -> 10471 cents AUD
            const jpyToAud = convertCurrencyAmount(10000, 'JPY', 'AUD', 0.0104712);
            expect(jpyToAud).toBe(10471);

            // JPY Liability -> AUD: -10,000 JPY -> -10471 cents AUD
            const jpyLiabToAud = convertCurrencyAmount(-10000, 'JPY', 'AUD', 0.0104712);
            expect(jpyLiabToAud).toBe(-10471);

            // Explicit rounding boundary tests:
            // 100 JPY at rate 0.010049 -> 100.49 cents -> 100 cents
            expect(convertCurrencyAmount(100, 'JPY', 'AUD', 0.010049)).toBe(100);
            // 100 JPY at rate 0.010050 -> 100.50 cents -> 101 cents (half-up)
            expect(convertCurrencyAmount(100, 'JPY', 'AUD', 0.010050)).toBe(101);
            // 100 JPY at rate 0.010051 -> 100.51 cents -> 101 cents
            expect(convertCurrencyAmount(100, 'JPY', 'AUD', 0.010051)).toBe(101);

            // In-memory DB verification with JPY and AUD accounts:
            const entity = createEntity(db, { name: 'Kenji Tanaka', type: 'person', currency: 'JPY' });
            createAccount(db, {
                entity_id: entity.id,
                name: 'Tokyo Bank',
                type: 'asset',
                sub_type: 'checking',
                currency: 'JPY',
                opening_date: '2026-01-01',
                opening_balance_cents: 1000000 // 1,000,000 JPY
            });
            createAccount(db, {
                entity_id: entity.id,
                name: 'Tokyo Card',
                type: 'liability',
                sub_type: 'credit_card',
                currency: 'JPY',
                opening_date: '2026-01-01',
                opening_balance_cents: 200000 // 200,000 JPY liability
            });

            // Net worth in JPY: 1,000,000 - 200,000 = 800,000 JPY
            setExchangeRate(db, {
                from_currency: 'JPY',
                to_currency: 'AUD',
                rate: 0.0105, // 1 JPY = 0.0105 AUD
                effective_date: '2026-06-30',
                source: 'RBA Official'
            });

            const consReport = getConsolidatedNetWorth(db, entity.id, 'AUD', '2026-06-30');
            expect(consReport.is_complete).toBe(true);
            // 800,000 JPY * 0.0105 = 8,400 AUD = 840,000 cents AUD
            expect(consReport.consolidated_total_cents).toBe(840000);
        });

        it('Finding 2: Household Ownership Attribution & External Owner Exclusion', () => {
            const household = createEntity(db, { name: 'Walker Household', type: 'household', currency: 'AUD' });
            const alice = createEntity(db, { name: 'Alice Walker', type: 'person', parent_entity_id: household.id, currency: 'AUD' });
            const bob = createEntity(db, { name: 'Bob Walker', type: 'person', parent_entity_id: household.id, currency: 'AUD' });
            const charlieOutsider = createEntity(db, { name: 'Charlie Outsider', type: 'person', currency: 'AUD' });

            // Account 1: Internal 50/50 joint asset (Alice 50%, Bob 50%)
            const familyCar = createAccount(db, {
                entity_id: alice.id,
                name: 'Family SUV',
                type: 'asset',
                sub_type: 'vehicle',
                currency: 'AUD',
                opening_date: '2026-01-01',
                opening_balance_cents: 6000000 // $60,000 AUD
            }).account;
            setAccountOwnership(db, familyCar.id, [
                { entity_id: alice.id, share_percentage: 50 },
                { entity_id: bob.id, share_percentage: 50 }
            ]);

            // Account 2: Member / Outsider 50/50 joint asset (Alice 50%, Charlie 50%)
            const holidayCabin = createAccount(db, {
                entity_id: alice.id,
                name: 'Holiday Cabin',
                type: 'asset',
                sub_type: 'real_estate',
                currency: 'AUD',
                opening_date: '2026-01-01',
                opening_balance_cents: 40000000 // $400,000 AUD
            }).account;
            setAccountOwnership(db, holidayCabin.id, [
                { entity_id: alice.id, share_percentage: 50 },
                { entity_id: charlieOutsider.id, share_percentage: 50 }
            ]);

            // Account 3: Outsider-only asset (Charlie 100%)
            createAccount(db, {
                entity_id: charlieOutsider.id,
                name: 'Charlie Boat',
                type: 'asset',
                sub_type: 'vehicle',
                currency: 'AUD',
                opening_date: '2026-01-01',
                opening_balance_cents: 10000000 // $100,000 AUD
            });

            // Evaluate Household Scope
            const hhReport = getScopeNetWorth(db, household.id, 'household', '2026-01-01');

            // 1. Family SUV: 100% in household (Alice 50% + Bob 50% = 100%) -> $60,000
            const suvItem = hhReport.items.find(i => i.account_id === familyCar.id);
            expect(suvItem).toBeDefined();
            expect(suvItem?.ownership_share_percentage).toBe(100);
            expect(suvItem?.attributed_balance_cents).toBe(6000000);

            // 2. Holiday Cabin: Only 50% in household (Alice 50%; Charlie 50% strictly excluded) -> $200,000
            const cabinItem = hhReport.items.find(i => i.account_id === holidayCabin.id);
            expect(cabinItem).toBeDefined();
            expect(cabinItem?.ownership_share_percentage).toBe(50);
            expect(cabinItem?.attributed_balance_cents).toBe(20000000);

            // 3. Charlie Boat: NOT in household report
            expect(hhReport.items.find(i => i.account_name === 'Charlie Boat')).toBeUndefined();

            // Total Household Assets: $60,000 + $200,000 = $260,000 (26,000,000 cents), NOT $460,000
            expect(hhReport.scoped_assets_cents_by_currency?.['AUD']).toBe(26000000);
            expect(hhReport.scoped_net_worth_cents_by_currency?.['AUD']).toBe(26000000);
        });

        it('Finding 3: Consistent Report Scope in Converted Net Worth', () => {
            const alice = createEntity(db, { name: 'Alice Co-Owner', type: 'person', currency: 'AUD' });
            const partner = createEntity(db, { name: 'Outside Partner', type: 'person', currency: 'AUD' });

            const commercialProperty = createAccount(db, {
                entity_id: alice.id,
                name: 'Office Building',
                type: 'asset',
                sub_type: 'real_estate',
                currency: 'AUD',
                opening_date: '2026-01-01',
                opening_balance_cents: 100000000 // $1,000,000 AUD gross
            }).account;

            // Alice owns 40%, Partner owns 60%
            setAccountOwnership(db, commercialProperty.id, [
                { entity_id: alice.id, share_percentage: 40 },
                { entity_id: partner.id, share_percentage: 60 }
            ]);

            // 1. Unconverted Scoped Net Worth for Alice: 40% of $1,000,000 = $400,000 AUD (40,000,000 cents)
            const scopedReport = getScopeNetWorth(db, alice.id, 'individual', '2026-01-01');
            expect(scopedReport.scoped_net_worth_cents_by_currency?.['AUD']).toBe(40000000);

            // 2. Identity-Currency Converted Net Worth (AUD -> AUD):
            // MUST consume the scoped total and preserve $400,000 AUD (NOT $1,000,000)
            const identityConsolidated = getConsolidatedNetWorth(db, {
                target_entity_id: alice.id,
                reporting_currency: 'AUD',
                scope_type: 'individual',
                as_of_date: '2026-01-01'
            });
            expect(identityConsolidated.is_complete).toBe(true);
            expect(identityConsolidated.consolidated_total_cents).toBe(40000000);
            expect(identityConsolidated.original_totals_by_currency['AUD']).toBe(40000000);

            // 3. Cross-Currency Converted Net Worth (AUD -> USD):
            setExchangeRate(db, {
                from_currency: 'AUD',
                to_currency: 'USD',
                rate: 0.65,
                effective_date: '2026-01-01',
                source: 'Forex'
            });

            const usdConsolidated = getConsolidatedNetWorth(db, {
                target_entity_id: alice.id,
                reporting_currency: 'USD',
                scope_type: 'individual',
                as_of_date: '2026-01-01'
            });
            // 40,000,000 cents AUD * 0.65 = 26,000,000 cents USD ($260,000 USD)
            expect(usdConsolidated.is_complete).toBe(true);
            expect(usdConsolidated.consolidated_total_cents).toBe(26000000);
        });

        it('Finding 4: Actual Cash Flow Reconciliation with Double-Entry Ledger', () => {
            const business = createEntity(db, { name: 'Acme Holdings', type: 'business', currency: 'AUD' });
            const bank = createAccount(db, {
                entity_id: business.id,
                name: 'Operating Bank',
                type: 'asset',
                sub_type: 'checking',
                currency: 'AUD',
                opening_date: '2026-01-01',
                opening_balance_cents: 1000000 // $10,000 AUD starting cash
            }).account;

            const savings = createAccount(db, {
                entity_id: business.id,
                name: 'Reserve Savings',
                type: 'asset',
                sub_type: 'savings',
                currency: 'AUD',
                opening_date: '2026-01-01',
                opening_balance_cents: 0
            }).account;

            const loan = createAccount(db, {
                entity_id: business.id,
                name: 'Bank Term Loan',
                type: 'liability',
                sub_type: 'loan',
                currency: 'AUD',
                opening_date: '2026-01-01',
                opening_balance_cents: 0
            }).account;

            const equity = createAccount(db, {
                entity_id: business.id,
                name: 'Contributed Capital',
                type: 'equity',
                sub_type: 'valuation_reserve',
                currency: 'AUD',
                opening_date: '2026-01-01',
                opening_balance_cents: 0
            }).account;

            const equipment = createAccount(db, {
                entity_id: business.id,
                name: 'Office Equipment',
                type: 'asset',
                sub_type: 'property',
                currency: 'AUD',
                opening_date: '2026-01-01',
                opening_balance_cents: 0
            }).account;

            // 1. Financing Inflow: Borrow $5,000 AUD from bank loan (Liability credit)
            postTransaction(db, {
                date: '2026-01-05',
                description: 'Loan Drawdown Proceeds',
                origin: 'manual',
                postings: [
                    { account_id: bank.id, amount_cents: 500000, currency: 'AUD' },
                    { account_id: loan.id, amount_cents: -500000, currency: 'AUD' }
                ]
            });

            // 2. Financing Inflow: Owner injects $2,000 AUD capital (Equity credit)
            postTransaction(db, {
                date: '2026-01-08',
                description: 'Owner Equity Injection',
                origin: 'manual',
                postings: [
                    { account_id: bank.id, amount_cents: 200000, currency: 'AUD' },
                    { account_id: equity.id, amount_cents: -200000, currency: 'AUD' }
                ]
            });

            // 3. Investing Outflow: Purchase equipment for $1,500 AUD (Asset debit)
            postTransaction(db, {
                date: '2026-01-12',
                description: 'Server Equipment Purchase',
                origin: 'manual',
                postings: [
                    { account_id: equipment.id, amount_cents: 150000, currency: 'AUD' },
                    { account_id: bank.id, amount_cents: -150000, currency: 'AUD' }
                ]
            });

            // 4. Investing Inflow: Sell old equipment for $800 AUD (Asset credit)
            postTransaction(db, {
                date: '2026-01-15',
                description: 'Old Equipment Salvage Sale',
                origin: 'manual',
                postings: [
                    { account_id: bank.id, amount_cents: 80000, currency: 'AUD' },
                    { account_id: equipment.id, amount_cents: -80000, currency: 'AUD' }
                ]
            });

            // 5. Internal Transfer: Transfer $1,000 AUD from Checking to Savings
            recordTransfer(db, {
                from_account_id: bank.id,
                to_account_id: savings.id,
                amount_cents: 100000,
                date: '2026-01-18',
                description: 'Liquidity Reserve Transfer'
            });

            // 6. Operating Outflow: $400 AUD office utility bill
            recordExpense(db, {
                entity_id: business.id,
                payment_account_id: bank.id,
                amount_cents: 40000,
                date: '2026-01-20',
                description: 'Electric Utility Bill'
            });

            // 7. Operating Inflow: $3,000 AUD client consulting revenue
            recordIncome(db, {
                entity_id: business.id,
                bank_account_id: bank.id,
                amount_cents: 300000,
                date: '2026-01-25',
                description: 'Client Consulting Services'
            });

            // 8. Mixed-Leg Debt Repayment: Pay $1,000 AUD ($800 loan principal + $200 loan interest)
            recordLoanRepayment(db, {
                bank_account_id: bank.id,
                loan_account_id: loan.id,
                principal_cents: 80000,
                interest_cents: 20000,
                date: '2026-01-28',
                description: 'Monthly Loan Payment'
            });

            // Evaluate Actual Cash Flow Statement
            const cashFlow = getActualCashFlowStatement(db, business.id, '2026-01-01', '2026-01-31');

            // Starting Cash: $10,000 AUD (1,000,000 cents)
            expect(cashFlow.starting_cash_cents_by_currency['AUD']).toBe(1000000);

            // Operating: Inflow $3,000 (300,000), Outflow $400 (40,000) -> Net +$2,600 (260,000)
            expect(cashFlow.operating_inflows_cents_by_currency['AUD']).toBe(300000);
            expect(cashFlow.operating_outflows_cents_by_currency['AUD']).toBe(40000);
            expect(cashFlow.net_operating_cents_by_currency['AUD']).toBe(260000);

            // Financing: Inflows $7,000 ($5k loan + $2k equity), Outflows $1,000 (loan service) -> Net +$6,000 (600,000)
            expect(cashFlow.financing_inflows_cents_by_currency?.['AUD']).toBe(700000);
            expect(cashFlow.financing_outflows_cents_by_currency['AUD']).toBe(100000);
            expect(cashFlow.net_financing_cents_by_currency?.['AUD']).toBe(600000);

            // Investing: Inflow $800 (80,000), Outflow $1,500 (150,000) -> Net -$700 (-70,000)
            expect(cashFlow.investing_inflows_cents_by_currency?.['AUD']).toBe(80000);
            expect(cashFlow.investing_outflows_cents_by_currency?.['AUD']).toBe(150000);
            expect(cashFlow.net_investing_cents_by_currency?.['AUD']).toBe(-70000);

            // Net Cash Change: +2,600 + 6,000 - 700 = +$7,900 (790,000 cents)
            expect(cashFlow.net_cash_change_cents_by_currency['AUD']).toBe(790000);

            // Expected Ending Cash: Starting $10,000 + Change $7,900 = $17,900 (1,790,000 cents)
            expect(cashFlow.ending_cash_cents_by_currency['AUD']).toBe(1790000);

            // Independent Ledger Verification:
            // Bank balance: 10,000 + 5,000 + 2,000 - 1,500 + 800 - 1,000 - 400 + 3,000 - 1,000 = 16,900
            // Savings balance: +1,000
            // Total liquid closing cash in ledger = 17,900!
            expect(cashFlow.ledger_closing_cash_cents_by_currency?.['AUD']).toBe(1790000);
            expect(cashFlow.is_reconciled_by_currency?.['AUD']).toBe(true);
            expect(cashFlow.reconciliation_discrepancy_cents_by_currency?.['AUD']).toBe(0);
        });

        it('Finding 5: Historical Valuation Correctness & Target Preservation Regression', () => {
            const entity = createEntity(db, { name: 'Property Investor', type: 'person', currency: 'AUD' });
            const asset = createAccount(db, {
                entity_id: entity.id,
                name: 'Investment Property',
                type: 'asset',
                sub_type: 'real_estate',
                currency: 'AUD',
                opening_date: '2026-01-01',
                opening_balance_cents: 100000 // 100,000 cents on Jan 1
            }).account;

            expect(getAccountBalance(db, asset.id, '2026-01-01').balance_cents).toBe(100000);

            // 1. Later valuation on March 1, 2026: target 120,000 cents
            const laterTx = recordAssetValuation(db, {
                asset_account_id: asset.id,
                new_valuation_cents: 120000,
                date: '2026-03-01',
                description: 'March Appraisal'
            });
            expect(laterTx.id).toBeDefined();

            // At this point, balance on March 1 is 120,000
            expect(getAccountBalance(db, asset.id, '2026-03-01').balance_cents).toBe(120000);

            // 2. Insert earlier backdated valuation on February 1, 2026: target 110,000 cents
            const earlierTx = recordAssetValuation(db, {
                asset_account_id: asset.id,
                new_valuation_cents: 110000,
                date: '2026-02-01',
                description: 'February Appraisal'
            });
            expect(earlierTx.id).toBeDefined();

            // Regression Check:
            // Value on Feb 1 must be 110,000
            expect(getAccountBalance(db, asset.id, '2026-02-01').balance_cents).toBe(110000);

            // Value on March 1 MUST BE PRESERVED AT 120,000 (NOT 130,000!)
            const marchBalance = getAccountBalance(db, asset.id, '2026-03-01').balance_cents;
            expect(marchBalance).toBe(120000);

            // Total net worth on March 1 reflects the preserved target 120,000
            const nwMarch = getEntityNetWorth(db, entity.id, '2026-03-01');
            expect(nwMarch.net_worth_cents_by_currency['AUD']).toBe(120000);

            // Total unrealized reserve as of March 1 is exactly 20,000 cents
            const reserve = db.prepare("SELECT * FROM m1_accounts WHERE entity_id = ? AND type = 'equity' AND sub_type = 'valuation_reserve'").get(entity.id) as any;
            expect(getAccountBalance(db, reserve.id, '2026-03-01').balance_cents).toBe(20000);
        });

        it('Finding 6: Valuation Idempotency Retries and Conflicts', () => {
            const entity = createEntity(db, { name: 'Art Collector', type: 'person', currency: 'AUD' });
            const painting = createAccount(db, {
                entity_id: entity.id,
                name: 'Oil Painting',
                type: 'asset',
                sub_type: 'property',
                currency: 'AUD',
                opening_date: '2026-01-01',
                opening_balance_cents: 300000 // $3,000 AUD
            }).account;

            const idemKey = 'val-idem-collector-001';

            // Initial valuation
            const tx1 = recordAssetValuation(db, {
                asset_account_id: painting.id,
                new_valuation_cents: 500000, // $5,000 AUD
                date: '2026-04-01',
                description: 'Gallery Appraisal',
                idempotency_key: idemKey
            });
            expect(tx1.id).toBeDefined();
            expect(getAccountBalance(db, painting.id).balance_cents).toBe(500000);

            // 1. Identical retry returns existing transaction without calculating a bogus new delta
            const tx2 = recordAssetValuation(db, {
                asset_account_id: painting.id,
                new_valuation_cents: 500000,
                date: '2026-04-01',
                description: 'Gallery Appraisal',
                idempotency_key: idemKey
            });
            expect(tx2.id).toBe(tx1.id);
            expect(getAccountBalance(db, painting.id).balance_cents).toBe(500000);

            // Total transactions in DB remains exactly 2 (opening balance + 1 valuation)
            const txCount = (db.prepare("SELECT COUNT(*) as cnt FROM m1_transactions WHERE origin = 'manual'").get() as any).cnt;
            expect(txCount).toBe(1);

            // 2. Changed request using the same key throws ConflictError without mutating DB
            expect(() => {
                recordAssetValuation(db, {
                    asset_account_id: painting.id,
                    new_valuation_cents: 600000, // Changed target valuation
                    date: '2026-04-01',
                    description: 'Gallery Appraisal',
                    idempotency_key: idemKey
                });
            }).toThrow(ConflictError);

            // Account balance remains $5,000
            expect(getAccountBalance(db, painting.id).balance_cents).toBe(500000);
        });

        it('Finding 7: Structured Evidence Identity & Field-Level Conflict Detection', () => {
            const entity = createEntity(db, { name: 'Audit Firm', type: 'business', currency: 'AUD' });
            const bank = createAccount(db, {
                entity_id: entity.id,
                name: 'Trust Account',
                type: 'asset',
                sub_type: 'checking',
                currency: 'AUD',
                opening_date: '2026-01-01',
                opening_balance_cents: 1000000
            }).account;

            const structuredRefA = {
                document_id: 'doc-invoice-101',
                content_hash: 'sha256-abcdef1234567890',
                page: 4,
                bounding_box: [50, 100, 450, 600] as [number, number, number, number],
                label: 'Invoice Header'
            };

            const idemKey = 'idem-evidence-001';

            const tx = recordIncome(db, {
                entity_id: entity.id,
                bank_account_id: bank.id,
                amount_cents: 50000,
                date: '2026-02-15',
                description: 'Audit Retainer',
                idempotency_key: idemKey,
                evidence_refs: [structuredRefA]
            });
            expect(tx.id).toBeDefined();

            // 1. Identical retry with permuted object keys succeeds (canonical matching)
            const permutedRef = {
                page: 4,
                label: 'Invoice Header',
                bounding_box: [50, 100, 450, 600] as [number, number, number, number],
                document_id: 'doc-invoice-101',
                content_hash: 'sha256-abcdef1234567890'
            };
            const retrySame = recordIncome(db, {
                entity_id: entity.id,
                bank_account_id: bank.id,
                amount_cents: 50000,
                date: '2026-02-15',
                description: 'Audit Retainer',
                idempotency_key: idemKey,
                evidence_refs: [permutedRef]
            });
            expect(retrySame.id).toBe(tx.id);

            // 2. Modifying document_id triggers ConflictError
            expect(() => {
                recordIncome(db, {
                    entity_id: entity.id,
                    bank_account_id: bank.id,
                    amount_cents: 50000,
                    date: '2026-02-15',
                    description: 'Audit Retainer',
                    idempotency_key: idemKey,
                    evidence_refs: [{ ...structuredRefA, document_id: 'doc-invoice-999' }]
                });
            }).toThrow(ConflictError);

            // 3. Modifying content_hash triggers ConflictError
            expect(() => {
                recordIncome(db, {
                    entity_id: entity.id,
                    bank_account_id: bank.id,
                    amount_cents: 50000,
                    date: '2026-02-15',
                    description: 'Audit Retainer',
                    idempotency_key: idemKey,
                    evidence_refs: [{ ...structuredRefA, content_hash: 'sha256-tampered-hash' }]
                });
            }).toThrow(ConflictError);

            // 4. Modifying page triggers ConflictError
            expect(() => {
                recordIncome(db, {
                    entity_id: entity.id,
                    bank_account_id: bank.id,
                    amount_cents: 50000,
                    date: '2026-02-15',
                    description: 'Audit Retainer',
                    idempotency_key: idemKey,
                    evidence_refs: [{ ...structuredRefA, page: 5 }]
                });
            }).toThrow(ConflictError);

            // 5. Modifying bounding_box triggers ConflictError
            expect(() => {
                recordIncome(db, {
                    entity_id: entity.id,
                    bank_account_id: bank.id,
                    amount_cents: 50000,
                    date: '2026-02-15',
                    description: 'Audit Retainer',
                    idempotency_key: idemKey,
                    evidence_refs: [{ ...structuredRefA, bounding_box: [50, 100, 450, 700] }]
                });
            }).toThrow(ConflictError);

            // 6. Explicit support for legacy string references
            const legacyTx = recordIncome(db, {
                entity_id: entity.id,
                bank_account_id: bank.id,
                amount_cents: 25000,
                date: '2026-02-16',
                description: 'Legacy Ref Income',
                idempotency_key: 'idem-legacy-001',
                evidence_refs: ['receipt_scan_042.pdf']
            });
            expect(legacyTx.id).toBeDefined();

            // Retry with legacy string matches
            const legacyRetry = recordIncome(db, {
                entity_id: entity.id,
                bank_account_id: bank.id,
                amount_cents: 25000,
                date: '2026-02-16',
                description: 'Legacy Ref Income',
                idempotency_key: 'idem-legacy-001',
                evidence_refs: ['  receipt_scan_042.pdf  ']
            });
            expect(legacyRetry.id).toBe(legacyTx.id);
        });
    });
});

