/**
 * /api/accounting — budget_vs_actual report tests.
 *
 * Why this exists:
 * The Actual Cash Flow tab fetches the budget comparison through the shared
 * reports endpoint. These tests pin the branch contract:
 * 1. entity_id and start_date are required (proration is meaningless without
 *    an explicit period start) — missing ones return 400.
 * 2. A valid request returns the joined report: prorated budgeted amounts,
 *    real-posting actuals, and status classification.
 *
 * Handlers are called directly with `new Request(...)` against an isolated
 * in-memory vault — zero live storage effects.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import Database from 'better-sqlite3';
import { createTestDb, setTestDb } from '@/infrastructure/sqlite/db';
import { GET } from './route';
import { createEntity, createAccount } from '@/lib/domain/accounting/accountService';
import { ensureExpenseAccount, recordExpense } from '@/lib/domain/accounting/transactionService';
import { upsertBudget } from '@/lib/domain/accounting/budgetService';

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
