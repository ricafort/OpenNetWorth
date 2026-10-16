/**
 * Why this file exists:
 * Budgets are monthly per-category spending limits stored in the vault; this
 * service owns their CRUD and the budget-vs-actual comparison the Cashflow page
 * renders. The actuals side reuses `getPeriodIncomeAndExpenses` — transactions
 * carry no category column, so a budget's `category` is the expense account's
 * `sub_type` value (category ≡ the income/expense account).
 *
 * Tricky logic:
 * - A budget is a MONTHLY default (one row per entity+category+currency). For a
 *   period spanning several months, the limit is prorated: `period_months` is
 *   the exact sum of per-calendar-month overlap fractions (days of the month
 *   inside the range / days in that month), so Jan 1–Jun 30 = 6.0 and a
 *   half-month range = 0.5-ish, deterministically and testably.
 * - The breakdown from `getPeriodIncomeAndExpenses` is keyed by ACCOUNT; several
 *   accounts can share one sub_type, so actuals are re-aggregated by
 *   (sub_type, currency) before joining budgets.
 * - Money never crosses currencies: every row is single-currency, matching the
 *   codebase's per-currency maps.
 */

import Database from 'better-sqlite3';
import {
    assertValidMoneyCents,
    formatMoney,
    type CurrencyCode
} from './types';
import { ValidationError } from './accountService';
import { CALCULATION_ENGINE_VERSION, getPeriodIncomeAndExpenses } from './balanceService';
import { getLocalTodayCalendarDate } from '../calendarDate';

export interface Budget {
    id: string;
    user_id: string;
    entity_id: string;
    category: string;
    limit_cents: number;
    currency: CurrencyCode;
    created_at: string;
    updated_at: string;
}

export interface UpsertBudgetInput {
    entity_id: string;
    category: string;
    currency: string;
    limit_cents: number;
}

export type BudgetVsActualStatus = 'over' | 'at_risk' | 'under' | 'unbudgeted';

export interface BudgetVsActualRow {
    category: string;
    currency: CurrencyCode;
    /** Monthly limit as configured; null for spent-but-unbudgeted categories. */
    limit_cents: number | null;
    period_months: number;
    /** limit_cents × period_months (prorated); null when unbudgeted. */
    budgeted_cents: number | null;
    actual_cents: number;
    /** actual − budgeted (positive = over budget); null when unbudgeted. */
    difference_cents: number | null;
    /** actual / budgeted × 100, one decimal; null when unbudgeted. */
    percent_used: number | null;
    status: BudgetVsActualStatus;
    formatted_budgeted: string | null;
    formatted_actual: string;
    formatted_difference: string | null;
}

export interface BudgetVsActualResult {
    entity_id: string;
    start_date: string;
    end_date: string;
    period_months: number;
    rows: BudgetVsActualRow[];
    calculation_version: string;
}

export function listBudgets(db: Database.Database, entityId: string): Budget[] {
    return db.prepare(
        'SELECT * FROM budgets WHERE entity_id = ? ORDER BY category ASC, currency ASC'
    ).all(entityId) as Budget[];
}

export function upsertBudget(db: Database.Database, input: UpsertBudgetInput): Budget {
    const category = (input.category || '').trim();
    if (!category) {
        throw new ValidationError('Budget category is required and cannot be blank.');
    }
    if (!input.entity_id) {
        throw new ValidationError('Budget entity_id is required.');
    }
    const currency = (input.currency || '').trim().toUpperCase();
    if (!/^[A-Z]{3}$/.test(currency)) {
        throw new ValidationError(`Budget currency must be a 3-letter code, received: ${input.currency}`);
    }
    assertValidMoneyCents(input.limit_cents, 'Budget limit');
    if (input.limit_cents <= 0) {
        throw new ValidationError('Budget limit must be a positive amount.');
    }

    const now = new Date().toISOString();
    const existing = db.prepare(
        'SELECT id FROM budgets WHERE entity_id = ? AND category = ? AND currency = ?'
    ).get(input.entity_id, category, currency) as { id: string } | undefined;

    if (existing) {
        db.prepare(
            'UPDATE budgets SET limit_cents = ?, updated_at = ? WHERE id = ?'
        ).run(input.limit_cents, now, existing.id);
    } else {
        db.prepare(`
            INSERT INTO budgets (id, user_id, entity_id, category, limit_cents, currency, created_at, updated_at)
            VALUES (?, 'local_user', ?, ?, ?, ?, ?, ?)
        `).run(crypto.randomUUID(), input.entity_id, category, input.limit_cents, currency, now, now);
    }

    return db.prepare(
        'SELECT * FROM budgets WHERE entity_id = ? AND category = ? AND currency = ?'
    ).get(input.entity_id, category, currency) as Budget;
}

export function deleteBudget(db: Database.Database, id: string): boolean {
    return db.prepare('DELETE FROM budgets WHERE id = ?').run(id).changes > 0;
}

/**
 * Exact fractional months covered by [start, end] (inclusive): for every
 * calendar month the range touches, add (days inside the range / days in that
 * month). Dates are YYYY-MM-DD calendar dates — parsed as UTC to avoid
 * timezone drift.
 */
export function periodMonths(start: string, end: string): number {
    const startDate = new Date(`${start}T00:00:00Z`);
    const endDate = new Date(`${end}T00:00:00Z`);
    if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime()) || endDate < startDate) {
        throw new ValidationError(`Invalid period: ${start} .. ${end}`);
    }
    let months = 0;
    let cursor = Date.UTC(startDate.getUTCFullYear(), startDate.getUTCMonth(), 1);
    while (cursor <= endDate.getTime()) {
        const monthStart = new Date(cursor);
        const nextMonth = Date.UTC(monthStart.getUTCFullYear(), monthStart.getUTCMonth() + 1, 1);
        const daysInMonth = (nextMonth - cursor) / 86_400_000;
        const from = Math.max(startDate.getTime(), cursor);
        const to = Math.min(endDate.getTime(), nextMonth - 86_400_000);
        // Overlap days inside the range, as a fraction of that month.
        months += ((to - from) / 86_400_000 + 1) / daysInMonth;
        cursor = nextMonth;
    }
    return Math.round(months * 1000) / 1000;
}

export function getBudgetVsActual(
    db: Database.Database,
    entityId: string,
    startDate: string,
    endDate?: string
): BudgetVsActualResult {
    if (!startDate) {
        // An open-ended period would make the prorated limit meaningless.
        throw new ValidationError('Budget comparison requires an explicit start date.');
    }
    const statement = getPeriodIncomeAndExpenses(db, entityId, startDate, endDate);
    const resolvedStart = startDate;
    // `end_date` is optional in the result type, but balanceService always
    // resolves it (endDate || today) — mirror that fallback for the proration.
    const resolvedEnd = statement.end_date ?? getLocalTodayCalendarDate();
    const months = periodMonths(resolvedStart, resolvedEnd);

    // Re-aggregate the per-account breakdown into (sub_type, currency) actuals.
    const actuals = new Map<string, { category: string; currency: CurrencyCode; cents: number }>();
    for (const item of statement.breakdown_by_category) {
        if (item.type !== 'expense') continue;
        const key = `${item.sub_type}|${item.currency}`;
        const entry = actuals.get(key) || { category: item.sub_type, currency: item.currency, cents: 0 };
        entry.cents += item.total_cents;
        actuals.set(key, entry);
    }

    const budgets = listBudgets(db, entityId);
    const budgetByKey = new Map<string, Budget>();
    for (const b of budgets) {
        budgetByKey.set(`${b.category}|${b.currency}`, b);
    }

    // Union of budgeted and actual categories, per currency.
    const keys = new Set<string>([...actuals.keys(), ...budgetByKey.keys()]);
    const rows: BudgetVsActualRow[] = [];
    for (const key of keys) {
        const budget = budgetByKey.get(key);
        const actual = actuals.get(key);
        const category = budget?.category ?? actual!.category;
        const currency = (budget?.currency ?? actual!.currency) as CurrencyCode;
        const actualCents = actual?.cents ?? 0;

        if (!budget) {
            rows.push({
                category,
                currency,
                limit_cents: null,
                period_months: months,
                budgeted_cents: null,
                actual_cents: actualCents,
                difference_cents: null,
                percent_used: null,
                status: 'unbudgeted',
                formatted_budgeted: null,
                formatted_actual: formatMoney({ amount_cents: actualCents, currency }),
                formatted_difference: null
            });
            continue;
        }

        const budgetedCents = Math.round(budget.limit_cents * months);
        const differenceCents = actualCents - budgetedCents;
        const percentUsed = budgetedCents > 0
            ? Math.round((actualCents / budgetedCents) * 1000) / 10
            : null;
        const status: BudgetVsActualStatus =
            percentUsed === null || percentUsed > 100 ? 'over'
                : percentUsed >= 90 ? 'at_risk'
                    : 'under';

        rows.push({
            category,
            currency,
            limit_cents: budget.limit_cents,
            period_months: months,
            budgeted_cents: budgetedCents,
            actual_cents: actualCents,
            difference_cents: differenceCents,
            percent_used: percentUsed,
            status,
            formatted_budgeted: formatMoney({ amount_cents: budgetedCents, currency }),
            formatted_actual: formatMoney({ amount_cents: actualCents, currency }),
            formatted_difference: formatMoney({ amount_cents: differenceCents, currency })
        });
    }

    rows.sort((a, b) =>
        a.currency.localeCompare(b.currency) || a.category.localeCompare(b.category)
    );

    return {
        entity_id: entityId,
        start_date: resolvedStart,
        end_date: resolvedEnd,
        period_months: months,
        rows,
        calculation_version: CALCULATION_ENGINE_VERSION
    };
}
