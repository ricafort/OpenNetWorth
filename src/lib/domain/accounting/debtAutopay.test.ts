/**
 * Why this file exists:
 * Covers the server-side guard for Autopilot debt minimum payments
 * (debtAutopayService.ts). The critical invariants:
 * - The posted amount is DERIVED from the stored `minimum_payment_cents`
 *   column — the caller sends no amount, so the ledger can never drift from
 *   the terms the user set on the account.
 * - The `already_paid` guard runs BEFORE postTransaction's idempotency-key
 *   comparison: a manual unkeyed repayment, a prior autopay run, or a re-run
 *   after editing the minimum all skip with `already_paid` — never a 409
 *   ConflictError and never a duplicate posting.
 * - Shape: credit_card → card repayment (bank −X / card +X), everything else
 *   → transfer; origin 'recurring'; key `debt:<account id>:<YYYY-MM>`; dated
 *   the 1st (the autopilot convention).
 *
 * All operations execute strictly in-memory; zero live storage modifications.
 * All names are synthetic fixtures; no real financial data.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import Database from 'better-sqlite3';
import { runMigrations } from '@/infrastructure/sqlite/migrations';
import { createEntity, createAccount, ValidationError } from './accountService';
import { recordCreditCardRepayment } from './transactionService';
import { autopayDebtMinimum, debtPaidInMonth } from './debtAutopayService';

const MONTH = '2026-10';

describe('debtAutopayService', () => {
    let db: Database.Database;
    let entityId: string;
    let checkingId: string;

    beforeEach(() => {
        db = new Database(':memory:');
        db.pragma('foreign_keys = ON');
        runMigrations(db);
        const entity = createEntity(db, { name: 'Autopay Tester', type: 'person', currency: 'USD' });
        entityId = entity.id;
        const { account } = createAccount(db, {
            entity_id: entityId,
            name: 'Checking',
            type: 'asset',
            sub_type: 'checking',
            currency: 'USD',
            opening_balance_cents: 1000000,
            opening_date: '2026-01-01'
        });
        checkingId = account.id;
    });

    afterEach(() => {
        try {
            db.close();
        } catch {
            // Already closed
        }
    });

    function makeLiability(opts: {
        name: string;
        sub_type?: string;
        currency?: string;
        opening_balance_cents?: number | null;
        minimum_payment_cents?: number | null;
    }) {
        return createAccount(db, {
            entity_id: entityId,
            name: opts.name,
            type: 'liability',
            sub_type: (opts.sub_type ?? 'credit_card') as any,
            currency: (opts.currency ?? 'USD') as any,
            opening_balance_cents: opts.opening_balance_cents === undefined ? 100000 : opts.opening_balance_cents,
            opening_date: '2026-01-01',
            minimum_payment_cents: opts.minimum_payment_cents ?? null
        }).account;
    }

    function attempt(debtAccountId: string, month = MONTH) {
        return autopayDebtMinimum(db, {
            entity_id: entityId,
            bank_account_id: checkingId,
            debt_account_id: debtAccountId,
            month
        });
    }

    function postedDebitCount(accountId: string): number {
        const row = db.prepare(
            "SELECT COUNT(*) c FROM journal_entries j JOIN transactions t ON t.id = j.transaction_id " +
            "WHERE j.account_id = ? AND j.amount_cents > 0 AND t.status = 'posted'"
        ).get(accountId) as { c: number };
        return row.c;
    }

    it('posts a credit-card minimum as a card repayment with the autopilot contract', () => {
        const card = makeLiability({ name: 'Visa Card', minimum_payment_cents: 3500 });
        const result = attempt(card.id);

        expect(result.skipped).toBe(false);
        const tx = result.transaction!;
        expect(tx.idempotency_key).toBe(`debt:${card.id}:2026-10`);
        expect(tx.origin).toBe('recurring');
        expect(tx.status).toBe('posted');
        expect(tx.date).toBe('2026-10-01');
        expect(tx.description).toBe('Minimum payment — Visa Card');
        // Double-entry: whole payment bank → card, no principal/interest split.
        const byAccount = new Map(tx.postings.map(p => [p.account_id, p.amount_cents]));
        expect(byAccount.get(checkingId)).toBe(-3500);
        expect(byAccount.get(card.id)).toBe(3500);
    });

    it('posts a non-card liability as a transfer', () => {
        const loan = makeLiability({ name: 'Car Loan', sub_type: 'personal_loan', minimum_payment_cents: 21000 });
        const result = attempt(loan.id);

        expect(result.skipped).toBe(false);
        const tx = result.transaction!;
        expect(tx.postings).toHaveLength(2);
        const byAccount = new Map(tx.postings.map(p => [p.account_id, p.amount_cents]));
        expect(byAccount.get(checkingId)).toBe(-21000);
        expect(byAccount.get(loan.id)).toBe(21000);
    });

    it('skips debts without an explicit minimum — estimates never reach the ledger', () => {
        const noTerms = makeLiability({ name: 'No Terms Card' });
        expect(attempt(noTerms.id)).toEqual({ skipped: true, reason: 'no_explicit_minimum' });

        const zeroTerms = makeLiability({ name: 'Zero Terms Card', minimum_payment_cents: 0 });
        expect(attempt(zeroTerms.id)).toEqual({ skipped: true, reason: 'no_explicit_minimum' });
    });

    it('skips a debt whose currency differs from the funding account (no fake FX)', () => {
        const eur = makeLiability({ name: 'EUR Card', currency: 'EUR', minimum_payment_cents: 3500 });
        expect(attempt(eur.id)).toEqual({ skipped: true, reason: 'currency_mismatch' });
    });

    it('skips zero or paid-off balances; unknown balances still post', () => {
        const paidOff = makeLiability({ name: 'Paid Off Card', opening_balance_cents: 0, minimum_payment_cents: 3500 });
        expect(attempt(paidOff.id)).toEqual({ skipped: true, reason: 'nothing_owed' });

        const overpaid = makeLiability({ name: 'Overpaid Card', opening_balance_cents: -500, minimum_payment_cents: 3500 });
        expect(attempt(overpaid.id)).toEqual({ skipped: true, reason: 'nothing_owed' });

        // Transaction-tracked liabilities have no opening balance — explicit
        // terms project (and post) regardless, mirroring the forecast rules.
        const unknown = makeLiability({ name: 'Unknown Balance Card', opening_balance_cents: null, minimum_payment_cents: 3500 });
        expect(attempt(unknown.id).skipped).toBe(false);
    });

    it('skips inactive liabilities', () => {
        const card = makeLiability({ name: 'Retired Card', minimum_payment_cents: 3500 });
        db.prepare('UPDATE accounts SET is_active = 0 WHERE id = ?').run(card.id);
        expect(attempt(card.id)).toEqual({ skipped: true, reason: 'inactive' });
    });

    it('skips when a manual (unkeyed) repayment was already posted this month', () => {
        const card = makeLiability({ name: 'Visa Card', minimum_payment_cents: 3500 });
        recordCreditCardRepayment(db, {
            bank_account_id: checkingId, card_account_id: card.id,
            amount_cents: 5000, date: '2026-10-05', description: 'Manual payment'
        });
        expect(attempt(card.id)).toEqual({ skipped: true, reason: 'already_paid' });
        expect(postedDebitCount(card.id)).toBe(1);
    });

    it('re-running the month skips — even after editing the minimum, no conflict and no duplicate', () => {
        const card = makeLiability({ name: 'Visa Card', minimum_payment_cents: 3500 });
        const first = attempt(card.id);
        expect(first.skipped).toBe(false);

        // User raises the minimum mid-month and regenerates: the already_paid
        // guard fires before postTransaction's key comparison, so the changed
        // amount never triggers a ConflictError (409).
        db.prepare('UPDATE accounts SET minimum_payment_cents = 9900 WHERE id = ?').run(card.id);
        const second = attempt(card.id);
        expect(second).toEqual({ skipped: true, reason: 'already_paid' });
        expect(postedDebitCount(card.id)).toBe(1);
    });

    it('rejects malformed input and cross-entity references with ValidationError', () => {
        const card = makeLiability({ name: 'Visa Card', minimum_payment_cents: 3500 });

        expect(() => attempt(card.id, '2026-13')).toThrow(/Invalid month/);
        expect(() => autopayDebtMinimum(db, {
            entity_id: entityId, bank_account_id: checkingId, debt_account_id: '', month: MONTH
        })).toThrow(ValidationError);

        // The debt belongs to this entity; the funding account to another.
        const other = createEntity(db, { name: 'Other Person', type: 'person', currency: 'USD' });
        const { account: otherBank } = createAccount(db, {
            entity_id: other.id, name: 'Other Checking', type: 'asset', sub_type: 'checking',
            currency: 'USD', opening_balance_cents: 1000, opening_date: '2026-01-01'
        });
        expect(() => autopayDebtMinimum(db, {
            entity_id: entityId, bank_account_id: otherBank.id, debt_account_id: card.id, month: MONTH
        })).toThrow(ValidationError);
        expect(postedDebitCount(card.id)).toBe(0);
    });

    it('debtPaidInMonth ignores out-of-month and non-posted debits', () => {
        const card = makeLiability({ name: 'Visa Card', minimum_payment_cents: 3500 });

        // September debit: outside the October window.
        recordCreditCardRepayment(db, {
            bank_account_id: checkingId, card_account_id: card.id,
            amount_cents: 3500, date: '2026-09-15', description: 'September payment'
        });
        expect(debtPaidInMonth(db, card.id, '2026-10-01', '2026-10-31')).toBe(false);

        // October debit counts…
        const oct = recordCreditCardRepayment(db, {
            bank_account_id: checkingId, card_account_id: card.id,
            amount_cents: 3500, date: '2026-10-03', description: 'October payment'
        });
        expect(debtPaidInMonth(db, card.id, '2026-10-01', '2026-10-31')).toBe(true);

        // …but a voided one does not (status predicate, not mere existence).
        db.prepare("UPDATE transactions SET status = 'void' WHERE id = ?").run(oct.id);
        expect(debtPaidInMonth(db, card.id, '2026-10-01', '2026-10-31')).toBe(false);
    });
});
