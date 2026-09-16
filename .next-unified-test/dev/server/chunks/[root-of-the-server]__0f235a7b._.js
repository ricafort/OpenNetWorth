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
"[project]/src/app/api/vault/route.ts [app-route] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "GET",
    ()=>GET,
    "POST",
    ()=>POST
]);
/**
 * Local Vault SQLite API Route
 * 
 * Why this exists:
 * Authoritative, local-first API endpoint for reading and persisting all user
 * financial data directly into the embedded SQLite database (`data/opennetworth.sqlite`).
 * Supports both bulk synchronization/restore and scoped single-record operations (DATA-01, DATA-05).
 * 
 * Tricky logic:
 * - Scoped saves and bulk restores strictly validate monetary values. Non-finite or non-numeric
 *   inputs ("not-money", NaN) are rejected with HTTP 400 rather than fabricating zero balances (TRUST-07).
 * - Bulk restore commits an atomic replacement across all collections. If an array (e.g. history)
 *   is empty, the corresponding table is cleared so no stale rows remain behind (DATA-08, TRUST-11).
 * 
 * TODO: Support encrypted local SQLite exports via SQLCipher in future security hardening milestones.
 */ var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/server.js [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$infrastructure$2f$sqlite$2f$db$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/infrastructure/sqlite/db.ts [app-route] (ecmascript)");
;
;
class ValidationError extends Error {
    statusCode = 400;
}
/**
 * Strict monetary validation helper (TRUST-07, DATA-01).
 * 
 * Why this exists:
 * Prevents non-numeric or non-finite inputs (e.g. "not-money", NaN, undefined)
 * from being silently converted to fabricated zero balances (Number(x) || 0).
 * Rejects invalid inputs with an explicit validation error.
 */ function parseFiniteNumber(val, fieldName, options = {}) {
    const { allowNegative = false, required = true } = options;
    if (val === undefined || val === null || val === '') {
        if (!required) return 0;
        throw new ValidationError(`${fieldName} is required and cannot be empty`);
    }
    const num = Number(val);
    if (typeof num !== 'number' || isNaN(num) || !isFinite(num)) {
        throw new ValidationError(`${fieldName} must be a valid finite number, received: "${val}"`);
    }
    if (!allowNegative && num < 0) {
        throw new ValidationError(`${fieldName} cannot be negative, received: ${num}`);
    }
    return num;
}
/**
 * Validates ISO month format (YYYY-MM).
 */ function validateMonth(month) {
    if (typeof month !== 'string' || !/^\d{4}-(?:0[1-9]|1[0-2])$/.test(month)) {
        throw new ValidationError(`Invalid month format "${month}". Expected YYYY-MM.`);
    }
    return month;
}
async function GET(request) {
    try {
        const { searchParams } = new URL(request.url);
        const entity = searchParams.get('entity');
        const db = (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$infrastructure$2f$sqlite$2f$db$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["getDb"])();
        if (entity) {
            const allowed = [
                'assets',
                'liabilities',
                'goals',
                'recurring_transactions',
                'net_worth_history',
                'cash_flow_history',
                'profiles',
                'settings'
            ];
            const table = entity === 'recurring' ? 'recurring_transactions' : entity === 'history' ? 'net_worth_history' : entity === 'cashFlow' ? 'cash_flow_history' : entity;
            if (!allowed.includes(table)) {
                return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json({
                    error: `Invalid entity: ${entity}`
                }, {
                    status: 400
                });
            }
            const rows = db.prepare(`SELECT * FROM ${table}`).all();
            return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json({
                data: rows
            });
        }
        // Return full vault snapshot
        const assets = db.prepare('SELECT * FROM assets').all().map((a)=>({
                ...a,
                is_liquid: Boolean(a.is_liquid),
                investment_details: a.investment_details ? JSON.parse(a.investment_details) : undefined
            }));
        const liabilities = db.prepare('SELECT * FROM liabilities').all().map((l)=>({
                ...l,
                is_good_debt: Boolean(l.is_good_debt)
            }));
        const goals = db.prepare('SELECT * FROM goals').all();
        const recurring = db.prepare('SELECT * FROM recurring_transactions').all().map((r)=>({
                ...r,
                is_active: Boolean(r.is_active)
            }));
        const history = db.prepare('SELECT * FROM net_worth_history ORDER BY date ASC').all().map((h)=>({
                id: h.id,
                date: h.date,
                totalAssets: h.total_assets,
                totalLiabilities: h.total_liabilities,
                netWorth: h.net_worth
            }));
        const cashFlow = db.prepare('SELECT * FROM cash_flow_history ORDER BY month ASC').all();
        const settingsRows = db.prepare('SELECT * FROM settings').all();
        const settings = {};
        for (const row of settingsRows){
            try {
                settings[row.key] = JSON.parse(row.value);
            } catch  {
                settings[row.key] = row.value;
            }
        }
        const profile = db.prepare("SELECT * FROM profiles WHERE id = 'local_user'").get();
        return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json({
            success: true,
            vault: {
                assets,
                liabilities,
                goals,
                recurring,
                history,
                cashFlow,
                settings,
                profile
            }
        });
    } catch (error) {
        console.error('Vault GET Error:', error);
        return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json({
            error: error.message
        }, {
            status: 500
        });
    }
}
async function POST(request) {
    try {
        const body = await request.json();
        const db = (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$infrastructure$2f$sqlite$2f$db$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["getDb"])();
        const { action, entity, item, id } = body;
        // --- SCOPED SINGLE-RECORD OPERATIONS (DATA-05) ---
        if (action === 'scoped_save') {
            if (!entity || !item || !item.id && entity !== 'settings' && entity !== 'cashFlow' && entity !== 'history') {
                return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json({
                    error: 'Missing entity, item, or item ID for scoped save'
                }, {
                    status: 400
                });
            }
            if (entity === 'assets') {
                const value = parseFiniteNumber(item.value, 'Asset value', {
                    allowNegative: false,
                    required: true
                });
                const interest_rate = parseFiniteNumber(item.interest_rate, 'Interest rate', {
                    allowNegative: true,
                    required: false
                });
                const stmt = db.prepare(`
                    INSERT INTO assets (id, user_id, name, type, value, is_liquid, currency, interest_rate, investment_details, last_updated)
                    VALUES (@id, @user_id, @name, @type, @value, @is_liquid, @currency, @interest_rate, @investment_details, @last_updated)
                    ON CONFLICT(id) DO UPDATE SET
                        name = excluded.name,
                        type = excluded.type,
                        value = excluded.value,
                        is_liquid = excluded.is_liquid,
                        currency = excluded.currency,
                        interest_rate = excluded.interest_rate,
                        investment_details = excluded.investment_details,
                        last_updated = excluded.last_updated
                `);
                stmt.run({
                    id: item.id,
                    user_id: item.user_id || 'local_user',
                    name: item.name || 'Unnamed Asset',
                    type: item.type || 'other',
                    value,
                    is_liquid: item.is_liquid ? 1 : 0,
                    currency: item.currency || 'USD',
                    interest_rate,
                    investment_details: item.investment_details ? JSON.stringify(item.investment_details) : null,
                    last_updated: item.last_updated || new Date().toISOString()
                });
                return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json({
                    success: true,
                    item: {
                        ...item,
                        value,
                        interest_rate
                    }
                });
            }
            if (entity === 'liabilities') {
                const balance = parseFiniteNumber(item.balance, 'Liability balance', {
                    allowNegative: false,
                    required: true
                });
                const interest_rate = parseFiniteNumber(item.interest_rate, 'Interest rate', {
                    allowNegative: true,
                    required: false
                });
                const minimum_payment = parseFiniteNumber(item.minimum_payment, 'Minimum payment', {
                    allowNegative: false,
                    required: false
                });
                const stmt = db.prepare(`
                    INSERT INTO liabilities (id, user_id, name, type, balance, interest_rate, minimum_payment, is_good_debt, currency, last_updated)
                    VALUES (@id, @user_id, @name, @type, @balance, @interest_rate, @minimum_payment, @is_good_debt, @currency, @last_updated)
                    ON CONFLICT(id) DO UPDATE SET
                        name = excluded.name,
                        type = excluded.type,
                        balance = excluded.balance,
                        interest_rate = excluded.interest_rate,
                        minimum_payment = excluded.minimum_payment,
                        is_good_debt = excluded.is_good_debt,
                        currency = excluded.currency,
                        last_updated = excluded.last_updated
                `);
                stmt.run({
                    id: item.id,
                    user_id: item.user_id || 'local_user',
                    name: item.name || 'Unnamed Debt',
                    type: item.type || 'other',
                    balance,
                    interest_rate,
                    minimum_payment,
                    is_good_debt: item.is_good_debt ? 1 : 0,
                    currency: item.currency || 'USD',
                    last_updated: item.last_updated || new Date().toISOString()
                });
                return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json({
                    success: true,
                    item: {
                        ...item,
                        balance,
                        interest_rate,
                        minimum_payment
                    }
                });
            }
            if (entity === 'goals') {
                const target_amount = parseFiniteNumber(item.target_amount, 'Target amount', {
                    allowNegative: false,
                    required: true
                });
                const current_amount = parseFiniteNumber(item.current_amount, 'Current amount', {
                    allowNegative: false,
                    required: false
                });
                const start_amount = parseFiniteNumber(item.start_amount, 'Start amount', {
                    allowNegative: false,
                    required: false
                });
                const stmt = db.prepare(`
                    INSERT INTO goals (id, user_id, name, target_amount, current_amount, start_amount, currency, category, deadline, created_at)
                    VALUES (@id, @user_id, @name, @target_amount, @current_amount, @start_amount, @currency, @category, @deadline, @created_at)
                    ON CONFLICT(id) DO UPDATE SET
                        name = excluded.name,
                        target_amount = excluded.target_amount,
                        current_amount = excluded.current_amount,
                        start_amount = excluded.start_amount,
                        currency = excluded.currency,
                        category = excluded.category,
                        deadline = excluded.deadline
                `);
                stmt.run({
                    id: item.id,
                    user_id: item.user_id || 'local_user',
                    name: item.name || 'Unnamed Goal',
                    target_amount,
                    current_amount,
                    start_amount,
                    currency: item.currency || 'USD',
                    category: item.category || 'General',
                    deadline: item.deadline || null,
                    created_at: item.created_at || new Date().toISOString()
                });
                return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json({
                    success: true,
                    item: {
                        ...item,
                        target_amount,
                        current_amount,
                        start_amount
                    }
                });
            }
            if (entity === 'recurring') {
                const amount = parseFiniteNumber(item.amount, 'Recurring amount', {
                    allowNegative: false,
                    required: true
                });
                const stmt = db.prepare(`
                    INSERT INTO recurring_transactions (id, user_id, name, amount, type, frequency, category, start_date, end_date, is_active, currency, created_at)
                    VALUES (@id, @user_id, @name, @amount, @type, @frequency, @category, @start_date, @end_date, @is_active, @currency, @created_at)
                    ON CONFLICT(id) DO UPDATE SET
                        name = excluded.name,
                        amount = excluded.amount,
                        type = excluded.type,
                        frequency = excluded.frequency,
                        category = excluded.category,
                        start_date = excluded.start_date,
                        end_date = excluded.end_date,
                        is_active = excluded.is_active,
                        currency = excluded.currency
                `);
                stmt.run({
                    id: item.id,
                    user_id: item.user_id || 'local_user',
                    name: item.name || 'Unnamed Item',
                    amount,
                    type: item.type || 'expense',
                    frequency: item.frequency || 'monthly',
                    category: item.category || 'General',
                    start_date: item.start_date || new Date().toISOString().split('T')[0],
                    end_date: item.end_date || null,
                    is_active: item.is_active !== false ? 1 : 0,
                    currency: item.currency || 'USD',
                    created_at: item.created_at || new Date().toISOString()
                });
                return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json({
                    success: true,
                    item: {
                        ...item,
                        amount
                    }
                });
            }
            if (entity === 'cashFlow') {
                const month = validateMonth(item.month);
                const income = parseFiniteNumber(item.income, 'Income', {
                    allowNegative: false,
                    required: true
                });
                const expenses = parseFiniteNumber(item.expenses, 'Expenses', {
                    allowNegative: false,
                    required: true
                });
                /**
                 * Why this exists (Finding 4):
                 * Ensures cash flow record IDs never disagree between UI, localStorage, and SQLite.
                 * If a month was previously logged, we query and reuse its existing SQLite row ID.
                 * Tricky logic: In SQLite ON CONFLICT(user_id, month), updating a row does not change
                 * its primary key id. If we assigned a new id in the payload, the DB row kept its old id.
                 * By fetching the existing id upfront (or generating one only for new months), the UI
                 * and DB remain in exact 1-to-1 sync.
                 */ const existing = db.prepare("SELECT * FROM cash_flow_history WHERE user_id = 'local_user' AND month = ?").get(month);
                const finalId = existing?.id || item.id || crypto.randomUUID();
                const stmt = db.prepare(`
                    INSERT INTO cash_flow_history (id, user_id, month, income, expenses, currency)
                    VALUES (@id, @user_id, @month, @income, @expenses, @currency)
                    ON CONFLICT(user_id, month) DO UPDATE SET
                        income = excluded.income,
                        expenses = excluded.expenses,
                        currency = excluded.currency
                `);
                stmt.run({
                    id: finalId,
                    user_id: 'local_user',
                    month,
                    income,
                    expenses,
                    currency: item.currency || 'USD'
                });
                // Return the authoritative persisted record from the database
                const persisted = db.prepare("SELECT * FROM cash_flow_history WHERE user_id = 'local_user' AND month = ?").get(month);
                return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json({
                    success: true,
                    item: {
                        id: persisted.id,
                        month: persisted.month,
                        income: persisted.income,
                        expenses: persisted.expenses,
                        currency: persisted.currency
                    }
                });
            }
            if (entity === 'history') {
                /**
                 * Why this exists (Finding 1):
                 * Provides durable SQLite persistence for net worth snapshots added/edited in HistoryEditor.
                 */ const total_assets = parseFiniteNumber(item.totalAssets ?? item.total_assets, 'Total assets', {
                    allowNegative: false,
                    required: true
                });
                const total_liabilities = parseFiniteNumber(item.totalLiabilities ?? item.total_liabilities, 'Total liabilities', {
                    allowNegative: false,
                    required: true
                });
                const net_worth = parseFiniteNumber(item.netWorth ?? item.net_worth, 'Net worth', {
                    allowNegative: true,
                    required: true
                });
                const date = item.date;
                if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
                    return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json({
                        error: 'History snapshot date must be YYYY-MM-DD'
                    }, {
                        status: 400
                    });
                }
                const existing = db.prepare("SELECT id FROM net_worth_history WHERE user_id = 'local_user' AND date = ?").get(date);
                const finalId = existing?.id || item.id || crypto.randomUUID();
                const stmt = db.prepare(`
                    INSERT INTO net_worth_history (id, user_id, date, total_assets, total_liabilities, net_worth)
                    VALUES (@id, @user_id, @date, @total_assets, @total_liabilities, @net_worth)
                    ON CONFLICT(user_id, date) DO UPDATE SET
                        total_assets = excluded.total_assets,
                        total_liabilities = excluded.total_liabilities,
                        net_worth = excluded.net_worth
                `);
                stmt.run({
                    id: finalId,
                    user_id: 'local_user',
                    date,
                    total_assets,
                    total_liabilities,
                    net_worth
                });
                const persisted = db.prepare("SELECT * FROM net_worth_history WHERE user_id = 'local_user' AND date = ?").get(date);
                return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json({
                    success: true,
                    item: {
                        id: persisted.id,
                        date: persisted.date,
                        totalAssets: persisted.total_assets,
                        totalLiabilities: persisted.total_liabilities,
                        netWorth: persisted.net_worth
                    }
                });
            }
            if (entity === 'settings') {
                /**
                 * Why this exists (Finding 1):
                 * Persists user settings (currency, theme, check-in frequency, freedom settings) directly to SQLite
                 * so preferences survive browser reloads and startup synchronization.
                 */ if (!item || typeof item !== 'object') {
                    return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json({
                        error: 'Settings payload must be an object'
                    }, {
                        status: 400
                    });
                }
                const upsertSetting = db.prepare(`
                    INSERT INTO settings (key, value)
                    VALUES (?, ?)
                    ON CONFLICT(key) DO UPDATE SET value = excluded.value
                `);
                if (item.key && item.value !== undefined) {
                    upsertSetting.run(item.key, typeof item.value === 'string' ? item.value : JSON.stringify(item.value));
                    if (item.key === 'baseCurrency' || item.key === 'userSettings' && item.value?.baseCurrency) {
                        const currency = item.key === 'baseCurrency' ? item.value : item.value.baseCurrency;
                        db.prepare("UPDATE profiles SET currency_code = ? WHERE id = 'local_user'").run(currency);
                    }
                } else {
                    upsertSetting.run('userSettings', JSON.stringify(item));
                    for (const [k, v] of Object.entries(item)){
                        upsertSetting.run(k, typeof v === 'string' ? v : JSON.stringify(v));
                    }
                    if (item.baseCurrency) {
                        db.prepare("UPDATE profiles SET currency_code = ? WHERE id = 'local_user'").run(item.baseCurrency);
                    }
                }
                return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json({
                    success: true,
                    item
                });
            }
            return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json({
                error: `Unsupported entity for scoped save: ${entity}`
            }, {
                status: 400
            });
        }
        // --- SCOPED SINGLE-RECORD DELETE (DATA-05) ---
        if (action === 'scoped_delete') {
            if (!entity || !id) {
                return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json({
                    error: 'Missing entity or id for scoped delete'
                }, {
                    status: 400
                });
            }
            const tableMap = {
                assets: 'assets',
                liabilities: 'liabilities',
                goals: 'goals',
                recurring: 'recurring_transactions',
                cashFlow: 'cash_flow_history',
                history: 'net_worth_history'
            };
            const table = tableMap[entity];
            if (!table) {
                return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json({
                    error: `Unsupported entity for delete: ${entity}`
                }, {
                    status: 400
                });
            }
            let result;
            if (entity === 'cashFlow') {
                result = db.prepare("DELETE FROM cash_flow_history WHERE id = ? OR month = ?").run(id, id);
            } else if (entity === 'history') {
                result = db.prepare("DELETE FROM net_worth_history WHERE id = ? OR date = ?").run(id, id);
            } else {
                result = db.prepare(`DELETE FROM ${table} WHERE id = ?`).run(id);
            }
            if (result.changes === 0) {
                return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json({
                    error: `Record not found for delete in ${entity} with id: ${id}`
                }, {
                    status: 404
                });
            }
            return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json({
                success: true,
                deletedId: id
            });
        }
        // --- COMPLETE VAULT CLEAR/WIPE (DATA-01, DATA-05) ---
        if (action === 'clear_vault' || action === 'wipe') {
            const clearTx = db.transaction(()=>{
                db.prepare("DELETE FROM assets WHERE user_id = 'local_user'").run();
                db.prepare("DELETE FROM liabilities WHERE user_id = 'local_user'").run();
                db.prepare("DELETE FROM goals WHERE user_id = 'local_user'").run();
                db.prepare("DELETE FROM recurring_transactions WHERE user_id = 'local_user'").run();
                db.prepare("DELETE FROM net_worth_history WHERE user_id = 'local_user'").run();
                db.prepare("DELETE FROM cash_flow_history WHERE user_id = 'local_user'").run();
                db.prepare("DELETE FROM settings").run();
            });
            clearTx();
            return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json({
                success: true,
                message: 'Vault wiped successfully'
            });
        }
        // --- BULK RESTORE OR BULK SYNCHRONIZATION ---
        const { assets, liabilities, goals, recurring, history, cashFlow, settings, profile } = body;
        const isBulkRestore = action === 'bulk_restore';
        /**
         * Why this exists (Finding 5 & Milestone 0 final signoff):
         * Protects against incomplete destructive restore requests.
         * The server must independently validate that all 6 core financial collections
         * AND the settings object are present and well-formed BEFORE executing any table deletions.
         * 
         * Tricky logic:
         * In a bulk restore, the settings table is cleared alongside financial records.
         * If settings is omitted or malformed, restoring without it would permanently erase
         * the user's existing settings. Therefore, settings is strictly required (must be an object,
         * not null or an array).
         * 
         * TODO: Support versioned schema validation if settings schema evolves in Milestone 1+.
         */ if (isBulkRestore) {
            const requiredCollections = [
                'assets',
                'liabilities',
                'goals',
                'recurring',
                'history',
                'cashFlow'
            ];
            for (const col of requiredCollections){
                if (!Array.isArray(body[col])) {
                    return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json({
                        error: `Invalid restore payload: collection "${col}" is required and must be an array`
                    }, {
                        status: 400
                    });
                }
            }
            if (!settings || typeof settings !== 'object' || Array.isArray(settings)) {
                return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json({
                    error: 'Invalid restore payload: settings is required and must be an object'
                }, {
                    status: 400
                });
            }
            // Pre-validate all items before beginning any database transaction or deletion
            for (const a of assets){
                parseFiniteNumber(a.value, `Asset "${a.name || a.id}" value`, {
                    allowNegative: false,
                    required: true
                });
                if (a.interest_rate !== undefined && a.interest_rate !== null) {
                    parseFiniteNumber(a.interest_rate, `Asset "${a.name || a.id}" interest rate`, {
                        allowNegative: true,
                        required: false
                    });
                }
            }
            for (const l of liabilities){
                parseFiniteNumber(l.balance, `Liability "${l.name || l.id}" balance`, {
                    allowNegative: false,
                    required: true
                });
                if (l.interest_rate !== undefined && l.interest_rate !== null) {
                    parseFiniteNumber(l.interest_rate, `Liability "${l.name || l.id}" interest rate`, {
                        allowNegative: true,
                        required: false
                    });
                }
            }
            for (const g of goals){
                parseFiniteNumber(g.target_amount, `Goal "${g.name || g.id}" target amount`, {
                    allowNegative: false,
                    required: true
                });
            }
            for (const r of recurring){
                parseFiniteNumber(r.amount, `Recurring item "${r.name || r.id}" amount`, {
                    allowNegative: false,
                    required: true
                });
            }
            for (const h of history){
                parseFiniteNumber(h.totalAssets ?? h.total_assets, `History record total assets`, {
                    allowNegative: false,
                    required: true
                });
                parseFiniteNumber(h.totalLiabilities ?? h.total_liabilities, `History record total liabilities`, {
                    allowNegative: false,
                    required: true
                });
                parseFiniteNumber(h.netWorth ?? h.net_worth, `History record net worth`, {
                    allowNegative: true,
                    required: true
                });
            }
            for (const cf of cashFlow){
                validateMonth(cf.month);
                parseFiniteNumber(cf.income, `Cash flow entry income`, {
                    allowNegative: false,
                    required: true
                });
                parseFiniteNumber(cf.expenses, `Cash flow entry expenses`, {
                    allowNegative: false,
                    required: true
                });
            }
        }
        const syncTransaction = db.transaction(()=>{
            // In a bulk restore, wipe existing records first to guarantee clean atomic replacement (TRUST-11)
            if (isBulkRestore) {
                db.prepare("DELETE FROM assets WHERE user_id = 'local_user'").run();
                db.prepare("DELETE FROM liabilities WHERE user_id = 'local_user'").run();
                db.prepare("DELETE FROM goals WHERE user_id = 'local_user'").run();
                db.prepare("DELETE FROM recurring_transactions WHERE user_id = 'local_user'").run();
                db.prepare("DELETE FROM net_worth_history WHERE user_id = 'local_user'").run();
                db.prepare("DELETE FROM cash_flow_history WHERE user_id = 'local_user'").run();
                db.prepare("DELETE FROM settings").run();
            }
            if (Array.isArray(assets)) {
                if (!isBulkRestore) {
                    db.prepare('DELETE FROM assets WHERE user_id = ?').run('local_user');
                }
                const insertAsset = db.prepare(`
                    INSERT INTO assets (id, user_id, name, type, value, is_liquid, currency, interest_rate, investment_details, last_updated)
                    VALUES (@id, @user_id, @name, @type, @value, @is_liquid, @currency, @interest_rate, @investment_details, @last_updated)
                `);
                for (const a of assets){
                    const value = parseFiniteNumber(a.value, `Asset "${a.name || a.id}" value`, {
                        allowNegative: false,
                        required: true
                    });
                    const interest_rate = parseFiniteNumber(a.interest_rate, `Asset "${a.name || a.id}" interest rate`, {
                        allowNegative: true,
                        required: false
                    });
                    insertAsset.run({
                        id: a.id || crypto.randomUUID(),
                        user_id: a.user_id || 'local_user',
                        name: a.name || 'Unnamed Asset',
                        type: a.type || 'other',
                        value,
                        is_liquid: a.is_liquid ? 1 : 0,
                        currency: a.currency || 'USD',
                        interest_rate,
                        investment_details: a.investment_details ? JSON.stringify(a.investment_details) : null,
                        last_updated: a.last_updated || new Date().toISOString()
                    });
                }
            }
            if (Array.isArray(liabilities)) {
                if (!isBulkRestore) {
                    db.prepare('DELETE FROM liabilities WHERE user_id = ?').run('local_user');
                }
                const insertLiab = db.prepare(`
                    INSERT INTO liabilities (id, user_id, name, type, balance, interest_rate, minimum_payment, is_good_debt, currency, last_updated)
                    VALUES (@id, @user_id, @name, @type, @balance, @interest_rate, @minimum_payment, @is_good_debt, @currency, @last_updated)
                `);
                for (const l of liabilities){
                    const balance = parseFiniteNumber(l.balance, `Liability "${l.name || l.id}" balance`, {
                        allowNegative: false,
                        required: true
                    });
                    const interest_rate = parseFiniteNumber(l.interest_rate, `Liability "${l.name || l.id}" interest rate`, {
                        allowNegative: true,
                        required: false
                    });
                    const minimum_payment = parseFiniteNumber(l.minimum_payment, `Liability "${l.name || l.id}" minimum payment`, {
                        allowNegative: false,
                        required: false
                    });
                    insertLiab.run({
                        id: l.id || crypto.randomUUID(),
                        user_id: l.user_id || 'local_user',
                        name: l.name || 'Unnamed Debt',
                        type: l.type || 'other',
                        balance,
                        interest_rate,
                        minimum_payment,
                        is_good_debt: l.is_good_debt ? 1 : 0,
                        currency: l.currency || 'USD',
                        last_updated: l.last_updated || new Date().toISOString()
                    });
                }
            }
            if (Array.isArray(goals)) {
                if (!isBulkRestore) {
                    db.prepare('DELETE FROM goals WHERE user_id = ?').run('local_user');
                }
                const insertGoal = db.prepare(`
                    INSERT INTO goals (id, user_id, name, target_amount, current_amount, start_amount, currency, category, deadline, created_at)
                    VALUES (@id, @user_id, @name, @target_amount, @current_amount, @start_amount, @currency, @category, @deadline, @created_at)
                `);
                for (const g of goals){
                    const target_amount = parseFiniteNumber(g.target_amount, `Goal "${g.name || g.id}" target amount`, {
                        allowNegative: false,
                        required: true
                    });
                    const current_amount = parseFiniteNumber(g.current_amount, `Goal "${g.name || g.id}" current amount`, {
                        allowNegative: false,
                        required: false
                    });
                    const start_amount = parseFiniteNumber(g.start_amount, `Goal "${g.name || g.id}" start amount`, {
                        allowNegative: false,
                        required: false
                    });
                    insertGoal.run({
                        id: g.id || crypto.randomUUID(),
                        user_id: g.user_id || 'local_user',
                        name: g.name || 'Unnamed Goal',
                        target_amount,
                        current_amount,
                        start_amount,
                        currency: g.currency || 'USD',
                        category: g.category || 'General',
                        deadline: g.deadline || null,
                        created_at: g.created_at || new Date().toISOString()
                    });
                }
            }
            if (Array.isArray(recurring)) {
                if (!isBulkRestore) {
                    db.prepare('DELETE FROM recurring_transactions WHERE user_id = ?').run('local_user');
                }
                const insertRec = db.prepare(`
                    INSERT INTO recurring_transactions (id, user_id, name, amount, type, frequency, category, start_date, end_date, is_active, currency, created_at)
                    VALUES (@id, @user_id, @name, @amount, @type, @frequency, @category, @start_date, @end_date, @is_active, @currency, @created_at)
                `);
                for (const r of recurring){
                    const amount = parseFiniteNumber(r.amount, `Recurring item "${r.name || r.id}" amount`, {
                        allowNegative: false,
                        required: true
                    });
                    insertRec.run({
                        id: r.id || crypto.randomUUID(),
                        user_id: r.user_id || 'local_user',
                        name: r.name || 'Unnamed Item',
                        amount,
                        type: r.type || 'expense',
                        frequency: r.frequency || 'monthly',
                        category: r.category || 'General',
                        start_date: r.start_date || new Date().toISOString().split('T')[0],
                        end_date: r.end_date || null,
                        is_active: r.is_active !== false ? 1 : 0,
                        currency: r.currency || 'USD',
                        created_at: r.created_at || new Date().toISOString()
                    });
                }
            }
            if (Array.isArray(history)) {
                // Ensure existing history is cleared on both restore and sync so empty history leaves 0 rows
                db.prepare("DELETE FROM net_worth_history WHERE user_id = 'local_user'").run();
                const insertHistory = db.prepare(`
                    INSERT INTO net_worth_history (id, user_id, date, total_assets, total_liabilities, net_worth)
                    VALUES (@id, @user_id, @date, @total_assets, @total_liabilities, @net_worth)
                `);
                for (const h of history){
                    const total_assets = parseFiniteNumber(h.totalAssets ?? h.total_assets, `History record ${h.date} total assets`, {
                        allowNegative: false,
                        required: true
                    });
                    const total_liabilities = parseFiniteNumber(h.totalLiabilities ?? h.total_liabilities, `History record ${h.date} total liabilities`, {
                        allowNegative: false,
                        required: true
                    });
                    const net_worth = parseFiniteNumber(h.netWorth ?? h.net_worth, `History record ${h.date} net worth`, {
                        allowNegative: true,
                        required: true
                    });
                    insertHistory.run({
                        id: h.id || crypto.randomUUID(),
                        user_id: 'local_user',
                        date: h.date,
                        total_assets,
                        total_liabilities,
                        net_worth
                    });
                }
            }
            if (Array.isArray(cashFlow)) {
                if (!isBulkRestore) {
                    db.prepare("DELETE FROM cash_flow_history WHERE user_id = 'local_user'").run();
                }
                const insertCashFlow = db.prepare(`
                    INSERT INTO cash_flow_history (id, user_id, month, income, expenses, currency)
                    VALUES (@id, @user_id, @month, @income, @expenses, @currency)
                `);
                for (const cf of cashFlow){
                    const month = validateMonth(cf.month);
                    const income = parseFiniteNumber(cf.income, `Cash flow entry ${cf.month} income`, {
                        allowNegative: false,
                        required: true
                    });
                    const expenses = parseFiniteNumber(cf.expenses, `Cash flow entry ${cf.month} expenses`, {
                        allowNegative: false,
                        required: true
                    });
                    insertCashFlow.run({
                        id: cf.id || crypto.randomUUID(),
                        user_id: 'local_user',
                        month,
                        income,
                        expenses,
                        currency: cf.currency || 'USD'
                    });
                }
            }
            if (settings && typeof settings === 'object') {
                if (isBulkRestore) {
                    db.prepare("DELETE FROM settings").run();
                }
                const upsertSetting = db.prepare(`
                    INSERT INTO settings (key, value)
                    VALUES (?, ?)
                    ON CONFLICT(key) DO UPDATE SET value = excluded.value
                `);
                for (const [k, v] of Object.entries(settings)){
                    upsertSetting.run(k, typeof v === 'string' ? v : JSON.stringify(v));
                }
            }
            if (profile) {
                db.prepare(`
                    INSERT INTO profiles (id, email, full_name, privacy_mode, currency_code, created_at)
                    VALUES ('local_user', @email, @full_name, @privacy_mode, @currency_code, @created_at)
                    ON CONFLICT(id) DO UPDATE SET
                        full_name = excluded.full_name,
                        currency_code = excluded.currency_code,
                        privacy_mode = excluded.privacy_mode
                `).run({
                    email: profile.email || 'local@device',
                    full_name: profile.full_name || 'Local Vault Owner',
                    privacy_mode: profile.privacy_mode ? 1 : 0,
                    currency_code: profile.currency_code || 'USD',
                    created_at: profile.created_at || new Date().toISOString()
                });
            }
        });
        syncTransaction();
        return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json({
            success: true,
            message: isBulkRestore ? 'Vault restored successfully' : 'Vault saved to local SQLite successfully'
        });
    } catch (error) {
        console.error('Vault POST Error:', error);
        const status = error instanceof ValidationError || error.statusCode === 400 ? 400 : 500;
        return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json({
            error: error.message || 'Internal database error'
        }, {
            status
        });
    }
}
}),
];

//# sourceMappingURL=%5Broot-of-the-server%5D__0f235a7b._.js.map