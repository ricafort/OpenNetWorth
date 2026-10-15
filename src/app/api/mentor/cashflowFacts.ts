/**
 * Why this file exists:
 * Reads the user's recurring budget (Autopilot Budgets / recurring_schedules) and normalizes
 * every active item to a MONTHLY amount grouped by currency, so mentor prompts and offline
 * fallbacks can answer cash-flow and goal-timeline questions with real numbers
 * (income, expenses, net monthly surplus) instead of only balance-sheet totals.
 *
 * Tricky logic:
 * - The legacy table stores free-form REAL amounts per frequency; normalization factors convert
 *   weekly/fortnightly/quarterly/annual items to monthly equivalents.
 * - The table is created by the full app DB init, not by initAccountingSchema, so reads are guarded:
 *   when the table is absent (e.g. in-memory test DBs) the snapshot reports available=false
 *   instead of throwing.
 * - FX conversion reuses the same explicit dated-rate policy as the shared financial summary:
 *   no 1:1 guesses; a missing rate returns null and the caller must disclose it.
 */

import type Database from 'better-sqlite3';

export type RecurringMonthlyItem = {
    name: string;
    category: string;
    type: 'income' | 'expense';
    monthlyAmount: number;   // major units, rounded to 2 decimals
    currency: string;
};

export type RecurringMonthlySnapshot = {
    available: boolean;
    items: RecurringMonthlyItem[];
    monthlyIncomeByCurrency: Record<string, number>;
    monthlyExpenseByCurrency: Record<string, number>;
    netSurplusByCurrency: Record<string, number>;
};

const FREQUENCY_TO_MONTHLY: Record<string, number> = {
    monthly: 1,
    weekly: 52 / 12,
    biweekly: 26 / 12,
    fortnightly: 26 / 12,
    quarterly: 4 / 12,
    semiannual: 2 / 12,
    semiannually: 2 / 12,
    annual: 1 / 12,
    yearly: 1 / 12,
    daily: 365.25 / 12
};

const round2 = (v: number) => Math.round(v * 100) / 100;

export function getRecurringMonthlySnapshot(db: Database.Database): RecurringMonthlySnapshot {
    const empty: RecurringMonthlySnapshot = {
        available: false,
        items: [],
        monthlyIncomeByCurrency: {},
        monthlyExpenseByCurrency: {},
        netSurplusByCurrency: {}
    };

    let rows: any[];
    try {
        rows = db.prepare(
            'SELECT name, category, amount, type, frequency, currency FROM recurring_schedules WHERE is_active = 1'
        ).all() as any[];
    } catch {
        // Table not present (e.g. in-memory test schema) — degrade gracefully
        return empty;
    }

    const items: RecurringMonthlyItem[] = [];
    const income: Record<string, number> = {};
    const expenses: Record<string, number> = {};

    for (const r of rows) {
        const factor = FREQUENCY_TO_MONTHLY[String(r.frequency || 'monthly').toLowerCase()];
        const amount = Number(r.amount);
        if (!isFinite(amount) || amount < 0) continue;
        const currency = String(r.currency || 'USD').toUpperCase();
        const monthly = round2(amount * (factor ?? 1));
        items.push({
            name: String(r.name || 'Untitled'),
            category: String(r.category || 'Uncategorized'),
            type: r.type === 'income' ? 'income' : 'expense',
            monthlyAmount: monthly,
            currency
        });
        const bucket = r.type === 'income' ? income : expenses;
        bucket[currency] = round2((bucket[currency] || 0) + monthly);
    }

    const currencies = Array.from(new Set([...Object.keys(income), ...Object.keys(expenses)]));
    const surplus: Record<string, number> = {};
    for (const c of currencies) {
        surplus[c] = round2((income[c] || 0) - (expenses[c] || 0));
    }

    return {
        available: items.length > 0,
        items,
        monthlyIncomeByCurrency: income,
        monthlyExpenseByCurrency: expenses,
        netSurplusByCurrency: surplus
    };
}

/**
 * Convert a major-unit amount between currencies using the same explicit dated-rate policy as
 * the shared financial summary (latest rate on or before asOfDate). Returns null when no rate
 * exists — callers must disclose the gap rather than guess 1:1.
 */
export function convertAmount(
    db: Database.Database,
    amount: number,
    fromCurrency: string,
    toCurrency: string,
    asOfDate: string
): number | null {
    if (fromCurrency === toCurrency) return amount;
    try {
        const row = db.prepare(`
            SELECT rate FROM exchange_rates
            WHERE from_currency = ? AND to_currency = ? AND effective_date <= ?
            ORDER BY effective_date DESC
            LIMIT 1
        `).get(fromCurrency, toCurrency, asOfDate) as { rate: number } | undefined;
        if (row && row.rate > 0) return amount * row.rate;
        return null;
    } catch {
        return null;
    }
}
