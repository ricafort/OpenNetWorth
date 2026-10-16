/**
 * Migrate a vault file in place (or bring a fresh one up to the full schema).
 *
 * Why this exists:
 * The app runs migrations automatically at DB open, but fixture/scratch vaults
 * under data/ (test_browser_vault.sqlite, test_demo_vault.sqlite, rehearsal
 * copies) are often created by scripts that bypass getDb(). This CLI applies the
 * same ordered migration list the app uses and reports exactly what ran.
 *
 * Tricky logic:
 * - Opens with the same pragmas as getDb() (WAL, foreign_keys ON) — migration
 *   0008 asserts legacy_alter_table OFF and checks foreign_key_check itself.
 * - Idempotent: already-recorded ids in schema_migrations are skipped; running
 *   twice prints "0 migrations applied".
 * - data/ is fully gitignored — never point this at a path outside data/ that
 *   you are not prepared to have rewritten.
 *
 * Usage: npx tsx scripts/migrate-vault.ts [path-to-sqlite]
 *        (default: data/opennetworth.sqlite — the live vault)
 */
import Database from 'better-sqlite3';
import path from 'path';
import { runMigrations } from '../src/infrastructure/sqlite/migrations';

const dbPath = process.argv[2] || path.resolve(process.cwd(), 'data/opennetworth.sqlite');

const db = new Database(dbPath);
db.pragma('journal_mode = WAL');
db.pragma('synchronous = NORMAL');
db.pragma('foreign_keys = ON');

const applied = runMigrations(db);

const violations = db.pragma('foreign_key_check') as unknown[];
if (violations.length > 0) {
    console.error(`foreign_key_check FAILED after migrations: ${JSON.stringify(violations)}`);
    db.close();
    process.exit(1);
}

const recorded = (db
    .prepare('SELECT id, applied_at FROM schema_migrations ORDER BY id')
    .all() as { id: string; applied_at: string }[]);

console.log(`\nVault: ${dbPath}`);
console.log(`Applied this run: ${applied.length === 0 ? '(none — already up to date)' : applied.join(', ')}`);
console.log(`schema_migrations (${recorded.length}):`);
for (const r of recorded) console.log(`  ${r.id.padEnd(36)} ${r.applied_at}`);
console.log('foreign_key_check: clean');

db.close();
