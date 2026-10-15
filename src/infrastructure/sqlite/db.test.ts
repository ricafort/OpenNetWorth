import { describe, it, expect, beforeEach } from 'vitest';
import Database from 'better-sqlite3';
import { createTestDb } from './db';

/**
 * SQLite Database Unit Tests
 *
 * Tests that our SQLite schema and transactions operate cleanly in memory
 * and support the OpenNetWorth data model. The schema comes from the real
 * migration runner (createTestDb), not a hand-rolled copy, so these tests
 * track the canonical DDL automatically.
 */
describe('OpenNetWorth SQLite Engine', () => {
    let db: Database.Database;

    beforeEach(() => {
        // Create an isolated in-memory SQLite database for each test
        db = createTestDb();
    });

    it('should insert and retrieve a local user profile', () => {
        // createTestDb seeds a default 'local_user' profile row; replace it to
        // exercise the insert/retrieve contract against known values.
        db.prepare(`
            INSERT OR REPLACE INTO profiles (id, email, full_name, privacy_mode, currency_code, created_at)
            VALUES ('local_user', 'local@device', 'Vault Owner', 1, 'AUD', datetime('now'))
        `).run();

        const profile = db.prepare("SELECT * FROM profiles WHERE id = 'local_user'").get() as any;
        expect(profile).toBeDefined();
        expect(profile.full_name).toBe('Vault Owner');
        expect(profile.currency_code).toBe('AUD');
        expect(profile.privacy_mode).toBe(1);
    });

    it('should correctly calculate net worth from ledger asset and liability accounts', () => {
        // The m0 `assets`/`liabilities` tables are retired by migration 0007:
        // holdings and debts live as ledger accounts with balances in cents.
        db.prepare(`
            INSERT INTO entities (id, name, type, currency, created_at, updated_at)
            VALUES ('ent-owner', 'Vault Owner', 'person', 'USD', datetime('now'), datetime('now'))
        `).run();

        db.prepare(`
            INSERT INTO accounts (id, entity_id, name, type, sub_type, currency, opening_date, opening_balance_cents, created_at, updated_at)
            VALUES
                ('acc-cash', 'ent-owner', 'Cash Savings', 'asset', 'checking', 'USD', '2026-01-01', 5000000, datetime('now'), datetime('now')),
                ('acc-fund', 'ent-owner', 'Index Fund', 'asset', 'brokerage', 'USD', '2026-01-01', 15000000, datetime('now'), datetime('now')),
                ('acc-car', 'ent-owner', 'Car Loan', 'liability', 'auto_loan', 'USD', '2026-01-01', 2000000, datetime('now'), datetime('now'))
        `).run();

        const assetSumCents = (db.prepare("SELECT SUM(opening_balance_cents) as total FROM accounts WHERE entity_id = 'ent-owner' AND type = 'asset'").get() as any).total;
        const liabSumCents = (db.prepare("SELECT SUM(opening_balance_cents) as total FROM accounts WHERE entity_id = 'ent-owner' AND type = 'liability'").get() as any).total;

        expect(assetSumCents).toBe(20000000);
        expect(liabSumCents).toBe(2000000);
        expect((assetSumCents - liabSumCents) / 100).toBe(180000);
    });

    it('should upsert net worth snapshots idempotently by date', () => {
        const stmt = db.prepare(`
            INSERT INTO net_worth_snapshots (id, user_id, date, total_assets, total_liabilities, net_worth)
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

        const rows = db.prepare("SELECT * FROM net_worth_snapshots WHERE user_id = 'local_user'").all() as any[];
        expect(rows.length).toBe(1);
        expect(rows[0].net_worth).toBe(92000);
        expect(rows[0].total_assets).toBe(110000);
    });
});
