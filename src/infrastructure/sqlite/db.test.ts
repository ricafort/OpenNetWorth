import { describe, it, expect, beforeEach } from 'vitest';
import Database from 'better-sqlite3';

/**
 * SQLite Database Unit Tests
 * 
 * Tests that our SQLite schema and transactions operate cleanly in memory
 * and support the OpenNetWorth data model.
 */
describe('OpenNetWorth SQLite Engine', () => {
    let db: Database.Database;

    beforeEach(() => {
        // Create an isolated in-memory SQLite database for each test
        db = new Database(':memory:');
        db.pragma('foreign_keys = ON');

        db.exec(`
            CREATE TABLE profiles (
                id TEXT PRIMARY KEY,
                email TEXT,
                full_name TEXT,
                avatar_url TEXT,
                privacy_mode INTEGER DEFAULT 1,
                currency_code TEXT DEFAULT 'USD',
                created_at TEXT NOT NULL
            );

            CREATE TABLE assets (
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

            CREATE TABLE liabilities (
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

            CREATE TABLE net_worth_history (
                id TEXT PRIMARY KEY,
                user_id TEXT NOT NULL,
                date TEXT NOT NULL,
                total_assets REAL NOT NULL,
                total_liabilities REAL NOT NULL,
                net_worth REAL NOT NULL,
                UNIQUE(user_id, date)
            );
        `);
    });

    it('should insert and retrieve a local user profile', () => {
        db.prepare(`
            INSERT INTO profiles (id, email, full_name, privacy_mode, currency_code, created_at)
            VALUES ('local_user', 'local@device', 'Vault Owner', 1, 'AUD', datetime('now'))
        `).run();

        const profile = db.prepare("SELECT * FROM profiles WHERE id = 'local_user'").get() as any;
        expect(profile).toBeDefined();
        expect(profile.full_name).toBe('Vault Owner');
        expect(profile.currency_code).toBe('AUD');
        expect(profile.privacy_mode).toBe(1);
    });

    it('should correctly calculate net worth from assets and liabilities', () => {
        // Insert assets
        db.prepare(`
            INSERT INTO assets (id, user_id, name, type, value, is_liquid, currency, last_updated)
            VALUES ('a1', 'local_user', 'Cash Savings', 'cash', 50000, 1, 'USD', datetime('now')),
                   ('a2', 'local_user', 'Index Fund', 'investment', 150000, 0, 'USD', datetime('now'))
        `).run();

        // Insert liabilities
        db.prepare(`
            INSERT INTO liabilities (id, user_id, name, type, balance, last_updated)
            VALUES ('l1', 'local_user', 'Car Loan', 'auto_loan', 20000, datetime('now'))
        `).run();

        const assetSum = (db.prepare("SELECT SUM(value) as total FROM assets WHERE user_id = 'local_user'").get() as any).total;
        const liabSum = (db.prepare("SELECT SUM(balance) as total FROM liabilities WHERE user_id = 'local_user'").get() as any).total;

        expect(assetSum).toBe(200000);
        expect(liabSum).toBe(20000);
        expect(assetSum - liabSum).toBe(180000);
    });

    it('should upsert net worth snapshots idempotently by date', () => {
        const stmt = db.prepare(`
            INSERT INTO net_worth_history (id, user_id, date, total_assets, total_liabilities, net_worth)
            VALUES (@id, @user_id, @date, @total_assets, @total_liabilities, @net_worth)
            ON CONFLICT(user_id, date) DO UPDATE SET
                total_assets = excluded.total_assets,
                total_liabilities = excluded.total_liabilities,
                net_worth = excluded.net_worth
        `);

        stmt.run({
            id: 'h1',
            user_id: 'local_user',
            date: '2026-09-01',
            total_assets: 100000,
            total_liabilities: 20000,
            net_worth: 80000
        });

        // Update same date
        stmt.run({
            id: 'h2',
            user_id: 'local_user',
            date: '2026-09-01',
            total_assets: 110000,
            total_liabilities: 18000,
            net_worth: 92000
        });

        const rows = db.prepare("SELECT * FROM net_worth_history WHERE user_id = 'local_user'").all() as any[];
        expect(rows.length).toBe(1);
        expect(rows[0].net_worth).toBe(92000);
        expect(rows[0].total_assets).toBe(110000);
    });
});
