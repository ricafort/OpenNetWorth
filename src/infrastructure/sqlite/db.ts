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
import { runMigrations } from './migrations';

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
    runMigrations(db);
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
    // Read-only demo vault connections (Phase 2.7) — Windows file locks make
    // closing these on teardown mandatory.
    for (const [, demoDb] of demoDbCache) {
        try {
            demoDb.close();
        } catch {
            // Already closed or detached
        }
    }
    demoDbCache.clear();
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

    // Apply the ordered migration list exactly once per database file
    runMigrations(dbInstance);

    return dbInstance;
}

/* ------------------------------------------------------------------ */
/* Demo vaults (Phase 2.7 — read-only sample personas)                 */
/* ------------------------------------------------------------------ */

/**
 * Allowlist of demo persona keys. Doubles as the path-traversal guard:
 * only these keys may ever be interpolated into a file path.
 * Keys match `ProfileConfig.id` in `src/features/demo/demoConfigs.ts`.
 */
export const DEMO_PERSONAS = ['start', 'stab', 'build', 'fam', 'grow'] as const;
export type DemoPersona = (typeof DEMO_PERSONAS)[number];

export function isDemoPersona(value: string): value is DemoPersona {
    return (DEMO_PERSONAS as readonly string[]).includes(value);
}

/** Directory holding the per-persona demo vault files (gitignored under data/). */
export function demoVaultDir(): string {
    return path.resolve(process.cwd(), process.env.OPENNETWORTH_DEMO_DIR || path.join('data', 'demo_vaults'));
}

/**
 * Raised when a request carries a `demo_persona` cookie that cannot be served:
 * either the key is not on the allowlist, or the vault file has not been seeded.
 * Routes translate it via `demoErrorResponse` (400 / 503).
 */
export class DemoVaultUnavailableError extends Error {
    constructor(public persona: string, public reason: 'unknown_persona' | 'not_seeded') {
        super(reason === 'unknown_persona'
            ? `Unknown demo persona "${persona}".`
            : `Demo vault for persona "${persona}" is not seeded. Run: npm run seed:demo`);
        this.name = 'DemoVaultUnavailableError';
    }
}

const demoDbCache = new Map<string, Database.Database>();

/**
 * Opens (and caches) a persona's demo vault READ-ONLY.
 *
 * Tricky logic:
 * - `readonly: true` + `fileMustExist: true` guarantee demo traffic can never
 *   create, migrate, or mutate any database file.
 * - The seed script closes files with `journal_mode = DELETE`, so read-only
 *   connections never need WAL sidecar files.
 */
export function getDemoDb(persona: string): Database.Database | null {
    if (!isDemoPersona(persona)) return null;
    const cached = demoDbCache.get(persona);
    if (cached) return cached;
    const dbPath = path.join(demoVaultDir(), `${persona}.sqlite`);
    if (!fs.existsSync(dbPath)) return null;
    const db = new Database(dbPath, { readonly: true, fileMustExist: true });
    db.pragma('foreign_keys = ON');
    demoDbCache.set(persona, db);
    return db;
}

/** Reads the `demo_persona` cookie from a request (null when absent). */
export function readDemoPersona(request: Request): string | null {
    const cookie = request.headers.get('cookie');
    if (!cookie) return null;
    const match = cookie.match(/(?:^|;\s*)demo_persona=([A-Za-z0-9_-]+)/);
    return match ? match[1] : null;
}

/**
 * Request-aware DB resolution: demo cookie present → read-only persona vault;
 * absent → the live vault via getDb().
 *
 * Why this exists:
 * Demo mode must serve the SAME API surface as the real vault without ever
 * touching `opennetworth.sqlite`. Routes call this instead of getDb(); the
 * client sets the cookie from `?simulatedProfileId=` in ProfileContext.
 */
export function getDbForRequest(request: Request): Database.Database {
    const persona = readDemoPersona(request);
    if (persona === null) return getDb();
    if (!isDemoPersona(persona)) throw new DemoVaultUnavailableError(persona, 'unknown_persona');
    const demo = getDemoDb(persona);
    if (!demo) throw new DemoVaultUnavailableError(persona, 'not_seeded');
    return demo;
}

/** Maps a thrown error to a JSON Response when it is demo-vault related (null otherwise). */
export function demoErrorResponse(err: unknown): Response | null {
    if (err instanceof DemoVaultUnavailableError) {
        const status = err.reason === 'unknown_persona' ? 400 : 503;
        return new Response(JSON.stringify({ success: false, error: err.message, demo_persona: err.persona }), {
            status,
            headers: { 'Content-Type': 'application/json' }
        });
    }
    return null;
}

/** 403 response when a mutating request carries the demo cookie (demo is read-only). */
export function demoReadOnlyResponse(request: Request): Response | null {
    if (readDemoPersona(request) === null) return null;
    return new Response(JSON.stringify({ success: false, error: 'Demo mode is read-only. Exit sample data to make changes.' }), {
        status: 403,
        headers: { 'Content-Type': 'application/json' }
    });
}

export default getDb;
