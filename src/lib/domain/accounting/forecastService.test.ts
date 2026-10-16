/**
 * Why this file exists:
 * Covers the cash-flow forecast domain service. The forecast's whole value is
 * that it predicts what the ledger WILL book without double-counting what it
 * already booked — so the tests pin the mirror-autopilot model: monthly-
 * normalized schedule amounts, the idempotency-key skip for already-generated
 * months, integer-exact budget daily accrual, and the budget×schedule overlap
 * exclusion.
 *
 * Tricky logic exercised here:
 * - `recurring_schedules.amount` is REAL major units → cents after normalization.
 * - The horizon is anchored at the REAL today (getLocalTodayCalendarDate), so
 *   fixtures use dates relative to `new Date()` — every assertion is
 *   execution-date independent.
 * - Invariant: per currency, net_change_cents equals the sum of event signed
 *   amounts (points and events must agree).
 *
 * All operations execute strictly in-memory; zero live storage modifications.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import Database from 'better-sqlite3';
import { runMigrations } from '@/infrastructure/sqlite/migrations';
import { createEntity, createAccount } from './accountService';
import { ensureExpenseAccount, recordExpense } from './transactionService';
import { upsertBudget } from './budgetService';
import { getCashFlowForecast, clampHorizonDays } from './forecastService';
import { CALCULATION_ENGINE_VERSION } from './balanceService';
import { getLocalTodayCalendarDate, getDaysInMonth, formatCalendarDate } from '../calendarDate';

function addDays(date: string, days: number): string {
    const [y, m, d] = date.split('-').map(Number);
    const shifted = new Date(Date.UTC(y, m - 1, d) + days * 86_400_000);
    return formatCalendarDate(shifted.getUTCFullYear(), shifted.getUTCMonth() + 1, shifted.getUTCDate());
}

function monthKey(date: string): string {
    return date.slice(0, 7);
}

function todayParts(date: string): { y: number; m: number; d: number } {
    const [y, m, d] = date.split('-').map(Number);
    return { y, m, d };
}

interface ScheduleFixture {
    id: string;
    name?: string;
    amount: number;
    type: 'income' | 'expense';
    frequency: string;
    category?: string;
    start_date: string;
    end_date?: string | null;
    is_active?: number;
    currency?: string;
}

function insertSchedule(db: Database.Database, s: ScheduleFixture): void {
    db.prepare(`
        INSERT INTO recurring_schedules
            (id, user_id, name, amount, type, frequency, category, start_date, end_date, is_active, currency, created_at)
        VALUES (?, 'local_user', ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
    `).run(
        s.id, s.name ?? s.id, s.amount, s.type, s.frequency,
        s.category ?? 'general', s.start_date, s.end_date ?? null,
        s.is_active ?? 1, s.currency ?? 'USD'
    );
}

describe('forecastService', () => {
    let db: Database.Database;
    let entityId: string;
    let checkingId: string;
    const today = getLocalTodayCalendarDate();

    beforeEach(() => {
        db = new Database(':memory:');
        db.pragma('foreign_keys = ON');
        runMigrations(db);
        const entity = createEntity(db, { name: 'Forecast Tester', type: 'person', currency: 'USD' });
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

    function forecast(horizonDays: number) {
        return getCashFlowForecast(db, entityId, horizonDays);
    }

    function usd(report: ReturnType<typeof forecast>) {
        return report.currencies.find(c => c.currency === 'USD')!;
    }

    describe('clampHorizonDays', () => {
        it('defaults to 90 for absent or garbage input and clamps to [30, 180]', () => {
            expect(clampHorizonDays(null)).toBe(90);
            expect(clampHorizonDays(undefined)).toBe(90);
            expect(clampHorizonDays('')).toBe(90);
            expect(clampHorizonDays('nonsense')).toBe(90);
            expect(clampHorizonDays(NaN)).toBe(90);
            expect(clampHorizonDays(10)).toBe(30);
            expect(clampHorizonDays(999)).toBe(180);
            expect(clampHorizonDays('45')).toBe(45);
        });
    });

    describe('schedule normalization (mirrors the autopilot factor table)', () => {
        it('converts per-occurrence major-unit amounts to monthly cents per frequency', () => {
            const cases: Array<[string, number, number]> = [
                ['weekly', 100, 43300],
                ['biweekly', 100, 21700],
                ['monthly', 100, 10000],
                ['quarterly', 300, 10000],
                ['yearly', 1200, 10000],
                ['fortnightly', 100, 10000] // unknown frequency → ×1
            ];
            for (const [frequency, amount, expectedCents] of cases) {
                insertSchedule(db, {
                    id: `sch-${frequency}`, amount, type: 'expense',
                    frequency, start_date: today
                });
            }
            const report = forecast(30);
            for (const [frequency, , expectedCents] of cases) {
                const event = usd(report).events.find(e => e.schedule_id === `sch-${frequency}`
                    && monthKey(e.date) === monthKey(today))!;
                expect(event.signed_amount_cents).toBe(-expectedCents);
                expect(event.direction).toBe('outflow');
                expect(event.kind).toBe('schedule');
            }
        });
    });

    describe('idempotency skip (the anti-double-count core)', () => {
        it('skips a month whose recurring posting is already in the ledger', () => {
            insertSchedule(db, { id: 'sch-rent', amount: 500, type: 'expense', frequency: 'monthly', start_date: today });
            // Autopilot already generated this month's wire — it is in the balance.
            const expenseAcc = ensureExpenseAccount(db, entityId, 'living_expense', 'USD');
            recordExpense(db, {
                entity_id: entityId,
                payment_account_id: checkingId,
                expense_account_id: expenseAcc.id,
                amount_cents: 50000,
                date: today,
                description: 'Rent',
                origin: 'recurring',
                idempotency_key: `recurring:sch-rent:${monthKey(today)}`
            });

            const report = forecast(30);
            const usdForecast = usd(report);
            // Starting balance already reflects the wire…
            expect(usdForecast.starting_balance_cents).toBe(950000);
            // …so the current month must NOT be projected again.
            const currentMonthEvents = usdForecast.events
                .filter(e => e.schedule_id === 'sch-rent' && monthKey(e.date) === monthKey(today));
            expect(currentMonthEvents).toHaveLength(0);
        });
    });

    describe('budget daily accrual', () => {
        it('accrues exactly limit_cents for a full month and prorates the partial current month', () => {
            upsertBudget(db, { entity_id: entityId, category: 'groceries', currency: 'USD', limit_cents: 3100 });
            const report = forecast(90);
            const budgetEvents = usd(report).events.filter(e => e.kind === 'budget');
            expect(budgetEvents.length).toBeGreaterThanOrEqual(2);

            // The month fully inside the horizon sums to exactly the limit.
            const fullyInside = budgetEvents.find(e => monthKey(e.date) !== monthKey(today))!;
            expect(fullyInside.signed_amount_cents).toBe(-3100);

            // Current month: exact sum of the daily split from today to month end.
            const { y, m, d: todayDay } = todayParts(today);
            const dim = getDaysInMonth(y, m);
            const base = Math.floor(3100 / dim);
            const rem = 3100 % dim;
            let expectedCurrent = 0;
            for (let d = todayDay; d <= dim; d++) expectedCurrent += base + (d <= rem ? 1 : 0);
            const current = budgetEvents.find(e => monthKey(e.date) === monthKey(today))!;
            expect(current.signed_amount_cents).toBe(-expectedCurrent);
        });

        it('keeps points and events consistent: net change equals the sum of event amounts', () => {
            insertSchedule(db, { id: 'sch-a', amount: 200, type: 'expense', frequency: 'monthly', start_date: today });
            upsertBudget(db, { entity_id: entityId, category: 'utilities', currency: 'USD', limit_cents: 15000 });
            const usdForecast = usd(forecast(60));
            const eventSum = usdForecast.events.reduce((sum, e) => sum + e.signed_amount_cents, 0);
            expect(usdForecast.net_change_cents).toBe(eventSum);
        });
    });

    describe('budget × schedule overlap', () => {
        it('excludes a budget whose normalized category matches a projected schedule', () => {
            insertSchedule(db, { id: 'sch-rent', amount: 1500, type: 'expense', frequency: 'monthly', category: 'Rent', start_date: today });
            upsertBudget(db, { entity_id: entityId, category: 'rent', currency: 'USD', limit_cents: 150000 });
            insertSchedule(db, { id: 'sch-housing', amount: 900, type: 'expense', frequency: 'monthly', category: 'Housing Costs', start_date: today });
            upsertBudget(db, { entity_id: entityId, category: 'housing_costs', currency: 'USD', limit_cents: 90000 });

            const report = forecast(30);
            expect(report.excluded_budget_categories).toEqual([
                expect.objectContaining({ category: 'housing_costs', currency: 'USD', reason: 'covered_by_recurring_schedule' }),
                expect.objectContaining({ category: 'rent', currency: 'USD', reason: 'covered_by_recurring_schedule' })
            ]);
            // Deducted once: only schedule events, no budget events.
            expect(usd(report).events.every(e => e.kind === 'schedule')).toBe(true);
        });
    });

    describe('starting balance and series assembly', () => {
        it('starts from the statement balance including real postings', () => {
            const expenseAcc = ensureExpenseAccount(db, entityId, 'groceries', 'USD');
            recordExpense(db, {
                entity_id: entityId, payment_account_id: checkingId, expense_account_id: expenseAcc.id,
                amount_cents: 20000, date: addDays(today, -1), description: 'Before the horizon'
            });
            const usdForecast = usd(forecast(30));
            expect(usdForecast.starting_balance_cents).toBe(980000);
            expect(usdForecast.points[0].balance_cents).toBe(980000);
        });

        it('flags a negative projection with the crossing date', () => {
            // A separate entity with a thin opening balance — createAccount
            // anchors balances via an opening transaction, so mutating the
            // column after the fact would not move the ledger balance.
            const poor = createEntity(db, { name: 'Paycheck to Paycheck', type: 'person', currency: 'USD' });
            createAccount(db, {
                entity_id: poor.id, name: 'Thin Checking', type: 'asset', sub_type: 'checking',
                currency: 'USD', opening_balance_cents: 10000, opening_date: '2026-01-01'
            });
            insertSchedule(db, { id: 'sch-big', amount: 500, type: 'expense', frequency: 'monthly', start_date: today });

            const report = getCashFlowForecast(db, poor.id, 30);
            const usdForecast = usd(report);
            expect(usdForecast.starting_balance_cents).toBe(10000);
            expect(usdForecast.goes_negative).toBe(true);
            // The trough sits at the last projected wire inside the horizon —
            // how many monthly events fit depends on the run date, so derive
            // the expectation from the events themselves.
            const wireEvents = usdForecast.events.filter(e => e.schedule_id === 'sch-big');
            expect(wireEvents.length).toBeGreaterThanOrEqual(1);
            expect(usdForecast.min_balance_cents)
                .toBe(10000 + wireEvents.reduce((sum, e) => sum + e.signed_amount_cents, 0));
            expect(usdForecast.min_balance_date).toBe(wireEvents[wireEvents.length - 1].date);
        });

        it('keeps currencies strictly separate', () => {
            createAccount(db, {
                entity_id: entityId, name: 'AUD Checking', type: 'asset', sub_type: 'savings',
                currency: 'AUD', opening_balance_cents: 500000, opening_date: '2026-01-01'
            });
            insertSchedule(db, { id: 'sch-usd', amount: 100, type: 'expense', frequency: 'monthly', start_date: today });
            insertSchedule(db, { id: 'sch-aud', amount: 200, type: 'expense', frequency: 'monthly', currency: 'AUD', start_date: today });

            const report = forecast(30);
            expect(report.currencies.map(c => c.currency)).toEqual(['AUD', 'USD']);
            const aud = report.currencies.find(c => c.currency === 'AUD')!;
            expect(aud.starting_balance_cents).toBe(500000);
            const audEvent = aud.events.find(e => e.schedule_id === 'sch-aud')!;
            expect(audEvent.signed_amount_cents).toBe(-20000);
            // The USD schedule never touches the AUD series.
            expect(aud.events.some(e => e.schedule_id === 'sch-usd')).toBe(false);
        });

        it('reports unknown balances honestly instead of fabricating zero', () => {
            const other = createEntity(db, { name: 'Unknown Owner', type: 'person', currency: 'EUR' });
            createAccount(db, {
                entity_id: other.id, name: 'EUR Wallet', type: 'asset', sub_type: 'cash',
                currency: 'EUR', opening_balance_cents: null, opening_date: '2026-01-01'
            });
            insertSchedule(db, { id: 'sch-eur', amount: 50, type: 'expense', frequency: 'monthly', currency: 'EUR', start_date: today });

            const report = getCashFlowForecast(db, other.id, 30);
            const eur = report.currencies.find(c => c.currency === 'EUR')!;
            expect(eur.is_unknown).toBe(true);
            expect(eur.starting_balance_cents).toBeNull();
            expect(eur.points).toHaveLength(0);
            expect(eur.end_balance_cents).toBeNull();
            // Events are still informative even when the balance is unknown.
            expect(eur.events.filter(e => e.schedule_id === 'sch-eur').length).toBeGreaterThan(0);
        });

        it('excludes schedules in currencies with no liquid account for the entity', () => {
            insertSchedule(db, { id: 'sch-jpy', amount: 100, type: 'expense', frequency: 'monthly', currency: 'JPY', start_date: today });
            const report = forecast(30);
            expect(report.excluded_schedules).toEqual([
                { id: 'sch-jpy', name: 'sch-jpy', currency: 'JPY', reason: 'no_liquid_accounts' }
            ]);
        });
    });

    describe('schedule window rules (mirrors autopilot skip rules)', () => {
        it('respects end_date inside the horizon', () => {
            const [y, m] = [Number(today.slice(0, 4)), Number(today.slice(5, 7))];
            const nextMonthKey = m === 12 ? `${y + 1}-01` : `${y}-${String(m + 1).padStart(2, '0')}`;
            insertSchedule(db, {
                id: 'sch-ends', amount: 100, type: 'expense', frequency: 'monthly',
                start_date: today, end_date: `${nextMonthKey}-15`
            });
            const events = usd(forecast(180)).events.filter(e => e.schedule_id === 'sch-ends');
            // Current month + next month (end_date >= next month start), nothing after.
            expect(events.map(e => monthKey(e.date)).sort())
                .toEqual([monthKey(today), nextMonthKey].sort());
        });

        it('ignores inactive schedules', () => {
            insertSchedule(db, { id: 'sch-off', amount: 100, type: 'expense', frequency: 'monthly', start_date: today, is_active: 0 });
            const report = forecast(30);
            expect(usd(report).events.filter(e => e.schedule_id === 'sch-off')).toHaveLength(0);
            expect(report.excluded_schedules).toHaveLength(0);
        });

        it('starts a future-dated schedule at its own start month, dated the 1st', () => {
            const [y, m] = [Number(today.slice(0, 4)), Number(today.slice(5, 7))];
            const nextMonthKey = m === 12 ? `${y + 1}-01` : `${y}-${String(m + 1).padStart(2, '0')}`;
            insertSchedule(db, { id: 'sch-future', amount: 100, type: 'expense', frequency: 'monthly', start_date: `${nextMonthKey}-01` });
            const events = usd(forecast(90)).events.filter(e => e.schedule_id === 'sch-future');
            expect(events.every(e => monthKey(e.date) !== monthKey(today))).toBe(true);
            expect(events.some(e => e.date === `${nextMonthKey}-01`)).toBe(true);
        });

        it('projects income as positive and lifts the balance', () => {
            insertSchedule(db, { id: 'sch-salary', amount: 2000, type: 'income', frequency: 'monthly', start_date: today });
            const usdForecast = usd(forecast(30));
            const salaryEvents = usdForecast.events.filter(e => e.schedule_id === 'sch-salary');
            expect(salaryEvents.length).toBeGreaterThanOrEqual(1);
            expect(salaryEvents.every(e => e.direction === 'inflow' && e.signed_amount_cents === 200000)).toBe(true);
            // Net change equals every projected paycheck (a 30-day horizon can
            // span two calendar months — one monthly event each).
            expect(usdForecast.net_change_cents)
                .toBe(salaryEvents.reduce((sum, e) => sum + e.signed_amount_cents, 0));
        });

        it('touches exactly the calendar months inside the horizon (year boundary included)', () => {
            insertSchedule(db, { id: 'sch-all', amount: 10, type: 'expense', frequency: 'monthly', start_date: today });
            const report = forecast(180);
            const expectedMonths = new Set<string>();
            for (let d = 0; d <= 180; d++) expectedMonths.add(monthKey(addDays(today, d)));
            const actualMonths = new Set(
                usd(report).events.filter(e => e.schedule_id === 'sch-all').map(e => monthKey(e.date))
            );
            expect(actualMonths).toEqual(expectedMonths);
        });
    });

    describe('empty vault', () => {
        it('produces a flat line with zero net change', () => {
            const usdForecast = usd(forecast(30));
            expect(usdForecast.net_change_cents).toBe(0);
            expect(usdForecast.points.every(p => p.balance_cents === 1000000)).toBe(true);
            expect(usdForecast.min_balance_cents).toBe(1000000);
            expect(usdForecast.min_balance_date).toBe(today);
        });
    });

    it('stamps the shared calculation engine version', () => {
        const report = forecast(30);
        expect(report.calculation_version).toBe(CALCULATION_ENGINE_VERSION);
        expect(report.entity_id).toBe(entityId);
        expect(report.start_date).toBe(today);
        expect(report.end_date).toBe(addDays(today, 30));
        expect(report.horizon_days).toBe(30);
    });
});
