/**
 * One-off recovery of account TERMS from the pre-0007 snapshot into the live vault.
 *
 * Why this exists:
 * Migration 0006 backfilled the m0 assets/liabilities rows into `accounts` BEFORE
 * 0009 added the terms columns, and 0007 dropped the m0 tables — so the live vault's
 * account rows carry NULL interest_rate / minimum_payment_cents / investment_details.
 * The snapshot taken automatically before 0007 (`data/backups/pre-0007_drop_retired_m0-*.sqlite`)
 * still has the original m0 rows with their terms. This script ATTACHes that snapshot
 * and copies the terms back onto the mapped account ids (`account-asset-<id>` /
 * `account-liab-<id>`), only where the live value is still NULL (never overwrites
 * anything the user has since entered).
 *
 * Safety:
 * - Dry-run by DEFAULT; pass --apply to write.
 * - VACUUM INTO a fresh safety backup before any write (never `cp` a WAL db).
 * - Runs runMigrations() first so 0009's columns exist on the live vault.
 * - busy_timeout so the running dev server's WAL connection never breaks the run.
 * - This script contains NO financial data; the vault files it touches are gitignored.
 *
 * Run:  npx tsx scripts/restore_account_terms.ts            (dry run)
 *       npx tsx scripts/restore_account_terms.ts --apply    (write)
 */

import Database from 'better-sqlite3';
import fs from 'fs';
import path from 'path';
import { runMigrations } from '../src/infrastructure/sqlite/migrations';

const LIVE_DB = path.resolve('data', 'opennetworth.sqlite');
const BACKUP_DIR = path.resolve('data', 'backups');

function findPre0007Snapshot(): string {
    const override = process.argv.find(a => a.startsWith('--snapshot='));
    if (override) return path.resolve(override.slice('--snapshot='.length));
    // Largest wins: test rehearsals are ~442KB, the real vault snapshot is ~32MB.
    // (Newest-by-mtime is wrong — test runs keep creating fresh tiny snapshots.)
    const candidates = fs.readdirSync(BACKUP_DIR)
        .filter(f => f.startsWith('pre-0007_') && f.endsWith('.sqlite'))
        .map(f => ({ f, size: fs.statSync(path.join(BACKUP_DIR, f)).size }))
        .sort((a, b) => b.size - a.size);
    if (candidates.length === 0) {
        throw new Error(`No pre-0007 snapshot found in ${BACKUP_DIR}`);
    }
    if (candidates.length > 1) {
        console.log(`${candidates.length} pre-0007 snapshots present; using the largest ` +
            `(${candidates[0].f}, ${(candidates[0].size / 1024 / 1024).toFixed(1)} MB). ` +
            `Override with --snapshot=<file>.`);
    }
    return path.join(BACKUP_DIR, candidates[0].f);
}

function tableExists(db: Database.Database, schema: string, name: string): boolean {
    const row = db.prepare(
        `SELECT COUNT(*) AS cnt FROM "${schema}".sqlite_master WHERE type = 'table' AND name = ?`
    ).get(name) as { cnt: number } | undefined;
    return (row?.cnt ?? 0) > 0;
}

function main(): void {
    const apply = process.argv.includes('--apply');
    const snapshot = findPre0007Snapshot();
    console.log(`Live vault:  ${LIVE_DB}`);
    console.log(`Snapshot:    ${snapshot}`);
    console.log(`Mode:        ${apply ? 'APPLY (will write)' : 'DRY RUN (no writes)'}\n`);

    const db = new Database(LIVE_DB);
    db.pragma('busy_timeout = 5000');
    runMigrations(db); // ensures 0009's terms columns exist

    if (!tableExists(db, 'main', 'accounts')) {
        throw new Error('Live vault has no accounts table — aborting.');
    }
    const cols = new Set(
        (db.prepare('PRAGMA table_info(accounts)').all() as { name: string }[]).map(c => c.name)
    );
    for (const need of ['interest_rate', 'minimum_payment_cents', 'investment_details']) {
        if (!cols.has(need)) throw new Error(`accounts is missing ${need} — migration 0009 did not apply.`);
    }

    db.prepare('ATTACH DATABASE ? AS snap').run(snapshot);
    const hasAssets = tableExists(db, 'snap', 'assets');
    const hasLiabilities = tableExists(db, 'snap', 'liabilities');
    if (!hasAssets && !hasLiabilities) {
        throw new Error('Snapshot has neither m0 assets nor liabilities — nothing to restore.');
    }

    // Preview counts: mapped accounts whose terms are still NULL in the live vault.
    const preview = {
        assetTerms: hasAssets ? db.prepare(`
            SELECT COUNT(*) AS cnt FROM main.accounts a
            JOIN snap.assets s ON a.id = 'account-asset-' || s.id
            WHERE a.interest_rate IS NULL AND a.investment_details IS NULL
              AND (s.interest_rate IS NOT NULL OR s.investment_details IS NOT NULL)
        `).get() as { cnt: number } : { cnt: 0 },
        liabTerms: hasLiabilities ? db.prepare(`
            SELECT COUNT(*) AS cnt FROM main.accounts a
            JOIN snap.liabilities l ON a.id = 'account-liab-' || l.id
            WHERE a.interest_rate IS NULL AND a.minimum_payment_cents IS NULL
              AND (l.interest_rate IS NOT NULL OR l.minimum_payment IS NOT NULL)
        `).get() as { cnt: number } : { cnt: 0 },
    };
    console.log(`Accounts that would receive terms: ${preview.assetTerms.cnt} asset(s), ${preview.liabTerms.cnt} liability(s).`);

    if (!apply) {
        console.log('\nDry run complete. Re-run with --apply to write (a safety backup is taken first).');
        db.prepare('DETACH DATABASE snap').run();
        db.close();
        return;
    }

    // Safety backup before writing (VACUUM INTO — WAL-safe, single file).
    const stamp = new Date().toISOString().replace(/[:.]/g, '-');
    const safety = path.join(BACKUP_DIR, `pre-terms-restore-${stamp}.sqlite`);
    db.pragma(`busy_timeout = 30000`);
    db.prepare(`VACUUM INTO ?`).run(safety);
    console.log(`Safety backup: ${safety}`);

    const restoreAssets = hasAssets ? db.prepare(`
        UPDATE main.accounts
        SET interest_rate = (SELECT s.interest_rate FROM snap.assets s WHERE 'account-asset-' || s.id = main.accounts.id),
            investment_details = (SELECT s.investment_details FROM snap.assets s WHERE 'account-asset-' || s.id = main.accounts.id)
        WHERE type = 'asset'
          AND interest_rate IS NULL AND investment_details IS NULL
          AND EXISTS (
              SELECT 1 FROM snap.assets s
              WHERE 'account-asset-' || s.id = main.accounts.id
                AND (s.interest_rate IS NOT NULL OR s.investment_details IS NOT NULL)
          )
    `) : null;
    const restoreLiabilities = hasLiabilities ? db.prepare(`
        UPDATE main.accounts
        SET interest_rate = (SELECT l.interest_rate FROM snap.liabilities l WHERE 'account-liab-' || l.id = main.accounts.id),
            minimum_payment_cents = (
                SELECT CAST(ROUND(l.minimum_payment * 100) AS INTEGER) FROM snap.liabilities l
                WHERE 'account-liab-' || l.id = main.accounts.id
            )
        WHERE type = 'liability'
          AND interest_rate IS NULL AND minimum_payment_cents IS NULL
          AND EXISTS (
              SELECT 1 FROM snap.liabilities l
              WHERE 'account-liab-' || l.id = main.accounts.id
                AND (l.interest_rate IS NOT NULL OR l.minimum_payment IS NOT NULL)
          )
    `) : null;

    const run = db.transaction(() => {
        const a = restoreAssets ? restoreAssets.run() : { changes: 0 };
        const l = restoreLiabilities ? restoreLiabilities.run() : { changes: 0 };
        return { a: a.changes, l: l.changes };
    });
    const result = run();
    console.log(`Restored terms on ${result.a} asset account(s) and ${result.l} liability account(s).`);

    db.prepare('DETACH DATABASE snap').run();
    db.close();
}

main();
