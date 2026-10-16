import { RecurringTransaction } from '@/features/cashflow/types';
import { toMonthlyAmount } from '@/infrastructure/local_driver';
import { normalizeCategory } from '@/lib/domain/accounting/recurringNormalization';

/**
 * Autopilot materialization: turns scheduled amounts into real double-entry postings.
 *
 * Why this exists:
 * The retired `applyRecurringToMonth` in `local_driver.ts` fabricated fake
 * `cash_flow_summaries` rows from schedule sums — numbers that looked like
 * activity but were never posted to the ledger. Per the schema-collapse plan,
 * the generator now writes REAL m1 transactions with `origin='recurring'`
 * (the CHECK value already exists on the transactions table), so the Actual
 * tab, the net worth trend, and the schedules finally agree.
 *
 * Honesty constraints:
 * - The caller must pass an explicit entity and liquid bank account. The
 *   generator never guesses which account funds a schedule; posting to an
 *   arbitrary account would fabricate where money actually moved.
 * - Amounts are monthly-normalized (weekly ×4.33, etc.), matching the Wealth
 *   Momentum semantics. When the caller supplies `bankAccountCurrency`, a
 *   schedule in any other currency is SKIPPED — posting it into a
 *   different-currency account would fabricate a 1:1 conversion.
 * - Re-running for the same month is safe: each posting carries the
 *   idempotency key `recurring:<schedule id>:<month>`, and the ledger returns
 *   the existing transaction instead of duplicating it.
 */

export interface AutopilotTarget {
    /** Sovereign entity the postings belong to. */
    entityId: string;
    /** Liquid asset account (checking/savings/cash) that receives or funds the postings. */
    bankAccountId: string;
    /**
     * Currency of the funding account. When provided, schedules in any other
     * currency are skipped — posting them would imply a fake 1:1 conversion.
     */
    bankAccountCurrency?: string;
}

export interface AutopilotGenerationResult {
    month: string;
    posted: number;
    skipped: number;
    errors: string[];
}

export async function applyRecurringToMonth(
    schedules: RecurringTransaction[],
    month: string,
    target: AutopilotTarget
): Promise<AutopilotGenerationResult> {
    if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(month)) {
        throw new Error(`Invalid month "${month}"; expected YYYY-MM.`);
    }
    if (!target?.entityId || !target?.bankAccountId) {
        throw new Error('Autopilot generation requires an explicit entity and bank account.');
    }

    const monthStart = `${month}-01`;
    // Lexicographic upper bound: calendar dates are zero-padded YYYY-MM-DD.
    const monthEnd = `${month}-31`;

    const result: AutopilotGenerationResult = { month, posted: 0, skipped: 0, errors: [] };

    for (const schedule of schedules) {
        if (!schedule.is_active) { result.skipped++; continue; }
        if (!schedule.start_date || schedule.start_date > monthEnd) { result.skipped++; continue; }
        if (schedule.end_date && schedule.end_date < monthStart) { result.skipped++; continue; }
        // Currency honesty: never post a schedule into a different-currency account.
        if (target.bankAccountCurrency && schedule.currency
            && schedule.currency !== target.bankAccountCurrency) {
            result.skipped++;
            continue;
        }

        const amount_cents = Math.round(toMonthlyAmount(schedule.amount, schedule.frequency) * 100);
        if (!Number.isFinite(amount_cents) || amount_cents <= 0) { result.skipped++; continue; }

        // Schedule categories are free text; the ledger stores them as account
        // sub_type values (snake_case). Empty categories fall back to the
        // service defaults ('salary' / 'living_expense').
        const category = (schedule.category || '').trim().replace(/\s+/g, '_');

        const isIncome = schedule.type === 'income';
        const payload: Record<string, unknown> = {
            entity_id: target.entityId,
            amount_cents,
            date: monthStart,
            description: schedule.name,
            idempotency_key: `recurring:${schedule.id}:${month}`,
            origin: 'recurring',
            ...(isIncome
                ? { bank_account_id: target.bankAccountId, payer: schedule.name }
                : { payment_account_id: target.bankAccountId, payee: schedule.name }),
            ...(category ? { category } : {})
        };

        try {
            const res = await fetch('/api/accounting', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: isIncome ? 'record_income' : 'record_expense',
                    payload
                })
            });
            if (!res.ok) {
                const err = await res.json().catch(() => ({}));
                result.errors.push(`${schedule.name}: ${err.error || `HTTP ${res.status}`}`);
                continue;
            }
            result.posted++;
        } catch (e: any) {
            result.errors.push(`${schedule.name}: ${e?.message || 'network error'}`);
        }
    }

    return result;
}

/**
 * Debt autopilot: posts each liability's EXACT minimum payment for the month.
 *
 * Division of responsibility:
 * The client decides WHICH debts to attempt (skip rules below — all derivable
 * from data already loaded); the server (`autopayDebtMinimum`,
 * debtAutopayService.ts) decides WHETHER to post and derives the amount from
 * the stored `minimum_payment_cents` column. The payload carries no amount —
 * the ledger amount always equals the terms set on the account, and re-running
 * after editing terms can never trigger an idempotency conflict.
 *
 * Honesty constraints:
 * - Only debts with an explicit `minimum_payment_cents` are posted; the
 *   forecast's estimate fallback never reaches the ledger.
 * - Funding is the tab's selected liquid account only — debts in any other
 *   currency are skipped (same rule as schedules above; the generator never
 *   guesses which account pays).
 * - A debt covered by a projected `Debt Repayment` (or sub_type-matching)
 *   schedule is skipped: the schedule's expense already leaves cash, so
 *   posting the minimum too would double-count — the same suppression the
 *   forecast applies (`covered_by_recurring_schedule`).
 * - Re-running is safe: the server's `already_paid` guard (any posted debit on
 *   the liability this month, manual or prior autopay) skips the attempt;
 *   postings carry `debt:<account id>:<YYYY-MM>`.
 */

export interface AutopilotDebt {
    id: string;
    name: string;
    sub_type: string;
    currency: string;
    minimum_payment_cents: number | null;
    /** Credit-normal (positive = owed); null/undefined = unknown → does NOT skip. */
    balance_cents: number | null;
    /** GET /api/accounting returns this as a boolean, not 0/1. */
    is_active: boolean;
}

export type DebtAutopilotSkipReason =
    | 'inactive'
    | 'no_explicit_minimum'
    | 'currency_mismatch'
    | 'covered_by_recurring_schedule'
    | 'nothing_owed'
    | 'already_paid';

export interface DebtAutopilotGenerationResult {
    month: string;
    posted: number;
    skipped: number;
    skipped_details: Array<{ id: string; name: string; reason: DebtAutopilotSkipReason }>;
    errors: string[];
}

export async function applyDebtPaymentsToMonth(
    debts: AutopilotDebt[],
    month: string,
    target: AutopilotTarget,
    schedules: RecurringTransaction[]
): Promise<DebtAutopilotGenerationResult> {
    if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(month)) {
        throw new Error(`Invalid month "${month}"; expected YYYY-MM.`);
    }
    if (!target?.entityId || !target?.bankAccountId) {
        throw new Error('Debt autopilot requires an explicit entity and bank account.');
    }

    const monthStart = `${month}-01`;
    const monthEnd = `${month}-31`;

    // Categories of schedules that WILL project this month → their currency.
    // Mirrors the forecast's projectedScheduleCategories (minus the booked-key
    // check: a schedule already booked this month still covers its debts).
    const coveredCategories = new Map<string, string>();
    for (const schedule of schedules) {
        if (!schedule.is_active) continue;
        if (!schedule.start_date || schedule.start_date > monthEnd) continue;
        if (schedule.end_date && schedule.end_date < monthStart) continue;
        const amount_cents = Math.round(toMonthlyAmount(schedule.amount, schedule.frequency) * 100);
        if (!Number.isFinite(amount_cents) || amount_cents <= 0) continue;
        coveredCategories.set(normalizeCategory(schedule.category), schedule.currency || 'USD');
    }

    const result: DebtAutopilotGenerationResult = { month, posted: 0, skipped: 0, skipped_details: [], errors: [] };
    const skip = (debt: AutopilotDebt, reason: DebtAutopilotSkipReason) => {
        result.skipped++;
        result.skipped_details.push({ id: debt.id, name: debt.name, reason });
    };

    for (const debt of debts) {
        if (debt.is_active === false) { skip(debt, 'inactive'); continue; }

        const terms = debt.minimum_payment_cents;
        if (typeof terms !== 'number' || !Number.isSafeInteger(terms) || terms <= 0) {
            skip(debt, 'no_explicit_minimum');
            continue;
        }

        if (target.bankAccountCurrency && debt.currency && debt.currency !== target.bankAccountCurrency) {
            skip(debt, 'currency_mismatch');
            continue;
        }

        if (coveredCategories.get('debt_repayment') === debt.currency
            || coveredCategories.get(normalizeCategory(debt.sub_type)) === debt.currency) {
            skip(debt, 'covered_by_recurring_schedule');
            continue;
        }

        if (typeof debt.balance_cents === 'number' && debt.balance_cents <= 0) {
            skip(debt, 'nothing_owed');
            continue;
        }

        try {
            const res = await fetch('/api/accounting', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: 'autopay_debt',
                    payload: {
                        entity_id: target.entityId,
                        bank_account_id: target.bankAccountId,
                        debt_account_id: debt.id,
                        month
                    }
                })
            });
            if (!res.ok) {
                const err = await res.json().catch(() => ({}));
                result.errors.push(`${debt.name}: ${err.error || `HTTP ${res.status}`}`);
                continue;
            }
            const data = await res.json().catch(() => ({}));
            if (data.skipped) {
                // Server-side guard (typically already_paid) — not an error.
                skip(debt, (data.reason as DebtAutopilotSkipReason) || 'already_paid');
            } else {
                result.posted++;
            }
        } catch (e: any) {
            result.errors.push(`${debt.name}: ${e?.message || 'network error'}`);
        }
    }

    return result;
}
