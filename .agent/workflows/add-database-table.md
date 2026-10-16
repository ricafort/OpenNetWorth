---
description: Add a new database table to the embedded SQLite vault
---

## Steps

1. **Create a migration module** in `src/infrastructure/sqlite/migrations/`:
   ```
   [next-number]_[feature-name].ts
   ```
   - Find the next number from the existing list; ids are ordered and never reused.
   - Export `up(db: Database.Database): void`. Never edit an applied migration — add a new one.

2. **Register it** in `MIGRATIONS[]` in `src/infrastructure/sqlite/migrations.ts`:
   ```ts
   {
       id: '[next-number]_[feature-name]',
       description: 'One line: what this migration does',
       up: migrationFn,
   },
   ```
   - Set `backupBefore: true` for destructive changes (drops, table rebuilds) — the
     runner writes a `VACUUM INTO` snapshot to `data/backups/` first.

3. **Define the table** (snake_case columns — they must match API payload keys):
   ```ts
   db.exec(`
       CREATE TABLE IF NOT EXISTS [table_name] (
           id TEXT PRIMARY KEY,
           -- your columns here
           created_at TEXT NOT NULL
       );
   `);
   ```
   - Plain intuitive names — no milestone prefixes (`m0_`, `m1_`).
   - The runner wraps `up()` in a transaction; add `PRAGMA foreign_key_check`
     assertions for anything touching the FK graph.

4. **Add the canonical DDL** to the owning domain schema file
   (`src/lib/domain/<domain>/schema.ts`) if fresh vaults should get the table via
   the baseline path, or rely on the migration alone for additive changes.

5. **Add TypeScript types** in `src/types/index.ts` or the feature's types file:
   ```typescript
   export interface [TypeName] {
     id: string;
     // your fields — snake_case, matching columns exactly
     created_at: string;
   }
   ```

6. **Apply it**:
   - App boot (`getDb()`) runs pending migrations automatically.
   - Fixture/scratch vaults: `npx tsx scripts/migrate-vault.ts <path>`.

// turbo
7. **Verify build + tests**:
   ```bash
   npm test -- --run
   ```

## Checklist
- [ ] Migration id is next in sequence and registered in `MIGRATIONS[]`
- [ ] `up()` is idempotent-safe (guards / `IF NOT EXISTS`)
- [ ] Columns are snake_case and match API payload keys
- [ ] `backupBefore: true` if destructive
- [ ] TypeScript types added
- [ ] Tests green (fresh-DB path exercises the full migration list)
