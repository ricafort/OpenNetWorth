import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import Database from 'better-sqlite3';
import { POST } from './route';
import { setTestDb } from '@/infrastructure/sqlite/db';
import { initAccountingSchema } from '@/lib/domain/accounting/schema';
import { createEntity, createAccount } from '@/lib/domain/accounting/accountService';
import { recordBalanceObservation } from '@/lib/domain/accounting/balanceObservationService';
import { NextRequest } from 'next/server';

describe('Balance Reconciliation API - Modes & Validation', () => {
    let db: Database.Database;
    let householdId: string;
    let accountId: string;
    let observationId: string;

    beforeEach(() => {
        db = new Database(':memory:');
        db.pragma('foreign_keys = ON');
        initAccountingSchema(db);
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

    it('rejects ambiguous combinations (multiple modes)', async () => {
        const { status, data } = await makeRequest({
            account_id: accountId,
            observation_id: observationId,
            latest: true
        });

        expect(status).toBe(400);
        expect(data.error).toContain('Ambiguous request');
    });

    it('rejects observation ID that does not match account', async () => {
        const { account: otherAccount } = createAccount(db, {
            entity_id: householdId,
            name: 'Other',
            type: 'asset',
            sub_type: 'checking',
            currency: 'USD',
            tracking_mode: 'transactions'
        });

        const { status, data } = await makeRequest({
            account_id: otherAccount.id, // requested account
            observation_id: observationId // belongs to original account
        });

        expect(status).toBe(400);
        expect(data.error).toContain('Observation does not belong to the requested account');
    });

    it('accepts mode 1: observation_id', async () => {
        const { status, data } = await makeRequest({
            account_id: accountId,
            observation_id: observationId
        });

        expect(status).toBe(200);
        expect(data.reconciliation.status).toBe('matched');
    });

    it('accepts mode 2: latest', async () => {
        const { status, data } = await makeRequest({
            account_id: accountId,
            latest: true
        });

        expect(status).toBe(200);
        expect(data.reconciliation.status).toBe('matched');
    });

    it('accepts mode 3: preview (unsaved)', async () => {
        const { status, data } = await makeRequest({
            account_id: accountId,
            amount_cents: 25000,
            currency: 'USD',
            balance_kind: 'statement_closing_balance',
            effective_date: '2023-01-31'
        });

        expect(status).toBe(200);
        expect(data.reconciliation.status).toBe('discrepancy');
        expect(data.reconciliation.diff_cents).toBe(15000);
    });
});
