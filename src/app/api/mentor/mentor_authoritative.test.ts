/**
 * Mentor API Authoritative Figures & Local Safety Tests
 *
 * Why this file exists:
 * Fulfills Independent Assessment Findings B & F:
 * 1. Assistant Grounding (Finding B): The assistant route must query SQLite database
 *    figures authoritatively rather than blindly accepting arbitrary client userContext figures.
 * 2. Unrecorded Balance Disclosures (Finding B): When balance-tracked accounts lack observations,
 *    the snapshot discloses unrecorded accounts instead of presenting an assumed complete total.
 * 3. Local Safety & Origin/Host Protection (Finding F): Reject untrusted external origins and
 *    hosts with HTTP 403, and return Cache-Control: private, no-store, max-age=0 headers.
 *
 * Tricky logic:
 * - When Local LLM is offline or unconfigured, route falls back to deterministic offline wisdom.
 * - In tests, @/lib/api/localLlm is mocked to reject immediately to avoid a 5-second socket timeout.
 * - Currency formatting must handle currency symbols and minor unit divisors correctly.
 *
 * TODO items:
 * - Milestone 2: Add integration tests with mock Ollama streaming response handler.
 *
 * All operations execute strictly in-memory using setTestDb; zero live storage modifications.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { NextRequest } from 'next/server';
import Database from 'better-sqlite3';
import { setTestDb } from '@/infrastructure/sqlite/db';
import { initAccountingSchema } from '@/lib/domain/accounting/schema';
import { createEntity, createAccount } from '@/lib/domain/accounting/accountService';
import { recordBalanceObservation } from '@/lib/domain/accounting/balanceObservationService';
import { POST } from './route';

// Mock local LLM to reject immediately so offline wisdom fallback triggers with zero socket timeout
vi.mock('@/lib/api/localLlm', () => ({
    queryLocalLlm: vi.fn().mockRejectedValue(new Error('Local LLM offline for test'))
}));

describe('Mentor Authoritative Server Figures & Local Safety (Findings B & F)', () => {
    let db: Database.Database;

    beforeEach(() => {
        db = new Database(':memory:');
        initAccountingSchema(db);
        setTestDb(db);
    });

    afterEach(() => {
        setTestDb(null);
        db.close();
    });

    it('injects authoritative SQLite net worth and asset figures rather than client payload numbers', async () => {
        const entity = createEntity(db, {
            name: 'Local User',
            type: 'person',
            currency: 'USD'
        });

        // Add real checking account with $12,500.00
        createAccount(db, {
            entity_id: entity.id,
            name: 'Checking Account',
            type: 'asset',
            sub_type: 'checking',
            currency: 'USD',
            tracking_mode: 'transactions',
            opening_balance_cents: 1250000,
            opening_date: '2026-01-01'
        });

        // Add liability account with $2,500.00 debt
        createAccount(db, {
            entity_id: entity.id,
            name: 'Credit Card',
            type: 'liability',
            sub_type: 'credit_card',
            currency: 'USD',
            tracking_mode: 'transactions',
            opening_balance_cents: 250000,
            opening_date: '2026-01-01'
        });

        // Client passes false/outdated userContext claims (e.g. netWorth = 999,999)
        const req = new NextRequest('http://localhost:4000/api/mentor', {
            method: 'POST',
            headers: {
                host: 'localhost:4000',
                origin: 'http://localhost:4000',
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                mentor: { name: 'Buffett', archetype: 'Sage', description: 'Patience and moat' },
                mode: 'reflect',
                userContext: {
                    currency: 'USD',
                    netWorth: 999999, // Fake client figure
                    totalAssets: 999999,
                    totalLiabilities: 0
                },
                message: 'How is my financial posture looking?'
            })
        });

        const res = await POST(req);
        expect(res.status).toBe(200);
        expect(res.headers.get('Cache-Control')).toBe('private, no-store, max-age=0');

        const data = await res.json();
        // Authoritative Net Worth: $12,500 - $2,500 = $10,000.00 USD
        // Authoritative Assets: $12,500.00 USD
        // Authoritative Debt: $2,500.00 USD
        expect(data.response).toContain('10,000.00 USD net worth');
        expect(data.response).toContain('12,500.00 USD in assets');
        expect(data.response).toContain('2,500.00 USD in debt');
        expect(data.response).not.toContain('999,999');
    });

    it('Item 3: returns "Unknown / needs balance" and does not leak fabricated client totals when only unknown balance accounts exist', async () => {
        const entity = createEntity(db, {
            name: 'Local User',
            type: 'person',
            currency: 'USD'
        });

        // Add single account with unknown balance (no observations)
        createAccount(db, {
            entity_id: entity.id,
            name: 'Unrecorded Investment',
            type: 'asset',
            sub_type: 'investment',
            currency: 'USD',
            tracking_mode: 'balance'
        });

        const req = new NextRequest('http://localhost:4000/api/mentor', {
            method: 'POST',
            headers: {
                host: 'localhost:4000',
                origin: 'http://localhost:4000',
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                mentor: { name: 'Naval', archetype: 'Philosopher' },
                mode: 'reflect',
                userContext: { currency: 'USD', netWorth: 9999999, totalAssets: 8888888, totalLiabilities: 1111111 },
                message: 'Give me financial advice'
            })
        });

        const res = await POST(req);
        expect(res.status).toBe(200);
        const data = await res.json();
        // Must return Unknown / needs balance and NEVER leak fabricated client totals
        expect(data.response).toContain('Unknown / needs balance');
        expect(data.response).not.toContain('9,999,999');
        expect(data.response).not.toContain('8,888,888');
        expect(data.response).not.toContain('1,111,111');
    });

    it('Item 3: covers the no-account case, returning "Unknown / needs balance" without reproducing fabricated client totals', async () => {
        // Zero accounts in database
        const req = new NextRequest('http://localhost:4000/api/mentor', {
            method: 'POST',
            headers: {
                host: 'localhost:4000',
                origin: 'http://localhost:4000',
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                mentor: { name: 'Naval', archetype: 'Philosopher' },
                mode: 'reflect',
                userContext: { currency: 'USD', netWorth: 5555555, totalAssets: 4444444, totalLiabilities: 1111111 },
                message: 'How should I invest?'
            })
        });

        const res = await POST(req);
        expect(res.status).toBe(200);
        const data = await res.json();
        expect(data.response).toContain('Unknown / needs balance');
        expect(data.response).not.toContain('5,555,555');
        expect(data.response).not.toContain('4,444,444');
    });

    it('Item 3: uses explicitly labelled known subtotals when coverage is partial', async () => {
        const entity = createEntity(db, {
            name: 'Local User',
            type: 'person',
            currency: 'USD'
        });

        // Known account ($5,000)
        createAccount(db, {
            entity_id: entity.id,
            name: 'Checking',
            type: 'asset',
            sub_type: 'checking',
            currency: 'USD',
            tracking_mode: 'transactions',
            opening_balance_cents: 500000,
            opening_date: '2026-01-01'
        });

        // Unrecorded account (unknown balance)
        createAccount(db, {
            entity_id: entity.id,
            name: 'Superannuation',
            type: 'asset',
            sub_type: 'investment',
            currency: 'USD',
            tracking_mode: 'balance'
        });

        const req = new NextRequest('http://localhost:4000/api/mentor', {
            method: 'POST',
            headers: {
                host: 'localhost:4000',
                origin: 'http://localhost:4000',
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                mentor: { name: 'Naval', archetype: 'Philosopher' },
                mode: 'reflect',
                userContext: { currency: 'USD', netWorth: 7777777 },
                message: 'Evaluate my asset posture'
            })
        });

        const res = await POST(req);
        expect(res.status).toBe(200);
        const data = await res.json();
        expect(data.response).toContain('Known Net Worth');
        expect(data.response).toContain('5,000.00 USD');
        expect(data.response).toContain('partial snapshot');
        expect(data.response).not.toContain('7,777,777');
    });

    it('blocks malicious cross-origin and untrusted host requests with HTTP 403', async () => {
        // Cross-origin attempt from evil.com
        const corsReq = new NextRequest('http://localhost:4000/api/mentor', {
            method: 'POST',
            headers: {
                host: 'localhost:4000',
                origin: 'https://evil-attacker.com',
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ message: 'steal data' })
        });
        const corsRes = await POST(corsReq);
        expect(corsRes.status).toBe(403);
        expect(corsRes.headers.get('Cache-Control')).toBe('private, no-store, max-age=0');

        // DNS rebinding attempt with external host header
        const rebindReq = new NextRequest('http://127.0.0.1:4000/api/mentor', {
            method: 'POST',
            headers: {
                host: 'attacker-domain.org:4000',
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ message: 'rebind' })
        });
        const rebindRes = await POST(rebindReq);
        expect(rebindRes.status).toBe(403);
    });
});
