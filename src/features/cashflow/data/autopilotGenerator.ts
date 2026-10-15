import { RecurringTransaction } from '@/features/cashflow/types';
import { toMonthlyAmount } from '@/infrastructure/local_driver';

/**
 * Autopilot materialization: turns scheduled amounts into real double-entry postings.
 *
 * Why this exists:
 * The retired `applyRecurringToMonth` in `local_driver.ts` fabricated fake
 * `cash_flow_history` rows from schedule sums — numbers that looked like
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
 *   Momentum semantics. A schedule whose currency differs from the bank
 *   account's currency will post in the bank account's currency — the caller
 *   (future Autopilot UI) must pick a same-currency account or skip the rule.
 * - Re-running for the same month is safe: each posting carries the
 *   idempotency key `recurring:<schedule id>:<month>`, and the ledger returns
 *   the existing transaction instead of duplicating it.
 */

export interface AutopilotTarget {
    /** Sovereign entity the postings belong to. */
    entityId: string;
    /** Liquid asset account (checking/savings/cash) that receives or funds the postings. */
    bankAccountId: string;
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
