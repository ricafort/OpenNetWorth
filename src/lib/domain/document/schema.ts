/**
 * Milestone 1 Document Ingestion & Processing Relational Schema
 * 
 * Why this file exists:
 * Defines the DDL schema for managing untrusted document files, background processing jobs,
 * and extracted financial proposals.
 * 
 * Tricky logic:
 * - Content hash uniqueness on `m1_documents` detects identical files uploaded under different names.
 * - `m1_document_jobs` tracks lease timeouts (`lease_until`) allowing abandoned or interrupted
 *   worker jobs to be safely resumed upon application restart without duplication.
 * - `m1_proposals` remain isolated from accepted financial accounts until explicit user approval.
 * 
 * TODO: Add blob chunking table if files larger than 50MB are supported locally.
 */

import Database from 'better-sqlite3';

export const DOCUMENT_SCHEMA_DDL = `
    -- Retained Documents & Original Files
    CREATE TABLE IF NOT EXISTS m1_documents (
        id TEXT PRIMARY KEY,
        filename TEXT NOT NULL,
        content_hash TEXT NOT NULL UNIQUE, -- SHA-256
        mime_type TEXT NOT NULL,
        byte_size INTEGER NOT NULL,
        storage_path TEXT,
        raw_content TEXT, -- Stored raw file text/content for offline durability
        created_at TEXT NOT NULL
    );

    -- Reusable Bank CSV Column Mappings (Slice 1E)
    CREATE TABLE IF NOT EXISTS m1_csv_mappings (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        header_signature TEXT NOT NULL, -- Canonical pipe-separated header list for auto-matching
        date_column TEXT NOT NULL,
        date_format TEXT NOT NULL DEFAULT 'YYYY-MM-DD',
        description_column TEXT NOT NULL,
        amount_mode TEXT NOT NULL DEFAULT 'single_amount' CHECK (amount_mode IN ('single_amount', 'debit_credit')),
        amount_column TEXT,
        debit_column TEXT,
        credit_column TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
    );

    -- Durable Preparation & Background Jobs
    CREATE TABLE IF NOT EXISTS m1_document_jobs (
        id TEXT PRIMARY KEY,
        document_id TEXT NOT NULL,
        state TEXT NOT NULL DEFAULT 'queued' CHECK (state IN ('queued', 'processing', 'ready_for_review', 'partially_extracted', 'failed')),
        attempts INTEGER NOT NULL DEFAULT 0,
        lease_until INTEGER, -- Unix timestamp in seconds
        error_message TEXT,
        options TEXT, -- JSON options (e.g. model, service)
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        FOREIGN KEY (document_id) REFERENCES m1_documents(id) ON DELETE CASCADE
    );

    -- Extracted Financial Proposals (Provisional Records)
    CREATE TABLE IF NOT EXISTS m1_proposals (
        id TEXT PRIMARY KEY,
        document_id TEXT NOT NULL,
        entity_id TEXT,
        account_id TEXT,
        event_date TEXT NOT NULL, -- YYYY-MM-DD
        document_period TEXT,
        original_currency TEXT NOT NULL,
        amount_cents INTEGER NOT NULL,
        counterparty TEXT,
        description TEXT NOT NULL,
        event_type TEXT NOT NULL CHECK (event_type IN ('income', 'expense', 'transfer', 'repayment', 'valuation_adjustment')),
        suggested_category TEXT,
        evidence_json TEXT NOT NULL, -- JSON EvidenceReference
        extraction_version TEXT NOT NULL,
        validation_findings TEXT, -- JSON array of ValidationFinding
        review_status TEXT NOT NULL DEFAULT 'unreviewed' CHECK (review_status IN ('unreviewed', 'approved', 'rejected', 'modified')),
        related_proposal_ids TEXT, -- JSON array of related proposal IDs
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        FOREIGN KEY (document_id) REFERENCES m1_documents(id) ON DELETE CASCADE
    );

    -- Indices
    CREATE INDEX IF NOT EXISTS idx_m1_documents_hash ON m1_documents(content_hash);
    CREATE INDEX IF NOT EXISTS idx_m1_csv_mappings_sig ON m1_csv_mappings(header_signature);
    CREATE INDEX IF NOT EXISTS idx_m1_proposals_doc ON m1_proposals(document_id);
    CREATE INDEX IF NOT EXISTS idx_m1_proposals_status ON m1_proposals(review_status);
    CREATE INDEX IF NOT EXISTS idx_m1_document_jobs_state ON m1_document_jobs(state);
`;

/**
 * Applies transactional migrations to the document schema for existing databases.
 * 
 * Why this exists:
 * When upgrading existing databases that already have `m1_documents` created without
 * `raw_content` or without `m1_csv_mappings`, this ensures safe, non-destructive migration.
 * 
 * Tricky logic:
 * Checks table column definitions using `PRAGMA table_info` before attempting `ALTER TABLE`.
 * Runs inside a transaction to guarantee atomicity.
 * 
 * TODO: Add schema version table tracking if future document migrations require multi-step data transformations.
 */
export function migrateDocumentSchema(db: Database.Database): void {
    const runMigration = db.transaction(() => {
        // 1. Check if m1_documents table exists and needs raw_content column
        const docTableExists = (db.prepare(
            "SELECT COUNT(*) as cnt FROM sqlite_master WHERE type = 'table' AND name = 'm1_documents'"
        ).get() as any).cnt > 0;

        if (docTableExists) {
            const columns = db.prepare("PRAGMA table_info(m1_documents)").all() as Array<{ name: string }>;
            const hasRawContent = columns.some(c => c.name === 'raw_content');
            if (!hasRawContent) {
                db.prepare("ALTER TABLE m1_documents ADD COLUMN raw_content TEXT").run();
            }
        }
    });

    runMigration();
}

/**
 * Initializes the Milestone 1 document processing schema on a SQLite database,
 * and applies any pending migrations idempotently.
 */
export function initDocumentSchema(db: Database.Database): void {
    db.pragma('foreign_keys = ON');
    db.exec(DOCUMENT_SCHEMA_DDL);
    migrateDocumentSchema(db);
}
