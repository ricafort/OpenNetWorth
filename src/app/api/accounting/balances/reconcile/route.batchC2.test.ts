import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import Database from 'better-sqlite3';
import { POST } from './route';
import { setTestDb } from '@/infrastructure/sqlite/db';
import { runMigrations } from '@/infrastructure/sqlite/migrations';
import { createEntity, createAccount } from '@/lib/domain/accounting/accountService';
import { recordBalanceObservation } from '@/lib/domain/accounting/balanceObservationService';
import { NextRequest } from 'next/server';

describe('Balance Reconciliation API - Batch C2 Corrections', () => {
    let db: Database.Database;
    let householdId: string;
    let accountId: string;
    let observationId: string;

    beforeEach(() => {
        db = new Database(':memory:');
        db.pragma('foreign_keys = ON');
        runMigrations(db);
        setTestDb(db);

        const household = createEntity(db, { name: 'Household', type: 'household', currency: 'USD' });
        householdId = household.id;

        const { account } = createAccount(db, {
            entity_id: householdId,
            name: 'API Test Bank',
            type: 'asset',
            sub_type: 'checking',
            currency: 'USD',
            tracking_mode: 'transactions',
            opening_balance_cents: 10000,
            opening_date: '2023-01-01'
        });
        accountId = account.id;

        const obs = recordBalanceObservation(db, {
            account_id: accountId,
            amount_cents: 10000,
            currency: 'USD',
            balance_kind: 'statement_closing_balance',
            effective_date: '2023-01-31',
            source_type: 'manual'
        });
        
        // Manually update to 'accepted' so it can be reconciled against
        db.prepare("UPDATE balance_observations SET review_status = 'accepted' WHERE id = ?").run(obs.id);
        observationId = obs.id;
    });

    afterEach(() => {
        setTestDb(null);
        try {
            db.close();
        } catch {
            // Already closed
        }
    });

    const makeRequest = async (body: any) => {
        const req = new NextRequest('http://localhost/api/accounting/balances/reconcile', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body)
        });
        const res = await POST(req);
        const data = await res.json();
        return { status: res.status, data };
    };

    it('rejects latest parameter if it is not boolean true', async () => {
        const { status, data } = await makeRequest({
            account_id: accountId,
            latest: "true" // string instead of boolean
        });

        expect(status).toBe(400);
        expect(data.error).toContain('latest must be boolean true');
    });

    it('rejects superseded observations', async () => {
        // Manually update observation to superseded
        db.prepare("UPDATE balance_observations SET review_status = 'superseded' WHERE id = ?").run(observationId);

        const { status, data } = await makeRequest({
            account_id: accountId,
            observation_id: observationId
        });

        expect(status).toBe(400);
        expect(data.error).toContain('replaced by a reviewed correction');
    });

    it('rejects fractional amounts (not a safe integer)', async () => {
        const { status, data } = await makeRequest({
            account_id: accountId,
            amount_cents: 25000.5,
            currency: 'USD',
            balance_kind: 'statement_closing_balance',
            effective_date: '2023-01-31'
        });

        expect(status).toBe(400);
        // From domain service ValidationError
        expect(data.error).toContain('Amount must be a safe integer of minor units (cents).');
    });

    it('rejects unsupported currency (USD->AUD mismatch)', async () => {
        const { status, data } = await makeRequest({
            account_id: accountId,
            amount_cents: 25000,
            currency: 'AUD', // Account is USD
            balance_kind: 'statement_closing_balance',
            effective_date: '2023-01-31'
        });

        expect(status).toBe(400);
        // From domain service ValidationError
        expect(data.error).toContain('Currency mismatch: Expected USD but got AUD.');
    });

    it('rejects unsupported balance kinds', async () => {
        const { status, data } = await makeRequest({
            account_id: accountId,
            amount_cents: 25000,
            currency: 'USD',
            balance_kind: 'unsupported_magic_balance',
            effective_date: '2023-01-31'
        });

        expect(status).toBe(400);
        // From domain service ValidationError
        expect(data.error).toContain('Invalid or unsupported balance kind');
    });
});
