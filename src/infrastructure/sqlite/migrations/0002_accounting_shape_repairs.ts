/**
 * Migration 0002 — one-time accounting shape repairs.
 *
 * Why this exists:
 * `migrateAccountingSchema()` was written to run on every request because there was
 * no migration record. Its PRAGMA probes upgrade pre-existing tables (added columns,
 * CHECK-constraint upgrades via table rebuilds). Under this runner it executes
 * exactly once per database, which is what it always wanted to be.
 *
 * No-op on databases already at current shape (including the live vault as of
 * 2026-10 — verified by inventory).
 */

import Database from 'better-sqlite3';
import { migrateAccountingSchema } from '../../../lib/domain/accounting/schema';

export function up(db: Database.Database): void {
    migrateAccountingSchema(db);
}
