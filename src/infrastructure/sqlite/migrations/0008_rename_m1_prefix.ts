/**
 * Migration 0008 — drop the milestone-prefix seam: rename every `m1_*` table to
 * its plain domain name, plus the three kept m0 tables to intuitive names.
 *
 * Why this exists:
 * The `m0_`/`m1_` prefixes were milestone labels, not domain vocabulary. The end
 * state is one schema with plain intuitive names (accounts, transactions,
 * balance_observations, net_worth_snapshots, …). Code and schema names move
 * together in the same commit set — the codemod rewrites every SQL literal
 * outside this directory; the literals here are load-bearing history.
 *
 * Tricky logic (verified on SQLite 3.53.4, the project's better-sqlite3):
 * - `ALTER TABLE RENAME` rewrites `REFERENCES` clauses in child tables AND the
 *   table reference inside index definitions — but NOT index names, and SQLite
 *   has no `ALTER INDEX`. So each `idx_m1_*` index is dropped and recreated from
 *   its (already-rewritten) stored SQL with the name de-prefixed.
 * - Indexes whose names never carried the prefix (idx_obs_*, idx_asm_*, …) follow
 *   their table automatically and are left alone.
 * - `PRAGMA legacy_alter_table` must be OFF, otherwise child FK clauses would
 *   keep pointing at the old names and the rename would silently break the graph.
 * - `PRAGMA foreign_key_check` runs inside the runner's transaction: any
 *   violation throws and the entire rename rolls back.
 * - Idempotent by guard: `tableExists(from) && !tableExists(to)`. Fresh vaults
 *   (whose 0001 already created plain names post-codemod) skip every statement.
 */

import Database from 'better-sqlite3';

/** [old, new] — m1_* ledger tables first, then the kept m0 metadata tables. */
const TABLE_RENAMES: ReadonlyArray<readonly [string, string]> = [
    ['m1_entities', 'entities'],
    ['m1_accounts', 'accounts'],
    ['m1_account_ownership', 'account_ownership'],
    ['m1_transactions', 'transactions'],
    ['m1_journal_entries', 'journal_entries'],
    ['m1_transaction_corrections', 'transaction_corrections'],
    ['m1_exchange_rates', 'exchange_rates'],
    ['m1_asset_valuations', 'asset_valuations'],
    ['m1_drafts', 'drafts'],
    ['m1_reimbursement_workflows', 'reimbursement_workflows'],
    ['m1_balance_observations', 'balance_observations'],
    ['m1_balance_import_batches', 'balance_import_batches'],
    ['m1_account_source_mappings', 'account_source_mappings'],
    ['m1_categorization_rules', 'categorization_rules'],
    ['m1_statement_reviews', 'statement_reviews'],
    ['m1_documents', 'documents'],
    ['m1_csv_mappings', 'csv_mappings'],
    ['m1_document_jobs', 'document_jobs'],
    ['m1_proposals', 'proposals'],
    ['m1_mentor_sessions', 'mentor_sessions'],
    ['m1_mentor_messages', 'mentor_messages'],
    ['m1_evidence_links', 'evidence_links'],
    ['recurring_transactions', 'recurring_schedules'],
    ['net_worth_history', 'net_worth_snapshots'],
    ['cash_flow_history', 'cash_flow_summaries'],
];

function tableExists(db: Database.Database, name: string): boolean {
    return db
        .prepare("SELECT 1 FROM sqlite_master WHERE type = 'table' AND name = ?")
        .get(name) !== undefined;
}

function hasRows(db: Database.Database, name: string): boolean {
    return db.prepare(`SELECT 1 FROM "${name}" LIMIT 1`).get() !== undefined;
}

export function up(db: Database.Database): void {
    if (db.pragma('legacy_alter_table', { simple: true })) {
        throw new Error(
            '0008_rename_m1_prefix requires PRAGMA legacy_alter_table = OFF; ' +
            'with it ON, child-table REFERENCES keep the old names and the FK graph breaks.'
        );
    }

    for (const [from, to] of TABLE_RENAMES) {
        if (!tableExists(db, from)) continue; // never created in this vault

        if (!tableExists(db, to)) {
            db.exec(`ALTER TABLE "${from}" RENAME TO "${to}"`);
            continue;
        }

        // Both names exist — the 0001/0003 guards should make this impossible,
        // but a twin pair means one side is an empty artifact of a partially
        // migrated vault. Keep whichever side holds rows; never lose data.
        const fromHasRows = hasRows(db, from);
        const toHasRows = hasRows(db, to);
        if (fromHasRows && toHasRows) {
            throw new Error(
                `0008_rename_m1_prefix: both "${from}" and "${to}" exist and hold rows — ` +
                'refusing to guess which is authoritative. Reconcile by hand.'
            );
        }
        if (fromHasRows) {
            db.exec(`DROP TABLE "${to}"`); // empty plain twin — the m1_ original wins
            db.exec(`ALTER TABLE "${from}" RENAME TO "${to}"`);
        } else {
            db.exec(`DROP TABLE "${from}"`); // empty m1_ twin — the plain table wins
        }
    }

    // SQLite rewrites the table reference inside index SQL on rename but not the
    // index NAME — drop and recreate each idx_m1_* with its stored (rewritten) SQL.
    const prefixedIndexes = db
        .prepare(
            "SELECT name, sql FROM sqlite_master WHERE type = 'index' AND name LIKE 'idx_m1_%' AND sql IS NOT NULL"
        )
        .all() as { name: string; sql: string }[];
    for (const index of prefixedIndexes) {
        const newName = index.name.replace(/^idx_m1_/, 'idx_');
        db.exec(`DROP INDEX "${index.name}"`);
        db.exec(index.sql.replace(index.name, newName));
    }

    const violations = db.pragma('foreign_key_check') as unknown[];
    if (violations.length > 0) {
        throw new Error(
            `0008_rename_m1_prefix left ${violations.length} foreign-key violation(s); ` +
            'the whole rename has been rolled back: ' + JSON.stringify(violations)
        );
    }
}
