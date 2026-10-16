/**
 * Why this file exists:
 * Covers the budgets-vs-actuals domain service: CRUD over the `budgets` table
 * and the comparison report the Cashflow page renders. Actuals come from REAL
 * double-entry postings (recordExpense), not hand-inserted journal rows, so
 * the (sub_type, currency) re-aggregation is exercised end-to-end.
 *
 * Tricky logic:
 * - Proration is exact per-calendar-month overlap: Jan 1–Jun 30 = 6.0 months,
 *   Jan 15–Feb 14 = 17/31 + 14/28 = 1.048.
 * - Status thresholds: >100% over, 90–100% at_risk (100% inclusive), <90% under.
 * - Money never crosses currencies: an AUD spend and a USD budget for the same
 *   category produce two separate rows.
 * - Several expense accounts can share one sub_type — actuals must aggregate
 *   them into a single category row.
 *
 * All operations execute strictly in-memory; zero live storage modifications.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import Database from 'better-sqlite3';
import { runMigrations } from '@/infrastructure/sqlite/migrations';
import { createEntity, createAccount, ValidationError } from './accountService';
import { ensureExpenseAccount, recordExpense } from './transactionService';
import {
    listBudgets,
    upsertBudget,
    deleteBudget,
    periodMonths,
    getBudgetVsActual
} from './budgetService';

describe('budgetService', () => {
    let db: Database.Database;
    let entityId: string;
    let checkingId: string;

    beforeEach(() => {
        db = new Database(':memory:');
        db.pragma('foreign_keys = ON');
        runMigrations(db);
        const entity = createEntity(db, { name: 'Budget Tester', type: 'person', currency: 'USD' });
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

    /**
     * Posts a real expense against the USD checking account. Without an
     * explicit expense account, recordExpense auto-provisions one from the
     * category (sub_type) — exactly the Autopilot/ledger path budgets join on.
     */
    function spend(category: string, amountCents: number, date: string, expenseAccountId?: string): void {
        recordExpense(db, {
            entity_id: entityId,
            payment_account_id: checkingId,
            expense_account_id: expenseAccountId,
            category: expenseAccountId ? undefined : (category as any),
            amount_cents: amountCents,
            date,
            description: `${category} spend`
        });
    }

    describe('CRUD', () => {
        it('upserts a budget, normalizing category and currency', () => {
            const budget = upsertBudget(db, {
                entity_id: entityId,
                category: '  groceries  ',
                currency: 'aud',
                limit_cents: 40000
            });
            expect(budget.id).toBeTruthy();
            expect(budget.user_id).toBe('local_user');
            expect(budget.category).toBe('groceries');
            expect(budget.currency).toBe('AUD');
            expect(budget.limit_cents).toBe(40000);
        });

        it('re-upserting the same (entity, category, currency) updates the limit in place', () => {
            const first = upsertBudget(db, { entity_id: entityId, category: 'groceries', currency: 'USD', limit_cents: 40000 });
            const second = upsertBudget(db, { entity_id: entityId, category: 'groceries', currency: 'USD', limit_cents: 45000 });
            expect(second.id).toBe(first.id);
            expect(second.limit_cents).toBe(45000);
            expect(listBudgets(db, entityId).length).toBe(1);
        });

        it('lists budgets for the entity only, sorted by category then currency', () => {
            upsertBudget(db, { entity_id: entityId, category: 'utilities', currency: 'USD', limit_cents: 18000 });
            upsertBudget(db, { entity_id: entityId, category: 'groceries', currency: 'USD', limit_cents: 40000 });
            upsertBudget(db, { entity_id: entityId, category: 'groceries', currency: 'AUD', limit_cents: 60000 });
            const other = createEntity(db, { name: 'Other', type: 'person', currency: 'USD' });
            upsertBudget(db, { entity_id: other.id, category: 'bank_fee', currency: 'USD', limit_cents: 1500 });

            const listed = listBudgets(db, entityId);
            expect(listed.map(b => `${b.category}|${b.currency}`))
                .toEqual(['groceries|AUD', 'groceries|USD', 'utilities|USD']);
        });

        it('deletes a budget exactly once', () => {
            const budget = upsertBudget(db, { entity_id: entityId, category: 'groceries', currency: 'USD', limit_cents: 40000 });
            expect(deleteBudget(db, budget.id)).toBe(true);
            expect(deleteBudget(db, budget.id)).toBe(false);
            expect(listBudgets(db, entityId).length).toBe(0);
        });

        it('rejects malformed inputs at the boundary', () => {
            expect(() => upsertBudget(db, { entity_id: entityId, category: '   ', currency: 'USD', limit_cents: 40000 }))
                .toThrow(ValidationError);
            expect(() => upsertBudget(db, { entity_id: '', category: 'groceries', currency: 'USD', limit_cents: 40000 }))
                .toThrow(ValidationError);
            expect(() => upsertBudget(db, { entity_id: entityId, category: 'groceries', currency: 'USD', limit_cents: 0 }))
                .toThrow(ValidationError);
            expect(() => upsertBudget(db, { entity_id: entityId, category: 'groceries', currency: 'USD', limit_cents: -500 }))
                .toThrow(ValidationError);
            expect(() => upsertBudget(db, { entity_id: entityId, category: 'groceries', currency: 'USD', limit_cents: 12.5 }))
                .toThrow(/safe, finite integer/);
            expect(() => upsertBudget(db, { entity_id: entityId, category: 'groceries', currency: 'toolong', limit_cents: 40000 }))
                .toThrow(ValidationError);
        });
    });

    describe('periodMonths', () => {
        it('counts a full calendar month as exactly 1', () => {
            expect(periodMonths('2026-01-01', '2026-01-31')).toBe(1);
        });

        it('counts Jan 1 – Jun 30 as exactly 6', () => {
            expect(periodMonths('2026-01-01', '2026-06-30')).toBe(6);
        });

        it('prorates partial months by day overlap', () => {
            // Jan 15–31 = 17/31, Feb 1–14 = 14/28 → 0.548 + 0.5 = 1.048
            expect(periodMonths('2026-01-15', '2026-02-14')).toBe(1.048);
        });

        it('rejects reversed or malformed ranges', () => {
            expect(() => periodMonths('2026-02-01', '2026-01-01')).toThrow(ValidationError);
            expect(() => periodMonths('not-a-date', '2026-01-31')).toThrow(ValidationError);
        });
    });

    describe('getBudgetVsActual', () => {
        it('requires an explicit start date (proration would be meaningless otherwise)', () => {
            expect(() => getBudgetVsActual(db, entityId, '')).toThrow(ValidationError);
        });

        it('classifies under / at_risk / over by percent used', () => {
            upsertBudget(db, { entity_id: entityId, category: 'groceries', currency: 'USD', limit_cents: 40000 });
            upsertBudget(db, { entity_id: entityId, category: 'utilities', currency: 'USD', limit_cents: 20000 });
            upsertBudget(db, { entity_id: entityId, category: 'bank_fee', currency: 'USD', limit_cents: 10000 });

            spend('groceries', 30000, '2026-01-10');   // 75%  → under
            spend('utilities', 19000, '2026-01-11');   // 95%  → at_risk
            spend('bank_fee', 12500, '2026-01-12');    // 125% → over

            const report = getBudgetVsActual(db, entityId, '2026-01-01', '2026-01-31');
            const byCategory = Object.fromEntries(report.rows.map(r => [r.category, r]));

            expect(byCategory.groceries.status).toBe('under');
            expect(byCategory.groceries.budgeted_cents).toBe(40000);
            expect(byCategory.groceries.actual_cents).toBe(30000);
            expect(byCategory.groceries.difference_cents).toBe(-10000);
            expect(byCategory.groceries.percent_used).toBe(75);

            expect(byCategory.utilities.status).toBe('at_risk');
            expect(byCategory.utilities.percent_used).toBe(95);

            expect(byCategory.bank_fee.status).toBe('over');
            expect(byCategory.bank_fee.percent_used).toBe(125);
            expect(byCategory.bank_fee.difference_cents).toBe(2500);
        });

        it('treats exactly 100% used as at_risk, not over', () => {
            upsertBudget(db, { entity_id: entityId, category: 'groceries', currency: 'USD', limit_cents: 40000 });
            spend('groceries', 40000, '2026-01-10');
            const row = getBudgetVsActual(db, entityId, '2026-01-01', '2026-01-31').rows[0];
            expect(row.percent_used).toBe(100);
            expect(row.status).toBe('at_risk');
        });

        it('includes budgeted-but-no-spend rows with zero actual', () => {
            upsertBudget(db, { entity_id: entityId, category: 'utilities', currency: 'USD', limit_cents: 18000 });
            const row = getBudgetVsActual(db, entityId, '2026-01-01', '2026-01-31').rows[0];
            expect(row.category).toBe('utilities');
            expect(row.actual_cents).toBe(0);
            expect(row.percent_used).toBe(0);
            expect(row.status).toBe('under');
        });

        it('includes spent-but-unbudgeted rows with null budget fields', () => {
            spend('groceries', 12345, '2026-01-10');
            const row = getBudgetVsActual(db, entityId, '2026-01-01', '2026-01-31').rows[0];
            expect(row.category).toBe('groceries');
            expect(row.limit_cents).toBeNull();
            expect(row.budgeted_cents).toBeNull();
            expect(row.difference_cents).toBeNull();
            expect(row.percent_used).toBeNull();
            expect(row.status).toBe('unbudgeted');
            expect(row.formatted_budgeted).toBeNull();
            expect(row.actual_cents).toBe(12345);
        });

        it('prorates the monthly limit across a multi-month period', () => {
            upsertBudget(db, { entity_id: entityId, category: 'groceries', currency: 'USD', limit_cents: 40000 });
            spend('groceries', 10000, '2026-03-15');

            const report = getBudgetVsActual(db, entityId, '2026-01-01', '2026-06-30');
            expect(report.period_months).toBe(6);
            const row = report.rows[0];
            expect(row.budgeted_cents).toBe(240000);
            expect(row.actual_cents).toBe(10000);
            expect(row.percent_used).toBe(4.2);
        });

        it('keeps currencies separate for the same category', () => {
            upsertBudget(db, { entity_id: entityId, category: 'groceries', currency: 'USD', limit_cents: 40000 });

            // AUD spend needs an AUD payment account (currency follows the payment account).
            const aud = createAccount(db, {
                entity_id: entityId, name: 'AUD Checking', type: 'asset', sub_type: 'checking',
                currency: 'AUD', opening_balance_cents: 500000, opening_date: '2026-01-01'
            });
            const audExpense = ensureExpenseAccount(db, entityId, 'groceries', 'AUD');
            recordExpense(db, {
                entity_id: entityId,
                payment_account_id: aud.account.id,
                expense_account_id: audExpense.id,
                amount_cents: 50000,
                date: '2026-01-10',
                description: 'Sydney groceries'
            });
            spend('groceries', 30000, '2026-01-10');

            const report = getBudgetVsActual(db, entityId, '2026-01-01', '2026-01-31');
            expect(report.rows.length).toBe(2);
            const usd = report.rows.find(r => r.currency === 'USD')!;
            const audRow = report.rows.find(r => r.currency === 'AUD')!;
            expect(usd.budgeted_cents).toBe(40000);
            expect(usd.actual_cents).toBe(30000);
            expect(audRow.budgeted_cents).toBeNull();
            expect(audRow.status).toBe('unbudgeted');
            expect(audRow.actual_cents).toBe(50000);
        });

        it('aggregates several expense accounts sharing one sub_type into one row', () => {
            upsertBudget(db, { entity_id: entityId, category: 'groceries', currency: 'USD', limit_cents: 40000 });
            const alt = createAccount(db, {
                entity_id: entityId, name: 'Groceries Alt', type: 'expense', sub_type: 'groceries', currency: 'USD'
            });
            spend('groceries', 10000, '2026-01-05');
            spend('groceries', 15000, '2026-01-20', alt.account.id);

            const rows = getBudgetVsActual(db, entityId, '2026-01-01', '2026-01-31').rows;
            expect(rows.length).toBe(1);
            expect(rows[0].actual_cents).toBe(25000);
        });

        it('reports the shared calculation engine version', () => {
            const report = getBudgetVsActual(db, entityId, '2026-01-01', '2026-01-31');
            expect(report.calculation_version).toBeTruthy();
            expect(report.entity_id).toBe(entityId);
            expect(report.start_date).toBe('2026-01-01');
            expect(report.end_date).toBe('2026-01-31');
        });
    });
});
