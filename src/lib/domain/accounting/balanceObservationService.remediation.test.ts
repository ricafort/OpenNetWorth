import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import Database from 'better-sqlite3';
import { initAccountingSchema } from './schema';
import { createEntity, createAccount } from './accountService';
import { recordBalanceObservation, getReconciliationComparison } from './balanceObservationService';

describe('Balance Observation Service - Remediation Tests', () => {
    let db: Database.Database;

    beforeEach(() => {
        db = new Database(':memory:');
        db.pragma('foreign_keys = ON');
        initAccountingSchema(db);
    });

    afterEach(() => {
        db.close();
    });

    it('rejects ambiguous reconciliation requests (missing history)', () => {
        const household = createEntity(db, { name: 'Household', type: 'household', currency: 'USD' });
        // Missing opening balance
        const { account: acc2 } = createAccount(db, {
            entity_id: household.id,
            name: 'No Opening',
            type: 'asset',
            sub_type: 'checking',
            currency: 'USD',
            tracking_mode: 'transactions'
        });

        const observation = recordBalanceObservation(db, {
            account_id: acc2.id,
            amount_cents: 50000,
            currency: 'USD',
            balance_kind: 'statement_closing_balance',
            effective_date: '2023-01-31',
            source_type: 'manual'
        });

        const result = getReconciliationComparison(db, acc2.id, observation);
        expect(result.status).toBe('insufficient_history');
        expect(result.notes).toContain('opening balance is required');
    });

    it('validates observation matches account ID', () => {
        const household = createEntity(db, { name: 'Household', type: 'household', currency: 'USD' });
        const { account } = createAccount(db, {
            entity_id: household.id,
            name: 'Test Bank',
            type: 'asset',
            sub_type: 'checking',
            currency: 'USD',
            tracking_mode: 'transactions',
            opening_balance_cents: 10000,
            opening_date: '2023-01-01'
        });

        const observation = recordBalanceObservation(db, {
            account_id: account.id,
            amount_cents: 15000,
            currency: 'USD',
            balance_kind: 'statement_closing_balance',
            effective_date: '2023-01-31',
            source_type: 'manual'
        });

        // Try reconciling with a different account ID
        const { account: acc2 } = createAccount(db, {
            entity_id: household.id,
            name: 'Other Bank',
            type: 'asset',
            sub_type: 'checking',
            currency: 'USD',
            tracking_mode: 'transactions',
            opening_balance_cents: 0,
            opening_date: '2023-01-01'
        });

        expect(() => getReconciliationComparison(db, acc2.id, observation)).toThrow('Failed to reconcile: Observation does not match the requested account.');
    });

    it('calculates diff correctly with full history', () => {
        const household = createEntity(db, { name: 'Household', type: 'household', currency: 'USD' });
        const { account } = createAccount(db, {
            entity_id: household.id,
            name: 'Test Bank',
            type: 'asset',
            sub_type: 'checking',
            currency: 'USD',
            tracking_mode: 'transactions',
            opening_balance_cents: 10000,
            opening_date: '2023-01-01'
        });

        const observation = recordBalanceObservation(db, {
            account_id: account.id,
            amount_cents: 10000,
            currency: 'USD',
            balance_kind: 'statement_closing_balance',
            effective_date: '2023-01-15',
            source_type: 'manual'
        });

        const result = getReconciliationComparison(db, account.id, observation);
        expect(result.status).toBe('matched');
        expect(result.diff_cents).toBe(0);
        expect(result.recorded_ledger_cents).toBe(10000);
        expect(result.owner_name).toBe('Household');
    });
});
