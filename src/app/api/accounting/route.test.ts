/**
 * /api/accounting — budget_vs_actual and cash_flow_forecast report tests.
 *
 * Why this exists:
 * The Cash Flow tabs fetch their reports through the shared reports endpoint.
 * These tests pin each branch contract:
 * 1. budget_vs_actual: entity_id and start_date are required (proration is
 *    meaningless without an explicit period start) — missing ones return 400.
 * 2. cash_flow_forecast: entity_id is required; the horizon is clamped
 *    server-side (garbage → 90, oversized → 180) and the report is always
 *    anchored at today.
 *
 * Handlers are called directly with `new Request(...)` against an isolated
 * in-memory vault — zero live storage effects.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import Database from 'better-sqlite3';
import { createTestDb, setTestDb } from '@/infrastructure/sqlite/db';
import { GET, POST } from './route';
import { createEntity, createAccount } from '@/lib/domain/accounting/accountService';
import { ensureExpenseAccount, recordExpense } from '@/lib/domain/accounting/transactionService';
import { upsertBudget } from '@/lib/domain/accounting/budgetService';
import { getLocalTodayCalendarDate } from '@/lib/domain/calendarDate';

function req(url: string): Request {
    return new Request(`http://localhost:3000/api/accounting${url}`);
}

describe('/api/accounting?view=reports&report_type=budget_vs_actual', () => {
    let db: Database.Database;
    let entityId: string;

    beforeEach(() => {
        db = createTestDb();
        setTestDb(db);
        const entity = createEntity(db, { name: 'Report Route', type: 'person', currency: 'USD' });
        entityId = entity.id;
    });

    afterEach(() => {
        setTestDb(null);
        try {
            db.close();
        } catch {
            // Already closed
        }
    });

    it('rejects a missing entity_id with 400', async () => {
        const res = await GET(req('/?view=reports&report_type=budget_vs_actual&start_date=2026-01-01'));
        expect(res.status).toBe(400);
        const json = await res.json();
        expect(json.error).toContain('entity_id');
    });

    it('rejects a missing start_date with 400 (proration needs an explicit period)', async () => {
        const res = await GET(req(`/?view=reports&report_type=budget_vs_actual&entity_id=${entityId}`));
        expect(res.status).toBe(400);
        const json = await res.json();
        expect(json.error).toContain('start_date');
    });

    it('returns the joined budget-vs-actual report for the period', async () => {
        const { account: checking } = createAccount(db, {
            entity_id: entityId, name: 'Checking', type: 'asset', sub_type: 'checking',
            currency: 'USD', opening_balance_cents: 500000, opening_date: '2026-01-01'
        });
        upsertBudget(db, { entity_id: entityId, category: 'groceries', currency: 'USD', limit_cents: 40000 });
        const expenseAcc = ensureExpenseAccount(db, entityId, 'groceries', 'USD');
        recordExpense(db, {
            entity_id: entityId,
            payment_account_id: checking.id,
            expense_account_id: expenseAcc.id,
            amount_cents: 50000,
            date: '2026-01-15',
            description: 'Overdrawn week'
        });

        const res = await GET(req(
            `/?view=reports&report_type=budget_vs_actual&entity_id=${entityId}&start_date=2026-01-01&end_date=2026-01-31`
        ));
        expect(res.status).toBe(200);
        const json = await res.json();
        expect(json.success).toBe(true);

        const report = json.report;
        expect(report.entity_id).toBe(entityId);
        expect(report.period_months).toBe(1);
        expect(report.calculation_version).toBeTruthy();
        expect(report.rows.length).toBe(1);

        const row = report.rows[0];
        expect(row.category).toBe('groceries');
        expect(row.currency).toBe('USD');
        expect(row.budgeted_cents).toBe(40000);
        expect(row.actual_cents).toBe(50000);
        expect(row.percent_used).toBe(125);
        expect(row.status).toBe('over');
        expect(row.formatted_actual).toBeTruthy();
    });
});

describe('/api/accounting?view=reports&report_type=cash_flow_forecast', () => {
    let db: Database.Database;
    let entityId: string;

    beforeEach(() => {
        db = createTestDb();
        setTestDb(db);
        const entity = createEntity(db, { name: 'Forecast Route', type: 'person', currency: 'USD' });
        entityId = entity.id;
        createAccount(db, {
            entity_id: entityId, name: 'Checking', type: 'asset', sub_type: 'checking',
            currency: 'USD', opening_balance_cents: 250000, opening_date: '2026-01-01'
        });
    });

    afterEach(() => {
        setTestDb(null);
        try {
            db.close();
        } catch {
            // Already closed
        }
    });

    it('rejects a missing entity_id with 400', async () => {
        const res = await GET(req('/?view=reports&report_type=cash_flow_forecast'));
        expect(res.status).toBe(400);
        const json = await res.json();
        expect(json.error).toContain('entity_id');
    });

    it('returns a per-currency forecast anchored at today', async () => {
        const res = await GET(req(`/?view=reports&report_type=cash_flow_forecast&entity_id=${entityId}`));
        expect(res.status).toBe(200);
        const json = await res.json();
        expect(json.success).toBe(true);

        const report = json.report;
        expect(report.entity_id).toBe(entityId);
        expect(report.calculation_version).toBeTruthy();
        expect(report.start_date).toBe(getLocalTodayCalendarDate());
        expect(report.horizon_days).toBe(90); // default when the param is absent
        expect(report.currencies).toHaveLength(1);
        expect(report.currencies[0].currency).toBe('USD');
        expect(report.currencies[0].starting_balance_cents).toBe(250000);
        expect(report.currencies[0].points.length).toBe(91); // today..today+90 inclusive
    });

    it('clamps horizon_days server-side', async () => {
        const oversized = await GET(req(
            `/?view=reports&report_type=cash_flow_forecast&entity_id=${entityId}&horizon_days=999`
        ));
        expect((await oversized.json()).report.horizon_days).toBe(180);

        const garbage = await GET(req(
            `/?view=reports&report_type=cash_flow_forecast&entity_id=${entityId}&horizon_days=banana`
        ));
        expect((await garbage.json()).report.horizon_days).toBe(90);
    });

    it('carries debt_projections through the route (empty without liabilities)', async () => {
        const res = await GET(req(`/?view=reports&report_type=cash_flow_forecast&entity_id=${entityId}`));
        const report = (await res.json()).report;
        expect(report.debt_projections).toEqual([]);
    });

    it('projects a liability with explicit terms and a rate', async () => {
        createAccount(db, {
            entity_id: entityId, name: 'Route Card', type: 'liability', sub_type: 'credit_card',
            currency: 'USD', opening_balance_cents: 100000, opening_date: '2026-01-01',
            minimum_payment_cents: 3500, interest_rate: 12
        });
        const res = await GET(req(`/?view=reports&report_type=cash_flow_forecast&entity_id=${entityId}`));
        const report = (await res.json()).report;
        expect(report.debt_projections).toHaveLength(1);
        const row = report.debt_projections[0];
        expect(row.account_id).toBeTruthy();
        expect(row.monthly_payment_cents).toBe(3500);
        expect(row.interest_rate).toBe(12);
        expect(row.formatted_monthly_payment).toBeTruthy();
    });
});

describe('/api/accounting POST action=autopay_debt', () => {
    let db: Database.Database;
    let entityId: string;
    let checkingId: string;
    let cardId: string;

    beforeEach(() => {
        db = createTestDb();
        setTestDb(db);
        const entity = createEntity(db, { name: 'Autopay Route', type: 'person', currency: 'USD' });
        entityId = entity.id;
        checkingId = createAccount(db, {
            entity_id: entityId, name: 'Checking', type: 'asset', sub_type: 'checking',
            currency: 'USD', opening_balance_cents: 250000, opening_date: '2026-01-01'
        }).account.id;
        cardId = createAccount(db, {
            entity_id: entityId, name: 'Visa Card', type: 'liability', sub_type: 'credit_card',
            currency: 'USD', opening_balance_cents: 100000, opening_date: '2026-01-01',
            minimum_payment_cents: 3500
        }).account.id;
    });

    afterEach(() => {
        setTestDb(null);
        try {
            db.close();
        } catch {
            // Already closed
        }
    });

    function post(body: unknown): Request {
        return new Request('http://localhost:3000/api/accounting', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body)
        });
    }

    it('posts the stored minimum on the first call (201) and skips on the second (200 already_paid)', async () => {
        const payload = {
            entity_id: entityId,
            bank_account_id: checkingId,
            debt_account_id: cardId,
            month: '2026-10'
        };

        const first = await POST(post({ action: 'autopay_debt', payload }));
        expect(first.status).toBe(201);
        const firstJson = await first.json();
        expect(firstJson.success).toBe(true);
        expect(firstJson.skipped).toBe(false);
        expect(firstJson.transaction.idempotency_key).toBe(`debt:${cardId}:2026-10`);

        // The already_paid guard answers before postTransaction's key check —
        // a regeneration is a clean 200 skip, never a 409.
        const second = await POST(post({ action: 'autopay_debt', payload }));
        expect(second.status).toBe(200);
        expect(await second.json()).toMatchObject({ success: true, skipped: true, reason: 'already_paid' });
    });

    it('rejects a missing payload with 400', async () => {
        const res = await POST(post({ action: 'autopay_debt' }));
        expect(res.status).toBe(400);
        expect((await res.json()).error).toContain('autopay_debt');
    });
});
