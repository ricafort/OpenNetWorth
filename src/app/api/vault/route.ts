/**
 * Local Vault SQLite API Route
 * 
 * Why this exists:
 * Provides a fast, local-first API endpoint for reading and persisting all user
 * financial data directly to the local SQLite database (`data/opennetworth.sqlite`).
 * Completely bypasses cloud networks and SaaS providers.
 */

import { NextResponse } from 'next/server';
import { getDb } from '@/infrastructure/sqlite/db';

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const entity = searchParams.get('entity');
        const db = getDb();

        if (entity) {
            // Fetch specific entity table
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

        const { assets, liabilities, goals, recurring, history, cashFlow, settings, profile } = body;

        // Run entire sync inside an atomic SQLite transaction
        const syncTransaction = db.transaction(() => {
            if (Array.isArray(assets)) {
                db.prepare('DELETE FROM assets WHERE user_id = ?').run('local_user');
                const insertAsset = db.prepare(`
                    INSERT INTO assets (id, user_id, name, type, value, is_liquid, currency, interest_rate, investment_details, last_updated)
                    VALUES (@id, @user_id, @name, @type, @value, @is_liquid, @currency, @interest_rate, @investment_details, @last_updated)
                `);
                for (const a of assets) {
                    insertAsset.run({
                        id: a.id || crypto.randomUUID(),
                        user_id: a.user_id || 'local_user',
                        name: a.name,
                        type: a.type,
                        value: Number(a.value) || 0,
                        is_liquid: a.is_liquid ? 1 : 0,
                        currency: a.currency || 'USD',
                        interest_rate: Number(a.interest_rate) || 0,
                        investment_details: a.investment_details ? JSON.stringify(a.investment_details) : null,
                        last_updated: a.last_updated || new Date().toISOString()
                    });
                }
            }

            if (Array.isArray(liabilities)) {
                db.prepare('DELETE FROM liabilities WHERE user_id = ?').run('local_user');
                const insertLiab = db.prepare(`
                    INSERT INTO liabilities (id, user_id, name, type, balance, interest_rate, minimum_payment, is_good_debt, currency, last_updated)
                    VALUES (@id, @user_id, @name, @type, @balance, @interest_rate, @minimum_payment, @is_good_debt, @currency, @last_updated)
                `);
                for (const l of liabilities) {
                    insertLiab.run({
                        id: l.id || crypto.randomUUID(),
                        user_id: l.user_id || 'local_user',
                        name: l.name,
                        type: l.type,
                        balance: Number(l.balance) || 0,
                        interest_rate: Number(l.interest_rate) || 0,
                        minimum_payment: Number(l.minimum_payment) || 0,
                        is_good_debt: l.is_good_debt ? 1 : 0,
                        currency: l.currency || 'USD',
                        last_updated: l.last_updated || new Date().toISOString()
                    });
                }
            }

            if (Array.isArray(goals)) {
                db.prepare('DELETE FROM goals WHERE user_id = ?').run('local_user');
                const insertGoal = db.prepare(`
                    INSERT INTO goals (id, user_id, name, target_amount, current_amount, start_amount, currency, category, deadline, created_at)
                    VALUES (@id, @user_id, @name, @target_amount, @current_amount, @start_amount, @currency, @category, @deadline, @created_at)
                `);
                for (const g of goals) {
                    insertGoal.run({
                        id: g.id || crypto.randomUUID(),
                        user_id: g.user_id || 'local_user',
                        name: g.name,
                        target_amount: Number(g.target_amount) || 0,
                        current_amount: Number(g.current_amount) || 0,
                        start_amount: Number(g.start_amount) || 0,
                        currency: g.currency || 'USD',
                        category: g.category || 'General',
                        deadline: g.deadline || null,
                        created_at: g.created_at || new Date().toISOString()
                    });
                }
            }

            if (Array.isArray(recurring)) {
                db.prepare('DELETE FROM recurring_transactions WHERE user_id = ?').run('local_user');
                const insertRec = db.prepare(`
                    INSERT INTO recurring_transactions (id, user_id, name, amount, type, frequency, category, start_date, end_date, is_active, currency, created_at)
                    VALUES (@id, @user_id, @name, @amount, @type, @frequency, @category, @start_date, @end_date, @is_active, @currency, @created_at)
                `);
                for (const r of recurring) {
                    insertRec.run({
                        id: r.id || crypto.randomUUID(),
                        user_id: r.user_id || 'local_user',
                        name: r.name,
                        amount: Number(r.amount) || 0,
                        type: r.type,
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
                const upsertHistory = db.prepare(`
                    INSERT INTO net_worth_history (id, user_id, date, total_assets, total_liabilities, net_worth)
                    VALUES (@id, @user_id, @date, @total_assets, @total_liabilities, @net_worth)
                    ON CONFLICT(user_id, date) DO UPDATE SET
                        total_assets = excluded.total_assets,
                        total_liabilities = excluded.total_liabilities,
                        net_worth = excluded.net_worth
                `);
                for (const h of history) {
                    upsertHistory.run({
                        id: h.id || crypto.randomUUID(),
                        user_id: 'local_user',
                        date: h.date,
                        total_assets: Number(h.totalAssets ?? h.total_assets) || 0,
                        total_liabilities: Number(h.totalLiabilities ?? h.total_liabilities) || 0,
                        net_worth: Number(h.netWorth ?? h.net_worth) || 0
                    });
                }
            }

            if (settings && typeof settings === 'object') {
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

        return NextResponse.json({ success: true, message: 'Vault saved to local SQLite successfully' });
    } catch (error: any) {
        console.error('Vault POST Error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
