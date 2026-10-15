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
    // Same pre-rename guard as 0001: on a vault whose document tables are still the
    // m1_* originals (created by the pre-runner app, which already ran these
    // per-request repairs), the post-codemod plain-named DDL would create empty
    // twins — and its indexes would even fail (`no such table: proposals`).
    // 0008 renames the originals instead.
    const preRenameDocs =
        db.prepare("SELECT 1 FROM sqlite_master WHERE type = 'table' AND name = 'm1_documents'").get() !== undefined &&
        db.prepare("SELECT 1 FROM sqlite_master WHERE type = 'table' AND name = 'documents'").get() === undefined;
    if (preRenameDocs) return;

    migrateDocumentSchema(db);
    db.pragma('foreign_keys = ON');
    db.exec(DOCUMENT_SCHEMA_DDL);
}
