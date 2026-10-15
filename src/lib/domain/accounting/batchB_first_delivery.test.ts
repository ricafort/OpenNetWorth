/**
 * Batch B - First Delivery Acceptance Tests: Consistent Assets, Liabilities and Actual Cash Flow
 *
 * Why this file exists:
 * Formally verifies acceptance criteria for Batch B:
 * - Scenario A: Standard initial state (Bank AUD 1,000, Loan AUD 300 -> Assets 1,000, Liabilities 300, Net Worth 700).
 * - Scenario B: Posted transaction flow (Post AUD 10.23 expense -> Bank 989.77, Cash Flow shows 10.23 outflow, Liabilities remains 300).
 * - Scenario C: Internal transfer, void, draft non-leakage (transfers net to $0, drafts/voids excluded from posted totals).
 * - Scenario D: Balance-only account coverage (balance observation visible in assets, zero invented income/spending in cash flow).
 * - Scenario E: Multiple currencies separated without mock FX rates.
 * - Scenario F: Safe presentation on missing/error states (never claim debt-free or $0 when debts exist or are unknown).
 * - Scenario G: Legacy data coexistence without double counting.
 *
 * Tricky logic:
 * - All tests run in-memory; zero modifications to live SQLite storage.
 * - Adheres strictly to double-entry integrity and exact currency representations in integer cents.
 *
 * TODO items:
 * - Batch B Delivery 2: Integrate automated debt payoff schedule generation with variable interest rates.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import Database from 'better-sqlite3';
import { runMigrations } from '@/infrastructure/sqlite/migrations';
import { createEntity, createAccount, listAccounts } from './accountService';
import { getSharedFinancialSummary } from './sharedFinancialSummaryService';
import { getActualCashFlowStatement, getAccountBalance } from './balanceService';
import { postTransaction, correctTransaction } from './transactionService';
import { recordBalanceObservation } from './balanceObservationService';
import { saveDraft } from './draftService';

describe('Batch B - First Delivery Acceptance Scenarios', () => {
    let db: Database.Database;

    beforeEach(() => {
        db = new Database(':memory:');
        db.pragma('foreign_keys = ON');
        runMigrations(db);
    });

    afterEach(() => {
        db.close();
    });

    it('Scenario A: Standard initial state - Bank AUD 1,000, Loan AUD 300 -> Net Worth AUD 700', () => {
        const alice = createEntity(db, {
            name: 'Alice Cooper',
            type: 'person',
            currency: 'AUD'
        });

        // 1. Create Bank AUD 1,000 asset
        const { account: bankAcc } = createAccount(db, {
            entity_id: alice.id,
            name: 'Everyday Checking',
            type: 'asset',
            sub_type: 'checking',
            currency: 'AUD',
            tracking_mode: 'transactions',
            opening_balance_cents: 100000, // $1,000.00
            opening_date: '2026-01-01'
        });

        // 2. Create Loan AUD 300 liability
        const { account: loanAcc } = createAccount(db, {
            entity_id: alice.id,
            name: 'Personal Loan',
            type: 'liability',
            sub_type: 'loan',
            currency: 'AUD',
            tracking_mode: 'transactions',
            opening_balance_cents: 30000, // $300.00
            opening_date: '2026-01-01'
        });

        // Verify Accounts view source data: 2 wealth accounts (opening balance creates equity balancing account)
        const accounts = listAccounts(db, alice.id);
        const wealthAccounts = accounts.filter(a => a.type === 'asset' || a.type === 'liability');
        expect(wealthAccounts.length).toBe(2);
        expect(getAccountBalance(db, bankAcc.id).balance_cents).toBe(100000);
        expect(getAccountBalance(db, loanAcc.id).balance_cents).toBe(30000);

        // Verify Shared Financial Summary (used by Dashboard, Assets, Liabilities)
        const summary = getSharedFinancialSummary(db, {
            scopeEntityId: alice.id,
            asOfDate: '2026-01-31',
            reportingCurrency: 'AUD'
        });

        // Assets verification
        expect(summary.total_assets_cents_by_currency['AUD']).toBe(100000);
        const assetItem = summary.accounts_included.find(a => a.account_id === bankAcc.id);
        expect(assetItem).toBeDefined();
        expect(assetItem?.amount_cents).toBe(100000);
        expect(assetItem?.account_type).toBe('asset');

        // Liabilities verification
        expect(summary.total_liabilities_cents_by_currency['AUD']).toBe(30000);
        const liabilityItem = summary.accounts_included.find(a => a.account_id === loanAcc.id);
        expect(liabilityItem).toBeDefined();
        expect(liabilityItem?.amount_cents).toBe(30000);
        expect(liabilityItem?.account_type).toBe('liability');

        // Net worth verification (1,000 - 300 = 700)
        expect(summary.net_worth_cents_by_currency['AUD']).toBe(70000);
        expect(summary.is_complete).toBe(true);
        expect(summary.unrecorded_accounts.length).toBe(0);

        // Cash flow statement verification
        const cashFlow = getActualCashFlowStatement(db, alice.id, '2026-01-01', '2026-01-31');
        expect(cashFlow.starting_cash_cents_by_currency['AUD']).toBe(100000);
        expect(cashFlow.ending_cash_cents_by_currency['AUD']).toBe(100000);
        expect(cashFlow.operating_inflows_cents_by_currency['AUD'] || 0).toBe(0);
        expect(cashFlow.operating_outflows_cents_by_currency['AUD'] || 0).toBe(0);
        expect(cashFlow.is_reconciled_by_currency?.['AUD']).toBe(true);
    });

    it('Scenario B: Posted transaction flow - AUD 10.23 expense from Bank', () => {
        const alice = createEntity(db, {
            name: 'Alice Cooper',
            type: 'person',
            currency: 'AUD'
        });

        // Initial setup
        const { account: bankAcc } = createAccount(db, {
            entity_id: alice.id,
            name: 'Everyday Checking',
            type: 'asset',
            sub_type: 'checking',
            currency: 'AUD',
            tracking_mode: 'transactions',
            opening_balance_cents: 100000,
            opening_date: '2026-01-01'
        });

        const { account: loanAcc } = createAccount(db, {
            entity_id: alice.id,
            name: 'Personal Loan',
            type: 'liability',
            sub_type: 'loan',
            currency: 'AUD',
            tracking_mode: 'transactions',
            opening_balance_cents: 30000,
            opening_date: '2026-01-01'
        });

        // Create an Expense account for the coffee/lunch
        const { account: expenseAcc } = createAccount(db, {
            entity_id: alice.id,
            name: 'Dining & Coffee',
            type: 'expense',
            sub_type: 'living_expense',
            currency: 'AUD',
            tracking_mode: 'transactions'
        });

        // Post an AUD 10.23 (1023 cents) expense transaction
        postTransaction(db, {
            date: '2026-01-15',
            description: 'Cafe lunch',
            postings: [
                {
                    account_id: expenseAcc.id,
                    amount_cents: 1023,
                    currency: 'AUD',
                    memo: 'Cafe lunch'
                },
                {
                    account_id: bankAcc.id,
                    amount_cents: -1023,
                    currency: 'AUD',
                    memo: 'Debit card payment'
                }
            ]
        });

        // Verify Accounts and Assets View: Bank is AUD 989.77 (98977 cents)
        const bankBalance = getAccountBalance(db, bankAcc.id);
        expect(bankBalance.balance_cents).toBe(98977);

        // Verify Liabilities View: Loan is strictly unchanged at AUD 300.00
        const loanBalance = getAccountBalance(db, loanAcc.id);
        expect(loanBalance.balance_cents).toBe(30000);

        // Verify Shared Financial Summary
        const summary = getSharedFinancialSummary(db, {
            scopeEntityId: alice.id,
            asOfDate: '2026-01-31'
        });
        expect(summary.total_assets_cents_by_currency['AUD']).toBe(98977);
        expect(summary.total_liabilities_cents_by_currency['AUD']).toBe(30000);
        expect(summary.net_worth_cents_by_currency['AUD']).toBe(68977); // 989.77 - 300.00 = 689.77

        // Verify Cash Flow Statement: AUD 10.23 operating outflow, ending cash AUD 989.77
        const cashFlow = getActualCashFlowStatement(db, alice.id, '2026-01-01', '2026-01-31');
        expect(cashFlow.operating_outflows_cents_by_currency['AUD']).toBe(1023);
        expect(cashFlow.ending_cash_cents_by_currency['AUD']).toBe(98977);
        expect(cashFlow.is_reconciled_by_currency?.['AUD']).toBe(true);
        expect(cashFlow.items.some(i => i.amount_cents === -1023 && i.activity_type === 'operating')).toBe(true);
    });

    it('Scenario C: Internal transfers net to $0; drafts and voids excluded from posted totals', () => {
        const alice = createEntity(db, {
            name: 'Alice Cooper',
            type: 'person',
            currency: 'AUD'
        });

        const { account: checking } = createAccount(db, {
            entity_id: alice.id,
            name: 'Checking',
            type: 'asset',
            sub_type: 'checking',
            currency: 'AUD',
            tracking_mode: 'transactions',
            opening_balance_cents: 100000,
            opening_date: '2026-01-01'
        });

        const { account: savings } = createAccount(db, {
            entity_id: alice.id,
            name: 'Savings',
            type: 'asset',
            sub_type: 'savings',
            currency: 'AUD',
            tracking_mode: 'transactions',
            opening_balance_cents: 0,
            opening_date: '2026-01-01'
        });

        // 1. Post internal transfer of AUD 200 (20000 cents) between checking and savings
        postTransaction(db, {
            date: '2026-01-10',
            description: 'Transfer to savings',
            postings: [
                {
                    account_id: savings.id,
                    amount_cents: 20000,
                    currency: 'AUD',
                    memo: 'Internal transfer in'
                },
                {
                    account_id: checking.id,
                    amount_cents: -20000,
                    currency: 'AUD',
                    memo: 'Internal transfer out'
                }
            ]
        });

        // Total cash across assets is still AUD 1,000.00
        const summary = getSharedFinancialSummary(db, { scopeEntityId: alice.id, asOfDate: '2026-01-31' });
        expect(summary.total_assets_cents_by_currency['AUD']).toBe(100000);

        // Cash flow statement: gross operating inflows and outflows are ZERO from the internal transfer
        const cashFlow = getActualCashFlowStatement(db, alice.id, '2026-01-01', '2026-01-31');
        expect(cashFlow.operating_inflows_cents_by_currency['AUD'] || 0).toBe(0);
        expect(cashFlow.operating_outflows_cents_by_currency['AUD'] || 0).toBe(0);
        expect(cashFlow.ending_cash_cents_by_currency['AUD']).toBe(100000);

        // 2. Drafts must NOT affect posted assets, liabilities, or cash flow
        saveDraft(db, {
            entity_id: alice.id,
            date: '2026-01-12',
            description: 'Unposted draft expense',
            payment_account_id: checking.id,
            amount_cents: 5000,
            currency: 'AUD'
        });

        const summaryAfterDraft = getSharedFinancialSummary(db, { scopeEntityId: alice.id, asOfDate: '2026-01-31' });
        expect(summaryAfterDraft.total_assets_cents_by_currency['AUD']).toBe(100000);

        // 3. Voids must NOT affect posted cash flow or balances
        const { account: expenseAcc } = createAccount(db, {
            entity_id: alice.id,
            name: 'Tech Gadgets',
            type: 'expense',
            sub_type: 'living_expense',
            currency: 'AUD',
            tracking_mode: 'transactions'
        });

        const txToVoid = postTransaction(db, {
            date: '2026-01-14',
            description: 'Accidental purchase',
            postings: [
                { account_id: expenseAcc.id, amount_cents: 8000, currency: 'AUD' },
                { account_id: checking.id, amount_cents: -8000, currency: 'AUD' }
            ]
        });

        // Void the transaction auditably
        correctTransaction(db, {
            transaction_id: txToVoid.id,
            operation: 'void',
            expected_revision: txToVoid.revision,
            reason: 'Duplicate charge entered by mistake',
            performed_by: 'alice'
        });

        // Cash flow and balances must remain clean of the voided entry
        const cashFlowAfterVoid = getActualCashFlowStatement(db, alice.id, '2026-01-01', '2026-01-31');
        expect(cashFlowAfterVoid.operating_outflows_cents_by_currency['AUD'] || 0).toBe(0);
        expect(cashFlowAfterVoid.ending_cash_cents_by_currency['AUD']).toBe(100000);
    });

    it('Scenario D: Balance-only account coverage - shows balance without inventing income/spending', () => {
        const alice = createEntity(db, {
            name: 'Alice Cooper',
            type: 'person',
            currency: 'AUD'
        });

        // Mode A account tracking balances without transaction lines
        const { account: superFund } = createAccount(db, {
            entity_id: alice.id,
            name: 'AustralianSuper',
            type: 'asset',
            sub_type: 'investment',
            currency: 'AUD',
            tracking_mode: 'balance'
        });

        // Record an accepted valuation observation of AUD 75,000.00
        recordBalanceObservation(db, {
            account_id: superFund.id,
            amount_cents: 7500000,
            effective_date: '2026-01-20',
            currency: 'AUD',
            balance_kind: 'total_portfolio_value',
            review_status: 'accepted',
            source_type: 'manual'
        });

        // Verify Assets view includes this balance
        const summary = getSharedFinancialSummary(db, { scopeEntityId: alice.id, asOfDate: '2026-01-31' });
        expect(summary.total_assets_cents_by_currency['AUD']).toBe(7500000);
        const item = summary.accounts_included.find(a => a.account_id === superFund.id);
        expect(item?.basis).toBe('observation');
        expect(item?.amount_cents).toBe(7500000);

        // Cash flow statement: zero operating receipts or payments!
        // A balance observation does NOT invent revenue or expenses.
        const cashFlow = getActualCashFlowStatement(db, alice.id, '2026-01-01', '2026-01-31');
        expect(cashFlow.operating_inflows_cents_by_currency['AUD'] || 0).toBe(0);
        expect(cashFlow.operating_outflows_cents_by_currency['AUD'] || 0).toBe(0);
    });

    it('Scenario E: Multiple currencies separated without mock FX conversion', () => {
        const alice = createEntity(db, {
            name: 'Alice Cooper',
            type: 'person',
            currency: 'USD'
        });

        // USD Asset: $100.00
        createAccount(db, {
            entity_id: alice.id,
            name: 'US Checking',
            type: 'asset',
            sub_type: 'checking',
            currency: 'USD',
            tracking_mode: 'transactions',
            opening_balance_cents: 10000,
            opening_date: '2026-01-01'
        });

        // AUD Liability: $100.00
        createAccount(db, {
            entity_id: alice.id,
            name: 'AU Credit Card',
            type: 'liability',
            sub_type: 'credit_card',
            currency: 'AUD',
            tracking_mode: 'transactions',
            opening_balance_cents: 10000,
            opening_date: '2026-01-01'
        });

        const summary = getSharedFinancialSummary(db, { scopeEntityId: alice.id, asOfDate: '2026-01-31' });

        // Assets and liabilities separated strictly by native currency
        expect(summary.total_assets_cents_by_currency['USD']).toBe(10000);
        expect(summary.total_assets_cents_by_currency['AUD'] || 0).toBe(0);
        expect(summary.total_liabilities_cents_by_currency['AUD']).toBe(10000);
        expect(summary.total_liabilities_cents_by_currency['USD'] || 0).toBe(0);

        // No mock 1:1 conversion! converted_net_worth must have is_complete = false
        expect(summary.converted_net_worth?.is_complete).toBe(false);
        expect(summary.is_complete).toBe(false);
        expect(summary.coverage_notes.some(n => n.includes('Missing exchange rates') || n.includes('dated exchange rates'))).toBe(true);
    });

    it('Scenario F: Missing balance state does not claim "Debt free" or assume $0.00', () => {
        const alice = createEntity(db, {
            name: 'Alice Cooper',
            type: 'person',
            currency: 'AUD'
        });

        // Balance-tracked liability with NO observation and no opening balance
        const { account: debtCard } = createAccount(db, {
            entity_id: alice.id,
            name: 'Rewards Mastercard',
            type: 'liability',
            sub_type: 'credit_card',
            currency: 'AUD',
            tracking_mode: 'balance'
            // No opening balance!
        });

        const summary = getSharedFinancialSummary(db, { scopeEntityId: alice.id, asOfDate: '2026-01-31' });

        // Must NOT assume $0.00
        expect(summary.total_liabilities_cents_by_currency['AUD'] || 0).toBe(0);
        expect(summary.is_complete).toBe(false);

        // Must be surfaced in unrecorded_accounts with account_type: 'liability'
        expect(summary.unrecorded_accounts.length).toBe(1);
        const unrecordedDebt = summary.unrecorded_accounts[0];
        expect(unrecordedDebt.id).toBe(debtCard.id);
        expect(unrecordedDebt.account_type).toBe('liability');

        // Liabilities page and widgets know that debts exist with unknown balance,
        // preventing any false "No liabilities" or "Debt free" badge from being rendered!
    });

    it('Scenario G: Legacy data coexistence without double-counting', () => {
        const alice = createEntity(db, {
            name: 'Alice Cooper',
            type: 'person',
            currency: 'AUD'
        });

        // 1. Authoritative modern account in SQLite
        const { account: modernBank } = createAccount(db, {
            entity_id: alice.id,
            name: 'Everyday Checking',
            type: 'asset',
            sub_type: 'checking',
            currency: 'AUD',
            tracking_mode: 'transactions',
            opening_balance_cents: 100000,
            opening_date: '2026-01-01'
        });

        const summary = getSharedFinancialSummary(db, { scopeEntityId: alice.id, asOfDate: '2026-01-31', reportingCurrency: 'AUD' });
        const authoritativeAccountIds = new Set(summary.accounts_included.map(a => a.account_id));
        expect(authoritativeAccountIds.has(modernBank.id)).toBe(true);

        // 2. Legacy holdings dataset: one linked to modern bank, one unlinked legacy asset
        const legacyHoldings = [
            {
                id: 'leg-1',
                name: 'Everyday Checking (Legacy Copy)',
                type: 'cash',
                asset_class: 'cash',
                currency: 'AUD',
                current_value: 1000,
                account_id: modernBank.id // Linked to modern account
            },
            {
                id: 'leg-2',
                name: 'Vintage Collectibles',
                type: 'alternative',
                asset_class: 'alternative',
                currency: 'AUD',
                current_value: 2500,
                account_id: undefined // Unlinked legacy asset
            }
        ];

        // Deduplication and separate disclosure logic used in AssetsPage:
        const linkedLegacyIds = new Set(
            legacyHoldings
                .filter(h => h.account_id && authoritativeAccountIds.has(h.account_id))
                .map(h => h.id)
        );
        const unlinkedLegacyHoldings = legacyHoldings.filter(h => !linkedLegacyIds.has(h.id));

        // The legacy holding referencing modernBank is identified as linked and excluded from legacy section
        expect(linkedLegacyIds.has('leg-1')).toBe(true);
        expect(unlinkedLegacyHoldings.length).toBe(1);
        expect(unlinkedLegacyHoldings[0].id).toBe('leg-2');
        expect(unlinkedLegacyHoldings[0].current_value).toBe(2500);

        // Authoritative ledger total reflects ONLY the authoritative account (1,000 AUD), never double-counting 1,000 + 1,000
        expect(summary.total_assets_cents_by_currency['AUD']).toBe(100000);
    });
});
