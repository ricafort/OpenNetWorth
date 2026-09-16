module.exports = [
"[externals]/next/dist/compiled/next-server/app-route-turbo.runtime.dev.js [external] (next/dist/compiled/next-server/app-route-turbo.runtime.dev.js, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("next/dist/compiled/next-server/app-route-turbo.runtime.dev.js", () => require("next/dist/compiled/next-server/app-route-turbo.runtime.dev.js"));

module.exports = mod;
}),
"[externals]/next/dist/compiled/@opentelemetry/api [external] (next/dist/compiled/@opentelemetry/api, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("next/dist/compiled/@opentelemetry/api", () => require("next/dist/compiled/@opentelemetry/api"));

module.exports = mod;
}),
"[externals]/next/dist/compiled/next-server/app-page-turbo.runtime.dev.js [external] (next/dist/compiled/next-server/app-page-turbo.runtime.dev.js, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("next/dist/compiled/next-server/app-page-turbo.runtime.dev.js", () => require("next/dist/compiled/next-server/app-page-turbo.runtime.dev.js"));

module.exports = mod;
}),
"[externals]/next/dist/server/app-render/work-unit-async-storage.external.js [external] (next/dist/server/app-render/work-unit-async-storage.external.js, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("next/dist/server/app-render/work-unit-async-storage.external.js", () => require("next/dist/server/app-render/work-unit-async-storage.external.js"));

module.exports = mod;
}),
"[externals]/next/dist/server/app-render/work-async-storage.external.js [external] (next/dist/server/app-render/work-async-storage.external.js, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("next/dist/server/app-render/work-async-storage.external.js", () => require("next/dist/server/app-render/work-async-storage.external.js"));

module.exports = mod;
}),
"[externals]/next/dist/shared/lib/no-fallback-error.external.js [external] (next/dist/shared/lib/no-fallback-error.external.js, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("next/dist/shared/lib/no-fallback-error.external.js", () => require("next/dist/shared/lib/no-fallback-error.external.js"));

module.exports = mod;
}),
"[externals]/next/dist/server/app-render/after-task-async-storage.external.js [external] (next/dist/server/app-render/after-task-async-storage.external.js, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("next/dist/server/app-render/after-task-async-storage.external.js", () => require("next/dist/server/app-render/after-task-async-storage.external.js"));

module.exports = mod;
}),
"[externals]/path [external] (path, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("path", () => require("path"));

module.exports = mod;
}),
"[externals]/fs [external] (fs, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("fs", () => require("fs"));

module.exports = mod;
}),
"[project]/src/infrastructure/sqlite/db.ts [app-route] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "closeDb",
    ()=>closeDb,
    "createTestDb",
    ()=>createTestDb,
    "default",
    ()=>__TURBOPACK__default__export__,
    "getDb",
    ()=>getDb,
    "getEffectiveDbPath",
    ()=>getEffectiveDbPath,
    "initSchema",
    ()=>initSchema,
    "isTestEnvironment",
    ()=>isTestEnvironment,
    "setTestDb",
    ()=>setTestDb
]);
/**
 * OpenNetWorth Embedded SQLite Database Engine
 * 
 * Why this exists:
 * Replaces SaaS cloud databases (Supabase) with a 100% free, private, offline-first
 * embedded SQLite database. All financial data is persisted locally in `data/opennetworth.sqlite`.
 */ var __TURBOPACK__imported__module__$5b$externals$5d2f$better$2d$sqlite3__$5b$external$5d$__$28$better$2d$sqlite3$2c$__cjs$2c$__$5b$project$5d2f$node_modules$2f$better$2d$sqlite3$29$__ = __turbopack_context__.i("[externals]/better-sqlite3 [external] (better-sqlite3, cjs, [project]/node_modules/better-sqlite3)");
var __TURBOPACK__imported__module__$5b$externals$5d2f$path__$5b$external$5d$__$28$path$2c$__cjs$29$__ = __turbopack_context__.i("[externals]/path [external] (path, cjs)");
var __TURBOPACK__imported__module__$5b$externals$5d2f$fs__$5b$external$5d$__$28$fs$2c$__cjs$29$__ = __turbopack_context__.i("[externals]/fs [external] (fs, cjs)");
;
;
;
// Path to SQLite database file
const DATA_DIR = __TURBOPACK__imported__module__$5b$externals$5d2f$path__$5b$external$5d$__$28$path$2c$__cjs$29$__["default"].resolve(process.cwd(), 'data');
const DEFAULT_DB_PATH = __TURBOPACK__imported__module__$5b$externals$5d2f$path__$5b$external$5d$__$28$path$2c$__cjs$29$__["default"].join(DATA_DIR, 'opennetworth.sqlite');
function getEffectiveDbPath() {
    if (process.env.OPENNETWORTH_DB_PATH) {
        return __TURBOPACK__imported__module__$5b$externals$5d2f$path__$5b$external$5d$__$28$path$2c$__cjs$29$__["default"].resolve(process.cwd(), process.env.OPENNETWORTH_DB_PATH);
    }
    return DEFAULT_DB_PATH;
}
let dbInstance = null;
let testDbInstance = null;
function isTestEnvironment() {
    return ("TURBOPACK compile-time value", "development") === 'test' || Boolean(process.env.VITEST) || Boolean(process.env.JEST_WORKER_ID);
}
function setTestDb(db) {
    testDbInstance = db;
}
function createTestDb() {
    const db = new __TURBOPACK__imported__module__$5b$externals$5d2f$better$2d$sqlite3__$5b$external$5d$__$28$better$2d$sqlite3$2c$__cjs$2c$__$5b$project$5d2f$node_modules$2f$better$2d$sqlite3$29$__["default"](':memory:');
    db.pragma('foreign_keys = ON');
    initSchema(db);
    return db;
}
function closeDb() {
    if (testDbInstance) {
        try {
            testDbInstance.close();
        } catch  {
        // Already closed or detached
        }
        testDbInstance = null;
    }
    if (dbInstance) {
        try {
            dbInstance.close();
        } catch  {
        // Already closed or detached
        }
        dbInstance = null;
    }
}
function getDb() {
    // If running under a test runner, strictly enforce test isolation
    if (isTestEnvironment()) {
        if (!testDbInstance) {
            testDbInstance = createTestDb();
        }
        return testDbInstance;
    }
    const targetPath = getEffectiveDbPath();
    const isLiveVault = __TURBOPACK__imported__module__$5b$externals$5d2f$path__$5b$external$5d$__$28$path$2c$__cjs$29$__["default"].resolve(targetPath) === __TURBOPACK__imported__module__$5b$externals$5d2f$path__$5b$external$5d$__$28$path$2c$__cjs$29$__["default"].resolve(DEFAULT_DB_PATH);
    // Guard: Under no circumstances should test code ever reach the live application vault
    if ((("TURBOPACK compile-time value", "development") === 'test' || process.env.VITEST) && isLiveVault) {
        throw new Error('CRITICAL SECURITY GUARD: Attempted to open application vault (opennetworth.sqlite) during test execution! Tests must use an isolated in-memory database.');
    }
    if (dbInstance) {
        return dbInstance;
    }
    // Ensure parent directory exists
    const targetDir = __TURBOPACK__imported__module__$5b$externals$5d2f$path__$5b$external$5d$__$28$path$2c$__cjs$29$__["default"].dirname(targetPath);
    if (!__TURBOPACK__imported__module__$5b$externals$5d2f$fs__$5b$external$5d$__$28$fs$2c$__cjs$29$__["default"].existsSync(targetDir)) {
        __TURBOPACK__imported__module__$5b$externals$5d2f$fs__$5b$external$5d$__$28$fs$2c$__cjs$29$__["default"].mkdirSync(targetDir, {
            recursive: true
        });
    }
    // Initialize better-sqlite3 with target database file
    dbInstance = new __TURBOPACK__imported__module__$5b$externals$5d2f$better$2d$sqlite3__$5b$external$5d$__$28$better$2d$sqlite3$2c$__cjs$2c$__$5b$project$5d2f$node_modules$2f$better$2d$sqlite3$29$__["default"](targetPath);
    // Enable WAL mode for high performance concurrent reads and atomic writes
    dbInstance.pragma('journal_mode = WAL');
    dbInstance.pragma('synchronous = NORMAL');
    dbInstance.pragma('foreign_keys = ON');
    // Run initial schema creation
    initSchema(dbInstance);
    return dbInstance;
}
function initSchema(db) {
    const schema = `
        -- Profiles
        CREATE TABLE IF NOT EXISTS profiles (
            id TEXT PRIMARY KEY,
            email TEXT,
            full_name TEXT,
            avatar_url TEXT,
            privacy_mode INTEGER DEFAULT 1,
            currency_code TEXT DEFAULT 'USD',
            created_at TEXT NOT NULL
        );

        -- Assets
        CREATE TABLE IF NOT EXISTS assets (
            id TEXT PRIMARY KEY,
            user_id TEXT NOT NULL,
            name TEXT NOT NULL,
            type TEXT NOT NULL,
            value REAL NOT NULL DEFAULT 0,
            is_liquid INTEGER DEFAULT 1,
            currency TEXT DEFAULT 'USD',
            interest_rate REAL DEFAULT 0,
            investment_details TEXT,
            last_updated TEXT NOT NULL
        );

        -- Liabilities
        CREATE TABLE IF NOT EXISTS liabilities (
            id TEXT PRIMARY KEY,
            user_id TEXT NOT NULL,
            name TEXT NOT NULL,
            type TEXT NOT NULL,
            balance REAL NOT NULL DEFAULT 0,
            interest_rate REAL DEFAULT 0,
            minimum_payment REAL DEFAULT 0,
            is_good_debt INTEGER DEFAULT 0,
            currency TEXT DEFAULT 'USD',
            last_updated TEXT NOT NULL
        );

        -- Goals
        CREATE TABLE IF NOT EXISTS goals (
            id TEXT PRIMARY KEY,
            user_id TEXT NOT NULL,
            name TEXT NOT NULL,
            target_amount REAL NOT NULL,
            current_amount REAL DEFAULT 0,
            start_amount REAL DEFAULT 0,
            currency TEXT DEFAULT 'USD',
            category TEXT NOT NULL,
            deadline TEXT,
            created_at TEXT NOT NULL
        );

        -- Recurring Transactions
        CREATE TABLE IF NOT EXISTS recurring_transactions (
            id TEXT PRIMARY KEY,
            user_id TEXT NOT NULL,
            name TEXT NOT NULL,
            amount REAL NOT NULL,
            type TEXT NOT NULL,
            frequency TEXT NOT NULL,
            category TEXT NOT NULL,
            start_date TEXT NOT NULL,
            end_date TEXT,
            is_active INTEGER DEFAULT 1,
            currency TEXT DEFAULT 'USD',
            created_at TEXT NOT NULL
        );

        -- Net Worth History
        CREATE TABLE IF NOT EXISTS net_worth_history (
            id TEXT PRIMARY KEY,
            user_id TEXT NOT NULL,
            date TEXT NOT NULL,
            total_assets REAL NOT NULL,
            total_liabilities REAL NOT NULL,
            net_worth REAL NOT NULL,
            UNIQUE(user_id, date)
        );

        -- Cash Flow History
        CREATE TABLE IF NOT EXISTS cash_flow_history (
            id TEXT PRIMARY KEY,
            user_id TEXT NOT NULL,
            month TEXT NOT NULL,
            income REAL DEFAULT 0,
            expenses REAL DEFAULT 0,
            currency TEXT DEFAULT 'USD',
            UNIQUE(user_id, month)
        );

        -- Key-value settings
        CREATE TABLE IF NOT EXISTS settings (
            key TEXT PRIMARY KEY,
            value TEXT NOT NULL
        );

        -- Insert default local user profile if not present
        INSERT OR IGNORE INTO profiles (id, email, full_name, privacy_mode, currency_code, created_at)
        VALUES ('local_user', 'local@device', 'Local Vault Owner', 1, 'USD', datetime('now'));
    `;
    db.exec(schema);
}
const __TURBOPACK__default__export__ = getDb;
}),
"[project]/src/lib/domain/document/schema.ts [app-route] (ecmascript)", ((__turbopack_context__) => {
"use strict";

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
 */ __turbopack_context__.s([
    "DOCUMENT_SCHEMA_DDL",
    ()=>DOCUMENT_SCHEMA_DDL,
    "initDocumentSchema",
    ()=>initDocumentSchema,
    "migrateDocumentSchema",
    ()=>migrateDocumentSchema
]);
const DOCUMENT_SCHEMA_DDL = `
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
        review_status TEXT NOT NULL DEFAULT 'unreviewed' CHECK (review_status IN ('unreviewed', 'approved', 'rejected', 'modified', 'linked')),
        related_proposal_ids TEXT, -- JSON array of related proposal IDs
        linked_transaction_id TEXT, -- Target transaction when linked as supporting evidence (Slice 1G)
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        FOREIGN KEY (document_id) REFERENCES m1_documents(id) ON DELETE CASCADE
    );

    -- Indices
    CREATE INDEX IF NOT EXISTS idx_m1_documents_hash ON m1_documents(content_hash);
    CREATE INDEX IF NOT EXISTS idx_m1_csv_mappings_sig ON m1_csv_mappings(header_signature);
    CREATE INDEX IF NOT EXISTS idx_m1_proposals_doc ON m1_proposals(document_id);
    CREATE INDEX IF NOT EXISTS idx_m1_proposals_status ON m1_proposals(review_status);
    CREATE INDEX IF NOT EXISTS idx_m1_proposals_linked_tx ON m1_proposals(linked_transaction_id);
    CREATE INDEX IF NOT EXISTS idx_m1_document_jobs_state ON m1_document_jobs(state);
`;
function migrateDocumentSchema(db) {
    const runMigration = db.transaction(()=>{
        // 1. Check if m1_documents table exists and needs raw_content column
        const docTableExists = db.prepare("SELECT COUNT(*) as cnt FROM sqlite_master WHERE type = 'table' AND name = 'm1_documents'").get().cnt > 0;
        if (docTableExists) {
            const columns = db.prepare("PRAGMA table_info(m1_documents)").all();
            const hasRawContent = columns.some((c)=>c.name === 'raw_content');
            if (!hasRawContent) {
                db.prepare("ALTER TABLE m1_documents ADD COLUMN raw_content TEXT").run();
            }
        }
        // 2. Check if m1_proposals needs linked_transaction_id column or 'linked' CHECK constraint upgrade
        const propTableExists = db.prepare("SELECT COUNT(*) as cnt FROM sqlite_master WHERE type = 'table' AND name = 'm1_proposals'").get().cnt > 0;
        if (propTableExists) {
            const propColumns = db.prepare("PRAGMA table_info(m1_proposals)").all();
            const masterRow = db.prepare("SELECT sql FROM sqlite_master WHERE type = 'table' AND name = 'm1_proposals'").get();
            const needsCheckUpgrade = masterRow && masterRow.sql && !masterRow.sql.includes("'linked'");
            if (needsCheckUpgrade) {
                // Table recreation migration to upgrade CHECK constraint safely
                db.prepare(`
                    CREATE TABLE IF NOT EXISTS m1_proposals_upgrade_tmp (
                        id TEXT PRIMARY KEY,
                        document_id TEXT NOT NULL,
                        entity_id TEXT,
                        account_id TEXT,
                        event_date TEXT NOT NULL,
                        document_period TEXT,
                        original_currency TEXT NOT NULL,
                        amount_cents INTEGER NOT NULL,
                        counterparty TEXT,
                        description TEXT NOT NULL,
                        event_type TEXT NOT NULL CHECK (event_type IN ('income', 'expense', 'transfer', 'repayment', 'valuation_adjustment')),
                        suggested_category TEXT,
                        evidence_json TEXT NOT NULL,
                        extraction_version TEXT NOT NULL,
                        validation_findings TEXT,
                        review_status TEXT NOT NULL DEFAULT 'unreviewed' CHECK (review_status IN ('unreviewed', 'approved', 'rejected', 'modified', 'linked')),
                        related_proposal_ids TEXT,
                        linked_transaction_id TEXT,
                        created_at TEXT NOT NULL,
                        updated_at TEXT NOT NULL,
                        FOREIGN KEY (document_id) REFERENCES m1_documents(id) ON DELETE CASCADE
                    )
                `).run();
                const oldCols = propColumns.map((c)=>c.name);
                const hasOldLinked = oldCols.includes('linked_transaction_id');
                const selectCols = [
                    'id',
                    'document_id',
                    'entity_id',
                    'account_id',
                    'event_date',
                    'document_period',
                    'original_currency',
                    'amount_cents',
                    'counterparty',
                    'description',
                    'event_type',
                    'suggested_category',
                    'evidence_json',
                    'extraction_version',
                    'validation_findings',
                    'review_status',
                    'related_proposal_ids',
                    hasOldLinked ? 'linked_transaction_id' : 'NULL as linked_transaction_id',
                    'created_at',
                    'updated_at'
                ].join(', ');
                db.prepare(`INSERT INTO m1_proposals_upgrade_tmp SELECT ${selectCols} FROM m1_proposals`).run();
                db.prepare(`DROP TABLE m1_proposals`).run();
                db.prepare(`ALTER TABLE m1_proposals_upgrade_tmp RENAME TO m1_proposals`).run();
                db.prepare(`CREATE INDEX IF NOT EXISTS idx_m1_proposals_doc ON m1_proposals(document_id)`).run();
                db.prepare(`CREATE INDEX IF NOT EXISTS idx_m1_proposals_status ON m1_proposals(review_status)`).run();
                db.prepare(`CREATE INDEX IF NOT EXISTS idx_m1_proposals_linked_tx ON m1_proposals(linked_transaction_id)`).run();
            } else {
                const hasLinkedTxId = propColumns.some((c)=>c.name === 'linked_transaction_id');
                if (!hasLinkedTxId) {
                    db.prepare("ALTER TABLE m1_proposals ADD COLUMN linked_transaction_id TEXT").run();
                    db.prepare(`CREATE INDEX IF NOT EXISTS idx_m1_proposals_linked_tx ON m1_proposals(linked_transaction_id)`).run();
                }
            }
        }
    });
    // Run migration safely with foreign key toggle to allow table rebuild
    const currentFk = db.prepare("PRAGMA foreign_keys").get();
    const wasFkOn = currentFk?.foreign_keys === 1;
    if (wasFkOn) db.pragma("foreign_keys = OFF");
    try {
        runMigration();
    } finally{
        if (wasFkOn) db.pragma("foreign_keys = ON");
    }
}
function initDocumentSchema(db) {
    migrateDocumentSchema(db);
    db.pragma('foreign_keys = ON');
    db.exec(DOCUMENT_SCHEMA_DDL);
}
}),
"[project]/src/lib/domain/accounting/schema.ts [app-route] (ecmascript)", ((__turbopack_context__) => {
"use strict";

/**
 * Milestone 1 Double-Entry Accounting Relational Database Schema
 * 
 * Why this file exists:
 * Defines the DDL schema for OpenNetWorth's double-entry accounting engine:
 * entities, financial accounts, ownership shares, transactions, journal entries,
 * and auditable correction trails.
 * 
 * Tricky logic:
 * - Foreign keys enforce referential integrity between postings and transactions.
 * - Idempotency key uniqueness on transactions prevents duplicate submissions on retry.
 * - Optimistic concurrency control is backed by `revision INTEGER NOT NULL DEFAULT 1`.
 * - Table prefix `m1_` ensures zero conflict or locks with existing Milestone 0 tables.
 * 
 * TODO: Add partitioned tables for high-volume enterprise ledgers in future milestones.
 */ __turbopack_context__.s([
    "ACCOUNTING_SCHEMA_DDL",
    ()=>ACCOUNTING_SCHEMA_DDL,
    "initAccountingSchema",
    ()=>initAccountingSchema,
    "migrateAccountingSchema",
    ()=>migrateAccountingSchema
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$domain$2f$document$2f$schema$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/lib/domain/document/schema.ts [app-route] (ecmascript)");
;
const ACCOUNTING_SCHEMA_DDL = `
    -- Entities (Persons, Households, Businesses, Trusts)
    CREATE TABLE IF NOT EXISTS m1_entities (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        type TEXT NOT NULL CHECK (type IN ('person', 'household', 'business', 'trust')),
        currency TEXT NOT NULL DEFAULT 'USD',
        parent_entity_id TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        FOREIGN KEY (parent_entity_id) REFERENCES m1_entities(id) ON DELETE SET NULL
    );

    -- Financial Accounts
    CREATE TABLE IF NOT EXISTS m1_accounts (
        id TEXT PRIMARY KEY,
        entity_id TEXT NOT NULL,
        name TEXT NOT NULL,
        type TEXT NOT NULL CHECK (type IN ('asset', 'liability', 'equity', 'income', 'expense', 'suspense')),
        sub_type TEXT NOT NULL,
        currency TEXT NOT NULL DEFAULT 'USD',
        is_active INTEGER NOT NULL DEFAULT 1,
        institution TEXT,
        account_number_mask TEXT,
        opening_date TEXT,
        opening_balance_cents INTEGER,
        revision INTEGER NOT NULL DEFAULT 1,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        FOREIGN KEY (entity_id) REFERENCES m1_entities(id) ON DELETE CASCADE
    );

    -- Account Ownership Allocations (e.g. 50/50 joint property)
    CREATE TABLE IF NOT EXISTS m1_account_ownership (
        id TEXT PRIMARY KEY,
        account_id TEXT NOT NULL,
        entity_id TEXT NOT NULL,
        share_percentage REAL NOT NULL CHECK (share_percentage > 0 AND share_percentage <= 100),
        created_at TEXT NOT NULL,
        FOREIGN KEY (account_id) REFERENCES m1_accounts(id) ON DELETE CASCADE,
        FOREIGN KEY (entity_id) REFERENCES m1_entities(id) ON DELETE CASCADE,
        UNIQUE(account_id, entity_id)
    );

    -- Transactions (Header)
    CREATE TABLE IF NOT EXISTS m1_transactions (
        id TEXT PRIMARY KEY,
        date TEXT NOT NULL, -- YYYY-MM-DD
        description TEXT NOT NULL,
        payee_or_payer TEXT,
        status TEXT NOT NULL DEFAULT 'posted' CHECK (status IN ('draft', 'posted', 'void')),
        origin TEXT NOT NULL DEFAULT 'manual' CHECK (origin IN ('manual', 'document_extraction', 'opening_balance', 'migration', 'recurring')),
        idempotency_key TEXT UNIQUE,
        evidence_refs TEXT, -- JSON array of evidence reference strings
        revision INTEGER NOT NULL DEFAULT 1,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
    );

    -- Journal Entries / Postings (Legs)
    CREATE TABLE IF NOT EXISTS m1_journal_entries (
        id TEXT PRIMARY KEY,
        transaction_id TEXT NOT NULL,
        account_id TEXT NOT NULL,
        amount_cents INTEGER NOT NULL, -- Signed integer: positive = Debit, negative = Credit
        currency TEXT NOT NULL,
        exchange_rate REAL,
        rate_unresolved INTEGER DEFAULT 0,
        memo TEXT,
        FOREIGN KEY (transaction_id) REFERENCES m1_transactions(id) ON DELETE CASCADE,
        FOREIGN KEY (account_id) REFERENCES m1_accounts(id) ON DELETE CASCADE
    );

    -- Auditable Transaction Corrections
    CREATE TABLE IF NOT EXISTS m1_transaction_corrections (
        id TEXT PRIMARY KEY,
        transaction_id TEXT NOT NULL,
        operation TEXT NOT NULL CHECK (operation IN ('edit', 'void', 'reversal', 'revaluation_cascade')),
        reason TEXT NOT NULL,
        previous_state TEXT NOT NULL, -- JSON string
        corrected_state TEXT NOT NULL, -- JSON string
        performed_by TEXT NOT NULL,
        timestamp TEXT NOT NULL,
        FOREIGN KEY (transaction_id) REFERENCES m1_transactions(id) ON DELETE CASCADE
    );

    -- Dated Exchange Rates (Slice 1D: Currency Completeness & Conversion)
    CREATE TABLE IF NOT EXISTS m1_exchange_rates (
        id TEXT PRIMARY KEY,
        from_currency TEXT NOT NULL,
        to_currency TEXT NOT NULL,
        rate REAL NOT NULL CHECK (rate > 0),
        effective_date TEXT NOT NULL, -- YYYY-MM-DD
        source TEXT NOT NULL,
        created_at TEXT NOT NULL,
        UNIQUE(from_currency, to_currency, effective_date)
    );

    -- Asset Valuations (Slice 1D: Historical Valuation Target Tracking & Cascading)
    -- Why this table exists:
    -- Preserves the absolute target valuation for non-cash assets across time.
    -- When earlier or backdated valuations are inserted, subsequent valuation transactions
    -- can be cascaded so that later valuation targets are strictly preserved (M1-FLOW-06, T6).
    CREATE TABLE IF NOT EXISTS m1_asset_valuations (
        id TEXT PRIMARY KEY,
        transaction_id TEXT NOT NULL UNIQUE,
        account_id TEXT NOT NULL,
        valuation_date TEXT NOT NULL,
        target_valuation_cents INTEGER NOT NULL,
        source TEXT,
        created_at TEXT NOT NULL,
        FOREIGN KEY (transaction_id) REFERENCES m1_transactions(id) ON DELETE CASCADE,
        FOREIGN KEY (account_id) REFERENCES m1_accounts(id) ON DELETE CASCADE
    );

    -- Indices for high performance ledger and report queries
    CREATE INDEX IF NOT EXISTS idx_m1_journal_entries_account ON m1_journal_entries(account_id);
    CREATE INDEX IF NOT EXISTS idx_m1_journal_entries_tx ON m1_journal_entries(transaction_id);
    CREATE INDEX IF NOT EXISTS idx_m1_transactions_date ON m1_transactions(date);
    CREATE INDEX IF NOT EXISTS idx_m1_accounts_entity ON m1_accounts(entity_id);
    CREATE INDEX IF NOT EXISTS idx_m1_account_ownership_acc ON m1_account_ownership(account_id);
    CREATE INDEX IF NOT EXISTS idx_m1_account_ownership_ent ON m1_account_ownership(entity_id);
    CREATE INDEX IF NOT EXISTS idx_m1_exchange_rates_lookup ON m1_exchange_rates(from_currency, to_currency, effective_date);
    CREATE INDEX IF NOT EXISTS idx_m1_asset_valuations_acc_date ON m1_asset_valuations(account_id, valuation_date);
`;
function migrateAccountingSchema(db) {
    const runMigration = db.transaction(()=>{
        // 1. Check if m1_asset_valuations table exists
        const valTableExists = db.prepare("SELECT COUNT(*) as cnt FROM sqlite_master WHERE type = 'table' AND name = 'm1_asset_valuations'").get().cnt > 0;
        if (valTableExists) {
            const columns = db.prepare("PRAGMA table_info(m1_asset_valuations)").all();
            const hasSource = columns.some((c)=>c.name === 'source');
            if (!hasSource) {
                db.prepare("ALTER TABLE m1_asset_valuations ADD COLUMN source TEXT").run();
            }
        }
        // 2. Check if m1_transaction_corrections table exists and needs CHECK constraint upgrade
        const corrTableExists = db.prepare("SELECT COUNT(*) as cnt FROM sqlite_master WHERE type = 'table' AND name = 'm1_transaction_corrections'").get().cnt > 0;
        if (corrTableExists) {
            const tableSql = db.prepare("SELECT sql FROM sqlite_master WHERE type = 'table' AND name = 'm1_transaction_corrections'").get()?.sql || '';
            // If the table definition does not include 'revaluation_cascade', upgrade it
            if (!tableSql.includes('revaluation_cascade')) {
                // Table rebuild pattern
                db.prepare(`
                    CREATE TABLE m1_transaction_corrections_new (
                        id TEXT PRIMARY KEY,
                        transaction_id TEXT NOT NULL,
                        operation TEXT NOT NULL CHECK (operation IN ('edit', 'void', 'reversal', 'revaluation_cascade')),
                        reason TEXT NOT NULL,
                        previous_state TEXT NOT NULL,
                        corrected_state TEXT NOT NULL,
                        performed_by TEXT NOT NULL,
                        timestamp TEXT NOT NULL,
                        FOREIGN KEY (transaction_id) REFERENCES m1_transactions(id) ON DELETE CASCADE
                    )
                `).run();
                db.prepare(`
                    INSERT INTO m1_transaction_corrections_new (
                        id, transaction_id, operation, reason, previous_state, corrected_state, performed_by, timestamp
                    ) SELECT id, transaction_id, operation, reason, previous_state, corrected_state, performed_by, timestamp
                    FROM m1_transaction_corrections
                `).run();
                db.prepare("DROP TABLE m1_transaction_corrections").run();
                db.prepare("ALTER TABLE m1_transaction_corrections_new RENAME TO m1_transaction_corrections").run();
            }
        }
    });
    // Run migration safely with foreign key toggle
    const currentFk = db.prepare("PRAGMA foreign_keys").get();
    const wasFkOn = currentFk?.foreign_keys === 1;
    if (wasFkOn) db.pragma("foreign_keys = OFF");
    try {
        runMigration();
    } finally{
        if (wasFkOn) db.pragma("foreign_keys = ON");
    }
}
function initAccountingSchema(db) {
    db.pragma('foreign_keys = ON');
    db.exec(ACCOUNTING_SCHEMA_DDL);
    migrateAccountingSchema(db);
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$domain$2f$document$2f$schema$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["initDocumentSchema"])(db);
}
}),
"[externals]/crypto [external] (crypto, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("crypto", () => require("crypto"));

module.exports = mod;
}),
"[project]/src/lib/domain/accounting/types.ts [app-route] (ecmascript)", ((__turbopack_context__) => {
"use strict";

/**
 * Milestone 1 Accounting Domain Models & Exact Monetary Representation
 * 
 * Why this file exists:
 * Provides the foundational domain models and mathematical invariants for OpenNetWorth's
 * double-entry accounting engine. Establishes exact integer minor-unit (cents) arithmetic
 * to eliminate binary floating-point errors (IEEE 754) and defines entities, accounts,
 * balanced transactions, postings, and correction trails.
 * 
 * Tricky logic:
 * - Monetary amounts are strictly safe integers representing minor currency units (cents).
 *   For example, USD 12.50 is stored as 1250 cents. JPY has scale 0 (100 JPY is 100).
 * - Multi-currency support enforces that unlike currencies cannot be added directly.
 * - Transactions must balance: Sum(Debits) - Sum(Credits) = 0. We represent Debits as positive
 *   and Credits as negative, so Sum(amount_cents) === 0.
 * 
 * TODO: Add support for multi-currency automated revaluation journals in future milestones.
 */ // Supported ISO 4217 Currency Codes with their minor unit scale (decimals)
__turbopack_context__.s([
    "CURRENCY_DECIMALS",
    ()=>CURRENCY_DECIMALS,
    "addMoney",
    ()=>addMoney,
    "assertValidMoneyCents",
    ()=>assertValidMoneyCents,
    "formatMoney",
    ()=>formatMoney,
    "multiplyMoneyRatio",
    ()=>multiplyMoneyRatio,
    "parseToCents",
    ()=>parseToCents,
    "subtractMoney",
    ()=>subtractMoney,
    "validateTransactionBalance",
    ()=>validateTransactionBalance
]);
const CURRENCY_DECIMALS = {
    USD: 2,
    AUD: 2,
    EUR: 2,
    GBP: 2,
    CAD: 2,
    NZD: 2,
    CHF: 2,
    JPY: 0,
    SGD: 2,
    HKD: 2
};
function assertValidMoneyCents(cents, context = 'Amount') {
    if (!Number.isFinite(cents) || !Number.isInteger(cents) || !Number.isSafeInteger(cents)) {
        throw new Error(`${context} must be a safe, finite integer representing minor currency units (cents), received: ${cents}`);
    }
}
function addMoney(a, b) {
    if (a.currency !== b.currency) {
        throw new Error(`Cannot add unlike currencies: ${a.currency} and ${b.currency}. Explicit currency conversion is required.`);
    }
    const sum = a.amount_cents + b.amount_cents;
    assertValidMoneyCents(sum, 'Sum of money');
    return {
        amount_cents: sum,
        currency: a.currency
    };
}
function subtractMoney(a, b) {
    if (a.currency !== b.currency) {
        throw new Error(`Cannot subtract unlike currencies: ${a.currency} and ${b.currency}. Explicit currency conversion is required.`);
    }
    const diff = a.amount_cents - b.amount_cents;
    assertValidMoneyCents(diff, 'Difference of money');
    return {
        amount_cents: diff,
        currency: a.currency
    };
}
function multiplyMoneyRatio(m, ratio) {
    if (!Number.isFinite(ratio)) {
        throw new Error(`Multiplication ratio must be a finite number, received: ${ratio}`);
    }
    const result = Math.round(m.amount_cents * ratio);
    assertValidMoneyCents(result, 'Multiplied money');
    return {
        amount_cents: result,
        currency: m.currency
    };
}
function parseToCents(val, currency = 'USD') {
    if (val === null || val === undefined || val === '') {
        throw new Error('Monetary value cannot be null, undefined, or empty.');
    }
    const num = typeof val === 'string' ? parseFloat(val.replace(/[$, ]/g, '')) : val;
    if (!Number.isFinite(num)) {
        throw new Error(`Invalid monetary value: "${val}". Value must be a finite number.`);
    }
    const decimals = CURRENCY_DECIMALS[currency] ?? 2;
    const factor = Math.pow(10, decimals);
    const cents = Math.round(num * factor);
    assertValidMoneyCents(cents, `Parsed cents for ${val}`);
    return cents;
}
function formatMoney(money) {
    const decimals = CURRENCY_DECIMALS[money.currency] ?? 2;
    const divisor = Math.pow(10, decimals);
    const major = money.amount_cents / divisor;
    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: money.currency,
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals
    }).format(major);
}
function validateTransactionBalance(postings) {
    if (!postings || postings.length < 2) {
        throw new Error('Transaction must contain at least two postings to satisfy double-entry accounting.');
    }
    const primaryCurrency = postings[0].currency;
    let sumCents = 0;
    for (const p of postings){
        if (p.currency !== primaryCurrency) {
            throw new Error(`Cross-currency postings within a single un-hedged transaction are not supported in Milestone 1: encountered ${p.currency} vs ${primaryCurrency}.`);
        }
        assertValidMoneyCents(p.amount_cents, 'Posting amount');
        sumCents += p.amount_cents;
    }
    return {
        isValid: sumCents === 0,
        delta_cents: sumCents,
        currency: primaryCurrency
    };
}
}),
"[project]/src/lib/domain/document/csvParserService.ts [app-route] (ecmascript)", ((__turbopack_context__) => {
"use strict";

/**
 * Milestone 1 Bank CSV Parser & Row Validation Service (Slice 1E)
 * 
 * Why this file exists:
 * Provides robust, pure-TypeScript CSV parsing, header signature detection, calendar date
 * normalization, exact minor-unit money parsing, and row-level validation findings for bank CSVs.
 * Conforms to ADR 001 Decision 2 (Tier 1 direct native TS parser).
 * 
 * Tricky logic:
 * - RFC 4180 compliance: Handles quotes with embedded commas, escaped quotes (""), and multiline cells.
 * - Accounting amounts: Recognizes parentheses negatives (e.g. "(45.50)" -> -4550 cents) as well as
 *   minus signs ("-45.50" -> -4550 cents) and currency symbols ("$1,250.00").
 * - Calendar dates: Strictly checks day-of-month and month bounds (e.g. 2026-02-31 is rejected).
 * - Zero guesswork: If an amount or date is missing, empty, or unparseable, it is recorded as an error
 *   finding and amount_cents / date remains null. Unsupported rows remain unresolved; never guess missing amounts.
 * 
 * TODO: Add support for custom locale thousand/decimal delimiters (e.g. European "1.250,50 €") in future milestones.
 */ __turbopack_context__.s([
    "computeHeaderSignature",
    ()=>computeHeaderSignature,
    "parseCsvAmount",
    ()=>parseCsvAmount,
    "parseCsvDate",
    ()=>parseCsvDate,
    "parseCsvWithMapping",
    ()=>parseCsvWithMapping,
    "parseRawCsv",
    ()=>parseRawCsv
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$domain$2f$accounting$2f$types$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/lib/domain/accounting/types.ts [app-route] (ecmascript)");
;
function computeHeaderSignature(headers) {
    return headers.map((h)=>h.trim().toLowerCase()).filter(Boolean).sort().join('|');
}
function parseRawCsv(content) {
    if (!content || !content.trim()) {
        return {
            headers: [],
            rows: [],
            rawLines: []
        };
    }
    const rows = [];
    const rawLines = [];
    let currentRow = [];
    let currentCell = '';
    let inQuotes = false;
    let currentLineStartIndex = 0;
    const chars = content;
    const len = chars.length;
    for(let i = 0; i < len; i++){
        const char = chars[i];
        const nextChar = i + 1 < len ? chars[i + 1] : '';
        if (char === '"') {
            if (inQuotes && nextChar === '"') {
                // Escaped double quote
                currentCell += '"';
                i++; // Skip next quote
            } else {
                // Toggle quote state
                inQuotes = !inQuotes;
            }
        } else if (char === ',' && !inQuotes) {
            // End of field
            currentRow.push(currentCell.trim());
            currentCell = '';
        } else if ((char === '\r' || char === '\n') && !inQuotes) {
            // Handle \r\n or \n
            if (char === '\r' && nextChar === '\n') {
                i++; // Consume \n
            }
            currentRow.push(currentCell.trim());
            currentCell = '';
            // Extract raw line text
            const lineEndIndex = i + 1;
            const lineText = content.substring(currentLineStartIndex, lineEndIndex).replace(/[\r\n]+$/, '');
            currentLineStartIndex = lineEndIndex;
            // Only add non-empty rows
            const hasAnyContent = currentRow.some((c)=>c.length > 0);
            if (hasAnyContent) {
                rows.push(currentRow);
                rawLines.push(lineText);
            }
            currentRow = [];
        } else {
            currentCell += char;
        }
    }
    // Process last cell/row if content didn't end with newline
    if (currentCell.length > 0 || currentRow.length > 0) {
        currentRow.push(currentCell.trim());
        const lineText = content.substring(currentLineStartIndex).replace(/[\r\n]+$/, '');
        if (currentRow.some((c)=>c.length > 0)) {
            rows.push(currentRow);
            rawLines.push(lineText);
        }
    }
    if (rows.length === 0) {
        return {
            headers: [],
            rows: [],
            rawLines: []
        };
    }
    const headers = rows[0].map((h)=>h.trim());
    const dataRows = rows.slice(1);
    const dataRawLines = rawLines.slice(1);
    return {
        headers,
        rows: dataRows,
        rawLines: dataRawLines
    };
}
function parseCsvDate(dateStr, format) {
    if (!dateStr || !dateStr.trim()) {
        return {
            date: null,
            error: 'Date field is empty or missing.'
        };
    }
    const trimmed = dateStr.trim();
    let year = 0;
    let month = 0;
    let day = 0;
    if (format === 'YYYY-MM-DD') {
        const match = trimmed.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})$/);
        if (!match) {
            return {
                date: null,
                error: `Date "${trimmed}" does not match expected format YYYY-MM-DD.`
            };
        }
        year = parseInt(match[1], 10);
        month = parseInt(match[2], 10);
        day = parseInt(match[3], 10);
    } else if (format === 'DD/MM/YYYY') {
        const match = trimmed.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{4})$/);
        if (!match) {
            return {
                date: null,
                error: `Date "${trimmed}" does not match expected format DD/MM/YYYY.`
            };
        }
        day = parseInt(match[1], 10);
        month = parseInt(match[2], 10);
        year = parseInt(match[3], 10);
    } else if (format === 'MM/DD/YYYY') {
        const match = trimmed.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{4})$/);
        if (!match) {
            return {
                date: null,
                error: `Date "${trimmed}" does not match expected format MM/DD/YYYY.`
            };
        }
        month = parseInt(match[1], 10);
        day = parseInt(match[2], 10);
        year = parseInt(match[3], 10);
    } else {
        return {
            date: null,
            error: `Unsupported date format: ${format}`
        };
    }
    // Validate real calendar bounds
    const parsed = new Date(Date.UTC(year, month - 1, day));
    if (isNaN(parsed.getTime()) || parsed.getUTCFullYear() !== year || parsed.getUTCMonth() + 1 !== month || parsed.getUTCDate() !== day) {
        return {
            date: null,
            error: `Date "${trimmed}" is not a valid calendar day.`
        };
    }
    const isoYear = String(year).padStart(4, '0');
    const isoMonth = String(month).padStart(2, '0');
    const isoDay = String(day).padStart(2, '0');
    return {
        date: `${isoYear}-${isoMonth}-${isoDay}`
    };
}
function parseCsvAmount(amountStr, currency = 'USD') {
    if (!amountStr || !amountStr.trim()) {
        return {
            amount_cents: null,
            error: 'Amount field is empty or missing.'
        };
    }
    const curr = (currency || 'USD').toUpperCase();
    if (!(curr in __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$domain$2f$accounting$2f$types$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["CURRENCY_DECIMALS"])) {
        return {
            amount_cents: null,
            error: `Unsupported currency code: "${currency}". Supported currencies are: ${Object.keys(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$domain$2f$accounting$2f$types$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["CURRENCY_DECIMALS"]).join(', ')}.`
        };
    }
    const decimals = __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$domain$2f$accounting$2f$types$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["CURRENCY_DECIMALS"][curr];
    const factor = Math.pow(10, decimals);
    let str = amountStr.trim();
    let isNegative = false;
    // 1. Check for parentheses negatives: e.g. "(124.50)" or "($124.50)"
    if (str.startsWith('(') && str.endsWith(')')) {
        isNegative = true;
        str = str.substring(1, str.length - 1).trim();
    }
    // 2. Check for DR / CR suffixes
    if (str.endsWith('DR') || str.endsWith('dr')) {
        isNegative = true;
        str = str.substring(0, str.length - 2).trim();
    } else if (str.endsWith('CR') || str.endsWith('cr')) {
        isNegative = false;
        str = str.substring(0, str.length - 2).trim();
    }
    // 3. Check for leading/trailing sign
    if (str.startsWith('-')) {
        isNegative = !isNegative;
        str = str.substring(1).trim();
    } else if (str.startsWith('+')) {
        str = str.substring(1).trim();
    }
    if (str.endsWith('-')) {
        isNegative = !isNegative;
        str = str.substring(0, str.length - 1).trim();
    } else if (str.endsWith('+')) {
        str = str.substring(0, str.length - 1).trim();
    }
    // 4. Strip known currency symbol or 3-letter currency code prefix/suffix
    str = str.replace(/^[$£€¥]\s*/, '');
    str = str.replace(/^[A-Za-z]{3}\s+/, '');
    str = str.replace(/\s+[A-Za-z]{3}$/, '');
    // Re-check leading sign after currency symbol (e.g. "$-124.50")
    if (str.startsWith('-')) {
        isNegative = !isNegative;
        str = str.substring(1).trim();
    } else if (str.startsWith('+')) {
        str = str.substring(1).trim();
    }
    // 5. Strict Whole-Value Validation:
    // Must strictly match either grouped format (1,234.56) or plain digits with optional decimal (1234.56 or 1234)
    // No trailing garbage (like "100.50abc"), no multiple dots ("12.34.56"), no malformed separators ("12,34,56")
    const isGrouped = /^\d{1,3}(,\d{3})+(\.\d+)?$/.test(str);
    const isPlain = /^\d+(\.\d+)?$/.test(str);
    if (!isGrouped && !isPlain) {
        return {
            amount_cents: null,
            error: `Invalid monetary value: "${amountStr}". Entire value must be a valid numeric amount.`
        };
    }
    // 6. Scale and Decimal Places Enforcement
    const plain = str.replace(/,/g, '');
    const parts = plain.split('.');
    const wholeStr = parts[0];
    const fracStr = parts.length > 1 ? parts[1] : '';
    if (decimals === 0) {
        // Zero-scale currencies (e.g. JPY)
        if (fracStr.length > 0 && parseInt(fracStr, 10) !== 0) {
            return {
                amount_cents: null,
                error: `Currency ${curr} does not support fractional decimal units: "${amountStr}".`
            };
        }
    } else if (fracStr.length > decimals) {
        return {
            amount_cents: null,
            error: `Amount "${amountStr}" has ${fracStr.length} decimal places, exceeding the maximum scale of ${decimals} for ${curr}.`
        };
    }
    const whole = parseInt(wholeStr, 10);
    const frac = decimals > 0 ? parseInt(fracStr.padEnd(decimals, '0'), 10) : 0;
    let cents = whole * factor + frac;
    if (isNegative && cents > 0) {
        cents = -cents;
    }
    try {
        (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$domain$2f$accounting$2f$types$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["assertValidMoneyCents"])(cents, `Parsed CSV amount for "${amountStr}"`);
    } catch (err) {
        return {
            amount_cents: null,
            error: err.message
        };
    }
    return {
        amount_cents: cents
    };
}
function parseCsvWithMapping(content, mapping, currency = 'USD') {
    const { headers, rows, rawLines } = parseRawCsv(content);
    const signature = computeHeaderSignature(headers);
    const lowerHeaders = headers.map((h)=>h.toLowerCase());
    const dateColIdx = lowerHeaders.indexOf(mapping.date_column.toLowerCase());
    const descColIdx = lowerHeaders.indexOf(mapping.description_column.toLowerCase());
    let amountColIdx = -1;
    let debitColIdx = -1;
    let creditColIdx = -1;
    if (mapping.amount_mode === 'single_amount') {
        if (mapping.amount_column) {
            amountColIdx = lowerHeaders.indexOf(mapping.amount_column.toLowerCase());
        }
    } else {
        if (mapping.debit_column) {
            debitColIdx = lowerHeaders.indexOf(mapping.debit_column.toLowerCase());
        }
        if (mapping.credit_column) {
            creditColIdx = lowerHeaders.indexOf(mapping.credit_column.toLowerCase());
        }
    }
    const parsedRows = [];
    let validCount = 0;
    let errorCount = 0;
    for(let r = 0; r < rows.length; r++){
        const row = rows[r];
        const rawLine = rawLines[r] || row.join(',');
        const rowNumber = r + 2; // +1 for 1-based index, +1 for header row
        const findings = [];
        // 1. Date Extraction & Validation
        let canonicalDate = null;
        const rawDate = dateColIdx >= 0 && dateColIdx < row.length ? row[dateColIdx] : '';
        if (dateColIdx === -1) {
            findings.push({
                severity: 'error',
                code: 'MISSING_DATE_COLUMN',
                message: `Date column "${mapping.date_column}" not found in CSV headers.`,
                field: 'date'
            });
        } else {
            const dateResult = parseCsvDate(rawDate, mapping.date_format);
            if (dateResult.date) {
                canonicalDate = dateResult.date;
            } else {
                findings.push({
                    severity: 'error',
                    code: 'INVALID_DATE',
                    message: dateResult.error || 'Failed to parse date.',
                    field: 'date'
                });
            }
        }
        // 2. Description Extraction & Validation
        let description = '';
        if (descColIdx >= 0 && descColIdx < row.length) {
            description = row[descColIdx].trim();
        }
        if (!description) {
            findings.push({
                severity: 'warning',
                code: 'EMPTY_DESCRIPTION',
                message: 'Transaction description is empty.',
                field: 'description'
            });
            description = 'Unspecified Transaction';
        }
        // 3. Amount Extraction & Validation
        let amountCents = null;
        let rawAmount = '';
        let eventType = 'expense';
        if (mapping.amount_mode === 'single_amount') {
            if (amountColIdx === -1) {
                findings.push({
                    severity: 'error',
                    code: 'MISSING_AMOUNT_COLUMN',
                    message: `Amount column "${mapping.amount_column}" not found in CSV headers.`,
                    field: 'amount'
                });
            } else {
                rawAmount = amountColIdx < row.length ? row[amountColIdx] : '';
                const amtResult = parseCsvAmount(rawAmount, currency);
                if (amtResult.amount_cents !== null) {
                    amountCents = amtResult.amount_cents;
                    if (amountCents > 0) {
                        eventType = 'income';
                    } else if (amountCents < 0) {
                        eventType = 'expense';
                    } else {
                        findings.push({
                            severity: 'warning',
                            code: 'ZERO_AMOUNT',
                            message: 'Transaction amount is zero cents.',
                            field: 'amount'
                        });
                        eventType = 'expense';
                    }
                } else {
                    findings.push({
                        severity: 'error',
                        code: 'INVALID_AMOUNT',
                        message: amtResult.error || 'Failed to parse amount.',
                        field: 'amount'
                    });
                }
            }
        } else {
            // Debit / Credit mode
            const rawDebit = debitColIdx >= 0 && debitColIdx < row.length ? row[debitColIdx] : '';
            const rawCredit = creditColIdx >= 0 && creditColIdx < row.length ? row[creditColIdx] : '';
            rawAmount = `Debit: ${rawDebit || '-'}, Credit: ${rawCredit || '-'}`;
            const hasDebit = rawDebit && rawDebit.trim().length > 0 && rawDebit.trim() !== '0' && rawDebit.trim() !== '0.00';
            const hasCredit = rawCredit && rawCredit.trim().length > 0 && rawCredit.trim() !== '0' && rawCredit.trim() !== '0.00';
            if (hasDebit && hasCredit) {
                findings.push({
                    severity: 'error',
                    code: 'AMBIGUOUS_AMOUNT',
                    message: 'Both Debit and Credit have non-zero amounts on the same row.',
                    field: 'amount'
                });
            } else if (hasDebit) {
                const debitResult = parseCsvAmount(rawDebit, currency);
                if (debitResult.amount_cents !== null) {
                    // Outflow / Debit to bank is an expense (negative minor unit)
                    const absDebit = Math.abs(debitResult.amount_cents);
                    amountCents = -absDebit;
                    eventType = 'expense';
                } else {
                    findings.push({
                        severity: 'error',
                        code: 'INVALID_DEBIT_AMOUNT',
                        message: debitResult.error || 'Failed to parse debit amount.',
                        field: 'amount'
                    });
                }
            } else if (hasCredit) {
                const creditResult = parseCsvAmount(rawCredit, currency);
                if (creditResult.amount_cents !== null) {
                    // Inflow / Credit to bank is income (positive minor unit)
                    amountCents = Math.abs(creditResult.amount_cents);
                    eventType = 'income';
                } else {
                    findings.push({
                        severity: 'error',
                        code: 'INVALID_CREDIT_AMOUNT',
                        message: creditResult.error || 'Failed to parse credit amount.',
                        field: 'amount'
                    });
                }
            } else {
                findings.push({
                    severity: 'error',
                    code: 'MISSING_AMOUNT',
                    message: 'Neither Debit nor Credit column has an amount.',
                    field: 'amount'
                });
            }
        }
        const hasErrors = findings.some((f)=>f.severity === 'error');
        if (hasErrors) {
            errorCount++;
        } else {
            validCount++;
        }
        parsedRows.push({
            row_number: rowNumber,
            raw_snippet: rawLine,
            date: canonicalDate,
            raw_date: rawDate,
            description,
            amount_cents: amountCents,
            raw_amount: rawAmount,
            event_type: eventType,
            validation_findings: findings
        });
    }
    return {
        headers,
        header_signature: signature,
        matched_mapping: mapping,
        rows: parsedRows,
        total_rows: parsedRows.length,
        valid_rows: validCount,
        error_rows: errorCount
    };
}
}),
"[externals]/child_process [external] (child_process, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("child_process", () => require("child_process"));

module.exports = mod;
}),
"[externals]/os [external] (os, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("os", () => require("os"));

module.exports = mod;
}),
"[externals]/util [external] (util, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("util", () => require("util"));

module.exports = mod;
}),
"[project]/src/lib/domain/document/openTaxAdapter.ts [app-route] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "extractInvoiceFromPdf",
    ()=>extractInvoiceFromPdf,
    "setCustomExtractor",
    ()=>setCustomExtractor
]);
/**
 * OpenTax-AU Extraction Adapter Service (Milestone 1 Slice 1F)
 * 
 * Why this file exists:
 * Provides the decoupled adapter interface between OpenNetWorth and OpenTax-AU's
 * document extraction pipeline. Reuses OpenTax-AU's InvoiceParser to extract
 * structured supplier, date, currency, line item, and tax facts from text-based
 * PDFs without replicating Python tax parsing logic or pulling in Australian tax return bias.
 * 
 * Tricky logic:
 * - Subprocess execution: Spawns the dedicated bridge script `scripts/opentax_reader.py`
 *   using OpenTax-AU's virtual environment (`.venv/Scripts/python.exe`), passing the file path.
 * - Integer minor-unit conversion: Translates floating-point values from the Python parser
 *   into exact integer minor units (cents) according to the extracted currency's scale.
 * - Layout boundary enforcement: Documents that fail the supported layout (e.g. non-invoice,
 *   unidentified supplier, missing total) are marked `supported: false` and given descriptive
 *   validation findings. No amounts are guessed.
 * - Test Isolation / Injection: Allows injecting a custom extractor function so unit tests
 *   can run deterministically with or without an active Python interpreter.
 * 
 * TODO:
 * - Support batch multi-document extraction via background job queue in Slice 1G.
 * - Add local vision model integration for scanned receipt images in Slice 1G.
 */ var __TURBOPACK__imported__module__$5b$externals$5d2f$child_process__$5b$external$5d$__$28$child_process$2c$__cjs$29$__ = __turbopack_context__.i("[externals]/child_process [external] (child_process, cjs)");
var __TURBOPACK__imported__module__$5b$externals$5d2f$path__$5b$external$5d$__$28$path$2c$__cjs$29$__ = __turbopack_context__.i("[externals]/path [external] (path, cjs)");
var __TURBOPACK__imported__module__$5b$externals$5d2f$fs__$5b$external$5d$__$28$fs$2c$__cjs$29$__ = __turbopack_context__.i("[externals]/fs [external] (fs, cjs)");
var __TURBOPACK__imported__module__$5b$externals$5d2f$os__$5b$external$5d$__$28$os$2c$__cjs$29$__ = __turbopack_context__.i("[externals]/os [external] (os, cjs)");
var __TURBOPACK__imported__module__$5b$externals$5d2f$util__$5b$external$5d$__$28$util$2c$__cjs$29$__ = __turbopack_context__.i("[externals]/util [external] (util, cjs)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$domain$2f$accounting$2f$types$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/lib/domain/accounting/types.ts [app-route] (ecmascript)");
;
;
;
;
;
;
const execFileAsync = (0, __TURBOPACK__imported__module__$5b$externals$5d2f$util__$5b$external$5d$__$28$util$2c$__cjs$29$__["promisify"])(__TURBOPACK__imported__module__$5b$externals$5d2f$child_process__$5b$external$5d$__$28$child_process$2c$__cjs$29$__["execFile"]);
let customExtractor = null;
function setCustomExtractor(extractor) {
    customExtractor = extractor;
}
/**
 * Resolves the path to the Python executable in OpenTax-AU.
 */ function getPythonPath() {
    if (process.env.OPENTAX_PYTHON) {
        return process.env.OPENTAX_PYTHON;
    }
    const standardVenv = __TURBOPACK__imported__module__$5b$externals$5d2f$path__$5b$external$5d$__$28$path$2c$__cjs$29$__["default"].resolve('D:\\', 'AntiGravityProjects', 'opentax-au', '.venv', 'Scripts', 'python.exe');
    if (__TURBOPACK__imported__module__$5b$externals$5d2f$fs__$5b$external$5d$__$28$fs$2c$__cjs$29$__["default"].existsSync(standardVenv)) {
        return standardVenv;
    }
    return 'python';
}
/**
 * Resolves the path to the bridge reader script.
 */ function getBridgeScriptPath() {
    return __TURBOPACK__imported__module__$5b$externals$5d2f$path__$5b$external$5d$__$28$path$2c$__cjs$29$__["default"].resolve(process.cwd(), 'scripts', 'opentax_reader.py');
}
/**
 * Converts a float amount to exact integer minor units (cents) for a currency.
 * 
 * Why this exists:
 * Ensures money amounts extracted from PDFs are accurately converted to safe integer
 * minor units before entering domain models and double-entry postings.
 * 
 * Tricky logic:
 * - Nullable currency: when currency is unresolved/null, defaults to scale 2 (standard cents).
 * - Multiplies by 10^scale and rounds to avoid floating point representation issues.
 * - Asserts safe integer bounds to prevent overflows.
 * 
 * TODO: Support 3-decimal currencies if introduced in later slices.
 */ function toMinorUnits(amount, currency) {
    if (amount === null || amount === undefined || isNaN(amount)) {
        return 0;
    }
    const scale = currency ? __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$domain$2f$accounting$2f$types$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["CURRENCY_DECIMALS"][currency] ?? 2 : 2;
    const factor = Math.pow(10, scale);
    const cents = Math.round(amount * factor);
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$domain$2f$accounting$2f$types$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["assertValidMoneyCents"])(cents, `Extracted ${currency || 'unspecified'} amount`);
    return cents;
}
async function extractInvoiceFromPdf(source) {
    if (customExtractor) {
        if (typeof source === 'string') {
            return customExtractor(source);
        }
        // If buffer, write to temp file for custom extractor
        const tmpPath = __TURBOPACK__imported__module__$5b$externals$5d2f$path__$5b$external$5d$__$28$path$2c$__cjs$29$__["default"].join(__TURBOPACK__imported__module__$5b$externals$5d2f$os__$5b$external$5d$__$28$os$2c$__cjs$29$__["default"].tmpdir(), `test_extract_${Date.now()}_${Math.random().toString(36).substring(7)}.pdf`);
        try {
            __TURBOPACK__imported__module__$5b$externals$5d2f$fs__$5b$external$5d$__$28$fs$2c$__cjs$29$__["default"].writeFileSync(tmpPath, source);
            return await customExtractor(tmpPath);
        } finally{
            if (__TURBOPACK__imported__module__$5b$externals$5d2f$fs__$5b$external$5d$__$28$fs$2c$__cjs$29$__["default"].existsSync(tmpPath)) {
                __TURBOPACK__imported__module__$5b$externals$5d2f$fs__$5b$external$5d$__$28$fs$2c$__cjs$29$__["default"].unlinkSync(tmpPath);
            }
        }
    }
    let filePath;
    let isTempFile = false;
    if (typeof source === 'string') {
        filePath = source;
    } else {
        // Write buffer to temporary file for python reader
        isTempFile = true;
        const tmpFilename = `onw_invoice_${Date.now()}_${Math.random().toString(36).substring(7)}.pdf`;
        filePath = __TURBOPACK__imported__module__$5b$externals$5d2f$path__$5b$external$5d$__$28$path$2c$__cjs$29$__["default"].join(__TURBOPACK__imported__module__$5b$externals$5d2f$os__$5b$external$5d$__$28$os$2c$__cjs$29$__["default"].tmpdir(), tmpFilename);
        __TURBOPACK__imported__module__$5b$externals$5d2f$fs__$5b$external$5d$__$28$fs$2c$__cjs$29$__["default"].writeFileSync(filePath, source);
    }
    try {
        const pythonExe = getPythonPath();
        const scriptPath = getBridgeScriptPath();
        const { stdout, stderr } = await execFileAsync(pythonExe, [
            scriptPath,
            filePath
        ], {
            timeout: 20000,
            maxBuffer: 10 * 1024 * 1024,
            env: {
                ...process.env,
                PYTHONIOENCODING: 'utf-8'
            }
        });
        if (!stdout || !stdout.trim()) {
            return {
                supported: false,
                currency: null,
                total_cents: 0,
                tax_cents: 0,
                net_cents: 0,
                line_items: [],
                source_snippet: stderr || 'No output received from OpenTax-AU reader.',
                validation_findings: [
                    {
                        severity: 'error',
                        code: 'EXTRACTOR_EMPTY_OUTPUT',
                        message: 'OpenTax-AU reader returned no structured output.'
                    }
                ]
            };
        }
        const rawResult = JSON.parse(stdout);
        // Preserve extracted currency without fallback (Fix 1)
        let currency = rawResult.currency ? rawResult.currency.toUpperCase() : null;
        if (currency && __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$domain$2f$accounting$2f$types$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["CURRENCY_DECIMALS"][currency] === undefined) {
            currency = null; // Ignore invalid currency strings like "DUE"
        }
        const totalCents = toMinorUnits(rawResult.total_amount, currency);
        const taxCents = toMinorUnits(rawResult.gst_amount, currency);
        const netCents = toMinorUnits(rawResult.subtotal, currency);
        const findings = [];
        // Missing currency must remain unresolved with a blocking error until reviewed (Fix 1)
        if (!currency) {
            findings.push({
                severity: 'error',
                code: 'MISSING_CURRENCY',
                message: 'Document currency could not be identified with confidence. Retained as unresolved until reviewed.'
            });
        }
        // Map python warnings to validation findings
        if (Array.isArray(rawResult.warnings)) {
            for (const warning of rawResult.warnings){
                findings.push({
                    severity: 'warning',
                    code: 'EXTRACTOR_WARNING',
                    message: String(warning)
                });
            }
        }
        if (!rawResult.supported) {
            findings.push({
                severity: 'error',
                code: 'UNSUPPORTED_LAYOUT',
                message: rawResult.error || 'Document does not match the supported text-based supplies invoice layout and has been retained as unresolved.'
            });
        }
        const lineItems = Array.isArray(rawResult.line_items) ? rawResult.line_items.map((item)=>({
                description: String(item.description || 'Invoice Item'),
                amount_cents: toMinorUnits(item.amount, currency),
                source_line: item.source_line ? Number(item.source_line) : undefined
            })) : [];
        let supplierName = rawResult.supplier_name || null;
        if (supplierName && (supplierName.toUpperCase().includes('TAX INVOICE') || supplierName.toUpperCase().includes('RECEIPT') || supplierName.toUpperCase().includes('STATEMENT') || supplierName.toUpperCase().includes('SYNTHETIC SAMPLE'))) {
            supplierName = null; // Reject common banner text masquerading as supplier name
        }
        return {
            supported: Boolean(rawResult.supported),
            layout_name: rawResult.layout,
            supplier_name: supplierName,
            invoice_number: rawResult.invoice_number || null,
            date: rawResult.date || null,
            currency,
            total_cents: totalCents,
            tax_cents: taxCents,
            net_cents: netCents,
            line_items: lineItems,
            source_snippet: rawResult.source_snippet || '',
            validation_findings: findings,
            raw_text: rawResult.raw_text
        };
    } catch (err) {
        return {
            supported: false,
            currency: null,
            total_cents: 0,
            tax_cents: 0,
            net_cents: 0,
            line_items: [],
            source_snippet: `Execution error: ${err.message}`,
            validation_findings: [
                {
                    severity: 'error',
                    code: 'ADAPTER_EXECUTION_FAILED',
                    message: `Failed to execute OpenTax-AU reader: ${err.message}`
                }
            ]
        };
    } finally{
        if (isTempFile && __TURBOPACK__imported__module__$5b$externals$5d2f$fs__$5b$external$5d$__$28$fs$2c$__cjs$29$__["default"].existsSync(filePath)) {
            try {
                __TURBOPACK__imported__module__$5b$externals$5d2f$fs__$5b$external$5d$__$28$fs$2c$__cjs$29$__["default"].unlinkSync(filePath);
            } catch  {
            // Ignore cleanup errors
            }
        }
    }
}
}),
"[project]/src/lib/domain/accounting/accountService.ts [app-route] (ecmascript)", ((__turbopack_context__) => {
"use strict";

/**
 * Milestone 1 Account & Entity Management Service
 * 
 * Why this file exists:
 * Provides transactional domain services to create, list, and update sovereign financial entities
 * (persons, households, businesses, trusts) and double-entry financial accounts.
 * When an account is created with an opening balance, this service atomically generates
 * and commits a balanced double-entry opening balance transaction with an explicit
 * `Opening Balance Equity` counterpart (M1-FLOW-01, T1).
 * 
 * Tricky logic:
 * - Opening balance posting parity:
 *   * For Assets: Debit Asset (+amount_cents), Credit Opening Balance Equity (-amount_cents).
 *   * For Liabilities: Credit Liability (-amount_cents), Debit Opening Balance Equity (+amount_cents).
 *   Both satisfy: Sum(amount_cents) = 0.
 * - Idempotent equity account lookup: If the entity doesn't have an 'Opening Balance Equity' account yet,
 *   we auto-provision one deterministically for that entity and currency.
 * - Optimistic concurrency control (M1-SAFE-06): Updates require `expected_revision` and increment `revision + 1`.
 *   If the row in SQLite has already been incremented by another operation, the update updates 0 rows
 *   and throws a ConflictError.
 * 
 * TODO: Support automated multi-entity ownership splits on account creation in Slice 1D.
 */ __turbopack_context__.s([
    "ConflictError",
    ()=>ConflictError,
    "ValidationError",
    ()=>ValidationError,
    "createAccount",
    ()=>createAccount,
    "createEntity",
    ()=>createEntity,
    "getAccountOwnership",
    ()=>getAccountOwnership,
    "getEntity",
    ()=>getEntity,
    "listAccounts",
    ()=>listAccounts,
    "listEntities",
    ()=>listEntities,
    "listEntityMembers",
    ()=>listEntityMembers,
    "setAccountOwnership",
    ()=>setAccountOwnership,
    "updateAccount",
    ()=>updateAccount
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$domain$2f$accounting$2f$types$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/lib/domain/accounting/types.ts [app-route] (ecmascript)");
;
class ConflictError extends Error {
    constructor(message){
        super(message);
        this.name = 'ConflictError';
    }
}
class ValidationError extends Error {
    constructor(message){
        super(message);
        this.name = 'ValidationError';
    }
}
function createEntity(db, input) {
    if (!input.name || input.name.trim().length === 0) {
        throw new ValidationError('Entity name is required and cannot be blank.');
    }
    const validTypes = [
        'person',
        'household',
        'business',
        'trust'
    ];
    if (!validTypes.includes(input.type)) {
        throw new ValidationError(`Invalid entity type: ${input.type}. Must be one of: ${validTypes.join(', ')}`);
    }
    const currency = (input.currency || 'USD').toUpperCase();
    const id = input.id || crypto.randomUUID();
    const now = new Date().toISOString();
    const stmt = db.prepare(`
        INSERT INTO m1_entities (id, name, type, currency, parent_entity_id, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?)
    `);
    stmt.run(id, input.name.trim(), input.type, currency, input.parent_entity_id || null, now, now);
    return {
        id,
        name: input.name.trim(),
        type: input.type,
        currency,
        parent_entity_id: input.parent_entity_id || null,
        created_at: now,
        updated_at: now
    };
}
function listEntities(db) {
    const rows = db.prepare('SELECT * FROM m1_entities ORDER BY name ASC').all();
    return rows.map((r)=>({
            id: r.id,
            name: r.name,
            type: r.type,
            currency: r.currency,
            parent_entity_id: r.parent_entity_id,
            created_at: r.created_at,
            updated_at: r.updated_at
        }));
}
function getEntity(db, id) {
    const row = db.prepare('SELECT * FROM m1_entities WHERE id = ?').get(id);
    if (!row) return null;
    return {
        id: row.id,
        name: row.name,
        type: row.type,
        currency: row.currency,
        parent_entity_id: row.parent_entity_id,
        created_at: row.created_at,
        updated_at: row.updated_at
    };
}
/**
 * Ensures an 'Opening Balance Equity' account exists for the given entity and currency.
 */ function ensureOpeningEquityAccount(db, entityId, currency) {
    const existing = db.prepare(`
        SELECT * FROM m1_accounts
        WHERE entity_id = ? AND type = 'equity' AND sub_type = 'opening_balance_equity' AND currency = ?
    `).get(entityId, currency);
    if (existing) {
        return {
            id: existing.id,
            entity_id: existing.entity_id,
            name: existing.name,
            type: existing.type,
            sub_type: existing.sub_type,
            currency: existing.currency,
            is_active: Boolean(existing.is_active),
            institution: existing.institution,
            account_number_mask: existing.account_number_mask,
            opening_date: existing.opening_date,
            opening_balance_cents: existing.opening_balance_cents,
            revision: existing.revision,
            created_at: existing.created_at,
            updated_at: existing.updated_at
        };
    }
    const id = `acc-equity-${entityId}-${currency.toLowerCase()}`;
    const now = new Date().toISOString();
    db.prepare(`
        INSERT INTO m1_accounts (id, entity_id, name, type, sub_type, currency, is_active, revision, created_at, updated_at)
        VALUES (?, ?, 'Opening Balance Equity', 'equity', 'opening_balance_equity', ?, 1, 1, ?, ?)
    `).run(id, entityId, currency, now, now);
    return {
        id,
        entity_id: entityId,
        name: 'Opening Balance Equity',
        type: 'equity',
        sub_type: 'opening_balance_equity',
        currency,
        is_active: true,
        revision: 1,
        created_at: now,
        updated_at: now
    };
}
function createAccount(db, input) {
    if (!input.name || input.name.trim().length === 0) {
        throw new ValidationError('Account name is required and cannot be blank.');
    }
    const entity = getEntity(db, input.entity_id);
    if (!entity) {
        throw new ValidationError(`Entity not found with ID: ${input.entity_id}`);
    }
    const validTypes = [
        'asset',
        'liability',
        'equity',
        'income',
        'expense',
        'suspense'
    ];
    if (!validTypes.includes(input.type)) {
        throw new ValidationError(`Invalid account type: ${input.type}. Must be one of: ${validTypes.join(', ')}`);
    }
    const currency = input.currency.toUpperCase();
    const accountId = input.id || crypto.randomUUID();
    const now = new Date().toISOString();
    const hasOpeningBalance = input.opening_balance_cents !== undefined && input.opening_balance_cents !== null && input.opening_balance_cents !== 0;
    if (hasOpeningBalance) {
        (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$domain$2f$accounting$2f$types$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["assertValidMoneyCents"])(input.opening_balance_cents, 'Opening balance cents');
        if (!input.opening_date || !/^\d{4}-\d{2}-\d{2}$/.test(input.opening_date)) {
            throw new ValidationError('A valid opening date (YYYY-MM-DD) is required when specifying an opening balance.');
        }
    }
    let createdAccount;
    let createdTx;
    // Atomic SQLite transaction enclosing account creation and opening balance posting
    const tx = db.transaction(()=>{
        // 1. Insert Account
        db.prepare(`
            INSERT INTO m1_accounts (
                id, entity_id, name, type, sub_type, currency, is_active,
                institution, account_number_mask, opening_date, opening_balance_cents,
                revision, created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, 1, ?, ?, ?, ?, 1, ?, ?)
        `).run(accountId, input.entity_id, input.name.trim(), input.type, input.sub_type, currency, input.institution || null, input.account_number_mask || null, input.opening_date || null, hasOpeningBalance ? input.opening_balance_cents : null, now, now);
        createdAccount = {
            id: accountId,
            entity_id: input.entity_id,
            name: input.name.trim(),
            type: input.type,
            sub_type: input.sub_type,
            currency,
            is_active: true,
            institution: input.institution || null,
            account_number_mask: input.account_number_mask || null,
            opening_date: input.opening_date || null,
            opening_balance_cents: hasOpeningBalance ? input.opening_balance_cents : null,
            revision: 1,
            created_at: now,
            updated_at: now
        };
        // 2. If opening balance provided, post balanced double-entry transaction (M1-FLOW-01, T1)
        if (hasOpeningBalance) {
            const equityAccount = ensureOpeningEquityAccount(db, input.entity_id, currency);
            const txId = `tx-open-${accountId}`;
            const txDate = input.opening_date;
            const balanceCents = input.opening_balance_cents;
            // Calculate postings according to normal balance:
            // Asset (+balance Debit, -balance Equity Credit)
            // Liability (-balance Credit, +balance Equity Debit)
            const isAsset = input.type === 'asset';
            const accountLegCents = isAsset ? balanceCents : -balanceCents;
            const equityLegCents = isAsset ? -balanceCents : balanceCents;
            const postings = [
                {
                    id: `post-acc-${accountId}`,
                    transaction_id: txId,
                    account_id: accountId,
                    amount_cents: accountLegCents,
                    currency,
                    memo: `Opening Balance for ${input.name.trim()}`
                },
                {
                    id: `post-eq-${accountId}`,
                    transaction_id: txId,
                    account_id: equityAccount.id,
                    amount_cents: equityLegCents,
                    currency,
                    memo: `Opening Balance Offset for ${input.name.trim()}`
                }
            ];
            // Verify invariant: Sum must be 0
            (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$domain$2f$accounting$2f$types$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["validateTransactionBalance"])(postings);
            db.prepare(`
                INSERT INTO m1_transactions (
                    id, date, description, status, origin, idempotency_key, revision, created_at, updated_at
                ) VALUES (?, ?, ?, 'posted', 'opening_balance', ?, 1, ?, ?)
            `).run(txId, txDate, `Opening Balance - ${input.name.trim()}`, `idemp-open-${accountId}`, now, now);
            const insertPosting = db.prepare(`
                INSERT INTO m1_journal_entries (id, transaction_id, account_id, amount_cents, currency, memo)
                VALUES (?, ?, ?, ?, ?, ?)
            `);
            for (const p of postings){
                insertPosting.run(p.id, p.transaction_id, p.account_id, p.amount_cents, p.currency, p.memo || null);
            }
            createdTx = {
                id: txId,
                date: txDate,
                description: `Opening Balance - ${input.name.trim()}`,
                status: 'posted',
                origin: 'opening_balance',
                idempotency_key: `idemp-open-${accountId}`,
                revision: 1,
                created_at: now,
                updated_at: now
            };
        }
    });
    tx();
    return {
        account: createdAccount,
        openingTransaction: createdTx
    };
}
function updateAccount(db, accountId, expectedRevision, updates) {
    const existing = db.prepare('SELECT * FROM m1_accounts WHERE id = ?').get(accountId);
    if (!existing) {
        throw new ValidationError(`Account not found with ID: ${accountId}`);
    }
    const now = new Date().toISOString();
    const newName = updates.name !== undefined ? updates.name.trim() : existing.name;
    const newSubType = updates.sub_type !== undefined ? updates.sub_type : existing.sub_type;
    const newInst = updates.institution !== undefined ? updates.institution : existing.institution;
    const newMask = updates.account_number_mask !== undefined ? updates.account_number_mask : existing.account_number_mask;
    const newActive = updates.is_active !== undefined ? updates.is_active ? 1 : 0 : existing.is_active;
    const res = db.prepare(`
        UPDATE m1_accounts
        SET name = ?, sub_type = ?, institution = ?, account_number_mask = ?, is_active = ?, revision = revision + 1, updated_at = ?
        WHERE id = ? AND revision = ?
    `).run(newName, newSubType, newInst, newMask, newActive, now, accountId, expectedRevision);
    if (res.changes === 0) {
        throw new ConflictError(`Account update failed due to stale revision (expected revision ${expectedRevision}). Another update has occurred.`);
    }
    return {
        id: existing.id,
        entity_id: existing.entity_id,
        name: newName,
        type: existing.type,
        sub_type: newSubType,
        currency: existing.currency,
        is_active: Boolean(newActive),
        institution: newInst,
        account_number_mask: newMask,
        opening_date: existing.opening_date,
        opening_balance_cents: existing.opening_balance_cents,
        revision: expectedRevision + 1,
        created_at: existing.created_at,
        updated_at: now
    };
}
function listAccounts(db, entityId) {
    const query = entityId ? db.prepare('SELECT * FROM m1_accounts WHERE entity_id = ? ORDER BY type ASC, name ASC').all(entityId) : db.prepare('SELECT * FROM m1_accounts ORDER BY type ASC, name ASC').all();
    return query.map((r)=>({
            id: r.id,
            entity_id: r.entity_id,
            name: r.name,
            type: r.type,
            sub_type: r.sub_type,
            currency: r.currency,
            is_active: Boolean(r.is_active),
            institution: r.institution,
            account_number_mask: r.account_number_mask,
            opening_date: r.opening_date,
            opening_balance_cents: r.opening_balance_cents,
            revision: r.revision,
            created_at: r.created_at,
            updated_at: r.updated_at
        }));
}
function setAccountOwnership(db, accountId, allocations) {
    const account = db.prepare('SELECT id, name, entity_id FROM m1_accounts WHERE id = ?').get(accountId);
    if (!account) {
        throw new ValidationError(`Account not found: ${accountId}`);
    }
    if (!allocations || allocations.length === 0) {
        // Clearing joint ownership - account belongs 100% to primary entity
        db.prepare('DELETE FROM m1_account_ownership WHERE account_id = ?').run(accountId);
        return [];
    }
    let totalPercentage = 0;
    const entityLookup = db.prepare('SELECT id, name FROM m1_entities WHERE id = ?');
    const seenEntities = new Set();
    for (const alloc of allocations){
        if (!alloc.entity_id) {
            throw new ValidationError('Entity ID is required for each ownership allocation.');
        }
        if (seenEntities.has(alloc.entity_id)) {
            throw new ValidationError(`Duplicate entity in ownership allocation: ${alloc.entity_id}`);
        }
        seenEntities.add(alloc.entity_id);
        const entity = entityLookup.get(alloc.entity_id);
        if (!entity) {
            throw new ValidationError(`Entity not found for ownership allocation: ${alloc.entity_id}`);
        }
        const pct = alloc.ownership_percentage !== undefined ? alloc.ownership_percentage : alloc.share_percentage;
        if (typeof pct !== 'number' || !Number.isFinite(pct)) {
            throw new ValidationError(`Invalid share percentage: "${pct}". Must be a valid number.`);
        }
        if (pct <= 0 || pct > 100) {
            throw new ValidationError(`Share percentage must be between 0 and 100 (exclusive of 0), received: ${pct}%.`);
        }
        totalPercentage += pct;
    }
    // Floating-point safety: allow tiny round-off up to 100.0001
    if (totalPercentage > 100.0001) {
        throw new ValidationError(`Total ownership percentage cannot exceed 100%, calculated: ${totalPercentage}%.`);
    }
    // Resubmission Item 6: Reject ambiguous allocations.
    // If the primary account owner is explicitly listed in the allocations,
    // the allocations must account for 100% of ownership.
    // If the primary owner is listed but total < 100%, it is ambiguous whether the remainder
    // was intended to be retained by the primary owner or unallocated.
    const primaryEntityInAllocations = allocations.some((a)=>a.entity_id === account.entity_id);
    if (primaryEntityInAllocations && totalPercentage < 99.9999) {
        throw new ValidationError(`Ambiguous ownership allocation: The primary account owner "${account.entity_id}" is explicitly specified, but total allocations sum to ${totalPercentage}% (less than 100%). When the primary owner is explicitly specified, total allocations must equal 100%.`);
    }
    const now = new Date().toISOString();
    const results = [];
    const runAtomic = db.transaction(()=>{
        db.prepare('DELETE FROM m1_account_ownership WHERE account_id = ?').run(accountId);
        const insertStmt = db.prepare(`
            INSERT INTO m1_account_ownership (id, account_id, entity_id, share_percentage, created_at)
            VALUES (?, ?, ?, ?, ?)
        `);
        for (const alloc of allocations){
            const id = crypto.randomUUID();
            const pct = alloc.ownership_percentage !== undefined ? alloc.ownership_percentage : alloc.share_percentage;
            insertStmt.run(id, accountId, alloc.entity_id, pct, now);
            results.push({
                id,
                account_id: accountId,
                entity_id: alloc.entity_id,
                share_percentage: pct,
                ownership_percentage: pct,
                created_at: now
            });
        }
    });
    runAtomic();
    return results;
}
function getAccountOwnership(db, accountId) {
    const rows = db.prepare(`
        SELECT * FROM m1_account_ownership WHERE account_id = ? ORDER BY share_percentage DESC
    `).all(accountId);
    return rows.map((r)=>({
            id: r.id,
            account_id: r.account_id,
            entity_id: r.entity_id,
            share_percentage: r.share_percentage,
            ownership_percentage: r.share_percentage,
            created_at: r.created_at
        }));
}
function listEntityMembers(db, householdEntityId) {
    const rows = db.prepare(`
        SELECT * FROM m1_entities WHERE id = ? OR parent_entity_id = ? ORDER BY type DESC, name ASC
    `).all(householdEntityId, householdEntityId);
    return rows.map((r)=>({
            id: r.id,
            name: r.name,
            type: r.type,
            currency: r.currency,
            parent_entity_id: r.parent_entity_id,
            created_at: r.created_at,
            updated_at: r.updated_at
        }));
}
}),
"[project]/src/lib/domain/accounting/transactionService.ts [app-route] (ecmascript)", ((__turbopack_context__) => {
"use strict";

/**
 * Milestone 1 Daily Financial Events & Transaction Service
 * 
 * Why this file exists:
 * Implements M1-FLOW-02, M1-FLOW-03, M1-FLOW-04, M1-FLOW-05, M1-DOM-04, M1-DOM-05,
 * M1-SAFE-05, and M1-SAFE-06.
 * Provides the authoritative domain service for recording daily financial activities:
 * income, expenses, account transfers, credit card repayments, loan repayments with
 * principal/interest/fee splits, and auditable transaction corrections/voids.
 * 
 * Tricky logic:
 * - Real Calendar Date Validation:
 *   Rejects non-dates ("not-a-date") or impossible calendar days (e.g. 2026-02-31).
 * - Posting & Account Currency Integrity:
 *   Every single posting's currency MUST match the defined currency of the referenced account.
 *   Cross-currency repayments (e.g. AUD bank vs USD loan) are rejected upfront.
 * - Account Role & Sovereign Entity Boundaries:
 *   Transfers, repayments, income, and expenses strictly validate that accounts belong to the
 *   same sovereign entity and fulfill the correct financial roles (e.g. cannot "transfer" into an income account).
 * - Atomic Category Account Provisioning:
 *   Auto-provisioning category accounts occurs within the same atomic database transaction as the
 *   transaction commit. Any validation failure rolls back all changes, leaving zero orphan accounts.
 * - End-to-End Idempotency & Conflict Detection (M1-SAFE-05, T11):
 *   Submitting the same idempotency key with identical financial details returns the existing transaction.
 *   Submitting the same idempotency key with DIFFERENT financial details throws ConflictError (HTTP 409).
 * - Auditable corrections (M1-DOM-05, T13):
 *   Transactions are never destructively wiped. Voiding or editing stores an immutable
 *   snapshot of previous_state in m1_transaction_corrections and enforces optimistic revision checks.
 *   Edits enforce shared validation (dates, descriptions, replacement posting count).
 * 
 * TODO: Add multi-currency transfer FX hedging journals in Milestone 2.
 */ __turbopack_context__.s([
    "assertValidCalendarDate",
    ()=>assertValidCalendarDate,
    "canonicalizeEvidenceRef",
    ()=>canonicalizeEvidenceRef,
    "cascadeAssetValuations",
    ()=>cascadeAssetValuations,
    "correctTransaction",
    ()=>correctTransaction,
    "ensureExpenseAccount",
    ()=>ensureExpenseAccount,
    "ensureIncomeAccount",
    ()=>ensureIncomeAccount,
    "ensureValuationEquityAccount",
    ()=>ensureValuationEquityAccount,
    "listTransactions",
    ()=>listTransactions,
    "normalizeEvidenceRefs",
    ()=>normalizeEvidenceRefs,
    "postTransaction",
    ()=>postTransaction,
    "recordAssetValuation",
    ()=>recordAssetValuation,
    "recordCreditCardRepayment",
    ()=>recordCreditCardRepayment,
    "recordExpense",
    ()=>recordExpense,
    "recordIncome",
    ()=>recordIncome,
    "recordLoanRepayment",
    ()=>recordLoanRepayment,
    "recordTransfer",
    ()=>recordTransfer
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$domain$2f$accounting$2f$types$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/lib/domain/accounting/types.ts [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$domain$2f$accounting$2f$accountService$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/lib/domain/accounting/accountService.ts [app-route] (ecmascript)");
;
;
function assertValidCalendarDate(dateStr, context = 'Date') {
    if (!dateStr || typeof dateStr !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
        throw new __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$domain$2f$accounting$2f$accountService$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["ValidationError"](`${context} must be a valid date in YYYY-MM-DD format, received: "${dateStr}".`);
    }
    const [y, m, d] = dateStr.split('-').map(Number);
    const parsed = new Date(Date.UTC(y, m - 1, d));
    if (isNaN(parsed.getTime()) || parsed.getUTCFullYear() !== y || parsed.getUTCMonth() + 1 !== m || parsed.getUTCDate() !== d) {
        throw new __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$domain$2f$accounting$2f$accountService$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["ValidationError"](`${context} is not a valid calendar date: "${dateStr}".`);
    }
}
function ensureExpenseAccount(db, entityId, category = 'living_expense', currency = 'USD') {
    const curr = currency.toUpperCase();
    const existing = db.prepare(`
        SELECT * FROM m1_accounts
        WHERE entity_id = ? AND type = 'expense' AND sub_type = ? AND currency = ?
    `).get(entityId, category, curr);
    if (existing) {
        return {
            id: existing.id,
            entity_id: existing.entity_id,
            name: existing.name,
            type: existing.type,
            sub_type: existing.sub_type,
            currency: existing.currency,
            is_active: Boolean(existing.is_active),
            institution: existing.institution,
            account_number_mask: existing.account_number_mask,
            opening_date: existing.opening_date,
            opening_balance_cents: existing.opening_balance_cents,
            revision: existing.revision,
            created_at: existing.created_at,
            updated_at: existing.updated_at
        };
    }
    const id = `acc-exp-${entityId}-${category}-${curr.toLowerCase()}`;
    const name = category.replace(/_/g, ' ').replace(/\b\w/g, (c)=>c.toUpperCase());
    const now = new Date().toISOString();
    db.prepare(`
        INSERT INTO m1_accounts (id, entity_id, name, type, sub_type, currency, is_active, revision, created_at, updated_at)
        VALUES (?, ?, ?, 'expense', ?, ?, 1, 1, ?, ?)
    `).run(id, entityId, name, category, curr, now, now);
    return {
        id,
        entity_id: entityId,
        name,
        type: 'expense',
        sub_type: category,
        currency: curr,
        is_active: true,
        revision: 1,
        created_at: now,
        updated_at: now
    };
}
function ensureIncomeAccount(db, entityId, category = 'salary', currency = 'USD') {
    const curr = currency.toUpperCase();
    const existing = db.prepare(`
        SELECT * FROM m1_accounts
        WHERE entity_id = ? AND type = 'income' AND sub_type = ? AND currency = ?
    `).get(entityId, category, curr);
    if (existing) {
        return {
            id: existing.id,
            entity_id: existing.entity_id,
            name: existing.name,
            type: existing.type,
            sub_type: existing.sub_type,
            currency: existing.currency,
            is_active: Boolean(existing.is_active),
            institution: existing.institution,
            account_number_mask: existing.account_number_mask,
            opening_date: existing.opening_date,
            opening_balance_cents: existing.opening_balance_cents,
            revision: existing.revision,
            created_at: existing.created_at,
            updated_at: existing.updated_at
        };
    }
    const id = `acc-inc-${entityId}-${category}-${curr.toLowerCase()}`;
    const name = category.replace(/_/g, ' ').replace(/\b\w/g, (c)=>c.toUpperCase());
    const now = new Date().toISOString();
    db.prepare(`
        INSERT INTO m1_accounts (id, entity_id, name, type, sub_type, currency, is_active, revision, created_at, updated_at)
        VALUES (?, ?, ?, 'income', ?, ?, 1, 1, ?, ?)
    `).run(id, entityId, name, category, curr, now, now);
    return {
        id,
        entity_id: entityId,
        name,
        type: 'income',
        sub_type: category,
        currency: curr,
        is_active: true,
        revision: 1,
        created_at: now,
        updated_at: now
    };
}
function ensureValuationEquityAccount(db, entityId, currency = 'USD') {
    const curr = currency.toUpperCase();
    const existing = db.prepare(`
        SELECT * FROM m1_accounts
        WHERE entity_id = ? AND type = 'equity' AND sub_type = 'valuation_reserve' AND currency = ?
    `).get(entityId, curr);
    if (existing) {
        return {
            id: existing.id,
            entity_id: existing.entity_id,
            name: existing.name,
            type: existing.type,
            sub_type: existing.sub_type,
            currency: existing.currency,
            is_active: Boolean(existing.is_active),
            institution: existing.institution,
            account_number_mask: existing.account_number_mask,
            opening_date: existing.opening_date,
            opening_balance_cents: existing.opening_balance_cents,
            revision: existing.revision,
            created_at: existing.created_at,
            updated_at: existing.updated_at
        };
    }
    const id = `acc-eq-val-${entityId}-${curr.toLowerCase()}`;
    const name = 'Unrealized Valuation Reserve';
    const now = new Date().toISOString();
    db.prepare(`
        INSERT INTO m1_accounts (id, entity_id, name, type, sub_type, currency, is_active, revision, created_at, updated_at)
        VALUES (?, ?, ?, 'equity', 'valuation_reserve', ?, 1, 1, ?, ?)
    `).run(id, entityId, name, curr, now, now);
    return {
        id,
        entity_id: entityId,
        name,
        type: 'equity',
        sub_type: 'valuation_reserve',
        currency: curr,
        is_active: true,
        revision: 1,
        created_at: now,
        updated_at: now
    };
}
/**
 * String normalization for robust comparison (trims whitespace, treats null/undefined as empty).
 */ function normalizeString(val) {
    return (val ?? '').trim();
}
function canonicalizeEvidenceRef(ref) {
    if (ref === null || ref === undefined) return '';
    if (typeof ref === 'string') {
        const trimmed = ref.trim();
        return trimmed ? JSON.stringify({
            ref: trimmed,
            type: 'legacy'
        }) : '';
    }
    if (typeof ref === 'object') {
        const docId = String(ref.document_id ?? ref.documentId ?? '').trim();
        const hash = String(ref.content_hash ?? ref.contentHash ?? '').trim();
        const page = typeof ref.page === 'number' && Number.isFinite(ref.page) ? ref.page : ref.page ? Number(ref.page) : null;
        // Normalize bounding_box or bbox [x0, y0, x1, y1]
        let bbox = null;
        const rawBbox = ref.bounding_box || ref.bbox;
        if (Array.isArray(rawBbox) && rawBbox.length === 4 && rawBbox.every((n)=>typeof n === 'number' && Number.isFinite(n))) {
            bbox = [
                rawBbox[0],
                rawBbox[1],
                rawBbox[2],
                rawBbox[3]
            ];
        }
        const tableOrCell = ref.table_or_cell_ref ? String(ref.table_or_cell_ref).trim() : null;
        const label = ref.label ? String(ref.label).trim() : null;
        return JSON.stringify({
            bounding_box: bbox,
            content_hash: hash,
            document_id: docId,
            label: label || null,
            page: page,
            table_or_cell_ref: tableOrCell || null,
            type: 'structured'
        });
    }
    return '';
}
function normalizeEvidenceRefs(refs) {
    if (!refs || !Array.isArray(refs)) return '[]';
    const canonicalList = refs.map((r)=>canonicalizeEvidenceRef(r)).filter(Boolean);
    const uniqueSorted = Array.from(new Set(canonicalList)).sort();
    return JSON.stringify(uniqueSorted);
}
function postTransaction(db, input) {
    if (!input.description || input.description.trim().length === 0) {
        throw new __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$domain$2f$accounting$2f$accountService$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["ValidationError"]('Transaction description is required.');
    }
    assertValidCalendarDate(input.date, 'Transaction date');
    if (!input.postings || input.postings.length < 2) {
        throw new __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$domain$2f$accounting$2f$accountService$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["ValidationError"]('A transaction must have at least two postings to satisfy double-entry balance.');
    }
    const txId = input.id || crypto.randomUUID();
    const now = new Date().toISOString();
    const preparedPostings = input.postings.map((p)=>{
        (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$domain$2f$accounting$2f$types$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["assertValidMoneyCents"])(p.amount_cents, `Posting for account ${p.account_id}`);
        return {
            id: p.id || crypto.randomUUID(),
            transaction_id: txId,
            account_id: p.account_id,
            amount_cents: p.amount_cents,
            currency: p.currency.toUpperCase(),
            memo: p.memo || null
        };
    });
    // Invariant validation: Sum(amount_cents) === 0
    const validation = (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$domain$2f$accounting$2f$types$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["validateTransactionBalance"])(preparedPostings);
    if (!validation.isValid) {
        throw new __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$domain$2f$accounting$2f$accountService$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["ValidationError"](`Transaction out of balance by ${validation.delta_cents} cents. Sum of postings must equal zero.`);
    }
    // Verify all referenced accounts exist, currencies match, and all accounts belong to the same sovereign entity
    const accountLookup = db.prepare('SELECT id, name, currency, type, entity_id FROM m1_accounts WHERE id = ?');
    let transactionEntityId = null;
    for (const p of preparedPostings){
        const account = accountLookup.get(p.account_id);
        if (!account) {
            throw new __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$domain$2f$accounting$2f$accountService$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["ValidationError"](`Account does not exist: ${p.account_id}`);
        }
        if (p.currency !== account.currency) {
            throw new __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$domain$2f$accounting$2f$accountService$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["ValidationError"](`Posting currency "${p.currency}" does not match account currency "${account.currency}" for account "${account.name}".`);
        }
        if (transactionEntityId === null) {
            transactionEntityId = account.entity_id;
        } else if (transactionEntityId !== account.entity_id) {
            throw new __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$domain$2f$accounting$2f$accountService$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["ValidationError"](`Cross-entity transaction rejected: Account "${account.name}" belongs to entity "${account.entity_id}", while other postings in this transaction belong to entity "${transactionEntityId}". In Slice 1C, all postings in a transaction must belong to the same sovereign entity.`);
        }
    }
    // Idempotency check with material & financial conflict detection (M1-SAFE-05, T11)
    if (input.idempotency_key) {
        const existingTx = db.prepare('SELECT * FROM m1_transactions WHERE idempotency_key = ?').get(input.idempotency_key);
        if (existingTx) {
            const existingPostings = db.prepare('SELECT * FROM m1_journal_entries WHERE transaction_id = ?').all(existingTx.id);
            // Compare material metadata: date, description, payee/payer, and evidence references
            const isDateMatch = existingTx.date === input.date;
            const isDescriptionMatch = normalizeString(existingTx.description) === normalizeString(input.description);
            const isPayeeMatch = normalizeString(existingTx.payee_or_payer) === normalizeString(input.payee_or_payer);
            const existingEvidenceParsed = existingTx.evidence_refs ? JSON.parse(existingTx.evidence_refs) : [];
            const isEvidenceMatch = normalizeEvidenceRefs(existingEvidenceParsed) === normalizeEvidenceRefs(input.evidence_refs);
            // Compare financial postings: posting count, accounts, amounts, currencies
            const isPostingCountMatch = existingPostings.length === preparedPostings.length;
            let arePostingsIdentical = isPostingCountMatch;
            if (arePostingsIdentical) {
                const matchedIds = new Set();
                for (const p of preparedPostings){
                    const match = existingPostings.find((ep)=>!matchedIds.has(ep.id) && ep.account_id === p.account_id && ep.amount_cents === p.amount_cents && ep.currency === p.currency);
                    if (!match) {
                        arePostingsIdentical = false;
                        break;
                    }
                    matchedIds.add(match.id);
                }
            }
            if (isDateMatch && isDescriptionMatch && isPayeeMatch && arePostingsIdentical) {
                // Same key + same financial & material request -> return existing result
                return {
                    id: existingTx.id,
                    date: existingTx.date,
                    description: existingTx.description,
                    payee_or_payer: existingTx.payee_or_payer,
                    status: existingTx.status,
                    origin: existingTx.origin,
                    idempotency_key: existingTx.idempotency_key,
                    evidence_refs: existingTx.evidence_refs ? JSON.parse(existingTx.evidence_refs) : null,
                    revision: existingTx.revision,
                    created_at: existingTx.created_at,
                    updated_at: existingTx.updated_at,
                    postings: existingPostings.map((p)=>({
                            id: p.id,
                            transaction_id: p.transaction_id,
                            account_id: p.account_id,
                            amount_cents: p.amount_cents,
                            currency: p.currency,
                            memo: p.memo
                        }))
                };
            } else {
                // Same key + changed details (date, description, payee, evidence, or postings) -> throw ConflictError (HTTP 409)
                throw new __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$domain$2f$accounting$2f$accountService$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["ConflictError"](`Idempotency conflict: A transaction with idempotency key "${input.idempotency_key}" already exists with different financial or material details.`);
            }
        }
    }
    let resultTx;
    const executeTx = db.transaction(()=>{
        db.prepare(`
            INSERT INTO m1_transactions (
                id, date, description, payee_or_payer, status, origin,
                idempotency_key, evidence_refs, revision, created_at, updated_at
            ) VALUES (?, ?, ?, ?, 'posted', ?, ?, ?, 1, ?, ?)
        `).run(txId, input.date, input.description.trim(), input.payee_or_payer ? input.payee_or_payer.trim() : null, input.origin || 'manual', input.idempotency_key || null, input.evidence_refs ? JSON.stringify(input.evidence_refs) : null, now, now);
        const insertPosting = db.prepare(`
            INSERT INTO m1_journal_entries (id, transaction_id, account_id, amount_cents, currency, memo)
            VALUES (?, ?, ?, ?, ?, ?)
        `);
        for (const p of preparedPostings){
            insertPosting.run(p.id, p.transaction_id, p.account_id, p.amount_cents, p.currency, p.memo);
        }
        resultTx = {
            id: txId,
            date: input.date,
            description: input.description.trim(),
            payee_or_payer: input.payee_or_payer ? input.payee_or_payer.trim() : null,
            status: 'posted',
            origin: input.origin || 'manual',
            idempotency_key: input.idempotency_key || null,
            evidence_refs: input.evidence_refs || null,
            revision: 1,
            created_at: now,
            updated_at: now,
            postings: preparedPostings
        };
    });
    executeTx();
    return resultTx;
}
function recordIncome(db, input) {
    assertValidCalendarDate(input.date, 'Income date');
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$domain$2f$accounting$2f$types$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["assertValidMoneyCents"])(input.amount_cents, 'Income amount');
    if (input.amount_cents <= 0) {
        throw new __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$domain$2f$accounting$2f$accountService$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["ValidationError"]('Income amount must be greater than zero cents.');
    }
    const runAtomic = db.transaction(()=>{
        const bankAccount = db.prepare('SELECT * FROM m1_accounts WHERE id = ?').get(input.bank_account_id);
        if (!bankAccount) {
            throw new __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$domain$2f$accounting$2f$accountService$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["ValidationError"](`Bank account not found: ${input.bank_account_id}`);
        }
        if (bankAccount.type !== 'asset' || ![
            'checking',
            'savings',
            'cash'
        ].includes(bankAccount.sub_type)) {
            throw new __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$domain$2f$accounting$2f$accountService$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["ValidationError"](`Deposit account must be a liquid asset account (checking, savings, cash), received type: "${bankAccount.type}", sub_type: "${bankAccount.sub_type}".`);
        }
        if (bankAccount.entity_id !== input.entity_id) {
            throw new __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$domain$2f$accounting$2f$accountService$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["ValidationError"](`Bank account "${bankAccount.name}" does not belong to entity "${input.entity_id}".`);
        }
        // Find or auto-provision income account
        let incomeAccId = input.income_account_id;
        if (incomeAccId) {
            const incomeAcc = db.prepare('SELECT * FROM m1_accounts WHERE id = ?').get(incomeAccId);
            if (!incomeAcc) {
                throw new __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$domain$2f$accounting$2f$accountService$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["ValidationError"](`Income account not found: ${incomeAccId}`);
            }
            if (incomeAcc.type !== 'income') {
                throw new __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$domain$2f$accounting$2f$accountService$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["ValidationError"](`Income account must have type 'income', received: "${incomeAcc.type}".`);
            }
            if (incomeAcc.entity_id !== input.entity_id) {
                throw new __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$domain$2f$accounting$2f$accountService$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["ValidationError"](`Income account "${incomeAcc.name}" does not belong to entity "${input.entity_id}".`);
            }
            if (incomeAcc.currency !== bankAccount.currency) {
                throw new __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$domain$2f$accounting$2f$accountService$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["ValidationError"](`Income account currency (${incomeAcc.currency}) must match bank account currency (${bankAccount.currency}).`);
            }
        } else {
            const incomeAcc = ensureIncomeAccount(db, input.entity_id, input.category || 'salary', bankAccount.currency);
            incomeAccId = incomeAcc.id;
        }
        const currency = bankAccount.currency;
        return postTransaction(db, {
            date: input.date,
            description: input.description,
            payee_or_payer: input.payer,
            origin: 'manual',
            idempotency_key: input.idempotency_key,
            evidence_refs: input.evidence_refs,
            postings: [
                {
                    account_id: bankAccount.id,
                    amount_cents: input.amount_cents,
                    currency,
                    memo: `Deposit from ${input.payer || 'Income'}`
                },
                {
                    account_id: incomeAccId,
                    amount_cents: -input.amount_cents,
                    currency,
                    memo: input.description
                }
            ]
        });
    });
    return runAtomic();
}
function recordExpense(db, input) {
    assertValidCalendarDate(input.date, 'Expense date');
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$domain$2f$accounting$2f$types$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["assertValidMoneyCents"])(input.amount_cents, 'Expense amount');
    if (input.amount_cents <= 0) {
        throw new __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$domain$2f$accounting$2f$accountService$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["ValidationError"]('Expense amount must be greater than zero cents.');
    }
    const runAtomic = db.transaction(()=>{
        const paymentAccount = db.prepare('SELECT * FROM m1_accounts WHERE id = ?').get(input.payment_account_id);
        if (!paymentAccount) {
            throw new __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$domain$2f$accounting$2f$accountService$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["ValidationError"](`Payment account not found: ${input.payment_account_id}`);
        }
        if (!(paymentAccount.type === 'asset' && [
            'checking',
            'savings',
            'cash'
        ].includes(paymentAccount.sub_type) || paymentAccount.type === 'liability' && paymentAccount.sub_type === 'credit_card')) {
            throw new __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$domain$2f$accounting$2f$accountService$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["ValidationError"](`Payment account must be a liquid asset or credit card account, received type: "${paymentAccount.type}", sub_type: "${paymentAccount.sub_type}".`);
        }
        if (paymentAccount.entity_id !== input.entity_id) {
            throw new __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$domain$2f$accounting$2f$accountService$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["ValidationError"](`Payment account "${paymentAccount.name}" does not belong to entity "${input.entity_id}".`);
        }
        // Find or auto-provision expense account
        let expenseAccId = input.expense_account_id;
        if (expenseAccId) {
            const expenseAcc = db.prepare('SELECT * FROM m1_accounts WHERE id = ?').get(expenseAccId);
            if (!expenseAcc) {
                throw new __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$domain$2f$accounting$2f$accountService$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["ValidationError"](`Expense account not found: ${expenseAccId}`);
            }
            if (expenseAcc.type !== 'expense') {
                throw new __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$domain$2f$accounting$2f$accountService$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["ValidationError"](`Expense account must have type 'expense', received: "${expenseAcc.type}".`);
            }
            if (expenseAcc.entity_id !== input.entity_id) {
                throw new __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$domain$2f$accounting$2f$accountService$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["ValidationError"](`Expense account "${expenseAcc.name}" does not belong to entity "${input.entity_id}".`);
            }
            if (expenseAcc.currency !== paymentAccount.currency) {
                throw new __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$domain$2f$accounting$2f$accountService$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["ValidationError"](`Expense account currency (${expenseAcc.currency}) must match payment account currency (${paymentAccount.currency}).`);
            }
        } else {
            const expenseAcc = ensureExpenseAccount(db, input.entity_id, input.category || 'living_expense', paymentAccount.currency);
            expenseAccId = expenseAcc.id;
        }
        const currency = paymentAccount.currency;
        return postTransaction(db, {
            date: input.date,
            description: input.description,
            payee_or_payer: input.payee,
            origin: 'manual',
            idempotency_key: input.idempotency_key,
            evidence_refs: input.evidence_refs,
            postings: [
                {
                    account_id: expenseAccId,
                    amount_cents: input.amount_cents,
                    currency,
                    memo: input.description
                },
                {
                    account_id: paymentAccount.id,
                    amount_cents: -input.amount_cents,
                    currency,
                    memo: `Payment to ${input.payee || 'Merchant'}`
                }
            ]
        });
    });
    return runAtomic();
}
function recordTransfer(db, input) {
    assertValidCalendarDate(input.date, 'Transfer date');
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$domain$2f$accounting$2f$types$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["assertValidMoneyCents"])(input.amount_cents, 'Transfer amount');
    if (input.amount_cents <= 0) {
        throw new __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$domain$2f$accounting$2f$accountService$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["ValidationError"]('Transfer amount must be greater than zero cents.');
    }
    if (input.from_account_id === input.to_account_id) {
        throw new __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$domain$2f$accounting$2f$accountService$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["ValidationError"]('Source and destination accounts for a transfer must be different.');
    }
    const runAtomic = db.transaction(()=>{
        const fromAccount = db.prepare('SELECT * FROM m1_accounts WHERE id = ?').get(input.from_account_id);
        const toAccount = db.prepare('SELECT * FROM m1_accounts WHERE id = ?').get(input.to_account_id);
        if (!fromAccount) throw new __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$domain$2f$accounting$2f$accountService$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["ValidationError"](`Source account not found: ${input.from_account_id}`);
        if (!toAccount) throw new __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$domain$2f$accounting$2f$accountService$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["ValidationError"](`Destination account not found: ${input.to_account_id}`);
        // Financial role check: transfers only between asset and liability accounts
        if (![
            'asset',
            'liability'
        ].includes(fromAccount.type)) {
            throw new __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$domain$2f$accounting$2f$accountService$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["ValidationError"](`Source account for transfer must be an asset or liability account, received: "${fromAccount.type}".`);
        }
        if (![
            'asset',
            'liability'
        ].includes(toAccount.type)) {
            throw new __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$domain$2f$accounting$2f$accountService$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["ValidationError"](`Destination account for transfer must be an asset or liability account, received: "${toAccount.type}".`);
        }
        // Entity check: both accounts must belong to the same entity
        if (fromAccount.entity_id !== toAccount.entity_id) {
            throw new __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$domain$2f$accounting$2f$accountService$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["ValidationError"]('Cross-entity transfers are not supported in Slice 1C. Both accounts must belong to the same entity.');
        }
        // Currency check
        if (fromAccount.currency !== toAccount.currency) {
            throw new __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$domain$2f$accounting$2f$accountService$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["ValidationError"](`Transfers across different currencies (${fromAccount.currency} -> ${toAccount.currency}) require an explicit FX rate (supported in Slice 1D).`);
        }
        const desc = input.description || `Transfer from ${fromAccount.name} to ${toAccount.name}`;
        return postTransaction(db, {
            date: input.date,
            description: desc,
            origin: 'manual',
            idempotency_key: input.idempotency_key,
            evidence_refs: input.evidence_refs,
            postings: [
                {
                    account_id: fromAccount.id,
                    amount_cents: -input.amount_cents,
                    currency: fromAccount.currency,
                    memo: `Transfer to ${toAccount.name}`
                },
                {
                    account_id: toAccount.id,
                    amount_cents: input.amount_cents,
                    currency: toAccount.currency,
                    memo: `Transfer from ${fromAccount.name}`
                }
            ]
        });
    });
    return runAtomic();
}
function recordCreditCardRepayment(db, input) {
    assertValidCalendarDate(input.date, 'Repayment date');
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$domain$2f$accounting$2f$types$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["assertValidMoneyCents"])(input.amount_cents, 'Repayment amount');
    if (input.amount_cents <= 0) {
        throw new __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$domain$2f$accounting$2f$accountService$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["ValidationError"]('Repayment amount must be greater than zero cents.');
    }
    const runAtomic = db.transaction(()=>{
        const bankAccount = db.prepare('SELECT * FROM m1_accounts WHERE id = ?').get(input.bank_account_id);
        const cardAccount = db.prepare('SELECT * FROM m1_accounts WHERE id = ?').get(input.card_account_id);
        if (!bankAccount) throw new __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$domain$2f$accounting$2f$accountService$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["ValidationError"](`Bank account not found: ${input.bank_account_id}`);
        if (!cardAccount) throw new __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$domain$2f$accounting$2f$accountService$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["ValidationError"](`Credit card account not found: ${input.card_account_id}`);
        if (bankAccount.type !== 'asset') {
            throw new __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$domain$2f$accounting$2f$accountService$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["ValidationError"](`Payment source must be an asset account, received type: "${bankAccount.type}".`);
        }
        if (cardAccount.type !== 'liability' || cardAccount.sub_type !== 'credit_card') {
            throw new __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$domain$2f$accounting$2f$accountService$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["ValidationError"](`Credit card account must be a liability account with sub_type 'credit_card', received type: "${cardAccount.type}", sub_type: "${cardAccount.sub_type}".`);
        }
        // Entity check
        if (bankAccount.entity_id !== cardAccount.entity_id) {
            throw new __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$domain$2f$accounting$2f$accountService$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["ValidationError"]('Cross-entity credit card repayments are not supported. Both accounts must belong to the same entity.');
        }
        // Currency check
        if (bankAccount.currency !== cardAccount.currency) {
            throw new __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$domain$2f$accounting$2f$accountService$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["ValidationError"](`Cross-currency credit card repayment is not supported: bank account is in ${bankAccount.currency}, but credit card account is in ${cardAccount.currency}.`);
        }
        const desc = input.description || `Credit Card Payment - ${cardAccount.name}`;
        return postTransaction(db, {
            date: input.date,
            description: desc,
            origin: 'manual',
            idempotency_key: input.idempotency_key,
            evidence_refs: input.evidence_refs,
            postings: [
                {
                    account_id: bankAccount.id,
                    amount_cents: -input.amount_cents,
                    currency: bankAccount.currency,
                    memo: `Payment for ${cardAccount.name}`
                },
                {
                    account_id: cardAccount.id,
                    amount_cents: input.amount_cents,
                    currency: cardAccount.currency,
                    memo: `Repayment from ${bankAccount.name}`
                }
            ]
        });
    });
    return runAtomic();
}
function recordLoanRepayment(db, input) {
    assertValidCalendarDate(input.date, 'Payment date');
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$domain$2f$accounting$2f$types$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["assertValidMoneyCents"])(input.principal_cents, 'Principal cents');
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$domain$2f$accounting$2f$types$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["assertValidMoneyCents"])(input.interest_cents, 'Interest cents');
    const feeCents = input.fee_cents || 0;
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$domain$2f$accounting$2f$types$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["assertValidMoneyCents"])(feeCents, 'Fee cents');
    if (input.principal_cents < 0 || input.interest_cents < 0 || feeCents < 0) {
        throw new __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$domain$2f$accounting$2f$accountService$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["ValidationError"]('Principal, interest, and fee amounts cannot be negative.');
    }
    const totalCents = input.principal_cents + input.interest_cents + feeCents;
    if (totalCents <= 0) {
        throw new __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$domain$2f$accounting$2f$accountService$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["ValidationError"]('Total loan payment must be greater than zero cents.');
    }
    const runAtomic = db.transaction(()=>{
        const bankAccount = db.prepare('SELECT * FROM m1_accounts WHERE id = ?').get(input.bank_account_id);
        const loanAccount = db.prepare('SELECT * FROM m1_accounts WHERE id = ?').get(input.loan_account_id);
        if (!bankAccount) throw new __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$domain$2f$accounting$2f$accountService$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["ValidationError"](`Bank account not found: ${input.bank_account_id}`);
        if (!loanAccount) throw new __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$domain$2f$accounting$2f$accountService$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["ValidationError"](`Loan account not found: ${input.loan_account_id}`);
        if (bankAccount.type !== 'asset') {
            throw new __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$domain$2f$accounting$2f$accountService$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["ValidationError"](`Payment source must be an asset account, received type: "${bankAccount.type}".`);
        }
        if (loanAccount.type !== 'liability') {
            throw new __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$domain$2f$accounting$2f$accountService$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["ValidationError"](`Loan account must be a liability account, received type: "${loanAccount.type}".`);
        }
        // Entity check
        if (bankAccount.entity_id !== loanAccount.entity_id) {
            throw new __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$domain$2f$accounting$2f$accountService$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["ValidationError"]('Cross-entity loan repayments are not supported. Both accounts must belong to the same entity.');
        }
        // Currency check: bank and loan currencies MUST match
        if (bankAccount.currency !== loanAccount.currency) {
            throw new __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$domain$2f$accounting$2f$accountService$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["ValidationError"](`Cross-currency loan repayment is not supported: bank account is in ${bankAccount.currency}, but loan account is in ${loanAccount.currency}.`);
        }
        const currency = bankAccount.currency;
        // Ensure or validate interest expense account
        let interestAccId = input.interest_account_id;
        if (interestAccId) {
            const intAcc = db.prepare('SELECT * FROM m1_accounts WHERE id = ?').get(interestAccId);
            if (!intAcc) throw new __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$domain$2f$accounting$2f$accountService$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["ValidationError"](`Interest account not found: ${interestAccId}`);
            if (intAcc.type !== 'expense') throw new __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$domain$2f$accounting$2f$accountService$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["ValidationError"](`Interest account must be an expense account, received type: "${intAcc.type}".`);
            if (intAcc.entity_id !== bankAccount.entity_id) throw new __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$domain$2f$accounting$2f$accountService$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["ValidationError"](`Interest account does not belong to entity "${bankAccount.entity_id}".`);
            if (intAcc.currency !== currency) throw new __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$domain$2f$accounting$2f$accountService$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["ValidationError"](`Interest account currency (${intAcc.currency}) must match loan currency (${currency}).`);
        } else if (input.interest_cents > 0) {
            const interestAcc = ensureExpenseAccount(db, loanAccount.entity_id, 'loan_interest', currency);
            interestAccId = interestAcc.id;
        }
        // Ensure or validate fee expense account
        let feeAccId = input.fee_account_id;
        if (feeAccId) {
            const feeAcc = db.prepare('SELECT * FROM m1_accounts WHERE id = ?').get(feeAccId);
            if (!feeAcc) throw new __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$domain$2f$accounting$2f$accountService$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["ValidationError"](`Fee account not found: ${feeAccId}`);
            if (feeAcc.type !== 'expense') throw new __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$domain$2f$accounting$2f$accountService$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["ValidationError"](`Fee account must be an expense account, received type: "${feeAcc.type}".`);
            if (feeAcc.entity_id !== bankAccount.entity_id) throw new __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$domain$2f$accounting$2f$accountService$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["ValidationError"](`Fee account does not belong to entity "${bankAccount.entity_id}".`);
            if (feeAcc.currency !== currency) throw new __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$domain$2f$accounting$2f$accountService$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["ValidationError"](`Fee account currency (${feeAcc.currency}) must match loan currency (${currency}).`);
        } else if (feeCents > 0) {
            const feeAcc = ensureExpenseAccount(db, loanAccount.entity_id, 'bank_fee', currency);
            feeAccId = feeAcc.id;
        }
        const postings = [
            {
                account_id: bankAccount.id,
                amount_cents: -totalCents,
                currency,
                memo: `Loan instalment payment for ${loanAccount.name}`
            }
        ];
        if (input.principal_cents > 0) {
            postings.push({
                account_id: loanAccount.id,
                amount_cents: input.principal_cents,
                currency,
                memo: 'Principal reduction'
            });
        }
        if (input.interest_cents > 0 && interestAccId) {
            postings.push({
                account_id: interestAccId,
                amount_cents: input.interest_cents,
                currency,
                memo: `Interest on ${loanAccount.name}`
            });
        }
        if (feeCents > 0 && feeAccId) {
            postings.push({
                account_id: feeAccId,
                amount_cents: feeCents,
                currency,
                memo: `Fee on ${loanAccount.name}`
            });
        }
        const desc = input.description || `Loan Payment - ${loanAccount.name}`;
        return postTransaction(db, {
            date: input.date,
            description: desc,
            payee_or_payer: input.payee,
            origin: 'manual',
            idempotency_key: input.idempotency_key,
            evidence_refs: input.evidence_refs,
            postings
        });
    });
    return runAtomic();
}
function cascadeAssetValuations(db, accountId, afterDate, causalTxId) {
    const laterValuations = db.prepare(`
        SELECT v.id, v.transaction_id, v.valuation_date, v.target_valuation_cents,
               t.date, t.created_at, t.revision, t.description, t.payee_or_payer,
               t.status, t.origin, t.idempotency_key, t.evidence_refs
        FROM m1_asset_valuations v
        JOIN m1_transactions t ON v.transaction_id = t.id
        WHERE v.account_id = ? AND v.valuation_date >= ? AND t.status = 'posted'
          AND (? IS NULL OR v.transaction_id != ?)
        ORDER BY v.valuation_date ASC, v.created_at ASC
    `).all(accountId, afterDate, causalTxId || null, causalTxId || null);
    const now = new Date().toISOString();
    for (const lv of laterValuations){
        // Calculate cumulative balance of accountId immediately prior to lv.transaction_id
        const priorRows = db.prepare(`
            SELECT j.amount_cents
            FROM m1_journal_entries j
            JOIN m1_transactions t ON j.transaction_id = t.id
            WHERE j.account_id = ?
              AND t.status = 'posted'
              AND j.transaction_id != ?
              AND (t.date < ? OR (t.date = ? AND t.created_at < ?))
        `).all(accountId, lv.transaction_id, lv.date, lv.date, lv.created_at);
        const priorBalanceCents = priorRows.reduce((sum, r)=>sum + r.amount_cents, 0);
        const newDelta = lv.target_valuation_cents - priorBalanceCents;
        // Fetch current postings of lv.transaction_id
        const currentPostings = db.prepare(`
            SELECT j.id, j.transaction_id, j.account_id, j.amount_cents, j.currency, j.memo, a.type
            FROM m1_journal_entries j
            JOIN m1_accounts a ON j.account_id = a.id
            WHERE j.transaction_id = ?
        `).all(lv.transaction_id);
        const assetPosting = currentPostings.find((p)=>p.account_id === accountId);
        const equityPosting = currentPostings.find((p)=>p.type === 'equity');
        if (!assetPosting || !equityPosting) continue;
        // If delta is already correct, no mutation needed
        if (assetPosting.amount_cents === newDelta) continue;
        // Capture previous state snapshot before mutation (Resubmission Item 3)
        const previousSnapshot = JSON.stringify({
            transaction: {
                id: lv.transaction_id,
                date: lv.date,
                description: lv.description,
                payee_or_payer: lv.payee_or_payer,
                status: lv.status,
                origin: lv.origin,
                idempotency_key: lv.idempotency_key,
                evidence_refs: lv.evidence_refs ? JSON.parse(lv.evidence_refs) : null,
                revision: lv.revision,
                created_at: lv.created_at
            },
            postings: currentPostings.map((p)=>({
                    id: p.id,
                    transaction_id: p.transaction_id,
                    account_id: p.account_id,
                    amount_cents: p.amount_cents,
                    currency: p.currency,
                    memo: p.memo
                }))
        });
        // Update postings to new required delta
        db.prepare('UPDATE m1_journal_entries SET amount_cents = ? WHERE id = ?').run(newDelta, assetPosting.id);
        db.prepare('UPDATE m1_journal_entries SET amount_cents = ? WHERE id = ?').run(-newDelta, equityPosting.id);
        // Atomically bump transaction revision and updated_at
        const newRevision = lv.revision + 1;
        const res = db.prepare(`
            UPDATE m1_transactions
            SET revision = revision + 1, updated_at = ?
            WHERE id = ? AND revision = ?
        `).run(now, lv.transaction_id, lv.revision);
        if (res.changes === 0) {
            throw new __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$domain$2f$accounting$2f$accountService$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["ConflictError"](`Optimistic lock failure while cascading valuation for transaction ${lv.transaction_id}.`);
        }
        // Capture corrected state snapshot
        const updatedPostings = currentPostings.map((p)=>{
            if (p.id === assetPosting.id) return {
                ...p,
                amount_cents: newDelta
            };
            if (p.id === equityPosting.id) return {
                ...p,
                amount_cents: -newDelta
            };
            return p;
        });
        const correctedSnapshot = JSON.stringify({
            transaction: {
                id: lv.transaction_id,
                date: lv.date,
                description: lv.description,
                payee_or_payer: lv.payee_or_payer,
                status: lv.status,
                origin: lv.origin,
                idempotency_key: lv.idempotency_key,
                evidence_refs: lv.evidence_refs ? JSON.parse(lv.evidence_refs) : null,
                revision: newRevision,
                created_at: lv.created_at,
                updated_at: now
            },
            postings: updatedPostings.map((p)=>({
                    id: p.id,
                    transaction_id: p.transaction_id,
                    account_id: p.account_id,
                    amount_cents: p.amount_cents,
                    currency: p.currency,
                    memo: p.memo
                }))
        });
        // Record audit trail in m1_transaction_corrections with causal linkage
        const correctionId = crypto.randomUUID();
        const reason = causalTxId ? `Cascaded valuation adjustment preserving target ${lv.target_valuation_cents} cents following transaction ${causalTxId}` : `Cascaded valuation adjustment preserving target ${lv.target_valuation_cents} cents`;
        db.prepare(`
            INSERT INTO m1_transaction_corrections (
                id, transaction_id, operation, reason, previous_state, corrected_state, performed_by, timestamp
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `).run(correctionId, lv.transaction_id, 'revaluation_cascade', reason, previousSnapshot, correctedSnapshot, 'system:valuation_cascade', now);
    }
}
function recordAssetValuation(db, input) {
    const valDate = input.date || input.valuation_date || '';
    assertValidCalendarDate(valDate, 'Valuation date');
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$domain$2f$accounting$2f$types$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["assertValidMoneyCents"])(input.new_valuation_cents, 'New valuation amount');
    if (input.new_valuation_cents < 0) {
        throw new __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$domain$2f$accounting$2f$accountService$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["ValidationError"]('Asset valuation cannot be negative.');
    }
    const runAtomic = db.transaction(()=>{
        const assetAccount = db.prepare('SELECT * FROM m1_accounts WHERE id = ?').get(input.asset_account_id);
        if (!assetAccount) {
            throw new __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$domain$2f$accounting$2f$accountService$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["ValidationError"](`Asset account not found: ${input.asset_account_id}`);
        }
        if (assetAccount.type !== 'asset') {
            throw new __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$domain$2f$accounting$2f$accountService$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["ValidationError"](`Valuation adjustments are only supported on asset accounts, received type: "${assetAccount.type}".`);
        }
        const liquidCashSubTypes = [
            'cash',
            'checking',
            'savings'
        ];
        if (liquidCashSubTypes.includes(assetAccount.sub_type)) {
            throw new __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$domain$2f$accounting$2f$accountService$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["ValidationError"](`Cannot record valuation adjustment on liquid account type "${assetAccount.sub_type}". Use a transaction or opening balance.`);
        }
        const entityId = input.entity_id || assetAccount.entity_id;
        if (input.entity_id && assetAccount.entity_id !== input.entity_id) {
            throw new __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$domain$2f$accounting$2f$accountService$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["ValidationError"](`Asset account "${assetAccount.name}" belongs to entity "${assetAccount.entity_id}", not "${input.entity_id}".`);
        }
        // 1. Idempotency Pre-Check before calculating delta (Assessor Findings 6 & 8)
        if (input.idempotency_key) {
            const existingTx = db.prepare('SELECT * FROM m1_transactions WHERE idempotency_key = ?').get(input.idempotency_key);
            if (existingTx) {
                const existingVal = db.prepare('SELECT * FROM m1_asset_valuations WHERE transaction_id = ?').get(existingTx.id);
                const existingPostings = db.prepare('SELECT * FROM m1_journal_entries WHERE transaction_id = ?').all(existingTx.id);
                const isDateMatch = existingTx.date === valDate;
                const isAccountMatch = existingVal ? existingVal.account_id === assetAccount.id : existingPostings.some((p)=>p.account_id === assetAccount.id);
                const isValuationMatch = existingVal ? existingVal.target_valuation_cents === input.new_valuation_cents : true;
                // Description identity match (Resubmission Item 8)
                const sourceDesc = input.source ? ` (${input.source.trim()})` : '';
                const expectedDesc = input.description ? input.description.trim() : `Valuation Adjustment - ${assetAccount.name}${sourceDesc}`;
                const isDescMatch = existingTx.description === expectedDesc;
                // Source identity match (Resubmission Item 8)
                const expectedSource = input.source ? input.source.trim() : null;
                const existingSource = existingVal?.source ?? existingTx.payee_or_payer ?? null;
                const isSourceMatch = existingSource === expectedSource;
                // Evidence identity match (Assessor Finding 7)
                const existingEvidence = existingTx.evidence_refs ? JSON.parse(existingTx.evidence_refs) : [];
                const isEvidenceMatch = normalizeEvidenceRefs(existingEvidence) === normalizeEvidenceRefs(input.evidence_refs);
                if (isDateMatch && isAccountMatch && isValuationMatch && isDescMatch && isSourceMatch && isEvidenceMatch) {
                    return {
                        id: existingTx.id,
                        date: existingTx.date,
                        description: existingTx.description,
                        payee_or_payer: existingTx.payee_or_payer,
                        status: existingTx.status,
                        origin: existingTx.origin,
                        idempotency_key: existingTx.idempotency_key,
                        evidence_refs: existingTx.evidence_refs ? JSON.parse(existingTx.evidence_refs) : null,
                        revision: existingTx.revision,
                        created_at: existingTx.created_at,
                        updated_at: existingTx.updated_at,
                        postings: existingPostings.map((p)=>({
                                id: p.id,
                                transaction_id: p.transaction_id,
                                account_id: p.account_id,
                                amount_cents: p.amount_cents,
                                currency: p.currency,
                                memo: p.memo
                            }))
                    };
                }
                throw new __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$domain$2f$accounting$2f$accountService$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["ConflictError"](`Idempotency conflict: transaction already exists with idempotency key '${input.idempotency_key}' but different details (description, source, date, account, valuation amount, or evidence).`);
            }
        }
        // 2. Same-Day Valuation Enforcement (Resubmission Item 1)
        // Explicitly reject multiple same-day valuation targets for the same account.
        const existingSameDayVal = db.prepare(`
            SELECT v.id, v.transaction_id, v.target_valuation_cents
            FROM m1_asset_valuations v
            JOIN m1_transactions t ON v.transaction_id = t.id
            WHERE v.account_id = ? AND v.valuation_date = ? AND t.status = 'posted'
        `).get(assetAccount.id, valDate);
        if (existingSameDayVal) {
            throw new __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$domain$2f$accounting$2f$accountService$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["ValidationError"](`An asset valuation target already exists for account "${assetAccount.name}" on date "${valDate}". Multiple same-day valuations are not supported. Use edit or void to modify existing valuations.`);
        }
        // 3. Ensure an Unrealized Valuation Reserve account exists for this entity in the same currency
        let equityAccount = db.prepare(`
            SELECT id, name FROM m1_accounts
            WHERE entity_id = ? AND type = 'equity' AND sub_type = 'valuation_reserve' AND currency = ?
        `).get(entityId, assetAccount.currency);
        if (!equityAccount) {
            const reserveAcc = (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$domain$2f$accounting$2f$accountService$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["createAccount"])(db, {
                entity_id: entityId,
                name: `Unrealized Valuation Reserve (${assetAccount.currency})`,
                type: 'equity',
                sub_type: 'valuation_reserve',
                currency: assetAccount.currency
            });
            equityAccount = reserveAcc.account;
        }
        // 4. Calculate cumulative balance prior to valDate (excluding valuations on or after valDate)
        const priorRows = db.prepare(`
            SELECT j.amount_cents
            FROM m1_journal_entries j
            JOIN m1_transactions t ON j.transaction_id = t.id
            WHERE j.account_id = ?
              AND t.status = 'posted'
              AND (t.date < ? OR (t.date = ? AND t.id NOT IN (SELECT transaction_id FROM m1_asset_valuations WHERE account_id = ?)))
        `).all(assetAccount.id, valDate, valDate, assetAccount.id);
        const priorBalanceCents = priorRows.reduce((sum, r)=>sum + r.amount_cents, 0);
        const deltaCents = input.new_valuation_cents - priorBalanceCents;
        const currency = assetAccount.currency.toUpperCase();
        const postings = [];
        if (deltaCents === 0) {
            // Unchanged-Value Appraisal Evidence Preservation (Assessor Finding 3)
            // Record the appraisal transaction and valuation record even when carrying value is unchanged.
            // Two balanced 0-cent postings against Valuation Reserve equity ensure zero carrying balance delta.
            postings.push({
                account_id: assetAccount.id,
                amount_cents: 0,
                currency,
                memo: 'Appraisal verified (carrying value unchanged)'
            });
            postings.push({
                account_id: equityAccount.id,
                amount_cents: 0,
                currency,
                memo: 'Unrealized Valuation Reserve (carrying value unchanged)'
            });
        } else if (deltaCents > 0) {
            // Valuation Gain: Debit Asset (+), Credit Valuation Equity (-)
            postings.push({
                account_id: assetAccount.id,
                amount_cents: deltaCents,
                currency,
                memo: `Valuation Increase from appraisal: +${deltaCents} cents`
            });
            postings.push({
                account_id: equityAccount.id,
                amount_cents: -deltaCents,
                currency,
                memo: `Unrealized Valuation Reserve for ${assetAccount.name}`
            });
        } else {
            // Valuation Loss / Impairment: Credit Asset (-), Debit Valuation Equity (+)
            postings.push({
                account_id: assetAccount.id,
                amount_cents: deltaCents,
                currency,
                memo: `Valuation Impairment: ${deltaCents} cents`
            });
            postings.push({
                account_id: equityAccount.id,
                amount_cents: -deltaCents,
                currency,
                memo: `Unrealized Valuation Reserve for ${assetAccount.name}`
            });
        }
        const sourceDesc = input.source ? ` (${input.source.trim()})` : '';
        const desc = input.description ? input.description.trim() : `Valuation Adjustment - ${assetAccount.name}${sourceDesc}`;
        const postedTx = postTransaction(db, {
            date: valDate,
            description: desc,
            payee_or_payer: input.source ? input.source.trim() : null,
            origin: 'manual',
            idempotency_key: input.idempotency_key,
            evidence_refs: input.evidence_refs,
            postings
        });
        // 5. Record Target Valuation Anchor in m1_asset_valuations
        const valId = `val-${postedTx.id}`;
        const now = new Date().toISOString();
        db.prepare(`
            INSERT INTO m1_asset_valuations (id, transaction_id, account_id, valuation_date, target_valuation_cents, source, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        `).run(valId, postedTx.id, assetAccount.id, valDate, input.new_valuation_cents, input.source ? input.source.trim() : null, now);
        // 6. Cascade target preservation to any subsequent valuations
        cascadeAssetValuations(db, assetAccount.id, valDate, postedTx.id);
        return postedTx;
    });
    return runAtomic();
}
function correctTransaction(db, input) {
    if (!input.reason || input.reason.trim().length === 0) {
        throw new __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$domain$2f$accounting$2f$accountService$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["ValidationError"]('Correction reason is mandatory for auditable changes.');
    }
    if (!input.performed_by || input.performed_by.trim().length === 0) {
        throw new __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$domain$2f$accounting$2f$accountService$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["ValidationError"]('Performing actor/user must be identified for auditable corrections.');
    }
    const tx = db.prepare('SELECT * FROM m1_transactions WHERE id = ?').get(input.transaction_id);
    if (!tx) {
        throw new __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$domain$2f$accounting$2f$accountService$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["ValidationError"](`Transaction not found: ${input.transaction_id}`);
    }
    // Concurrency check (M1-SAFE-06, T12)
    if (tx.revision !== input.expected_revision) {
        throw new __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$domain$2f$accounting$2f$accountService$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["ConflictError"](`Transaction correction conflict: expected revision ${input.expected_revision}, but database is at revision ${tx.revision}.`);
    }
    const previousPostings = db.prepare('SELECT * FROM m1_journal_entries WHERE transaction_id = ?').all(input.transaction_id);
    const previousSnapshot = JSON.stringify({
        transaction: tx,
        postings: previousPostings
    });
    const correctionId = crypto.randomUUID();
    const now = new Date().toISOString();
    let correctedSnapshot = '';
    const executeCorrection = db.transaction(()=>{
        if (input.operation === 'void') {
            // Mark void
            const res = db.prepare(`
                UPDATE m1_transactions
                SET status = 'void', revision = revision + 1, updated_at = ?
                WHERE id = ? AND revision = ?
            `).run(now, input.transaction_id, input.expected_revision);
            if (res.changes === 0) {
                throw new __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$domain$2f$accounting$2f$accountService$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["ConflictError"](`Optimistic lock failure while voiding transaction ${input.transaction_id}.`);
            }
            // Valuation target preservation on void (Resubmission Item 2)
            const valRow = db.prepare('SELECT * FROM m1_asset_valuations WHERE transaction_id = ?').get(input.transaction_id);
            if (valRow) {
                db.prepare('DELETE FROM m1_asset_valuations WHERE transaction_id = ?').run(input.transaction_id);
                cascadeAssetValuations(db, valRow.account_id, valRow.valuation_date, input.transaction_id);
            } else {
                // If any non-valuation posting was on an asset account with subsequent valuations, cascade them
                for (const p of previousPostings){
                    const hasLater = db.prepare('SELECT COUNT(*) as cnt FROM m1_asset_valuations WHERE account_id = ? AND valuation_date >= ?').get(p.account_id, tx.date).cnt;
                    if (hasLater > 0) {
                        cascadeAssetValuations(db, p.account_id, tx.date, input.transaction_id);
                    }
                }
            }
            correctedSnapshot = JSON.stringify({
                transaction: {
                    ...tx,
                    status: 'void',
                    revision: input.expected_revision + 1,
                    updated_at: now
                },
                postings: previousPostings
            });
        } else if (input.operation === 'edit') {
            if (!input.new_data) {
                throw new __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$domain$2f$accounting$2f$accountService$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["ValidationError"]('New transaction data must be provided for edit operation.');
            }
            // Description validation
            if (input.new_data.description !== undefined && input.new_data.description.trim().length === 0) {
                throw new __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$domain$2f$accounting$2f$accountService$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["ValidationError"]('Transaction description cannot be empty.');
            }
            const newDesc = input.new_data.description !== undefined ? input.new_data.description.trim() : tx.description;
            // Date validation
            if (input.new_data.date !== undefined) {
                assertValidCalendarDate(input.new_data.date, 'Correction date');
            }
            const newDate = input.new_data.date !== undefined ? input.new_data.date : tx.date;
            const newPayee = input.new_data.payee_or_payer !== undefined ? input.new_data.payee_or_payer : tx.payee_or_payer;
            // Postings validation
            let updatedPostings = previousPostings;
            if (input.new_data.postings !== undefined) {
                if (input.new_data.postings.length < 2) {
                    throw new __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$domain$2f$accounting$2f$accountService$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["ValidationError"]('Replacement postings must contain at least two postings to satisfy double-entry balance.');
                }
                const preparedNew = input.new_data.postings.map((p)=>{
                    (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$domain$2f$accounting$2f$types$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["assertValidMoneyCents"])(p.amount_cents, `Posting for account ${p.account_id}`);
                    return {
                        id: crypto.randomUUID(),
                        transaction_id: input.transaction_id,
                        account_id: p.account_id,
                        amount_cents: p.amount_cents,
                        currency: p.currency.toUpperCase(),
                        memo: p.memo || null
                    };
                });
                const balanceCheck = (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$domain$2f$accounting$2f$types$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["validateTransactionBalance"])(preparedNew);
                if (!balanceCheck.isValid) {
                    throw new __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$domain$2f$accounting$2f$accountService$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["ValidationError"](`Edited postings out of balance by ${balanceCheck.delta_cents} cents.`);
                }
                // Verify accounts exist, currencies match, and all replacement accounts belong to the same sovereign entity
                const accountLookup = db.prepare('SELECT id, name, currency, entity_id, type, sub_type FROM m1_accounts WHERE id = ?');
                let correctionEntityId = null;
                for (const p of preparedNew){
                    const acc = accountLookup.get(p.account_id);
                    if (!acc) throw new __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$domain$2f$accounting$2f$accountService$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["ValidationError"](`Account does not exist: ${p.account_id}`);
                    if (p.currency !== acc.currency) {
                        throw new __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$domain$2f$accounting$2f$accountService$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["ValidationError"](`Posting currency "${p.currency}" does not match account currency "${acc.currency}" for account "${acc.name}".`);
                    }
                    if (correctionEntityId === null) {
                        correctionEntityId = acc.entity_id;
                    } else if (correctionEntityId !== acc.entity_id) {
                        throw new __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$domain$2f$accounting$2f$accountService$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["ValidationError"](`Cross-entity correction rejected: Replacement account "${acc.name}" belongs to entity "${acc.entity_id}", while other replacement postings belong to entity "${correctionEntityId}". In Slice 1C, all postings in a transaction must belong to the same sovereign entity.`);
                    }
                }
                // Invariant: replacement postings must belong to the same sovereign entity as the original transaction
                const origFirstAcc = previousPostings.length > 0 ? accountLookup.get(previousPostings[0].account_id) : null;
                const originalEntityId = origFirstAcc?.entity_id;
                if (originalEntityId && correctionEntityId !== originalEntityId) {
                    throw new __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$domain$2f$accounting$2f$accountService$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["ValidationError"](`Cross-entity correction rejected: Replacement postings belong to entity "${correctionEntityId}", but this transaction belongs to entity "${originalEntityId}". In Slice 1C, a transaction cannot be moved across sovereign entities.`);
                }
                // Valuation safety check (Assessor Finding 2):
                // If editing a valuation transaction, verify replacement postings can be interpreted safely as an authoritative valuation
                const valRowPre = db.prepare('SELECT * FROM m1_asset_valuations WHERE transaction_id = ?').get(input.transaction_id);
                let computedTargetCents = null;
                if (valRowPre) {
                    const assetPostings = preparedNew.filter((p)=>p.account_id === valRowPre.account_id);
                    if (assetPostings.length !== 1) {
                        throw new __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$domain$2f$accounting$2f$accountService$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["ValidationError"]('Cannot safely interpret edited postings as an asset valuation: exactly one asset account posting is required.');
                    }
                    const counterpartPostings = preparedNew.filter((p)=>p.account_id !== valRowPre.account_id);
                    const counterpartAccounts = counterpartPostings.map((p)=>accountLookup.get(p.account_id));
                    const allEquityReserve = counterpartAccounts.every((a)=>a && a.type === 'equity' && a.sub_type === 'valuation_reserve');
                    if (!allEquityReserve) {
                        throw new __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$domain$2f$accounting$2f$accountService$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["ValidationError"]('Cannot safely interpret edited postings as an asset valuation: counterpart postings must be Unrealized Valuation Reserve equity.');
                    }
                    // Calculate new authoritative target valuation
                    const priorRows = db.prepare(`
                        SELECT j.amount_cents
                        FROM m1_journal_entries j
                        JOIN m1_transactions t ON j.transaction_id = t.id
                        WHERE j.account_id = ?
                          AND t.status = 'posted'
                          AND t.id != ?
                          AND (t.date < ? OR (t.date = ? AND t.id NOT IN (SELECT transaction_id FROM m1_asset_valuations WHERE account_id = ?)))
                    `).all(valRowPre.account_id, input.transaction_id, newDate, newDate, valRowPre.account_id);
                    const priorBalance = priorRows.reduce((sum, r)=>sum + r.amount_cents, 0);
                    computedTargetCents = priorBalance + assetPostings[0].amount_cents;
                    if (computedTargetCents <= 0) {
                        throw new __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$domain$2f$accounting$2f$accountService$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["ValidationError"](`Target valuation must be strictly positive, calculated: ${computedTargetCents} cents.`);
                    }
                }
                // Delete old postings and insert new
                db.prepare('DELETE FROM m1_journal_entries WHERE transaction_id = ?').run(input.transaction_id);
                const insertPosting = db.prepare(`
                    INSERT INTO m1_journal_entries (id, transaction_id, account_id, amount_cents, currency, memo)
                    VALUES (?, ?, ?, ?, ?, ?)
                `);
                for (const p of preparedNew){
                    insertPosting.run(p.id, p.transaction_id, p.account_id, p.amount_cents, p.currency, p.memo);
                }
                updatedPostings = preparedNew;
                // Update authoritative target in m1_asset_valuations if computed
                if (valRowPre && computedTargetCents !== null) {
                    db.prepare('UPDATE m1_asset_valuations SET target_valuation_cents = ?, valuation_date = ? WHERE id = ?').run(computedTargetCents, newDate, valRowPre.id);
                }
            }
            const res = db.prepare(`
                UPDATE m1_transactions
                SET description = ?, date = ?, payee_or_payer = ?, revision = revision + 1, updated_at = ?
                WHERE id = ? AND revision = ?
            `).run(newDesc, newDate, newPayee, now, input.transaction_id, input.expected_revision);
            if (res.changes === 0) {
                throw new __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$domain$2f$accounting$2f$accountService$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["ConflictError"](`Optimistic lock failure while editing transaction ${input.transaction_id}.`);
            }
            // Valuation target preservation on edit (Resubmission Item 2)
            const valRow = db.prepare('SELECT * FROM m1_asset_valuations WHERE transaction_id = ?').get(input.transaction_id);
            if (valRow) {
                if (newDate !== valRow.valuation_date) {
                    db.prepare('UPDATE m1_asset_valuations SET valuation_date = ? WHERE id = ?').run(newDate, valRow.id);
                }
                const minDate = newDate < valRow.valuation_date ? newDate : valRow.valuation_date;
                cascadeAssetValuations(db, valRow.account_id, minDate, input.transaction_id);
            } else {
                for (const p of updatedPostings){
                    const minDate = newDate < tx.date ? newDate : tx.date;
                    const hasLater = db.prepare('SELECT COUNT(*) as cnt FROM m1_asset_valuations WHERE account_id = ? AND valuation_date >= ?').get(p.account_id, minDate).cnt;
                    if (hasLater > 0) {
                        cascadeAssetValuations(db, p.account_id, minDate, input.transaction_id);
                    }
                }
            }
            correctedSnapshot = JSON.stringify({
                transaction: {
                    ...tx,
                    description: newDesc,
                    date: newDate,
                    payee_or_payer: newPayee,
                    revision: input.expected_revision + 1,
                    updated_at: now
                },
                postings: updatedPostings
            });
        }
        // Insert auditable record
        db.prepare(`
            INSERT INTO m1_transaction_corrections (
                id, transaction_id, operation, reason, previous_state, corrected_state, performed_by, timestamp
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `).run(correctionId, input.transaction_id, input.operation, input.reason.trim(), previousSnapshot, correctedSnapshot, input.performed_by.trim(), now);
    });
    executeCorrection();
    return {
        id: correctionId,
        transaction_id: input.transaction_id,
        operation: input.operation,
        reason: input.reason.trim(),
        previous_state: previousSnapshot,
        corrected_state: correctedSnapshot,
        performed_by: input.performed_by.trim(),
        timestamp: now
    };
}
function listTransactions(db, options = {}) {
    let sql = `
        SELECT DISTINCT t.*
        FROM m1_transactions t
        JOIN m1_journal_entries j ON t.id = j.transaction_id
        JOIN m1_accounts a ON j.account_id = a.id
        WHERE 1=1
    `;
    const params = [];
    if (options.entityId) {
        sql += ' AND a.entity_id = ?';
        params.push(options.entityId);
    }
    if (options.accountId) {
        sql += ' AND j.account_id = ?';
        params.push(options.accountId);
    }
    if (options.startDate) {
        sql += ' AND t.date >= ?';
        params.push(options.startDate);
    }
    if (options.endDate) {
        sql += ' AND t.date <= ?';
        params.push(options.endDate);
    }
    sql += ' ORDER BY t.date DESC, t.created_at DESC';
    if (options.limit) {
        sql += ` LIMIT ${Math.min(options.limit, 500)}`;
    }
    const txRows = db.prepare(sql).all(...params);
    if (txRows.length === 0) return [];
    const txIds = txRows.map((t)=>t.id);
    const placeholders = txIds.map(()=>'?').join(',');
    const postingRows = db.prepare(`
        SELECT * FROM m1_journal_entries
        WHERE transaction_id IN (${placeholders})
    `).all(...txIds);
    const postingsByTx = new Map();
    for (const p of postingRows){
        if (!postingsByTx.has(p.transaction_id)) {
            postingsByTx.set(p.transaction_id, []);
        }
        postingsByTx.get(p.transaction_id).push({
            id: p.id,
            transaction_id: p.transaction_id,
            account_id: p.account_id,
            amount_cents: p.amount_cents,
            currency: p.currency,
            memo: p.memo
        });
    }
    return txRows.map((t)=>({
            id: t.id,
            date: t.date,
            description: t.description,
            payee_or_payer: t.payee_or_payer,
            status: t.status,
            origin: t.origin,
            idempotency_key: t.idempotency_key,
            evidence_refs: t.evidence_refs ? JSON.parse(t.evidence_refs) : null,
            revision: t.revision,
            created_at: t.created_at,
            updated_at: t.updated_at,
            postings: postingsByTx.get(t.id) || []
        }));
}
}),
"[project]/src/lib/domain/document/documentInboxService.ts [app-route] (ecmascript)", ((__turbopack_context__) => {
"use strict";

/**
 * Milestone 1 Document Inbox & Proposal Review Orchestration Service (Slice 1E)
 * 
 * Why this file exists:
 * Implements the domain service layer for Document Ingestion, Column Mapping Profile persistence,
 * Internal/External Duplicate Detection, and Atomic Double-Entry Approval.
 * Conforms to ADR 001: Untrusted CSV documents produce provisional proposals, and only existing
 * accounting services (`postTransaction`) record confirmed financial reality.
 * 
 * Tricky logic:
 * - Content hash uniqueness: SHA-256 hash guarantees identical files uploaded multiple times
 *   map to the same document record, preventing orphaned storage duplication.
 * - Deterministic idempotency keys (`csv:${content_hash}:row:${row_number}`): Calling approval
 *   repeatedly or reimporting an existing file results in $0 duplicate financial postings.
 * - Internal vs External Duplicate Detection: Distinguishes between duplicate lines within the
 *   same CSV file vs matching existing transactions already recorded in the ledger.
 * - Double-entry posting: Correctly signs Debits and Credits so Sum(amount_cents) === 0:
 *   - Inflow (deposit): Debit Bank Account (+cents), Credit Income/Transfer Account (-cents).
 *   - Outflow (withdrawal): Debit Expense/Transfer Account (+cents), Credit Bank Account (-cents).
 * 
 * TODO: Add automatic merchant-to-category learning based on user's past approved proposals in Slice 1F.
 */ __turbopack_context__.s([
    "approveProposals",
    ()=>approveProposals,
    "computeContentHash",
    ()=>computeContentHash,
    "findMatchingMapping",
    ()=>findMatchingMapping,
    "getCandidateTransactionsForProposal",
    ()=>getCandidateTransactionsForProposal,
    "getDocumentProposals",
    ()=>getDocumentProposals,
    "getProposalById",
    ()=>getProposalById,
    "ingestCsvDocument",
    ()=>ingestCsvDocument,
    "ingestPdfDocument",
    ()=>ingestPdfDocument,
    "linkProposalToTransaction",
    ()=>linkProposalToTransaction,
    "listCsvMappings",
    ()=>listCsvMappings,
    "listDocuments",
    ()=>listDocuments,
    "reprocessDocumentWithMapping",
    ()=>reprocessDocumentWithMapping,
    "saveCsvMapping",
    ()=>saveCsvMapping,
    "updateProposalReview",
    ()=>updateProposalReview
]);
var __TURBOPACK__imported__module__$5b$externals$5d2f$crypto__$5b$external$5d$__$28$crypto$2c$__cjs$29$__ = __turbopack_context__.i("[externals]/crypto [external] (crypto, cjs)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$domain$2f$document$2f$csvParserService$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/lib/domain/document/csvParserService.ts [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$domain$2f$document$2f$openTaxAdapter$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/lib/domain/document/openTaxAdapter.ts [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$domain$2f$accounting$2f$transactionService$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/lib/domain/accounting/transactionService.ts [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$domain$2f$accounting$2f$types$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/lib/domain/accounting/types.ts [app-route] (ecmascript)");
;
;
;
;
;
function computeContentHash(content) {
    return __TURBOPACK__imported__module__$5b$externals$5d2f$crypto__$5b$external$5d$__$28$crypto$2c$__cjs$29$__["default"].createHash('sha256').update(content).digest('hex');
}
function saveCsvMapping(db, mapping) {
    const id = mapping.id || `map-${__TURBOPACK__imported__module__$5b$externals$5d2f$crypto__$5b$external$5d$__$28$crypto$2c$__cjs$29$__["default"].randomUUID()}`;
    const now = new Date().toISOString();
    const existing = db.prepare('SELECT id, created_at FROM m1_csv_mappings WHERE id = ?').get(id);
    const createdAt = existing ? existing.created_at : now;
    db.prepare(`
        INSERT INTO m1_csv_mappings (
            id, name, header_signature, date_column, date_format, description_column,
            amount_mode, amount_column, debit_column, credit_column, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(id) DO UPDATE SET
            name = excluded.name,
            header_signature = excluded.header_signature,
            date_column = excluded.date_column,
            date_format = excluded.date_format,
            description_column = excluded.description_column,
            amount_mode = excluded.amount_mode,
            amount_column = excluded.amount_column,
            debit_column = excluded.debit_column,
            credit_column = excluded.credit_column,
            updated_at = excluded.updated_at
    `).run(id, mapping.name, mapping.header_signature, mapping.date_column, mapping.date_format, mapping.description_column, mapping.amount_mode, mapping.amount_column || null, mapping.debit_column || null, mapping.credit_column || null, createdAt, now);
    return {
        id,
        name: mapping.name,
        header_signature: mapping.header_signature,
        date_column: mapping.date_column,
        date_format: mapping.date_format,
        description_column: mapping.description_column,
        amount_mode: mapping.amount_mode,
        amount_column: mapping.amount_column || null,
        debit_column: mapping.debit_column || null,
        credit_column: mapping.credit_column || null,
        created_at: createdAt,
        updated_at: now
    };
}
function listCsvMappings(db) {
    const rows = db.prepare('SELECT * FROM m1_csv_mappings ORDER BY updated_at DESC').all();
    return rows.map((r)=>({
            id: r.id,
            name: r.name,
            header_signature: r.header_signature,
            date_column: r.date_column,
            date_format: r.date_format,
            description_column: r.description_column,
            amount_mode: r.amount_mode,
            amount_column: r.amount_column,
            debit_column: r.debit_column,
            credit_column: r.credit_column,
            created_at: r.created_at,
            updated_at: r.updated_at
        }));
}
function findMatchingMapping(db, headerSignature) {
    const row = db.prepare('SELECT * FROM m1_csv_mappings WHERE header_signature = ? LIMIT 1').get(headerSignature);
    if (!row) return null;
    return {
        id: row.id,
        name: row.name,
        header_signature: row.header_signature,
        date_column: row.date_column,
        date_format: row.date_format,
        description_column: row.description_column,
        amount_mode: row.amount_mode,
        amount_column: row.amount_column,
        debit_column: row.debit_column,
        credit_column: row.credit_column,
        created_at: row.created_at,
        updated_at: row.updated_at
    };
}
function ingestCsvDocument(db, input) {
    const contentHash = computeContentHash(input.raw_content);
    const byteSize = Buffer.byteLength(input.raw_content, 'utf8');
    const now = new Date().toISOString();
    // Verify target account exists
    const targetAccount = db.prepare('SELECT * FROM m1_accounts WHERE id = ?').get(input.target_account_id);
    if (!targetAccount) {
        throw new Error(`Target account not found: ${input.target_account_id}`);
    }
    const entityId = input.entity_id || targetAccount.entity_id;
    const currency = targetAccount.currency;
    // 1. Store or retrieve document record
    let documentId;
    const existingDoc = db.prepare('SELECT * FROM m1_documents WHERE content_hash = ?').get(contentHash);
    if (existingDoc) {
        documentId = existingDoc.id;
    } else {
        documentId = `doc-${__TURBOPACK__imported__module__$5b$externals$5d2f$crypto__$5b$external$5d$__$28$crypto$2c$__cjs$29$__["default"].randomUUID()}`;
        db.prepare(`
            INSERT INTO m1_documents (id, filename, content_hash, mime_type, byte_size, raw_content, created_at)
            VALUES (?, ?, ?, 'text/csv', ?, ?, ?)
        `).run(documentId, input.filename, contentHash, byteSize, input.raw_content, now);
    }
    const docMetadata = {
        id: documentId,
        filename: existingDoc ? existingDoc.filename : input.filename,
        content_hash: contentHash,
        mime_type: 'text/csv',
        byte_size: byteSize,
        created_at: existingDoc ? existingDoc.created_at : now
    };
    // 2. Parse CSV rows with exact account currency scale
    const parseResult = (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$domain$2f$document$2f$csvParserService$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["parseCsvWithMapping"])(input.raw_content, input.mapping, currency);
    // 3. Duplicate detection tracking
    const seenInternalRows = new Map(); // key -> row_number
    let internalDuplicatesCount = 0;
    let externalDuplicatesCount = 0;
    // Prepare external ledger check query
    const checkLedgerStmt = db.prepare(`
        SELECT tx.id, tx.date, tx.description, je.amount_cents
        FROM m1_transactions tx
        JOIN m1_journal_entries je ON tx.id = je.transaction_id
        WHERE je.account_id = ? AND tx.date = ? AND je.amount_cents = ?
        LIMIT 1
    `);
    // Prepare proposal queries
    const getExistingPropStmt = db.prepare('SELECT * FROM m1_proposals WHERE id = ?');
    const insertPropStmt = db.prepare(`
        INSERT INTO m1_proposals (
            id, document_id, entity_id, account_id, event_date, document_period,
            original_currency, amount_cents, counterparty, description, event_type,
            suggested_category, evidence_json, extraction_version, validation_findings,
            review_status, related_proposal_ids, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    const updateUnapprovedPropStmt = db.prepare(`
        UPDATE m1_proposals SET
            entity_id = ?,
            account_id = ?,
            event_date = ?,
            document_period = ?,
            original_currency = ?,
            amount_cents = ?,
            counterparty = ?,
            description = ?,
            event_type = ?,
            suggested_category = ?,
            evidence_json = ?,
            extraction_version = ?,
            validation_findings = ?,
            updated_at = ?
        WHERE id = ? AND review_status != 'approved'
    `);
    const proposals = [];
    const saveTransaction = db.transaction(()=>{
        for (const row of parseResult.rows){
            const proposalId = `prop-${documentId}-r${row.row_number}`;
            const existingProp = getExistingPropStmt.get(proposalId);
            // Requirement 2: If proposal was already approved into the ledger, preserve it unchanged!
            if (existingProp && (existingProp.review_status === 'approved' || existingProp.review_status === 'linked')) {
                proposals.push({
                    id: existingProp.id,
                    document_id: existingProp.document_id,
                    entity_id: existingProp.entity_id,
                    account_id: existingProp.account_id,
                    event_date: existingProp.event_date,
                    document_period: existingProp.document_period,
                    original_currency: existingProp.original_currency,
                    amount_cents: existingProp.amount_cents,
                    counterparty: existingProp.counterparty,
                    description: existingProp.description,
                    event_type: existingProp.event_type,
                    suggested_category: existingProp.suggested_category,
                    evidence: JSON.parse(existingProp.evidence_json),
                    extraction_version: existingProp.extraction_version,
                    validation_findings: existingProp.validation_findings ? JSON.parse(existingProp.validation_findings) : [],
                    review_status: existingProp.review_status,
                    related_proposal_ids: existingProp.related_proposal_ids ? JSON.parse(existingProp.related_proposal_ids) : [],
                    linked_transaction_id: existingProp.linked_transaction_id || null,
                    created_at: existingProp.created_at,
                    updated_at: existingProp.updated_at
                });
                continue;
            }
            const findings = [
                ...row.validation_findings
            ];
            // Only perform duplicate matching on valid rows with date and amount
            if (row.date && row.amount_cents !== null) {
                // A. Internal duplicate detection (same date, same amount, same description)
                const internalKey = `${row.date}:${row.amount_cents}:${row.description.trim().toLowerCase()}`;
                if (seenInternalRows.has(internalKey)) {
                    const firstRowNumber = seenInternalRows.get(internalKey);
                    findings.push({
                        severity: 'warning',
                        code: 'SUSPECTED_DUPLICATE_INTERNAL',
                        message: `Row matches earlier row #${firstRowNumber} in this file with identical date and amount.`,
                        field: 'row'
                    });
                    internalDuplicatesCount++;
                } else {
                    seenInternalRows.set(internalKey, row.row_number);
                }
                // B. External duplicate detection against confirmed ledger transactions
                // Note: Posting on bank account is positive for income, negative for expense
                const expectedBankPostingCents = row.event_type === 'income' ? Math.abs(row.amount_cents) : -Math.abs(row.amount_cents);
                const existingTx = checkLedgerStmt.get(input.target_account_id, row.date, expectedBankPostingCents);
                if (existingTx) {
                    findings.push({
                        severity: 'warning',
                        code: 'POSSIBLE_DUPLICATE_EXISTING',
                        message: `A posted transaction ("${existingTx.description}") with matching date and amount already exists on this account.`,
                        field: 'row'
                    });
                    externalDuplicatesCount++;
                }
            }
            const evidence = {
                document_id: documentId,
                content_hash: contentHash,
                cell_reference: `Row ${row.row_number}`,
                extraction_version: 'slice1e-csv-v1',
                source_snippet: row.raw_snippet
            };
            const proposal = {
                id: proposalId,
                document_id: documentId,
                entity_id: entityId,
                account_id: input.target_account_id,
                event_date: row.date || '1970-01-01',
                document_period: row.date ? row.date.substring(0, 7) : null,
                original_currency: currency,
                amount_cents: row.amount_cents ?? 0,
                counterparty: row.description,
                description: row.description,
                event_type: row.event_type,
                suggested_category: input.default_category || (row.event_type === 'income' ? 'salary' : 'living_expense'),
                evidence,
                extraction_version: 'slice1e-csv-v1',
                validation_findings: findings,
                review_status: 'unreviewed',
                related_proposal_ids: [],
                linked_transaction_id: null,
                created_at: existingProp ? existingProp.created_at : now,
                updated_at: now
            };
            if (existingProp) {
                // Requirement 2: Corrected mapping reprocessing updates unapproved proposals
                updateUnapprovedPropStmt.run(proposal.entity_id, proposal.account_id, proposal.event_date, proposal.document_period, proposal.original_currency, proposal.amount_cents, proposal.counterparty, proposal.description, proposal.event_type, proposal.suggested_category, JSON.stringify(proposal.evidence), proposal.extraction_version, JSON.stringify(proposal.validation_findings), now, proposal.id);
            } else {
                insertPropStmt.run(proposal.id, proposal.document_id, proposal.entity_id, proposal.account_id, proposal.event_date, proposal.document_period, proposal.original_currency, proposal.amount_cents, proposal.counterparty, proposal.description, proposal.event_type, proposal.suggested_category, JSON.stringify(proposal.evidence), proposal.extraction_version, JSON.stringify(proposal.validation_findings), proposal.review_status, JSON.stringify(proposal.related_proposal_ids), proposal.created_at, proposal.updated_at);
            }
            proposals.push(proposal);
        }
    });
    saveTransaction();
    return {
        document: docMetadata,
        proposals,
        internal_duplicates_count: internalDuplicatesCount,
        external_duplicates_count: externalDuplicatesCount
    };
}
function listDocuments(db) {
    const docs = db.prepare('SELECT * FROM m1_documents ORDER BY created_at DESC').all();
    const propStats = db.prepare(`
        SELECT
            document_id,
            COUNT(*) as total,
            SUM(CASE WHEN review_status = 'unreviewed' THEN 1 ELSE 0 END) as unreviewed,
            SUM(CASE WHEN review_status = 'approved' THEN 1 ELSE 0 END) as approved,
            SUM(CASE WHEN review_status = 'linked' THEN 1 ELSE 0 END) as linked,
            SUM(CASE WHEN review_status = 'rejected' THEN 1 ELSE 0 END) as rejected
        FROM m1_proposals
        GROUP BY document_id
    `).all();
    const statsMap = new Map();
    for (const stat of propStats){
        statsMap.set(stat.document_id, stat);
    }
    return docs.map((d)=>{
        const stats = statsMap.get(d.id) || {
            total: 0,
            unreviewed: 0,
            approved: 0,
            linked: 0,
            rejected: 0
        };
        return {
            id: d.id,
            filename: d.filename,
            content_hash: d.content_hash,
            mime_type: d.mime_type,
            byte_size: d.byte_size,
            storage_path: d.storage_path,
            created_at: d.created_at,
            total_proposals: stats.total,
            unreviewed_proposals: stats.unreviewed,
            approved_proposals: stats.approved,
            linked_proposals: stats.linked,
            rejected_proposals: stats.rejected
        };
    });
}
function getDocumentProposals(db, documentId) {
    const rows = db.prepare('SELECT * FROM m1_proposals WHERE document_id = ? ORDER BY id ASC').all(documentId);
    return rows.map((r)=>({
            id: r.id,
            document_id: r.document_id,
            entity_id: r.entity_id,
            account_id: r.account_id,
            event_date: r.event_date,
            document_period: r.document_period,
            original_currency: r.original_currency,
            amount_cents: r.amount_cents,
            counterparty: r.counterparty,
            description: r.description,
            event_type: r.event_type,
            suggested_category: r.suggested_category,
            evidence: JSON.parse(r.evidence_json),
            extraction_version: r.extraction_version,
            validation_findings: r.validation_findings ? JSON.parse(r.validation_findings) : [],
            review_status: r.review_status,
            related_proposal_ids: r.related_proposal_ids ? JSON.parse(r.related_proposal_ids) : [],
            linked_transaction_id: r.linked_transaction_id || null,
            created_at: r.created_at,
            updated_at: r.updated_at
        }));
}
function approveProposals(db, input) {
    const doc = db.prepare('SELECT * FROM m1_documents WHERE id = ?').get(input.document_id);
    if (!doc) {
        throw new Error(`Document not found: ${input.document_id}`);
    }
    const targetAccount = db.prepare('SELECT * FROM m1_accounts WHERE id = ?').get(input.target_account_id);
    if (!targetAccount) {
        throw new Error(`Target account not found: ${input.target_account_id}`);
    }
    const entityId = input.entity_id || targetAccount.entity_id;
    const currency = targetAccount.currency;
    const getPropStmt = db.prepare('SELECT * FROM m1_proposals WHERE id = ? AND document_id = ?');
    const updatePropStmt = db.prepare(`
        UPDATE m1_proposals
        SET review_status = 'approved',
            description = ?,
            counterparty = ?,
            suggested_category = ?,
            updated_at = ?
        WHERE id = ?
    `);
    const transactionIds = [];
    let approvedCount = 0;
    const approveBatchTx = db.transaction(()=>{
        for (const item of input.items){
            const rawProp = getPropStmt.get(item.proposal_id, input.document_id);
            if (!rawProp) {
                throw new Error(`Proposal not found: ${item.proposal_id}`);
            }
            // Requirement 2 (Slice 1G): Linked proposals cannot transition to standalone approved transactions
            if (rawProp.review_status === 'linked' || rawProp.linked_transaction_id) {
                throw new Error(`Cannot approve proposal "${item.proposal_id}": this proposal is already linked to existing transaction "${rawProp.linked_transaction_id}" as supporting evidence.`);
            }
            const findings = rawProp.validation_findings ? JSON.parse(rawProp.validation_findings) : [];
            const hasBlockingError = findings.some((f)=>f.severity === 'error');
            if (hasBlockingError) {
                throw new Error(`Cannot approve proposal "${item.proposal_id}" because it contains unresolved error findings.`);
            }
            // Fix D: Require explicit duplicate confirmation
            const hasDuplicateWarning = findings.some((f)=>f.code === 'POSSIBLE_DUPLICATE_EXISTING' || f.code === 'SUSPECTED_DUPLICATE_INTERNAL');
            if (hasDuplicateWarning && item.duplicate_confirmed !== true) {
                throw new Error(`Cannot approve proposal "${item.proposal_id}": it is a possible duplicate and requires explicit confirmation.`);
            }
            // Requirement 3 (Slice 1F Fix 1): Approval must match the reviewed account and currency
            if (rawProp.account_id && rawProp.account_id !== targetAccount.id) {
                throw new Error(`Cannot approve proposal "${item.proposal_id}": reviewed account "${rawProp.account_id}" does not match approval target account "${targetAccount.id}".`);
            }
            // Missing currency must remain unresolved until reviewed; approval is blocked
            if (!rawProp.original_currency || rawProp.original_currency.trim() === '') {
                throw new Error(`Cannot approve proposal "${item.proposal_id}": missing currency must remain unresolved until reviewed.`);
            }
            // Payment account must use the same currency
            if (rawProp.original_currency.toUpperCase() !== targetAccount.currency.toUpperCase()) {
                throw new Error(`Cannot approve proposal "${item.proposal_id}": reviewed currency "${rawProp.original_currency}" does not match approval target account currency "${targetAccount.currency}".`);
            }
            const evidence = JSON.parse(rawProp.evidence_json);
            const description = item.description || rawProp.description;
            const counterparty = item.counterparty || rawProp.counterparty || null;
            const category = item.category || rawProp.suggested_category || 'living_expense';
            const absAmount = Math.abs(rawProp.amount_cents);
            // Requirement 4 (Slice 1F): Explicit payment confirmation required before recording an expense for invoice proposals
            const isInvoiceDoc = doc.mime_type === 'application/pdf' || rawProp.evidence_json && rawProp.evidence_json.includes('opentax');
            if (isInvoiceDoc && rawProp.event_type === 'expense' && item.payment_confirmed !== true) {
                throw new Error(`Cannot approve proposal "${item.proposal_id}": payment must be explicitly confirmed before recording an expense.`);
            }
            // Deterministic idempotency key
            const idempotencyKey = `doc:${doc.content_hash}:prop:${rawProp.id}`;
            let txResult;
            if (rawProp.event_type === 'income') {
                // Inflow / Deposit: Debit Bank Account (+cents), Credit Income Account (-cents)
                const incomeAccount = (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$domain$2f$accounting$2f$transactionService$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["ensureIncomeAccount"])(db, entityId, category, currency);
                txResult = (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$domain$2f$accounting$2f$transactionService$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["postTransaction"])(db, {
                    date: rawProp.event_date,
                    description,
                    payee_or_payer: counterparty,
                    origin: 'document_extraction',
                    idempotency_key: idempotencyKey,
                    evidence_refs: [
                        evidence
                    ],
                    postings: [
                        {
                            account_id: targetAccount.id,
                            amount_cents: absAmount,
                            currency
                        },
                        {
                            account_id: incomeAccount.id,
                            amount_cents: -absAmount,
                            currency
                        }
                    ]
                });
            } else if (rawProp.event_type === 'transfer' && item.transfer_account_id) {
                // Transfer between two balance sheet accounts
                const transferAccount = db.prepare('SELECT * FROM m1_accounts WHERE id = ?').get(item.transfer_account_id);
                if (!transferAccount) {
                    throw new Error(`Transfer counterpart account not found: ${item.transfer_account_id}`);
                }
                if (transferAccount.currency.toUpperCase() !== targetAccount.currency.toUpperCase()) {
                    throw new Error(`Cannot approve transfer for proposal "${item.proposal_id}": counterpart account currency "${transferAccount.currency}" does not match target account currency "${targetAccount.currency}".`);
                }
                // If transferring out of bank to another account:
                // Debit destination (+absAmount), Credit bank (-absAmount)
                txResult = (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$domain$2f$accounting$2f$transactionService$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["postTransaction"])(db, {
                    date: rawProp.event_date,
                    description,
                    payee_or_payer: counterparty,
                    origin: 'document_extraction',
                    idempotency_key: idempotencyKey,
                    evidence_refs: [
                        evidence
                    ],
                    postings: [
                        {
                            account_id: transferAccount.id,
                            amount_cents: absAmount,
                            currency
                        },
                        {
                            account_id: targetAccount.id,
                            amount_cents: -absAmount,
                            currency
                        }
                    ]
                });
            } else {
                // Default: Outflow / Expense
                // Debit Expense Account (+absAmount), Credit Bank Account (-absAmount)
                const expenseAccount = (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$domain$2f$accounting$2f$transactionService$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["ensureExpenseAccount"])(db, entityId, category, currency);
                txResult = (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$domain$2f$accounting$2f$transactionService$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["postTransaction"])(db, {
                    date: rawProp.event_date,
                    description,
                    payee_or_payer: counterparty,
                    origin: 'document_extraction',
                    idempotency_key: idempotencyKey,
                    evidence_refs: [
                        evidence
                    ],
                    postings: [
                        {
                            account_id: expenseAccount.id,
                            amount_cents: absAmount,
                            currency
                        },
                        {
                            account_id: targetAccount.id,
                            amount_cents: -absAmount,
                            currency
                        }
                    ]
                });
            }
            // Mark proposal as approved in database
            const now = new Date().toISOString();
            updatePropStmt.run(description, counterparty, category, now, rawProp.id);
            transactionIds.push(txResult.id);
            approvedCount++;
        }
    });
    approveBatchTx();
    return {
        approved_count: approvedCount,
        transaction_ids: transactionIds
    };
}
function reprocessDocumentWithMapping(db, input) {
    const doc = db.prepare('SELECT * FROM m1_documents WHERE id = ?').get(input.document_id);
    if (!doc) {
        throw new Error(`Document not found: ${input.document_id}`);
    }
    if (!doc.raw_content) {
        throw new Error(`Cannot reprocess document ${input.document_id}: raw file content is missing.`);
    }
    let targetAccountId = input.target_account_id;
    if (!targetAccountId) {
        const existingProp = db.prepare('SELECT account_id FROM m1_proposals WHERE document_id = ? AND account_id IS NOT NULL LIMIT 1').get(input.document_id);
        if (existingProp) {
            targetAccountId = existingProp.account_id;
        }
    }
    if (!targetAccountId) {
        throw new Error('Target account ID is required to reprocess document proposals.');
    }
    return ingestCsvDocument(db, {
        filename: doc.filename,
        raw_content: doc.raw_content,
        mapping: input.mapping,
        target_account_id: targetAccountId,
        default_category: input.default_category,
        entity_id: input.entity_id
    });
}
function getProposalById(db, proposalId) {
    const r = db.prepare('SELECT * FROM m1_proposals WHERE id = ?').get(proposalId);
    if (!r) return null;
    return {
        id: r.id,
        document_id: r.document_id,
        entity_id: r.entity_id,
        account_id: r.account_id,
        event_date: r.event_date,
        document_period: r.document_period,
        original_currency: r.original_currency,
        amount_cents: r.amount_cents,
        counterparty: r.counterparty,
        description: r.description,
        event_type: r.event_type,
        suggested_category: r.suggested_category,
        evidence: JSON.parse(r.evidence_json),
        extraction_version: r.extraction_version,
        validation_findings: r.validation_findings ? JSON.parse(r.validation_findings) : [],
        review_status: r.review_status,
        related_proposal_ids: r.related_proposal_ids ? JSON.parse(r.related_proposal_ids) : [],
        linked_transaction_id: r.linked_transaction_id || null,
        created_at: r.created_at,
        updated_at: r.updated_at
    };
}
function updateProposalReview(db, input) {
    const existing = db.prepare('SELECT * FROM m1_proposals WHERE id = ?').get(input.proposal_id);
    if (!existing) {
        throw new Error(`Proposal not found: ${input.proposal_id}`);
    }
    if (existing.review_status === 'approved') {
        throw new Error(`Cannot modify proposal "${input.proposal_id}" because it has already been approved into the ledger.`);
    }
    if (existing.review_status === 'linked') {
        throw new Error(`Cannot modify proposal "${input.proposal_id}" because it is already linked to an existing ledger transaction.`);
    }
    // Prevent review/PATCH from setting approved or linked status directly
    if (input.review_status === 'approved') {
        throw new Error("Proposals cannot be marked approved via review updates. Only successful ledger posting may set approved status.");
    }
    if (input.review_status === 'linked') {
        throw new Error("Proposals cannot be marked linked via review updates. Only linking against an existing transaction may set linked status.");
    }
    // Fix 2: Validate corrections
    // 1. Date validation
    if (input.event_date !== undefined) {
        if (!/^\d{4}-\d{2}-\d{2}$/.test(input.event_date)) {
            throw new Error(`Invalid event_date format: "${input.event_date}". Expected YYYY-MM-DD.`);
        }
        const parsedDate = new Date(input.event_date);
        if (isNaN(parsedDate.getTime()) || parsedDate.toISOString().substring(0, 10) !== input.event_date) {
            throw new Error(`Invalid calendar date: "${input.event_date}".`);
        }
    }
    // 2. Amount validation
    if (input.amount_cents !== undefined) {
        if (!Number.isInteger(input.amount_cents)) {
            throw new Error(`Invalid amount_cents: "${input.amount_cents}". Amount must be a safe integer.`);
        }
    }
    // 3. Currency validation
    if (input.original_currency !== undefined) {
        const currCode = input.original_currency.toUpperCase();
        if (__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$domain$2f$accounting$2f$types$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["CURRENCY_DECIMALS"][currCode] === undefined) {
            throw new Error(`Unsupported or invalid currency code: "${input.original_currency}".`);
        }
    }
    // 4. Payment account validation
    if (input.account_id !== undefined && input.account_id !== null && input.account_id !== '') {
        const acc = db.prepare('SELECT * FROM m1_accounts WHERE id = ?').get(input.account_id);
        if (!acc) {
            throw new Error(`Target account not found: "${input.account_id}".`);
        }
        const effectiveCurrency = (input.original_currency || existing.original_currency || '').toUpperCase();
        if (effectiveCurrency && acc.currency.toUpperCase() !== effectiveCurrency) {
            throw new Error(`Account currency "${acc.currency}" does not match proposal currency "${effectiveCurrency}".`);
        }
    }
    // 5. Category validation
    if (input.suggested_category !== undefined && input.suggested_category.trim() === '') {
        throw new Error('Suggested category cannot be empty.');
    }
    const now = new Date().toISOString();
    const eventDate = input.event_date !== undefined ? input.event_date : existing.event_date;
    const counterparty = input.counterparty !== undefined ? input.counterparty.trim() : existing.counterparty;
    const description = input.description !== undefined ? input.description.trim() : existing.description;
    const amountCents = input.amount_cents !== undefined ? input.amount_cents : existing.amount_cents;
    const finalCurrency = input.original_currency !== undefined ? input.original_currency.toUpperCase() : existing.original_currency;
    const finalAccountId = input.account_id !== undefined ? input.account_id : existing.account_id;
    // Fix A: Derive authoritative entity_id from final account
    let finalEntityId = existing.entity_id;
    if (finalAccountId) {
        const acc = db.prepare('SELECT entity_id FROM m1_accounts WHERE id = ?').get(finalAccountId);
        if (acc) {
            finalEntityId = acc.entity_id;
        }
    }
    const category = input.suggested_category !== undefined ? input.suggested_category.trim() : existing.suggested_category;
    const status = input.review_status !== undefined ? input.review_status : 'modified';
    // Update validation findings: if user provided a valid currency, clear MISSING_CURRENCY
    let findings = existing.validation_findings ? JSON.parse(existing.validation_findings) : [];
    if (finalCurrency && __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$domain$2f$accounting$2f$types$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["CURRENCY_DECIMALS"][finalCurrency] !== undefined) {
        findings = findings.filter((f)=>f.code !== 'MISSING_CURRENCY');
    }
    // Also clear CURRENCY_MISMATCH if account and currency now match
    if (finalAccountId && finalCurrency) {
        const acc = db.prepare('SELECT currency FROM m1_accounts WHERE id = ?').get(finalAccountId);
        if (acc && acc.currency.toUpperCase() === finalCurrency.toUpperCase()) {
            findings = findings.filter((f)=>f.code !== 'CURRENCY_MISMATCH');
        }
    }
    // Fix C: Clear date and amount errors when valid replacements are provided
    if (input.event_date !== undefined && input.event_date !== '1970-01-01') {
        findings = findings.filter((f)=>f.code !== 'MISSING_DATE' && f.code !== 'INVALID_DATE');
    }
    if (input.amount_cents !== undefined) {
        findings = findings.filter((f)=>f.code !== 'MISSING_AMOUNT' && f.code !== 'INVALID_AMOUNT');
    }
    db.prepare(`
        UPDATE m1_proposals
        SET event_date = ?,
            counterparty = ?,
            description = ?,
            amount_cents = ?,
            original_currency = ?,
            account_id = ?,
            entity_id = ?,
            suggested_category = ?,
            review_status = ?,
            validation_findings = ?,
            updated_at = ?
        WHERE id = ?
    `).run(eventDate, counterparty, description, amountCents, finalCurrency, finalAccountId, finalEntityId, category, status, JSON.stringify(findings), now, input.proposal_id);
    return getProposalById(db, input.proposal_id);
}
async function ingestPdfDocument(db, input) {
    // 1. Resolve buffer and content hash
    let buffer;
    if (input.file_buffer) {
        buffer = input.file_buffer;
    } else if (input.file_base64) {
        buffer = Buffer.from(input.file_base64, 'base64');
    } else {
        throw new Error('Either file_buffer or file_base64 must be provided for PDF ingestion.');
    }
    const contentHash = computeContentHash(buffer);
    const now = new Date().toISOString();
    // Check if document already exists
    const existingDoc = db.prepare('SELECT * FROM m1_documents WHERE content_hash = ?').get(contentHash);
    if (existingDoc) {
        const existingProposals = getDocumentProposals(db, existingDoc.id);
        const hasApprovedOrLinked = existingProposals.some((p)=>p.review_status === 'approved' || p.review_status === 'linked' || Boolean(p.linked_transaction_id));
        if (hasApprovedOrLinked) {
            return {
                document: {
                    id: existingDoc.id,
                    filename: existingDoc.filename,
                    content_hash: existingDoc.content_hash,
                    mime_type: existingDoc.mime_type,
                    byte_size: existingDoc.byte_size,
                    created_at: existingDoc.created_at,
                    storage_path: existingDoc.storage_path
                },
                proposals: existingProposals,
                already_approved: true,
                supported: true
            };
        }
    }
    // Persist document record
    const docId = existingDoc ? existingDoc.id : `doc-${__TURBOPACK__imported__module__$5b$externals$5d2f$crypto__$5b$external$5d$__$28$crypto$2c$__cjs$29$__["default"].randomUUID()}`;
    if (!existingDoc) {
        db.prepare(`
            INSERT INTO m1_documents (
                id, filename, content_hash, mime_type, byte_size, storage_path, raw_content, created_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `).run(docId, input.filename, contentHash, 'application/pdf', buffer.length, null, buffer.toString('base64'), now);
    }
    // 2. Extract using OpenTax-AU adapter
    const extractionResult = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$domain$2f$document$2f$openTaxAdapter$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["extractInvoiceFromPdf"])(buffer);
    // 3. Resolve target account & currency (Slice 1F Fix 1)
    let targetAccount = null;
    if (input.target_account_id) {
        targetAccount = db.prepare('SELECT * FROM m1_accounts WHERE id = ?').get(input.target_account_id);
    }
    // Fix 1: Preserve extracted currency from PDF directly, never overwrite with target account's currency
    const originalCurrency = extractionResult.currency ? extractionResult.currency.toUpperCase() : '';
    const entityId = input.entity_id || (targetAccount ? targetAccount.entity_id : null);
    // Remove any previously generated unapproved proposals for this document (Slice 1G: also preserve linked proposals!)
    db.prepare(`DELETE FROM m1_proposals WHERE document_id = ? AND review_status != 'approved' AND review_status != 'linked' AND linked_transaction_id IS NULL`).run(docId);
    const proposals = [];
    const propId = `prop-${__TURBOPACK__imported__module__$5b$externals$5d2f$crypto__$5b$external$5d$__$28$crypto$2c$__cjs$29$__["default"].randomUUID()}`;
    if (extractionResult.supported) {
        // Negative amount for expense
        const amountCents = -Math.abs(extractionResult.total_cents);
        const description = extractionResult.line_items[0]?.description ? `${extractionResult.supplier_name} - ${extractionResult.line_items[0].description}` : `${extractionResult.supplier_name || 'Invoice'} purchase`;
        const evidence = {
            document_id: docId,
            content_hash: contentHash,
            page_number: 1,
            extraction_version: 'opentax_invoice_v1',
            source_snippet: extractionResult.source_snippet
        };
        const findings = [
            ...extractionResult.validation_findings
        ];
        // Missing currency must remain unresolved with a blocking error until reviewed (Fix 1)
        if (!originalCurrency && !findings.some((f)=>f.code === 'MISSING_CURRENCY')) {
            findings.push({
                severity: 'error',
                code: 'MISSING_CURRENCY',
                message: 'Document currency could not be identified with confidence. Retained as unresolved until reviewed.'
            });
        }
        // If target account is specified and its currency differs from the extracted document currency, add warning
        if (targetAccount && originalCurrency && targetAccount.currency.toUpperCase() !== originalCurrency.toUpperCase()) {
            findings.push({
                severity: 'warning',
                code: 'CURRENCY_MISMATCH',
                message: `Document currency (${originalCurrency}) does not match payment account currency (${targetAccount.currency}). Approval will be blocked until payment account matches.`
            });
        }
        // Check external duplicate in ledger
        if (input.target_account_id && extractionResult.date) {
            const externalDuplicate = db.prepare(`
                SELECT t.id, t.date, t.description
                FROM m1_transactions t
                JOIN m1_journal_entries j ON j.transaction_id = t.id
                WHERE j.account_id = ?
                  AND t.date = ?
                  AND ABS(j.amount_cents) = ?
                LIMIT 1
            `).get(input.target_account_id, extractionResult.date, Math.abs(amountCents));
            if (externalDuplicate) {
                findings.push({
                    severity: 'warning',
                    code: 'POSSIBLE_DUPLICATE_EXISTING',
                    message: `Possible duplicate: a ledger transaction already exists on ${extractionResult.date} for this account with matching amount.`
                });
            }
        }
        if (!extractionResult.date && !findings.some((f)=>f.code === 'MISSING_DATE')) {
            findings.push({
                severity: 'error',
                code: 'MISSING_DATE',
                message: 'Date could not be extracted.'
            });
        }
        db.prepare(`
            INSERT INTO m1_proposals (
                id, document_id, entity_id, account_id, event_date, document_period,
                original_currency, amount_cents, counterparty, description, event_type,
                suggested_category, evidence_json, extraction_version, validation_findings,
                review_status, created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).run(propId, docId, entityId, input.target_account_id || null, extractionResult.date || '1970-01-01', null, originalCurrency, amountCents, extractionResult.supplier_name || null, description, 'expense', input.default_category || 'office_supplies', JSON.stringify(evidence), 'opentax_invoice_v1', JSON.stringify(findings), 'unreviewed', now, now);
        proposals.push({
            id: propId,
            document_id: docId,
            entity_id: entityId,
            account_id: input.target_account_id || null,
            event_date: extractionResult.date || '1970-01-01',
            original_currency: originalCurrency,
            amount_cents: amountCents,
            counterparty: extractionResult.supplier_name || null,
            description,
            event_type: 'expense',
            suggested_category: input.default_category || 'office_supplies',
            evidence,
            extraction_version: 'opentax_invoice_v1',
            validation_findings: findings,
            review_status: 'unreviewed',
            linked_transaction_id: null,
            created_at: now,
            updated_at: now
        });
    } else {
        // Unsupported layout: Retain as unresolved, do not guess amounts!
        const evidence = {
            document_id: docId,
            content_hash: contentHash,
            page_number: 1,
            extraction_version: 'opentax_invoice_v1',
            source_snippet: extractionResult.source_snippet
        };
        const findings = [
            {
                severity: 'error',
                code: 'UNSUPPORTED_LAYOUT',
                message: 'This document does not match the supported text-based supplies invoice layout and has been retained as unresolved.'
            },
            ...extractionResult.validation_findings || []
        ];
        if (!originalCurrency && !findings.some((f)=>f.code === 'MISSING_CURRENCY')) {
            findings.push({
                severity: 'error',
                code: 'MISSING_CURRENCY',
                message: 'Document currency could not be identified with confidence. Retained as unresolved until reviewed.'
            });
        }
        findings.push({
            severity: 'error',
            code: 'MISSING_DATE',
            message: 'Date could not be extracted.'
        });
        findings.push({
            severity: 'error',
            code: 'MISSING_AMOUNT',
            message: 'Amount could not be extracted.'
        });
        db.prepare(`
            INSERT INTO m1_proposals (
                id, document_id, entity_id, account_id, event_date, document_period,
                original_currency, amount_cents, counterparty, description, event_type,
                suggested_category, evidence_json, extraction_version, validation_findings,
                review_status, created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).run(propId, docId, entityId, input.target_account_id || null, '1970-01-01', null, originalCurrency, 0, null, `${input.filename} (unresolved layout)`, 'expense', null, JSON.stringify(evidence), 'opentax_invoice_v1', JSON.stringify(findings), 'unreviewed', now, now);
        proposals.push({
            id: propId,
            document_id: docId,
            entity_id: entityId,
            account_id: input.target_account_id || null,
            event_date: '1970-01-01',
            original_currency: originalCurrency,
            amount_cents: 0,
            counterparty: null,
            description: `${input.filename} (unresolved layout)`,
            event_type: 'expense',
            suggested_category: null,
            evidence,
            extraction_version: 'opentax_invoice_v1',
            validation_findings: findings,
            review_status: 'unreviewed',
            linked_transaction_id: null,
            created_at: now,
            updated_at: now
        });
    }
    const document = {
        id: docId,
        filename: input.filename,
        content_hash: contentHash,
        mime_type: 'application/pdf',
        byte_size: buffer.length,
        created_at: existingDoc ? existingDoc.created_at : now,
        storage_path: null
    };
    return {
        document,
        proposals,
        supported: extractionResult.supported
    };
}
function getCandidateTransactionsForProposal(db, proposalId, options) {
    const proposal = getProposalById(db, proposalId);
    if (!proposal) {
        throw new Error(`Proposal not found: ${proposalId}`);
    }
    if (!proposal.original_currency) {
        return [];
    }
    const absAmount = Math.abs(proposal.amount_cents);
    if (absAmount === 0) {
        return [];
    }
    // Direction matching (Slice 1G remediation):
    // For an expense receipt, money flowed out of the liquid/liability account (posting amount_cents < 0).
    // For an income proposal, money flowed into the liquid account (posting amount_cents > 0).
    const targetSignedAmount = proposal.event_type === 'expense' ? -absAmount : absAmount;
    const maxDays = options?.maxDateDiffDays ?? 30;
    // Fetch transactions with postings matching the amount, currency, and direction on an asset (checking/savings) or liability (credit card) account
    let sql = `
        SELECT 
            t.id as tx_id,
            t.date as tx_date,
            t.description as tx_description,
            t.payee_or_payer as tx_payee,
            t.evidence_refs as tx_evidence_refs,
            j.account_id as account_id,
            j.amount_cents as posting_amount_cents,
            j.currency as posting_currency,
            a.name as account_name
        FROM m1_transactions t
        JOIN m1_journal_entries j ON j.transaction_id = t.id
        JOIN m1_accounts a ON a.id = j.account_id
        WHERE t.status = 'posted'
          AND j.currency = ?
          AND j.amount_cents = ?
          AND a.type IN ('asset', 'liability')
    `;
    const params = [
        proposal.original_currency.toUpperCase(),
        targetSignedAmount
    ];
    if (proposal.account_id) {
        sql += ` AND j.account_id = ?`;
        params.push(proposal.account_id);
    }
    sql += ` ORDER BY t.date DESC`;
    const rows = db.prepare(sql).all(...params);
    const propDateMs = new Date(proposal.event_date).getTime();
    const candidates = [];
    const seenTxIds = new Set();
    for (const r of rows){
        if (seenTxIds.has(r.tx_id)) continue;
        seenTxIds.add(r.tx_id);
        const txDateMs = new Date(r.tx_date).getTime();
        const diffDays = isNaN(txDateMs) || isNaN(propDateMs) ? 999 : Math.round(Math.abs(propDateMs - txDateMs) / (1000 * 60 * 60 * 24));
        if (diffDays > maxDays) {
            continue;
        }
        let score = 20;
        if (diffDays === 0) score = 100;
        else if (diffDays <= 3) score = 80;
        else if (diffDays <= 7) score = 60;
        else if (diffDays <= 14) score = 40;
        // Bonus if description or payee matches
        const descMatch = proposal.description && r.tx_description && (r.tx_description.toLowerCase().includes(proposal.description.toLowerCase()) || proposal.description.toLowerCase().includes(r.tx_description.toLowerCase()));
        const payeeMatch = proposal.counterparty && r.tx_payee && (r.tx_payee.toLowerCase().includes(proposal.counterparty.toLowerCase()) || proposal.counterparty.toLowerCase().includes(r.tx_payee.toLowerCase()));
        if (descMatch || payeeMatch) {
            score += 10;
        }
        let hasEvidence = false;
        if (r.tx_evidence_refs) {
            try {
                const parsed = JSON.parse(r.tx_evidence_refs);
                hasEvidence = Array.isArray(parsed) && parsed.length > 0;
            } catch  {
                hasEvidence = false;
            }
        }
        candidates.push({
            id: r.tx_id,
            date: r.tx_date,
            description: r.tx_description,
            payee_or_payer: r.tx_payee || null,
            amount_cents: r.posting_amount_cents,
            currency: r.posting_currency,
            account_id: r.account_id,
            account_name: r.account_name,
            date_difference_days: diffDays,
            match_score: score,
            has_existing_evidence: hasEvidence
        });
    }
    // Sort by match_score descending, then by date difference ascending
    candidates.sort((a, b)=>b.match_score - a.match_score || a.date_difference_days - b.date_difference_days);
    return candidates;
}
function linkProposalToTransaction(db, input) {
    const proposal = getProposalById(db, input.proposal_id);
    if (!proposal) {
        throw new Error(`Proposal not found: "${input.proposal_id}"`);
    }
    if (proposal.review_status === 'approved') {
        throw new Error(`Cannot link proposal "${input.proposal_id}" because it has already been approved as a standalone transaction.`);
    }
    // Requirement 2 (Slice 1G): Enforce linked-proposal transitions:
    // - Link again to the same transaction: harmless idempotent retry
    if (proposal.linked_transaction_id === input.transaction_id) {
        const currentTx = db.prepare('SELECT * FROM m1_transactions WHERE id = ?').get(input.transaction_id);
        return {
            proposal,
            transaction: {
                ...currentTx,
                evidence_refs: currentTx?.evidence_refs ? JSON.parse(currentTx.evidence_refs) : []
            }
        };
    }
    // - Link to a different transaction: reject; preserve original link
    if (proposal.linked_transaction_id && proposal.linked_transaction_id !== input.transaction_id) {
        throw new Error(`Cannot link proposal "${input.proposal_id}" to transaction "${input.transaction_id}" because it is already linked to transaction "${proposal.linked_transaction_id}".`);
    }
    const hasError = proposal.validation_findings.some((f)=>f.severity === 'error');
    if (hasError) {
        throw new Error(`Cannot link proposal "${input.proposal_id}" because it has unresolved validation errors.`);
    }
    const tx = db.prepare('SELECT * FROM m1_transactions WHERE id = ?').get(input.transaction_id);
    if (!tx) {
        throw new Error(`Target transaction not found: "${input.transaction_id}"`);
    }
    // Direction matching (Slice 1G remediation):
    // For an expense receipt, money flowed out of the liquid/liability account (posting amount_cents < 0).
    // For an income proposal, money flowed into the liquid account (posting amount_cents > 0).
    const absAmount = Math.abs(proposal.amount_cents);
    const expectedSignedAmount = proposal.event_type === 'expense' ? -absAmount : absAmount;
    // Verify transaction postings match proposal amount, currency, and direction on an asset/liability payment account
    const postings = db.prepare(`
        SELECT j.*, a.type as account_type
        FROM m1_journal_entries j
        JOIN m1_accounts a ON a.id = j.account_id
        WHERE j.transaction_id = ?
    `).all(tx.id);
    const matchingPosting = postings.find((p)=>p.currency.toUpperCase() === proposal.original_currency.toUpperCase() && p.amount_cents === expectedSignedAmount && (p.account_type === 'asset' || p.account_type === 'liability'));
    if (!matchingPosting) {
        throw new Error(`Transaction "${input.transaction_id}" does not have a payment account posting matching proposal amount (${proposal.amount_cents} cents), currency (${proposal.original_currency}), and direction (${proposal.event_type}).`);
    }
    // Check account match if proposal already had a designated account
    if (proposal.account_id && proposal.account_id !== matchingPosting.account_id) {
        throw new Error(`Proposal account "${proposal.account_id}" does not match target transaction account "${matchingPosting.account_id}".`);
    }
    const linkTx = db.transaction(()=>{
        // 1. Prepare evidence references for the transaction
        let existingEvidence = [];
        if (tx.evidence_refs) {
            try {
                existingEvidence = JSON.parse(tx.evidence_refs);
                if (!Array.isArray(existingEvidence)) existingEvidence = [];
            } catch  {
                existingEvidence = [];
            }
        }
        // Add proposal's evidence
        const newEvidenceRef = {
            document_id: proposal.document_id,
            content_hash: proposal.evidence.content_hash,
            page: proposal.evidence.page_number || 1,
            label: proposal.description || 'Receipt',
            source_snippet: proposal.evidence.source_snippet || null
        };
        const updatedEvidenceJson = (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$domain$2f$accounting$2f$transactionService$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["normalizeEvidenceRefs"])([
            ...existingEvidence,
            newEvidenceRef
        ]);
        const now = new Date().toISOString();
        // 2. Update transaction evidence_refs
        db.prepare(`
            UPDATE m1_transactions
            SET evidence_refs = ?, updated_at = ?
            WHERE id = ?
        `).run(updatedEvidenceJson, now, tx.id);
        // 3. Update proposal status to 'linked' and record linked_transaction_id
        db.prepare(`
            UPDATE m1_proposals
            SET review_status = 'linked',
                linked_transaction_id = ?,
                account_id = ?,
                updated_at = ?
            WHERE id = ?
        `).run(tx.id, matchingPosting.account_id, now, proposal.id);
    });
    linkTx();
    const updatedProposal = getProposalById(db, proposal.id);
    const updatedTx = db.prepare('SELECT * FROM m1_transactions WHERE id = ?').get(tx.id);
    return {
        proposal: updatedProposal,
        transaction: {
            ...updatedTx,
            evidence_refs: updatedTx.evidence_refs ? JSON.parse(updatedTx.evidence_refs) : []
        }
    };
}
}),
"[project]/src/app/api/documents/route.ts [app-route] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "GET",
    ()=>GET,
    "POST",
    ()=>POST
]);
/**
 * Milestone 1 Document Inbox API Route (Slice 1E)
 * 
 * Why this file exists:
 * Exposes local REST API endpoints for listing ingested financial documents and uploading/parsing
 * untrusted bank CSV files into reviewable proposals.
 * Conforms to ADR 001: Untrusted inputs produce proposals in SQLite, not ledger mutations.
 * 
 * Tricky logic:
 * - Content hash deduplication: Ingesting an identical CSV returns the existing document record
 *   and retains existing proposal approval states without creating duplicate proposals.
 * - Always runs `initAccountingSchema(db)` to ensure document and accounting tables exist.
 * 
 * TODO: Add support for multipart/form-data file uploads alongside raw JSON strings.
 */ var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/server.js [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$infrastructure$2f$sqlite$2f$db$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/infrastructure/sqlite/db.ts [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$domain$2f$accounting$2f$schema$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/lib/domain/accounting/schema.ts [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$domain$2f$document$2f$documentInboxService$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/lib/domain/document/documentInboxService.ts [app-route] (ecmascript)");
;
;
;
;
async function GET() {
    try {
        const db = (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$infrastructure$2f$sqlite$2f$db$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["getDb"])();
        (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$domain$2f$accounting$2f$schema$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["initAccountingSchema"])(db);
        const documents = (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$domain$2f$document$2f$documentInboxService$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["listDocuments"])(db);
        return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json({
            success: true,
            documents
        });
    } catch (err) {
        console.error('Failed to list documents:', err);
        return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json({
            error: err.message || 'Failed to list documents.'
        }, {
            status: 500
        });
    }
}
async function POST(request) {
    try {
        const db = (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$infrastructure$2f$sqlite$2f$db$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["getDb"])();
        (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$domain$2f$accounting$2f$schema$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["initAccountingSchema"])(db);
        const body = await request.json();
        const { filename, raw_content, mapping, target_account_id, default_category, entity_id } = body;
        if (!filename || typeof filename !== 'string') {
            return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json({
                error: 'Missing required field: filename.'
            }, {
                status: 400
            });
        }
        if (!raw_content || typeof raw_content !== 'string') {
            return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json({
                error: 'Missing required field: raw_content.'
            }, {
                status: 400
            });
        }
        if (!mapping || !mapping.date_column || !mapping.description_column) {
            return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json({
                error: 'Invalid or missing mapping configuration.'
            }, {
                status: 400
            });
        }
        if (!target_account_id || typeof target_account_id !== 'string') {
            return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json({
                error: 'Missing required field: target_account_id.'
            }, {
                status: 400
            });
        }
        const input = {
            filename,
            raw_content,
            mapping,
            target_account_id,
            default_category,
            entity_id
        };
        const result = (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$domain$2f$document$2f$documentInboxService$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["ingestCsvDocument"])(db, input);
        return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json({
            success: true,
            ...result
        });
    } catch (err) {
        console.error('Failed to ingest document:', err);
        return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json({
            error: err.message || 'Failed to ingest document.'
        }, {
            status: 500
        });
    }
}
}),
];

//# sourceMappingURL=%5Broot-of-the-server%5D__830a391e._.js.map