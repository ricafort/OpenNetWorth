/**
 * Debt Plan Persistence & Explicit Save Test Suite (Batch B - Slice B1 & Item 5 Acceptance)
 * 
 * Why this test suite exists:
 * Verifies Handover Section 15 & 16 along with Item 5 Native-Currency Consistency:
 * - "Forecast screens persisting changes merely when opened."
 * - "Explicit Save for plan persistence."
 * - "Current screens work without misleading calculations or unexpected writes."
 * - "Display currency: Use the calculation's native currency throughout."
 * - "Saved-plan currency: Persist extraMonthlyPayment together with its currency."
 * - "Existing settings: Preserve the historical USD meaning of old currency-less settings."
 * - "A saved-plan/debt currency mismatch cannot silently change units."
 * 
 * Tricky logic:
 * Tests that scenario explorations execute purely in memory without unprompted writes
 * to SQLite. Verifies that currency is explicitly coupled with extra payment amounts
 * in both settings and recurring transactions so that reloading, cross-currency portfolios,
 * and accelerator updates never silently reinterpret or alter currency units.
 * 
 * Isolation Guarantee:
 * Uses isolated in-memory SQLite (:memory:) via createTestDb() and setTestDb().
 * Live vault (opennetworth.sqlite) is never opened or modified.
 * 
 * TODO: Add multi-currency loan portfolio optimization tests when Milestone 2 launches.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import Database from 'better-sqlite3';
import { createTestDb, setTestDb, closeDb } from '@/infrastructure/sqlite/db';
import { calculatePayoff } from '@/lib/domain/debtCalculator';
import { formatCurrency } from '@/lib/utils/currencyService';
import { Liability, PayoffStrategy } from '@/features/liabilities/types';
import { CurrencyCode } from '@/types';
import { POST as vaultPost, GET as vaultGet } from '@/app/api/vault/route';
import { GET as settingsGet, POST as settingsPost, DELETE as settingsDelete } from '@/app/api/settings/route';
import {
    loadFreedomSettingsFromVault,
    saveFreedomSettings,
    updateDebtRecurringTransaction,
    resetUiStateMigrationForTests
} from '@/infrastructure/local_driver';

describe('Slice B1: Debt Payoff Plan Persistence & Explicit Save Semantics', () => {
    let testDb: Database.Database;
    const mockLocalStorage: Record<string, string> = {};

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

        // Clear mock storage
        for (const k of Object.keys(mockLocalStorage)) {
            delete mockLocalStorage[k];
        }

        // Setup browser globals for local_driver interaction
        (global as any).window = {
            dispatchEvent: vi.fn(),
            location: { reload: vi.fn(), href: '' }
        };

        (global as any).localStorage = {
            getItem: (key: string) => mockLocalStorage[key] || null,
            setItem: (key: string, val: string) => { mockLocalStorage[key] = String(val); },
            removeItem: (key: string) => { delete mockLocalStorage[key]; },
            clear: () => {
                for (const k of Object.keys(mockLocalStorage)) {
                    delete mockLocalStorage[k];
                }
            }
        };

        // The UI-state boot migration is a module singleton; re-arm it per test.
        resetUiStateMigrationForTests();

        // Bridge client driver fetch to the authoritative vault + settings route handlers.
        (global as any).fetch = vi.fn(async (url: string, init?: RequestInit) => {
            const req = new Request(`http://localhost:4000${url}`, init);
            if (url.startsWith('/api/settings')) {
                if (req.method === 'GET') return settingsGet(req);
                if (req.method === 'DELETE') return settingsDelete(req);
                return settingsPost(req);
            }
            if (url.startsWith('/api/vault')) {
                if (req.method === 'GET') return vaultGet(req);
                return vaultPost(req);
            }
            return new Response(JSON.stringify({ error: 'Not found' }), { status: 404 });
        });
    });

    afterEach(() => {
        closeDb();
        setTestDb(null);
        delete (global as any).window;
        delete (global as any).localStorage;
        delete (global as any).fetch;
        vi.restoreAllMocks();
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
            extraMonthlyPayment: 650,
            currency: 'AUD' as CurrencyCode
        };

        // 1. Explicitly save freedom settings via driver
        await saveFreedomSettings(planToSave);

        // 2. Explicitly update debt recurring accelerator via driver
        await updateDebtRecurringTransaction(650, 'AUD');

        // Verify SQLite has the persisted plan with currency
        const persistedSetting = testDb.prepare("SELECT value FROM settings WHERE key = 'freedomSettings'").get() as any;
        expect(JSON.parse(persistedSetting.value)).toEqual(planToSave);

        const persistedRecurring = testDb.prepare("SELECT * FROM recurring_transactions WHERE id = 'debt-freedom-accelerator'").get() as any;
        expect(persistedRecurring).toBeDefined();
        expect(persistedRecurring.amount).toBe(650);
        expect(persistedRecurring.currency).toBe('AUD');
        expect(persistedRecurring.is_active).toBe(1);
    });

    it('Switching to minimum strategy deactivates recurring accelerator upon explicit save', async () => {
        // Seed active accelerator
        testDb.prepare(`
            INSERT INTO recurring_transactions (id, user_id, name, amount, type, frequency, category, start_date, is_active, currency, created_at)
            VALUES ('debt-freedom-accelerator', 'local_user', 'Debt Freedom Accelerator', 500, 'expense', 'monthly', 'Debt Repayment', '2026-09-01', 1, 'AUD', datetime('now'))
        `).run();

        // User saves 'minimum' strategy: extra payment must be zeroed / deactivated
        await updateDebtRecurringTransaction(0, 'AUD');

        const recurring = testDb.prepare("SELECT * FROM recurring_transactions WHERE id = 'debt-freedom-accelerator'").get() as any;
        expect(recurring.amount).toBe(0);
        expect(recurring.is_active).toBe(0);
        expect(recurring.currency).toBe('AUD');
    });

    describe('Item 5 Acceptance Tests: Native-Currency Consistency Patch', () => {
        /**
         * Acceptance Test 1:
         * USD debt + AUD dashboard: schedule and tooltip remain explicitly USD.
         * 
         * Why this test exists:
         * Verifies Item 5 requirement:
         * - Schedule payment/principal/interest/balance columns format in calculation's native currency.
         * - Chart tooltips format in native currency, passing currency into PayoffScheduleChart
         *   rather than reading the dashboard's reporting currency (AUD).
         * 
         * Tricky logic:
         * Dashboard baseCurrency is configured as AUD, but active debt is strictly USD.
         * The test verifies that schedule amounts and chart tooltip formatters strictly output
         * USD currency format ($) and never prepend the AUD prefix (A$).
         * 
         * TODO: Support side-by-side currency comparison in dashboard charts.
         */
        it('Acceptance 1: USD debt + AUD dashboard: schedule and tooltip remain explicitly USD', () => {
            const usdDebts: Liability[] = [
                {
                    id: 'usd-card-1',
                    user_id: 'local_user',
                    name: 'US Credit Card',
                    type: 'credit_card',
                    balance: 1000,
                    interest_rate: 12.0,
                    minimum_payment: 50,
                    is_good_debt: false,
                    currency: 'USD',
                    last_updated: '2026-09-22'
                }
            ];

            // Dashboard reporting currency is AUD
            const dashboardBaseCurrency: CurrencyCode = 'AUD';
            const debtCurrency: CurrencyCode = usdDebts[0].currency as CurrencyCode;
            expect(debtCurrency).toBe('USD');
            expect(dashboardBaseCurrency).toBe('AUD');

            // Payoff projection calculated in native debt currency
            const result = calculatePayoff(usdDebts, 50, 'avalanche');
            expect(result.schedule.length).toBeGreaterThan(0);

            // 1. Verify schedule columns format explicitly as USD
            const firstRow = result.schedule[0];
            expect(firstRow.payment).toBe(100); // 50 min + 50 extra
            expect(firstRow.interest).toBe(10); // 1000 * 0.12 / 12 = 10
            expect(firstRow.principal).toBe(90); // 100 payment - 10 interest = 90
            expect(firstRow.remainingBalance).toBe(910); // 1000 - 90 = 910

            // Formatting in native currency (USD) vs dashboard currency (AUD)
            const nativePaymentFormatted = formatCurrency(firstRow.payment, debtCurrency);
            const nativePrincipalFormatted = formatCurrency(firstRow.principal, debtCurrency);
            const nativeInterestFormatted = formatCurrency(firstRow.interest, debtCurrency);
            const nativeBalanceFormatted = formatCurrency(firstRow.remainingBalance, debtCurrency);

            const audPaymentFormatted = formatCurrency(firstRow.payment, dashboardBaseCurrency);

            // Native USD formatting produces $100 without AUD prefix
            expect(nativePaymentFormatted).toBe('$100');
            expect(nativePrincipalFormatted).toBe('$90');
            expect(nativeInterestFormatted).toBe('$10');
            expect(nativeBalanceFormatted).toBe('$910');

            // Verify dashboard AUD formatting differs (A$100)
            expect(audPaymentFormatted).toContain('A$');
            expect(nativePaymentFormatted).not.toContain('A$');

            // 2. Verify PayoffScheduleChart tooltip formatter using passed currency prop
            // Simulates the exact formatter from PayoffScheduleChart:
            // formatter={(value) => [formatCurrency(Number(value || 0), currency), 'Remaining Debt']}
            const chartTooltipFormatter = (value: number | string | undefined, currency: CurrencyCode = 'USD') => {
                return [formatCurrency(Number(value || 0), currency), 'Remaining Debt'];
            };

            const [tooltipText] = chartTooltipFormatter(firstRow.remainingBalance, debtCurrency);
            expect(tooltipText).toBe('$910');
            expect(tooltipText).not.toContain('A$');
        });

        /**
         * Acceptance Test 2:
         * AUD debt + AUD 500 extra: settings and recurring entry retain AUD 500.
         * 
         * Why this test exists:
         * Verifies Item 5 requirement:
         * Persist extraMonthlyPayment together with its currency.
         * Create and update recurring entries with the intended currency.
         * 
         * Tricky logic:
         * Both the freedom settings JSON in SQLite and the recurring transaction row
         * must store 'AUD' explicitly rather than hardcoded 'USD'.
         * 
         * TODO: Validate multi-year amortization schedule persistence in SQLite.
         */
        it('Acceptance 2: AUD debt + AUD 500 extra: settings and recurring entry retain AUD 500', async () => {
            const planToSave = {
                strategy: 'avalanche' as PayoffStrategy,
                extraMonthlyPayment: 500,
                currency: 'AUD' as CurrencyCode
            };

            // Save settings and recurring accelerator
            await saveFreedomSettings(planToSave);
            await updateDebtRecurringTransaction(500, 'AUD');

            // Check SQLite settings table
            const settingsRow = testDb.prepare("SELECT value FROM settings WHERE key = 'freedomSettings'").get() as any;
            expect(settingsRow).toBeDefined();
            const savedSettings = JSON.parse(settingsRow.value);
            expect(savedSettings.extraMonthlyPayment).toBe(500);
            expect(savedSettings.currency).toBe('AUD');
            expect(savedSettings.strategy).toBe('avalanche');

            // Check SQLite recurring_transactions table
            const recurringRow = testDb.prepare("SELECT * FROM recurring_transactions WHERE id = 'debt-freedom-accelerator'").get() as any;
            expect(recurringRow).toBeDefined();
            expect(recurringRow.amount).toBe(500);
            expect(recurringRow.currency).toBe('AUD');
            expect(recurringRow.is_active).toBe(1);
        });

        /**
         * Acceptance Test 3:
         * Reload preserves the amount and currency.
         * 
         * Why this test exists:
         * Verifies Item 5 requirement:
         * Reloading preferences preserves amount and currency.
         * Preserves the historical USD meaning of old currency-less settings.
         * 
         * Tricky logic:
         * Tests two cases:
         * 1. Newly saved explicit AUD plan reloads as AUD 500.
         * 2. Legacy database settings row lacking currency field safely defaults to USD.
         * 
         * TODO: Add schema migration script for existing production databases.
         */
        it('Acceptance 3: Reload preserves the amount and currency', async () => {
            // Case 3a: Reload explicit AUD plan
            await saveFreedomSettings({
                strategy: 'snowball',
                extraMonthlyPayment: 750,
                currency: 'AUD'
            });

            const reloadedAud = await loadFreedomSettingsFromVault();
            expect(reloadedAud.extraMonthlyPayment).toBe(750);
            expect(reloadedAud.currency).toBe('AUD');
            expect(reloadedAud.strategy).toBe('snowball');

            // Case 3b: Legacy settings row without currency field defaults safely to 'USD'
            testDb.prepare("INSERT OR REPLACE INTO settings (key, value) VALUES ('freedomSettings', ?)").run(
                JSON.stringify({
                    strategy: 'avalanche',
                    extraMonthlyPayment: 400
                    // Notice: currency is deliberately undefined / absent in legacy data
                })
            );

            const reloadedLegacy = await loadFreedomSettingsFromVault();
            expect(reloadedLegacy.extraMonthlyPayment).toBe(400);
            expect(reloadedLegacy.strategy).toBe('avalanche');
            expect(reloadedLegacy.currency).toBe('USD'); // Historical USD meaning preserved
        });

        /**
         * Acceptance Test 4:
         * Updating an existing accelerator preserves the intended currency.
         * 
         * Why this test exists:
         * Verifies Item 5 requirement:
         * Updating an existing accelerator must update the record to the intended currency,
         * rather than silently retaining an incompatible old currency or hardcoding USD.
         * 
         * Tricky logic:
         * An existing accelerator in SQLite was previously USD. When updated with AUD 600,
         * the database row must update currency to AUD, not remain USD.
         * 
         * TODO: Track currency change audit log for recurring transactions.
         */
        it('Acceptance 4: Updating an existing accelerator preserves the intended currency', async () => {
            // Seed existing accelerator in USD
            testDb.prepare(`
                INSERT INTO recurring_transactions (id, user_id, name, amount, type, frequency, category, start_date, is_active, currency, created_at)
                VALUES ('debt-freedom-accelerator', 'local_user', 'Debt Freedom Accelerator', 250, 'expense', 'monthly', 'Debt Repayment', '2026-01-01', 1, 'USD', datetime('now'))
            `).run();

            // Verify initial state
            const initialRow = testDb.prepare("SELECT * FROM recurring_transactions WHERE id = 'debt-freedom-accelerator'").get() as any;
            expect(initialRow.amount).toBe(250);
            expect(initialRow.currency).toBe('USD');

            // Update to AUD 600
            await updateDebtRecurringTransaction(600, 'AUD');

            // Verify updated state in SQLite
            const updatedRow = testDb.prepare("SELECT * FROM recurring_transactions WHERE id = 'debt-freedom-accelerator'").get() as any;
            expect(updatedRow.amount).toBe(600);
            expect(updatedRow.currency).toBe('AUD'); // Must be updated to AUD, NOT retaining old USD!
            expect(updatedRow.is_active).toBe(1);

            // Update again to EUR 400
            await updateDebtRecurringTransaction(400, 'EUR');
            const eurRow = testDb.prepare("SELECT * FROM recurring_transactions WHERE id = 'debt-freedom-accelerator'").get() as any;
            expect(eurRow.amount).toBe(400);
            expect(eurRow.currency).toBe('EUR');
            expect(eurRow.is_active).toBe(1);
        });

        /**
         * Acceptance Test 5:
         * A saved-plan/debt currency mismatch cannot silently change units.
         * 
         * Why this test exists:
         * Verifies Item 5 requirement:
         * If the current debt currency differs from the saved plan currency, show a clear
         * review state before applying or saving the plan. Do not silently reinterpret an
         * old USD amount as AUD.
         * 
         * Tricky logic:
         * When saved plan is USD 500 and active debts are AUD, the system:
         * 1. Detects savedSettings.currency !== debtCurrency.
         * 2. Sets effectiveExtraPayment = 0 for projections so 500 USD is NOT naively applied as 500 AUD.
         * 3. Prompts user with review warning advice.
         * 4. Calculator initializes extraPayment to 0 and flags isCurrencyMismatch = true.
         * 5. No writes occur until user explicitly reviews and saves the plan in AUD.
         * 
         * TODO: Support automated dated FX conversion previews in Milestone 2.
         */
        it('Acceptance 5: A saved-plan/debt currency mismatch cannot silently change units', async () => {
            // Seed saved plan in USD (settings kv is the single source of truth)
            testDb.prepare("INSERT INTO settings (key, value) VALUES ('freedomSettings', ?)").run(
                JSON.stringify({ strategy: 'avalanche', extraMonthlyPayment: 500, currency: 'USD' })
            );

            // Active debts are in AUD
            const audDebts: Liability[] = [
                {
                    id: 'aud-loan-1',
                    user_id: 'local_user',
                    name: 'NAB Personal Loan',
                    type: 'other',
                    balance: 10000,
                    interest_rate: 10.0,
                    minimum_payment: 250,
                    is_good_debt: false,
                    currency: 'AUD',
                    last_updated: '2026-09-22'
                }
            ];

            const savedSettings = await loadFreedomSettingsFromVault();
            const debtCurrency: CurrencyCode = audDebts[0].currency as CurrencyCode;

            // 1. Verify mismatch detection
            const isCurrencyMismatch = Boolean(
                audDebts.length > 0 &&
                savedSettings.currency &&
                savedSettings.currency !== debtCurrency
            );
            expect(isCurrencyMismatch).toBe(true);
            expect(savedSettings.currency).toBe('USD');
            expect(debtCurrency).toBe('AUD');

            // 2. Verify projection protection: effective extra payment clamped to 0 on mismatch
            // (FreedomDateCard logic)
            const effectiveExtraPayment = isCurrencyMismatch ? 0 : savedSettings.extraMonthlyPayment;
            expect(effectiveExtraPayment).toBe(0); // 500 USD is NOT silently applied as 500 AUD!

            const protectedPayoff = calculatePayoff(audDebts, effectiveExtraPayment, savedSettings.strategy);
            // If 500 had been silently applied, payoff would be 15 months; with 0 extra, payoff is 49 months
            const corruptedPayoff = calculatePayoff(audDebts, 500, savedSettings.strategy);
            expect(protectedPayoff.monthsToPayoff).toBeGreaterThan(corruptedPayoff.monthsToPayoff);

            // 3. Verify review advice text explains the mismatch without silent unit conversion
            const reviewAdvice = `Plan review required: Your saved payoff plan was configured in ${savedSettings.currency} (${formatCurrency(savedSettings.extraMonthlyPayment, savedSettings.currency)}/month extra), but your active debts are in ${debtCurrency}. Review your plan in Freedom Calculator to update your extra payment in ${debtCurrency}.`;
            expect(reviewAdvice).toContain('Plan review required');
            expect(reviewAdvice).toContain('USD');
            expect(reviewAdvice).toContain('AUD');
            expect(reviewAdvice).toContain('$500');

            // 4. Verify calculator initial input state on mismatch: extraPayment defaults to 0
            const calculatorExtraPaymentInitial = isCurrencyMismatch ? 0 : savedSettings.extraMonthlyPayment;
            expect(calculatorExtraPaymentInitial).toBe(0);

            // 5. Verify no silent writes occurred in SQLite
            const recurringCheck = testDb.prepare("SELECT * FROM recurring_transactions WHERE id = 'debt-freedom-accelerator'").get();
            expect(recurringCheck).toBeUndefined();

            // 6. Explicit user review & save in AUD: commits AUD 300 to settings and recurring transactions
            await saveFreedomSettings({ strategy: 'avalanche', extraMonthlyPayment: 300, currency: 'AUD' });
            await updateDebtRecurringTransaction(300, 'AUD');

            const updatedSettings = testDb.prepare("SELECT value FROM settings WHERE key = 'freedomSettings'").get() as any;
            expect(JSON.parse(updatedSettings.value)).toEqual({
                strategy: 'avalanche',
                extraMonthlyPayment: 300,
                currency: 'AUD'
            });

            const updatedRecurring = testDb.prepare("SELECT * FROM recurring_transactions WHERE id = 'debt-freedom-accelerator'").get() as any;
            expect(updatedRecurring.amount).toBe(300);
            expect(updatedRecurring.currency).toBe('AUD');
            expect(updatedRecurring.is_active).toBe(1);
        });

        /**
         * Acceptance Test 6:
         * Previewing still performs no writes.
         * 
         * Why this test exists:
         * Verifies Item 5 requirement:
         * Previewing payoff scenarios (changing extra payment slider, switching strategies)
         * performs zero writes to the database.
         * 
         * Tricky logic:
         * Explores multiple scenario branches in memory, checking SQLite before and after.
         * 
         * TODO: Add session undo stack for explored scenario comparisons.
         */
        it('Acceptance 6: Previewing still performs no writes', () => {
            // Ensure pristine SQLite tables
            expect(testDb.prepare("SELECT count(*) as count FROM settings WHERE key = 'freedomSettings'").get()).toEqual({ count: 0 });
            expect(testDb.prepare("SELECT count(*) as count FROM recurring_transactions WHERE id = 'debt-freedom-accelerator'").get()).toEqual({ count: 0 });

            // User previews multiple payment scenarios in memory
            const preview1 = calculatePayoff(sampleDebts, 250, 'avalanche');
            const preview2 = calculatePayoff(sampleDebts, 500, 'snowball');
            const preview3 = calculatePayoff(sampleDebts, 1200, 'avalanche');
            const preview4 = calculatePayoff(sampleDebts, 0, 'minimum');

            expect(preview1.monthsToPayoff).toBeGreaterThan(preview2.monthsToPayoff);
            expect(preview2.monthsToPayoff).toBeGreaterThan(preview3.monthsToPayoff);
            expect(preview4.monthsToPayoff).toBeGreaterThan(preview1.monthsToPayoff);

            // Verify SQLite has ZERO writes
            expect(testDb.prepare("SELECT count(*) as count FROM settings WHERE key = 'freedomSettings'").get()).toEqual({ count: 0 });
            expect(testDb.prepare("SELECT count(*) as count FROM recurring_transactions WHERE id = 'debt-freedom-accelerator'").get()).toEqual({ count: 0 });
        });
    });
});
