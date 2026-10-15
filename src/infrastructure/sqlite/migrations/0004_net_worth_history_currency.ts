/**
 * Migration 0004 — net_worth_history currency column.
 *
 * Why this exists:
 * Net worth history snapshots must durably retain currency so historical snapshots
 * recorded in USD/EUR are never masqueraded as AUD (Finding 2 / Clarification 4).
 * Databases created before the column existed get it via ALTER; the probe was moved
 * verbatim from `db.ts initSchema()` (2026-10).
 */

import Database from 'better-sqlite3';

export function up(db: Database.Database): void {
    const tableInfo = db.prepare('PRAGMA table_info(net_worth_history)').all() as { name: string }[];
    if (tableInfo.length > 0 && !tableInfo.some(c => c.name === 'currency')) {
        db.prepare('ALTER TABLE net_worth_history ADD COLUMN currency TEXT').run();
    }
}
