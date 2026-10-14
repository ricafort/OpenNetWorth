/**
 * Opening Balance Coverage & Unknown Balance Acceptance Tests
 *
 * Why this file exists:
 * Fulfills Closing Batch Requirement 1 (Supported balance amounts and completeness):
 * - Unknown opening + no transactions must remain unknown.
 * - Explicit zero must remain known.
 * - A statement must not merely clear a warning while the summary still returns an unanchored transaction sum.
 * - Respect statement dates and comparable balance kinds.
 * - Do not use future or available-balance observations to establish an earlier ledger starting basis.
 * - Assert actual amounts, dates and completeness in regression tests.
 * - Do not create automatic unexplained adjustments.
 *
 * Tricky logic:
 * - Sourced statement observations anchor the starting position at observation.effective_date.
 *   Subsequent postings add to the anchored amount, guaranteeing the summary NEVER returns an unanchored sum.
 * - Future observations (> asOfDate) and non-valuation kinds (available_balance) cannot establish a basis.
 *
 * TODO items:
 * - None.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import Database from 'better-sqlite3';
import { initAccountingSchema } from './schema';
import { createEntity, createAccount } from './accountService';
import { getSharedFinancialSummary } from './sharedFinancialSummaryService';
import { postTransaction } from './transactionService';
import { recordBalanceObservation } from './balanceObservationService';
import { resolveAccountBalanceInfo, getActualCashFlowStatement } from './balanceService';

describe('Transaction-tracked Account Opening Balance Coverage & Anchoring', () => {
    let db: Database.Database;
    let aliceId: string;

    beforeEach(() => {
        db = new Database(':memory:');
        initAccountingSchema(db);

        const alice = createEntity(db, {
            name: 'Alice Household',
            type: 'household',
            currency: 'AUD'
        });
        aliceId = alice.id;
    });

    afterEach(() => {
        db.close();
    });

    it('1. Unknown opening + no transactions: must remain unknown (incomplete coverage)', () => {
        const acc = createAccount(db, {
            entity_id: aliceId,
            name: 'Fresh Empty Bank',
            type: 'asset',
            sub_type: 'checking',
            currency: 'AUD',
            tracking_mode: 'transactions'
            // No opening_balance_cents, no transactions
        }).account;

        const summary = getSharedFinancialSummary(db, { reporting_currency: 'AUD' });

        expect(summary.is_complete).toBe(false);
        expect(summary.unrecorded_count).toBe(1);
        expect(summary.accounts_included.length).toBe(0);
        expect(summary.unrecorded_accounts[0].name).toBe('Fresh Empty Bank');
        expect(summary.unrecorded_accounts[0].reason).toBe('missing_opening_balance');
        expect(summary.coverage_notes.some(n => n.includes('Starting balance needed'))).toBe(true);
    });

    it('2. Explicit zero opening balance: must remain known ($0.00)', () => {
        createAccount(db, {
            entity_id: aliceId,
            name: 'Known Zero Account',
            type: 'asset',
            sub_type: 'checking',
            currency: 'AUD',
            tracking_mode: 'transactions',
            opening_balance_cents: 0,
            opening_date: '2026-01-01'
        });

        const summary = getSharedFinancialSummary(db, { reporting_currency: 'AUD' });

        expect(summary.is_complete).toBe(true);
        expect(summary.unrecorded_count).toBe(0);
        expect(summary.accounts_included.length).toBe(1);
        expect(summary.accounts_included[0].amount_cents).toBe(0);
        expect(summary.accounts_included[0].entity_name).toBe('Alice Household');
        expect(summary.total_assets_cents_by_currency['AUD']).toBe(0);
    });

    it('3. Unknown opening + 3 purchases: must remain unknown with "Starting balance needed"', () => {
        const acc = createAccount(db, {
            entity_id: aliceId,
            name: 'Unknown Starting Bank',
            type: 'asset',
            sub_type: 'checking',
            currency: 'AUD',
            tracking_mode: 'transactions'
        }).account;

        const expenseAcc = createAccount(db, {
            entity_id: aliceId,
            name: 'Groceries',
            type: 'expense',
            sub_type: 'other',
            currency: 'AUD',
            tracking_mode: 'transactions'
        }).account;

        // Post 3 purchases ($40 each = $120 total expenditure)
        for (let i = 1; i <= 3; i++) {
            postTransaction(db, {
                date: `2026-09-0${i}`,
                description: `Purchase ${i}`,
                origin: 'manual',
                postings: [
                    { account_id: expenseAcc.id, amount_cents: 4000, currency: 'AUD' },
                    { account_id: acc.id, amount_cents: -4000, currency: 'AUD' }
                ]
            });
        }

        const summary = getSharedFinancialSummary(db, { reporting_currency: 'AUD' });

        expect(summary.is_complete).toBe(false);
        expect(summary.unrecorded_count).toBe(1);
        expect(summary.accounts_included.length).toBe(0);
        expect(summary.unrecorded_accounts[0].reason).toBe('missing_opening_balance');
    });

    it('4. Statement observation on asOfDate: anchors balance at statement amount (NOT unanchored -$120)', () => {
        const acc = createAccount(db, {
            entity_id: aliceId,
            name: 'Statement Anchored Bank',
            type: 'asset',
            sub_type: 'checking',
            currency: 'AUD',
            tracking_mode: 'transactions'
        }).account;

        const expenseAcc = createAccount(db, {
            entity_id: aliceId,
            name: 'Groceries',
            type: 'expense',
            sub_type: 'other',
            currency: 'AUD',
            tracking_mode: 'transactions'
        }).account;

        // Post 3 purchases ($40 each = -$120)
        for (let i = 1; i <= 3; i++) {
            postTransaction(db, {
                date: `2026-09-0${i}`,
                description: `Purchase ${i}`,
                origin: 'manual',
                postings: [
                    { account_id: expenseAcc.id, amount_cents: 4000, currency: 'AUD' },
                    { account_id: acc.id, amount_cents: -4000, currency: 'AUD' }
                ]
            });
        }

        // Add statement observation of $5,000 on 2026-09-24
        recordBalanceObservation(db, {
            account_id: acc.id,
            amount_cents: 500000,
            currency: 'AUD',
            effective_date: '2026-09-24',
            balance_kind: 'statement_closing_balance',
            source_type: 'document'
        });

        const summary = getSharedFinancialSummary(db, { reporting_currency: 'AUD', asOfDate: '2026-09-24' });

        // Assert: It must NOT return -$120 (the unanchored transaction sum)!
        // It must return the authoritative statement amount $5,000.
        expect(summary.is_complete).toBe(true);
        expect(summary.unrecorded_count).toBe(0);
        expect(summary.accounts_included.length).toBe(1);
        expect(summary.accounts_included[0].amount_cents).toBe(500000);
        expect(summary.accounts_included[0].effective_date).toBe('2026-09-24');
        expect(summary.accounts_included[0].source_type).toBe('document');
        expect(summary.total_assets_cents_by_currency['AUD']).toBe(500000);
    });

    it('5. Statement observation anchors earlier date and calculates subsequent transactions correctly', () => {
        const acc = createAccount(db, {
            entity_id: aliceId,
            name: 'Mid-Month Statement Bank',
            type: 'asset',
            sub_type: 'checking',
            currency: 'AUD',
            tracking_mode: 'transactions'
        }).account;

        const expenseAcc = createAccount(db, {
            entity_id: aliceId,
            name: 'Groceries',
            type: 'expense',
            sub_type: 'other',
            currency: 'AUD',
            tracking_mode: 'transactions'
        }).account;

        // Statement closing on 2026-09-01 is $5,000
        recordBalanceObservation(db, {
            account_id: acc.id,
            amount_cents: 500000,
            currency: 'AUD',
            effective_date: '2026-09-01',
            balance_kind: 'statement_closing_balance',
            source_type: 'document'
        });

        // 3 purchases made AFTER statement date:
        // Sept 5: -$40, Sept 10: -$40, Sept 15: -$40 (total -$120)
        for (let i = 1; i <= 3; i++) {
            postTransaction(db, {
                date: `2026-09-${i * 5 < 10 ? '0' : ''}${i * 5}`,
                description: `Post-statement purchase ${i}`,
                origin: 'manual',
                postings: [
                    { account_id: expenseAcc.id, amount_cents: 4000, currency: 'AUD' },
                    { account_id: acc.id, amount_cents: -4000, currency: 'AUD' }
                ]
            });
        }

        const summary = getSharedFinancialSummary(db, { reporting_currency: 'AUD', asOfDate: '2026-09-24' });

        // Expected balance = $5,000 - $120 = $4,880 (488,000 cents)
        expect(summary.is_complete).toBe(true);
        expect(summary.accounts_included.length).toBe(1);
        expect(summary.accounts_included[0].amount_cents).toBe(488000);
        expect(summary.accounts_included[0].basis).toBe('ledger');
        expect(summary.total_assets_cents_by_currency['AUD']).toBe(488000);
    });

    it('6. Future statement observation does NOT establish earlier ledger starting basis', () => {
        const acc = createAccount(db, {
            entity_id: aliceId,
            name: 'Future Statement Bank',
            type: 'asset',
            sub_type: 'checking',
            currency: 'AUD',
            tracking_mode: 'transactions'
        }).account;

        // Statement is on 2026-09-30 (future relative to 2026-09-24 query)
        recordBalanceObservation(db, {
            account_id: acc.id,
            amount_cents: 500000,
            currency: 'AUD',
            effective_date: '2026-09-30',
            balance_kind: 'statement_closing_balance',
            source_type: 'document'
        });

        // Query as of 2026-09-24
        const summary = getSharedFinancialSummary(db, { reporting_currency: 'AUD', asOfDate: '2026-09-24' });

        // Must remain unknown because future observation cannot establish basis on earlier date
        expect(summary.is_complete).toBe(false);
        expect(summary.unrecorded_count).toBe(1);
        expect(summary.accounts_included.length).toBe(0);
        expect(summary.unrecorded_accounts[0].reason).toBe('missing_opening_balance');
    });

    it('7. Available-balance observation does NOT establish ledger starting basis', () => {
        const acc = createAccount(db, {
            entity_id: aliceId,
            name: 'Available Only Bank',
            type: 'asset',
            sub_type: 'checking',
            currency: 'AUD',
            tracking_mode: 'transactions'
        }).account;

        // Available balance observation (non-valuation kind)
        recordBalanceObservation(db, {
            account_id: acc.id,
            amount_cents: 500000,
            currency: 'AUD',
            effective_date: '2026-09-24',
            balance_kind: 'available_balance',
            source_type: 'document'
        });

        const summary = getSharedFinancialSummary(db, { reporting_currency: 'AUD', asOfDate: '2026-09-24' });

        // Available balance cannot establish starting basis
        expect(summary.is_complete).toBe(false);
        expect(summary.unrecorded_count).toBe(1);
        expect(summary.accounts_included.length).toBe(0);
        expect(summary.unrecorded_accounts[0].reason).toBe('missing_opening_balance');
    });

    it('8. Does not create automatic unexplained adjustments', () => {
        const acc = createAccount(db, {
            entity_id: aliceId,
            name: 'No Adjustment Bank',
            type: 'asset',
            sub_type: 'checking',
            currency: 'AUD',
            tracking_mode: 'transactions'
        }).account;

        const expenseAcc = createAccount(db, {
            entity_id: aliceId,
            name: 'Groceries',
            type: 'expense',
            sub_type: 'other',
            currency: 'AUD',
            tracking_mode: 'transactions'
        }).account;

        // Post 1 transaction
        postTransaction(db, {
            date: '2026-09-10',
            description: 'Explicit purchase',
            origin: 'manual',
            postings: [
                { account_id: expenseAcc.id, amount_cents: 2500, currency: 'AUD' },
                { account_id: acc.id, amount_cents: -2500, currency: 'AUD' }
            ]
        });

        // Add statement observation
        recordBalanceObservation(db, {
            account_id: acc.id,
            amount_cents: 100000,
            currency: 'AUD',
            effective_date: '2026-09-10',
            balance_kind: 'statement_closing_balance',
            source_type: 'document'
        });

        const initialTxCount = (db.prepare('SELECT COUNT(*) as cnt FROM m1_transactions').get() as any).cnt;

        // Run summary
        getSharedFinancialSummary(db, { reporting_currency: 'AUD', asOfDate: '2026-09-24' });

        const finalTxCount = (db.prepare('SELECT COUNT(*) as cnt FROM m1_transactions').get() as any).cnt;

        // Transaction count in SQLite must NOT increase (no unexplained adjustments)
        expect(finalTxCount).toBe(initialTxCount);
    });

    it('9. Identical unknown state across shared summary, Accounts (resolveAccountBalanceInfo), and cash flow when transactions exist without supported starting basis', () => {
        const acc = createAccount(db, {
            entity_id: aliceId,
            name: 'Floating Purchases Bank',
            type: 'asset',
            sub_type: 'checking',
            currency: 'AUD',
            tracking_mode: 'transactions'
        }).account;

        const expenseAcc = createAccount(db, {
            entity_id: aliceId,
            name: 'Coffee',
            type: 'expense',
            sub_type: 'other',
            currency: 'AUD',
            tracking_mode: 'transactions'
        }).account;

        // Post purchase without opening basis
        postTransaction(db, {
            date: '2026-09-10',
            description: 'Flat white',
            origin: 'manual',
            postings: [
                { account_id: expenseAcc.id, amount_cents: 500, currency: 'AUD' },
                { account_id: acc.id, amount_cents: -500, currency: 'AUD' }
            ]
        });

        // 1. Shared Financial Summary must report unrecorded
        const summary = getSharedFinancialSummary(db, { reporting_currency: 'AUD', asOfDate: '2026-09-24' });
        expect(summary.is_complete).toBe(false);
        expect(summary.unrecorded_count).toBe(1);
        expect(summary.unrecorded_accounts[0].reason).toBe('missing_opening_balance');

        // 2. resolveAccountBalanceInfo (Accounts view) must report is_unknown: true with null balance_cents (NO known-balance fallback)
        const accountInfo = resolveAccountBalanceInfo(db, acc, '2026-09-24');
        expect(accountInfo.is_unknown).toBe(true);
        expect(accountInfo.balance_cents).toBeNull();
        expect(accountInfo.formatted_balance).toBe('Unknown (Needs balance)');

        // 3. Cash Flow Report must treat the account as unknown and disclose it in unrecorded count
        const cf = getActualCashFlowStatement(db, aliceId, '2026-09-01', '2026-09-30');
        expect(cf.unrecorded_account_count_by_currency?.['AUD']).toBe(1);
    });

    it('10. Does not infer opening history from transaction descriptions', () => {
        const acc = createAccount(db, {
            entity_id: aliceId,
            name: 'Text Only Bank',
            type: 'asset',
            sub_type: 'checking',
            currency: 'AUD',
            tracking_mode: 'transactions'
        }).account;

        const expenseAcc = createAccount(db, {
            entity_id: aliceId,
            name: 'Expense Other',
            type: 'expense',
            sub_type: 'other',
            currency: 'AUD',
            tracking_mode: 'transactions'
        }).account;

        // Transaction with "opening balance" in description but NOT origin: opening_balance and NOT equity counterpart
        postTransaction(db, {
            date: '2026-09-01',
            description: 'Opening balance note in text',
            origin: 'manual',
            postings: [
                { account_id: acc.id, amount_cents: 100000, currency: 'AUD' },
                { account_id: expenseAcc.id, amount_cents: -100000, currency: 'AUD' }
            ]
        });

        // Must NOT infer that this is a valid opening basis simply from the description string
        const summary = getSharedFinancialSummary(db, { reporting_currency: 'AUD', asOfDate: '2026-09-24' });
        expect(summary.is_complete).toBe(false);
        expect(summary.unrecorded_count).toBe(1);
        expect(summary.unrecorded_accounts[0].reason).toBe('missing_opening_balance');

        const accountInfo = resolveAccountBalanceInfo(db, acc, '2026-09-24');
        expect(accountInfo.is_unknown).toBe(true);
        expect(accountInfo.balance_cents).toBeNull();
    });
});
