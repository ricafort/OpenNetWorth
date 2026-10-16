/**
 * Why this file exists:
 * Proves the terms gap is closed end-to-end at the persistence layer: migration
 * 0009 adds `interest_rate` / `minimum_payment_cents` / `investment_details` to
 * `accounts`, `accountService` round-trips them through create/get/list/update,
 * the legacy mapping carries them, and the shared backfill degrades gracefully
 * on pre-0009 databases (migration 0006 legitimately runs BEFORE 0009).
 *
 * Tricky logic:
 * - `minimum_payment_cents` follows the ledger cents convention (integer minor
 *   units), so the mapping test asserts the major→cents conversion (25 → 2500).
 * - The pre-0009 rehearsal hand-builds an `accounts` table WITHOUT the terms
 *   columns — exactly the shape migration 0006 sees on fresh/old vaults.
 *
 * All operations execute strictly in-memory; zero live storage modifications.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import Database from 'better-sqlite3';
import { runMigrations } from './migrations';
import {
    createEntity,
    createAccount,
    updateAccount,
    getAccount,
    listAccounts,
    ValidationError
} from '@/lib/domain/accounting/accountService';
import { mapLegacyDataToLedger } from '@/lib/domain/accounting/migrationMapping';
import { backfillLegacyLedgerFromPayload } from '@/lib/domain/accounting/legacyBackfill';

function accountColumns(database: Database.Database): string[] {
    return (database.prepare('PRAGMA table_info(accounts)').all() as { name: string }[]).map(c => c.name);
}

describe('Account terms (migration 0009)', () => {
    let db: Database.Database;

    beforeEach(() => {
        db = new Database(':memory:');
        db.pragma('foreign_keys = ON');
        runMigrations(db);
    });

    afterEach(() => {
        try {
            db.close();
        } catch {
            // Already closed
        }
    });

    it('adds the three terms columns to accounts', () => {
        const cols = accountColumns(db);
        expect(cols).toContain('interest_rate');
        expect(cols).toContain('minimum_payment_cents');
        expect(cols).toContain('investment_details');
    });

    it('is idempotent: re-running applies nothing and keeps the columns', () => {
        const second = runMigrations(db);
        expect(second).not.toContain('0009_account_terms');
        expect(accountColumns(db)).toContain('minimum_payment_cents');
    });

    describe('accountService round-trip', () => {
        it('persists terms on create and returns them from getAccount/listAccounts', () => {
            const entity = createEntity(db, { name: 'Terms Tester', type: 'person', currency: 'USD' });
            const { account } = createAccount(db, {
                entity_id: entity.id,
                name: 'Visa Card',
                type: 'liability',
                sub_type: 'credit_card',
                currency: 'USD',
                opening_balance_cents: 125000,
                opening_date: '2026-01-01',
                interest_rate: 18.5,
                minimum_payment_cents: 3500
            });
            expect(account.interest_rate).toBe(18.5);
            expect(account.minimum_payment_cents).toBe(3500);

            const fetched = getAccount(db, account.id)!;
            expect(fetched.interest_rate).toBe(18.5);
            expect(fetched.minimum_payment_cents).toBe(3500);
            expect(fetched.investment_details).toBeNull();

            const listed = listAccounts(db, entity.id).find(a => a.id === account.id)!;
            expect(listed.interest_rate).toBe(18.5);
            expect(listed.minimum_payment_cents).toBe(3500);
        });

        it('stores investment_details JSON verbatim on assets', () => {
            const entity = createEntity(db, { name: 'Investor', type: 'person', currency: 'USD' });
            const details = JSON.stringify({ ticker: 'VTI', shares: 10, costBasis: 2340, assetClass: 'etf' });
            const { account } = createAccount(db, {
                entity_id: entity.id,
                name: 'Brokerage',
                type: 'asset',
                sub_type: 'brokerage',
                currency: 'USD',
                investment_details: details
            });
            expect(getAccount(db, account.id)!.investment_details).toBe(details);
        });

        it('updates and clears terms with optimistic concurrency', () => {
            const entity = createEntity(db, { name: 'Borrower', type: 'person', currency: 'USD' });
            const { account } = createAccount(db, {
                entity_id: entity.id,
                name: 'Auto Loan',
                type: 'liability',
                sub_type: 'auto_loan',
                currency: 'USD',
                interest_rate: 6.2,
                minimum_payment_cents: 4200
            });
            const updated = updateAccount(db, account.id, account.revision!, {
                interest_rate: 5.9,
                minimum_payment_cents: null
            });
            expect(updated.interest_rate).toBe(5.9);
            expect(updated.minimum_payment_cents).toBeNull();

            const reread = getAccount(db, account.id)!;
            expect(reread.interest_rate).toBe(5.9);
            expect(reread.minimum_payment_cents).toBeNull();
            // Terms-only edits must not disturb untouched fields.
            expect(reread.name).toBe('Auto Loan');
        });

        it('rejects malformed terms at the boundary', () => {
            const entity = createEntity(db, { name: 'Boundary', type: 'person', currency: 'USD' });
            expect(() => createAccount(db, {
                entity_id: entity.id, name: 'Bad JSON', type: 'asset', sub_type: 'other',
                currency: 'USD', investment_details: '{not json'
            })).toThrow(ValidationError);
            expect(() => createAccount(db, {
                entity_id: entity.id, name: 'Bad rate', type: 'liability', sub_type: 'other',
                currency: 'USD', interest_rate: -1
            })).toThrow(ValidationError);
            expect(() => createAccount(db, {
                entity_id: entity.id, name: 'Bad cents', type: 'liability', sub_type: 'other',
                currency: 'USD', minimum_payment_cents: 12.5
            })).toThrow(/safe, finite integer/);
        });
    });

    describe('legacy mapping carries terms', () => {
        it('maps asset investment_details/interest_rate and liability minimum_payment (to cents)', () => {
            const mapped = mapLegacyDataToLedger({
                assets: [{
                    id: 'a1', name: 'Portfolio', type: 'investment', value: 1000,
                    interest_rate: 0, investment_details: '{"ticker":"VTI"}'
                }],
                liabilities: [{
                    id: 'l1', name: 'Card', type: 'credit_card', balance: 500,
                    interest_rate: 20, minimum_payment: 25
                }]
            });
            const asset = mapped.accounts.find(a => a.id === 'account-asset-a1')!;
            expect(asset.investment_details).toBe('{"ticker":"VTI"}');
            expect(asset.interest_rate).toBe(0);

            const liab = mapped.accounts.find(a => a.id === 'account-liab-l1')!;
            expect(liab.interest_rate).toBe(20);
            expect(liab.minimum_payment_cents).toBe(2500);
        });
    });

    describe('shared backfill', () => {
        it('writes terms into accounts when the columns exist (post-0009 vaults)', () => {
            const result = backfillLegacyLedgerFromPayload(db, {
                assets: [{ id: 'a9', name: 'Shares', type: 'investment', value: 250, investment_details: '{"ticker":"BTC"}' }],
                liabilities: [{ id: 'l9', name: 'Home Loan', type: 'mortgage', balance: 100000, interest_rate: 4.1, minimum_payment: 610 }]
            });
            expect(result.skipped).toBe(false);

            const asset = db.prepare("SELECT * FROM accounts WHERE id = 'account-asset-a9'").get() as any;
            expect(asset.investment_details).toBe('{"ticker":"BTC"}');
            const liab = db.prepare("SELECT * FROM accounts WHERE id = 'account-liab-l9'").get() as any;
            expect(liab.interest_rate).toBe(4.1);
            expect(liab.minimum_payment_cents).toBe(61000);
        });

        it('degrades gracefully on a pre-0009 database (0006 runs before 0009)', () => {
            const old = new Database(':memory:');
            old.pragma('foreign_keys = ON');
            old.exec(`
                CREATE TABLE entities (id TEXT PRIMARY KEY, name TEXT NOT NULL, type TEXT NOT NULL, currency TEXT NOT NULL, created_at TEXT NOT NULL, updated_at TEXT NOT NULL);
                CREATE TABLE accounts (
                    id TEXT PRIMARY KEY, entity_id TEXT NOT NULL, name TEXT NOT NULL, type TEXT NOT NULL,
                    sub_type TEXT NOT NULL, currency TEXT NOT NULL, is_active INTEGER NOT NULL DEFAULT 1,
                    opening_date TEXT, opening_balance_cents INTEGER, tracking_mode TEXT DEFAULT 'transactions',
                    balance_revision INTEGER DEFAULT 1, revision INTEGER NOT NULL DEFAULT 1,
                    created_at TEXT NOT NULL, updated_at TEXT NOT NULL
                );
                CREATE TABLE transactions (
                    id TEXT PRIMARY KEY, date TEXT NOT NULL, description TEXT NOT NULL, status TEXT NOT NULL,
                    origin TEXT, idempotency_key TEXT, revision INTEGER NOT NULL DEFAULT 1,
                    created_at TEXT NOT NULL, updated_at TEXT NOT NULL
                );
                CREATE TABLE journal_entries (
                    id TEXT PRIMARY KEY, transaction_id TEXT NOT NULL, account_id TEXT NOT NULL,
                    amount_cents INTEGER NOT NULL, currency TEXT NOT NULL, memo TEXT
                );
                CREATE TABLE settings (key TEXT PRIMARY KEY, value TEXT);
            `);
            const result = backfillLegacyLedgerFromPayload(old, {
                liabilities: [{ id: 'l5', name: 'Old Card', type: 'credit_card', balance: 300, minimum_payment: 15 }]
            });
            expect(result.skipped).toBe(false);
            expect(result.accountsInserted).toBe(2); // liability + opening equity

            const liab = old.prepare("SELECT * FROM accounts WHERE id = 'account-liab-l5'").get() as any;
            expect(liab.name).toBe('Old Card');
            expect(liab.opening_balance_cents).toBe(30000);
            old.close();
        });
    });
});
