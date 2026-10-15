import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import Database from 'better-sqlite3';
import { setTestDb } from '@/infrastructure/sqlite/db';
import { initAccountingSchema } from '@/lib/domain/accounting/schema';
import { createEntity, createAccount, setAccountOpeningBalance, ConflictError, ValidationError } from '@/lib/domain/accounting/accountService';
import { NextRequest } from 'next/server';
import { POST } from '@/app/api/accounting/route'; // The API route handling 'set_opening_balance' action

describe('Account Service - setAccountOpeningBalance (Batch C2)', () => {
    let db: Database.Database;
    let householdId: string;
    let accountId: string;
    let liabilityId: string;

    beforeEach(() => {
        db = new Database(':memory:');
        db.pragma('foreign_keys = ON');
        initAccountingSchema(db);
        setTestDb(db);

        const household = createEntity(db, { name: 'Household', type: 'household', currency: 'USD' });
        householdId = household.id;

        // Fresh entity with no opening-equity account.
        const { account } = createAccount(db, {
            entity_id: householdId,
            name: 'Test Checking',
            type: 'asset',
            sub_type: 'checking',
            currency: 'USD',
            tracking_mode: 'transactions'
        });
        accountId = account.id;

        const { account: liability } = createAccount(db, {
            entity_id: householdId,
            name: 'Test Credit Card',
            type: 'liability',
            sub_type: 'credit_card',
            currency: 'USD',
            tracking_mode: 'transactions'
        });
        liabilityId = liability.id;
    });

    afterEach(() => {
        setTestDb(null);
        try {
            db.close();
        } catch {}
    });

    it('establishes a nonzero asset opening balance and provisions equity account', () => {
        setAccountOpeningBalance(db, accountId, 50000, '2023-01-01');

        const acc = db.prepare('SELECT opening_balance_cents, opening_date FROM accounts WHERE id = ?').get(accountId) as any;
        expect(acc.opening_balance_cents).toBe(50000);
        expect(acc.opening_date).toBe('2023-01-01');

        const eq = db.prepare("SELECT * FROM accounts WHERE entity_id = ? AND sub_type = 'opening_balance_equity'").get(householdId) as any;
        expect(eq).not.toBeUndefined();

        const entries = db.prepare('SELECT amount_cents, account_id, currency FROM journal_entries').all() as any[];
        expect(entries.length).toBe(2);
        
        const assetEntry = entries.find(e => e.account_id === accountId);
        const equityEntry = entries.find(e => e.account_id === eq.id);

        expect(assetEntry.amount_cents).toBe(50000); // debit asset
        expect(equityEntry.amount_cents).toBe(-50000); // credit equity
        expect(assetEntry.currency).toBe('USD');
        expect(equityEntry.currency).toBe('USD');
    });

    it('establishes a nonzero liability opening balance', () => {
        setAccountOpeningBalance(db, liabilityId, 25000, '2023-01-01');

        const entries = db.prepare('SELECT amount_cents, account_id FROM journal_entries').all() as any[];
        expect(entries.length).toBe(2);

        const liabilityEntry = entries.find(e => e.account_id === liabilityId);
        const eq = db.prepare("SELECT * FROM accounts WHERE entity_id = ? AND sub_type = 'opening_balance_equity'").get(householdId) as any;
        const equityEntry = entries.find(e => e.account_id === eq.id);

        expect(liabilityEntry.amount_cents).toBe(-25000); // credit liability
        expect(equityEntry.amount_cents).toBe(25000); // debit equity
    });

    it('handles explicit zero opening balance correctly (no journal entries)', () => {
        setAccountOpeningBalance(db, accountId, 0, '2023-01-01');

        const acc = db.prepare('SELECT opening_balance_cents, opening_date FROM accounts WHERE id = ?').get(accountId) as any;
        expect(acc.opening_balance_cents).toBe(0);
        expect(acc.opening_date).toBe('2023-01-01');

        const entries = db.prepare('SELECT * FROM journal_entries').all();
        expect(entries.length).toBe(0); // Zero balance shouldn't write postings
    });

    it('is idempotent for identical retries', () => {
        setAccountOpeningBalance(db, accountId, 50000, '2023-01-01');
        
        // Should not throw, should not duplicate entries
        expect(() => {
            setAccountOpeningBalance(db, accountId, 50000, '2023-01-01');
        }).not.toThrow();

        const entries = db.prepare('SELECT * FROM journal_entries').all();
        expect(entries.length).toBe(2); // Still only one pair of entries
    });

    it('throws ConflictError for conflicting retries', () => {
        setAccountOpeningBalance(db, accountId, 50000, '2023-01-01');
        
        expect(() => {
            setAccountOpeningBalance(db, accountId, 60000, '2023-01-01');
        }).toThrow(ConflictError);

        expect(() => {
            setAccountOpeningBalance(db, accountId, 50000, '2023-01-02');
        }).toThrow(ConflictError);
    });

    it('rolls back metadata and postings on forced failure', () => {
        // We can simulate a failure by passing an invalid calendar date or invalid account ID
        expect(() => {
            setAccountOpeningBalance(db, accountId, 50000, '2023-02-30'); // Invalid date
        }).toThrow(ValidationError);

        const acc = db.prepare('SELECT opening_balance_cents FROM accounts WHERE id = ?').get(accountId) as any;
        expect(acc.opening_balance_cents).toBeNull();

        const entries = db.prepare('SELECT * FROM journal_entries').all();
        expect(entries.length).toBe(0);
    });

    it('rejects opening balance if posted activity predates the proposed opening date', () => {
        // Create an existing transaction on 2026-09-01
        db.prepare(`
            INSERT INTO transactions (id, date, description, status, origin, idempotency_key, revision, created_at, updated_at)
            VALUES ('tx-123', '2026-09-01', 'Test Deposit', 'posted', 'manual', 'idem-1', 1, '2026-09-01T00:00:00Z', '2026-09-01T00:00:00Z')
        `).run();
        db.prepare(`
            INSERT INTO journal_entries (id, transaction_id, account_id, amount_cents, currency)
            VALUES ('je-1', 'tx-123', ?, 100000, 'USD')
        `).run(accountId);

        expect(() => {
            setAccountOpeningBalance(db, accountId, 100000, '2026-09-10');
        }).toThrow(/This account already has transactions before this date.*Earliest transaction: 2026-09-01/);

        // Validating that earlier opening basis saves correctly
        expect(() => {
            setAccountOpeningBalance(db, accountId, 100000, '2026-08-31');
        }).not.toThrow();
    });

    it('API: successfully saves opening balance and returns OK', async () => {
        const req = new NextRequest('http://localhost/api/accounting', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                action: 'set_opening_balance',
                account_id: accountId,
                amount_cents: 7500,
                date: '2023-05-01'
            })
        });

        const res = await POST(req);
        expect(res.status).toBe(200);

        const acc = db.prepare('SELECT opening_balance_cents, revision FROM accounts WHERE id = ?').get(accountId) as any;
        expect(acc.opening_balance_cents).toBe(7500);
        expect(acc.revision).toBe(2); // Revision incremented
    });
});
