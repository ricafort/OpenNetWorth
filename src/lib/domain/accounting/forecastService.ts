/**
 * Why this file exists:
 * Cash-flow forecast: projects the entity's liquid balance per currency forward
 * from today over a horizon (default 90 days) using the two forward-looking
 * inputs the vault already has — recurring schedules (Autopilot) and monthly
 * budgets. No new table: the forecast is a pure derived report.
 *
 * The anti-double-count model (the whole point of this design):
 * The projection starts from the ACTUAL ledger balance, which already contains
 * every posted transaction — including this month's Autopilot wires. So the
 * forecast must predict what the ledger WILL book, mirroring
 * `autopilotGenerator.ts` exactly: one monthly-normalized entry per schedule
 * per calendar month. A month whose idempotency key `recurring:<id>:<YYYY-MM>`
 * already exists in `transactions` is SKIPPED — that money is already in the
 * starting balance. (Voided postings keep their key and are also excluded from
 * the balance, so key-existence regardless of status stays consistent.)
 *
 * Tricky logic:
 * - `recurring_schedules.amount` is REAL MAJOR units; convert after
 *   normalization: Math.round(toMonthlyAmount(amount, frequency) × 100).
 * - Schedules are user-scoped (no entity_id); currency is the only attribution
 *   axis. A schedule in a currency with no liquid account for this entity is
 *   excluded with a disclosure — the autopilot currency-skip analogue.
 * - Budgets never materialize as postings, so they carry no key check; they
 *   accrue as an integer-exact daily rate (floor(limit/daysInMonth), remainder
 *   spread over the first `rem` days) so a full month sums to exactly
 *   `limit_cents`. Partial first/last months prorate by day overlap.
 * - Budget × schedule overlap: same normalized category + currency would
 *   deduct twice. The schedule wins (it's a concrete posting the ledger will
 *   book); the budget is excluded and disclosed.
 * - No proration of schedule amounts for the partial final month — autopilot
 *   books the full monthly amount on the 1st of every touched month.
 * - Unknown starting balance (currency has liquid accounts but none with a
 *   known balance) → is_unknown with empty points; never fabricate 0.
 * - All date math is integer (year, month) iteration + UTC-parsed calendar
 *   strings (same discipline as periodMonths in budgetService); lexicographic
 *   YYYY-MM-DD comparisons mirror autopilot's skip rules.
 */

import Database from 'better-sqlite3';
import { getActualCashFlowStatement, CALCULATION_ENGINE_VERSION } from './balanceService';
import { listBudgets } from './budgetService';
import { toMonthlyAmount } from './recurringNormalization';
import { formatMoney, type CurrencyCode } from './types';
import { getLocalTodayCalendarDate, getDaysInMonth, formatCalendarDate } from '../calendarDate';

export const FORECAST_DEFAULT_HORIZON_DAYS = 90;
export const FORECAST_MIN_HORIZON_DAYS = 30;
export const FORECAST_MAX_HORIZON_DAYS = 180;

export type ForecastHorizonInput = string | number | null | undefined;

/** Absent/garbage → 90; otherwise clamped to [30, 180]. */
export function clampHorizonDays(raw: ForecastHorizonInput): number {
    if (raw === null || raw === undefined || raw === '') {
        return FORECAST_DEFAULT_HORIZON_DAYS;
    }
    const n = typeof raw === 'number' ? raw : Number(raw);
    if (!Number.isFinite(n)) {
        return FORECAST_DEFAULT_HORIZON_DAYS;
    }
    return Math.min(FORECAST_MAX_HORIZON_DAYS, Math.max(FORECAST_MIN_HORIZON_DAYS, Math.round(n)));
}

export interface ForecastEvent {
    /** YYYY-MM-DD the projected movement lands on (month start, or today for the current month). */
    date: string;
    kind: 'schedule' | 'budget';
    /** Schedule name / budget category. */
    label: string;
    category: string | null;
    direction: 'inflow' | 'outflow';
    /** Income +, expense −. */
    signed_amount_cents: number;
    currency: CurrencyCode;
    schedule_id?: string;
    formatted_signed_amount: string;
}

export interface ForecastPoint {
    date: string;
    balance_cents: number;
}

export interface CurrencyForecast {
    currency: CurrencyCode;
    /** null ⇔ liquid accounts exist but none has a known balance. */
    starting_balance_cents: number | null;
    is_unknown: boolean;
    /** One point per day, today..end inclusive; empty when is_unknown. */
    points: ForecastPoint[];
    /** Display list (schedules monthly, budgets monthly-prorated), sorted by date then label. */
    events: ForecastEvent[];
    end_balance_cents: number | null;
    net_change_cents: number;
    min_balance_cents: number | null;
    min_balance_date: string | null;
    goes_negative: boolean;
    formatted_starting_balance: string | null;
    formatted_end_balance: string | null;
    formatted_min_balance: string | null;
}

export interface ExcludedSchedule {
    id: string;
    name: string;
    currency: string;
    reason: 'no_liquid_accounts' | 'invalid_amount';
}

export interface ExcludedBudgetCategory {
    category: string;
    currency: CurrencyCode;
    reason: 'covered_by_recurring_schedule';
}

export interface CashFlowForecastResult {
    entity_id: string;
    /** Today — the forecast is always anchored at the current local calendar date. */
    start_date: string;
    end_date: string;
    horizon_days: number;
    /** Strict per-currency series; never FX-joined. */
    currencies: CurrencyForecast[];
    excluded_schedules: ExcludedSchedule[];
    excluded_budget_categories: ExcludedBudgetCategory[];
    calculation_version: string;
}

interface ScheduleRow {
    id: string;
    name: string;
    amount: number;
    type: string;
    frequency: string;
    category: string; // NOT NULL in the DDL (0001)
    start_date: string; // NOT NULL in the DDL (0001)
    end_date: string | null;
    is_active: number;
    currency: string;
}

/** Autopilot snake_cases schedule categories; budgets are free text — compare normalized. */
function normalizeCategory(value: string | null | undefined): string {
    return (value || '').trim().toLowerCase().replace(/\s+/g, '_');
}

function parseCalendarDate(date: string): { year: number; month: number; day: number } {
    const [year, month, day] = date.split('-').map(Number);
    return { year, month, day };
}

function addCalendarDays(date: string, days: number): string {
    const { year, month, day } = parseCalendarDate(date);
    const shifted = new Date(Date.UTC(year, month - 1, day) + days * 86_400_000);
    return formatCalendarDate(shifted.getUTCFullYear(), shifted.getUTCMonth() + 1, shifted.getUTCDate());
}

/** Inclusive calendar-month iteration from (y0,m0) to (y1,m1) as YYYY-MM strings. */
function* eachMonth(startYear: number, startMonth: number, endYear: number, endMonth: number): Generator<{ year: number; month: number; key: string }> {
    let year = startYear;
    let month = startMonth;
    while (year < endYear || (year === endYear && month <= endMonth)) {
        yield { year, month, key: `${year}-${String(month).padStart(2, '0')}` };
        month += 1;
        if (month > 12) {
            month = 1;
            year += 1;
        }
    }
}

export function getCashFlowForecast(
    db: Database.Database,
    entityId: string,
    horizonDays: ForecastHorizonInput
): CashFlowForecastResult {
    const horizon = clampHorizonDays(horizonDays);
    const today = getLocalTodayCalendarDate();
    const endDate = addCalendarDays(today, horizon);
    const todayParts = parseCalendarDate(today);
    const endParts = parseCalendarDate(endDate);

    // Starting balances: reuse the statement's combined known liquid balance —
    // key present ⇔ entity has a liquid account in that currency; null ⇔ unknown.
    const statement = getActualCashFlowStatement(db, entityId, undefined, today);
    const startingByCurrency = statement.combined_known_balance_cents_by_currency ?? {};

    const keyExists = db.prepare(
        'SELECT 1 FROM transactions WHERE idempotency_key = ? LIMIT 1'
    );
    const schedules = db.prepare(
        'SELECT id, name, amount, type, frequency, category, start_date, end_date, is_active, currency ' +
        'FROM recurring_schedules WHERE is_active = 1 ORDER BY start_date ASC, name ASC'
    ).all() as ScheduleRow[];

    const excludedSchedules: ExcludedSchedule[] = [];
    const excludedBudgetCategories: ExcludedBudgetCategory[] = [];
    const eventsByCurrency = new Map<CurrencyCode, ForecastEvent[]>();
    // Daily deltas drive the chart; events are the display list. Both agree in
    // total: schedule events carry the full monthly amount, budget events the
    // month's prorated accrual sum.
    const dailyDeltaByCurrency = new Map<CurrencyCode, Map<string, number>>();

    const pushEvent = (currency: CurrencyCode, event: ForecastEvent) => {
        const list = eventsByCurrency.get(currency) || [];
        list.push(event);
        eventsByCurrency.set(currency, list);
    };
    const addDailyDelta = (currency: CurrencyCode, date: string, cents: number) => {
        const byDay = dailyDeltaByCurrency.get(currency) || new Map<string, number>();
        byDay.set(date, (byDay.get(date) || 0) + cents);
        dailyDeltaByCurrency.set(currency, byDay);
    };

    // --- Schedules: mirror the autopilot posting model exactly. ---
    // Normalized categories of schedules that will actually project — budgets
    // matching one of these are excluded (schedule wins the double-count).
    const projectedScheduleCategories = new Map<string, CurrencyCode>();

    for (const schedule of schedules) {
        const amountCents = Math.round(toMonthlyAmount(schedule.amount, schedule.frequency) * 100);
        if (!Number.isFinite(amountCents) || amountCents <= 0) {
            excludedSchedules.push({ id: schedule.id, name: schedule.name, currency: schedule.currency, reason: 'invalid_amount' });
            continue;
        }
        const currency = schedule.currency as CurrencyCode;
        if (!(currency in startingByCurrency)) {
            // No liquid account in this currency — the wire has nowhere to land
            // (autopilot's currency-skip rule, entity-scoped).
            excludedSchedules.push({ id: schedule.id, name: schedule.name, currency: schedule.currency, reason: 'no_liquid_accounts' });
            continue;
        }
        const sign = schedule.type === 'income' ? 1 : -1;
        const startParts = parseCalendarDate(schedule.start_date);
        // Future start_date → first projected month is its own start month.
        const firstYear = Math.max(todayParts.year, startParts.year);
        const firstMonth = startParts.year > todayParts.year
            ? startParts.month
            : (startParts.year === todayParts.year ? Math.max(todayParts.month, startParts.month) : todayParts.month);

        for (const { year, month, key } of eachMonth(firstYear, firstMonth, endParts.year, endParts.month)) {
            const monthStart = `${key}-01`;
            // Lexicographic upper bound, exactly like autopilotGenerator.
            const monthEnd = `${key}-31`;
            if (schedule.start_date > monthEnd) continue;
            if (schedule.end_date && schedule.end_date < monthStart) break;
            if (keyExists.get(`recurring:${schedule.id}:${key}`)) continue; // already booked

            const eventDate = monthStart < today ? today : monthStart;
            projectedScheduleCategories.set(normalizeCategory(schedule.category), currency);
            pushEvent(currency, {
                date: eventDate,
                kind: 'schedule',
                label: schedule.name,
                category: schedule.category,
                direction: sign > 0 ? 'inflow' : 'outflow',
                signed_amount_cents: sign * amountCents,
                currency,
                schedule_id: schedule.id,
                formatted_signed_amount: formatMoney({ amount_cents: sign * amountCents, currency })
            });
            addDailyDelta(currency, eventDate, sign * amountCents);
        }
    }

    // --- Budgets: integer-exact daily accrual (never posted, no key check). ---
    for (const budget of listBudgets(db, entityId)) {
        const currency = budget.currency as CurrencyCode;
        if (!(currency in startingByCurrency)) continue;
        if (projectedScheduleCategories.get(normalizeCategory(budget.category)) === currency) {
            excludedBudgetCategories.push({ category: budget.category, currency, reason: 'covered_by_recurring_schedule' });
            continue;
        }

        for (const { year, month, key } of eachMonth(todayParts.year, todayParts.month, endParts.year, endParts.month)) {
            const daysInMonth = getDaysInMonth(year, month);
            const monthStart = `${key}-01`;
            const monthEnd = formatCalendarDate(year, month, daysInMonth);
            const lo = monthStart < today ? today : monthStart;
            const hi = monthEnd > endDate ? endDate : monthEnd;
            if (lo > hi) continue;

            const base = Math.floor(budget.limit_cents / daysInMonth);
            const remainder = budget.limit_cents % daysInMonth;
            let monthSum = 0;
            const loDay = parseCalendarDate(lo).day;
            const hiDay = parseCalendarDate(hi).day;
            for (let day = loDay; day <= hiDay; day++) {
                const daily = base + (day <= remainder ? 1 : 0);
                monthSum += daily;
                addDailyDelta(currency, formatCalendarDate(year, month, day), -daily);
            }
            if (monthSum > 0) {
                pushEvent(currency, {
                    date: lo,
                    kind: 'budget',
                    label: budget.category,
                    category: budget.category,
                    direction: 'outflow',
                    signed_amount_cents: -monthSum,
                    currency,
                    formatted_signed_amount: formatMoney({ amount_cents: -monthSum, currency })
                });
            }
        }
    }

    // --- Assemble per-currency series. ---
    const currencies: CurrencyForecast[] = [];
    for (const currency of Object.keys(startingByCurrency) as CurrencyCode[]) {
        const starting = startingByCurrency[currency];
        const events = (eventsByCurrency.get(currency) || []).sort(
            (a, b) => a.date.localeCompare(b.date) || a.label.localeCompare(b.label)
        );

        if (starting === null || starting === undefined) {
            currencies.push({
                currency,
                starting_balance_cents: null,
                is_unknown: true,
                points: [],
                events,
                end_balance_cents: null,
                net_change_cents: 0,
                min_balance_cents: null,
                min_balance_date: null,
                goes_negative: false,
                formatted_starting_balance: null,
                formatted_end_balance: null,
                formatted_min_balance: null
            });
            continue;
        }

        const deltas = dailyDeltaByCurrency.get(currency);
        const points: ForecastPoint[] = [];
        let running = starting;
        let minCents = running;
        let minDate = today;
        for (let day = 0; day <= horizon; day++) {
            const date = addCalendarDays(today, day);
            running += deltas?.get(date) || 0;
            points.push({ date, balance_cents: running });
            if (running < minCents) {
                minCents = running;
                minDate = date;
            }
        }
        const endBalance = points[points.length - 1].balance_cents;

        currencies.push({
            currency,
            starting_balance_cents: starting,
            is_unknown: false,
            points,
            events,
            end_balance_cents: endBalance,
            net_change_cents: endBalance - starting,
            min_balance_cents: minCents,
            min_balance_date: minDate,
            goes_negative: minCents < 0,
            formatted_starting_balance: formatMoney({ amount_cents: starting, currency }),
            formatted_end_balance: formatMoney({ amount_cents: endBalance, currency }),
            formatted_min_balance: formatMoney({ amount_cents: minCents, currency })
        });
    }
    currencies.sort((a, b) => a.currency.localeCompare(b.currency));

    return {
        entity_id: entityId,
        start_date: today,
        end_date: endDate,
        horizon_days: horizon,
        currencies,
        excluded_schedules: excludedSchedules,
        excluded_budget_categories: excludedBudgetCategories,
        calculation_version: CALCULATION_ENGINE_VERSION
    };
}
