/**
 * Milestone 1 — Slice 1C: Daily Financial Events Automated Acceptance Tests
 * 
 * Why this file exists:
 * Verifies the implementation of Slice 1C daily financial flows:
 * 1. Acceptance Scenario T2: Income and Spending (M1-FLOW-02)
 *    Receive income 500, spend 100 with starting balance 1,000 -> Bank 1,400, Income 500, Expenses 100.
 * 2. Acceptance Scenario T3: Account Transfers (M1-FLOW-03)
 *    Transfer 200 between accounts -> Net income & expenses are $0.00, combined net worth unchanged.
 * 3. Acceptance Scenario T4: Credit Card Non-Duplication (M1-FLOW-04)
 *    Buy 120 on card, repay 120 from bank -> Total expense is 120 (not 240); card liability returns to zero.
 * 4. Acceptance Scenario T5: Loan Repayment Split (M1-FLOW-05)
 *    Pay loan instalment 300 (Principal 200, Interest 90, Fee 10) -> Cash -300, Debt -200, Expenses +100.
 * 5. Acceptance Scenario T11: Idempotency Key Uniqueness (M1-SAFE-05)
 *    Retrying with the same idempotency key returns original transaction without duplicate postings.
 * 6. Acceptance Scenario T12: Concurrency Control (M1-SAFE-06)
 *    Stale revision throws ConflictError.
 * 7. Acceptance Scenario T13: Auditable Correction Trail (M1-DOM-05)
 *    Voiding/editing preserves original and records immutable snapshot in m1_transaction_corrections.
 * 8. Strict Test Isolation (M1-SAFE-01)
 *    Runs strictly in-memory (:memory:) with zero live database interaction.
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
    listTransactions
} from './transactionService';
import { validateTransactionBalance } from './types';

describe('Milestone 1 — Slice 1C: Daily Financial Events Acceptance Tests', () => {
    let db: Database.Database;

    beforeEach(() => {
        // Pristine in-memory database for each test (M1-SAFE-01)
        db = new Database(':memory:');
        db.pragma('foreign_keys = ON');
        initAccountingSchema(db);
    });

    afterEach(() => {
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

    describe('Acceptance Scenario T11: Idempotency Key Uniqueness (M1-SAFE-05)', () => {
        it('T11: retrying with same idempotency key returns original transaction without duplicate postings', () => {
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

            const idempotencyKey = 'unique-webhook-payload-xyz-987';

            // First submission
            const tx1 = recordExpense(db, {
                entity_id: entity.id,
                payment_account_id: bank.account.id,
                amount_cents: 4500,
                date: '2026-09-05',
                description: 'Gas station',
                idempotency_key: idempotencyKey
            });

            expect(tx1.id).toBeDefined();

            // Re-submission / retry with identical idempotency key
            const tx2 = recordExpense(db, {
                entity_id: entity.id,
                payment_account_id: bank.account.id,
                amount_cents: 4500,
                date: '2026-09-05',
                description: 'Gas station retry',
                idempotency_key: idempotencyKey
            });

            // Must return identical transaction ID
            expect(tx2.id).toBe(tx1.id);

            // Verify database has only ONE transaction and TWO postings total
            const allTx = db.prepare('SELECT * FROM m1_transactions WHERE idempotency_key = ?').all(idempotencyKey);
            expect(allTx).toHaveLength(1);

            const allPostings = db.prepare('SELECT * FROM m1_journal_entries WHERE transaction_id = ?').all(tx1.id);
            expect(allPostings).toHaveLength(2);

            // Bank balance should only have deducted $45 once
            const bal = getAccountBalance(db, bank.account.id, '2026-09-06');
            expect(bal.balance_cents).toBe(95500); // 1,000 - 45 = 955
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
});
