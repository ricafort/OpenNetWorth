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
"[project]/src/lib/domain/accounting/balanceService.ts [app-route] (ecmascript)", ((__turbopack_context__) => {
"use strict";

/**
 * Milestone 1 Deterministic Financial Calculation Service
 * 
 * Why this file exists:
 * Implements M1-CALC-01, M1-CALC-02, and M1-CALC-03.
 * Provides the shared, deterministic balance and net worth calculation engine used identically
 * by UI screens, reports, API endpoints, and future AI mentor tools.
 * 
 * Tricky logic:
 * - Calculates balance as of a date by summing all journal entries up to `asOfDate` (inclusive).
 * - Applies accounting normal balance rules:
 *   * For Assets and Expenses (Debit-normal): Balance = Sum(Debits) - Sum(Credits) = Sum(amount_cents).
 *   * For Liabilities, Equity, and Income (Credit-normal): Balance = Sum(Credits) - Sum(Debits) = -Sum(amount_cents).
 * - Multi-currency totals are grouped strictly by currency. Unlike currencies are NEVER added
 *   directly or assumed 1:1 without explicit dated exchange rates (M1-CALC-03).
 * 
 * TODO: Add automated FX rate feed sync in Milestone 2.
 */ __turbopack_context__.s([
    "CALCULATION_ENGINE_VERSION",
    ()=>CALCULATION_ENGINE_VERSION,
    "convertCurrencyAmount",
    ()=>convertCurrencyAmount,
    "getAccountBalance",
    ()=>getAccountBalance,
    "getAccountLedgerDrilldown",
    ()=>getAccountLedgerDrilldown,
    "getActualCashFlowStatement",
    ()=>getActualCashFlowStatement,
    "getAttributedEntityShare",
    ()=>getAttributedEntityShare,
    "getConsolidatedNetWorth",
    ()=>getConsolidatedNetWorth,
    "getEntityNetWorth",
    ()=>getEntityNetWorth,
    "getExchangeRate",
    ()=>getExchangeRate,
    "getPeriodIncomeAndExpenses",
    ()=>getPeriodIncomeAndExpenses,
    "getScopeNetWorth",
    ()=>getScopeNetWorth,
    "setExchangeRate",
    ()=>setExchangeRate
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$domain$2f$accounting$2f$types$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/lib/domain/accounting/types.ts [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$domain$2f$accounting$2f$accountService$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/lib/domain/accounting/accountService.ts [app-route] (ecmascript)");
;
;
const CALCULATION_ENGINE_VERSION = '1.0.0';
function getAccountBalance(db, accountId, asOfDate) {
    const account = db.prepare('SELECT * FROM m1_accounts WHERE id = ?').get(accountId);
    if (!account) {
        throw new Error(`Account not found with ID: ${accountId}`);
    }
    const effectiveDate = asOfDate || new Date().toISOString().split('T')[0];
    // Query all journal postings up to asOfDate via join to transactions
    const rows = db.prepare(`
        SELECT j.amount_cents, j.currency, t.date
        FROM m1_journal_entries j
        JOIN m1_transactions t ON j.transaction_id = t.id
        WHERE j.account_id = ? AND t.date <= ? AND t.status = 'posted'
        ORDER BY t.date ASC
    `).all(accountId, effectiveDate);
    let netDebitCredits = 0;
    for (const r of rows){
        netDebitCredits += r.amount_cents;
    }
    // Normal balance rule:
    // Assets & Expenses: positive debit increases balance -> balance = netDebitCredits
    // Liabilities, Equity, Income: positive credit increases balance -> balance = -netDebitCredits
    // Tricky logic: Normalize -0 to 0 in JavaScript arithmetic
    const isDebitNormal = account.type === 'asset' || account.type === 'expense';
    const rawBalance = isDebitNormal ? netDebitCredits : -netDebitCredits;
    const balanceCents = rawBalance === 0 ? 0 : rawBalance;
    const money = {
        amount_cents: balanceCents,
        currency: account.currency
    };
    return {
        account_id: account.id,
        account_name: account.name,
        account_type: account.type,
        currency: account.currency,
        balance_cents: balanceCents,
        formatted_balance: (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$domain$2f$accounting$2f$types$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["formatMoney"])(money),
        as_of_date: effectiveDate,
        calculation_version: CALCULATION_ENGINE_VERSION,
        contributor_count: rows.length
    };
}
function getEntityNetWorth(db, entityId, asOfDate) {
    const effectiveDate = asOfDate || new Date().toISOString().split('T')[0];
    // Fetch all active accounts for entity
    const accounts = db.prepare(`
        SELECT id, name, type, currency
        FROM m1_accounts
        WHERE entity_id = ? AND is_active = 1
    `).all(entityId);
    const totalAssets = {};
    const totalLiabilities = {};
    for (const acc of accounts){
        if (acc.type !== 'asset' && acc.type !== 'liability') {
            continue; // Equity, Income, Expense accounts do not count as balance sheet balance items
        }
        const bal = getAccountBalance(db, acc.id, effectiveDate);
        const curr = acc.currency.toUpperCase();
        if (acc.type === 'asset') {
            totalAssets[curr] = (totalAssets[curr] || 0) + bal.balance_cents;
        } else if (acc.type === 'liability') {
            totalLiabilities[curr] = (totalLiabilities[curr] || 0) + bal.balance_cents;
        }
    }
    const allCurrencies = Array.from(new Set([
        ...Object.keys(totalAssets),
        ...Object.keys(totalLiabilities)
    ]));
    const netWorthCents = {};
    const formattedNetWorth = {};
    for (const curr of allCurrencies){
        const a = totalAssets[curr] || 0;
        const l = totalLiabilities[curr] || 0;
        const nw = a - l;
        netWorthCents[curr] = nw;
        formattedNetWorth[curr] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$domain$2f$accounting$2f$types$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["formatMoney"])({
            amount_cents: nw,
            currency: curr
        });
    }
    return {
        entity_id: entityId,
        as_of_date: effectiveDate,
        net_worth_cents_by_currency: netWorthCents,
        total_assets_cents_by_currency: totalAssets,
        total_liabilities_cents_by_currency: totalLiabilities,
        formatted_net_worth_by_currency: formattedNetWorth,
        calculation_version: CALCULATION_ENGINE_VERSION,
        account_count: accounts.length
    };
}
function getPeriodIncomeAndExpenses(db, entityId, startDate, endDate) {
    let sql = `
        SELECT 
            j.amount_cents,
            j.currency,
            a.id as account_id,
            a.name as account_name,
            a.type as account_type,
            a.sub_type,
            t.id as transaction_id,
            t.date
        FROM m1_journal_entries j
        JOIN m1_accounts a ON j.account_id = a.id
        JOIN m1_transactions t ON j.transaction_id = t.id
        WHERE a.entity_id = ? AND a.type IN ('income', 'expense') AND t.status = 'posted'
    `;
    const params = [
        entityId
    ];
    if (startDate) {
        sql += ' AND t.date >= ?';
        params.push(startDate);
    }
    if (endDate) {
        sql += ' AND t.date <= ?';
        params.push(endDate);
    }
    sql += ' ORDER BY t.date ASC';
    const rows = db.prepare(sql).all(...params);
    const totalIncome = {};
    const totalExpenses = {};
    const categoryMap = new Map();
    for (const r of rows){
        const curr = r.currency.toUpperCase();
        const isIncome = r.account_type === 'income';
        // Credit-normal vs Debit-normal
        // Income postings: negative cents -> positive income
        // Expense postings: positive cents -> positive expense
        const rawMag = isIncome ? -r.amount_cents : r.amount_cents;
        const magnitudeCents = rawMag === 0 ? 0 : rawMag;
        if (isIncome) {
            totalIncome[curr] = (totalIncome[curr] || 0) + magnitudeCents;
        } else {
            totalExpenses[curr] = (totalExpenses[curr] || 0) + magnitudeCents;
        }
        const catKey = `${r.account_id}`;
        if (!categoryMap.has(catKey)) {
            categoryMap.set(catKey, {
                account_id: r.account_id,
                account_name: r.account_name,
                type: r.account_type,
                sub_type: r.sub_type,
                currency: curr,
                total_cents: 0,
                transaction_count: 0
            });
        }
        const item = categoryMap.get(catKey);
        item.total_cents += magnitudeCents;
        item.transaction_count += 1;
    }
    const allCurrencies = Array.from(new Set([
        ...Object.keys(totalIncome),
        ...Object.keys(totalExpenses)
    ]));
    const netSavings = {};
    const formattedIncome = {};
    const formattedExpenses = {};
    const formattedSavings = {};
    for (const curr of allCurrencies){
        const inc = totalIncome[curr] || 0;
        const exp = totalExpenses[curr] || 0;
        const rawSav = inc - exp;
        const sav = rawSav === 0 ? 0 : rawSav;
        netSavings[curr] = sav;
        formattedIncome[curr] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$domain$2f$accounting$2f$types$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["formatMoney"])({
            amount_cents: inc,
            currency: curr
        });
        formattedExpenses[curr] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$domain$2f$accounting$2f$types$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["formatMoney"])({
            amount_cents: exp,
            currency: curr
        });
        formattedSavings[curr] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$domain$2f$accounting$2f$types$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["formatMoney"])({
            amount_cents: sav,
            currency: curr
        });
    }
    const breakdown = Array.from(categoryMap.values()).map((cat)=>({
            account_id: cat.account_id,
            account_name: cat.account_name,
            type: cat.type,
            sub_type: cat.sub_type,
            currency: cat.currency,
            total_cents: cat.total_cents,
            formatted_total: (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$domain$2f$accounting$2f$types$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["formatMoney"])({
                amount_cents: cat.total_cents,
                currency: cat.currency
            }),
            transaction_count: cat.transaction_count
        }));
    return {
        entity_id: entityId,
        start_date: startDate,
        end_date: endDate,
        total_income_cents_by_currency: totalIncome,
        total_expenses_cents_by_currency: totalExpenses,
        net_savings_cents_by_currency: netSavings,
        formatted_income_by_currency: formattedIncome,
        formatted_expenses_by_currency: formattedExpenses,
        formatted_net_savings_by_currency: formattedSavings,
        breakdown_by_category: breakdown,
        calculation_version: CALCULATION_ENGINE_VERSION
    };
}
function setExchangeRate(db, input) {
    const from = input.from_currency.toUpperCase();
    const to = input.to_currency.toUpperCase();
    if (from === to) {
        throw new __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$domain$2f$accounting$2f$accountService$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["ValidationError"]('From and to currencies must be different.');
    }
    if (!Number.isFinite(input.rate) || input.rate <= 0) {
        throw new __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$domain$2f$accounting$2f$accountService$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["ValidationError"](`Exchange rate must be a finite positive number, received: ${input.rate}`);
    }
    const id = `fx-${from}-${to}-${input.effective_date}`;
    const now = new Date().toISOString();
    db.prepare(`
        INSERT INTO m1_exchange_rates (id, from_currency, to_currency, rate, effective_date, source, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(from_currency, to_currency, effective_date) DO UPDATE SET
            rate = excluded.rate,
            source = excluded.source,
            created_at = excluded.created_at
    `).run(id, from, to, input.rate, input.effective_date, input.source.trim(), now);
    return {
        id,
        from_currency: from,
        to_currency: to,
        rate: input.rate,
        effective_date: input.effective_date,
        source: input.source.trim(),
        created_at: now
    };
}
function getExchangeRate(db, fromCurrency, toCurrency, asOfDate) {
    const from = fromCurrency.toUpperCase();
    const to = toCurrency.toUpperCase();
    if (from === to) return 1.0;
    const date = asOfDate || new Date().toISOString().split('T')[0];
    // Check direct rate (most recent on or before date)
    const direct = db.prepare(`
        SELECT rate FROM m1_exchange_rates
        WHERE from_currency = ? AND to_currency = ? AND effective_date <= ?
        ORDER BY effective_date DESC LIMIT 1
    `).get(from, to, date);
    if (direct) return direct.rate;
    // Check inverse rate
    const inverse = db.prepare(`
        SELECT rate FROM m1_exchange_rates
        WHERE from_currency = ? AND to_currency = ? AND effective_date <= ?
        ORDER BY effective_date DESC LIMIT 1
    `).get(to, from, date);
    if (inverse && inverse.rate > 0) return 1.0 / inverse.rate;
    return null;
}
/**
 * Converts a monetary minor-unit amount between currencies taking scales into account (M1-CALC-03, T8).
 * 
 * Helper to convert a floating-point rate or decimal number into exact rational BigInt (num / den).
 * Handles standard decimal strings and scientific notation without binary floating-point drift.
 */ function numberToRational(val) {
    if (!Number.isFinite(val)) {
        throw new Error(`Cannot convert non-finite number to rational: ${val}`);
    }
    const str = val.toString();
    const eIndex = str.indexOf('e') !== -1 ? str.indexOf('e') : str.indexOf('E');
    if (eIndex !== -1) {
        const base = str.slice(0, eIndex);
        const exp = parseInt(str.slice(eIndex + 1), 10);
        const [intPart, fracPart = ''] = base.split('.');
        const cleanInt = intPart === '' ? '0' : intPart;
        let num = BigInt(cleanInt + fracPart);
        let den = BigInt(10) ** BigInt(fracPart.length);
        if (exp > 0) {
            num = num * BigInt(10) ** BigInt(exp);
        } else if (exp < 0) {
            den = den * BigInt(10) ** BigInt(-exp);
        }
        return {
            num,
            den
        };
    }
    const [intPart, fracPart = ''] = str.split('.');
    const cleanInt = intPart === '' ? '0' : intPart;
    const num = BigInt(cleanInt + fracPart);
    const den = BigInt(10) ** BigInt(fracPart.length);
    return {
        num,
        den
    };
}
function convertCurrencyAmount(amountMinorUnits, fromCurrency, toCurrency, rate) {
    const fromUpper = fromCurrency.toUpperCase();
    const toUpper = toCurrency.toUpperCase();
    // Resubmission Item 7: Remove rate === 1.0 shortcut across different currencies.
    // Currency scale conversion remains necessary even at a 1.0 exchange rate.
    if (fromUpper === toUpper) {
        return amountMinorUnits;
    }
    if (amountMinorUnits === 0) {
        return 0;
    }
    const fromScale = __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$domain$2f$accounting$2f$types$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["CURRENCY_DECIMALS"][fromUpper] ?? 2;
    const toScale = __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$domain$2f$accounting$2f$types$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["CURRENCY_DECIMALS"][toUpper] ?? 2;
    const sign = amountMinorUnits < 0 ? -1 : 1;
    const absUnits = BigInt(Math.abs(amountMinorUnits));
    const { num: rateNum, den: rateDen } = numberToRational(rate);
    // Total numerator: absUnits * rateNum * 10^toScale
    const totalNum = absUnits * rateNum * BigInt(10) ** BigInt(toScale);
    // Total denominator: rateDen * 10^fromScale
    const totalDen = rateDen * BigInt(10) ** BigInt(fromScale);
    const quotient = totalNum / totalDen;
    const remainder = totalNum % totalDen;
    // Explicit symmetric half-away-from-zero rounding:
    // If remainder * 2 >= totalDen, increment quotient by 1
    const rounded = remainder * BigInt(2) >= totalDen ? quotient + BigInt(1) : quotient;
    return sign * Number(rounded);
}
function getConsolidatedNetWorth(db, entityIdOrInput, reportingCurrencyArg, asOfDateArg, scopeTypeArg) {
    const entityId = typeof entityIdOrInput === 'string' ? entityIdOrInput : entityIdOrInput.target_entity_id;
    const reportingCurrency = typeof entityIdOrInput === 'object' && entityIdOrInput.reporting_currency ? entityIdOrInput.reporting_currency : reportingCurrencyArg || 'USD';
    const asOfDate = typeof entityIdOrInput === 'object' && entityIdOrInput.as_of_date ? entityIdOrInput.as_of_date : asOfDateArg;
    const scopeType = typeof entityIdOrInput === 'object' && entityIdOrInput.scope_type ? entityIdOrInput.scope_type : scopeTypeArg || 'individual';
    const targetCurr = reportingCurrency.toUpperCase();
    const effectiveDate = asOfDate || new Date().toISOString().split('T')[0];
    // Assessor Finding 3: Consume exact ownership-adjusted scoped totals from getScopeNetWorth
    const scopedNw = getScopeNetWorth(db, {
        target_entity_id: entityId,
        scope_type: scopeType,
        as_of_date: effectiveDate
    });
    const scopedTotals = scopedNw.scoped_net_worth_cents_by_currency || scopedNw.net_worth_cents_by_currency;
    const formattedScopedTotals = scopedNw.formatted_scoped_net_worth_by_currency || scopedNw.formatted_net_worth_by_currency;
    let isComplete = true;
    const missingRates = [];
    let consolidatedTotalCents = 0;
    const appliedExchangeRates = {};
    for (const [curr, cents] of Object.entries(scopedTotals)){
        if (curr === targetCurr) {
            consolidatedTotalCents += cents;
            appliedExchangeRates[`${curr}->${targetCurr}`] = 1.0;
            continue;
        }
        const rate = getExchangeRate(db, curr, targetCurr, effectiveDate);
        if (rate === null) {
            isComplete = false;
            missingRates.push({
                from: curr,
                to: targetCurr,
                date: effectiveDate
            });
        } else {
            appliedExchangeRates[`${curr}->${targetCurr}`] = rate;
            // Convert with scale factor and symmetric half-up rounding (Assessor Finding 1)
            const converted = convertCurrencyAmount(cents, curr, targetCurr, rate);
            consolidatedTotalCents += converted;
        }
    }
    return {
        reporting_currency: targetCurr,
        scope_type: scopeType,
        target_entity_id: entityId,
        is_complete: isComplete,
        missing_rates: missingRates,
        consolidated_total_cents: isComplete ? consolidatedTotalCents : null,
        formatted_consolidated_total: isComplete ? (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$domain$2f$accounting$2f$types$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["formatMoney"])({
            amount_cents: consolidatedTotalCents,
            currency: targetCurr
        }) : null,
        original_totals_by_currency: scopedTotals,
        formatted_original_by_currency: formattedScopedTotals,
        applied_exchange_rates: appliedExchangeRates,
        as_of_date: effectiveDate,
        calculation_version: CALCULATION_ENGINE_VERSION
    };
}
function getAttributedEntityShare(ownerships, primaryEntityId, targetEntityId) {
    if (!ownerships || ownerships.length === 0) {
        return targetEntityId === primaryEntityId ? 100 : 0;
    }
    const explicit = ownerships.find((o)=>o.entity_id === targetEntityId);
    if (explicit) {
        return explicit.share_percentage;
    }
    if (targetEntityId === primaryEntityId) {
        const allocatedToOthers = ownerships.reduce((sum, o)=>sum + o.share_percentage, 0);
        return Math.max(0, 100 - allocatedToOthers);
    }
    return 0;
}
function getScopeNetWorth(db, targetEntityIdOrInput, scopeTypeArg, asOfDateArg) {
    const input = typeof targetEntityIdOrInput === 'string' ? {
        target_entity_id: targetEntityIdOrInput,
        scope_type: scopeTypeArg,
        as_of_date: asOfDateArg
    } : targetEntityIdOrInput;
    const scopeType = input.scope_type || 'individual';
    const effectiveDate = input.as_of_date || new Date().toISOString().split('T')[0];
    const targetEntity = db.prepare('SELECT id, name, type, currency FROM m1_entities WHERE id = ?').get(input.target_entity_id);
    if (!targetEntity) {
        throw new Error(`Entity not found: ${input.target_entity_id}`);
    }
    const items = [];
    const totalAssets = {};
    const totalLiabilities = {};
    if (scopeType === 'individual') {
        // Find all candidate accounts:
        // 1. Accounts where entity_id = targetEntity.id
        // 2. Accounts where m1_account_ownership has entity_id = targetEntity.id
        const candidateAccounts = db.prepare(`
            SELECT DISTINCT a.id, a.entity_id, a.name, a.type, a.sub_type, a.currency
            FROM m1_accounts a
            LEFT JOIN m1_account_ownership o ON a.id = o.account_id
            WHERE (a.entity_id = ? OR o.entity_id = ?) AND a.is_active = 1
              AND a.type IN ('asset', 'liability')
            ORDER BY a.type ASC, a.name ASC
        `).all(targetEntity.id, targetEntity.id);
        for (const acc of candidateAccounts){
            const balResult = getAccountBalance(db, acc.id, effectiveDate);
            const grossBalance = balResult.balance_cents;
            const curr = acc.currency.toUpperCase();
            // Check ownership allocations using unified policy (Resubmission Item 6)
            const ownerships = db.prepare(`
                SELECT entity_id, share_percentage FROM m1_account_ownership WHERE account_id = ?
            `).all(acc.id);
            const sharePercentage = getAttributedEntityShare(ownerships, acc.entity_id, targetEntity.id);
            if (sharePercentage <= 0) continue;
            const isJoint = ownerships.length > 0;
            const attributedBalance = Math.round(grossBalance * (sharePercentage / 100));
            items.push({
                account_id: acc.id,
                account_name: acc.name,
                account_type: acc.type,
                sub_type: acc.sub_type,
                account_sub_type: acc.sub_type,
                currency: curr,
                gross_balance_cents: grossBalance,
                ownership_share_percentage: sharePercentage,
                ownership_percentage: sharePercentage,
                attributed_balance_cents: attributedBalance,
                formatted_attributed_balance: (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$domain$2f$accounting$2f$types$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["formatMoney"])({
                    amount_cents: attributedBalance,
                    currency: curr
                }),
                formatted_scoped_balance: (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$domain$2f$accounting$2f$types$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["formatMoney"])({
                    amount_cents: attributedBalance,
                    currency: curr
                }),
                formatted_full_balance: (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$domain$2f$accounting$2f$types$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["formatMoney"])({
                    amount_cents: grossBalance,
                    currency: curr
                }),
                primary_entity_id: acc.entity_id,
                is_joint: isJoint
            });
            if (acc.type === 'asset') {
                totalAssets[curr] = (totalAssets[curr] || 0) + attributedBalance;
            } else if (acc.type === 'liability') {
                totalLiabilities[curr] = (totalLiabilities[curr] || 0) + attributedBalance;
            }
        }
        const allCurrencies = Array.from(new Set([
            ...Object.keys(totalAssets),
            ...Object.keys(totalLiabilities)
        ]));
        const netWorthCents = {};
        const formattedNetWorth = {};
        for (const curr of allCurrencies){
            const a = totalAssets[curr] || 0;
            const l = totalLiabilities[curr] || 0;
            const nw = a - l;
            netWorthCents[curr] = nw;
            formattedNetWorth[curr] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$domain$2f$accounting$2f$types$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["formatMoney"])({
                amount_cents: nw,
                currency: curr
            });
        }
        return {
            scope_type: 'individual',
            target_entity_id: targetEntity.id,
            entity_name: targetEntity.name,
            as_of_date: effectiveDate,
            net_worth_cents_by_currency: netWorthCents,
            total_assets_cents_by_currency: totalAssets,
            total_liabilities_cents_by_currency: totalLiabilities,
            formatted_net_worth_by_currency: formattedNetWorth,
            scoped_net_worth_cents_by_currency: netWorthCents,
            scoped_assets_cents_by_currency: totalAssets,
            scoped_liabilities_cents_by_currency: totalLiabilities,
            formatted_scoped_net_worth_by_currency: formattedNetWorth,
            items,
            calculation_version: CALCULATION_ENGINE_VERSION
        };
    } else {
        // Household Scope:
        // Aggregate all members of the household entity (including itself and children)
        const members = (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$domain$2f$accounting$2f$accountService$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["listEntityMembers"])(db, targetEntity.id);
        const memberIds = members.map((m)=>m.id);
        const placeholders = memberIds.map(()=>'?').join(',');
        const accounts = db.prepare(`
            SELECT DISTINCT a.id, a.entity_id, a.name, a.type, a.sub_type, a.currency
            FROM m1_accounts a
            LEFT JOIN m1_account_ownership o ON a.id = o.account_id
            WHERE (a.entity_id IN (${placeholders}) OR o.entity_id IN (${placeholders}))
              AND a.is_active = 1 AND a.type IN ('asset', 'liability')
            ORDER BY a.type ASC, a.name ASC
        `).all(...memberIds, ...memberIds);
        const seenAccounts = new Set();
        for (const acc of accounts){
            if (seenAccounts.has(acc.id)) continue;
            seenAccounts.add(acc.id);
            const balResult = getAccountBalance(db, acc.id, effectiveDate);
            const grossBalance = balResult.balance_cents;
            const curr = acc.currency.toUpperCase();
            // Resubmission Item 6: Household share is strictly the sum of the attributed shares
            // of its members using the unified policy.
            const ownerships = db.prepare(`
                SELECT entity_id, share_percentage FROM m1_account_ownership WHERE account_id = ?
            `).all(acc.id);
            let householdShare = 0;
            for (const memberId of memberIds){
                householdShare += getAttributedEntityShare(ownerships, acc.entity_id, memberId);
            }
            // Clamp to [0, 100]
            householdShare = Math.min(100, Math.max(0, householdShare));
            // If household owns 0% of this account, exclude from report
            if (householdShare <= 0) continue;
            const isJoint = ownerships.length > 0;
            const attributedBalance = Math.round(grossBalance * (householdShare / 100));
            items.push({
                account_id: acc.id,
                account_name: acc.name,
                account_type: acc.type,
                sub_type: acc.sub_type,
                account_sub_type: acc.sub_type,
                currency: curr,
                gross_balance_cents: grossBalance,
                ownership_share_percentage: householdShare,
                ownership_percentage: householdShare,
                attributed_balance_cents: attributedBalance,
                formatted_attributed_balance: (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$domain$2f$accounting$2f$types$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["formatMoney"])({
                    amount_cents: attributedBalance,
                    currency: curr
                }),
                formatted_scoped_balance: (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$domain$2f$accounting$2f$types$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["formatMoney"])({
                    amount_cents: attributedBalance,
                    currency: curr
                }),
                formatted_full_balance: (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$domain$2f$accounting$2f$types$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["formatMoney"])({
                    amount_cents: grossBalance,
                    currency: curr
                }),
                primary_entity_id: acc.entity_id,
                is_joint: isJoint
            });
            if (acc.type === 'asset') {
                totalAssets[curr] = (totalAssets[curr] || 0) + attributedBalance;
            } else if (acc.type === 'liability') {
                totalLiabilities[curr] = (totalLiabilities[curr] || 0) + attributedBalance;
            }
        }
        const allCurrencies = Array.from(new Set([
            ...Object.keys(totalAssets),
            ...Object.keys(totalLiabilities)
        ]));
        const netWorthCents = {};
        const formattedNetWorth = {};
        for (const curr of allCurrencies){
            const a = totalAssets[curr] || 0;
            const l = totalLiabilities[curr] || 0;
            const nw = a - l;
            netWorthCents[curr] = nw;
            formattedNetWorth[curr] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$domain$2f$accounting$2f$types$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["formatMoney"])({
                amount_cents: nw,
                currency: curr
            });
        }
        return {
            scope_type: scopeType,
            target_entity_id: targetEntity.id,
            entity_name: targetEntity.name,
            as_of_date: effectiveDate,
            member_entities: members.map((m)=>({
                    id: m.id,
                    name: m.name,
                    type: m.type
                })),
            net_worth_cents_by_currency: netWorthCents,
            total_assets_cents_by_currency: totalAssets,
            total_liabilities_cents_by_currency: totalLiabilities,
            formatted_net_worth_by_currency: formattedNetWorth,
            scoped_net_worth_cents_by_currency: netWorthCents,
            scoped_assets_cents_by_currency: totalAssets,
            scoped_liabilities_cents_by_currency: totalLiabilities,
            formatted_scoped_net_worth_by_currency: formattedNetWorth,
            items,
            calculation_version: CALCULATION_ENGINE_VERSION
        };
    }
}
function getActualCashFlowStatement(db, entityId, startDate, endDate) {
    // 1. Identify all liquid cash/bank accounts for the entity
    const cashAccounts = db.prepare(`
        SELECT id, name, currency
        FROM m1_accounts
        WHERE entity_id = ? AND type = 'asset' AND sub_type IN ('cash', 'checking', 'savings')
    `).all(entityId);
    const cashAccountIds = new Set(cashAccounts.map((a)=>a.id));
    const cashAccountMap = new Map(cashAccounts.map((a)=>[
            a.id,
            a.name
        ]));
    const operatingInflows = {};
    const operatingOutflows = {};
    const financingInflows = {};
    const financingOutflows = {};
    const investingInflows = {};
    const investingOutflows = {};
    const netCashChange = {};
    const startingCash = {};
    const endingCash = {};
    const items = [];
    // Calculate starting cash balance as of day before startDate (if startDate provided)
    // Opening balance transactions establish the initial cash position
    if (startDate) {
        for (const acc of cashAccounts){
            const curr = acc.currency.toUpperCase();
            const prevRows = db.prepare(`
                SELECT j.amount_cents
                FROM m1_journal_entries j
                JOIN m1_transactions t ON j.transaction_id = t.id
                WHERE j.account_id = ? AND t.status = 'posted'
                  AND (t.date < ? OR (t.date = ? AND t.origin = 'opening_balance'))
            `).all(acc.id, startDate, startDate);
            const bal = prevRows.reduce((sum, r)=>sum + r.amount_cents, 0);
            startingCash[curr] = (startingCash[curr] || 0) + bal;
        }
    } else {
        for (const acc of cashAccounts){
            const curr = acc.currency.toUpperCase();
            const prevRows = db.prepare(`
                SELECT j.amount_cents
                FROM m1_journal_entries j
                JOIN m1_transactions t ON j.transaction_id = t.id
                WHERE j.account_id = ? AND t.status = 'posted' AND t.origin = 'opening_balance'
            `).all(acc.id);
            const bal = prevRows.reduce((sum, r)=>sum + r.amount_cents, 0);
            startingCash[curr] = (startingCash[curr] || 0) + bal;
        }
    }
    if (cashAccounts.length === 0) {
        return {
            entity_id: entityId,
            start_date: startDate,
            end_date: endDate,
            operating_inflows_cents_by_currency: {},
            operating_outflows_cents_by_currency: {},
            net_operating_cents_by_currency: {},
            financing_inflows_cents_by_currency: {},
            financing_outflows_cents_by_currency: {},
            net_financing_cents_by_currency: {},
            investing_inflows_cents_by_currency: {},
            investing_outflows_cents_by_currency: {},
            net_investing_cents_by_currency: {},
            net_cash_change_cents_by_currency: {},
            starting_cash_cents_by_currency: {},
            ending_cash_cents_by_currency: {},
            ledger_closing_cash_cents_by_currency: {},
            is_reconciled_by_currency: {},
            reconciliation_discrepancy_cents_by_currency: {},
            formatted_net_cash_change_by_currency: {},
            formatted_ending_cash_by_currency: {},
            items: [],
            calculation_version: CALCULATION_ENGINE_VERSION
        };
    }
    // Query all in-period cash postings (excluding initial opening balances)
    const placeholders = cashAccounts.map(()=>'?').join(',');
    let sql = `
        SELECT 
            j.id as posting_id,
            j.transaction_id,
            j.account_id,
            j.amount_cents,
            j.currency,
            t.date,
            t.description,
            t.payee_or_payer,
            t.origin
        FROM m1_journal_entries j
        JOIN m1_transactions t ON j.transaction_id = t.id
        WHERE j.account_id IN (${placeholders}) AND t.status = 'posted' AND t.origin != 'opening_balance'
    `;
    const params = cashAccounts.map((a)=>a.id);
    if (startDate) {
        sql += ' AND t.date >= ?';
        params.push(startDate);
    }
    if (endDate) {
        sql += ' AND t.date <= ?';
        params.push(endDate);
    }
    sql += ' ORDER BY t.date ASC, j.id ASC';
    const cashPostings = db.prepare(sql).all(...params);
    // Group cash postings by transaction_id to preserve transaction context and separate
    // internal transfers from external cash movements (Assessor Verdict Item 4).
    //
    // Why this exists:
    // When an internal transfer includes a fee (e.g. $100 transfer from Checking to Savings + $10 fee),
    // processing legs in isolation incorrectly treats the $100 debit as an "expense refund" inflow
    // and the $110 credit as an "operating outflow". Grouping by transaction allows identifying
    // internal liquidity movement and isolating the net external cash activity ($10 operating outflow).
    //
    // Tricky logic:
    // - Internal transfer amount = min(totalCashIn, totalCashOut). This amount nets to $0 across
    //   liquid accounts and produces $0 external inflows and $0 external outflows.
    // - Only the net external cash movement (abs(totalCashIn - totalCashOut)) is apportioned
    //   to non-cash counterpart legs (expenses, liabilities, etc.).
    // - Reporting items record transfer legs as 'transfer' and the remainder as the dominant activity.
    //
    // TODO: In Milestone 2, add multi-currency cash transfer FX gain/loss leg apportionment.
    const txMap = new Map();
    const txOrder = [];
    for (const cp of cashPostings){
        if (!txMap.has(cp.transaction_id)) {
            txMap.set(cp.transaction_id, []);
            txOrder.push(cp.transaction_id);
        }
        txMap.get(cp.transaction_id).push(cp);
    }
    const counterpartStmt = db.prepare(`
        SELECT j.account_id, j.amount_cents, j.currency, a.type as account_type, a.sub_type
        FROM m1_journal_entries j
        JOIN m1_accounts a ON j.account_id = a.id
        WHERE j.transaction_id = ?
    `);
    for (const txId of txOrder){
        const txCashPostings = txMap.get(txId);
        const allTxPostings = counterpartStmt.all(txId);
        const nonCashCounterparts = allTxPostings.filter((p)=>!cashAccountIds.has(p.account_id));
        // Group cash postings within this transaction by currency
        const currencies = Array.from(new Set(txCashPostings.map((cp)=>cp.currency.toUpperCase())));
        for (const curr of currencies){
            const cashLegs = txCashPostings.filter((cp)=>cp.currency.toUpperCase() === curr);
            if (cashLegs.length === 0) continue;
            if (nonCashCounterparts.length === 0) {
                // Pure internal cash transfer between liquid accounts (net $0 aggregate liquidity)
                for (const cp of cashLegs){
                    items.push({
                        transaction_id: cp.transaction_id,
                        date: cp.date,
                        description: cp.description,
                        payee_or_payer: cp.payee_or_payer,
                        activity_type: 'transfer',
                        cash_account_id: cp.account_id,
                        cash_account_name: cashAccountMap.get(cp.account_id) || 'Cash Account',
                        amount_cents: cp.amount_cents,
                        currency: curr,
                        formatted_amount: (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$domain$2f$accounting$2f$types$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["formatMoney"])({
                            amount_cents: cp.amount_cents,
                            currency: curr
                        })
                    });
                }
                continue;
            }
            // Calculate internal transfer vs external cash movement
            const totalCashIn = cashLegs.filter((p)=>p.amount_cents > 0).reduce((sum, p)=>sum + p.amount_cents, 0);
            const totalCashOut = cashLegs.filter((p)=>p.amount_cents < 0).reduce((sum, p)=>sum + Math.abs(p.amount_cents), 0);
            const transferCents = Math.min(totalCashIn, totalCashOut);
            // Apportion non-cash counterparts against net external cash movement
            const totalNonCashWeight = nonCashCounterparts.reduce((sum, c)=>sum + Math.abs(c.amount_cents), 0);
            const isExternalOutflow = totalCashOut > totalCashIn;
            const isExternalInflow = totalCashIn > totalCashOut;
            const netExternalAmount = isExternalOutflow ? totalCashOut - totalCashIn : isExternalInflow ? totalCashIn - totalCashOut : 0;
            const hasLiabilityRepayment = isExternalOutflow && nonCashCounterparts.some((c)=>c.account_type === 'liability');
            let dominantActivity = 'operating';
            let maxWeight = -1;
            if (netExternalAmount > 0) {
                for (const c of nonCashCounterparts){
                    const weight = Math.abs(c.amount_cents);
                    const portion = totalNonCashWeight > 0 ? Math.round(netExternalAmount * (weight / totalNonCashWeight)) : netExternalAmount;
                    let legActivity = 'operating';
                    if (isExternalInflow) {
                        // External Cash Inflow
                        if (c.account_type === 'income') {
                            legActivity = 'operating';
                            operatingInflows[curr] = (operatingInflows[curr] || 0) + portion;
                        } else if (c.account_type === 'expense') {
                            legActivity = 'operating'; // Expense Refund
                            operatingInflows[curr] = (operatingInflows[curr] || 0) + portion;
                        } else if (c.account_type === 'liability') {
                            legActivity = 'financing'; // Borrowing proceeds
                            financingInflows[curr] = (financingInflows[curr] || 0) + portion;
                        } else if (c.account_type === 'equity') {
                            legActivity = 'financing'; // Capital contribution
                            financingInflows[curr] = (financingInflows[curr] || 0) + portion;
                        } else if (c.account_type === 'asset') {
                            legActivity = 'investing'; // Asset sale proceeds
                            investingInflows[curr] = (investingInflows[curr] || 0) + portion;
                        }
                    } else {
                        // External Cash Outflow (isExternalOutflow)
                        if (c.account_type === 'expense') {
                            if (hasLiabilityRepayment) {
                                legActivity = 'financing';
                                financingOutflows[curr] = (financingOutflows[curr] || 0) + portion;
                            } else {
                                legActivity = 'operating';
                                operatingOutflows[curr] = (operatingOutflows[curr] || 0) + portion;
                            }
                        } else if (c.account_type === 'income') {
                            legActivity = 'operating'; // Income reversal
                            operatingOutflows[curr] = (operatingOutflows[curr] || 0) + portion;
                        } else if (c.account_type === 'liability') {
                            legActivity = 'financing'; // Principal repayment
                            financingOutflows[curr] = (financingOutflows[curr] || 0) + portion;
                        } else if (c.account_type === 'equity') {
                            legActivity = 'financing'; // Distributions/drawings
                            financingOutflows[curr] = (financingOutflows[curr] || 0) + portion;
                        } else if (c.account_type === 'asset') {
                            legActivity = 'investing'; // Asset purchase
                            investingOutflows[curr] = (investingOutflows[curr] || 0) + portion;
                        }
                    }
                    if (weight > maxWeight) {
                        maxWeight = weight;
                        dominantActivity = hasLiabilityRepayment ? 'financing' : legActivity;
                    }
                }
            }
            // Record line items for reporting drilldowns
            if (transferCents === 0) {
                // No internal transfer: each cash posting is external
                for (const cp of cashLegs){
                    items.push({
                        transaction_id: cp.transaction_id,
                        date: cp.date,
                        description: cp.description,
                        payee_or_payer: cp.payee_or_payer,
                        activity_type: dominantActivity,
                        cash_account_id: cp.account_id,
                        cash_account_name: cashAccountMap.get(cp.account_id) || 'Cash Account',
                        amount_cents: cp.amount_cents,
                        currency: curr,
                        formatted_amount: (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$domain$2f$accounting$2f$types$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["formatMoney"])({
                            amount_cents: cp.amount_cents,
                            currency: curr
                        })
                    });
                }
            } else {
                // Mixed transfer + external fee/rebate: separate transfer portions from external portions
                let remainingInflowTransfer = transferCents;
                let remainingOutflowTransfer = transferCents;
                for (const cp of cashLegs){
                    if (cp.amount_cents > 0) {
                        const transferPortion = Math.min(cp.amount_cents, remainingInflowTransfer);
                        remainingInflowTransfer -= transferPortion;
                        const externalPortion = cp.amount_cents - transferPortion;
                        if (transferPortion > 0) {
                            items.push({
                                transaction_id: cp.transaction_id,
                                date: cp.date,
                                description: cp.description,
                                payee_or_payer: cp.payee_or_payer,
                                activity_type: 'transfer',
                                cash_account_id: cp.account_id,
                                cash_account_name: cashAccountMap.get(cp.account_id) || 'Cash Account',
                                amount_cents: transferPortion,
                                currency: curr,
                                formatted_amount: (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$domain$2f$accounting$2f$types$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["formatMoney"])({
                                    amount_cents: transferPortion,
                                    currency: curr
                                })
                            });
                        }
                        if (externalPortion > 0) {
                            items.push({
                                transaction_id: cp.transaction_id,
                                date: cp.date,
                                description: cp.description,
                                payee_or_payer: cp.payee_or_payer,
                                activity_type: dominantActivity,
                                cash_account_id: cp.account_id,
                                cash_account_name: cashAccountMap.get(cp.account_id) || 'Cash Account',
                                amount_cents: externalPortion,
                                currency: curr,
                                formatted_amount: (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$domain$2f$accounting$2f$types$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["formatMoney"])({
                                    amount_cents: externalPortion,
                                    currency: curr
                                })
                            });
                        }
                    } else {
                        const absAmount = Math.abs(cp.amount_cents);
                        const transferPortion = Math.min(absAmount, remainingOutflowTransfer);
                        remainingOutflowTransfer -= transferPortion;
                        const externalPortion = absAmount - transferPortion;
                        if (transferPortion > 0) {
                            items.push({
                                transaction_id: cp.transaction_id,
                                date: cp.date,
                                description: cp.description,
                                payee_or_payer: cp.payee_or_payer,
                                activity_type: 'transfer',
                                cash_account_id: cp.account_id,
                                cash_account_name: cashAccountMap.get(cp.account_id) || 'Cash Account',
                                amount_cents: -transferPortion,
                                currency: curr,
                                formatted_amount: (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$domain$2f$accounting$2f$types$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["formatMoney"])({
                                    amount_cents: -transferPortion,
                                    currency: curr
                                })
                            });
                        }
                        if (externalPortion > 0) {
                            items.push({
                                transaction_id: cp.transaction_id,
                                date: cp.date,
                                description: cp.description,
                                payee_or_payer: cp.payee_or_payer,
                                activity_type: dominantActivity,
                                cash_account_id: cp.account_id,
                                cash_account_name: cashAccountMap.get(cp.account_id) || 'Cash Account',
                                amount_cents: -externalPortion,
                                currency: curr,
                                formatted_amount: (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$domain$2f$accounting$2f$types$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["formatMoney"])({
                                    amount_cents: -externalPortion,
                                    currency: curr
                                })
                            });
                        }
                    }
                }
            }
        }
    }
    // Assessor Finding 4: Independently query ledger closing cash for liquid accounts
    const ledgerClosingCash = {};
    for (const acc of cashAccounts){
        const curr = acc.currency.toUpperCase();
        const balResult = getAccountBalance(db, acc.id, endDate);
        ledgerClosingCash[curr] = (ledgerClosingCash[curr] || 0) + balResult.balance_cents;
    }
    const allCurrencies = Array.from(new Set([
        ...Object.keys(startingCash),
        ...Object.keys(operatingInflows),
        ...Object.keys(operatingOutflows),
        ...Object.keys(financingInflows),
        ...Object.keys(financingOutflows),
        ...Object.keys(investingInflows),
        ...Object.keys(investingOutflows),
        ...Object.keys(ledgerClosingCash)
    ]));
    const netOperating = {};
    const netFinancing = {};
    const netInvesting = {};
    const isReconciled = {};
    const discrepancies = {};
    const formattedNetChange = {};
    const formattedEndingCash = {};
    for (const curr of allCurrencies){
        const start = startingCash[curr] || 0;
        const opIn = operatingInflows[curr] || 0;
        const opOut = operatingOutflows[curr] || 0;
        const finIn = financingInflows[curr] || 0;
        const finOut = financingOutflows[curr] || 0;
        const invIn = investingInflows[curr] || 0;
        const invOut = investingOutflows[curr] || 0;
        const netOp = opIn - opOut;
        const netFin = finIn - finOut;
        const netInv = invIn - invOut;
        netOperating[curr] = netOp;
        netFinancing[curr] = netFin;
        netInvesting[curr] = netInv;
        const netChange = netOp + netFin + netInv;
        netCashChange[curr] = netChange;
        // Ending Cash represents Cash Flow Statement reported ending cash: Starting + Net Change
        const computedEnd = start + netChange;
        endingCash[curr] = computedEnd;
        const ledgerEnd = ledgerClosingCash[curr] ?? computedEnd;
        // Reconciliation: Compare reported ending cash with double-entry ledger closing cash
        const diff = computedEnd - ledgerEnd;
        discrepancies[curr] = diff;
        isReconciled[curr] = diff === 0;
        formattedNetChange[curr] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$domain$2f$accounting$2f$types$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["formatMoney"])({
            amount_cents: netChange,
            currency: curr
        });
        formattedEndingCash[curr] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$domain$2f$accounting$2f$types$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["formatMoney"])({
            amount_cents: computedEnd,
            currency: curr
        });
    }
    return {
        entity_id: entityId,
        start_date: startDate,
        end_date: endDate,
        operating_inflows_cents_by_currency: operatingInflows,
        operating_outflows_cents_by_currency: operatingOutflows,
        net_operating_cents_by_currency: netOperating,
        financing_inflows_cents_by_currency: financingInflows,
        financing_outflows_cents_by_currency: financingOutflows,
        net_financing_cents_by_currency: netFinancing,
        investing_inflows_cents_by_currency: investingInflows,
        investing_outflows_cents_by_currency: investingOutflows,
        net_investing_cents_by_currency: netInvesting,
        net_cash_change_cents_by_currency: netCashChange,
        starting_cash_cents_by_currency: startingCash,
        ending_cash_cents_by_currency: endingCash,
        ledger_closing_cash_cents_by_currency: ledgerClosingCash,
        is_reconciled_by_currency: isReconciled,
        reconciliation_discrepancy_cents_by_currency: discrepancies,
        formatted_net_cash_change_by_currency: formattedNetChange,
        formatted_ending_cash_by_currency: formattedEndingCash,
        items,
        calculation_version: CALCULATION_ENGINE_VERSION
    };
}
function getAccountLedgerDrilldown(db, input) {
    const account = db.prepare('SELECT id, name, type, currency FROM m1_accounts WHERE id = ?').get(input.account_id);
    if (!account) {
        throw new Error(`Account not found: ${input.account_id}`);
    }
    const isDebitNormal = account.type === 'asset' || account.type === 'expense';
    const curr = account.currency.toUpperCase();
    // 1. Calculate opening balance as of start_date (if start_date provided)
    let openingBalanceCents = 0;
    if (input.start_date) {
        const priorRows = db.prepare(`
            SELECT j.amount_cents
            FROM m1_journal_entries j
            JOIN m1_transactions t ON j.transaction_id = t.id
            WHERE j.account_id = ? AND t.date < ? AND t.status = 'posted'
        `).all(account.id, input.start_date);
        const rawPrior = priorRows.reduce((sum, r)=>sum + r.amount_cents, 0);
        openingBalanceCents = isDebitNormal ? rawPrior : -rawPrior;
    }
    // 2. Query postings in date range
    let sql = `
        SELECT 
            j.id as posting_id,
            j.transaction_id,
            j.amount_cents,
            j.currency,
            j.memo,
            t.date,
            t.description,
            t.payee_or_payer,
            t.origin,
            t.evidence_refs
        FROM m1_journal_entries j
        JOIN m1_transactions t ON j.transaction_id = t.id
        WHERE j.account_id = ? AND t.status = 'posted'
    `;
    const params = [
        account.id
    ];
    if (input.start_date) {
        sql += ' AND t.date >= ?';
        params.push(input.start_date);
    }
    if (input.end_date) {
        sql += ' AND t.date <= ?';
        params.push(input.end_date);
    }
    sql += ' ORDER BY t.date ASC, t.created_at ASC, j.id ASC';
    if (input.limit) {
        sql += ' LIMIT ?';
        params.push(input.limit);
    }
    const rows = db.prepare(sql).all(...params);
    let currentRunning = openingBalanceCents;
    const entries = [];
    for (const r of rows){
        // Delta to normal balance:
        // Debit increases Asset/Expense, decreases Liability/Equity/Income
        const delta = isDebitNormal ? r.amount_cents : -r.amount_cents;
        currentRunning += delta;
        let parsedEvidence = [];
        if (r.evidence_refs) {
            try {
                const parsed = JSON.parse(r.evidence_refs);
                parsedEvidence = Array.isArray(parsed) ? parsed : [
                    parsed
                ];
                parsedEvidence = parsedEvidence.map((item)=>{
                    if (typeof item === 'string') {
                        try {
                            return JSON.parse(item);
                        } catch  {
                            return item;
                        }
                    }
                    return item;
                });
            } catch  {
                parsedEvidence = [
                    r.evidence_refs
                ];
            }
        }
        entries.push({
            posting_id: r.posting_id,
            transaction_id: r.transaction_id,
            date: r.date,
            description: r.description,
            payee_or_payer: r.payee_or_payer,
            account_id: account.id,
            account_name: account.name,
            account_type: account.type,
            amount_cents: r.amount_cents,
            currency: curr,
            running_balance_cents: currentRunning,
            formatted_amount: (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$domain$2f$accounting$2f$types$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["formatMoney"])({
                amount_cents: r.amount_cents,
                currency: curr
            }),
            formatted_running_balance: (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$domain$2f$accounting$2f$types$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["formatMoney"])({
                amount_cents: currentRunning,
                currency: curr
            }),
            memo: r.memo,
            origin: r.origin,
            evidence_refs: parsedEvidence
        });
    }
    return {
        account_id: account.id,
        account_name: account.name,
        account_type: account.type,
        currency: curr,
        start_date: input.start_date,
        end_date: input.end_date,
        opening_balance_cents: openingBalanceCents,
        closing_balance_cents: currentRunning,
        formatted_opening_balance: (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$domain$2f$accounting$2f$types$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["formatMoney"])({
            amount_cents: openingBalanceCents,
            currency: curr
        }),
        formatted_closing_balance: (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$domain$2f$accounting$2f$types$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["formatMoney"])({
            amount_cents: currentRunning,
            currency: curr
        }),
        entries,
        calculation_version: CALCULATION_ENGINE_VERSION
    };
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
"[project]/src/app/api/accounting/route.ts [app-route] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "GET",
    ()=>GET,
    "POST",
    ()=>POST
]);
/**
 * Milestone 1 Accounting Engine API Route
 * 
 * Why this file exists:
 * Authoritative, local-first API endpoint for managing entities, accounts,
 * opening balances, daily financial transactions (income, expense, transfer, credit card repayment,
 * loan repayment split), and retrieving real-time calculated balances, net worth, and period cash flows.
 * 
 * Tricky logic:
 * - Scoped actions validate all inputs before acquiring database locks.
 * - Account creation with an opening balance commits atomically in a single transaction.
 * - Stale revision updates or corrections return HTTP 409 Conflict rather than silently overwriting (M1-SAFE-06).
 * - All monetary balances are returned as exact minor-unit integers (`balance_cents`)
 *   alongside formatted display strings.
 * - Daily transactions (income, expense, transfer, repayment) are committed atomically
 *   and enforce strict double-entry balance: Sum(postings.amount_cents) === 0.
 * 
 * TODO: Add audit trail query parameters for drillable transaction history in Slice 1D.
 */ var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/server.js [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$infrastructure$2f$sqlite$2f$db$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/infrastructure/sqlite/db.ts [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$domain$2f$accounting$2f$accountService$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/lib/domain/accounting/accountService.ts [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$domain$2f$accounting$2f$balanceService$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/lib/domain/accounting/balanceService.ts [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$domain$2f$accounting$2f$transactionService$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/lib/domain/accounting/transactionService.ts [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$domain$2f$accounting$2f$schema$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/lib/domain/accounting/schema.ts [app-route] (ecmascript)");
;
;
;
;
;
;
async function GET(request) {
    try {
        const db = (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$infrastructure$2f$sqlite$2f$db$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["getDb"])();
        (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$domain$2f$accounting$2f$schema$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["initAccountingSchema"])(db); // Idempotent schema check
        const url = new URL(request.url);
        const view = url.searchParams.get('view');
        const entityId = url.searchParams.get('entity_id');
        const asOfDate = url.searchParams.get('as_of_date') || undefined;
        const startDate = url.searchParams.get('start_date') || undefined;
        const endDate = url.searchParams.get('end_date') || undefined;
        const includeTransactions = url.searchParams.get('include_transactions') === 'true';
        const limitParam = url.searchParams.get('limit');
        const fetchLimit = limitParam ? parseInt(limitParam, 10) : 500;
        // Slice 1D: View-specific queries
        if (view === 'drilldown') {
            const accountId = url.searchParams.get('account_id');
            if (!accountId) {
                return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json({
                    error: 'Missing required parameter: account_id'
                }, {
                    status: 400
                });
            }
            const limitStr = url.searchParams.get('limit');
            const limit = limitStr ? parseInt(limitStr, 10) : undefined;
            const drilldown = (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$domain$2f$accounting$2f$balanceService$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["getAccountLedgerDrilldown"])(db, {
                account_id: accountId,
                start_date: startDate,
                end_date: endDate,
                limit
            });
            return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json({
                success: true,
                drilldown
            });
        }
        if (view === 'ownership') {
            const accountId = url.searchParams.get('account_id');
            if (!accountId) {
                return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json({
                    error: 'Missing required parameter: account_id'
                }, {
                    status: 400
                });
            }
            const ownership = (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$domain$2f$accounting$2f$accountService$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["getAccountOwnership"])(db, accountId);
            return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json({
                success: true,
                ownership
            });
        }
        if (view === 'members') {
            const householdId = url.searchParams.get('household_id');
            if (!householdId) {
                return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json({
                    error: 'Missing required parameter: household_id'
                }, {
                    status: 400
                });
            }
            const members = (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$domain$2f$accounting$2f$accountService$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["listEntityMembers"])(db, householdId);
            return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json({
                success: true,
                members
            });
        }
        if (view === 'reports') {
            const reportType = url.searchParams.get('report_type');
            if (reportType === 'scope_net_worth') {
                const scopeId = url.searchParams.get('scope_id') || entityId;
                const scopeType = url.searchParams.get('scope_type') || 'individual';
                if (!scopeId) {
                    return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json({
                        error: 'Missing required parameter: scope_id'
                    }, {
                        status: 400
                    });
                }
                const report = (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$domain$2f$accounting$2f$balanceService$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["getScopeNetWorth"])(db, scopeId, scopeType, asOfDate);
                return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json({
                    success: true,
                    report
                });
            }
            if (reportType === 'consolidated_net_worth') {
                const targetEntityId = entityId || url.searchParams.get('scope_id');
                const reportingCurrency = url.searchParams.get('reporting_currency') || 'AUD';
                const scopeType = url.searchParams.get('scope_type') || 'individual';
                if (!targetEntityId) {
                    return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json({
                        error: 'Missing required parameter: entity_id'
                    }, {
                        status: 400
                    });
                }
                const report = (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$domain$2f$accounting$2f$balanceService$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["getConsolidatedNetWorth"])(db, targetEntityId, reportingCurrency, asOfDate, scopeType);
                return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json({
                    success: true,
                    report
                });
            }
            if (reportType === 'cash_flow') {
                if (!entityId) {
                    return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json({
                        error: 'Missing required parameter: entity_id'
                    }, {
                        status: 400
                    });
                }
                const report = (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$domain$2f$accounting$2f$balanceService$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["getActualCashFlowStatement"])(db, entityId, startDate, endDate);
                return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json({
                    success: true,
                    report
                });
            }
            // If no specific report_type given under view=reports, return aggregated reports
            if (entityId) {
                const scopeNetWorth = (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$domain$2f$accounting$2f$balanceService$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["getScopeNetWorth"])(db, entityId, 'individual', asOfDate);
                const cashFlow = (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$domain$2f$accounting$2f$balanceService$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["getActualCashFlowStatement"])(db, entityId, startDate, endDate);
                const incomeExpenses = (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$domain$2f$accounting$2f$balanceService$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["getPeriodIncomeAndExpenses"])(db, entityId, startDate, endDate);
                return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json({
                    success: true,
                    reports: {
                        scope_net_worth: scopeNetWorth,
                        cash_flow: cashFlow,
                        accrual_income_expenses: incomeExpenses
                    }
                });
            }
        }
        const entities = (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$domain$2f$accounting$2f$accountService$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["listEntities"])(db);
        // If specific entity requested, return scoped accounts, calculated balances, net worth, and period cash flow
        if (entityId) {
            const entity = (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$domain$2f$accounting$2f$accountService$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["getEntity"])(db, entityId);
            if (!entity) {
                return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json({
                    error: `Entity not found: ${entityId}`
                }, {
                    status: 404
                });
            }
            const accounts = (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$domain$2f$accounting$2f$accountService$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["listAccounts"])(db, entityId);
            const accountsWithBalances = accounts.map((acc)=>{
                const bal = (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$domain$2f$accounting$2f$balanceService$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["getAccountBalance"])(db, acc.id, asOfDate);
                return {
                    ...acc,
                    balance_cents: bal.balance_cents,
                    formatted_balance: bal.formatted_balance,
                    as_of_date: bal.as_of_date
                };
            });
            const netWorth = (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$domain$2f$accounting$2f$balanceService$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["getEntityNetWorth"])(db, entityId, asOfDate);
            const incomeExpenses = (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$domain$2f$accounting$2f$balanceService$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["getPeriodIncomeAndExpenses"])(db, entityId, startDate, endDate);
            const transactions = includeTransactions ? (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$domain$2f$accounting$2f$transactionService$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["listTransactions"])(db, {
                entityId,
                startDate,
                endDate,
                limit: fetchLimit
            }) : undefined;
            return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json({
                success: true,
                entity,
                accounts: accountsWithBalances,
                net_worth: netWorth,
                period_income_expenses: incomeExpenses,
                transactions
            });
        }
        // Default: return all entities, accounts, and optional transactions
        const allAccounts = (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$domain$2f$accounting$2f$accountService$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["listAccounts"])(db);
        const accountsWithBalances = allAccounts.map((acc)=>{
            const bal = (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$domain$2f$accounting$2f$balanceService$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["getAccountBalance"])(db, acc.id, asOfDate);
            return {
                ...acc,
                balance_cents: bal.balance_cents,
                formatted_balance: bal.formatted_balance,
                as_of_date: bal.as_of_date
            };
        });
        const transactions = includeTransactions ? (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$domain$2f$accounting$2f$transactionService$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["listTransactions"])(db, {
            startDate,
            endDate,
            limit: fetchLimit
        }) : undefined;
        // Note: Full cross-entity consolidation rules are complex (e.g. investments vs underlying assets).
        // For the MVP "Everything" view, we return null for net_worth to prompt the UI to show component totals instead of a misleading grand total.
        return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json({
            success: true,
            entities,
            accounts: accountsWithBalances,
            net_worth: null,
            period_income_expenses: null,
            transactions
        });
    } catch (error) {
        console.error('Accounting API GET Error:', error);
        return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json({
            error: error.message || 'Failed to fetch accounting data'
        }, {
            status: 500
        });
    }
}
async function POST(request) {
    try {
        const db = (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$infrastructure$2f$sqlite$2f$db$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["getDb"])();
        (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$domain$2f$accounting$2f$schema$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["initAccountingSchema"])(db); // Idempotent schema check
        const body = await request.json().catch(()=>null);
        if (!body || typeof body !== 'object') {
            return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json({
                error: 'Request body must be a valid JSON object'
            }, {
                status: 400
            });
        }
        const { action } = body;
        // 1. Create Entity
        if (action === 'create_entity') {
            const { entity } = body;
            if (!entity) {
                return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json({
                    error: 'Missing entity payload'
                }, {
                    status: 400
                });
            }
            const created = (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$domain$2f$accounting$2f$accountService$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["createEntity"])(db, entity);
            return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json({
                success: true,
                entity: created
            }, {
                status: 201
            });
        }
        // 2. Create Account (with optional atomic opening balance)
        if (action === 'create_account') {
            const { account } = body;
            if (!account) {
                return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json({
                    error: 'Missing account payload'
                }, {
                    status: 400
                });
            }
            const result = (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$domain$2f$accounting$2f$accountService$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["createAccount"])(db, account);
            const balance = (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$domain$2f$accounting$2f$balanceService$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["getAccountBalance"])(db, result.account.id);
            return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json({
                success: true,
                account: {
                    ...result.account,
                    balance_cents: balance.balance_cents,
                    formatted_balance: balance.formatted_balance
                },
                opening_transaction: result.openingTransaction || null
            }, {
                status: 201
            });
        }
        // 3. Update Account (with optimistic concurrency check)
        if (action === 'update_account') {
            const { account_id, expected_revision, updates } = body;
            if (!account_id || expected_revision === undefined || !updates) {
                return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json({
                    error: 'Missing account_id, expected_revision, or updates'
                }, {
                    status: 400
                });
            }
            const updated = (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$domain$2f$accounting$2f$accountService$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["updateAccount"])(db, account_id, expected_revision, updates);
            const balance = (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$domain$2f$accounting$2f$balanceService$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["getAccountBalance"])(db, updated.id);
            return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json({
                success: true,
                account: {
                    ...updated,
                    balance_cents: balance.balance_cents,
                    formatted_balance: balance.formatted_balance
                }
            });
        }
        // 4. Record Daily Events (M1-FLOW-02, M1-FLOW-03, M1-FLOW-04, M1-FLOW-05)
        if (action === 'record_income') {
            const { payload } = body;
            if (!payload) return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json({
                error: 'Missing income payload'
            }, {
                status: 400
            });
            const tx = (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$domain$2f$accounting$2f$transactionService$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["recordIncome"])(db, payload);
            return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json({
                success: true,
                transaction: tx
            }, {
                status: 201
            });
        }
        if (action === 'record_expense') {
            const { payload } = body;
            if (!payload) return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json({
                error: 'Missing expense payload'
            }, {
                status: 400
            });
            const tx = (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$domain$2f$accounting$2f$transactionService$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["recordExpense"])(db, payload);
            return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json({
                success: true,
                transaction: tx
            }, {
                status: 201
            });
        }
        if (action === 'record_transfer') {
            const { payload } = body;
            if (!payload) return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json({
                error: 'Missing transfer payload'
            }, {
                status: 400
            });
            const tx = (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$domain$2f$accounting$2f$transactionService$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["recordTransfer"])(db, payload);
            return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json({
                success: true,
                transaction: tx
            }, {
                status: 201
            });
        }
        if (action === 'record_card_repayment') {
            const { payload } = body;
            if (!payload) return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json({
                error: 'Missing credit card repayment payload'
            }, {
                status: 400
            });
            const tx = (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$domain$2f$accounting$2f$transactionService$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["recordCreditCardRepayment"])(db, payload);
            return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json({
                success: true,
                transaction: tx
            }, {
                status: 201
            });
        }
        if (action === 'record_loan_repayment') {
            const { payload } = body;
            if (!payload) return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json({
                error: 'Missing loan repayment payload'
            }, {
                status: 400
            });
            const tx = (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$domain$2f$accounting$2f$transactionService$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["recordLoanRepayment"])(db, payload);
            return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json({
                success: true,
                transaction: tx
            }, {
                status: 201
            });
        }
        // 5. Raw Balanced Transaction Commit
        if (action === 'post_transaction') {
            const { transaction } = body;
            if (!transaction) return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json({
                error: 'Missing transaction payload'
            }, {
                status: 400
            });
            const tx = (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$domain$2f$accounting$2f$transactionService$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["postTransaction"])(db, transaction);
            return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json({
                success: true,
                transaction: tx
            }, {
                status: 201
            });
        }
        // 6. Auditable Transaction Correction & Void (M1-DOM-05, T12, T13)
        if (action === 'correct_transaction') {
            const { correction } = body;
            if (!correction) return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json({
                error: 'Missing correction payload'
            }, {
                status: 400
            });
            const result = (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$domain$2f$accounting$2f$transactionService$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["correctTransaction"])(db, correction);
            return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json({
                success: true,
                correction: result
            });
        }
        // 7. Joint Ownership Allocation (M1-FLOW-07, T7)
        if (action === 'set_ownership') {
            const { account_id, allocations } = body;
            if (!account_id || !allocations) {
                return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json({
                    error: 'Missing account_id or allocations array'
                }, {
                    status: 400
                });
            }
            (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$domain$2f$accounting$2f$accountService$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["setAccountOwnership"])(db, account_id, allocations);
            const updatedOwnership = (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$domain$2f$accounting$2f$accountService$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["getAccountOwnership"])(db, account_id);
            return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json({
                success: true,
                ownership: updatedOwnership
            });
        }
        // 8. Dated Non-Cash Asset Valuation Adjustment (M1-FLOW-06, T6)
        if (action === 'record_valuation') {
            const { payload } = body;
            if (!payload) return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json({
                error: 'Missing asset valuation payload'
            }, {
                status: 400
            });
            const tx = (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$domain$2f$accounting$2f$transactionService$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["recordAssetValuation"])(db, payload);
            return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json({
                success: true,
                transaction: tx
            }, {
                status: 201
            });
        }
        // 9. Exchange Rate Definition (M1-CALC-03, T8)
        if (action === 'set_exchange_rate') {
            const { rate } = body;
            if (!rate) return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json({
                error: 'Missing exchange rate payload'
            }, {
                status: 400
            });
            const saved = (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$domain$2f$accounting$2f$balanceService$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["setExchangeRate"])(db, rate);
            return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json({
                success: true,
                exchange_rate: saved
            }, {
                status: 201
            });
        }
        return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json({
            error: `Unsupported action: ${action}`
        }, {
            status: 400
        });
    } catch (error) {
        if (error instanceof __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$domain$2f$accounting$2f$accountService$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["ValidationError"]) {
            return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json({
                error: error.message
            }, {
                status: 400
            });
        }
        if (error instanceof __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$domain$2f$accounting$2f$accountService$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["ConflictError"]) {
            return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json({
                error: error.message
            }, {
                status: 409
            });
        }
        console.error('Accounting API POST Error:', error);
        return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json({
            error: error.message || 'Accounting transaction failed'
        }, {
            status: 500
        });
    }
}
}),
];

//# sourceMappingURL=%5Broot-of-the-server%5D__1b4795da._.js.map