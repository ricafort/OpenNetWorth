/**
 * Migration 0001 — baseline vault schema.
 *
 * Why this exists:
 * Freezes the schema as it existed before the single-data-layer collapse (Oct 2026):
 * the m0 metadata tables (moved verbatim from `db.ts initSchema()`), the double-entry
 * accounting core, and the mentor chat tables. DDL constants are imported from their
 * domain schema files — never copied — so the canonical definitions stay single-sourced.
 *
 * Ordering note:
 * The document schema DDL is deliberately NOT here; it runs in 0003 after its shape
 * repairs, because its indexes target columns that pre-existing tables may lack.
 */

import Database from 'better-sqlite3';
import { ACCOUNTING_SCHEMA_DDL } from '../../../lib/domain/accounting/schema';
import { MENTOR_CHAT_SCHEMA_DDL } from '../../../lib/domain/mentor/schema';

/**
 * Metadata tables moved verbatim from `db.ts initSchema()` (2026-10).
 * Includes the default 'local_user' profile seed so single-user foreign key
 * checks and vault queries succeed immediately without manual seeding.
 */
const METADATA_SCHEMA_DDL = `
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
        currency TEXT,
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

export function up(db: Database.Database): void {
    db.exec(METADATA_SCHEMA_DDL);
    db.exec(ACCOUNTING_SCHEMA_DDL);
    db.exec(MENTOR_CHAT_SCHEMA_DDL);
}
