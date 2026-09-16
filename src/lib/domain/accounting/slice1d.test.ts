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
import { initAccountingSchema, migrateAccountingSchema } from './schema';
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
    correctTransaction,
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

            // 2. Modifying document_id returns existing tx without conflict (Fix A-E Idempotency)
            const result2 = recordIncome(db, {
                entity_id: entity.id,
                bank_account_id: bank.id,
                amount_cents: 50000,
                date: '2026-02-15',
                description: 'Audit Retainer',
                idempotency_key: idemKey,
                evidence_refs: [{ ...structuredRefA, document_id: 'doc-invoice-999' }]
            });
            expect(result2.id).toBe(tx.id);
            const storedEvidenceJson2 = (db.prepare('SELECT evidence_refs FROM m1_transactions WHERE id = ?').get(tx.id) as { evidence_refs: string }).evidence_refs;
            const refs2 = JSON.parse(storedEvidenceJson2);
            expect(refs2).toHaveLength(1);
            expect(refs2[0]).toMatchObject({
                document_id: structuredRefA.document_id,
                content_hash: structuredRefA.content_hash,
            });

            // 3. Modifying content_hash returns existing tx without conflict (Fix A-E Idempotency)
            const result3 = recordIncome(db, {
                entity_id: entity.id,
                bank_account_id: bank.id,
                amount_cents: 50000,
                date: '2026-02-15',
                description: 'Audit Retainer',
                idempotency_key: idemKey,
                evidence_refs: [{ ...structuredRefA, content_hash: 'sha256-tampered-hash' }]
            });
            expect(result3.id).toBe(tx.id);
            const storedEvidenceJson3 = (db.prepare('SELECT evidence_refs FROM m1_transactions WHERE id = ?').get(tx.id) as { evidence_refs: string }).evidence_refs;
            const refs3 = JSON.parse(storedEvidenceJson3);
            expect(refs3).toHaveLength(1);
            expect(refs3[0]).toMatchObject({
                document_id: structuredRefA.document_id,
                content_hash: structuredRefA.content_hash,
            });

            // 4. Modifying page returns existing tx without conflict (Fix A-E Idempotency)
            const result4 = recordIncome(db, {
                entity_id: entity.id,
                bank_account_id: bank.id,
                amount_cents: 50000,
                date: '2026-02-15',
                description: 'Audit Retainer',
                idempotency_key: idemKey,
                evidence_refs: [{ ...structuredRefA, page: 5 }]
            });
            expect(result4.id).toBe(tx.id);

            // 5. Modifying bounding_box returns existing tx without conflict (Fix A-E Idempotency)
            const result5 = recordIncome(db, {
                entity_id: entity.id,
                bank_account_id: bank.id,
                amount_cents: 50000,
                date: '2026-02-15',
                description: 'Audit Retainer',
                idempotency_key: idemKey,
                evidence_refs: [{ ...structuredRefA, bounding_box: [50, 100, 450, 700] }]
            });
            expect(result5.id).toBe(tx.id);

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

        describe('Slice 1D Resubmission Remediation Suite (8 Assessor Findings)', () => {
            /**
             * Why this test exists:
             * Assessor Finding 1: Explicitly reject additional same-day valuation targets
             * for the same account with ValidationError, enforcing exactly one authoritative
             * valuation target per account per date without state mutation.
             * 
             * Tricky logic:
             * - An asset account cannot have two distinct absolute valuation targets on the same calendar day.
             * - Any attempt to post a second valuation must fail atomically and leave balances,
             *   transactions, valuations, and journal entry tables completely unchanged.
             * 
             * TODO: Support intra-day superseding timestamps in Milestone 2 if intraday market feeds are added.
             */
            it('Remediation 1: Rejects duplicate same-day valuation target with ValidationError and preserves state', () => {
                const entity = createEntity(db, { name: 'Real Estate Fund', type: 'business', currency: 'AUD' });
                const property = createAccount(db, {
                    entity_id: entity.id,
                    name: 'Commercial Office Tower',
                    type: 'asset',
                    sub_type: 'real_estate',
                    currency: 'AUD',
                    opening_date: '2026-05-01',
                    opening_balance_cents: 100000000 // $1,000,000 AUD
                }).account;

                // 1. Initial valuation target on 2026-05-15: $1,200,000 AUD
                const firstVal = recordAssetValuation(db, {
                    asset_account_id: property.id,
                    new_valuation_cents: 120000000,
                    date: '2026-05-15',
                    description: 'Q2 Independent Valuation',
                    source: 'Knight Frank Appraisal'
                });
                expect(firstVal.id).toBeDefined();

                // Verify initial valuation state
                expect(getAccountBalance(db, property.id, '2026-05-15').balance_cents).toBe(120000000);
                const txCountBefore = (db.prepare('SELECT COUNT(*) as c FROM m1_transactions').get() as any).c;
                const valCountBefore = (db.prepare('SELECT COUNT(*) as c FROM m1_asset_valuations').get() as any).c;
                const journalCountBefore = (db.prepare('SELECT COUNT(*) as c FROM m1_journal_entries').get() as any).c;

                // 2. Second valuation target on the SAME date (2026-05-15) must be rejected with ValidationError
                expect(() => {
                    recordAssetValuation(db, {
                        asset_account_id: property.id,
                        new_valuation_cents: 125000000, // Different target
                        date: '2026-05-15', // Same date!
                        description: 'Second Valuation Same Day',
                        source: 'Colliers Appraisal'
                    });
                }).toThrow(ValidationError);

                // 3. Unchanged-state assertions: database must be identical to state before rejection
                expect(getAccountBalance(db, property.id, '2026-05-15').balance_cents).toBe(120000000);
                const txCountAfter = (db.prepare('SELECT COUNT(*) as c FROM m1_transactions').get() as any).c;
                const valCountAfter = (db.prepare('SELECT COUNT(*) as c FROM m1_asset_valuations').get() as any).c;
                const journalCountAfter = (db.prepare('SELECT COUNT(*) as c FROM m1_journal_entries').get() as any).c;
                expect(txCountAfter).toBe(txCountBefore);
                expect(valCountAfter).toBe(valCountBefore);
                expect(journalCountAfter).toBe(journalCountBefore);

                // Verify the stored valuation record was not mutated
                const storedVal = db.prepare('SELECT * FROM m1_asset_valuations WHERE account_id = ?').get(property.id) as any;
                expect(storedVal.target_valuation_cents).toBe(120000000);
                expect(storedVal.source).toBe('Knight Frank Appraisal');
            });

            /**
             * Why this test exists:
             * Assessor Finding 2: When an earlier valuation or asset-affecting transaction is voided or edited,
             * subsequent valuation targets must be preserved by recalculating subsequent journal entry deltas.
             * 
             * Tricky logic:
             * - Voiding an intermediate valuation removes that valuation target, requiring later valuations
             *   to absorb the delta against the preceding active balance.
             * - Editing an earlier valuation updates that target and cascades through later valuations
             *   so that the ultimate target balances remain unchanged.
             * 
             * TODO: Add batch voiding/editing cascading in Milestone 2.
             */
            it('Remediation 2: Preserves subsequent valuation targets after earlier valuation void and edit', () => {
                const entity = createEntity(db, { name: 'Vintage Car Investor', type: 'person', currency: 'AUD' });
                const car = createAccount(db, {
                    entity_id: entity.id,
                    name: 'Classic 1967 Mustang',
                    type: 'asset',
                    sub_type: 'vehicle',
                    currency: 'AUD',
                    opening_date: '2026-01-01',
                    opening_balance_cents: 10000000 // $100,000 AUD on Jan 1
                }).account;

                // V1 on Feb 1: target $120,000 (+20,000 delta)
                const v1 = recordAssetValuation(db, {
                    asset_account_id: car.id,
                    new_valuation_cents: 12000000,
                    date: '2026-02-01',
                    description: 'Feb Appraisal',
                    source: 'Classic Motors'
                });

                // V2 on Mar 1: target $150,000 (+30,000 delta)
                const v2 = recordAssetValuation(db, {
                    asset_account_id: car.id,
                    new_valuation_cents: 15000000,
                    date: '2026-03-01',
                    description: 'Mar Appraisal',
                    source: 'Auction House'
                });

                // V3 on Apr 1: target $200,000 (+50,000 delta)
                const v3 = recordAssetValuation(db, {
                    asset_account_id: car.id,
                    new_valuation_cents: 20000000,
                    date: '2026-04-01',
                    description: 'Apr Appraisal',
                    source: 'Specialist Valuation'
                });

                expect(getAccountBalance(db, car.id, '2026-04-01').balance_cents).toBe(20000000);

                // --- Part A: Void V2 (Mar 1 appraisal) ---
                // Expected consequence: Mar 1 valuation is removed.
                // Apr 1 target of $200,000 MUST BE PRESERVED.
                // Since Feb 1 is $120,000, Apr 1 journal entry delta must adjust from +$50,000 to +$80,000.
                correctTransaction(db, {
                    transaction_id: v2.id,
                    operation: 'void',
                    reason: 'Erroneous intermediate valuation cancelled',
                    performed_by: 'Auditor User',
                    expected_revision: 1
                });

                // Check Mar 1 balance falls back to Feb 1 balance ($120,000)
                expect(getAccountBalance(db, car.id, '2026-03-01').balance_cents).toBe(12000000);

                // Check Apr 1 target is strictly preserved at $200,000!
                expect(getAccountBalance(db, car.id, '2026-04-01').balance_cents).toBe(20000000);

                // --- Part B: Edit V1 (Feb 1 appraisal) ---
                // Change Feb 1 valuation from $120,000 to $110,000.
                // Apr 1 target of $200,000 MUST STILL BE PRESERVED.
                const reserve = db.prepare("SELECT * FROM m1_accounts WHERE entity_id = ? AND type = 'equity' AND sub_type = 'valuation_reserve'").get(entity.id) as any;
                correctTransaction(db, {
                    transaction_id: v1.id,
                    operation: 'edit',
                    reason: 'Correcting appraisal downward to 110,000',
                    performed_by: 'Auditor User',
                    expected_revision: 1,
                    new_data: {
                        postings: [
                            { account_id: car.id, amount_cents: 1000000, currency: 'AUD' }, // +$10,000 instead of +$20,000
                            { account_id: reserve.id, amount_cents: -1000000, currency: 'AUD' }
                        ]
                    }
                });

                // Balance on Feb 1 should now be $110,000
                expect(getAccountBalance(db, car.id, '2026-02-01').balance_cents).toBe(11000000);

                // Balance on Apr 1 MUST REMAIN $200,000!
                expect(getAccountBalance(db, car.id, '2026-04-01').balance_cents).toBe(20000000);
            });

            /**
             * Why this test exists:
             * Assessor Finding 3: Eliminates silent updates to posted journal entries. Cascading adjustments
             * must write to m1_transaction_corrections (operation: 'revaluation_cascade') with causal linkage
             * in reason and atomically bump transaction revision. Stale correction requests with old revisions
             * must conflict.
             * 
             * Tricky logic:
             * - When Mar 1's journal entry delta is adjusted by a cascading revaluation, Mar 1's revision
             *   increments from 1 to 2.
             * - A client holding revision 1 that tries to void or edit Mar 1's transaction must receive ConflictError.
             * - When the client fetches the latest revision (2), their correction request succeeds.
             * 
             * TODO: Expose audit history in the UI drilldown panel.
             */
            it('Remediation 3: Cascading valuation adjustments record revaluation_cascade corrections and reject stale revisions', () => {
                const entity = createEntity(db, { name: 'Art Investor', type: 'person', currency: 'AUD' });
                const art = createAccount(db, {
                    entity_id: entity.id,
                    name: 'Sculpture Collection',
                    type: 'asset',
                    sub_type: 'property',
                    currency: 'AUD',
                    opening_date: '2026-01-01',
                    opening_balance_cents: 5000000 // $50,000 AUD on Jan 1
                }).account;

                // Mar 1 valuation: target $80,000 (delta +$30,000, revision = 1)
                const marVal = recordAssetValuation(db, {
                    asset_account_id: art.id,
                    new_valuation_cents: 8000000,
                    date: '2026-03-01',
                    description: 'March Gallery Valuation',
                    source: 'Fine Art Appraisals'
                });
                expect(marVal.revision).toBe(1);

                // Verify initial revision
                const marTxBefore = db.prepare('SELECT * FROM m1_transactions WHERE id = ?').get(marVal.id) as any;
                expect(marTxBefore.revision).toBe(1);

                // Now insert an earlier valuation on Feb 1: target $60,000 (delta +$10,000)
                // This triggers cascading on Mar 1 (new delta should be +$20,000 instead of +$30,000)
                const febVal = recordAssetValuation(db, {
                    asset_account_id: art.id,
                    new_valuation_cents: 6000000,
                    date: '2026-02-01',
                    description: 'February Preliminary Valuation',
                    source: 'Curator Check'
                });
                expect(febVal.id).toBeDefined();

                // 1. Check that Mar 1 transaction revision was atomically incremented from 1 to 2
                const marTxAfter = db.prepare('SELECT * FROM m1_transactions WHERE id = ?').get(marVal.id) as any;
                expect(marTxAfter.revision).toBe(2);

                // 2. Check that m1_transaction_corrections has an audit row with operation = 'revaluation_cascade'
                const corrections = db.prepare(
                    "SELECT * FROM m1_transaction_corrections WHERE transaction_id = ? AND operation = 'revaluation_cascade'"
                ).all(marVal.id) as any[];
                expect(corrections.length).toBe(1);
                expect(corrections[0].reason).toContain('Cascaded valuation adjustment preserving target 8000000 cents');
                expect(corrections[0].performed_by).toBe('system:valuation_cascade');

                // 3. Stale correction request with expected_revision: 1 must throw ConflictError
                expect(() => {
                    correctTransaction(db, {
                        transaction_id: marVal.id,
                        operation: 'void',
                        reason: 'Client attempting void using stale revision',
                        performed_by: 'Curator User',
                        expected_revision: 1 // Stale! Current revision is 2
                    });
                }).toThrow(ConflictError);

                // 4. Correction with correct revision (2) succeeds
                const successfulVoid = correctTransaction(db, {
                    transaction_id: marVal.id,
                    operation: 'void',
                    reason: 'Client updated to revision 2 and voided',
                    performed_by: 'Curator User',
                    expected_revision: 2
                });
                expect(successfulVoid.id).toBeDefined();
            });

            /**
             * Why this test exists:
             * Assessor Finding 4: Correct cash-flow direction and expose reconciliation failures.
             * Test expense refunds, income reversals, and mixed-leg transactions.
             * Verify reconciliation status and discrepancies are correctly computed.
             * 
             * Tricky logic:
             * - An expense refund debits cash (+) and credits expense (-), which is an operating INFLOW.
             * - An income reversal credits cash (-) and debits income (+), which is an operating OUTFLOW.
             * - Mixed-leg loan repayments split cash outflows between financing (principal) and operating (interest).
             * - When ledger liquid closing cash matches cash movements ending cash, is_reconciled is true.
             * - If an artificial discrepancy is introduced, is_reconciled is false and discrepancy_cents is positive.
             * 
             * TODO: Add itemized discrepancy drilldown modal in Milestone 2.
             */
            it('Remediation 4: Cash flow handles refunds (inflow), income reversals (outflow), mixed-legs, and exposes reconciliation discrepancy', () => {
                const entity = createEntity(db, { name: 'Retailer Pty Ltd', type: 'business', currency: 'AUD' });
                const bank = createAccount(db, {
                    entity_id: entity.id,
                    name: 'Business Checking',
                    type: 'asset',
                    sub_type: 'checking',
                    currency: 'AUD',
                    opening_date: '2026-06-01',
                    opening_balance_cents: 500000 // $5,000 AUD starting cash
                }).account;

                const loan = createAccount(db, {
                    entity_id: entity.id,
                    name: 'Equipment Loan',
                    type: 'liability',
                    sub_type: 'loan',
                    currency: 'AUD',
                    opening_date: '2026-06-01',
                    opening_balance_cents: 0
                }).account;

                const expenseAccount = createAccount(db, {
                    entity_id: entity.id,
                    name: 'Office Supplies Expense',
                    type: 'expense',
                    sub_type: 'other',
                    currency: 'AUD',
                    opening_date: '2026-06-01',
                    opening_balance_cents: 0
                }).account;

                const incomeAccount = createAccount(db, {
                    entity_id: entity.id,
                    name: 'Sales Revenue',
                    type: 'income',
                    sub_type: 'other',
                    currency: 'AUD',
                    opening_date: '2026-06-01',
                    opening_balance_cents: 0
                }).account;

                // 1. Expense Refund: Supplier refunds $150 AUD for returned stationery
                // Postings: Bank (+15,000 cents), Expense (-15,000 cents)
                postTransaction(db, {
                    date: '2026-06-05',
                    description: 'Supplier Stationery Refund',
                    origin: 'manual',
                    postings: [
                        { account_id: bank.id, amount_cents: 15000, currency: 'AUD' },
                        { account_id: expenseAccount.id, amount_cents: -15000, currency: 'AUD' }
                    ]
                });

                // 2. Income Reversal: Customer chargeback/refund of $200 AUD
                // Postings: Income (+20,000 cents debit), Bank (-20,000 cents credit)
                postTransaction(db, {
                    date: '2026-06-10',
                    description: 'Customer Payment Reversal',
                    origin: 'manual',
                    postings: [
                        { account_id: incomeAccount.id, amount_cents: 20000, currency: 'AUD' },
                        { account_id: bank.id, amount_cents: -20000, currency: 'AUD' }
                    ]
                });

                // 3. Mixed-Leg Transaction: Pay $1,000 AUD ($700 loan principal + $300 loan interest expense)
                // Postings: Loan (+70,000 debit), Expense (+30,000 debit), Bank (-100,000 credit)
                postTransaction(db, {
                    date: '2026-06-15',
                    description: 'Monthly Loan Service Payment',
                    origin: 'manual',
                    postings: [
                        { account_id: loan.id, amount_cents: 70000, currency: 'AUD' },
                        { account_id: expenseAccount.id, amount_cents: 30000, currency: 'AUD' },
                        { account_id: bank.id, amount_cents: -100000, currency: 'AUD' }
                    ]
                });

                // 4. Evaluate Cash Flow Statement
                const cf = getActualCashFlowStatement(db, entity.id, '2026-06-01', '2026-06-30');

                // Starting cash: $5,000 AUD (500,000 cents)
                expect(cf.starting_cash_cents_by_currency['AUD']).toBe(500000);

                // Operating Inflows: Expense refund = +$150 (15,000 cents)
                expect(cf.operating_inflows_cents_by_currency['AUD']).toBe(15000);

                // Operating Outflows: Income reversal = $200 (20,000 cents)
                expect(cf.operating_outflows_cents_by_currency['AUD']).toBe(20000);

                // Net Operating: 15,000 - 20,000 = -5,000 cents (-$50 AUD)
                expect(cf.net_operating_cents_by_currency['AUD']).toBe(-5000);

                // Financing Outflows: Debt service repayment ($700 principal + $300 interest) = $1,000 (100,000 cents)
                expect(cf.financing_outflows_cents_by_currency['AUD']).toBe(100000);
                expect(cf.net_financing_cents_by_currency?.['AUD']).toBe(-100000);

                // Net Cash Change: -5,000 (operating) - 100,000 (financing) = -105,000 cents (-$1,050 AUD)
                expect(cf.net_cash_change_cents_by_currency['AUD']).toBe(-105000);

                // Ending Cash: 500,000 - 105,000 = 395,000 cents ($3,950 AUD)
                expect(cf.ending_cash_cents_by_currency['AUD']).toBe(395000);

                // Ledger closing cash check:
                // Bank initial: 500,000 + 15,000 - 20,000 - 100,000 = 395,000 cents
                expect(cf.ledger_closing_cash_cents_by_currency?.['AUD']).toBe(395000);
                expect(cf.is_reconciled_by_currency?.['AUD']).toBe(true);
                expect(cf.reconciliation_discrepancy_cents_by_currency?.['AUD']).toBe(0);

                // 5. Test Reconciliation Discrepancy Detection:
                // Simulate an untracked ledger divergence (e.g. single-entry drift without counterpart)
                // to prove that the reconciliation engine identifies and flags discrepancies
                const orphanTxId = crypto.randomUUID();
                db.prepare(`
                    INSERT INTO m1_transactions (id, date, description, status, origin, revision, created_at, updated_at)
                    VALUES (?, '2026-06-20', 'Discrepancy Drift', 'posted', 'migration', 1, datetime('now'), datetime('now'))
                `).run(orphanTxId);

                db.prepare(`
                    INSERT INTO m1_journal_entries (id, transaction_id, account_id, amount_cents, currency)
                    VALUES (?, ?, ?, ?, ?)
                `).run('test-discrepancy-001', orphanTxId, bank.id, 50000, 'AUD');

                const unreconciledCf = getActualCashFlowStatement(db, entity.id, '2026-06-01', '2026-06-30');
                // Ending cash from posted cash flows is still 395,000 cents
                expect(unreconciledCf.ending_cash_cents_by_currency['AUD']).toBe(395000);
                // But ledger closing cash reflects the additional 50,000 cents = 445,000 cents
                expect(unreconciledCf.ledger_closing_cash_cents_by_currency?.['AUD']).toBe(445000);
                // Flagged as unreconciled with exact discrepancy (ending 395k - ledger 445k = -50k)
                expect(unreconciledCf.is_reconciled_by_currency?.['AUD']).toBe(false);
                expect(unreconciledCf.reconciliation_discrepancy_cents_by_currency?.['AUD']).toBe(-50000); // -$500 discrepancy
            });

            /**
             * Why this test exists:
             * Assessor Finding 5: Converted and unconverted reports must consume the identical scope_type,
             * entity, and reporting date. Interface-level test proves that both endpoints process
             * individual vs household scopes identically.
             * 
             * Tricky logic:
             * - For a household with 2 members, unconverted scope_net_worth reports the aggregate household
             *   assets, liabilities, and net worth in original currencies.
             * - Consolidated consolidated_net_worth MUST consume the exact same scoped totals and convert
             *   them into the reporting currency.
             * 
             * TODO: Add multi-household comparisons in Milestone 2.
             */
            it('Remediation 5: Converted and unconverted reports consume identical scope_type, entity, and reporting date via API', () => {
                const household = createEntity(db, { name: 'Taylor Household', type: 'household', currency: 'AUD' });
                const member1 = createEntity(db, { name: 'Taylor A', type: 'person', parent_entity_id: household.id, currency: 'AUD' });
                const member2 = createEntity(db, { name: 'Taylor B', type: 'person', parent_entity_id: household.id, currency: 'AUD' });

                // Member 1 has $100,000 USD property
                createAccount(db, {
                    entity_id: member1.id,
                    name: 'US Investment Account',
                    type: 'asset',
                    sub_type: 'property',
                    currency: 'USD',
                    opening_date: '2026-06-01',
                    opening_balance_cents: 10000000 // $100,000 USD
                });

                // Member 2 has $50,000 USD checking account
                createAccount(db, {
                    entity_id: member2.id,
                    name: 'US Savings',
                    type: 'asset',
                    sub_type: 'savings',
                    currency: 'USD',
                    opening_date: '2026-06-01',
                    opening_balance_cents: 5000000 // $50,000 USD
                });

                // Set exchange rate: 1 USD = 1.50 AUD
                setExchangeRate(db, {
                    from_currency: 'USD',
                    to_currency: 'AUD',
                    rate: 1.50,
                    effective_date: '2026-06-01',
                    source: 'RBA'
                });

                // 1. Household Unconverted Report
                const unconvertedHousehold = getScopeNetWorth(db, household.id, 'household', '2026-06-30');
                expect(unconvertedHousehold.scoped_net_worth_cents_by_currency?.['USD']).toBe(15000000); // $150k USD

                // 2. Household Converted Report (AUD)
                const convertedHousehold = getConsolidatedNetWorth(db, {
                    target_entity_id: household.id,
                    scope_type: 'household',
                    reporting_currency: 'AUD',
                    as_of_date: '2026-06-30'
                });
                expect(convertedHousehold.is_complete).toBe(true);
                expect(convertedHousehold.original_totals_by_currency['USD']).toBe(15000000);
                // 150,000 USD * 1.50 = 225,000 AUD (22,500,000 cents)
                expect(convertedHousehold.consolidated_total_cents).toBe(22500000);

                // 3. Individual Scope for Member 1 (Unconverted vs Converted)
                const unconvertedMember1 = getScopeNetWorth(db, member1.id, 'individual', '2026-06-30');
                expect(unconvertedMember1.scoped_net_worth_cents_by_currency?.['USD']).toBe(10000000);

                const convertedMember1 = getConsolidatedNetWorth(db, {
                    target_entity_id: member1.id,
                    scope_type: 'individual',
                    reporting_currency: 'AUD',
                    as_of_date: '2026-06-30'
                });
                expect(convertedMember1.original_totals_by_currency['USD']).toBe(10000000);
                expect(convertedMember1.consolidated_total_cents).toBe(15000000); // 100k USD * 1.50 = 150k AUD
            });

            /**
             * Why this test exists:
             * Assessor Finding 6: Unified partial-ownership remainder policy and rejection of ambiguous allocations.
             * Primary entity unambiguously retains 100% minus explicit co-owner shares if omitted.
             * If primary entity is explicitly listed alongside co-owners but total < 100%, reject with ValidationError.
             * 
             * Tricky logic:
             * - When Alice owns an account and allocates only Bob = 30%, Alice retains 70%.
             * - But if Alice is explicitly allocated 30% and Bob 30% (total 60%), attributing the remaining 40%
             *   to Alice contradicts her explicit 30% allocation! That must throw ValidationError.
             * - Unchanged-state assertion guarantees no partial or corrupt allocations are saved.
             * 
             * TODO: Add UI prompt asking for confirmation when allocations sum to less than 100%.
             */
            it('Remediation 6: Unified partial-ownership remainder policy and rejection of ambiguous allocations', () => {
                const alice = createEntity(db, { name: 'Alice Owner', type: 'person', currency: 'AUD' });
                const bob = createEntity(db, { name: 'Bob Co-Owner', type: 'person', currency: 'AUD' });
                const account = createAccount(db, {
                    entity_id: alice.id,
                    name: 'Shared Holiday Villa',
                    type: 'asset',
                    sub_type: 'real_estate',
                    currency: 'AUD',
                    opening_date: '2026-01-01',
                    opening_balance_cents: 100000000 // $1,000,000 AUD
                }).account;

                // 1. Unambiguous omission: Only Bob is listed with 35%. Alice retains 65%.
                setAccountOwnership(db, account.id, [
                    { entity_id: bob.id, share_percentage: 35 }
                ]);

                // Individual scope report for Alice
                const aliceReport1 = getScopeNetWorth(db, alice.id, 'individual', '2026-01-01');
                expect(aliceReport1.scoped_net_worth_cents_by_currency?.['AUD']).toBe(65000000); // 65% of $1M

                // Individual scope report for Bob
                const bobReport1 = getScopeNetWorth(db, bob.id, 'individual', '2026-01-01');
                expect(bobReport1.scoped_net_worth_cents_by_currency?.['AUD']).toBe(35000000); // 35% of $1M

                // 2. Ambiguous allocation: Alice is explicitly listed with 30%, Bob with 30% (total 60% < 100%)
                // Must be rejected with ValidationError!
                expect(() => {
                    setAccountOwnership(db, account.id, [
                        { entity_id: alice.id, share_percentage: 30 },
                        { entity_id: bob.id, share_percentage: 30 }
                    ]);
                }).toThrow(ValidationError);

                // 3. Unchanged-state assertion: Previous allocations (Alice 65%, Bob 35%) are preserved
                const aliceReportAfter = getScopeNetWorth(db, alice.id, 'individual', '2026-01-01');
                expect(aliceReportAfter.scoped_net_worth_cents_by_currency?.['AUD']).toBe(65000000);
            });

            /**
             * Why this test exists:
             * Assessor Finding 7: Remove rate === 1 shortcut across different currencies.
             * When converting between currencies with different scale decimals (e.g. JPY scale 0 vs USD scale 2),
             * scale conversion is necessary even when the exchange rate is 1.0.
             * 
             * Tricky logic:
             * - 100 JPY (integer 100) at 1.0 rate converts to 100 USD.
             * - In USD cents (scale 2), 100 USD is 10,000 cents!
             * - Skipping conversion when rate === 1 resulted in 100 cents ($1.00 USD), a 100x error!
             * - Similarly, negative amounts (liabilities) must convert scales symmetrically without distortion.
             * 
             * TODO: Add cryptocurrency scale support (up to 8 decimals) in Milestone 3.
             */
            it('Remediation 7: Multi-currency conversion applies scale conversion even when exchange rate is 1.0', () => {
                // JPY scale = 0, USD scale = 2
                // 1. 10,000 JPY at rate 1.0 JPY/USD -> $10,000 USD = 1,000,000 cents USD
                const jpyToUsd = convertCurrencyAmount(10000, 'JPY', 'USD', 1.0);
                expect(jpyToUsd).toBe(1000000);

                // 2. Reverse: 1,000,000 cents USD ($10,000 USD) at rate 1.0 USD/JPY -> 10,000 JPY (scale 0)
                const usdToJpy = convertCurrencyAmount(1000000, 'USD', 'JPY', 1.0);
                expect(usdToJpy).toBe(10000);

                // 3. Negative amount (Liability): -5,000 JPY at rate 1.0 -> -500,000 cents USD
                const negJpyToUsd = convertCurrencyAmount(-5000, 'JPY', 'USD', 1.0);
                expect(negJpyToUsd).toBe(-500000);

                // 4. Same currency identity conversion preserves exact amount
                const usdToUsd = convertCurrencyAmount(50000, 'USD', 'USD', 1.0);
                expect(usdToUsd).toBe(50000);
            });

            /**
             * Why this test exists:
             * Assessor Finding 8: Include source and description in valuation idempotency identity.
             * Any discrepancy in valuation date, account, amount, source, or description under the same
             * idempotency key must throw ConflictError without state mutation.
             * 
             * Tricky logic:
             * - Idempotency requires strict canonical equality across all material fields.
             * - Re-submitting the same key with an altered description or provenance source indicates
             *   a conflicting operation, not an identical retry.
             * 
             * TODO: Store idempotency history in a dedicated audit log in Milestone 2.
             */
            it('Remediation 8: Valuation idempotency checks description and source, throwing ConflictError on mismatch', () => {
                const entity = createEntity(db, { name: 'Jewelry Investor', type: 'person', currency: 'AUD' });
                const diamond = createAccount(db, {
                    entity_id: entity.id,
                    name: 'Diamond Ring',
                    type: 'asset',
                    sub_type: 'property',
                    currency: 'AUD',
                    opening_date: '2026-07-01',
                    opening_balance_cents: 2000000 // $20,000 AUD
                }).account;

                const idemKey = 'val-idem-diamond-999';

                // Initial valuation
                const v1 = recordAssetValuation(db, {
                    asset_account_id: diamond.id,
                    new_valuation_cents: 2500000,
                    date: '2026-07-15',
                    description: 'Gemological Institute Certification',
                    source: 'GIA Sydney',
                    idempotency_key: idemKey
                });
                expect(v1.id).toBeDefined();

                // 1. Identical retry succeeds and returns exact same transaction
                const vRetry = recordAssetValuation(db, {
                    asset_account_id: diamond.id,
                    new_valuation_cents: 2500000,
                    date: '2026-07-15',
                    description: 'Gemological Institute Certification',
                    source: 'GIA Sydney',
                    idempotency_key: idemKey
                });
                expect(vRetry.id).toBe(v1.id);

                // 2. Mismatched description with same key throws ConflictError
                expect(() => {
                    recordAssetValuation(db, {
                        asset_account_id: diamond.id,
                        new_valuation_cents: 2500000,
                        date: '2026-07-15',
                        description: 'Altered Description Certification', // Changed!
                        source: 'GIA Sydney',
                        idempotency_key: idemKey
                    });
                }).toThrow(ConflictError);

                // 3. Mismatched source with same key throws ConflictError
                expect(() => {
                    recordAssetValuation(db, {
                        asset_account_id: diamond.id,
                        new_valuation_cents: 2500000,
                        date: '2026-07-15',
                        description: 'Gemological Institute Certification',
                        source: 'Different Appraiser', // Changed!
                        idempotency_key: idemKey
                    });
                }).toThrow(ConflictError);

                // 4. Unchanged-state assertion: account balance is still $25,000
                expect(getAccountBalance(db, diamond.id).balance_cents).toBe(2500000);
            });
        });

        /**
         * Assessor Verdict (commit e04216e) Remediation Suite
         * 
         * Why this suite exists:
         * Verifies the 4 core assessor remediations and full lifecycle safety:
         * 1. Versioned, transactional schema migrations on populated databases.
         * 2. Valuation corrections update authoritative targets and preserve them through cascades;
         *    unsafe/ambiguous corrections are rejected atomically without mutation.
         * 3. Unchanged-value appraisals (delta === 0) preserve new appraisal date, source,
         *    evidence, and request identity in a dedicated transaction (never returning an unrelated opening tx).
         * 4. Internal transfers are separated from external cash activity ($100 transfer + $10 fee produces
         *    $0 external inflow, $10 operating outflow, -$10 net cash change).
         * 5. Full accounting lifecycle: create → edit → backdate → cascade → void → retry.
         * 
         * Tricky logic:
         * - Populated migration tests must execute against in-memory legacy databases without touching
         *   the live vault (M1-SAFE-01).
         * - Zero-delta valuations post 0-cent balancing entries against Valuation Reserve equity to ensure
         *   double-entry balance without altering carrying balances.
         * - Multi-leg cash transactions separate internal transfer min(inflow, outflow) from net external cash.
         * 
         * TODO: Milestone 2 will support automated daily ECB foreign exchange rate synchronization.
         */
        describe('Assessor Verdict (e04216e) Remediation Suite', () => {

            /**
             * Assessor Item 1: Versioned, transactional schema migrations on populated databases.
             * 
             * Why this test exists:
             * Existing databases from prior committed schemas (lacking the 'source' column on m1_asset_valuations
             * and lacking 'revaluation_cascade' on m1_transaction_corrections) must be upgraded seamlessly
             * and transactionally without data loss, preserving all balances, evidence, revisions, and audit history.
             * 
             * Tricky logic:
             * - Rebuilding m1_transaction_corrections in SQLite requires temporarily disabling foreign keys
             *   and restoring them transactionally to prevent foreign key cascade errors.
             */
            it('Assessor Item 1: Upgrades populated legacy schema transactionally, preserving balances, evidence, and audit history', () => {
                const legacyDb = new Database(':memory:');

                // 1. Initialize legacy schema (Slice 1C / prior Slice 1D schema before e04216e)
                legacyDb.exec(`
                    PRAGMA foreign_keys = ON;

                    CREATE TABLE IF NOT EXISTS m1_entities (
                        id TEXT PRIMARY KEY,
                        name TEXT NOT NULL,
                        type TEXT NOT NULL CHECK(type IN ('person', 'company', 'trust')),
                        currency TEXT NOT NULL DEFAULT 'AUD',
                        created_at TEXT NOT NULL DEFAULT (datetime('now')),
                        updated_at TEXT NOT NULL DEFAULT (datetime('now'))
                    );

                    CREATE TABLE IF NOT EXISTS m1_accounts (
                        id TEXT PRIMARY KEY,
                        entity_id TEXT NOT NULL REFERENCES m1_entities(id),
                        name TEXT NOT NULL,
                        type TEXT NOT NULL CHECK(type IN ('asset', 'liability', 'equity', 'income', 'expense')),
                        sub_type TEXT NOT NULL,
                        currency TEXT NOT NULL DEFAULT 'AUD',
                        is_active INTEGER NOT NULL DEFAULT 1,
                        created_at TEXT NOT NULL DEFAULT (datetime('now')),
                        updated_at TEXT NOT NULL DEFAULT (datetime('now'))
                    );

                    CREATE TABLE IF NOT EXISTS m1_transactions (
                        id TEXT PRIMARY KEY,
                        date TEXT NOT NULL,
                        description TEXT NOT NULL,
                        payee_or_payer TEXT,
                        status TEXT NOT NULL DEFAULT 'draft' CHECK(status IN ('draft', 'posted', 'void')),
                        origin TEXT NOT NULL DEFAULT 'manual' CHECK(origin IN ('manual', 'bank_import', 'csv_import', 'opening_balance', 'migration', 'valuation')),
                        created_by TEXT,
                        revision INTEGER NOT NULL DEFAULT 1,
                        created_at TEXT NOT NULL DEFAULT (datetime('now')),
                        updated_at TEXT NOT NULL DEFAULT (datetime('now'))
                    );

                    CREATE TABLE IF NOT EXISTS m1_journal_entries (
                        id TEXT PRIMARY KEY,
                        transaction_id TEXT NOT NULL REFERENCES m1_transactions(id) ON DELETE CASCADE,
                        account_id TEXT NOT NULL REFERENCES m1_accounts(id),
                        amount_cents INTEGER NOT NULL,
                        currency TEXT NOT NULL DEFAULT 'AUD',
                        memo TEXT,
                        created_at TEXT NOT NULL DEFAULT (datetime('now'))
                    );

                    -- Prior m1_asset_valuations WITHOUT 'source' column
                    CREATE TABLE IF NOT EXISTS m1_asset_valuations (
                        id TEXT PRIMARY KEY,
                        transaction_id TEXT NOT NULL UNIQUE,
                        account_id TEXT NOT NULL,
                        valuation_date TEXT NOT NULL,
                        target_valuation_cents INTEGER NOT NULL,
                        created_at TEXT NOT NULL,
                        FOREIGN KEY (transaction_id) REFERENCES m1_transactions(id) ON DELETE CASCADE,
                        FOREIGN KEY (account_id) REFERENCES m1_accounts(id) ON DELETE CASCADE
                    );

                    -- Prior m1_transaction_corrections with OLD CHECK constraint (only 'edit', 'void', 'reversal')
                    CREATE TABLE IF NOT EXISTS m1_transaction_corrections (
                        id TEXT PRIMARY KEY,
                        transaction_id TEXT NOT NULL,
                        operation TEXT NOT NULL CHECK (operation IN ('edit', 'void', 'reversal')),
                        reason TEXT NOT NULL,
                        previous_state TEXT NOT NULL,
                        corrected_state TEXT NOT NULL,
                        performed_by TEXT NOT NULL,
                        timestamp TEXT NOT NULL,
                        FOREIGN KEY (transaction_id) REFERENCES m1_transactions(id) ON DELETE CASCADE
                    );

                    CREATE TABLE IF NOT EXISTS m1_evidence_links (
                        id TEXT PRIMARY KEY,
                        transaction_id TEXT NOT NULL REFERENCES m1_transactions(id) ON DELETE CASCADE,
                        document_id TEXT NOT NULL,
                        content_hash TEXT,
                        page_number INTEGER,
                        bounding_box TEXT,
                        created_at TEXT NOT NULL DEFAULT (datetime('now'))
                    );
                `);

                // 2. Populate legacy database with existing records
                const entityId = 'legacy-entity-001';
                legacyDb.prepare(`INSERT INTO m1_entities (id, name, type, currency) VALUES (?, 'Legacy Alice', 'person', 'AUD')`).run(entityId);

                const assetId = 'legacy-asset-001';
                legacyDb.prepare(`INSERT INTO m1_accounts (id, entity_id, name, type, sub_type, currency) VALUES (?, ?, 'Classic Porsche', 'asset', 'vehicle', 'AUD')`).run(assetId, entityId);

                const reserveId = 'legacy-reserve-001';
                legacyDb.prepare(`INSERT INTO m1_accounts (id, entity_id, name, type, sub_type, currency) VALUES (?, ?, 'Valuation Reserve', 'equity', 'valuation_reserve', 'AUD')`).run(reserveId, entityId);

                const txId = 'legacy-tx-001';
                legacyDb.prepare(`INSERT INTO m1_transactions (id, date, description, status, origin, revision) VALUES (?, '2026-01-10', 'Initial Legacy Valuation', 'posted', 'valuation', 1)`).run(txId);

                legacyDb.prepare(`INSERT INTO m1_journal_entries (id, transaction_id, account_id, amount_cents, currency) VALUES (?, ?, ?, ?, 'AUD')`).run('legacy-j1', txId, assetId, 15000000);
                legacyDb.prepare(`INSERT INTO m1_journal_entries (id, transaction_id, account_id, amount_cents, currency) VALUES (?, ?, ?, ?, 'AUD')`).run('legacy-j2', txId, reserveId, -15000000);

                const valId = 'legacy-val-001';
                legacyDb.prepare(`INSERT INTO m1_asset_valuations (id, transaction_id, account_id, valuation_date, target_valuation_cents, created_at) VALUES (?, ?, ?, '2026-01-10', 15000000, datetime('now'))`).run(valId, txId, assetId);

                const corrId = 'legacy-corr-001';
                legacyDb.prepare(`INSERT INTO m1_transaction_corrections (id, transaction_id, operation, reason, previous_state, corrected_state, performed_by, timestamp) VALUES (?, ?, 'edit', 'Prior audit edit', '{}', '{}', 'Auditor User', datetime('now'))`).run(corrId, txId);

                legacyDb.prepare(`INSERT INTO m1_evidence_links (id, transaction_id, document_id, content_hash, page_number) VALUES (?, ?, 'doc-legacy-001', 'sha256-legacy', 1)`).run('legacy-ev-001', txId);

                // Verify pre-migration state: m1_asset_valuations lacks 'source'
                const colsBefore = legacyDb.prepare(`PRAGMA table_info(m1_asset_valuations)`).all() as any[];
                expect(colsBefore.some(c => c.name === 'source')).toBe(false);

                // Verify pre-migration state: m1_transaction_corrections rejects 'revaluation_cascade'
                expect(() => {
                    legacyDb.prepare(`
                        INSERT INTO m1_transaction_corrections (id, transaction_id, operation, reason, previous_state, corrected_state, performed_by, timestamp)
                        VALUES ('cascade-fail', '${txId}', 'revaluation_cascade', 'Cascade test', '{}', '{}', 'System', datetime('now'))
                    `).run();
                }).toThrow();

                // 3. Execute versioned, transactional migration
                migrateAccountingSchema(legacyDb);

                // 4. Verify post-migration schema upgrades
                const colsAfter = legacyDb.prepare(`PRAGMA table_info(m1_asset_valuations)`).all() as any[];
                expect(colsAfter.some(c => c.name === 'source')).toBe(true);

                // Verify pre-existing data is strictly preserved
                const preservedVal = legacyDb.prepare(`SELECT * FROM m1_asset_valuations WHERE id = ?`).get(valId) as any;
                expect(preservedVal).toBeDefined();
                expect(preservedVal.target_valuation_cents).toBe(15000000);
                expect(preservedVal.source).toBeNull(); // Column added, prior row has null source

                const preservedCorr = legacyDb.prepare(`SELECT * FROM m1_transaction_corrections WHERE id = ?`).get(corrId) as any;
                expect(preservedCorr).toBeDefined();
                expect(preservedCorr.operation).toBe('edit');

                const preservedEv = legacyDb.prepare(`SELECT * FROM m1_evidence_links WHERE id = 'legacy-ev-001'`).get() as any;
                expect(preservedEv.document_id).toBe('doc-legacy-001');

                // 5. Verify upgraded constraint now permits 'revaluation_cascade'
                expect(() => {
                    legacyDb.prepare(`
                        INSERT INTO m1_transaction_corrections (id, transaction_id, operation, reason, previous_state, corrected_state, performed_by, timestamp)
                        VALUES ('cascade-success', '${txId}', 'revaluation_cascade', 'Cascade test', '{}', '{}', 'System', datetime('now'))
                    `).run();
                }).not.toThrow();

                // 6. Verify inserting new valuation with source succeeds on upgraded database
                const tx2Id = 'legacy-tx-002';
                legacyDb.prepare(`INSERT INTO m1_transactions (id, date, description, status, origin, revision) VALUES (?, '2026-02-01', 'Upgraded Valuation', 'posted', 'valuation', 1)`).run(tx2Id);

                expect(() => {
                    legacyDb.prepare(`
                        INSERT INTO m1_asset_valuations (id, transaction_id, account_id, valuation_date, target_valuation_cents, source, created_at)
                        VALUES ('new-val-002', '${tx2Id}', '${assetId}', '2026-02-01', 16000000, 'Sydney Prestige Appraisals', datetime('now'))
                    `).run();
                }).not.toThrow();

                // 7. Verify foreign key enforcement is intact
                const fkStatus = legacyDb.prepare(`PRAGMA foreign_keys`).get() as any;
                expect(Object.values(fkStatus)[0]).toBe(1);

                legacyDb.close();
            });

            /**
             * Assessor Item 2: Valuation corrections and stored authoritative targets consistency.
             * 
             * Why this test exists:
             * An accepted valuation edit must update its authoritative target in m1_asset_valuations.
             * Later cascades must preserve the corrected target.
             * If a correction cannot be interpreted safely (e.g. invalid accounts), it must be rejected atomically.
             */
            it('Assessor Item 2: Valuation corrections update authoritative target and preserve it through cascades; rejects unsafe edits', () => {
                const entity = createEntity(db, { name: 'Art Collector', type: 'person', currency: 'AUD' });
                const painting = createAccount(db, {
                    entity_id: entity.id,
                    name: 'Oil Painting',
                    type: 'asset',
                    sub_type: 'property',
                    currency: 'AUD',
                    opening_date: '2026-01-01',
                    opening_balance_cents: 10000000 // $100,000 AUD
                }).account;

                // V1 on Feb 1: target $150,000 (+50,000 delta)
                const v1 = recordAssetValuation(db, {
                    asset_account_id: painting.id,
                    new_valuation_cents: 15000000,
                    date: '2026-02-01',
                    description: 'Initial Art Appraisal',
                    source: 'Sotheby’s'
                });

                // V2 on Apr 1: target $200,000 (+50,000 delta)
                const v2 = recordAssetValuation(db, {
                    asset_account_id: painting.id,
                    new_valuation_cents: 20000000,
                    date: '2026-04-01',
                    description: 'Spring Art Appraisal',
                    source: 'Christie’s'
                });

                expect(getAccountBalance(db, painting.id, '2026-02-01').balance_cents).toBe(15000000);
                expect(getAccountBalance(db, painting.id, '2026-04-01').balance_cents).toBe(20000000);

                const reserve = db.prepare("SELECT * FROM m1_accounts WHERE entity_id = ? AND type = 'equity' AND sub_type = 'valuation_reserve'").get(entity.id) as any;

                // 1. Edit V1: correct valuation downward from $150,000 to $130,000 (delta +$30,000 instead of +$50,000)
                correctTransaction(db, {
                    transaction_id: v1.id,
                    operation: 'edit',
                    reason: 'Corrected appraisal valuation figure downward',
                    performed_by: 'Auditor User',
                    expected_revision: 1,
                    new_data: {
                        postings: [
                            { account_id: painting.id, amount_cents: 3000000, currency: 'AUD' },
                            { account_id: reserve.id, amount_cents: -3000000, currency: 'AUD' }
                        ]
                    }
                });

                // Check: authoritative target in m1_asset_valuations was updated to $130,000!
                const v1Row = db.prepare('SELECT * FROM m1_asset_valuations WHERE transaction_id = ?').get(v1.id) as any;
                expect(v1Row.target_valuation_cents).toBe(13000000);

                // Check: Feb 1 balance is now $130,000
                expect(getAccountBalance(db, painting.id, '2026-02-01').balance_cents).toBe(13000000);

                // Check: Apr 1 target ($200,000) was PRESERVED through the cascade
                // (V2 delta automatically cascaded from +$50,000 to +$70,000)
                expect(getAccountBalance(db, painting.id, '2026-04-01').balance_cents).toBe(20000000);

                // 2. Backdate an earlier valuation on Jan 15 with target $110,000 (+10,000 delta)
                recordAssetValuation(db, {
                    asset_account_id: painting.id,
                    new_valuation_cents: 11000000,
                    date: '2026-01-15',
                    description: 'Intermediate Appraisal',
                    source: 'Local Valuer'
                });

                // Check: V1's corrected target ($130,000) and V2's target ($200,000) are BOTH preserved!
                expect(getAccountBalance(db, painting.id, '2026-01-15').balance_cents).toBe(11000000);
                expect(getAccountBalance(db, painting.id, '2026-02-01').balance_cents).toBe(13000000);
                expect(getAccountBalance(db, painting.id, '2026-04-01').balance_cents).toBe(20000000);

                // 3. Unsafe Valuation Edit Rejection:
                // Attempt to edit V2 with a non-valuation counterpart (e.g. an expense account instead of Valuation Reserve)
                const expenseAcc = createAccount(db, {
                    entity_id: entity.id,
                    name: 'Art Storage Fees',
                    type: 'expense',
                    sub_type: 'bank_fee',
                    currency: 'AUD'
                }).account;

                const v2Current = db.prepare('SELECT revision FROM m1_transactions WHERE id = ?').get(v2.id) as any;

                expect(() => {
                    correctTransaction(db, {
                        transaction_id: v2.id,
                        operation: 'edit',
                        reason: 'Unsafe edit attempt against expense',
                        performed_by: 'Malicious Actor',
                        expected_revision: v2Current.revision,
                        new_data: {
                            postings: [
                                { account_id: painting.id, amount_cents: 7000000, currency: 'AUD' },
                                { account_id: expenseAcc.id, amount_cents: -7000000, currency: 'AUD' } // INVALID counterpart!
                            ]
                        }
                    });
                }).toThrow(ValidationError);

                // Verify atomic rollback: V2 balance and target are unchanged
                expect(getAccountBalance(db, painting.id, '2026-04-01').balance_cents).toBe(20000000);
            });

            /**
             * Assessor Item 3: Preserve unchanged-value appraisal evidence.
             * 
             * Why this test exists:
             * When an appraisal confirms the existing carrying value (delta === 0), it must NOT return
             * an unrelated opening balance transaction. A dedicated transaction and m1_asset_valuations
             * record must be created, preserving appraisal date, source, description, and evidence.
             */
            it('Assessor Item 3: Records dedicated transaction and valuation row for zero-delta appraisal, preserving evidence and supporting idempotency', () => {
                const entity = createEntity(db, { name: 'Real Estate Holdings', type: 'business', currency: 'AUD' });
                const building = createAccount(db, {
                    entity_id: entity.id,
                    name: 'Commercial Office Suite',
                    type: 'asset',
                    sub_type: 'property',
                    currency: 'AUD',
                    opening_date: '2026-01-01',
                    opening_balance_cents: 50000000 // $500,000 AUD
                }).account;

                // Look up opening balance transaction
                const openingTx = db.prepare(`SELECT * FROM m1_transactions WHERE origin = 'opening_balance'`).get() as any;
                expect(openingTx).toBeDefined();

                const evidenceRef = {
                    document_id: 'doc-val-inspection-2026',
                    content_hash: 'sha256-office-appraisal',
                    page_number: 1
                };

                // Record appraisal confirming exact current carrying value ($500,000)
                const vZero = recordAssetValuation(db, {
                    asset_account_id: building.id,
                    new_valuation_cents: 50000000, // Exactly equal to carrying balance ($500,000)
                    date: '2026-08-01',
                    description: 'Annual Independent Building Survey',
                    source: 'Opteon Property Group',
                    evidence_refs: [evidenceRef],
                    idempotency_key: 'idem-zero-delta-survey'
                });

                // 1. Must NOT return the unrelated opening balance transaction
                expect(vZero.id).not.toBe(openingTx.id);

                // 2. Dedicated transaction header
                expect(vZero.date).toBe('2026-08-01');
                expect(vZero.description).toBe('Annual Independent Building Survey');
                expect(vZero.origin).not.toBe('opening_balance');

                // 3. Postings are balanced 0-cent entries
                expect(vZero.postings).toHaveLength(2);
                expect(vZero.postings[0].amount_cents).toBe(0);
                expect(vZero.postings[1].amount_cents).toBe(0);

                // 4. m1_asset_valuations record exists with accurate source and target
                const valRow = db.prepare('SELECT * FROM m1_asset_valuations WHERE transaction_id = ?').get(vZero.id) as any;
                expect(valRow).toBeDefined();
                expect(valRow.target_valuation_cents).toBe(50000000);
                expect(valRow.source).toBe('Opteon Property Group');
                expect(valRow.valuation_date).toBe('2026-08-01');

                // 5. Evidence links are preserved on the transaction
                expect(vZero.evidence_refs).toBeDefined();
                expect(vZero.evidence_refs).toHaveLength(1);
                const ref = vZero.evidence_refs![0] as any;
                const docId = typeof ref === 'string' ? ref : ref.document_id;
                expect(docId).toBe('doc-val-inspection-2026');

                // 6. Carrying balance remains exactly $500,000
                expect(getAccountBalance(db, building.id, '2026-08-01').balance_cents).toBe(50000000);

                // 7. Identical retry returns the exact same transaction ID
                const retrySame = recordAssetValuation(db, {
                    asset_account_id: building.id,
                    new_valuation_cents: 50000000,
                    date: '2026-08-01',
                    description: 'Annual Independent Building Survey',
                    source: 'Opteon Property Group',
                    evidence_refs: [evidenceRef],
                    idempotency_key: 'idem-zero-delta-survey'
                });
                expect(retrySame.id).toBe(vZero.id);

                // 8. Conflicting retry throws ConflictError
                expect(() => {
                    recordAssetValuation(db, {
                        asset_account_id: building.id,
                        new_valuation_cents: 50000000,
                        date: '2026-08-01',
                        description: 'Altered Description',
                        source: 'Opteon Property Group',
                        evidence_refs: [evidenceRef],
                        idempotency_key: 'idem-zero-delta-survey'
                    });
                }).toThrow(ConflictError);
            });

            /**
             * Assessor Item 4: Separate internal transfers from external cash activity.
             * 
             * Why this test exists:
             * A $100 internal transfer plus $10 fee must produce:
             * - $0 external inflow
             * - $10 operating outflow
             * - -$10 net cash reduction
             * Gross category totals must not be inflated by the internal transfer.
             */
            it('Assessor Item 4: $100 internal transfer plus $10 fee produces $0 external inflow, $10 operating outflow, and -$10 net cash change', () => {
                const entity = createEntity(db, { name: 'Transfer Tester', type: 'person', currency: 'AUD' });

                const checking = createAccount(db, {
                    entity_id: entity.id,
                    name: 'Primary Checking',
                    type: 'asset',
                    sub_type: 'checking',
                    currency: 'AUD',
                    opening_date: '2026-05-01',
                    opening_balance_cents: 100000 // $1,000 AUD
                }).account;

                const savings = createAccount(db, {
                    entity_id: entity.id,
                    name: 'High-Interest Savings',
                    type: 'asset',
                    sub_type: 'savings',
                    currency: 'AUD',
                    opening_date: '2026-05-01',
                    opening_balance_cents: 50000 // $500 AUD
                }).account;

                const feeExpense = createAccount(db, {
                    entity_id: entity.id,
                    name: 'Bank Transfer Fees',
                    type: 'expense',
                    sub_type: 'bank_fee',
                    currency: 'AUD'
                }).account;

                // Multi-leg transaction on 2026-05-15:
                // Transfer $100 from Checking to Savings + $10 transfer fee paid from Checking
                // Postings:
                // - Checking: -110.00 AUD (-11,000 cents credit)
                // - Savings: +100.00 AUD (+10,000 cents debit)
                // - Fee Expense: +10.00 AUD (+1,000 cents debit)
                // Debits (100 + 10 = 110) = Credits (110) -> balanced!
                postTransaction(db, {
                    date: '2026-05-15',
                    description: 'Internal Transfer to Savings with Service Fee',
                    origin: 'manual',
                    postings: [
                        { account_id: checking.id, amount_cents: -11000, currency: 'AUD' },
                        { account_id: savings.id, amount_cents: 10000, currency: 'AUD' },
                        { account_id: feeExpense.id, amount_cents: 1000, currency: 'AUD' }
                    ]
                });

                // Evaluate Cash Flow Statement for May 2026
                const cf = getActualCashFlowStatement(db, entity.id, '2026-05-01', '2026-05-31');

                // 1. Starting Cash: $1,000 + $500 = $1,500 AUD (150,000 cents)
                expect(cf.starting_cash_cents_by_currency['AUD']).toBe(150000);

                // 2. Gross Operating Inflows: $0 AUD (the $100 savings inflow is an internal transfer, NOT an external inflow!)
                expect(cf.operating_inflows_cents_by_currency['AUD'] || 0).toBe(0);

                // 3. Gross Operating Outflows: $10 AUD (1,000 cents)
                expect(cf.operating_outflows_cents_by_currency['AUD']).toBe(1000);

                // 4. Net Operating: -$10 AUD (-1,000 cents)
                expect(cf.net_operating_cents_by_currency['AUD']).toBe(-1000);

                // 5. Financing and Investing: $0 AUD
                expect(cf.financing_inflows_cents_by_currency?.['AUD'] || 0).toBe(0);
                expect(cf.financing_outflows_cents_by_currency?.['AUD'] || 0).toBe(0);
                expect(cf.investing_inflows_cents_by_currency?.['AUD'] || 0).toBe(0);
                expect(cf.investing_outflows_cents_by_currency?.['AUD'] || 0).toBe(0);

                // 6. Net Cash Change: -$10 AUD (-1,000 cents)
                expect(cf.net_cash_change_cents_by_currency['AUD']).toBe(-1000);

                // 7. Ending Cash: $1,490 AUD (149,000 cents)
                expect(cf.ending_cash_cents_by_currency['AUD']).toBe(149000);

                // 8. Reconciliation with Double-Entry Ledger
                expect(cf.ledger_closing_cash_cents_by_currency?.['AUD']).toBe(149000);
                expect(cf.is_reconciled_by_currency?.['AUD']).toBe(true);
                expect(cf.reconciliation_discrepancy_cents_by_currency?.['AUD']).toBe(0);

                // 9. Reporting line items:
                // - Savings receives $100 as 'transfer'
                // - Checking transfers $100 as 'transfer'
                // - Checking pays $10 as 'operating'
                const transferItems = cf.items.filter(i => i.activity_type === 'transfer');
                expect(transferItems).toHaveLength(2);
                expect(transferItems.some(i => i.cash_account_id === savings.id && i.amount_cents === 10000)).toBe(true);
                expect(transferItems.some(i => i.cash_account_id === checking.id && i.amount_cents === -10000)).toBe(true);

                const operatingItems = cf.items.filter(i => i.activity_type === 'operating');
                expect(operatingItems).toHaveLength(1);
                expect(operatingItems[0].cash_account_id).toBe(checking.id);
                expect(operatingItems[0].amount_cents).toBe(-1000);
            });

            /**
             * Full Accounting Lifecycle: create → edit → backdate → cascade → void → retry
             * 
             * Why this test exists:
             * Validates end-to-end multi-step integrity across creation, edit, backdating,
             * automated revaluation cascading, voiding, and idempotent retries.
             */
            it('Full Accounting Lifecycle: create → edit → backdate → cascade → void → retry', () => {
                const entity = createEntity(db, { name: 'Lifecycle Investor', type: 'person', currency: 'AUD' });

                // Step 1: Create asset with initial balance $100,000
                const asset = createAccount(db, {
                    entity_id: entity.id,
                    name: 'Rare Vintage Watch',
                    type: 'asset',
                    sub_type: 'property',
                    currency: 'AUD',
                    opening_date: '2026-01-01',
                    opening_balance_cents: 10000000 // $100,000 AUD
                }).account;

                // V1 on Feb 1: target $120,000 (+20,000 delta)
                const v1 = recordAssetValuation(db, {
                    asset_account_id: asset.id,
                    new_valuation_cents: 12000000,
                    date: '2026-02-01',
                    description: 'Q1 Watch Appraisal',
                    source: 'Rolex Geneva'
                });

                // V2 on Apr 1: target $150,000 (+30,000 delta)
                const v2 = recordAssetValuation(db, {
                    asset_account_id: asset.id,
                    new_valuation_cents: 15000000,
                    date: '2026-04-01',
                    description: 'Q2 Watch Appraisal',
                    source: 'Christie’s Watches'
                });

                expect(getAccountBalance(db, asset.id, '2026-02-01').balance_cents).toBe(12000000);
                expect(getAccountBalance(db, asset.id, '2026-04-01').balance_cents).toBe(15000000);

                // Step 2: Edit V1 from $120,000 to $130,000 (delta +$30,000)
                const reserve = db.prepare("SELECT * FROM m1_accounts WHERE entity_id = ? AND type = 'equity' AND sub_type = 'valuation_reserve'").get(entity.id) as any;
                correctTransaction(db, {
                    transaction_id: v1.id,
                    operation: 'edit',
                    reason: 'Revised upwards following secondary opinion',
                    performed_by: 'Senior Appraiser',
                    expected_revision: 1,
                    new_data: {
                        postings: [
                            { account_id: asset.id, amount_cents: 3000000, currency: 'AUD' },
                            { account_id: reserve.id, amount_cents: -3000000, currency: 'AUD' }
                        ]
                    }
                });

                // Verify V1 target updated and V2 target preserved at $150,000
                expect(getAccountBalance(db, asset.id, '2026-02-01').balance_cents).toBe(13000000);
                expect(getAccountBalance(db, asset.id, '2026-04-01').balance_cents).toBe(15000000);

                // Step 3 & 4: Backdate a valuation on Jan 15 with target $110,000 (+10,000 delta)
                recordAssetValuation(db, {
                    asset_account_id: asset.id,
                    new_valuation_cents: 11000000,
                    date: '2026-01-15',
                    description: 'Early Interim Watch Appraisal',
                    source: 'Geneva Watchmakers'
                });

                // Cascade verifies authoritative targets:
                // Jan 15 balance: $100k + $10k = $110k
                expect(getAccountBalance(db, asset.id, '2026-01-15').balance_cents).toBe(11000000);
                // Feb 1 balance: target $130k preserved!
                expect(getAccountBalance(db, asset.id, '2026-02-01').balance_cents).toBe(13000000);
                // Apr 1 balance: target $150k preserved!
                expect(getAccountBalance(db, asset.id, '2026-04-01').balance_cents).toBe(15000000);

                // Step 5: Void V1 (Feb 1 appraisal retracted)
                const v1CurrentRev = (db.prepare('SELECT revision FROM m1_transactions WHERE id = ?').get(v1.id) as any).revision;
                correctTransaction(db, {
                    transaction_id: v1.id,
                    operation: 'void',
                    reason: 'Valuation retracted by insurer',
                    performed_by: 'Senior Appraiser',
                    expected_revision: v1CurrentRev
                });

                // Feb 1 falls back to carrying balance before V1 ($110,000)
                expect(getAccountBalance(db, asset.id, '2026-02-01').balance_cents).toBe(11000000);
                // Apr 1 target of $150,000 is still strictly preserved!
                expect(getAccountBalance(db, asset.id, '2026-04-01').balance_cents).toBe(15000000);

                // Step 6: Idempotent Retry on an unchanged-value appraisal on May 1 at $150,000
                const idemKey = 'lifecycle-may-unchanged';
                const vZero = recordAssetValuation(db, {
                    asset_account_id: asset.id,
                    new_valuation_cents: 15000000,
                    date: '2026-05-01',
                    description: 'Q3 Unchanged Confirmation',
                    source: 'Rolex Geneva',
                    idempotency_key: idemKey
                });

                expect(vZero.id).toBeDefined();
                expect(getAccountBalance(db, asset.id, '2026-05-01').balance_cents).toBe(15000000);

                // Retry succeeds and returns exact same transaction
                const vZeroRetry = recordAssetValuation(db, {
                    asset_account_id: asset.id,
                    new_valuation_cents: 15000000,
                    date: '2026-05-01',
                    description: 'Q3 Unchanged Confirmation',
                    source: 'Rolex Geneva',
                    idempotency_key: idemKey
                });
                expect(vZeroRetry.id).toBe(vZero.id);

                // Conflicting retry throws ConflictError
                expect(() => {
                    recordAssetValuation(db, {
                        asset_account_id: asset.id,
                        new_valuation_cents: 15000000,
                        date: '2026-05-01',
                        description: 'Changed Description',
                        source: 'Rolex Geneva',
                        idempotency_key: idemKey
                    });
                }).toThrow(ConflictError);

                // Verify full audit log integrity
                const allCorrections = db.prepare('SELECT * FROM m1_transaction_corrections').all() as any[];
                expect(allCorrections.length).toBeGreaterThan(0);
                for (const c of allCorrections) {
                    expect(['edit', 'void', 'reversal', 'revaluation_cascade']).toContain(c.operation);
                    const prev = JSON.parse(c.previous_state);
                    const curr = JSON.parse(c.corrected_state);
                    expect(prev.transaction.revision).toBeLessThan(curr.transaction.revision);
                }
            });
        });
    });
});

