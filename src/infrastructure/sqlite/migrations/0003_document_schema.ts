/**
 * Migration 0003 — document schema (repairs first, then DDL).
 *
 * Why this exists:
 * `DOCUMENT_SCHEMA_DDL` creates indexes on columns (`linked_transaction_id`) that
 * pre-existing `m1_proposals` tables may lack, so the shape repairs must run BEFORE
 * the DDL — the same order `initDocumentSchema()` used. Fresh databases get the
 * canonical tables directly; old ones are repaired first.
 */

import Database from 'better-sqlite3';
import { migrateDocumentSchema, DOCUMENT_SCHEMA_DDL } from '../../../lib/domain/document/schema';

export function up(db: Database.Database): void {
    migrateDocumentSchema(db);
    db.pragma('foreign_keys = ON');
    db.exec(DOCUMENT_SCHEMA_DDL);
}
