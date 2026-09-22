/**
 * Debt Plan Persistence & Explicit Save Test Suite (Batch B - Slice B1)
 * 
 * Why this test exists:
 * Verifies Handover Section 15 & 16:
 * - "Forecast screens persisting changes merely when opened."
 * - "Explicit Save for plan persistence."
 * - "Current screens work without misleading calculations or unexpected writes."
 * 
 * Tricky logic:
 * Tests that debt payoff calculations (avalanche, snowball, minimum) execute purely
 * in memory during user scenario exploration. Database persistence of the freedom
 * settings and debt accelerator recurring transaction occurs ONLY upon explicit save.
 * 
 * Isolation Guarantee:
 * Uses isolated in-memory SQLite (:memory:) via createTestDb() and setTestDb().
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import Database from 'better-sqlite3';
import { createTestDb, setTestDb, closeDb } from '@/infrastructure/sqlite/db';
import { calculatePayoff } from '@/lib/domain/debtCalculator';
import { Liability, PayoffStrategy } from '@/features/liabilities/types';
import { POST as vaultPost } from '@/app/api/vault/route';

describe('Slice B1: Debt Payoff Plan Persistence & Explicit Save Semantics', () => {
    let testDb: Database.Database;

    const sampleDebts: Liability[] = [
        {
            id: 'debt-card-1',
            user_id: 'local_user',
            name: 'Visa Platinum',
            type: 'credit_card',
            balance: 6000,
            interest_rate: 19.99,
            minimum_payment: 150,
            is_good_debt: false,
            currency: 'AUD',
            last_updated: '2026-09-22'
        },
        {
            id: 'debt-loan-2',
            user_id: 'local_user',
            name: 'Car Loan',
            type: 'auto_loan',
            balance: 14000,
            interest_rate: 7.5,
            minimum_payment: 350,
            is_good_debt: false,
            currency: 'AUD',
            last_updated: '2026-09-22'
        }
    ];

    beforeEach(() => {
        testDb = createTestDb();
        setTestDb(testDb);
    });

    afterEach(() => {
        closeDb();
        setTestDb(null);
    });

    it('Scenario exploration computes payoff projections reactively in memory without writing to SQLite', () => {
        // Initial state in database: no recurring transactions and no freedom settings
        const initialSettings = testDb.prepare("SELECT * FROM settings WHERE key = 'freedomSettings'").get();
        const initialRecurring = testDb.prepare("SELECT * FROM recurring_transactions WHERE id = 'debt-freedom-accelerator'").get();
        expect(initialSettings).toBeUndefined();
        expect(initialRecurring).toBeUndefined();

        // User explores different extra payment scenarios in memory
        const baselineResult = calculatePayoff(sampleDebts, 0, 'minimum');
        const avalancheExplore500 = calculatePayoff(sampleDebts, 500, 'avalanche');
        const snowballExplore1000 = calculatePayoff(sampleDebts, 1000, 'snowball');

        // Verify calculations reflect scenarios
        expect(avalancheExplore500.monthsToPayoff).toBeLessThan(baselineResult.monthsToPayoff);
        expect(snowballExplore1000.monthsToPayoff).toBeLessThan(avalancheExplore500.monthsToPayoff);
        expect(avalancheExplore500.totalInterestPaid).toBeLessThan(baselineResult.totalInterestPaid);

        // Verify SQLite database has received ZERO automatic writes
        const afterExploreSettings = testDb.prepare("SELECT * FROM settings WHERE key = 'freedomSettings'").get();
        const afterExploreRecurring = testDb.prepare("SELECT * FROM recurring_transactions WHERE id = 'debt-freedom-accelerator'").get();
        expect(afterExploreSettings).toBeUndefined();
        expect(afterExploreRecurring).toBeUndefined();
    });

    it('Explicit save commits freedom settings and activates the recurring accelerator transaction', async () => {
        const planToSave = {
            strategy: 'avalanche' as PayoffStrategy,
            extraMonthlyPayment: 650
        };

        // 1. Explicitly save freedom settings
        const saveSettingsReq = new Request('http://localhost:4000/api/vault', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                action: 'scoped_save',
                entity: 'settings',
                item: {
                    key: 'freedomSettings',
                    value: planToSave
                }
            })
        });
        const saveSettingsRes = await vaultPost(saveSettingsReq);
        expect(saveSettingsRes.status).toBe(200);

        // 2. Explicitly update debt recurring accelerator
        const saveRecurringReq = new Request('http://localhost:4000/api/vault', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                action: 'scoped_save',
                entity: 'recurring',
                item: {
                    id: 'debt-freedom-accelerator',
                    user_id: 'local_user',
                    name: 'Debt Freedom Accelerator',
                    amount: 650,
                    type: 'expense',
                    frequency: 'monthly',
                    category: 'Debt Repayment',
                    start_date: '2026-09-22',
                    is_active: true,
                    currency: 'AUD'
                }
            })
        });
        const saveRecurringRes = await vaultPost(saveRecurringReq);
        expect(saveRecurringRes.status).toBe(200);

        // Verify SQLite has the persisted plan
        const persistedSetting = testDb.prepare("SELECT value FROM settings WHERE key = 'freedomSettings'").get() as any;
        expect(JSON.parse(persistedSetting.value)).toEqual(planToSave);

        const persistedRecurring = testDb.prepare("SELECT * FROM recurring_transactions WHERE id = 'debt-freedom-accelerator'").get() as any;
        expect(persistedRecurring).toBeDefined();
        expect(persistedRecurring.amount).toBe(650);
        expect(persistedRecurring.is_active).toBe(1);
    });

    it('Switching to minimum strategy deactivates recurring accelerator upon explicit save', async () => {
        // Seed active accelerator
        testDb.prepare(`
            INSERT INTO recurring_transactions (id, user_id, name, amount, type, frequency, category, start_date, is_active, currency, created_at)
            VALUES ('debt-freedom-accelerator', 'local_user', 'Debt Freedom Accelerator', 500, 'expense', 'monthly', 'Debt Repayment', '2026-09-01', 1, 'AUD', datetime('now'))
        `).run();

        // User saves 'minimum' strategy: extra payment must be zeroed / deactivated
        const deactivateReq = new Request('http://localhost:4000/api/vault', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                action: 'scoped_save',
                entity: 'recurring',
                item: {
                    id: 'debt-freedom-accelerator',
                    user_id: 'local_user',
                    name: 'Debt Freedom Accelerator',
                    amount: 0,
                    type: 'expense',
                    frequency: 'monthly',
                    category: 'Debt Repayment',
                    start_date: '2026-09-22',
                    is_active: false,
                    currency: 'AUD'
                }
            })
        });
        const res = await vaultPost(deactivateReq);
        expect(res.status).toBe(200);

        const recurring = testDb.prepare("SELECT * FROM recurring_transactions WHERE id = 'debt-freedom-accelerator'").get() as any;
        expect(recurring.amount).toBe(0);
        expect(recurring.is_active).toBe(0);
    });
});
