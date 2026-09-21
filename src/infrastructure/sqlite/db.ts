/**
 * OpenNetWorth Embedded SQLite Database Engine
 * 
 * Why this exists:
 * Replaces SaaS cloud databases (Supabase) with a 100% free, private, offline-first
 * embedded SQLite database. All financial data is persisted locally in `data/opennetworth.sqlite`.
 */

import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

// Path to SQLite database file
const DATA_DIR = path.resolve(process.cwd(), 'data');
const DEFAULT_DB_PATH = path.join(DATA_DIR, 'opennetworth.sqlite');

/**
 * Returns the effective SQLite database path.
 * 
 * Why this exists:
 * Allows browser-based end-to-end tests or dev test runs to point to an isolated
 * fixture database (e.g. data/test_browser_vault.sqlite) via OPENNETWORTH_DB_PATH,
 * guaranteeing the live user vault is never opened.
 */
export function getEffectiveDbPath(): string {
    if (process.env.OPENNETWORTH_DB_PATH) {
        return path.resolve(process.cwd(), process.env.OPENNETWORTH_DB_PATH);
    }
    return DEFAULT_DB_PATH;
}

let dbInstance: Database.Database | null = null;
let testDbInstance: Database.Database | null = null;

/**
 * Detects if the current process is executing within an automated test runner (Vitest or Jest).
 * 
 * Why this exists:
 * Critical test isolation: Tests must NEVER touch the application database (opennetworth.sqlite).
 * By detecting test execution, we prevent destructive test suites from wiping or modifying live user vaults.
 * 
 * Tricky logic:
 * Checks both NODE_ENV and runner-specific flags (process.env.VITEST and process.env.JEST_WORKER_ID)
 * to prevent false negatives when test environments run with non-standard NODE_ENV variables.
 * 
 * TODO: Add support for custom CI runner environment variables if required.
 */
export function isTestEnvironment(): boolean {
    return (
        process.env.NODE_ENV === 'test' ||
        Boolean(process.env.VITEST) ||
        Boolean(process.env.JEST_WORKER_ID)
    );
}

/**
 * Injects an explicit test database instance (e.g. an in-memory SQLite instance).
 * 
 * Why this exists:
 * Allows integration and unit tests to supply their own pristine, isolated SQLite database
 * without any risk of side effects across tests or to the user's live database.
 * 
 * Tricky logic:
 * Pass `null` to reset/tear down the test instance between tests.
 * 
 * TODO: Add connection pool monitoring if multi-threaded test runners are introduced.
 */
export function setTestDb(db: Database.Database | null): void {
    testDbInstance = db;
}

/**
 * Creates a pristine, fully initialized in-memory SQLite database for isolated test execution.
 * 
 * Why this exists:
 * In-memory SQLite (:memory:) provides sub-millisecond execution speeds and guaranteed
 * isolation: when closed or garbage collected, all memory is immediately reclaimed and zero
 * disk files are created or altered.
 * 
 * Tricky logic:
 * Enables foreign key constraints and runs the complete schema migrations so the test database
 * exactly mirrors the production database structure.
 * 
 * TODO: Add seeded test fixture templates for specialized financial scenario tests.
 */
export function createTestDb(): Database.Database {
    const db = new Database(':memory:');
    db.pragma('foreign_keys = ON');
    initSchema(db);
    return db;
}

/**
 * Safely closes active database instances.
 * 
 * Why this exists:
 * Ensures clean teardown in test lifecycle hooks (afterEach / afterAll) and during application shutdown,
 * preventing file lock contention on Windows and SQLite BUSY errors.
 * 
 * Tricky logic:
 * Closes both testDbInstance and dbInstance if open, suppressing errors if already closed.
 * 
 * TODO: Add graceful drain for in-flight transactions before closing.
 */
export function closeDb(): void {
    if (testDbInstance) {
        try {
            testDbInstance.close();
        } catch {
            // Already closed or detached
        }
        testDbInstance = null;
    }
    if (dbInstance) {
        try {
            dbInstance.close();
        } catch {
            // Already closed or detached
        }
        dbInstance = null;
    }
}

/**
 * Returns the SQLite database instance.
 * 
 * Why this exists:
 * Provides access to the local SQLite database for the application and API routes.
 * 
 * Tricky logic:
 * In test environments (Vitest/Jest), we strictly forbid connecting to the live application
 * database file (`data/opennetworth.sqlite`). If a test has injected `setTestDb(testDb)`,
 * we return that instance. If no test DB was explicitly set, we automatically instantiate
 * an in-memory test database (`createTestDb()`) to prevent accidental leaks.
 * If any test attempt bypasses this or tries to open the live vault file, we throw a
 * hard security guard exception.
 * 
 * TODO: Support SQLCipher encrypted SQLite connections in Milestone 2.
 */
export function getDb(): Database.Database {
    // If running under a test runner, strictly enforce test isolation
    if (isTestEnvironment()) {
        if (!testDbInstance) {
            testDbInstance = createTestDb();
        }
        return testDbInstance;
    }

    const targetPath = getEffectiveDbPath();
    const isLiveVault = path.resolve(targetPath) === path.resolve(DEFAULT_DB_PATH);

    // Guard: Under no circumstances should test code ever reach the live application vault
    if ((process.env.NODE_ENV === 'test' || process.env.VITEST) && isLiveVault) {
        throw new Error(
            'CRITICAL SECURITY GUARD: Attempted to open application vault (opennetworth.sqlite) during test execution! Tests must use an isolated in-memory database.'
        );
    }

    if (dbInstance) {
        return dbInstance;
    }

    // Ensure parent directory exists
    const targetDir = path.dirname(targetPath);
    if (!fs.existsSync(targetDir)) {
        fs.mkdirSync(targetDir, { recursive: true });
    }

    // Initialize better-sqlite3 with target database file
    dbInstance = new Database(targetPath);

    // Enable WAL mode for high performance concurrent reads and atomic writes
    dbInstance.pragma('journal_mode = WAL');
    dbInstance.pragma('synchronous = NORMAL');
    dbInstance.pragma('foreign_keys = ON');

    // Run initial schema creation
    initSchema(dbInstance);

    return dbInstance;
}

/**
 * Creates core tables if they do not already exist.
 * 
 * Why this exists:
 * Exports the initial schema DDL so both the production vault and in-memory test databases
 * can initialize their table structure idempotently.
 * 
 * Tricky logic:
 * Always inserts a default 'local_user' profile if one does not exist so initial foreign key
 * checks and single-user local queries immediately succeed without manual seeding.
 * 
 * TODO: Add automated migration runner for schema versioning in Milestone 1.
 */
export function initSchema(db: Database.Database) {
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

    db.exec(schema);

    // Why this exists:
    // Resolves Finding 2 & Clarification 4: Net worth history snapshots must durably retain currency
    // so historical snapshots recorded in USD/EUR are never masqueraded as AUD.
    // Tricky logic:
    // Existing SQLite databases already have net_worth_history created without currency.
    // We safely query PRAGMA table_info and execute ALTER TABLE ADD COLUMN if missing.
    // TODO: In Milestone 2, support retroactive batch currency attribution for legacy snapshots.
    try {
        const tableInfo = db.prepare("PRAGMA table_info(net_worth_history)").all() as { name: string }[];
        if (tableInfo.length > 0 && !tableInfo.some(c => c.name === 'currency')) {
            db.prepare("ALTER TABLE net_worth_history ADD COLUMN currency TEXT").run();
        }
    } catch {
        // Ignored if table doesn't exist yet or already altered
    }
}

export default getDb;
