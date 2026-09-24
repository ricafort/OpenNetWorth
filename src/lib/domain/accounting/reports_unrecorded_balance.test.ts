/**
 * Reports & Scope Net Worth Unrecorded Balance Observation Tests
 *
 * Why this file exists:
 * Fulfills Independent Assessment Finding B:
 * Balance-tracked accounts without accepted observations or opening balances must not
 * be silently assumed to be $0.00.
 *
 * Tricky logic:
 * - ScopeNetWorthResult and EntityNetWorthResult must disclose is_partial: true and
 *   track unrecorded_count.
 * - Items with unknown balances must report formatted_attributed_balance as "Unknown (Needs balance)"
 *   with is_unknown: true.
 * - ConsolidatedNetWorthResult must mark is_complete: false if any included balance-tracked
 *   account lacks an accepted valuation observation.
 *
 * All operations execute in-memory; zero modifications to live SQLite storage.
 *
 * TODO items:
 * - Milestone 2: Test automatic background balance reminder dispatch when is_partial is true.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import Database from 'better-sqlite3';
import { initAccountingSchema } from './schema';
import { createEntity, createAccount } from './accountService';
import { getScopeNetWorth, getEntityNetWorth, getConsolidatedNetWorth } from './balanceService';
import { recordBalanceObservation } from './balanceObservationService';

describe('Reports Unrecorded Balance Accounts Integrity (Finding B)', () => {
    let db: Database.Database;

    beforeEach(() => {
        db = new Database(':memory:');
        initAccountingSchema(db);
    });

    afterEach(() => {
        db.close();
    });

    it('flags unrecorded balance-tracked accounts and sets is_partial without fabricating $0.00', () => {
        const alice = createEntity(db, {
            name: 'Alice Smith',
            type: 'person',
            currency: 'AUD'
        });

        // Mode B account with transactions / opening balance
        createAccount(db, {
            entity_id: alice.id,
            name: 'Everyday Checking',
            type: 'asset',
            sub_type: 'checking',
            currency: 'AUD',
            tracking_mode: 'transactions',
            opening_balance_cents: 500000, // $5,000.00
            opening_date: '2026-01-01'
        });

        // Mode A account tracking balances, but NO observation recorded yet
        const { account: superFund } = createAccount(db, {
            entity_id: alice.id,
            name: 'Industry Superannuation',
            type: 'asset',
            sub_type: 'investment',
            currency: 'AUD',
            tracking_mode: 'balance'
            // no opening_balance_cents
        });

        // 1. Check getScopeNetWorth
        const scopeResult = getScopeNetWorth(db, alice.id, 'individual', '2026-09-22');
        expect(scopeResult.is_partial).toBe(true);
        expect(scopeResult.unrecorded_count).toBe(1);
        expect(scopeResult.unrecorded_accounts?.[0].id).toBe(superFund.id);

        // Headline net worth only reflects known balance ($5,000.00)
        expect(scopeResult.net_worth_cents_by_currency['AUD']).toBe(500000);
        expect(scopeResult.total_assets_cents_by_currency['AUD']).toBe(500000);

        // Superannuation item in table must be marked unknown
        const superItem = scopeResult.items.find(i => i.account_id === superFund.id);
        expect(superItem).toBeDefined();
        expect(superItem?.is_unknown).toBe(true);
        expect(superItem?.formatted_attributed_balance).toBe('Unknown (Needs balance)');
        expect(superItem?.formatted_full_balance).toBe('Unknown (Needs balance)');

        // 2. Check getEntityNetWorth
        const entityResult = getEntityNetWorth(db, alice.id, '2026-09-22');
        expect(entityResult.is_partial).toBe(true);
        expect(entityResult.unrecorded_count).toBe(1);
        expect(entityResult.net_worth_cents_by_currency['AUD']).toBe(500000);

        // 3. Check getConsolidatedNetWorth
        const consolidatedResult = getConsolidatedNetWorth(db, alice.id, 'AUD', '2026-09-22');
        expect(consolidatedResult.is_complete).toBe(false);
        expect(consolidatedResult.unrecorded_count).toBe(1);
        expect(consolidatedResult.consolidated_total_cents).toBeNull();

        // 4. Now record an accepted observation for the superannuation account
        recordBalanceObservation(db, {
            account_id: superFund.id,
            amount_cents: 8000000, // $80,000.00
            balance_kind: 'current_balance',
            effective_date: '2026-09-20',
            source_type: 'manual',
            source_reference: 'Quarterly Statement',
            review_status: 'accepted'
        });

        // Verify that report aggregations now resolve completely
        const scopeAfter = getScopeNetWorth(db, alice.id, 'individual', '2026-09-22');
        expect(scopeAfter.is_partial).toBe(false);
        expect(scopeAfter.unrecorded_count).toBe(0);
        // Total = $5,000 + $80,000 = $85,000.00 (8,500,000 cents)
        expect(scopeAfter.total_assets_cents_by_currency['AUD']).toBe(8500000);
        expect(scopeAfter.net_worth_cents_by_currency['AUD']).toBe(8500000);

        const superItemAfter = scopeAfter.items.find(i => i.account_id === superFund.id);
        expect(superItemAfter?.is_unknown).toBe(false);
        expect(superItemAfter?.formatted_attributed_balance).toBe('A$80,000.00');

        const consAfter = getConsolidatedNetWorth(db, alice.id, 'AUD', '2026-09-22');
        expect(consAfter.is_complete).toBe(true);
        expect(consAfter.unrecorded_count).toBe(0);
        expect(consAfter.consolidated_total_cents).toBe(8500000);
    });
});
