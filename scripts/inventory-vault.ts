/**
 * Vault inventory + safety backup (read-only against the live vault).
 *
 * Why this exists:
 * Before the single-data-layer collapse (Oct 2026 refactor) we need (a) a consistent
 * binary snapshot of the live vault and (b) row counts per table to decide whether
 * the legacy assets/liabilities backfill is a no-op.
 *
 * Tricky logic:
 * - Opens the vault READ-ONLY and uses `VACUUM INTO` (never `cp`) so the snapshot is
 *   transactionally consistent even while WAL mode is active.
 * - Output lives under data/ which is fully gitignored (.gitignore:57) — real
 *   financial data must never be committed.
 *
 * Usage: npx tsx scripts/inventory-vault.ts [path-to-sqlite]
 */
import Database from 'better-sqlite3';
import fs from 'fs';
import path from 'path';

const dbPath = process.argv[2] || path.resolve(process.cwd(), 'data/opennetworth.sqlite');
const stamp = new Date().toISOString().slice(0, 10);
const outDir = path.resolve(process.cwd(), 'data/safety_backup_pre_collapse');
fs.mkdirSync(outDir, { recursive: true });

const db = new Database(dbPath, { readonly: true });

const tables = (db
    .prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%' ORDER BY name")
    .all() as { name: string }[]).map(r => r.name);

const counts: Record<string, number> = {};
for (const t of tables) {
    counts[t] = (db.prepare(`SELECT COUNT(*) AS c FROM "${t}"`).get() as { c: number }).c;
}

console.log(`Vault: ${dbPath}`);
console.log(`Tables: ${tables.length}`);
for (const t of tables) console.log(`  ${t.padEnd(32)} ${counts[t]}`);

// Consistent binary snapshot
const sqliteDest = path.join(outDir, `opennetworth-${stamp}.sqlite`);
db.exec(`VACUUM INTO '${sqliteDest.replace(/'/g, "''")}'`);
console.log(`\nBinary snapshot: ${sqliteDest}`);

// Full JSON dump (all tables, all rows) as a second independent form
const dump: Record<string, unknown[]> = {};
for (const t of tables) dump[t] = db.prepare(`SELECT * FROM "${t}"`).all();
const jsonDest = path.join(outDir, `vault-inventory-${stamp}.json`);
fs.writeFileSync(jsonDest, JSON.stringify({ exported_at: new Date().toISOString(), counts, tables: dump }, null, 2));
console.log(`JSON dump:     ${jsonDest}`);

db.close();
