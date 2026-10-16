/**
 * Migration 0009 — account terms columns.
 *
 * Why this exists:
 * The retired m0 `assets`/`liabilities` tables carried loan/investment terms
 * (`interest_rate`, `minimum_payment`, `investment_details`), but the ledger
 * `accounts` table never gained them — the backfill (0006) and the drop (0007)
 * retired that data instead of carrying it. This migration closes the gap so
 * liability interest rates, minimum payments, and investment metadata persist on
 * accounts. Amounts follow the ledger convention: `minimum_payment_cents` is an
 * INTEGER number of cents (like `opening_balance_cents`).
 *
 * Additive and probe-guarded (same pattern as 0004) — no snapshot needed.
 */

import Database from 'better-sqlite3';

const NEW_COLUMNS: { name: string; ddl: string }[] = [
    { name: 'interest_rate', ddl: 'REAL' },
    { name: 'minimum_payment_cents', ddl: 'INTEGER' },
    { name: 'investment_details', ddl: 'TEXT' },
];

export function up(db: Database.Database): void {
    const tableInfo = db.prepare('PRAGMA table_info(accounts)').all() as { name: string }[];
    for (const column of NEW_COLUMNS) {
        if (!tableInfo.some(c => c.name === column.name)) {
            db.prepare(`ALTER TABLE accounts ADD COLUMN ${column.name} ${column.ddl}`).run();
        }
    }
}
