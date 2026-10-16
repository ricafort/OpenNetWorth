/**
 * Why this file exists:
 * Pins the shape migration 0010 gives the `budgets` table — the storage the
 * budgets-vs-actuals feature reads and writes: one monthly limit per
 * (entity, category, currency) in integer cents.
 *
 * Tricky logic:
 * - The UNIQUE(entity_id, category, currency) constraint is what makes the
 *   service's upsert idempotent, so the duplicate-key rejection is asserted
 *   at the SQL level, not just through the service.
 * - Re-running `runMigrations` must be a no-op (migrations run on every DB
 *   open, including inside route tests).
 *
 * All operations execute strictly in-memory; zero live storage modifications.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import Database from 'better-sqlite3';
import { runMigrations } from './migrations';

function budgetColumns(database: Database.Database): string[] {
    return (database.prepare('PRAGMA table_info(budgets)').all() as { name: string }[]).map(c => c.name);
}

function insertBudget(
    database: Database.Database,
    row: { id: string; entity_id: string; category: string; limit_cents: number; currency: string }
): void {
    database.prepare(`
        INSERT INTO budgets (id, entity_id, category, limit_cents, currency, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, datetime('now'), datetime('now'))
    `).run(row.id, row.entity_id, row.category, row.limit_cents, row.currency);
}

describe('Budgets table (migration 0010)', () => {
    let db: Database.Database;

    beforeEach(() => {
        db = new Database(':memory:');
        db.pragma('foreign_keys = ON');
        runMigrations(db);
    });

    afterEach(() => {
        try {
            db.close();
        } catch {
            // Already closed
        }
    });

    it('creates budgets with the columns the feature relies on', () => {
        const cols = budgetColumns(db);
        expect(cols).toEqual(
            expect.arrayContaining(['id', 'user_id', 'entity_id', 'category', 'limit_cents', 'currency', 'created_at', 'updated_at'])
        );
    });

    it('is idempotent: re-running applies nothing and keeps the table', () => {
        const second = runMigrations(db);
        expect(second).not.toContain('0010_budgets');
        expect(budgetColumns(db)).toContain('limit_cents');
    });

    it('enforces UNIQUE(entity_id, category, currency)', () => {
        insertBudget(db, { id: 'b1', entity_id: 'ent-1', category: 'groceries', limit_cents: 40000, currency: 'USD' });
        expect(() =>
            insertBudget(db, { id: 'b2', entity_id: 'ent-1', category: 'groceries', limit_cents: 50000, currency: 'USD' })
        ).toThrow(/UNIQUE constraint failed/);

        // Same category in another currency, or another entity, is a distinct budget.
        insertBudget(db, { id: 'b3', entity_id: 'ent-1', category: 'groceries', limit_cents: 60000, currency: 'AUD' });
        insertBudget(db, { id: 'b4', entity_id: 'ent-2', category: 'groceries', limit_cents: 70000, currency: 'USD' });
        const count = (db.prepare('SELECT COUNT(*) AS c FROM budgets').get() as any).c;
        expect(count).toBe(3);
    });
});
