/**
 * @vitest-environment happy-dom
 */
/**
 * Component-Level Integration Tests for DebtPayoffCalculator
 * 
 * Why this test suite exists:
 * Fulfills Item 5 Loading-State Correction:
 * - Exercises the ACTUAL <DebtPayoffCalculator /> component rather than duplicating its conditionals.
 * - Verifies loading state: matching vs mismatched debt currency.
 * - Verifies debt currency changes while mounted (preventing old currency amounts from reaching calculation).
 * - Verifies matching saved plans restore correctly.
 * - Deliberate user edits are preserved across ordinary rerenders.
 * - Verifies that previewing and initialization perform ZERO writes until explicit Save.
 * 
 * Tricky logic:
 * Uses vitest happy-dom environment and React 19 createRoot + act() to simulate real browser mounting,
 * loading transitions, user typing events, ordinary parent rerenders, and button clicks.
 * Running under happy-dom ensures React DOM's event delegation attaches real root listeners
 * on window and document.
 * 
 * Isolation Guarantee:
 * Uses isolated in-memory SQLite (:memory:) via createTestDb() and setTestDb().
 * Live vault (opennetworth.sqlite) is never opened or modified.
 * 
 * TODO: Add multi-currency debt payoff selection UI tests when Milestone 2 launches.
 */

import React, { act } from 'react';
import ReactDOM from 'react-dom/client';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import Database from 'better-sqlite3';

(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;

if (typeof (globalThis as any).ResizeObserver === 'undefined') {
    (globalThis as any).ResizeObserver = class {
        observe() {}
        unobserve() {}
        disconnect() {}
    };
}
import { createTestDb, setTestDb, closeDb } from '@/infrastructure/sqlite/db';
import { Liability } from '@/features/liabilities/types';
import { CurrencyCode } from '@/types';
import { POST as vaultPost, GET as vaultGet } from '@/app/api/vault/route';
import { GET as settingsGet, POST as settingsPost, DELETE as settingsDelete } from '@/app/api/settings/route';

// The component reads its saved plan from the settings kv via /api/settings
// (Phase 2.5); bridge that URL to the real route handlers on the test DB.
const vaultFetchMock = vi.fn(async (url: any, init?: RequestInit) => {
    const urlStr = String(url);
    if (urlStr.includes('/api/vault')) {
        const method = init?.method?.toUpperCase() || 'GET';
        const req = new Request('http://localhost:4000/api/vault', init);
        if (method === 'GET') {
            return vaultGet(req);
        }
        return vaultPost(req);
    }
    if (urlStr.includes('/api/settings')) {
        const method = init?.method?.toUpperCase() || 'GET';
        const req = new Request('http://localhost:4000/api/settings', init);
        if (method === 'GET') {
            return settingsGet(req);
        }
        if (method === 'POST') {
            return settingsPost(req);
        }
        return settingsDelete(req);
    }
    if (urlStr.includes('/api/accounting/balances')) {
        return new Response(JSON.stringify({
            success: true,
            summary: {
                net_worth: 0,
                total_assets: 0,
                total_liabilities: 0,
                currency: 'USD',
                accounts: [],
                unrecorded_accounts: []
            }
        }), { status: 200 });
    }
    if (urlStr.includes('/api/accounting')) {
        return new Response(JSON.stringify({
            success: true,
            accounts: []
        }), { status: 200 });
    }
    return new Response(JSON.stringify({ error: 'Not found' }), { status: 404 });
});
(globalThis as any).fetch = vaultFetchMock;
if (typeof window !== 'undefined') {
    window.fetch = vaultFetchMock as any;
}

import { saveFreedomSettings, resetUiStateMigrationForTests } from '@/infrastructure/local_driver';

// Mock hook states
let mockLiabilities: Liability[] = [];
let mockIsLoading = false;
let mockBaseCurrency: CurrencyCode = 'USD';

vi.mock('@/features/liabilities/hooks/useLiabilitiesQuery', () => ({
    useLiabilitiesQuery: () => ({
        liabilities: mockLiabilities,
        isLoading: mockIsLoading,
        error: null,
        addLiability: vi.fn(),
        updateLiability: vi.fn(),
        deleteLiability: vi.fn(),
        isAdding: false,
        isUpdating: false,
        isDeleting: false
    })
}));

vi.mock('@/features/dashboard/hooks/useNetWorth', () => ({
    useNetWorth: () => ({
        baseCurrency: mockBaseCurrency,
        metrics: {} as any,
        rawTotals: {} as any,
        historicalTimeline: [],
        isLoading: false
    })
}));

vi.mock('@/features/accounting/hooks/useAccountingCheck', () => ({
    useAccountingCheck: () => ({
        hasModernRecords: false,
        hasModernLiabilities: false,
        hasModernAssets: false,
        isLoading: false
    })
}));

// The component checks demo mode to pick its settings source; these tests
// exercise the real-vault (SQLite) path.
vi.mock('@/contexts/ProfileContext', () => ({
    useProfile: () => ({
        profile: null,
        isLoading: false,
        isDemoMode: false,
        canEdit: true,
        refreshData: vi.fn(),
        switchProfile: vi.fn(),
        updateCurrency: vi.fn()
    })
}));

// Import the actual component under test
import DebtPayoffCalculator from './DebtPayoffCalculator';

describe('DebtPayoffCalculator Component-Level Loading-State & Currency Consistency', () => {
    let testDb: Database.Database;
    let container: HTMLElement;
    let root: ReactDOM.Root;

    const usdDebts: Liability[] = [
        {
            id: 'debt-usd-1',
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

    const audDebts: Liability[] = [
        {
            id: 'debt-aud-1',
            user_id: 'local_user',
            name: 'NAB Personal Loan',
            type: 'other',
            balance: 5000,
            interest_rate: 10.0,
            minimum_payment: 150,
            is_good_debt: false,
            currency: 'AUD',
            last_updated: '2026-09-22'
        }
    ];

    function setInputValue(input: HTMLInputElement, value: string) {
        const set = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value')?.set
            || Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set;
        if (set) {
            set.call(input, value);
        } else {
            input.value = value;
        }
        input.dispatchEvent(new window.Event('input', { bubbles: true }));
        input.dispatchEvent(new window.Event('change', { bubbles: true }));
    }

    beforeEach(() => {
        testDb = createTestDb();
        setTestDb(testDb);

        // Setup clean localStorage
        window.localStorage.clear();

        // Each test gets a fresh DB; let the boot migration re-check the marker
        // against it instead of trusting a resolved promise from a prior test.
        resetUiStateMigrationForTests();

        // Bridge fetch to vault handlers for SQLite persistence
        (globalThis as any).fetch = vaultFetchMock;
        window.fetch = vaultFetchMock as any;

        container = document.createElement('div') as unknown as HTMLElement;
        document.body.appendChild(container as any);
        root = ReactDOM.createRoot(container as any);
    });

    afterEach(() => {
        if (root) {
            try {
                act(() => {
                    root.unmount();
                });
            } catch (e) {
                // Ignore unmount error if already unmounted
            }
        }
        if (container) {
            container.remove();
        }
        closeDb();
        setTestDb(null);
        vi.restoreAllMocks();
    });

    /**
     * Test 1: Loading → matching currency.
     * 
     * Why this test exists:
     * Verifies Reproduction 2 fix:
     * When dashboard baseCurrency is AUD, saved plan is USD 500, and debts initially load:
     * - The calculator must NOT lock in 0 while loading.
     * - When USD debts load, the matching saved plan (USD 500) must be correctly restored.
     * - Zero writes to SQLite occur during loading or mounting.
     */
    it('Loading → matching currency: restores matching saved plan correctly without writing', async () => {
        // Seed saved plan in USD 500
        await saveFreedomSettings({ strategy: 'avalanche', extraMonthlyPayment: 500, currency: 'USD' });
        const stored = window.localStorage.getItem('opennetworth_freedom_settings');
        expect(stored).toContain('"extraMonthlyPayment":500');

        // Dashboard is AUD, debts initially loading
        mockBaseCurrency = 'AUD';
        mockIsLoading = true;
        mockLiabilities = [];

        // Mount actual component
        await act(async () => {
            root.render(<DebtPayoffCalculator />);
        });

        // While loading, skeleton is displayed
        expect(container.innerHTML).toContain('animate-pulse');
        expect(container.querySelector('input')).toBeNull();

        // Ensure zero writes to SQLite while loading
        const initialRecurring = testDb.prepare("SELECT * FROM recurring_transactions WHERE id = 'debt-freedom-accelerator'").get();
        expect(initialRecurring).toBeUndefined();

        // Debts finish loading with USD debt (matching saved plan currency)
        mockIsLoading = false;
        mockLiabilities = usdDebts;

        await act(async () => {
            root.render(<DebtPayoffCalculator />);
        });

        // Skeleton is gone, calculator controls are active
        expect(container.innerHTML).not.toContain('animate-pulse');

        // Input must display the restored matching amount (500), NOT 0!
        const input = container.querySelector('input[type="number"]') as HTMLInputElement;
        expect(input).not.toBeNull();
        expect(input.value).toBe('500');

        // Currency badge displays USD
        expect(container.textContent).toContain('USD');

        // No currency mismatch banner
        expect(container.textContent).not.toContain('Currency Mismatch: Plan Review Required');

        // Active plan badge shows saved USD
        expect(container.textContent).toContain('Active plan saved (USD)');

        // Still zero writes to SQLite
        const afterLoadRecurring = testDb.prepare("SELECT * FROM recurring_transactions WHERE id = 'debt-freedom-accelerator'").get();
        expect(afterLoadRecurring).toBeUndefined();
    });

    /**
     * Test 2: Loading → mismatched currency.
     * 
     * Why this test exists:
     * Verifies Reproduction 1 fix:
     * When saved plan is USD 500, debts initially load, and AUD debts finish loading:
     * - The calculator must NOT silently apply 500 AUD.
     * - The extra payment input must initialize to 0.
     * - The review warning banner must appear.
     * - Amortization calculation must use 0 extra payment (minimum only).
     * - Zero writes to SQLite occur.
     */
    it('Loading → mismatched currency: defaults extraPayment to 0 and shows review banner without applying USD to AUD', async () => {
        // Seed saved plan in USD 500
        await saveFreedomSettings({ strategy: 'avalanche', extraMonthlyPayment: 500, currency: 'USD' });

        // Initially loading
        mockBaseCurrency = 'USD';
        mockIsLoading = true;
        mockLiabilities = [];

        await act(async () => {
            root.render(<DebtPayoffCalculator />);
        });
        expect(container.innerHTML).toContain('animate-pulse');

        // Debts finish loading with AUD debts (mismatch with saved USD 500!)
        mockIsLoading = false;
        mockLiabilities = audDebts;

        await act(async () => {
            root.render(<DebtPayoffCalculator />);
        });

        // Input must default to 0 for the mismatched debt currency, NOT silently apply 500!
        const input = container.querySelector('input[type="number"]') as HTMLInputElement;
        expect(input).not.toBeNull();
        expect(input.value).toBe('0');

        // Currency badge displays AUD
        expect(container.textContent).toContain('AUD');

        // Currency mismatch banner must be prominently displayed
        expect(container.textContent).toContain('Currency Mismatch: Plan Review Required');
        expect(container.textContent).toContain('Your saved plan was configured in USD ($500/mo), but your active debts are in AUD');

        // Persistence action bar reflects review required state
        expect(container.textContent).toContain('Saved in USD — review required before saving');

        // Verify zero writes to SQLite
        const recurring = testDb.prepare("SELECT * FROM recurring_transactions WHERE id = 'debt-freedom-accelerator'").get();
        expect(recurring).toBeUndefined();
    });

    /**
     * Test 3: Debt currency changes while the calculator is mounted.
     * 
     * Why this test exists:
     * When active liabilities change currency (e.g. from USD to AUD, or AUD to USD) while mounted:
     * - An amount entered in a previous currency must NEVER cross into the new currency.
     * - If the new currency matches the saved plan, it restores matching saved plan.
     * - If the new currency does not match, it resets to 0.
     */
    it('Debt currency changes while mounted: prevents previous currency amount from reaching calculation', async () => {
        // Saved plan is USD 500
        await saveFreedomSettings({ strategy: 'avalanche', extraMonthlyPayment: 500, currency: 'USD' });

        // Mounted with USD debts
        mockIsLoading = false;
        mockBaseCurrency = 'USD';
        mockLiabilities = usdDebts;

        await act(async () => {
            root.render(<DebtPayoffCalculator />);
        });

        let input = container.querySelector('input[type="number"]') as HTMLInputElement;
        expect(input.value).toBe('500');

        // User edits the amount in USD to 350
        act(() => {
            setInputValue(input, '350');
        });
        input = container.querySelector('input[type="number"]') as HTMLInputElement;
        expect(input.value).toBe('350');

        // Now active liabilities switch to AUD debts while calculator remains mounted
        mockLiabilities = audDebts;

        await act(async () => {
            root.render(<DebtPayoffCalculator />);
        });

        // The 350 USD amount must NOT leak into AUD! It must reset to 0 for review.
        input = container.querySelector('input[type="number"]') as HTMLInputElement;
        expect(input.value).toBe('0');
        expect(container.textContent).toContain('AUD');
        expect(container.textContent).toContain('Currency Mismatch: Plan Review Required');

        // Switch back to USD debts while mounted
        mockLiabilities = usdDebts;

        await act(async () => {
            root.render(<DebtPayoffCalculator />);
        });

        // Restores the saved matching USD plan (500)
        input = container.querySelector('input[type="number"]') as HTMLInputElement;
        expect(input.value).toBe('500');
        expect(container.textContent).not.toContain('Currency Mismatch: Plan Review Required');
    });

    /**
     * Test 4: User enters a reviewed amount, then an ordinary rerender occurs.
     * 
     * Why this test exists:
     * Deliberate user modifications must be preserved across ordinary rerenders
     * (e.g. parent rerender, prop change, internal state re-evaluation) as long as
     * the debt currency has not changed.
     */
    it('Preserves deliberate user edits during ordinary rerenders', async () => {
        // Saved plan is USD 500, debts are AUD (mismatch)
        await saveFreedomSettings({ strategy: 'avalanche', extraMonthlyPayment: 500, currency: 'USD' });

        mockIsLoading = false;
        mockLiabilities = audDebts;

        await act(async () => {
            root.render(<DebtPayoffCalculator />);
        });

        let input = container.querySelector('input[type="number"]') as HTMLInputElement;
        expect(input.value).toBe('0');

        // User reviews the situation and enters AUD 250
        act(() => {
            setInputValue(input, '250');
        });

        // Re-query input
        input = container.querySelector('input[type="number"]') as HTMLInputElement;
        expect(input.value).toBe('250');

        // Simulate multiple ordinary rerenders (e.g. parent component rerender)
        await act(async () => {
            root.render(<DebtPayoffCalculator />);
        });
        await act(async () => {
            root.render(<DebtPayoffCalculator />);
        });

        // User's deliberate 250 AUD entry must be PRESERVED across ordinary rerenders!
        input = container.querySelector('input[type="number"]') as HTMLInputElement;
        expect(input.value).toBe('250');

        // Verify zero writes have occurred to SQLite
        const recurring = testDb.prepare("SELECT * FROM recurring_transactions WHERE id = 'debt-freedom-accelerator'").get();
        expect(recurring).toBeUndefined();
    });

    /**
     * Test 5: No persistence until explicit Save.
     * 
     * Why this test exists:
     * Confirms Handover Section 15 & 16:
     * Exploring scenarios, typing in the extra payment input, and rerendering causes
     * zero database writes until the user explicitly clicks "Save Plan to Budget".
     */
    it('No persistence until explicit Save: commits reviewed plan only when button clicked', async () => {
        // Saved plan is USD 500, debts are AUD
        await saveFreedomSettings({ strategy: 'avalanche', extraMonthlyPayment: 500, currency: 'USD' });

        mockIsLoading = false;
        mockLiabilities = audDebts;

        await act(async () => {
            root.render(<DebtPayoffCalculator />);
        });

        const input = container.querySelector('input[type="number"]') as HTMLInputElement;
        expect(input.value).toBe('0');

        // User enters AUD 300
        act(() => {
            setInputValue(input, '300');
        });
        expect(input.value).toBe('300');

        // Verify SQLite before clicking Save: NO writes have been made for AUD 300!
        const beforeSaveSettings = testDb.prepare("SELECT value FROM settings WHERE key = 'freedomSettings'").get() as any;
        expect(JSON.parse(beforeSaveSettings.value).currency).toBe('USD');

        const beforeSaveRecurring = testDb.prepare("SELECT * FROM recurring_transactions WHERE id = 'debt-freedom-accelerator'").get();
        expect(beforeSaveRecurring).toBeUndefined();

        // Find "Save Plan to Budget" button
        const saveButton = Array.from(container.querySelectorAll('button')).find(
            b => b.textContent?.includes('Save Plan to Budget')
        ) as HTMLButtonElement;
        expect(saveButton).not.toBeNull();
        expect(saveButton.disabled).toBe(false);

        // Explicitly click Save Plan
        await act(async () => {
            saveButton.click();
        });

        // Verify SQLite after clicking Save: persisted plan has AUD 300!
        const afterSaveSettings = testDb.prepare("SELECT value FROM settings WHERE key = 'freedomSettings'").get() as any;
        const savedData = JSON.parse(afterSaveSettings.value);
        expect(savedData.extraMonthlyPayment).toBe(300);
        expect(savedData.currency).toBe('AUD');

        // Verify recurring accelerator in SQLite
        const afterSaveRecurring = testDb.prepare("SELECT * FROM recurring_transactions WHERE id = 'debt-freedom-accelerator'").get() as any;
        expect(afterSaveRecurring).toBeDefined();
        expect(afterSaveRecurring.amount).toBe(300);
        expect(afterSaveRecurring.currency).toBe('AUD');
        expect(afterSaveRecurring.is_active).toBe(1);

        // In the UI, mismatch warning should be gone and active plan saved badge should show AUD
        expect(container.textContent).toContain('Active plan saved (AUD)');
        expect(container.textContent).not.toContain('Currency Mismatch: Plan Review Required');
    });
});
