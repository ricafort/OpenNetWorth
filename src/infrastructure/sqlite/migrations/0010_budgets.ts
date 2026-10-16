/**
 * Migration 0010 — budgets table.
 *
 * Why this exists:
 * The Cashflow page needs monthly per-category spending limits to compare against
 * ledger actuals. A budget is one row per (entity, category, currency): the
 * category is the expense account's `sub_type` value (transactions carry no
 * category column — category ≡ the income/expense account), and the limit is a
 * monthly default that applies to every period (prorated at read time).
 *
 * Unlike the sibling metadata tables (`recurring_schedules` etc.) budgets are
 * ENTITY-scoped, because category-accounts are per entity — a budget for
 * 'groceries' only constrains the entity that actually has that expense account.
 * `limit_cents` follows the ledger cents convention (INTEGER minor units, like
 * `minimum_payment_cents` in 0009).
 *
 * Additive — no snapshot needed.
 */

import Database from 'better-sqlite3';

export function up(db: Database.Database): void {
    db.exec(`
        CREATE TABLE IF NOT EXISTS budgets (
            id TEXT PRIMARY KEY,
            user_id TEXT NOT NULL DEFAULT 'local_user',
            entity_id TEXT NOT NULL,
            category TEXT NOT NULL,
            limit_cents INTEGER NOT NULL,
            currency TEXT NOT NULL DEFAULT 'USD',
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL,
            UNIQUE(entity_id, category, currency)
        );
    `);
}
