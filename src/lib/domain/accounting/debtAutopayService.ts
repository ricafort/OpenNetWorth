/**
 * Why this file exists:
 * Server-side guard for Autopilot debt minimum payments. The client generator
 * (autopilotGenerator.ts) decides WHICH debts to attempt; this service decides
 * WHETHER to post and derives the amount from the stored `minimum_payment_cents`
 * column — the client never sends an amount, so the ledger amount always equals
 * the terms the user set on the account (PR #5 UI).
 *
 * Idempotency & double-post model:
 * - Each posting carries `debt:<account id>:<YYYY-MM>`; re-running the same
 *   month is safe.
 * - The `already_paid` guard runs BEFORE postTransaction's idempotency-key
 *   comparison: any posted debit on the liability inside the month (manual
 *   repayment without a key, or a prior autopay run) skips the attempt. This
 *   also eliminates the 409 ConflictError when the user edits the minimum
 *   mid-month and regenerates — the second call never reaches the key check.
 * - Known limitation (identical to `recurring:` keys): if the autopay
 *   transaction is voided and the month regenerated, postTransaction's replay
 *   returns the existing (voided) transaction without posting.
 *
 * Scope decisions (fixed by product):
 * - Only debts with an EXPLICIT `minimum_payment_cents` are posted; the
 *   forecast's estimate fallback (debtCalculator.estimateMinPayment) stays
 *   forecast-only — the ledger never receives fabricated amounts.
 * - Full-amount repayment shape: the whole minimum payment posts bank→liability
 *   (record_card_repayment for credit cards, record_transfer otherwise).
 *   No principal/interest split — the ledger never models interest accrual.
 */

import Database from 'better-sqlite3';
import { ValidationError } from './accountService';
import {
    recordCreditCardRepayment,
    recordTransfer,
    type TransactionWithPostings
} from './transactionService';
import { resolveAccountBalanceInfo } from './balanceService';
import { getLocalTodayCalendarDate } from '../calendarDate';

export interface AutopayDebtInput {
    entity_id: string;
    /** Liquid asset account funding the payment (selected by the user in the Autopilot tab). */
    bank_account_id: string;
    debt_account_id: string;
    /** YYYY-MM — the payment is dated the 1st, the autopilot convention. */
    month: string;
}

export type DebtAutopaySkipReason =
    | 'inactive'
    | 'no_explicit_minimum'
    | 'currency_mismatch'
    | 'nothing_owed'
    | 'already_paid';

export interface AutopayDebtResult {
    skipped: boolean;
    reason?: DebtAutopaySkipReason;
    transaction?: TransactionWithPostings;
}

/**
 * True when a posted debit (positive amount_cents, schema.ts:85) exists on the
 * account inside the month — the "already paid" signal shared with the forecast
 * (forecastService.ts lifted this same SQL; single source of truth here).
 * Month bounds are lexicographic YYYY-MM-DD comparisons (autopilot convention).
 */
export function debtPaidInMonth(
    db: Database.Database,
    accountId: string,
    monthStart: string,
    monthEnd: string
): boolean {
    return !!db.prepare(
        'SELECT 1 FROM journal_entries j ' +
        'JOIN transactions t ON t.id = j.transaction_id ' +
        "WHERE j.account_id = ? AND j.amount_cents > 0 AND t.status = 'posted' AND t.date >= ? AND t.date <= ? LIMIT 1"
    ).get(accountId, monthStart, monthEnd);
}

/**
 * Posts one liability's minimum payment for `month`, or skips with a reason.
 * Precedence: shape validation (throws ValidationError → HTTP 400) →
 * inactive → no_explicit_minimum → currency_mismatch → nothing_owed →
 * already_paid → post. Unknown balances do NOT skip (explicit terms project
 * regardless, mirroring forecastService's debt rules).
 */
export function autopayDebtMinimum(db: Database.Database, input: AutopayDebtInput): AutopayDebtResult {
    if (!input || !/^\d{4}-(0[1-9]|1[0-2])$/.test(String(input.month ?? ''))) {
        throw new ValidationError(`Invalid month "${input?.month}"; expected YYYY-MM.`);
    }
    if (!input.entity_id || !input.bank_account_id || !input.debt_account_id) {
        throw new ValidationError('autopay_debt requires entity_id, bank_account_id and debt_account_id.');
    }

    const bank = db.prepare('SELECT * FROM accounts WHERE id = ?').get(input.bank_account_id) as any;
    if (!bank || bank.type !== 'asset' || bank.entity_id !== input.entity_id) {
        throw new ValidationError(`Funding account not found for entity: ${input.bank_account_id}`);
    }
    const debt = db.prepare('SELECT * FROM accounts WHERE id = ?').get(input.debt_account_id) as any;
    if (!debt || debt.type !== 'liability' || debt.entity_id !== input.entity_id) {
        throw new ValidationError(`Debt liability account not found for entity: ${input.debt_account_id}`);
    }

    if (!debt.is_active) {
        return { skipped: true, reason: 'inactive' };
    }

    const amountCents = debt.minimum_payment_cents;
    if (typeof amountCents !== 'number' || !Number.isFinite(amountCents) || !Number.isInteger(amountCents) || amountCents <= 0) {
        return { skipped: true, reason: 'no_explicit_minimum' };
    }

    if (debt.currency !== bank.currency) {
        return { skipped: true, reason: 'currency_mismatch' };
    }

    // Credit-normal: positive = owed. Unknown balance does not skip.
    const balance = resolveAccountBalanceInfo(db, debt, getLocalTodayCalendarDate());
    if (!balance.is_unknown && balance.balance_cents != null && balance.balance_cents <= 0) {
        return { skipped: true, reason: 'nothing_owed' };
    }

    const monthStart = `${input.month}-01`;
    const monthEnd = `${input.month}-31`;
    if (debtPaidInMonth(db, debt.id, monthStart, monthEnd)) {
        return { skipped: true, reason: 'already_paid' };
    }

    const shared = {
        amount_cents: amountCents,
        date: monthStart,
        description: `Minimum payment — ${debt.name}`,
        idempotency_key: `debt:${debt.id}:${input.month}`,
        origin: 'recurring' as const
    };
    const transaction = debt.sub_type === 'credit_card'
        ? recordCreditCardRepayment(db, { bank_account_id: bank.id, card_account_id: debt.id, ...shared })
        : recordTransfer(db, { from_account_id: bank.id, to_account_id: debt.id, ...shared });

    return { skipped: false, transaction };
}
