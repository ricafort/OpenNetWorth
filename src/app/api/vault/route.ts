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
 */

import { NextResponse } from 'next/server';
import { getDb } from '@/infrastructure/sqlite/db';

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
 */
function parseFiniteNumber(
    val: any,
    fieldName: string,
    options: { allowNegative?: boolean; required?: boolean } = {}
): number {
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
 */
function validateMonth(month: any): string {
    if (typeof month !== 'string' || !/^\d{4}-(?:0[1-9]|1[0-2])$/.test(month)) {
        throw new ValidationError(`Invalid month format "${month}". Expected YYYY-MM.`);
    }
    return month;
}

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const entity = searchParams.get('entity');
        const db = getDb();

        if (entity) {
            const allowed = ['assets', 'liabilities', 'goals', 'recurring_transactions', 'net_worth_history', 'cash_flow_history', 'profiles', 'settings'];
            const table = entity === 'recurring' ? 'recurring_transactions' :
                entity === 'history' ? 'net_worth_history' :
                    entity === 'cashFlow' ? 'cash_flow_history' : entity;

            if (!allowed.includes(table)) {
                return NextResponse.json({ error: `Invalid entity: ${entity}` }, { status: 400 });
            }

            const rows = db.prepare(`SELECT * FROM ${table}`).all();
            return NextResponse.json({ data: rows });
        }

        // Return full vault snapshot
        const assets = db.prepare('SELECT * FROM assets').all().map((a: any) => ({
            ...a,
            is_liquid: Boolean(a.is_liquid),
            investment_details: a.investment_details ? JSON.parse(a.investment_details) : undefined
        }));

        const liabilities = db.prepare('SELECT * FROM liabilities').all().map((l: any) => ({
            ...l,
            is_good_debt: Boolean(l.is_good_debt)
        }));

        const goals = db.prepare('SELECT * FROM goals').all();

        const recurring = db.prepare('SELECT * FROM recurring_transactions').all().map((r: any) => ({
            ...r,
            is_active: Boolean(r.is_active)
        }));

        const history = db.prepare('SELECT * FROM net_worth_history ORDER BY date ASC').all().map((h: any) => ({
            id: h.id,
            date: h.date,
            totalAssets: h.total_assets,
            totalLiabilities: h.total_liabilities,
            netWorth: h.net_worth
        }));

        const cashFlow = db.prepare('SELECT * FROM cash_flow_history ORDER BY month ASC').all();

        const settingsRows = db.prepare('SELECT * FROM settings').all();
        const settings: Record<string, any> = {};
        for (const row of settingsRows as any[]) {
            try {
                settings[row.key] = JSON.parse(row.value);
            } catch {
                settings[row.key] = row.value;
            }
        }

        const profile = db.prepare("SELECT * FROM profiles WHERE id = 'local_user'").get();

        return NextResponse.json({
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
    } catch (error: any) {
        console.error('Vault GET Error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const db = getDb();

        const { action, entity, item, id } = body;

        // --- SCOPED SINGLE-RECORD OPERATIONS (DATA-05) ---
        if (action === 'scoped_save') {
            if (!entity || !item || !item.id) {
                return NextResponse.json({ error: 'Missing entity, item, or item ID for scoped save' }, { status: 400 });
            }

            if (entity === 'assets') {
                const value = parseFiniteNumber(item.value, 'Asset value', { allowNegative: false, required: true });
                const interest_rate = parseFiniteNumber(item.interest_rate, 'Interest rate', { allowNegative: true, required: false });

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
                return NextResponse.json({ success: true, item: { ...item, value, interest_rate } });
            }

            if (entity === 'liabilities') {
                const balance = parseFiniteNumber(item.balance, 'Liability balance', { allowNegative: false, required: true });
                const interest_rate = parseFiniteNumber(item.interest_rate, 'Interest rate', { allowNegative: true, required: false });
                const minimum_payment = parseFiniteNumber(item.minimum_payment, 'Minimum payment', { allowNegative: false, required: false });

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
                return NextResponse.json({ success: true, item: { ...item, balance, interest_rate, minimum_payment } });
            }

            if (entity === 'goals') {
                const target_amount = parseFiniteNumber(item.target_amount, 'Target amount', { allowNegative: false, required: true });
                const current_amount = parseFiniteNumber(item.current_amount, 'Current amount', { allowNegative: false, required: false });
                const start_amount = parseFiniteNumber(item.start_amount, 'Start amount', { allowNegative: false, required: false });

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
                return NextResponse.json({ success: true, item: { ...item, target_amount, current_amount, start_amount } });
            }

            if (entity === 'recurring') {
                const amount = parseFiniteNumber(item.amount, 'Recurring amount', { allowNegative: false, required: true });

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
                return NextResponse.json({ success: true, item: { ...item, amount } });
            }

            if (entity === 'cashFlow') {
                const month = validateMonth(item.month);
                const income = parseFiniteNumber(item.income, 'Income', { allowNegative: false, required: true });
                const expenses = parseFiniteNumber(item.expenses, 'Expenses', { allowNegative: false, required: true });

                const stmt = db.prepare(`
                    INSERT INTO cash_flow_history (id, user_id, month, income, expenses, currency)
                    VALUES (@id, @user_id, @month, @income, @expenses, @currency)
                    ON CONFLICT(user_id, month) DO UPDATE SET
                        income = excluded.income,
                        expenses = excluded.expenses,
                        currency = excluded.currency
                `);
                stmt.run({
                    id: item.id || crypto.randomUUID(),
                    user_id: 'local_user',
                    month,
                    income,
                    expenses,
                    currency: item.currency || 'USD'
                });
                return NextResponse.json({ success: true, item: { ...item, month, income, expenses } });
            }

            return NextResponse.json({ error: `Unsupported entity for scoped save: ${entity}` }, { status: 400 });
        }

        // --- SCOPED SINGLE-RECORD DELETE (DATA-05) ---
        if (action === 'scoped_delete') {
            if (!entity || !id) {
                return NextResponse.json({ error: 'Missing entity or id for scoped delete' }, { status: 400 });
            }
            const tableMap: Record<string, string> = {
                assets: 'assets',
                liabilities: 'liabilities',
                goals: 'goals',
                recurring: 'recurring_transactions',
                cashFlow: 'cash_flow_history'
            };
            const table = tableMap[entity];
            if (!table) {
                return NextResponse.json({ error: `Unsupported entity for delete: ${entity}` }, { status: 400 });
            }
            db.prepare(`DELETE FROM ${table} WHERE id = ?`).run(id);
            return NextResponse.json({ success: true, deletedId: id });
        }

        // --- COMPLETE VAULT CLEAR/WIPE (DATA-01, DATA-05) ---
        if (action === 'clear_vault' || action === 'wipe') {
            const clearTx = db.transaction(() => {
                db.prepare("DELETE FROM assets WHERE user_id = 'local_user'").run();
                db.prepare("DELETE FROM liabilities WHERE user_id = 'local_user'").run();
                db.prepare("DELETE FROM goals WHERE user_id = 'local_user'").run();
                db.prepare("DELETE FROM recurring_transactions WHERE user_id = 'local_user'").run();
                db.prepare("DELETE FROM net_worth_history WHERE user_id = 'local_user'").run();
                db.prepare("DELETE FROM cash_flow_history WHERE user_id = 'local_user'").run();
                db.prepare("DELETE FROM settings").run();
            });
            clearTx();
            return NextResponse.json({ success: true, message: 'Vault wiped successfully' });
        }

        // --- BULK RESTORE OR BULK SYNCHRONIZATION ---
        const { assets, liabilities, goals, recurring, history, cashFlow, settings, profile } = body;
        const isBulkRestore = action === 'bulk_restore';

        const syncTransaction = db.transaction(() => {
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
                for (const a of assets) {
                    const value = parseFiniteNumber(a.value, `Asset "${a.name || a.id}" value`, { allowNegative: false, required: true });
                    const interest_rate = parseFiniteNumber(a.interest_rate, `Asset "${a.name || a.id}" interest rate`, { allowNegative: true, required: false });
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
                for (const l of liabilities) {
                    const balance = parseFiniteNumber(l.balance, `Liability "${l.name || l.id}" balance`, { allowNegative: false, required: true });
                    const interest_rate = parseFiniteNumber(l.interest_rate, `Liability "${l.name || l.id}" interest rate`, { allowNegative: true, required: false });
                    const minimum_payment = parseFiniteNumber(l.minimum_payment, `Liability "${l.name || l.id}" minimum payment`, { allowNegative: false, required: false });
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
                for (const g of goals) {
                    const target_amount = parseFiniteNumber(g.target_amount, `Goal "${g.name || g.id}" target amount`, { allowNegative: false, required: true });
                    const current_amount = parseFiniteNumber(g.current_amount, `Goal "${g.name || g.id}" current amount`, { allowNegative: false, required: false });
                    const start_amount = parseFiniteNumber(g.start_amount, `Goal "${g.name || g.id}" start amount`, { allowNegative: false, required: false });
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
                for (const r of recurring) {
                    const amount = parseFiniteNumber(r.amount, `Recurring item "${r.name || r.id}" amount`, { allowNegative: false, required: true });
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
                for (const h of history) {
                    const total_assets = parseFiniteNumber(h.totalAssets ?? h.total_assets, `History record ${h.date} total assets`, { allowNegative: false, required: true });
                    const total_liabilities = parseFiniteNumber(h.totalLiabilities ?? h.total_liabilities, `History record ${h.date} total liabilities`, { allowNegative: false, required: true });
                    const net_worth = parseFiniteNumber(h.netWorth ?? h.net_worth, `History record ${h.date} net worth`, { allowNegative: true, required: true });
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
                for (const cf of cashFlow) {
                    const month = validateMonth(cf.month);
                    const income = parseFiniteNumber(cf.income, `Cash flow entry ${cf.month} income`, { allowNegative: false, required: true });
                    const expenses = parseFiniteNumber(cf.expenses, `Cash flow entry ${cf.month} expenses`, { allowNegative: false, required: true });
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
                for (const [k, v] of Object.entries(settings)) {
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

        return NextResponse.json({ success: true, message: isBulkRestore ? 'Vault restored successfully' : 'Vault saved to local SQLite successfully' });
    } catch (error: any) {
        console.error('Vault POST Error:', error);
        const status = error instanceof ValidationError || error.statusCode === 400 ? 400 : 500;
        return NextResponse.json({ error: error.message || 'Internal database error' }, { status });
    }
}
