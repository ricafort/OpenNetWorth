/**
 * Migration 0005 — promote m1_evidence_links into the canonical vault schema.
 *
 * Why this exists:
 * The evidence-link table (Slice 1D) existed only inside `slice1d.test.ts` hand-built
 * fixtures — no production database ever created it. This migration promotes it to a
 * first-class vault table with the same shape the tests define, plus a transaction
 * lookup index.
 */

import Database from 'better-sqlite3';

export function up(db: Database.Database): void {
    db.exec(`
        CREATE TABLE IF NOT EXISTS m1_evidence_links (
            id TEXT PRIMARY KEY,
            transaction_id TEXT NOT NULL REFERENCES m1_transactions(id) ON DELETE CASCADE,
            document_id TEXT NOT NULL,
            content_hash TEXT,
            page_number INTEGER,
            bounding_box TEXT,
            created_at TEXT NOT NULL DEFAULT (datetime('now'))
        );
        CREATE INDEX IF NOT EXISTS idx_m1_evidence_links_tx ON m1_evidence_links(transaction_id);
    `);
}
