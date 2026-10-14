/**
 * Why this file exists:
 * Proves the mentor route answers net-worth GOAL questions ("when will I reach $10,000 net worth?")
 * with a deterministic, server-computed projection — even when the Local LLM is offline.
 * This is the regression test for the "mentors refuse to estimate dates" complaint.
 *
 * Tricky logic:
 * - The recurring_transactions table is created by full app DB init, not initAccountingSchema,
 *   so this test creates it explicitly in the in-memory DB.
 * - @/lib/api/localLlm is mocked to reject immediately so the offline fallback path is exercised
 *   with zero socket timeout.
 * - The expected projected month label is computed from the current date so the test is stable
 *   regardless of when it runs.
 *
 * All operations execute strictly in-memory using setTestDb; zero live storage modifications.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { NextRequest } from 'next/server';
import Database from 'better-sqlite3';
import { setTestDb } from '@/infrastructure/sqlite/db';
import { initAccountingSchema } from '@/lib/domain/accounting/schema';
import { createEntity, createAccount } from '@/lib/domain/accounting/accountService';
import { POST } from './route';

vi.mock('@/lib/api/localLlm', () => ({
    queryLocalLlm: vi.fn().mockRejectedValue(new Error('Local LLM offline for test'))
}));

function makeRequest(message: string) {
    return new NextRequest('http://localhost:4000/api/mentor', {
        method: 'POST',
        headers: {
            host: 'localhost:4000',
            origin: 'http://localhost:4000',
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            mentor: { name: 'Long-Term Thinker', archetype: 'Compounding & Patience', description: 'Focuses on the power of time and consistent discipline.' },
            mode: 'reflect',
            userContext: { currency: 'USD' },
            message
        })
    });
}

describe('Mentor goal projection answers (offline fallback)', () => {
    let db: Database.Database;

    beforeEach(() => {
        db = new Database(':memory:');
        initAccountingSchema(db);
        db.exec(`
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
        `);
        setTestDb(db);
    });

    afterEach(() => {
        setTestDb(null);
        db.close();
    });

    function seedBalancedUser() {
        const entity = createEntity(db, { name: 'Local User', type: 'person', currency: 'USD' });
        createAccount(db, {
            entity_id: entity.id,
            name: 'Checking Account',
            type: 'asset',
            sub_type: 'checking',
            currency: 'USD',
            tracking_mode: 'transactions',
            opening_balance_cents: 500000, // $5,000.00
            opening_date: '2026-01-01'
        });
        const now = new Date().toISOString();
        db.prepare(
            `INSERT INTO recurring_transactions (id, user_id, name, amount, type, frequency, category, start_date, is_active, currency, created_at)
             VALUES ('rec-sal', 'local_user', 'Salary', 2000, 'income', 'monthly', 'Income', '2026-01-01', 1, 'USD', ?)`
        ).run(now);
        db.prepare(
            `INSERT INTO recurring_transactions (id, user_id, name, amount, type, frequency, category, start_date, is_active, currency, created_at)
             VALUES ('rec-liv', 'local_user', 'Living costs', 1000, 'expense', 'monthly', 'Personal', '2026-01-01', 1, 'USD', ?)`
        ).run(now);
    }

    it('answers a net worth goal question with a computed projected date while the LLM is offline', async () => {
        seedBalancedUser();

        const res = await POST(makeRequest('When will I reach $10,000 net worth?'));
        expect(res.status).toBe(200);
        const data = await res.json();

        expect(data.isOfflineFallback).toBe(true);
        // Gap $5,000 at $1,000/mo surplus => 5 months from today
        const now = new Date();
        const projected = new Date(now.getFullYear(), now.getMonth() + 5, 1);
        const expectedLabel = projected.toLocaleString('en-US', { month: 'long', year: 'numeric' });

        expect(data.response).toContain('Projected date');
        expect(data.response).toContain(expectedLabel);
        expect(data.response).toContain('5,000.00 USD');   // gap
        expect(data.response).toContain('1,000.00 USD');   // monthly surplus
        expect(data.response).toContain('Educational perspective only. Not financial advice.');
        expect(data.facts?.type).toBe('goal_projection');
        expect(data.facts?.months).toBe(5);
    });

    it('discloses that no projection is possible when balances are unrecorded', async () => {
        // No accounts at all
        const res = await POST(makeRequest('When will I reach my first million US dollar net worth?'));
        expect(res.status).toBe(200);
        const data = await res.json();

        expect(data.isOfflineFallback).toBe(true);
        expect(data.response).toContain('Unknown / needs balance');
        expect(data.response).not.toContain('Projected date');
    });

    it('includes the net monthly surplus in ordinary reflective offline answers', async () => {
        seedBalancedUser();

        const res = await POST(makeRequest('How is my financial posture looking?'));
        expect(res.status).toBe(200);
        const data = await res.json();

        expect(data.response).toContain('5,000.00 USD net worth');
        expect(data.response).toContain('net monthly surplus of 1,000.00 USD');
    });
});
