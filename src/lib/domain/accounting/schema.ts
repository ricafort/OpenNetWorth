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
 */

import Database from 'better-sqlite3';
import { initDocumentSchema } from '../document/schema';

export const ACCOUNTING_SCHEMA_DDL = `
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

/**
 * Transactionally upgrades an existing SQLite database schema to match the latest
 * accounting schema requirements (Assessor Finding 1).
 * 
 * Why this exists:
 * In SQLite, `CREATE TABLE IF NOT EXISTS` does not modify existing tables if new columns
 * or CHECK constraints are added in later versions.
 * When an application database is opened that was created on an earlier commit:
 * 1. `m1_asset_valuations` may lack the `source TEXT` column.
 * 2. `m1_transaction_corrections` may have an older CHECK constraint lacking `'revaluation_cascade'`.
 * This function inspects the existing table structures and transactionally upgrades them
 * without altering existing rows, balances, revisions, evidence, or audit records.
 * 
 * Tricky logic:
 * - In SQLite, CHECK constraints cannot be updated with `ALTER TABLE`.
 *   We use the standard SQLite table migration pattern:
 *   1. Create `m1_transaction_corrections_new` with the updated CHECK constraint.
 *   2. Copy all existing rows from `m1_transaction_corrections`.
 *   3. Drop `m1_transaction_corrections`.
 *   4. Rename `m1_transaction_corrections_new` to `m1_transaction_corrections`.
 * - All operations execute inside an explicit `db.transaction()` block.
 * - Foreign keys are temporarily set to OFF during table replacement to prevent foreign key errors on drop/rename.
 * 
 * TODO: Support automated forward-migration logging in `schema_migrations` table for multi-version tracking in Milestone 2.
 */
export function migrateAccountingSchema(db: Database.Database): void {
    const runMigration = db.transaction(() => {
        // 1. Check if m1_asset_valuations table exists
        const valTableExists = (db.prepare(
            "SELECT COUNT(*) as cnt FROM sqlite_master WHERE type = 'table' AND name = 'm1_asset_valuations'"
        ).get() as any).cnt > 0;

        if (valTableExists) {
            const columns = db.prepare("PRAGMA table_info(m1_asset_valuations)").all() as Array<{ name: string }>;
            const hasSource = columns.some(c => c.name === 'source');
            if (!hasSource) {
                db.prepare("ALTER TABLE m1_asset_valuations ADD COLUMN source TEXT").run();
            }
        }

        // 2. Check if m1_transaction_corrections table exists and needs CHECK constraint upgrade
        const corrTableExists = (db.prepare(
            "SELECT COUNT(*) as cnt FROM sqlite_master WHERE type = 'table' AND name = 'm1_transaction_corrections'"
        ).get() as any).cnt > 0;

        if (corrTableExists) {
            const tableSql = (db.prepare(
                "SELECT sql FROM sqlite_master WHERE type = 'table' AND name = 'm1_transaction_corrections'"
            ).get() as any)?.sql || '';

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
    const currentFk = db.prepare("PRAGMA foreign_keys").get() as any;
    const wasFkOn = currentFk?.foreign_keys === 1;
    if (wasFkOn) db.pragma("foreign_keys = OFF");
    try {
        runMigration();
    } finally {
        if (wasFkOn) db.pragma("foreign_keys = ON");
    }
}

/**
 * Initializes the Milestone 1 accounting schema on a SQLite database,
 * then applies any pending schema migrations.
 */
export function initAccountingSchema(db: Database.Database): void {
    db.pragma('foreign_keys = ON');
    db.exec(ACCOUNTING_SCHEMA_DDL);
    migrateAccountingSchema(db);
    initDocumentSchema(db);
}
