/**
 * Milestone 1 — Slice 1A: Isolated Accounting Foundation & Domain Tests
 * 
 * Why this file exists:
 * Comprehensive, isolated automated test suite verifying:
 * 1. Exact monetary arithmetic (integer cents, zero IEEE-754 floating point drift).
 * 2. Balanced transaction invariant validation (Sum(Debits) - Sum(Credits) = 0).
 * 3. Double-entry schema integrity on SQLite (foreign keys, idempotency keys, revisions).
 * 4. Deterministic, non-destructive legacy data mapping to accounts & opening balances.
 * 5. Strict test database isolation (all operations run in :memory:).
 * 
 * Tricky logic:
 * Uses better-sqlite3 with ':memory:' directly, guaranteeing 100% independence from
 * the application's live vault file and safety backups (M1-SAFE-01).
 * 
 * TODO: Add multi-currency revaluation test scenarios in Slice 1D.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import Database from 'better-sqlite3';
import {
    Money,
    addMoney,
    subtractMoney,
    multiplyMoneyRatio,
    parseToCents,
    formatMoney,
    validateTransactionBalance,
    assertValidMoneyCents
} from './types';
import { initAccountingSchema } from './schema';
import { initDocumentSchema } from '../document/schema';
import { mapLegacyDataToMilestone1, LegacyDataPayload } from './migrationMapping';

describe('Milestone 1 — Slice 1A: Accounting Foundation & Invariants', () => {
    let db: Database.Database;

    beforeEach(() => {
        // Pristine in-memory database for each test (M1-SAFE-01)
        db = new Database(':memory:');
        db.pragma('foreign_keys = ON');
        initAccountingSchema(db);
        initDocumentSchema(db);
    });

    afterEach(() => {
        try {
            db.close();
        } catch {
            // Already closed
        }
    });

    describe('M1-DOM-04: Exact Monetary Arithmetic & Precision', () => {
        it('avoids binary floating-point rounding errors (0.1 + 0.2 === 0.3)', () => {
            // In standard JS IEEE-754: 0.1 + 0.2 === 0.30000000000000004
            expect(0.1 + 0.2).not.toBe(0.3);

            // In integer cents:
            const tenCents = parseToCents('0.10', 'USD');
            const twentyCents = parseToCents('0.20', 'USD');
            const thirtyCents = parseToCents('0.30', 'USD');

            expect(tenCents).toBe(10);
            expect(twentyCents).toBe(20);
            expect(thirtyCents).toBe(30);

            const m1: Money = { amount_cents: tenCents, currency: 'USD' };
            const m2: Money = { amount_cents: twentyCents, currency: 'USD' };
            const result = addMoney(m1, m2);

            expect(result.amount_cents).toBe(30);
            expect(result.amount_cents).toBe(thirtyCents);
        });

        it('rejects cross-currency addition without explicit conversion', () => {
            const usd: Money = { amount_cents: 10000, currency: 'USD' };
            const aud: Money = { amount_cents: 15000, currency: 'AUD' };

            expect(() => addMoney(usd, aud)).toThrow(/Cannot add unlike currencies: USD and AUD/);
            expect(() => subtractMoney(usd, aud)).toThrow(/Cannot subtract unlike currencies: USD and AUD/);
        });

        it('multiplies money with deterministic rounding policy', () => {
            // 50% of $125.55 (12555 cents) = 6277.5 cents -> rounds to 6278 cents
            const m: Money = { amount_cents: 12555, currency: 'USD' };
            const half = multiplyMoneyRatio(m, 0.5);

            expect(half.amount_cents).toBe(6278);
            expect(formatMoney(half)).toBe('$62.78');
        });

        it('rejects non-numeric, NaN, or non-finite inputs without defaulting to zero', () => {
            expect(() => parseToCents('not-money', 'USD')).toThrow(/Invalid monetary value/);
            expect(() => parseToCents(NaN, 'USD')).toThrow(/Invalid monetary value/);
            expect(() => parseToCents('', 'USD')).toThrow(/cannot be null, undefined, or empty/);
            expect(() => assertValidMoneyCents(12.34, 'Float test')).toThrow(/must be a safe, finite integer/);
        });
    });

    describe('M1-DOM-03: Double-Entry Balanced Invariant', () => {
        it('accepts balanced multi-leg postings (Sum = 0)', () => {
            const postings = [
                { id: 'p1', transaction_id: 't1', account_id: 'a1', amount_cents: 10000, currency: 'USD' }, // Debit Checking +100.00
                { id: 'p2', transaction_id: 't1', account_id: 'a2', amount_cents: -7000, currency: 'USD' }, // Credit Salary -70.00
                { id: 'p3', transaction_id: 't1', account_id: 'a3', amount_cents: -3000, currency: 'USD' }  // Credit Bonus -30.00
            ];

            const validation = validateTransactionBalance(postings);
            expect(validation.isValid).toBe(true);
            expect(validation.delta_cents).toBe(0);
        });

        it('detects unbalanced postings with exact delta', () => {
            const unbalanced = [
                { id: 'p1', transaction_id: 't1', account_id: 'a1', amount_cents: 10000, currency: 'USD' },
                { id: 'p2', transaction_id: 't1', account_id: 'a2', amount_cents: -9500, currency: 'USD' } // 500 cent imbalance
            ];

            const validation = validateTransactionBalance(unbalanced);
            expect(validation.isValid).toBe(false);
            expect(validation.delta_cents).toBe(500);
        });

        it('requires at least two postings per transaction', () => {
            const single = [
                { id: 'p1', transaction_id: 't1', account_id: 'a1', amount_cents: 10000, currency: 'USD' }
            ];
            expect(() => validateTransactionBalance(single)).toThrow(/must contain at least two postings/);
        });
    });

    describe('Double-Entry SQLite Schema Integrity & Invariants', () => {
        it('enforces foreign key cascading from transactions to journal entries', () => {
            // Seed Entity & Accounts
            db.prepare(`
                INSERT INTO m1_entities (id, name, type, currency, created_at, updated_at)
                VALUES ('ent-1', 'Test Entity', 'person', 'USD', datetime('now'), datetime('now'))
            `).run();

            db.prepare(`
                INSERT INTO m1_accounts (id, entity_id, name, type, sub_type, currency, revision, created_at, updated_at)
                VALUES ('acc-1', 'ent-1', 'Checking', 'asset', 'checking', 'USD', 1, datetime('now'), datetime('now')),
                       ('acc-2', 'ent-1', 'Savings', 'asset', 'savings', 'USD', 1, datetime('now'), datetime('now'))
            `).run();

            // Insert Transaction & Postings
            db.prepare(`
                INSERT INTO m1_transactions (id, date, description, status, origin, idempotency_key, revision, created_at, updated_at)
                VALUES ('tx-1', '2026-09-13', 'Inter-account transfer', 'posted', 'manual', 'idemp-1', 1, datetime('now'), datetime('now'))
            `).run();

            db.prepare(`
                INSERT INTO m1_journal_entries (id, transaction_id, account_id, amount_cents, currency)
                VALUES ('j-1', 'tx-1', 'acc-1', -5000, 'USD'),
                       ('j-2', 'tx-1', 'acc-2', 5000, 'USD')
            `).run();

            const postingsBefore = db.prepare("SELECT * FROM m1_journal_entries WHERE transaction_id = 'tx-1'").all();
            expect(postingsBefore).toHaveLength(2);

            // Delete transaction -> cascading delete removes all postings
            db.prepare("DELETE FROM m1_transactions WHERE id = 'tx-1'").run();
            const postingsAfter = db.prepare("SELECT * FROM m1_journal_entries WHERE transaction_id = 'tx-1'").all();
            expect(postingsAfter).toHaveLength(0);
        });

        it('enforces idempotency key uniqueness to prevent duplicate posting retries', () => {
            db.prepare(`
                INSERT INTO m1_transactions (id, date, description, status, origin, idempotency_key, revision, created_at, updated_at)
                VALUES ('tx-a', '2026-09-13', 'Original Request', 'posted', 'manual', 'unique-idemp-123', 1, datetime('now'), datetime('now'))
            `).run();

            // Attempting to insert a duplicate with same idempotency key throws SQLite constraint error
            expect(() => {
                db.prepare(`
                    INSERT INTO m1_transactions (id, date, description, status, origin, idempotency_key, revision, created_at, updated_at)
                    VALUES ('tx-b', '2026-09-13', 'Retry Request', 'posted', 'manual', 'unique-idemp-123', 1, datetime('now'), datetime('now'))
                `).run();
            }).toThrow(/UNIQUE constraint failed: m1_transactions.idempotency_key/);
        });

        it('detects optimistic concurrency conflicts via revision tracking', () => {
            db.prepare(`
                INSERT INTO m1_entities (id, name, type, currency, created_at, updated_at)
                VALUES ('ent-1', 'Test Entity', 'person', 'USD', datetime('now'), datetime('now'))
            `).run();

            db.prepare(`
                INSERT INTO m1_accounts (id, entity_id, name, type, sub_type, currency, revision, created_at, updated_at)
                VALUES ('acc-rev', 'ent-1', 'Brokerage', 'asset', 'brokerage', 'USD', 1, datetime('now'), datetime('now'))
            `).run();

            // Successful update with matching revision
            const res1 = db.prepare(`
                UPDATE m1_accounts SET name = 'Vanguard Brokerage', revision = revision + 1
                WHERE id = 'acc-rev' AND revision = 1
            `).run();
            expect(res1.changes).toBe(1);

            // Stale update using old revision 1 fails (0 rows updated)
            const res2 = db.prepare(`
                UPDATE m1_accounts SET name = 'Fidelity Brokerage', revision = revision + 1
                WHERE id = 'acc-rev' AND revision = 1
            `).run();
            expect(res2.changes).toBe(0); // Conflict detected!
        });
    });

    describe('M1-MIG-01 & M1-MIG-02: Non-Destructive Legacy Migration Mapping', () => {
        it('maps synthetic legacy assets and liabilities into double-entry accounts with balanced opening entries', () => {
            const syntheticLegacy: LegacyDataPayload = {
                profile: { full_name: 'Jane Doe', currency_code: 'USD' },
                settings: { baseCurrency: 'USD' },
                assets: [
                    { id: 'leg-asset-1', name: 'High-Yield Savings', type: 'savings', value: 35000, currency: 'USD' },
                    { id: 'leg-asset-2', name: 'Investment Portfolio', type: 'investment', value: 120000, currency: 'USD' }
                ],
                liabilities: [
                    { id: 'leg-liab-1', name: 'Primary Mortgage', type: 'mortgage', balance: 80000, currency: 'USD' }
                ]
            };

            const mapped = mapLegacyDataToMilestone1(syntheticLegacy, '2026-09-01');

            // 1. Entity mapped correctly
            expect(mapped.entity.name).toBe('Jane Doe');
            expect(mapped.entity.currency).toBe('USD');

            // 2. Accounts mapped: Opening Equity + 2 Assets + 1 Liability = 4 accounts
            expect(mapped.accounts).toHaveLength(4);
            expect(mapped.accounts.map(a => a.name)).toContain('Opening Balance Equity');
            expect(mapped.accounts.map(a => a.name)).toContain('High-Yield Savings');
            expect(mapped.accounts.map(a => a.name)).toContain('Investment Portfolio');
            expect(mapped.accounts.map(a => a.name)).toContain('Primary Mortgage');

            // 3. Opening transactions: 3 transactions, each with exactly 2 balanced postings
            expect(mapped.openingTransactions).toHaveLength(3);
            for (const item of mapped.openingTransactions) {
                const balanceCheck = validateTransactionBalance(item.postings);
                expect(balanceCheck.isValid).toBe(true);
                expect(balanceCheck.delta_cents).toBe(0);
            }

            // 4. Audit summary matches exact net worth arithmetic: (35k + 120k) - 80k = 75k USD (7,500,000 cents)
            expect(mapped.auditSummary.total_assets_cents['USD']).toBe(15500000);
            expect(mapped.auditSummary.total_liabilities_cents['USD']).toBe(8000000);
            expect(mapped.auditSummary.net_worth_cents['USD']).toBe(7500000);
            expect(mapped.auditSummary.unmapped_records_count).toBe(0);
        });
    });

    describe('Document Inbox & Processing Schema', () => {
        it('stores document metadata and prevents duplicate uploads by SHA-256 hash', () => {
            const hash = 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855';

            db.prepare(`
                INSERT INTO m1_documents (id, filename, content_hash, mime_type, byte_size, created_at)
                VALUES ('doc-1', 'statement.csv', ?, 'text/csv', 2048, datetime('now'))
            `).run(hash);

            // Re-uploading same file content under different name is caught by unique hash constraint
            expect(() => {
                db.prepare(`
                    INSERT INTO m1_documents (id, filename, content_hash, mime_type, byte_size, created_at)
                    VALUES ('doc-2', 'renamed_statement.csv', ?, 'text/csv', 2048, datetime('now'))
                `).run(hash);
            }).toThrow(/UNIQUE constraint failed: m1_documents.content_hash/);
        });
    });
});
