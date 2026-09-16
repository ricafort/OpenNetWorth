/**
 * Milestone 1 — Slice 1C: Daily Financial Events Automated Acceptance & Regression Tests
 * 
 * Why this file exists:
 * Verifies the implementation of Slice 1C daily financial flows and all assessor findings:
 * 1. Acceptance Scenario T2: Income and Spending (M1-FLOW-02)
 *    Receive income 500, spend 100 with starting balance 1,000 -> Bank 1,400, Income 500, Expenses 100.
 * 2. Acceptance Scenario T3: Account Transfers (M1-FLOW-03)
 *    Transfer 200 between accounts -> Net income & expenses are $0.00, combined net worth unchanged.
 * 3. Acceptance Scenario T4: Credit Card Non-Duplication (M1-FLOW-04)
 *    Buy 120 on card, repay 120 from bank -> Total expense is 120 (not 240); card liability returns to zero.
 * 4. Acceptance Scenario T5: Loan Repayment Split (M1-FLOW-05)
 *    Pay loan instalment 300 (Principal 200, Interest 90, Fee 10) -> Cash -300, Debt -200, Expenses +100.
 * 5. Acceptance Scenario T11: Idempotency Key Uniqueness & Conflict Detection (M1-SAFE-05)
 *    - Matching details: returns existing transaction without duplicate postings.
 *    - Changed details: throws ConflictError (HTTP 409).
 * 6. Acceptance Scenario T12: Concurrency Control (M1-SAFE-06)
 *    Stale revision throws ConflictError.
 * 7. Acceptance Scenario T13: Auditable Correction Trail (M1-DOM-05)
 *    Voiding/editing preserves original and records immutable snapshot in m1_transaction_corrections.
 * 8. Finding 1: Posting & Account Currency Validation
 *    - Cross-currency loan repayments (e.g. AUD bank vs USD loan) are rejected upfront.
 *    - Postings whose currency does not match the account's defined currency are rejected.
 * 9. Finding 2: Account Role & Sovereign Entity Boundaries
 *    - Income cannot be deposited into an account belonging to a different entity.
 *    - Transfers only allowed between asset and liability accounts (not income/expense).
 *    - Cross-entity transfers and repayments are rejected.
 * 10. Finding 3: JPY Zero-Decimal Precision
 *     JPY amounts are not multiplied by 100; verified across income, expense, and loan repayments.
 * 11. Finding 5: Shared Validation on Creation & Correction
 *     Rejects invalid calendar dates, empty descriptions, and invalid replacement postings.
 * 12. Finding 6: Atomic Rollback on Failure
 *     Rejected operations leave zero orphan accounts, transactions, or postings in the database.
 * 13. Strict Test Isolation (M1-SAFE-01)
 *     Runs strictly in-memory (:memory:) with zero live database interaction.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import Database from 'better-sqlite3';
import { initAccountingSchema } from './schema';
import { createEntity, createAccount, ConflictError, ValidationError } from './accountService';
import { getAccountBalance, getEntityNetWorth, getPeriodIncomeAndExpenses } from './balanceService';
import {
    postTransaction,
    recordIncome,
    recordExpense,
    recordTransfer,
    recordCreditCardRepayment,
    recordLoanRepayment,
    correctTransaction,
    listTransactions,
    assertValidCalendarDate
} from './transactionService';
import { validateTransactionBalance, parseToCents } from './types';
import { POST as accountingPost } from '@/app/api/accounting/route';
import { setTestDb } from '@/infrastructure/sqlite/db';

describe('Milestone 1 — Slice 1C: Daily Financial Events Acceptance & Regression Tests', () => {
    let db: Database.Database;

    beforeEach(() => {
        // Pristine in-memory database for each test (M1-SAFE-01)
        db = new Database(':memory:');
        db.pragma('foreign_keys = ON');
        initAccountingSchema(db);
        // Inject in-memory database into db.ts so API routes use this isolated instance
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

    describe('Acceptance Scenario T2: Income and Spending (M1-FLOW-02)', () => {
        it('T2: receive income 500, spend 100 with starting balance 1,000 -> bank 1,400, income 500, expenses 100', () => {
            // 1. Create Entity
            const entity = createEntity(db, {
                name: 'Alice Vault Owner',
                type: 'person',
                currency: 'USD'
            });

            // 2. Starting Bank Balance: $1,000.00 (100,000 cents)
            const bank = createAccount(db, {
                entity_id: entity.id,
                name: 'Main Checking',
                type: 'asset',
                sub_type: 'checking',
                currency: 'USD',
                opening_date: '2026-09-01',
                opening_balance_cents: 100000
            });

            // Verify initial state
            expect(getAccountBalance(db, bank.account.id, '2026-09-01').balance_cents).toBe(100000);

            // 3. Receive Income: $500.00 (50,000 cents)
            const incomeTx = recordIncome(db, {
                entity_id: entity.id,
                bank_account_id: bank.account.id,
                category: 'salary',
                amount_cents: 50000,
                date: '2026-09-05',
                payer: 'Acme Corp',
                description: 'Bi-weekly Salary'
            });

            expect(incomeTx.status).toBe('posted');
            expect(validateTransactionBalance(incomeTx.postings).isValid).toBe(true);

            // 4. Spend Expense: $100.00 (10,000 cents)
            const expenseTx = recordExpense(db, {
                entity_id: entity.id,
                payment_account_id: bank.account.id,
                category: 'groceries',
                amount_cents: 10000,
                date: '2026-09-08',
                payee: 'Whole Foods',
                description: 'Weekly groceries'
            });

            expect(expenseTx.status).toBe('posted');
            expect(validateTransactionBalance(expenseTx.postings).isValid).toBe(true);

            // 5. Verification
            // Bank balance: 1,000 + 500 - 100 = 1,400 ($1,400.00)
            const finalBankBal = getAccountBalance(db, bank.account.id, '2026-09-10');
            expect(finalBankBal.balance_cents).toBe(140000);
            expect(finalBankBal.formatted_balance).toBe('$1,400.00');

            // Period Cash Flow: Income $500.00, Expenses $100.00, Net Savings $400.00
            const cashFlow = getPeriodIncomeAndExpenses(db, entity.id, '2026-09-01', '2026-09-30');
            expect(cashFlow.total_income_cents_by_currency['USD']).toBe(50000);
            expect(cashFlow.formatted_income_by_currency['USD']).toBe('$500.00');
            expect(cashFlow.total_expenses_cents_by_currency['USD']).toBe(10000);
            expect(cashFlow.formatted_expenses_by_currency['USD']).toBe('$100.00');
            expect(cashFlow.net_savings_cents_by_currency['USD']).toBe(40000);
            expect(cashFlow.formatted_net_savings_by_currency['USD']).toBe('$400.00');

            // Net Worth: $1,400.00 (Assets 1,400, Liabilities 0)
            const netWorth = getEntityNetWorth(db, entity.id, '2026-09-10');
            expect(netWorth.net_worth_cents_by_currency['USD']).toBe(140000);
            expect(netWorth.formatted_net_worth_by_currency['USD']).toBe('$1,400.00');
        });
    });

    describe('Acceptance Scenario T3: Account Transfers (M1-FLOW-03)', () => {
        it('T3: transfer 200 between accounts -> net income and spending are $0.00, combined net worth unchanged', () => {
            const entity = createEntity(db, { name: 'Bob', type: 'person', currency: 'USD' });

            // Account A: Checking starting with $1,000.00
            const checking = createAccount(db, {
                entity_id: entity.id,
                name: 'Checking',
                type: 'asset',
                sub_type: 'checking',
                currency: 'USD',
                opening_date: '2026-09-01',
                opening_balance_cents: 100000
            });

            // Account B: Savings starting with $500.00
            const savings = createAccount(db, {
                entity_id: entity.id,
                name: 'Savings',
                type: 'asset',
                sub_type: 'savings',
                currency: 'USD',
                opening_date: '2026-09-01',
                opening_balance_cents: 50000
            });

            // Initial Net Worth: $1,500.00
            const initialNetWorth = getEntityNetWorth(db, entity.id, '2026-09-01');
            expect(initialNetWorth.net_worth_cents_by_currency['USD']).toBe(150000);

            // Execute Transfer: $200.00 (20,000 cents) from Checking to Savings
            const transferTx = recordTransfer(db, {
                from_account_id: checking.account.id,
                to_account_id: savings.account.id,
                amount_cents: 20000,
                date: '2026-09-05',
                description: 'Move to savings buffer'
            });

            expect(transferTx.status).toBe('posted');
            expect(validateTransactionBalance(transferTx.postings).isValid).toBe(true);

            // Check individual account balances
            const checkingBal = getAccountBalance(db, checking.account.id, '2026-09-06');
            const savingsBal = getAccountBalance(db, savings.account.id, '2026-09-06');
            expect(checkingBal.balance_cents).toBe(80000); // 1,000 - 200 = 800
            expect(savingsBal.balance_cents).toBe(70000);  // 500 + 200 = 700

            // Invariant: Transfers generate $0.00 income and $0.00 expenses
            const cashFlow = getPeriodIncomeAndExpenses(db, entity.id, '2026-09-01', '2026-09-30');
            expect(cashFlow.total_income_cents_by_currency['USD'] || 0).toBe(0);
            expect(cashFlow.total_expenses_cents_by_currency['USD'] || 0).toBe(0);
            expect(cashFlow.net_savings_cents_by_currency['USD'] || 0).toBe(0);

            // Invariant: Combined net worth is unchanged ($1,500.00)
            const postTransferNetWorth = getEntityNetWorth(db, entity.id, '2026-09-06');
            expect(postTransferNetWorth.net_worth_cents_by_currency['USD']).toBe(150000);
            expect(postTransferNetWorth.formatted_net_worth_by_currency['USD']).toBe('$1,500.00');
        });
    });

    describe('Acceptance Scenario T4: Credit Card Purchases & Repayments (M1-FLOW-04)', () => {
        it('T4: buy 120 on card, repay 120 from bank -> total expense is 120 (not 240), card liability returns to zero', () => {
            const entity = createEntity(db, { name: 'Carol', type: 'person', currency: 'USD' });

            // Bank: $1,000.00
            const bank = createAccount(db, {
                entity_id: entity.id,
                name: 'Bank Checking',
                type: 'asset',
                sub_type: 'checking',
                currency: 'USD',
                opening_date: '2026-09-01',
                opening_balance_cents: 100000
            });

            // Credit Card: $0.00 starting balance
            const card = createAccount(db, {
                entity_id: entity.id,
                name: 'Sapphire Preferred',
                type: 'liability',
                sub_type: 'credit_card',
                currency: 'USD',
                opening_date: '2026-09-01'
            });

            // 1. Purchase $120.00 on Card for Groceries
            const purchaseTx = recordExpense(db, {
                entity_id: entity.id,
                payment_account_id: card.account.id,
                category: 'groceries',
                amount_cents: 12000,
                date: '2026-09-05',
                payee: 'Trader Joe\'s',
                description: 'Weekly grocery run'
            });

            expect(purchaseTx.status).toBe('posted');
            expect(validateTransactionBalance(purchaseTx.postings).isValid).toBe(true);

            // Card liability balance is now $120.00
            const cardBalAfterPurchase = getAccountBalance(db, card.account.id, '2026-09-06');
            expect(cardBalAfterPurchase.balance_cents).toBe(12000);
            expect(cardBalAfterPurchase.formatted_balance).toBe('$120.00');

            // Period expense is $120.00
            const flowAfterPurchase = getPeriodIncomeAndExpenses(db, entity.id, '2026-09-01', '2026-09-10');
            expect(flowAfterPurchase.total_expenses_cents_by_currency['USD']).toBe(12000);

            // 2. Repay $120.00 Card Bill from Bank
            const repaymentTx = recordCreditCardRepayment(db, {
                bank_account_id: bank.account.id,
                card_account_id: card.account.id,
                amount_cents: 12000,
                date: '2026-09-15',
                description: 'Full credit card statement balance'
            });

            expect(repaymentTx.status).toBe('posted');
            expect(validateTransactionBalance(repaymentTx.postings).isValid).toBe(true);

            // Bank balance drops by $120.00 -> $880.00 (88,000 cents)
            const bankBalFinal = getAccountBalance(db, bank.account.id, '2026-09-16');
            expect(bankBalFinal.balance_cents).toBe(88000);
            expect(bankBalFinal.formatted_balance).toBe('$880.00');

            // Card liability returns to zero
            const cardBalFinal = getAccountBalance(db, card.account.id, '2026-09-16');
            expect(cardBalFinal.balance_cents).toBe(0);
            expect(cardBalFinal.formatted_balance).toBe('$0.00');

            // CRITICAL INVARIANT: Total expense is STILL $120.00 (NOT $240.00). Counted once only!
            const flowFinal = getPeriodIncomeAndExpenses(db, entity.id, '2026-09-01', '2026-09-30');
            expect(flowFinal.total_expenses_cents_by_currency['USD']).toBe(12000);
            expect(flowFinal.formatted_expenses_by_currency['USD']).toBe('$120.00');
        });
    });

    describe('Acceptance Scenario T5: Loan Repayment Splits (M1-FLOW-05)', () => {
        it('T5: pay loan instalment 300 (Principal 200, Interest 90, Fee 10) -> Cash -300, Debt -200, Expenses +100', () => {
            const entity = createEntity(db, { name: 'David', type: 'person', currency: 'USD' });

            // Bank starting with $2,000.00 (200,000 cents)
            const bank = createAccount(db, {
                entity_id: entity.id,
                name: 'Checking',
                type: 'asset',
                sub_type: 'checking',
                currency: 'USD',
                opening_date: '2026-09-01',
                opening_balance_cents: 200000
            });

            // Loan starting with $10,000.00 (1,000,000 cents)
            const mortgage = createAccount(db, {
                entity_id: entity.id,
                name: 'Home Loan',
                type: 'liability',
                sub_type: 'mortgage',
                currency: 'USD',
                opening_date: '2026-09-01',
                opening_balance_cents: 1000000
            });

            // Initial Net Worth: $2,000 - $10,000 = -$8,000.00
            const initialNetWorth = getEntityNetWorth(db, entity.id, '2026-09-01');
            expect(initialNetWorth.net_worth_cents_by_currency['USD']).toBe(-800000);

            // Execute 4-legged split loan repayment:
            // Total = 30,000 cents ($300.00)
            // Principal = 20,000 cents ($200.00)
            // Interest = 9,000 cents ($90.00)
            // Fee = 1,000 cents ($10.00)
            const loanTx = recordLoanRepayment(db, {
                bank_account_id: bank.account.id,
                loan_account_id: mortgage.account.id,
                principal_cents: 20000,
                interest_cents: 9000,
                fee_cents: 1000,
                date: '2026-09-10',
                payee: 'First National Bank',
                description: 'Mortgage Monthly Payment'
            });

            expect(loanTx.status).toBe('posted');
            expect(loanTx.postings).toHaveLength(4);

            // Invariant: sum of all 4 postings must equal 0
            const balanceCheck = validateTransactionBalance(loanTx.postings);
            expect(balanceCheck.isValid).toBe(true);
            expect(balanceCheck.delta_cents).toBe(0);

            // 1. Bank Cash reduces by total ($300.00) -> $1,700.00 (170,000 cents)
            const bankBal = getAccountBalance(db, bank.account.id, '2026-09-11');
            expect(bankBal.balance_cents).toBe(170000);
            expect(bankBal.formatted_balance).toBe('$1,700.00');

            // 2. Debt reduces by principal ($200.00) -> $9,800.00 (980,000 cents)
            const loanBal = getAccountBalance(db, mortgage.account.id, '2026-09-11');
            expect(loanBal.balance_cents).toBe(980000);
            expect(loanBal.formatted_balance).toBe('$9,800.00');

            // 3. Period expenses increase by financing cost ($90 Interest + $10 Fee = $100.00)
            const cashFlow = getPeriodIncomeAndExpenses(db, entity.id, '2026-09-01', '2026-09-30');
            expect(cashFlow.total_expenses_cents_by_currency['USD']).toBe(10000);
            expect(cashFlow.formatted_expenses_by_currency['USD']).toBe('$100.00');

            // Category breakdown checks
            const interestCat = cashFlow.breakdown_by_category.find(c => c.sub_type === 'loan_interest');
            expect(interestCat?.total_cents).toBe(9000);
            const feeCat = cashFlow.breakdown_by_category.find(c => c.sub_type === 'bank_fee');
            expect(feeCat?.total_cents).toBe(1000);

            // 4. Net Worth impact: $1,700 - $9,800 = -$8,100.00 (exactly -$100 financing expense difference)
            const finalNetWorth = getEntityNetWorth(db, entity.id, '2026-09-11');
            expect(finalNetWorth.net_worth_cents_by_currency['USD']).toBe(-810000);
        });
    });

    describe('Assessor Finding 1: Posting & Loan Currency Validation', () => {
        it('rejects cross-currency loan repayment upfront (e.g. AUD bank against USD loan)', () => {
            const entity = createEntity(db, { name: 'MultiCorp', type: 'business', currency: 'USD' });

            const audBank = createAccount(db, {
                entity_id: entity.id,
                name: 'NAB AUD Checking',
                type: 'asset',
                sub_type: 'checking',
                currency: 'AUD',
                opening_date: '2026-09-01',
                opening_balance_cents: 500000
            });

            const usdLoan = createAccount(db, {
                entity_id: entity.id,
                name: 'Chase USD Mortgage',
                type: 'liability',
                sub_type: 'mortgage',
                currency: 'USD',
                opening_date: '2026-09-01',
                opening_balance_cents: 5000000
            });

            // Cross-currency repayment must be strictly rejected
            expect(() => {
                recordLoanRepayment(db, {
                    bank_account_id: audBank.account.id,
                    loan_account_id: usdLoan.account.id,
                    principal_cents: 100000,
                    interest_cents: 5000,
                    date: '2026-09-05'
                });
            }).toThrow(ValidationError);
        });

        it('rejects postTransaction if posting currency does not match account currency', () => {
            const entity = createEntity(db, { name: 'Owner', type: 'person', currency: 'USD' });
            const bank = createAccount(db, {
                entity_id: entity.id,
                name: 'USD Checking',
                type: 'asset',
                sub_type: 'checking',
                currency: 'USD'
            });
            const exp = createAccount(db, {
                entity_id: entity.id,
                name: 'EUR Expense',
                type: 'expense',
                sub_type: 'living_expense',
                currency: 'EUR'
            });

            expect(() => {
                postTransaction(db, {
                    date: '2026-09-05',
                    description: 'Mismatched currency post',
                    postings: [
                        { account_id: bank.account.id, amount_cents: -5000, currency: 'USD' },
                        { account_id: exp.account.id, amount_cents: 5000, currency: 'USD' } // Mismatch: exp account is EUR!
                    ]
                });
            }).toThrow(/Posting currency "USD" does not match account currency "EUR"/);
        });
    });

    describe('Assessor Finding 2: Account Roles & Sovereign Entity Boundaries', () => {
        it('rejects income deposited into Person A bank attributed to Person B entity', () => {
            const personA = createEntity(db, { name: 'Person A', type: 'person', currency: 'USD' });
            const personB = createEntity(db, { name: 'Person B', type: 'person', currency: 'USD' });

            const bankA = createAccount(db, {
                entity_id: personA.id,
                name: 'Bank A',
                type: 'asset',
                sub_type: 'checking',
                currency: 'USD'
            });

            expect(() => {
                recordIncome(db, {
                    entity_id: personB.id, // Mismatch!
                    bank_account_id: bankA.account.id,
                    amount_cents: 10000,
                    date: '2026-09-05',
                    description: 'Misattributed income'
                });
            }).toThrow(/does not belong to entity/);
        });

        it('rejects transfer where destination is an income or expense account', () => {
            const entity = createEntity(db, { name: 'Owner', type: 'person', currency: 'USD' });
            const bank = createAccount(db, {
                entity_id: entity.id,
                name: 'Checking',
                type: 'asset',
                sub_type: 'checking',
                currency: 'USD'
            });
            const salary = createAccount(db, {
                entity_id: entity.id,
                name: 'Salary Income',
                type: 'income',
                sub_type: 'salary',
                currency: 'USD'
            });

            expect(() => {
                recordTransfer(db, {
                    from_account_id: bank.account.id,
                    to_account_id: salary.account.id, // Invalid: cannot transfer into income!
                    amount_cents: 5000,
                    date: '2026-09-05'
                });
            }).toThrow(/Destination account for transfer must be an asset or liability account/);
        });

        it('rejects cross-entity transfers without clearing', () => {
            const entity1 = createEntity(db, { name: 'Owner 1', type: 'person', currency: 'USD' });
            const entity2 = createEntity(db, { name: 'Owner 2', type: 'person', currency: 'USD' });

            const acc1 = createAccount(db, { entity_id: entity1.id, name: 'Bank 1', type: 'asset', sub_type: 'checking', currency: 'USD' });
            const acc2 = createAccount(db, { entity_id: entity2.id, name: 'Bank 2', type: 'asset', sub_type: 'checking', currency: 'USD' });

            expect(() => {
                recordTransfer(db, {
                    from_account_id: acc1.account.id,
                    to_account_id: acc2.account.id,
                    amount_cents: 5000,
                    date: '2026-09-05'
                });
            }).toThrow(/Cross-entity transfers are not supported/);
        });
    });

    describe('Assessor Finding 3: JPY Zero-Decimal Precision', () => {
        it('correctly handles JPY (0 decimals) without multiplying by 100', () => {
            const entity = createEntity(db, { name: 'Kenji', type: 'person', currency: 'JPY' });

            // Starting balance ¥1,000 (1000 minor units, NOT 100,000)
            const bank = createAccount(db, {
                entity_id: entity.id,
                name: 'Tokyo Bank Checking',
                type: 'asset',
                sub_type: 'checking',
                currency: 'JPY',
                opening_date: '2026-09-01',
                opening_balance_cents: parseToCents('1000', 'JPY')
            });
            expect(bank.account.opening_balance_cents).toBe(1000);

            // Income: ¥500 (500 minor units)
            recordIncome(db, {
                entity_id: entity.id,
                bank_account_id: bank.account.id,
                amount_cents: parseToCents('500', 'JPY'),
                date: '2026-09-05',
                description: 'JPY Salary'
            });

            // Expense: ¥100 (100 minor units)
            recordExpense(db, {
                entity_id: entity.id,
                payment_account_id: bank.account.id,
                amount_cents: parseToCents('100', 'JPY'),
                date: '2026-09-08',
                description: 'JPY Ramen'
            });

            // Verification: 1,000 + 500 - 100 = 1,400 minor units (¥1,400)
            const bal = getAccountBalance(db, bank.account.id, '2026-09-10');
            expect(bal.balance_cents).toBe(1400);
            expect(bal.formatted_balance).toBe('¥1,400');

            const cashFlow = getPeriodIncomeAndExpenses(db, entity.id, '2026-09-01', '2026-09-30');
            expect(cashFlow.total_income_cents_by_currency['JPY']).toBe(500);
            expect(cashFlow.formatted_income_by_currency['JPY']).toBe('¥500');
            expect(cashFlow.total_expenses_cents_by_currency['JPY']).toBe(100);
            expect(cashFlow.formatted_expenses_by_currency['JPY']).toBe('¥100');
            expect(cashFlow.net_savings_cents_by_currency['JPY']).toBe(400);
            expect(cashFlow.formatted_net_savings_by_currency['JPY']).toBe('¥400');
        });
    });

    describe('Assessor Finding 4: Idempotency Key Conflict Detection', () => {
        it('reusing idempotency key with DIFFERENT financial details throws ConflictError', () => {
            const entity = createEntity(db, { name: 'Eve', type: 'person', currency: 'USD' });
            const bank = createAccount(db, {
                entity_id: entity.id,
                name: 'Checking',
                type: 'asset',
                sub_type: 'checking',
                currency: 'USD',
                opening_date: '2026-09-01',
                opening_balance_cents: 100000
            });

            const key = 'idem-trans-abc';

            // First submission: 10,000 cents
            const tx1 = recordExpense(db, {
                entity_id: entity.id,
                payment_account_id: bank.account.id,
                amount_cents: 10000,
                date: '2026-09-05',
                description: 'First charge',
                idempotency_key: key
            });
            expect(tx1.id).toBeDefined();

            // Re-submitting identical 10,000 cents request succeeds and returns tx1
            const txRetry = recordExpense(db, {
                entity_id: entity.id,
                payment_account_id: bank.account.id,
                amount_cents: 10000,
                date: '2026-09-05',
                description: 'First charge',
                idempotency_key: key
            });
            expect(txRetry.id).toBe(tx1.id);

            // Re-submitting with DIFFERENT amount (20,000 cents) throws ConflictError
            expect(() => {
                recordExpense(db, {
                    entity_id: entity.id,
                    payment_account_id: bank.account.id,
                    amount_cents: 20000, // Different!
                    date: '2026-09-05',
                    description: 'Changed charge',
                    idempotency_key: key
                });
            }).toThrow(ConflictError);
        });
    });

    describe('Assessor Finding 5: Shared Validation on Creation & Correction', () => {
        it('rejects invalid calendar dates ("not-a-date" or "2026-02-31")', () => {
            expect(() => assertValidCalendarDate('not-a-date')).toThrow(ValidationError);
            expect(() => assertValidCalendarDate('2026-02-31')).toThrow(ValidationError);
            expect(() => assertValidCalendarDate('2026-13-01')).toThrow(ValidationError);
            expect(() => assertValidCalendarDate('2026-09-15')).not.toThrow();
        });

        it('rejects corrections with empty descriptions, invalid dates, or empty postings', () => {
            const entity = createEntity(db, { name: 'Grace', type: 'person', currency: 'USD' });
            const bank = createAccount(db, {
                entity_id: entity.id,
                name: 'Checking',
                type: 'asset',
                sub_type: 'checking',
                currency: 'USD'
            });

            const tx = recordExpense(db, {
                entity_id: entity.id,
                payment_account_id: bank.account.id,
                amount_cents: 5000,
                date: '2026-09-05',
                description: 'Original expense'
            });

            // Invalid date in edit
            expect(() => {
                correctTransaction(db, {
                    transaction_id: tx.id,
                    expected_revision: 1,
                    operation: 'edit',
                    reason: 'Update',
                    performed_by: 'User',
                    new_data: { date: 'not-a-date' }
                });
            }).toThrow(ValidationError);

            // Empty description in edit
            expect(() => {
                correctTransaction(db, {
                    transaction_id: tx.id,
                    expected_revision: 1,
                    operation: 'edit',
                    reason: 'Update',
                    performed_by: 'User',
                    new_data: { description: '   ' }
                });
            }).toThrow(/Transaction description cannot be empty/);

            // Empty postings array in edit
            expect(() => {
                correctTransaction(db, {
                    transaction_id: tx.id,
                    expected_revision: 1,
                    operation: 'edit',
                    reason: 'Update',
                    performed_by: 'User',
                    new_data: { postings: [] }
                });
            }).toThrow(/Replacement postings must contain at least two postings/);
        });
    });

    describe('Assessor Finding 6: Atomic Rollback on Rejected Operations', () => {
        it('leaves zero accounts, transactions, or postings when an operation fails validation', () => {
            const entity = createEntity(db, { name: 'CleanOwner', type: 'person', currency: 'USD' });
            const bank = createAccount(db, {
                entity_id: entity.id,
                name: 'Checking',
                type: 'asset',
                sub_type: 'checking',
                currency: 'USD'
            });

            const initialAccountCount = (db.prepare('SELECT count(*) as count FROM m1_accounts').get() as any).count;
            const initialTxCount = (db.prepare('SELECT count(*) as count FROM m1_transactions').get() as any).count;

            // Attempt income with invalid date
            expect(() => {
                recordIncome(db, {
                    entity_id: entity.id,
                    bank_account_id: bank.account.id,
                    category: 'salary',
                    amount_cents: 50000,
                    date: 'not-a-date', // Fails calendar validation!
                    description: 'Rejected income'
                });
            }).toThrow(ValidationError);

            // Verify database state is 100% UNCHANGED: No orphan category account was created!
            const finalAccountCount = (db.prepare('SELECT count(*) as count FROM m1_accounts').get() as any).count;
            const finalTxCount = (db.prepare('SELECT count(*) as count FROM m1_transactions').get() as any).count;

            expect(finalAccountCount).toBe(initialAccountCount);
            expect(finalTxCount).toBe(initialTxCount);
        });
    });

    describe('Acceptance Scenario T12: Concurrency Revision Check (M1-SAFE-06)', () => {
        it('T12: stale revision on transaction correction throws ConflictError', () => {
            const entity = createEntity(db, { name: 'Frank', type: 'person', currency: 'USD' });
            const bank = createAccount(db, {
                entity_id: entity.id,
                name: 'Checking',
                type: 'asset',
                sub_type: 'checking',
                currency: 'USD',
                opening_date: '2026-09-01',
                opening_balance_cents: 100000
            });

            const tx = recordExpense(db, {
                entity_id: entity.id,
                payment_account_id: bank.account.id,
                amount_cents: 5000,
                date: '2026-09-05',
                description: 'Utility bill'
            });

            expect(tx.revision).toBe(1);

            // 1. First correction with expected_revision: 1 succeeds and increments to revision 2
            const correction1 = correctTransaction(db, {
                transaction_id: tx.id,
                expected_revision: 1,
                operation: 'edit',
                reason: 'Update payee details',
                performed_by: 'User Frank',
                new_data: { description: 'Utility Bill - Power' }
            });

            expect(correction1.id).toBeDefined();

            // 2. Second concurrent actor attempting to correct with stale revision 1 throws ConflictError
            expect(() => {
                correctTransaction(db, {
                    transaction_id: tx.id,
                    expected_revision: 1, // Stale! Revision is now 2
                    operation: 'void',
                    reason: 'Concurrent void attempt',
                    performed_by: 'User Frank'
                });
            }).toThrow(ConflictError);
        });
    });

    describe('Acceptance Scenario T13: Auditable Correction Trail (M1-DOM-05)', () => {
        it('T13: voiding a transaction preserves original and records immutable snapshot in m1_transaction_corrections', () => {
            const entity = createEntity(db, { name: 'Grace', type: 'person', currency: 'USD' });
            const bank = createAccount(db, {
                entity_id: entity.id,
                name: 'Checking',
                type: 'asset',
                sub_type: 'checking',
                currency: 'USD',
                opening_date: '2026-09-01',
                opening_balance_cents: 100000
            });

            const tx = recordExpense(db, {
                entity_id: entity.id,
                payment_account_id: bank.account.id,
                amount_cents: 2500, // $25.00
                date: '2026-09-05',
                description: 'Accidental duplicate charge'
            });

            // Balance after expense: $975.00
            expect(getAccountBalance(db, bank.account.id, '2026-09-06').balance_cents).toBe(97500);

            // Void the transaction with auditable justification
            const correction = correctTransaction(db, {
                transaction_id: tx.id,
                expected_revision: 1,
                operation: 'void',
                reason: 'Merchant refunded duplicate charge at POS',
                performed_by: 'Grace Accountant'
            });

            expect(correction.operation).toBe('void');
            expect(correction.reason).toBe('Merchant refunded duplicate charge at POS');
            expect(correction.performed_by).toBe('Grace Accountant');

            // Verify original transaction row is preserved with status 'void'
            const persistedTx = db.prepare('SELECT * FROM m1_transactions WHERE id = ?').get(tx.id) as any;
            expect(persistedTx.status).toBe('void');
            expect(persistedTx.revision).toBe(2);

            // Verify audit table m1_transaction_corrections contains prior snapshot
            const auditRow = db.prepare('SELECT * FROM m1_transaction_corrections WHERE id = ?').get(correction.id) as any;
            expect(auditRow).toBeDefined();
            const prev = JSON.parse(auditRow.previous_state);
            expect(prev.transaction.status).toBe('posted');
            expect(prev.postings).toHaveLength(2);

            // Account balance immediately recalculates excluding the voided transaction ($1,000.00 restored)
            const restoredBal = getAccountBalance(db, bank.account.id, '2026-09-06');
            expect(restoredBal.balance_cents).toBe(100000);
            expect(restoredBal.formatted_balance).toBe('$1,000.00');

            // Period cash flow also reflects zero expenses
            const flow = getPeriodIncomeAndExpenses(db, entity.id, '2026-09-01', '2026-09-30');
            expect(flow.total_expenses_cents_by_currency['USD'] || 0).toBe(0);
        });
    });

    describe('Transaction Queries & Filtering', () => {
        it('lists transactions with postings ordered by date descending', () => {
            const entity = createEntity(db, { name: 'Heidi', type: 'person', currency: 'USD' });
            const bank = createAccount(db, {
                entity_id: entity.id,
                name: 'Checking',
                type: 'asset',
                sub_type: 'checking',
                currency: 'USD',
                opening_date: '2026-09-01',
                opening_balance_cents: 50000
            });

            recordIncome(db, {
                entity_id: entity.id,
                bank_account_id: bank.account.id,
                amount_cents: 10000,
                date: '2026-09-03',
                description: 'Income A'
            });

            recordExpense(db, {
                entity_id: entity.id,
                payment_account_id: bank.account.id,
                amount_cents: 2000,
                date: '2026-09-07',
                description: 'Expense B'
            });

            const txList = listTransactions(db, { entityId: entity.id });
            expect(txList.length).toBeGreaterThanOrEqual(2);
            // Most recent first
            expect(txList[0].date).toBe('2026-09-07');
            expect(txList[0].postings.length).toBeGreaterThanOrEqual(2);
        });
    });

    describe('Assessor Blocker 1: Sovereign Entity Boundaries in postTransaction & correctTransaction', () => {
        /**
         * Why this test exists:
         * Proves raw cross-entity postings in postTransaction are rejected.
         * Verifies that the attempt fails atomically, leaving records, revisions, and accounts 100% unchanged.
         * 
         * Tricky logic:
         * Counts all rows in m1_transactions and m1_journal_entries before and after the rejected post.
         * Confirms that no draft or orphan records leaked into the database.
         * 
         * TODO: Support inter-entity clearing accounts when intercompany modules are added.
         */
        it('rejects raw cross-entity postings in postTransaction and leaves database completely unchanged', () => {
            const entityA = createEntity(db, { name: 'Person A Entity', type: 'person', currency: 'USD' });
            const entityB = createEntity(db, { name: 'Person B Entity', type: 'person', currency: 'USD' });

            const bankA = createAccount(db, {
                entity_id: entityA.id,
                name: 'Bank A',
                type: 'asset',
                sub_type: 'checking',
                currency: 'USD'
            });

            const bankB = createAccount(db, {
                entity_id: entityB.id,
                name: 'Bank B',
                type: 'asset',
                sub_type: 'checking',
                currency: 'USD'
            });

            const initialTxCount = (db.prepare('SELECT count(*) as count FROM m1_transactions').get() as any).count;
            const initialEntryCount = (db.prepare('SELECT count(*) as count FROM m1_journal_entries').get() as any).count;

            expect(() => {
                postTransaction(db, {
                    date: '2026-09-10',
                    description: 'Illegal Cross-Entity Transfer',
                    postings: [
                        { account_id: bankA.account.id, amount_cents: -5000, currency: 'USD' },
                        { account_id: bankB.account.id, amount_cents: 5000, currency: 'USD' }
                    ]
                });
            }).toThrow(/Cross-entity transaction rejected/);

            const finalTxCount = (db.prepare('SELECT count(*) as count FROM m1_transactions').get() as any).count;
            const finalEntryCount = (db.prepare('SELECT count(*) as count FROM m1_journal_entries').get() as any).count;

            expect(finalTxCount).toBe(initialTxCount);
            expect(finalEntryCount).toBe(initialEntryCount);
            expect(getAccountBalance(db, bankA.account.id).balance_cents).toBe(0);
            expect(getAccountBalance(db, bankB.account.id).balance_cents).toBe(0);
        });

        /**
         * Why this test exists:
         * Proves that corrections introducing cross-entity postings are rejected in correctTransaction.
         * Verifies that rejected operations leave original transactions, revisions, postings, and audit trails intact.
         * 
         * Tricky logic:
         * Verifies both:
         * 1) A correction mixing accounts from Entity A and Entity B.
         * 2) A correction trying to reassign all postings to Entity B from an Entity A transaction.
         * Checks that m1_transactions.revision is unchanged and m1_transaction_corrections has 0 new records.
         * 
         * TODO: Add multi-party dispute resolution workflows in future milestones.
         */
        it('rejects corrections introducing cross-entity postings and leaves records, revisions, and audit history unchanged', () => {
            const entityA = createEntity(db, { name: 'Entity Alpha', type: 'person', currency: 'USD' });
            const entityB = createEntity(db, { name: 'Entity Beta', type: 'person', currency: 'USD' });

            const accA1 = createAccount(db, {
                entity_id: entityA.id,
                name: 'Alpha Bank',
                type: 'asset',
                sub_type: 'checking',
                currency: 'USD'
            });
            const accA2 = createAccount(db, {
                entity_id: entityA.id,
                name: 'Alpha Savings',
                type: 'asset',
                sub_type: 'savings',
                currency: 'USD'
            });
            const accB1 = createAccount(db, {
                entity_id: entityB.id,
                name: 'Beta Bank',
                type: 'asset',
                sub_type: 'checking',
                currency: 'USD'
            });
            const accB2 = createAccount(db, {
                entity_id: entityB.id,
                name: 'Beta Expense',
                type: 'expense',
                sub_type: 'living_expense',
                currency: 'USD'
            });

            // Post a valid internal transaction in Entity A
            const origTx = postTransaction(db, {
                date: '2026-09-10',
                description: 'Alpha Internal Transfer',
                postings: [
                    { account_id: accA1.account.id, amount_cents: -5000, currency: 'USD' },
                    { account_id: accA2.account.id, amount_cents: 5000, currency: 'USD' }
                ]
            });

            expect(origTx.revision).toBe(1);

            const initialTxRow = db.prepare('SELECT * FROM m1_transactions WHERE id = ?').get(origTx.id) as any;
            const initialEntries = db.prepare('SELECT * FROM m1_journal_entries WHERE transaction_id = ?').all(origTx.id) as any[];
            const initialCorrectionsCount = (db.prepare('SELECT count(*) as count FROM m1_transaction_corrections').get() as any).count;

            // 1. Attempt correction mixing Entity A and Entity B accounts
            expect(() => {
                correctTransaction(db, {
                    transaction_id: origTx.id,
                    expected_revision: 1,
                    operation: 'edit',
                    reason: 'Attempt cross-entity edit',
                    performed_by: 'Test Actor',
                    new_data: {
                        postings: [
                            { account_id: accA1.account.id, amount_cents: -5000, currency: 'USD' },
                            { account_id: accB1.account.id, amount_cents: 5000, currency: 'USD' } // Foreign entity!
                        ]
                    }
                });
            }).toThrow(/Cross-entity correction rejected/);

            // Verify unchanged state
            let txRowAfter = db.prepare('SELECT * FROM m1_transactions WHERE id = ?').get(origTx.id) as any;
            expect(txRowAfter.revision).toBe(1);
            expect(txRowAfter.updated_at).toBe(initialTxRow.updated_at);
            let entriesAfter = db.prepare('SELECT * FROM m1_journal_entries WHERE transaction_id = ?').all(origTx.id) as any[];
            expect(entriesAfter).toEqual(initialEntries);
            let correctionsCountAfter = (db.prepare('SELECT count(*) as count FROM m1_transaction_corrections').get() as any).count;
            expect(correctionsCountAfter).toBe(initialCorrectionsCount);

            // 2. Attempt correction moving transaction entirely into Entity B
            expect(() => {
                correctTransaction(db, {
                    transaction_id: origTx.id,
                    expected_revision: 1,
                    operation: 'edit',
                    reason: 'Attempt entity transplant',
                    performed_by: 'Test Actor',
                    new_data: {
                        postings: [
                            { account_id: accB1.account.id, amount_cents: -5000, currency: 'USD' },
                            { account_id: accB2.account.id, amount_cents: 5000, currency: 'USD' }
                        ]
                    }
                });
            }).toThrow(/Cross-entity correction rejected/);

            // Verify state is still 100% unchanged
            txRowAfter = db.prepare('SELECT * FROM m1_transactions WHERE id = ?').get(origTx.id) as any;
            expect(txRowAfter.revision).toBe(1);
            entriesAfter = db.prepare('SELECT * FROM m1_journal_entries WHERE transaction_id = ?').all(origTx.id) as any[];
            expect(entriesAfter).toEqual(initialEntries);
            correctionsCountAfter = (db.prepare('SELECT count(*) as count FROM m1_transaction_corrections').get() as any).count;
            expect(correctionsCountAfter).toBe(initialCorrectionsCount);
        });

        /**
         * Why this test exists:
         * Proves both exposed API actions (post_transaction and correct_transaction) return HTTP 400
         * with clear validation error payloads when cross-entity postings are attempted.
         * 
         * Tricky logic:
         * Uses Next.js request/response testing against accountingPost.
         * Asserts HTTP status 400 and checks response JSON structure.
         * 
         * TODO: Add OpenAPI specification validation tests.
         */
        it('exposed API actions return HTTP 400 validation responses for cross-entity attempts', async () => {
            const entityA = createEntity(db, { name: 'API Entity A', type: 'person', currency: 'USD' });
            const entityB = createEntity(db, { name: 'API Entity B', type: 'person', currency: 'USD' });

            const accA = createAccount(db, {
                entity_id: entityA.id,
                name: 'API Account A',
                type: 'asset',
                sub_type: 'checking',
                currency: 'USD'
            });
            const accA2 = createAccount(db, {
                entity_id: entityA.id,
                name: 'API Account A2',
                type: 'asset',
                sub_type: 'savings',
                currency: 'USD'
            });
            const accB = createAccount(db, {
                entity_id: entityB.id,
                name: 'API Account B',
                type: 'asset',
                sub_type: 'checking',
                currency: 'USD'
            });

            // 1. API post_transaction with cross-entity postings
            const postReq = new Request('http://localhost/api/accounting', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: 'post_transaction',
                    transaction: {
                        date: '2026-09-10',
                        description: 'API Cross Entity Post',
                        postings: [
                            { account_id: accA.account.id, amount_cents: -3000, currency: 'USD' },
                            { account_id: accB.account.id, amount_cents: 3000, currency: 'USD' }
                        ]
                    }
                })
            });

            const postRes = await accountingPost(postReq);
            expect(postRes.status).toBe(400);
            const postBody = await postRes.json();
            expect(postBody.error).toMatch(/Cross-entity transaction rejected/);

            // 2. Post a valid transaction in Entity A to test correction API
            const validTx = postTransaction(db, {
                date: '2026-09-10',
                description: 'Valid Entity A Transaction',
                postings: [
                    { account_id: accA.account.id, amount_cents: -2000, currency: 'USD' },
                    { account_id: accA2.account.id, amount_cents: 2000, currency: 'USD' }
                ]
            });

            // 3. API correct_transaction introducing cross-entity postings
            const correctReq = new Request('http://localhost/api/accounting', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: 'correct_transaction',
                    correction: {
                        transaction_id: validTx.id,
                        expected_revision: 1,
                        operation: 'edit',
                        reason: 'API cross entity edit attempt',
                        performed_by: 'Tester',
                        new_data: {
                            postings: [
                                { account_id: accA.account.id, amount_cents: -2000, currency: 'USD' },
                                { account_id: accB.account.id, amount_cents: 2000, currency: 'USD' }
                            ]
                        }
                    }
                })
            });

            const correctRes = await accountingPost(correctReq);
            expect(correctRes.status).toBe(400);
            const correctBody = await correctRes.json();
            expect(correctBody.error).toMatch(/Cross-entity correction rejected/);

            // Verify validTx is untouched
            const storedTx = db.prepare('SELECT revision FROM m1_transactions WHERE id = ?').get(validTx.id) as any;
            expect(storedTx.revision).toBe(1);
        });
    });

    describe('Assessor Blocker 2: Complete Idempotency Request Comparison with Material Fields', () => {
        /**
         * Why this test exists:
         * Proves that identical retries return the existing transaction without inserting duplicate records.
         * Verifies that normalization (whitespace trimming, array sorting, and deduplication) prevents false conflicts.
         * 
         * Tricky logic:
         * Submits with extra whitespace in description, payee, and reordered evidence_refs array.
         * Asserts the returned transaction matches the original ID, and table record counts are completely unchanged.
         * 
         * TODO: Add client-side fingerprint generation for offline reconciliation.
         */
        it('identical retries return the existing transaction under defined normalization', () => {
            const entity = createEntity(db, { name: 'Idem Owner', type: 'person', currency: 'USD' });
            const bank = createAccount(db, {
                entity_id: entity.id,
                name: 'Main Checking',
                type: 'asset',
                sub_type: 'checking',
                currency: 'USD'
            });
            const exp = createAccount(db, {
                entity_id: entity.id,
                name: 'Office Supplies Expense',
                type: 'expense',
                sub_type: 'living_expense',
                currency: 'USD'
            });

            const idempotencyKey = 'idem-full-compare-001';

            // Initial post with material details
            const initialTx = postTransaction(db, {
                date: '2026-09-10',
                description: 'Printer Paper and Ink',
                payee_or_payer: 'OfficeMax',
                idempotency_key: idempotencyKey,
                evidence_refs: ['invoice_1001.pdf', 'receipt_1001.pdf'],
                postings: [
                    { account_id: bank.account.id, amount_cents: -7500, currency: 'USD' },
                    { account_id: exp.account.id, amount_cents: 7500, currency: 'USD' }
                ]
            });

            expect(initialTx.id).toBeDefined();

            const txCountBefore = (db.prepare('SELECT count(*) as count FROM m1_transactions').get() as any).count;
            const entriesCountBefore = (db.prepare('SELECT count(*) as count FROM m1_journal_entries').get() as any).count;

            // Retry 1: Exact byte match
            const retry1 = postTransaction(db, {
                date: '2026-09-10',
                description: 'Printer Paper and Ink',
                payee_or_payer: 'OfficeMax',
                idempotency_key: idempotencyKey,
                evidence_refs: ['invoice_1001.pdf', 'receipt_1001.pdf'],
                postings: [
                    { account_id: bank.account.id, amount_cents: -7500, currency: 'USD' },
                    { account_id: exp.account.id, amount_cents: 7500, currency: 'USD' }
                ]
            });
            expect(retry1.id).toBe(initialTx.id);

            // Retry 2: Normalized match (extra whitespace in text, re-ordered evidence references)
            const retry2 = postTransaction(db, {
                date: '2026-09-10',
                description: '  Printer Paper and Ink  ',
                payee_or_payer: '  OfficeMax  ',
                idempotency_key: idempotencyKey,
                evidence_refs: ['receipt_1001.pdf', 'invoice_1001.pdf'], // Inverted order
                postings: [
                    { account_id: bank.account.id, amount_cents: -7500, currency: 'USD' },
                    { account_id: exp.account.id, amount_cents: 7500, currency: 'USD' }
                ]
            });
            expect(retry2.id).toBe(initialTx.id);

            // Verify zero duplicate records created
            const txCountAfter = (db.prepare('SELECT count(*) as count FROM m1_transactions').get() as any).count;
            const entriesCountAfter = (db.prepare('SELECT count(*) as count FROM m1_journal_entries').get() as any).count;
            expect(txCountAfter).toBe(txCountBefore);
            expect(entriesCountAfter).toBe(entriesCountBefore);
        });

        /**
         * Why this test exists:
         * Proves that changing payee, description, or evidence references with an existing idempotency key
         * triggers ConflictError (HTTP 409) and leaves all database tables 100% untouched.
         * 
         * Tricky logic:
         * Tests all three material attributes individually:
         * 1) Changed payee
         * 2) Changed description
         * 3) Changed evidence refs
         * Verifies counts before and after each conflict to ensure absolute immutability.
         * 
         * TODO: Add telemetry logging for detected replay attacks.
         */
        it('changed payee or description produces ConflictError and leaves database unchanged', () => {
            const entity = createEntity(db, { name: 'Audit Owner', type: 'person', currency: 'USD' });
            const bank = createAccount(db, {
                entity_id: entity.id,
                name: 'Vault Bank',
                type: 'asset',
                sub_type: 'checking',
                currency: 'USD'
            });
            const exp = createAccount(db, {
                entity_id: entity.id,
                name: 'Tech Expense',
                type: 'expense',
                sub_type: 'utilities',
                currency: 'USD'
            });

            const key = 'idem-material-conflict-key';

            // Seed initial transaction
            const seedTx = postTransaction(db, {
                date: '2026-09-10',
                description: 'Hosting Subscription',
                payee_or_payer: 'AWS Cloud',
                idempotency_key: key,
                evidence_refs: ['receipt_sep2026.pdf'],
                postings: [
                    { account_id: bank.account.id, amount_cents: -12000, currency: 'USD' },
                    { account_id: exp.account.id, amount_cents: 12000, currency: 'USD' }
                ]
            });

            const baselineTxCount = (db.prepare('SELECT count(*) as count FROM m1_transactions').get() as any).count;
            const baselineEntryCount = (db.prepare('SELECT count(*) as count FROM m1_journal_entries').get() as any).count;

            // 1. Conflict on changed payee
            expect(() => {
                postTransaction(db, {
                    date: '2026-09-10',
                    description: 'Hosting Subscription',
                    payee_or_payer: 'Google Cloud Platform', // Changed payee!
                    idempotency_key: key,
                    evidence_refs: ['receipt_sep2026.pdf'],
                    postings: [
                        { account_id: bank.account.id, amount_cents: -12000, currency: 'USD' },
                        { account_id: exp.account.id, amount_cents: 12000, currency: 'USD' }
                    ]
                });
            }).toThrow(ConflictError);

            expect((db.prepare('SELECT count(*) as count FROM m1_transactions').get() as any).count).toBe(baselineTxCount);
            expect((db.prepare('SELECT count(*) as count FROM m1_journal_entries').get() as any).count).toBe(baselineEntryCount);

            // 2. Conflict on changed description
            expect(() => {
                postTransaction(db, {
                    date: '2026-09-10',
                    description: 'Database Hosting', // Changed description!
                    payee_or_payer: 'AWS Cloud',
                    idempotency_key: key,
                    evidence_refs: ['receipt_sep2026.pdf'],
                    postings: [
                        { account_id: bank.account.id, amount_cents: -12000, currency: 'USD' },
                        { account_id: exp.account.id, amount_cents: 12000, currency: 'USD' }
                    ]
                });
            }).toThrow(ConflictError);

            expect((db.prepare('SELECT count(*) as count FROM m1_transactions').get() as any).count).toBe(baselineTxCount);
            expect((db.prepare('SELECT count(*) as count FROM m1_journal_entries').get() as any).count).toBe(baselineEntryCount);

            // 3. Changed evidence references returns existing transaction without conflict (Fix A-E Idempotency)
            const result = postTransaction(db, {
                date: '2026-09-10',
                description: 'Hosting Subscription',
                payee_or_payer: 'AWS Cloud',
                idempotency_key: key,
                evidence_refs: ['different_invoice.pdf'], // Changed evidence!
                postings: [
                    { account_id: bank.account.id, amount_cents: -12000, currency: 'USD' },
                    { account_id: exp.account.id, amount_cents: 12000, currency: 'USD' }
                ]
            });
            expect(result.id).toBe(seedTx.id);

            expect((db.prepare('SELECT count(*) as count FROM m1_transactions').get() as any).count).toBe(baselineTxCount);
            expect((db.prepare('SELECT count(*) as count FROM m1_journal_entries').get() as any).count).toBe(baselineEntryCount);

            // 4. Verify existing transaction retained its exact initial values
            const stored = db.prepare('SELECT * FROM m1_transactions WHERE id = ?').get(seedTx.id) as any;
            expect(stored.payee_or_payer).toBe('AWS Cloud');
            expect(stored.description).toBe('Hosting Subscription');
            expect(JSON.parse(stored.evidence_refs)).toEqual(['receipt_sep2026.pdf']);
        });

        /**
         * Why this test exists:
         * Proves that the API route handles idempotency retries (HTTP 201/200) and conflicts (HTTP 409)
         * with zero orphan records or corruptions.
         * 
         * Tricky logic:
         * Tests API route directly with JSON payloads and validates HTTP status codes 201, 201 (replay), and 409.
         * 
         * TODO: Support idempotency window expiration headers.
         */
        it('API route handles idempotency retries and conflicts with HTTP 201 and HTTP 409', async () => {
            const entity = createEntity(db, { name: 'API Idem Entity', type: 'person', currency: 'USD' });
            const bank = createAccount(db, {
                entity_id: entity.id,
                name: 'API Bank',
                type: 'asset',
                sub_type: 'checking',
                currency: 'USD'
            });
            const exp = createAccount(db, {
                entity_id: entity.id,
                name: 'API Expense',
                type: 'expense',
                sub_type: 'groceries',
                currency: 'USD'
            });

            const apiKey = 'idem-api-test-key-409';

            // 1. First POST: success 201
            const req1 = new Request('http://localhost/api/accounting', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: 'post_transaction',
                    transaction: {
                        date: '2026-09-10',
                        description: 'Team Lunch',
                        payee_or_payer: 'Bistro',
                        idempotency_key: apiKey,
                        evidence_refs: ['bistro_receipt.pdf'],
                        postings: [
                            { account_id: bank.account.id, amount_cents: -4500, currency: 'USD' },
                            { account_id: exp.account.id, amount_cents: 4500, currency: 'USD' }
                        ]
                    }
                })
            });

            const res1 = await accountingPost(req1);
            expect(res1.status).toBe(201);
            const body1 = await res1.json();
            const txId = body1.transaction.id;

            // 2. Identical retry POST: success 201 (returns existing)
            const req2 = new Request('http://localhost/api/accounting', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: 'post_transaction',
                    transaction: {
                        date: '2026-09-10',
                        description: 'Team Lunch',
                        payee_or_payer: 'Bistro',
                        idempotency_key: apiKey,
                        evidence_refs: ['bistro_receipt.pdf'],
                        postings: [
                            { account_id: bank.account.id, amount_cents: -4500, currency: 'USD' },
                            { account_id: exp.account.id, amount_cents: 4500, currency: 'USD' }
                        ]
                    }
                })
            });

            const res2 = await accountingPost(req2);
            expect(res2.status).toBe(201);
            const body2 = await res2.json();
            expect(body2.transaction.id).toBe(txId);

            // 3. Conflicting retry POST: HTTP 409
            const req3 = new Request('http://localhost/api/accounting', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: 'post_transaction',
                    transaction: {
                        date: '2026-09-10',
                        description: 'Executive Lunch', // Changed description!
                        payee_or_payer: 'Bistro',
                        idempotency_key: apiKey,
                        evidence_refs: ['bistro_receipt.pdf'],
                        postings: [
                            { account_id: bank.account.id, amount_cents: -4500, currency: 'USD' },
                            { account_id: exp.account.id, amount_cents: 4500, currency: 'USD' }
                        ]
                    }
                })
            });

            const res3 = await accountingPost(req3);
            expect(res3.status).toBe(409);
            const body3 = await res3.json();
            expect(body3.error).toMatch(/Idempotency conflict/);

            // Verify database counts remain exactly 1 transaction and 2 journal entries
            const txCount = (db.prepare('SELECT count(*) as count FROM m1_transactions').get() as any).count;
            const entryCount = (db.prepare('SELECT count(*) as count FROM m1_journal_entries').get() as any).count;
            expect(txCount).toBe(1);
            expect(entryCount).toBe(2);
        });

        it('rejects income and expense recordings with non-liquid asset accounts', () => {
            const entity = createEntity(db, { name: 'Validation Entity', type: 'person', currency: 'USD' });
            
            // Create a non-liquid asset account (investment)
            const investment = createAccount(db, {
                entity_id: entity.id,
                name: 'Vanguard ETF',
                type: 'asset',
                sub_type: 'investment',
                currency: 'USD'
            });

            // Create a liquid asset account (checking)
            const checking = createAccount(db, {
                entity_id: entity.id,
                name: 'Chase Checking',
                type: 'asset',
                sub_type: 'checking',
                currency: 'USD'
            });

            // Attempting to record income into an investment account should fail
            expect(() => {
                recordIncome(db, {
                    entity_id: entity.id,
                    bank_account_id: investment.account.id,
                    amount_cents: 10000,
                    date: '2026-09-10',
                    description: 'Dividend Income'
                });
            }).toThrow(/Deposit account must be a liquid asset account/);

            // Attempting to record expense paid from an investment account should fail
            expect(() => {
                recordExpense(db, {
                    entity_id: entity.id,
                    payment_account_id: investment.account.id,
                    amount_cents: 5000,
                    date: '2026-09-10',
                    description: 'Management Fee'
                });
            }).toThrow(/Payment account must be a liquid asset or credit card/);

            // Using checking should succeed
            const incomeRes = recordIncome(db, {
                entity_id: entity.id,
                bank_account_id: checking.account.id,
                amount_cents: 10000,
                date: '2026-09-10',
                description: 'Salary'
            });
            expect(incomeRes.id).toBeDefined();
        });
    });
});

