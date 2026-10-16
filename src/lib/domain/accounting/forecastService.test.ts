/**
 * Why this file exists:
 * Covers the cash-flow forecast domain service. The forecast's whole value is
 * that it predicts what the ledger WILL book without double-counting what it
 * already booked — so the tests pin the mirror-autopilot model: monthly-
 * normalized schedule amounts, the idempotency-key skip for already-generated
 * months, integer-exact budget daily accrual, the budget×schedule overlap
 * exclusion, and the debt-payment model (month-start timing, posted-debit
 * skip, estimate flagging, schedule-wins suppression).
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
import { ensureExpenseAccount, recordExpense, recordCreditCardRepayment } from './transactionService';
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

    function makeLiability(opts: {
        name: string;
        sub_type?: string;
        currency?: string;
        opening_balance_cents?: number | null;
        minimum_payment_cents?: number | null;
        interest_rate?: number | null;
        tracking_mode?: 'balance' | 'transactions';
    }) {
        return createAccount(db, {
            entity_id: entityId,
            name: opts.name,
            type: 'liability',
            sub_type: (opts.sub_type ?? 'credit_card') as any,
            currency: (opts.currency ?? 'USD') as any,
            opening_balance_cents: opts.opening_balance_cents === undefined ? 100000 : opts.opening_balance_cents,
            opening_date: '2026-01-01',
            minimum_payment_cents: opts.minimum_payment_cents ?? null,
            interest_rate: opts.interest_rate ?? null,
            tracking_mode: opts.tracking_mode
        }).account;
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

    describe('debt minimum payments', () => {
        it('projects explicit minimum_payment_cents once per calendar month', () => {
            makeLiability({ name: 'Visa Card', minimum_payment_cents: 3500 });
            const usdForecast = usd(forecast(30));
            const debtEvents = usdForecast.events.filter(e => e.kind === 'debt_payment');
            expect(debtEvents.length).toBeGreaterThanOrEqual(1);
            expect(debtEvents.every(e =>
                e.signed_amount_cents === -3500 && e.direction === 'outflow' && !e.estimated
            )).toBe(true);
            // Exactly the calendar months the horizon touches.
            const expectedMonths = new Set<string>();
            for (let d = 0; d <= 30; d++) expectedMonths.add(monthKey(addDays(today, d)));
            expect(new Set(debtEvents.map(e => monthKey(e.date)))).toEqual(expectedMonths);
            // Current month clamps to today; later months land on the 1st.
            const current = debtEvents.find(e => monthKey(e.date) === monthKey(today))!;
            expect(current.date).toBe(today);
            expect(current.label).toBe('Visa Card');
            expect(current.category).toBe('credit_card');
        });

        it('skips a month whose repayment is already posted to the liability', () => {
            const card = makeLiability({ name: 'Visa Card', minimum_payment_cents: 3500 });
            recordCreditCardRepayment(db, {
                bank_account_id: checkingId, card_account_id: card.id,
                amount_cents: 3500, date: today, description: 'Card payment'
            });
            const usdForecast = usd(forecast(30));
            // The repayment already left the cash…
            expect(usdForecast.starting_balance_cents).toBe(996500);
            // …so this month must not be projected again; later months still are.
            const debtEvents = usdForecast.events.filter(e => e.kind === 'debt_payment');
            expect(debtEvents.some(e => monthKey(e.date) === monthKey(today))).toBe(false);
            const expectedMonths = new Set<string>();
            for (let d = 0; d <= 30; d++) expectedMonths.add(monthKey(addDays(today, d)));
            expectedMonths.delete(monthKey(today));
            expect(new Set(debtEvents.map(e => monthKey(e.date)))).toEqual(expectedMonths);
        });

        it('estimates the minimum payment when terms are absent and flags it', () => {
            makeLiability({ name: 'Store Card' }); // $1,000 owed, no terms
            const debtEvents = usd(forecast(30)).events.filter(e => e.kind === 'debt_payment');
            expect(debtEvents.length).toBeGreaterThanOrEqual(1);
            // debtCalculator heuristic: max($25, 1% of $1,000 + $0 interest) = $25.
            expect(debtEvents.every(e => e.signed_amount_cents === -2500 && e.estimated === true)).toBe(true);
        });

        it('suppresses debt payments when a Debt Repayment schedule projects', () => {
            makeLiability({ name: 'Visa Card', minimum_payment_cents: 3500 });
            insertSchedule(db, {
                id: 'accel', name: 'Debt Freedom Accelerator', amount: 200, type: 'expense',
                frequency: 'monthly', category: 'Debt Repayment', start_date: today
            });
            const report = forecast(30);
            // Counted once: only the schedule's concrete wire.
            expect(usd(report).events.every(e => e.kind === 'schedule')).toBe(true);
            expect(report.excluded_debt_accounts).toEqual([
                { id: expect.any(String), name: 'Visa Card', currency: 'USD', reason: 'covered_by_recurring_schedule' }
            ]);
        });

        it('excludes a debt whose currency has no liquid account for the entity', () => {
            makeLiability({ name: 'JPY Loan', sub_type: 'personal_loan', currency: 'JPY', minimum_payment_cents: 3500 });
            const report = forecast(30);
            expect(usd(report).events.filter(e => e.kind === 'debt_payment')).toHaveLength(0);
            expect(report.excluded_debt_accounts).toEqual([
                { id: expect.any(String), name: 'JPY Loan', currency: 'JPY', reason: 'no_liquid_accounts' }
            ]);
        });

        it('discloses balance_unknown when a debt has no terms and no resolvable balance', () => {
            makeLiability({ name: 'Mystery Card', opening_balance_cents: null, tracking_mode: 'balance' });
            const report = forecast(30);
            expect(usd(report).events.filter(e => e.kind === 'debt_payment')).toHaveLength(0);
            expect(report.excluded_debt_accounts).toEqual([
                { id: expect.any(String), name: 'Mystery Card', currency: 'USD', reason: 'balance_unknown' }
            ]);
        });

        it('ignores inactive liabilities', () => {
            const card = makeLiability({ name: 'Closed Card', minimum_payment_cents: 3500 });
            db.prepare('UPDATE accounts SET is_active = 0 WHERE id = ?').run(card.id);
            const report = forecast(30);
            expect(usd(report).events.filter(e => e.kind === 'debt_payment')).toHaveLength(0);
            expect(report.excluded_debt_accounts).toHaveLength(0);
        });

        it('keeps points and events consistent with debt payments present', () => {
            makeLiability({ name: 'Visa Card', minimum_payment_cents: 3500 });
            insertSchedule(db, { id: 'sch-a', amount: 200, type: 'expense', frequency: 'monthly', start_date: today });
            upsertBudget(db, { entity_id: entityId, category: 'utilities', currency: 'USD', limit_cents: 15000 });
            const usdForecast = usd(forecast(60));
            expect(usdForecast.events.some(e => e.kind === 'debt_payment')).toBe(true);
            const eventSum = usdForecast.events.reduce((sum, e) => sum + e.signed_amount_cents, 0);
            expect(usdForecast.net_change_cents).toBe(eventSum);
        });
    });

    describe('debt balance projection', () => {
        // Projection-only amortization: interest at annual percent ÷ 12 then
        // the payment, integer cents. Same gates as the events — these tests
        // cross-check that the two series agree.
        function touchedMonthKeys(horizon: number): string[] {
            const keys = new Set<string>();
            for (let d = 0; d <= horizon; d++) keys.add(monthKey(addDays(today, d)));
            return [...keys].sort();
        }

        it('amortizes linearly with no rate and reports payoff within horizon', () => {
            makeLiability({ name: 'Visa Card', minimum_payment_cents: 35000 });
            const report = forecast(180);
            const proj = report.debt_projections;
            expect(proj).toHaveLength(1);
            const card = proj[0];
            expect(card.account_id).toBeTruthy();
            expect(card.starting_balance_cents).toBe(100000);
            expect(card.interest_rate).toBeNull();
            expect(card.monthly_payment_cents).toBe(35000);
            expect(card.estimated_payment).toBe(false);
            expect(card.non_amortising).toBe(false);
            // $1,000 at $350/month → paid off in the third projected month.
            expect(card.months.map(m => m.balance_cents)).toEqual([65000, 30000, 0]);
            expect(card.months.every(m => m.interest_cents === 0)).toBe(true);
            // Final month's applied payment is capped at the remaining balance.
            expect(card.months.map(m => m.payment_cents)).toEqual([35000, 35000, 30000]);
            expect(card.paid_off_within_horizon).toBe(true);
            // Third touched month is never the current one → lands on the 1st.
            expect(card.payoff_date).toBe(`${touchedMonthKeys(180)[2]}-01`);
            expect(card.balance_at_horizon_end_cents).toBe(0);
            // The months series stops at payoff; events keep the contractual amount.
            expect(card.months).toHaveLength(3);
            const debtEvents = usd(report).events.filter(e => e.kind === 'debt_payment');
            expect(debtEvents.every(e => e.signed_amount_cents === -35000)).toBe(true);
        });

        it('accrues one month of interest at the stored annual percent', () => {
            makeLiability({ name: 'Rate Card', minimum_payment_cents: 3500, interest_rate: 12 });
            const card = forecast(30).debt_projections[0];
            // 100000 × 12 ÷ 1200 = 1000 cents; accrue-then-pay.
            expect(card.months[0].interest_cents).toBe(1000);
            expect(card.months[0].balance_cents).toBe(97500);
            // Rounding: 1000 × 7 ÷ 1200 = 5.83 → 6.
            makeLiability({ name: 'Round Card', minimum_payment_cents: 10, interest_rate: 7, opening_balance_cents: 1000 });
            const round = forecast(30).debt_projections.find(p => p.name === 'Round Card')!;
            expect(round.months[0].interest_cents).toBe(6);
            expect(round.months[0].balance_cents).toBe(996);
        });

        it('keeps interest at zero when no rate is set', () => {
            makeLiability({ name: 'Flat Card', minimum_payment_cents: 3500 });
            const card = forecast(90).debt_projections[0];
            expect(card.months.length).toBeGreaterThanOrEqual(1);
            expect(card.months.every(m => m.interest_cents === 0)).toBe(true);
        });

        it('flags non-amortising debts and lets the balance grow', () => {
            makeLiability({ name: 'Spiral Card', minimum_payment_cents: 1000, interest_rate: 24 });
            const card = forecast(90).debt_projections[0];
            expect(card.non_amortising).toBe(true);
            expect(card.paid_off_within_horizon).toBe(false);
            expect(card.payoff_date).toBeNull();
            const balances = card.months.map(m => m.balance_cents);
            expect(balances[0]).toBe(101000); // +2000 interest − 1000 payment
            for (let i = 1; i < balances.length; i++) expect(balances[i]).toBeGreaterThan(balances[i - 1]);
        });

        it('treats a payment equal to monthly interest as non-amortising', () => {
            makeLiability({ name: 'Flatline Card', minimum_payment_cents: 1200, interest_rate: 12, opening_balance_cents: 120000 });
            const card = forecast(30).debt_projections[0];
            expect(card.non_amortising).toBe(true);
            expect(card.months.length).toBeGreaterThanOrEqual(1);
            expect(card.months.every(m => m.balance_cents === 120000)).toBe(true);
        });

        it('caps the final payment at balance+interest while events keep the contractual amount', () => {
            makeLiability({ name: 'Almost Paid Card', minimum_payment_cents: 3500, opening_balance_cents: 3000 });
            const report = forecast(30);
            const card = report.debt_projections[0];
            expect(card.months[0].payment_cents).toBe(3000);
            expect(card.months[0].balance_cents).toBe(0);
            expect(card.months).toHaveLength(1);
            expect(card.paid_off_within_horizon).toBe(true);
            expect(card.payoff_date).toBe(today); // current month clamps to today
            const debtEvents = usd(report).events.filter(e => e.kind === 'debt_payment');
            expect(debtEvents.every(e => e.signed_amount_cents === -3500)).toBe(true);
        });

        it('skips an already-paid month in both the months series and the events', () => {
            const card = makeLiability({ name: 'Visa Card', minimum_payment_cents: 3500 });
            recordCreditCardRepayment(db, {
                bank_account_id: checkingId, card_account_id: card.id,
                amount_cents: 3500, date: today, description: 'Card payment'
            });
            const report = forecast(30);
            const proj = report.debt_projections[0];
            // The posted debit is already in the starting liability balance.
            expect(proj.starting_balance_cents).toBe(96500);
            expect(proj.months.map(m => m.month)).toEqual(touchedMonthKeys(30).slice(1));
            expect(
                usd(report).events.filter(e => e.kind === 'debt_payment')
                    .some(e => monthKey(e.date) === monthKey(today))
            ).toBe(false);
        });

        it('omits debts with nothing owed', () => {
            makeLiability({ name: 'Paid Off Card', opening_balance_cents: 0, minimum_payment_cents: 3500 });
            makeLiability({ name: 'Overpaid Card', opening_balance_cents: -500, minimum_payment_cents: 3500 });
            expect(forecast(30).debt_projections).toHaveLength(0);
        });

        it('omits excluded debts but keeps them in excluded_debt_accounts', () => {
            makeLiability({ name: 'JPY Loan', sub_type: 'personal_loan', currency: 'JPY', minimum_payment_cents: 3500 });
            makeLiability({ name: 'Covered Card', minimum_payment_cents: 3500 });
            // sub_type-matching coverage ('Credit Card' → credit_card) so the
            // personal_loan Mystery Card falls through to the balance_unknown gate.
            insertSchedule(db, {
                id: 'accel', name: 'Debt Freedom Accelerator', amount: 200, type: 'expense',
                frequency: 'monthly', category: 'Credit Card', start_date: today
            });
            makeLiability({ name: 'Mystery Loan', sub_type: 'personal_loan', opening_balance_cents: null, tracking_mode: 'balance' });
            const report = forecast(30);
            expect(report.debt_projections).toHaveLength(0);
            expect(report.excluded_debt_accounts.map(e => e.reason).sort()).toEqual([
                'balance_unknown', 'covered_by_recurring_schedule', 'no_liquid_accounts'
            ]);
        });

        it('includes an unknown-balance debt with explicit terms as an is_unknown row', () => {
            makeLiability({ name: 'Tracked Card', opening_balance_cents: null, tracking_mode: 'balance', minimum_payment_cents: 3500 });
            const report = forecast(30);
            const card = report.debt_projections[0];
            expect(card.is_unknown).toBe(true);
            expect(card.starting_balance_cents).toBeNull();
            expect(card.months).toEqual([]);
            expect(card.balance_at_horizon_end_cents).toBeNull();
            expect(card.payoff_date).toBeNull();
            expect(card.formatted_starting_balance).toBeNull();
            expect(card.monthly_payment_cents).toBe(3500);
            // Its payment events still project.
            expect(usd(report).events.some(e => e.kind === 'debt_payment')).toBe(true);
        });

        it('adds nothing to the cash-flow series (invariant guard)', () => {
            makeLiability({ name: 'Visa Card', minimum_payment_cents: 3500, interest_rate: 18 });
            insertSchedule(db, { id: 'sch-a', amount: 200, type: 'expense', frequency: 'monthly', start_date: today });
            upsertBudget(db, { entity_id: entityId, category: 'utilities', currency: 'USD', limit_cents: 15000 });
            const usdForecast = usd(forecast(60));
            const eventSum = usdForecast.events.reduce((sum, e) => sum + e.signed_amount_cents, 0);
            expect(usdForecast.net_change_cents).toBe(eventSum);
            expect(usdForecast.points).toHaveLength(61);
        });

        it('reports not paid off within horizon and the end balance', () => {
            makeLiability({ name: 'Visa Card', minimum_payment_cents: 3500 });
            const card = forecast(30).debt_projections[0];
            expect(card.paid_off_within_horizon).toBe(false);
            expect(card.payoff_date).toBeNull();
            const paid = card.months.reduce((sum, m) => sum + m.payment_cents, 0);
            expect(card.balance_at_horizon_end_cents).toBe(100000 - paid);
            expect(card.balance_at_horizon_end_cents!).toBeGreaterThan(0);
        });

        it('sorts projections by currency then name', () => {
            createAccount(db, {
                entity_id: entityId, name: 'EUR Checking', type: 'asset', sub_type: 'checking',
                currency: 'EUR', opening_balance_cents: 50000, opening_date: '2026-01-01'
            });
            makeLiability({ name: 'Zed EUR Card', currency: 'EUR', minimum_payment_cents: 3500 });
            makeLiability({ name: 'Alpha Card', minimum_payment_cents: 3500 });
            const rows = forecast(30).debt_projections.map(p => [p.currency, p.name]);
            expect(rows).toEqual([['EUR', 'Zed EUR Card'], ['USD', 'Alpha Card']]);
        });

        it('returns an empty projections array for a vault without liabilities', () => {
            expect(forecast(30).debt_projections).toEqual([]);
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
