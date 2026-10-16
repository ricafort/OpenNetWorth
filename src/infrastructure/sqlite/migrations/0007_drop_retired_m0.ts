/**
 * Migration 0007 — drop the retired m0 `assets`/`liabilities` tables.
 *
 * Why this exists:
 * Phase 3 of the single-data-layer collapse. Their money rows were copied into the
 * double-entry ledger by 0006 (accounts + balanced opening-balance postings), and
 * all read/write paths now go through the vault API's ledger collections. Keeping
 * the tables around would leave a second, drifting source of truth.
 *
 * Kept on purpose: `profiles`, `settings`, `goals`, `recurring_transactions`,
 * `net_worth_history`, `cash_flow_history` — still first-class planning/metadata
 * tables (history tables get plain renames in the Phase 4 migration).
 *
 * `backupBefore: true` on the runner entry: a `VACUUM INTO` snapshot is taken
 * before this destructive drop.
 */

import Database from 'better-sqlite3';

export function up(db: Database.Database): void {
    db.exec(`
        DROP TABLE IF EXISTS assets;
        DROP TABLE IF EXISTS liabilities;
    `);
}
