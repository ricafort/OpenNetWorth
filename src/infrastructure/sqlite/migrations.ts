/**
 * SQLite Migration Runner — single source of truth for vault schema evolution.
 *
 * Why this exists:
 * Before Oct 2026 the vault schema was "migrated" by re-running ~10 ad-hoc PRAGMA
 * probes (migrateAccountingSchema) on every API request across 29 call sites, with
 * no record of what had already been applied. This runner replaces that: each
 * migration has an id, runs exactly once, and is recorded in `schema_migrations`.
 *
 * Tricky logic:
 * - Each migration runs inside its own `db.transaction()`; better-sqlite3 nests the
 *   migration's own internal transactions as savepoints. Note that `PRAGMA
 *   foreign_keys` is a no-op inside a transaction — the wrapped repair functions
 *   only DROP child tables (nothing references them), so FK enforcement staying ON
 *   is safe for every current migration.
 * - `backupBefore` migrations take a `VACUUM INTO` snapshot first (VACUUM cannot run
 *   inside a transaction). In-memory databases (journal_mode=memory, i.e. tests)
 *   skip the snapshot — there is no vault file to protect.
 * - Migrations are append-only: never edit an applied migration; add a new one.
 *   The `migrations/` directory is exempt from the m1_→plain rename codemod:
 *   old table-name literals there are load-bearing history.
 */

import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

import { up as migration0001Baseline } from './migrations/0001_baseline';
import { up as migration0002AccountingShapeRepairs } from './migrations/0002_accounting_shape_repairs';
import { up as migration0003DocumentSchema } from './migrations/0003_document_schema';
import { up as migration0004NetWorthHistoryCurrency } from './migrations/0004_net_worth_history_currency';
import { up as migration0005EvidenceLinks } from './migrations/0005_evidence_links';
import { up as migration0006BackfillLegacyLedger } from './migrations/0006_backfill_legacy_ledger';
import { up as migration0007DropRetiredM0 } from './migrations/0007_drop_retired_m0';

export interface SqliteMigration {
    /** Stable, ordered identifier, e.g. '0001_baseline'. Never reused. */
    id: string;
    description: string;
    /**
     * When true, a consistent `VACUUM INTO` snapshot is written to
     * `data/backups/pre-<id>-<timestamp>.sqlite` before the migration runs.
     */
    backupBefore?: boolean;
    up(db: Database.Database): void;
}

/**
 * Ordered migration list. Append new migrations at the end; the runner applies
 * them in array order, skipping ids already present in `schema_migrations`.
 */
export const MIGRATIONS: SqliteMigration[] = [
    {
        id: '0001_baseline',
        description: 'Baseline vault schema: m0 metadata tables, accounting core DDL, mentor chat DDL, local_user seed',
        up: migration0001Baseline,
    },
    {
        id: '0002_accounting_shape_repairs',
        description: 'One-time shape repairs for pre-existing accounting tables (columns, CHECK upgrades, table rebuilds)',
        up: migration0002AccountingShapeRepairs,
    },
    {
        id: '0003_document_schema',
        description: 'Document schema repairs (raw_content, linked proposals) then document DDL',
        up: migration0003DocumentSchema,
    },
    {
        id: '0004_net_worth_history_currency',
        description: 'Add currency column to net_worth_history for pre-existing databases',
        up: migration0004NetWorthHistoryCurrency,
    },
    {
        id: '0005_evidence_links',
        description: 'Promote m1_evidence_links from test-only DDL into the canonical vault schema',
        up: migration0005EvidenceLinks,
    },
    {
        id: '0006_backfill_legacy_ledger',
        description: 'Copy m0 assets/liabilities rows into the ledger as accounts + balanced opening-balance postings',
        up: migration0006BackfillLegacyLedger,
    },
    {
        id: '0007_drop_retired_m0',
        description: 'Drop the retired m0 assets/liabilities tables (money rows now live in the ledger)',
        backupBefore: true,
        up: migration0007DropRetiredM0,
    },
];

/**
 * Writes a transactionally consistent snapshot of the vault before a destructive
 * migration. Never `cp` a WAL database — `VACUUM INTO` produces a single
 * consistent file even while WAL mode is active.
 */
function snapshotVault(db: Database.Database, migrationId: string): void {
    const journalMode = db.pragma('journal_mode', { simple: true }) as string;
    if (journalMode === 'memory') {
        return; // In-memory test database — no file to protect
    }
    const backupDir = path.resolve(process.cwd(), 'data', 'backups');
    fs.mkdirSync(backupDir, { recursive: true });
    const stamp = new Date().toISOString().replace(/[:.]/g, '-');
    const dest = path.join(backupDir, `pre-${migrationId}-${stamp}.sqlite`);
    db.exec(`VACUUM INTO '${dest.replace(/'/g, "''")}'`);
    console.log(`[sqlite] pre-migration snapshot written: ${dest}`);
}

/**
 * Applies every pending migration exactly once, recording each id in
 * `schema_migrations`. Safe to call on every database open — already-applied
 * migrations are skipped. Returns the ids applied by this call.
 */
export function runMigrations(db: Database.Database): string[] {
    db.exec(`
        CREATE TABLE IF NOT EXISTS schema_migrations (
            id TEXT PRIMARY KEY,
            description TEXT NOT NULL,
            applied_at TEXT NOT NULL
        );
    `);

    const appliedIds = new Set(
        (db.prepare('SELECT id FROM schema_migrations').all() as { id: string }[]).map(r => r.id)
    );

    const newlyApplied: string[] = [];
    for (const migration of MIGRATIONS) {
        if (appliedIds.has(migration.id)) continue;

        if (migration.backupBefore) {
            snapshotVault(db, migration.id);
        }

        db.transaction(() => {
            migration.up(db);
            db.prepare(
                "INSERT INTO schema_migrations (id, description, applied_at) VALUES (?, ?, datetime('now'))"
            ).run(migration.id, migration.description);
        })();

        newlyApplied.push(migration.id);
    }

    if (newlyApplied.length > 0) {
        console.log(`[sqlite] migrations applied: ${newlyApplied.join(', ')}`);
    } else {
        console.log('[sqlite] migrations: 0 migrations applied (schema up to date)');
    }

    return newlyApplied;
}
