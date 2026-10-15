/**
 * @vitest-environment happy-dom
 */

/**
 * Batch B Delivery Remediation Integration Tests
 * 
 * Why this file exists:
 * Fulfills all 4 remediation requirements for OpenNetWorth Batch B First Delivery:
 * 1. Currency scaling: JPY 10,000 displays as ¥10,000 across rows, totals, and adapters (never ¥100).
 *    AUD 989.77 displays as A$989.77. Tests render actual components under happy-dom.
 * 2. Correct loading and error states:
 *    - Failed summary never produces "No liabilities" or "Debt Free".
 *    - Failed cash-flow request never produces "No Liquid Accounts".
 *    - Failed entity loading stops spinner and offers retry.
 *    - Genuinely empty successful response has its own neutral state.
 *    - Never prompt account recreation because a request failed.
 * 3. Internally honest balance-only cash flow:
 *    - Account with accepted AUD 75,000 observation and no transaction history distinguishes
 *      observed balance from transaction-derived cash, shows known balance (A$75,000.00),
 *      discloses limitation, and NEVER claims false reconciliation.
 * 4. Actual legacy relationship handling:
 *    - Deduplication strictly uses established account_id links (never matching names).
 *    - Distinct same-named debts/assets are preserved.
 *    - Native-currency subtotals preserved without mock FX.
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
import { getActualCashFlowStatement } from '@/lib/domain/accounting/balanceService';
import { recordBalanceObservation } from '@/lib/domain/accounting/balanceObservationService';
import { recordIncome } from '@/lib/domain/accounting/transactionService';
import { createEntity, createAccount } from '@/lib/domain/accounting/accountService';
import { formatMoney, centsToMajorUnits } from '@/lib/domain/accounting/types';
import { AssetsPage } from '@/features/assets/components/AssetsPage';
import { LiabilitiesPage } from '@/features/liabilities/components/LiabilitiesPage';
import DebtPayoffCalculator from '@/features/liabilities/components/DebtPayoffCalculator';
import { CashflowPage } from '@/features/cashflow/components/CashflowPage';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// Profile context mock required by useCashflowQuery in CashflowPage
vi.mock('@/contexts/ProfileContext', () => ({
    useProfile: () => ({
        currentProfile: { id: 'default', name: 'Default' },
        profile: { id: 'default', name: 'Default' },
        profileId: 'default',
        isLoading: false,
        isDemoMode: false
    }),
    ProfileProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>
}));

// Shared mock states for hooks
let mockSummaryData: any = null;
let mockSummaryLoading = false;
let mockSummaryError: string | null = null;
const mockRefreshSummary = vi.fn();

vi.mock('@/features/sync/hooks/useSharedFinancialSummary', () => ({
    useSharedFinancialSummary: () => ({
        summary: mockSummaryData,
        isLoading: mockSummaryLoading,
        error: mockSummaryError,
        refresh: mockRefreshSummary
    })
}));

let mockLegacyAssets: any[] = [];
let mockLegacyAssetsLoading = false;
vi.mock('@/features/assets/hooks/useAssetsQuery', () => ({
    useAssetsQuery: () => ({
        assets: mockLegacyAssets,
        isLoading: mockLegacyAssetsLoading,
        addAsset: vi.fn(),
        updateAsset: vi.fn(),
        deleteAsset: vi.fn()
    })
}));

let mockLegacyLiabilities: any[] = [];
let mockLegacyLiabilitiesLoading = false;
vi.mock('@/features/liabilities/hooks/useLiabilitiesQuery', () => ({
    useLiabilitiesQuery: () => ({
        liabilities: mockLegacyLiabilities,
        isLoading: mockLegacyLiabilitiesLoading,
        error: null,
        addLiability: vi.fn(),
        updateLiability: vi.fn(),
        deleteLiability: vi.fn()
    })
}));

let mockBaseCurrency = 'AUD';
vi.mock('@/features/dashboard/hooks/useNetWorth', () => ({
    useNetWorth: () => ({
        baseCurrency: mockBaseCurrency,
        metrics: {} as any,
        rawTotals: {} as any,
        historicalTimeline: [],
        isLoading: false
    })
}));

vi.mock('@/contexts/ThemeContext', () => ({
    useTheme: () => ({
        isPrivacyBlur: false,
        theme: 'light',
        effectiveTheme: 'light',
        setTheme: vi.fn(),
        togglePrivacyBlur: vi.fn()
    }),
    ThemeProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>
}));

describe('Batch B Remediation - Component and Domain Verification', () => {
    let container: HTMLDivElement;
    let root: ReactDOM.Root;
    let testDb: Database.Database;
    let queryClient: QueryClient;

    const renderWithProviders = (ui: React.ReactElement) => {
        return root.render(
            <QueryClientProvider client={queryClient}>
                {ui}
            </QueryClientProvider>
        );
    };

    beforeEach(() => {
        queryClient = new QueryClient({
            defaultOptions: {
                queries: {
                    retry: false,
                },
            },
        });

        testDb = createTestDb();
        setTestDb(testDb);

        mockSummaryData = null;
        mockSummaryLoading = false;
        mockSummaryError = null;
        mockLegacyAssets = [];
        mockLegacyAssetsLoading = false;
        mockLegacyLiabilities = [];
        mockLegacyLiabilitiesLoading = false;
        mockBaseCurrency = 'AUD';

        container = document.createElement('div');
        document.body.appendChild(container);
        root = ReactDOM.createRoot(container);
    });

    afterEach(() => {
        act(() => {
            root.unmount();
        });
        container.remove();
        closeDb();
        vi.restoreAllMocks();
    });

    // -------------------------------------------------------------------------
    // REQUIREMENT 1: Currency Scaling (JPY 10,000 displays as ¥10,000, not ¥100)
    // -------------------------------------------------------------------------
    describe('1. Currency Scaling Across New Presentation Paths', () => {
        it('renders JPY 10,000 as ¥10,000 and AUD 989.77 as A$989.77 in AssetsPage', async () => {
            mockSummaryData = {
                accounts: [
                    {
                        account_id: 'acc-jpy-asset',
                        account_name: 'Tokyo Savings',
                        account_type: 'asset',
                        account_sub_type: 'savings',
                        currency: 'JPY',
                        amount_cents: 10000, // 10,000 JPY
                        formatted_amount: '¥10,000',
                        basis: 'ledger',
                        effective_date: '2026-09-23'
                    },
                    {
                        account_id: 'acc-aud-asset',
                        account_name: 'Sydney Everyday',
                        account_type: 'asset',
                        account_sub_type: 'checking',
                        currency: 'AUD',
                        amount_cents: 98977, // 989.77 AUD
                        formatted_amount: 'A$989.77',
                        basis: 'ledger',
                        effective_date: '2026-09-23'
                    }
                ],
                unrecorded_accounts: [],
                total_assets_cents_by_currency: {
                    JPY: 10000,
                    AUD: 98977
                }
            };

            await act(async () => {
                renderWithProviders(<AssetsPage />);
            });

            const text = container.textContent || '';
            // Row checks
            expect(text).toContain('Tokyo Savings');
            expect(text).toContain('¥10,000');
            expect(text).not.toContain('¥100'); // Crucial: must NOT be divided by 100
            expect(text).toContain('Sydney Everyday');
            expect(text).toContain('A$989.77');

            // Total section check
            expect(text).toContain('Total Known Asset Value');
        });

        it('renders JPY 10,000 as ¥10,000 and AUD 989.77 as A$989.77 in LiabilitiesPage', async () => {
            mockSummaryData = {
                accounts: [
                    {
                        account_id: 'acc-jpy-debt',
                        account_name: 'Tokyo Loan',
                        account_type: 'liability',
                        account_sub_type: 'loan',
                        currency: 'JPY',
                        amount_cents: 10000, // 10,000 JPY
                        formatted_amount: '¥10,000',
                        basis: 'observation',
                        effective_date: '2026-09-23'
                    },
                    {
                        account_id: 'acc-aud-debt',
                        account_name: 'Melbourne Card',
                        account_type: 'liability',
                        account_sub_type: 'credit_card',
                        currency: 'AUD',
                        amount_cents: 98977, // 989.77 AUD
                        formatted_amount: 'A$989.77',
                        basis: 'observation',
                        effective_date: '2026-09-23'
                    }
                ],
                unrecorded_accounts: [],
                total_liabilities_cents_by_currency: {
                    JPY: 10000,
                    AUD: 98977
                }
            };

            await act(async () => {
                renderWithProviders(<LiabilitiesPage />);
            });

            const text = container.textContent || '';
            expect(text).toContain('Tokyo Loan');
            expect(text).toContain('¥10,000');
            expect(text).not.toContain('¥100');
            expect(text).toContain('Melbourne Card');
            expect(text).toContain('A$989.77');
        });

        it('debt adapter converts JPY 10,000 cents to 10,000 major units without / 100 error', () => {
            // Unit scale verification for adapter
            const jpyMajor = centsToMajorUnits(10000, 'JPY');
            expect(jpyMajor).toBe(10000);

            const audMajor = centsToMajorUnits(98977, 'AUD');
            expect(audMajor).toBe(989.77);

            const jpyFormatted = formatMoney({ amount_cents: 10000, currency: 'JPY' });
            expect(jpyFormatted).toBe('¥10,000');
        });
    });

    // -------------------------------------------------------------------------
    // REQUIREMENT 2: Correct Loading and Error States
    // -------------------------------------------------------------------------
    describe('2. Correct Loading and Error States', () => {
        it('failed summary renders retryable error and NEVER produces "No liabilities" or "Debt Free"', async () => {
            mockSummaryLoading = false;
            mockSummaryError = 'Network timeout connecting to vault';
            mockLegacyLiabilities = [];

            await act(async () => {
                renderWithProviders(<LiabilitiesPage />);
            });

            const text = container.textContent || '';
            // Must render the explicit error card
            expect(text).toContain('Unable to Load Liabilities');
            expect(text).toContain('Network timeout connecting to vault');
            // Must have a Retry button
            const retryBtn = Array.from(container.querySelectorAll('button')).find(b => b.textContent?.includes('Retry'));
            expect(retryBtn).toBeDefined();

            // MUST NEVER claim "No liabilities recorded." or "Debt Free"
            expect(text).not.toContain('No liabilities recorded');
            expect(text).not.toContain('Debt Free');
        });

        it('failed summary in DebtPayoffCalculator renders error and NEVER produces "You are Debt Free!"', async () => {
            mockSummaryLoading = false;
            mockSummaryError = 'Failed to fetch summary';
            mockLegacyLiabilities = [];

            await act(async () => {
                renderWithProviders(<DebtPayoffCalculator />);
            });

            const text = container.textContent || '';
            expect(text).toContain('Failed to Load Debt Balances');
            expect(text).toContain('Retry');
            expect(text).not.toContain('You are Debt Free!');
        });

        it('failed cash-flow request renders error and NEVER produces "No Liquid Accounts"', async () => {
            // Mock fetch to simulate failure for cash flow API
            const originalFetch = globalThis.fetch;
            globalThis.fetch = vi.fn(async (url: any) => {
                const urlStr = String(url);
                if (urlStr.includes('report_type=cash_flow')) {
                    return new Response(JSON.stringify({ error: 'Database connection failed' }), { status: 500 });
                }
                if (urlStr.includes('/api/accounting')) {
                    return new Response(JSON.stringify({
                        entities: [{ id: 'ent-1', name: 'Household', type: 'household' }]
                    }), { status: 200 });
                }
                return new Response(JSON.stringify({}), { status: 200 });
            });

            await act(async () => {
                renderWithProviders(<CashflowPage />);
            });

            const text = container.textContent || '';
            // Must show error card
            expect(text).toContain('Unable to Load Cash Flow Statement');
            expect(text).toContain('Database connection failed');
            // MUST NEVER produce "No Liquid Accounts Recorded"
            expect(text).not.toContain('No Liquid Accounts Recorded');

            globalThis.fetch = originalFetch;
        });

        it('failed entity loading in CashflowPage stops spinner, asserts absence of calculating spinner, and retry recovers into loaded report', async () => {
            const originalFetch = globalThis.fetch;
            let entitiesFailedOnce = false;
            globalThis.fetch = vi.fn(async (url: any) => {
                const urlStr = String(url);
                // Fail only the first entity-list fetch (exactly '/api/accounting'), not the
                // Manual Logs / Autopilot vault fetches that also fire on mount.
                if (!entitiesFailedOnce && urlStr === '/api/accounting') {
                    entitiesFailedOnce = true;
                    return new Response(JSON.stringify({ error: 'Auth token expired' }), { status: 401 });
                }
                // Second call (after Retry clicked) succeeds
                if (urlStr.includes('report_type=cash_flow')) {
                    return new Response(JSON.stringify({
                        success: true,
                        report: {
                            entity_id: 'ent-1',
                            start_date: '2026-09-01',
                            end_date: '2026-09-30',
                            operating_inflows_cents_by_currency: { AUD: 0 },
                            operating_outflows_cents_by_currency: { AUD: 0 },
                            net_cash_change_cents_by_currency: { AUD: 0 },
                            starting_cash_cents_by_currency: { AUD: 0 },
                            ending_cash_cents_by_currency: { AUD: 0 },
                            observed_liquid_balance_cents_by_currency: { AUD: 50000 },
                            liquid_account_coverage_by_currency: { AUD: 'balance_only' },
                            formatted_observed_liquid_balance_by_currency: { AUD: 'A$500.00' },
                            is_reconciled_by_currency: { AUD: false },
                            items: []
                        }
                    }), { status: 200 });
                }
                return new Response(JSON.stringify({
                    entities: [{ id: 'ent-1', name: 'Household Vault', type: 'household' }]
                }), { status: 200 });
            });

            await act(async () => {
                renderWithProviders(<CashflowPage />);
            });

            let text = container.textContent || '';
            // 1. Error message present
            expect(text).toContain('Failed to load entities: Auth token expired');
            // 2. Calculating spinner MUST NOT be present
            expect(text).not.toContain('Calculating double-entry cash flow statement...');
            // 3. Retry button exists
            const retryButton = Array.from(container.querySelectorAll('button')).find(b => b.textContent?.includes('Retry'));
            expect(retryButton).toBeDefined();

            // 4. Click Retry to verify recovery into loaded report
            await act(async () => {
                retryButton?.click();
            });

            text = container.textContent || '';
            expect(text).not.toContain('Failed to load entities');
            expect(text).toContain('Household Vault');
            expect(text).toContain('Known Observed Balance');

            globalThis.fetch = originalFetch;
        });

        it('genuinely empty successful entity list in CashflowPage renders neutral setup state with accounts action and NO spinner', async () => {
            const originalFetch = globalThis.fetch;
            globalThis.fetch = vi.fn(async (url: any) => {
                return new Response(JSON.stringify({ entities: [] }), { status: 200 });
            });

            await act(async () => {
                renderWithProviders(<CashflowPage />);
            });

            const text = container.textContent || '';
            // Neutral state present
            expect(text).toContain('No Sovereign Entities Found');
            expect(text).toContain('Set Up in Accounts');
            // Calculating spinner MUST NOT be present
            expect(text).not.toContain('Calculating double-entry cash flow statement...');
            // Link target check
            const link = container.querySelector('a[href="/accounting?view=accounts"]');
            expect(link).toBeDefined();

            globalThis.fetch = originalFetch;
        });

        it('genuinely empty successful response in AssetsPage has neutral state without error', async () => {
            mockSummaryLoading = false;
            mockSummaryError = null;
            mockSummaryData = {
                accounts: [],
                unrecorded_accounts: [],
                total_assets_cents_by_currency: {}
            };
            mockLegacyAssets = [];

            await act(async () => {
                renderWithProviders(<AssetsPage />);
            });

            const text = container.textContent || '';
            expect(text).toContain('No assets recorded yet');
            expect(text).not.toContain('Unable to Load Assets');
        });
    });

    // -------------------------------------------------------------------------
    // REQUIREMENT 3: Internally Honest Balance-Only Cash Flow
    // -------------------------------------------------------------------------
    describe('3. Internally Honest Balance-Only Cash Flow', () => {
        it('bank account with AUD 75,000 observation and 0 transactions reports balance-only coverage and disables false reconciliation', () => {
            const entity = createEntity(testDb, { name: 'Alice Personal', type: 'person', currency: 'AUD' });
            const { account: bankAcc } = createAccount(testDb, {
                entity_id: entity.id,
                name: 'NAB Classic Banking',
                type: 'asset',
                sub_type: 'checking',
                currency: 'AUD',
                tracking_mode: 'balance'
            });

            // Record and accept AUD 75,000 balance observation (7,500,000 cents)
            recordBalanceObservation(testDb, {
                account_id: bankAcc.id,
                amount_cents: 7500000,
                currency: 'AUD',
                effective_date: '2026-09-01',
                balance_kind: 'statement_closing_balance',
                source_type: 'manual',
                review_status: 'accepted'
            });

            // Generate cash flow statement for the period
            const cf = getActualCashFlowStatement(testDb, entity.id, '2026-09-01', '2026-09-30');

            // 1. Must report known observed liquid balance
            expect(cf.observed_liquid_balance_cents_by_currency?.['AUD']).toBe(7500000);
            expect(cf.formatted_observed_liquid_balance_by_currency?.['AUD']).toBe('A$75,000.00');

            // 2. Must report coverage as balance_only
            expect(cf.liquid_account_coverage_by_currency?.['AUD']).toBe('balance_only');

            // 3. MUST NEVER claim false reconciliation (is_reconciled must be false)
            expect(cf.is_reconciled_by_currency?.['AUD']).toBe(false);

            // 4. Inflows and outflows must reflect 0 posted transactions without assumption
            expect(cf.operating_inflows_cents_by_currency['AUD'] || 0).toBe(0);
            expect(cf.operating_outflows_cents_by_currency['AUD'] || 0).toBe(0);
        });

        it('renders Known Observed Balance and honest notice in CashflowPage without false reconciliation badge', async () => {
            const originalFetch = globalThis.fetch;
            globalThis.fetch = vi.fn(async (url: any) => {
                const urlStr = String(url);
                if (urlStr.includes('report_type=cash_flow')) {
                    return new Response(JSON.stringify({
                        success: true,
                        report: {
                            entity_id: 'ent-1',
                            start_date: '2026-09-01',
                            end_date: '2026-09-30',
                            operating_inflows_cents_by_currency: { AUD: 0 },
                            operating_outflows_cents_by_currency: { AUD: 0 },
                            net_cash_change_cents_by_currency: { AUD: 0 },
                            starting_cash_cents_by_currency: { AUD: 0 },
                            ending_cash_cents_by_currency: { AUD: 0 },
                            observed_liquid_balance_cents_by_currency: { AUD: 7500000 },
                            liquid_account_coverage_by_currency: { AUD: 'balance_only' },
                            formatted_observed_liquid_balance_by_currency: { AUD: 'A$75,000.00' },
                            is_reconciled_by_currency: { AUD: false },
                            reconciliation_discrepancy_cents_by_currency: { AUD: 0 },
                            formatted_net_cash_change_by_currency: { AUD: 'A$0.00' },
                            formatted_ending_cash_by_currency: { AUD: 'A$0.00' },
                            items: []
                        }
                    }), { status: 200 });
                }
                if (urlStr.includes('/api/accounting')) {
                    return new Response(JSON.stringify({
                        entities: [{ id: 'ent-1', name: 'Alice Household', type: 'household' }]
                    }), { status: 200 });
                }
                return new Response(JSON.stringify({}), { status: 200 });
            });

            await act(async () => {
                renderWithProviders(<CashflowPage />);
            });

            const text = container.textContent || '';

            // Must display the Known Observed Balance card with A$75,000.00
            expect(text).toContain('Known Observed Balance');
            expect(text).toContain('A$75,000.00');

            // Must show honest observation badge and NOT "Reconciled with Ledger"
            expect(text).toContain('Observation Basis (No Transactions)');
            expect(text).not.toContain('Reconciled with Ledger');

            // Must display the Balance-Only Coverage Notice
            expect(text).toContain('Balance-Only Period Coverage');
            expect(text).toContain('reconciliation is not applicable');

            globalThis.fetch = originalFetch;
        });

        it('criterion b: mixed observation and transaction tracking makes all known cash balances visible without double counting (AUD 75k observed + AUD 1k ledger = AUD 76k combined)', async () => {
            const entity = createEntity(testDb, { name: 'Bob Household', type: 'household', currency: 'AUD' });
            
            // Account 1: NAB Classic Banking, balance tracking, AUD 75,000 observation
            const { account: nabAcc } = createAccount(testDb, {
                entity_id: entity.id,
                name: 'NAB Classic Banking',
                type: 'asset',
                sub_type: 'checking',
                currency: 'AUD',
                tracking_mode: 'balance'
            });
            recordBalanceObservation(testDb, {
                account_id: nabAcc.id,
                amount_cents: 7500000,
                currency: 'AUD',
                effective_date: '2026-09-01',
                balance_kind: 'statement_closing_balance',
                source_type: 'manual',
                review_status: 'accepted'
            });

            // Account 2: CommBank Everyday, transactions tracking, AUD 1,000 ledger income
            const { account: cbaAcc } = createAccount(testDb, {
                entity_id: entity.id,
                name: 'CommBank Everyday',
                type: 'asset',
                sub_type: 'checking',
                currency: 'AUD',
                tracking_mode: 'transactions',
                opening_balance_cents: 0,
                opening_date: '2026-09-01'
            });
            // Why this code exists:
            // Record income for CBA Everyday transaction-tracked account. Currency is derived from account.
            // Tricky logic: recordIncome infers currency from bank_account_id directly and returns TransactionWithPostings.
            // TODO: In Milestone 2, verify multi-currency transaction postings across cross-currency transfers.
            const txRes = recordIncome(testDb, {
                entity_id: entity.id,
                bank_account_id: cbaAcc.id,
                amount_cents: 100000, // A$1,000.00
                date: '2026-09-15',
                description: 'Client payment'
            });
            expect(txRes.postings[0].currency).toBe('AUD');

            // Domain calculation
            const cf = getActualCashFlowStatement(testDb, entity.id, '2026-09-01', '2026-09-30');

            // Domain assertions:
            // 1. Coverage is mixed
            expect(cf.liquid_account_coverage_by_currency?.['AUD']).toBe('mixed');
            // 2. Reconciliation is false
            expect(cf.is_reconciled_by_currency?.['AUD']).toBe(false);
            // 3. Combined known balance is exactly 76,000.00 AUD (7,600,000 cents)
            expect(cf.combined_known_balance_cents_by_currency?.['AUD']).toBe(7600000);
            expect(cf.formatted_combined_known_balance_by_currency?.['AUD']).toBe('A$76,000.00');
            // 4. Liquid accounts list contains both accounts exactly once
            const audAccounts = cf.liquid_accounts_by_currency?.['AUD'] || [];
            expect(audAccounts.length).toBe(2);
            const nabItem = audAccounts.find(a => a.account_id === nabAcc.id);
            const cbaItem = audAccounts.find(a => a.account_id === cbaAcc.id);
            expect(nabItem?.basis).toBe('observation');
            expect(nabItem?.balance_cents).toBe(7500000);
            expect(cbaItem?.basis).toBe('ledger');
            expect(cbaItem?.balance_cents).toBe(100000);

            // Component rendering assertion
            const originalFetch = globalThis.fetch;
            globalThis.fetch = vi.fn(async (url: any) => {
                const urlStr = String(url);
                if (urlStr.includes('report_type=cash_flow')) {
                    return new Response(JSON.stringify({ success: true, report: cf }), { status: 200 });
                }
                return new Response(JSON.stringify({ entities: [entity] }), { status: 200 });
            });

            await act(async () => {
                renderWithProviders(<CashflowPage />);
            });

            const text = container.textContent || '';
            // Combined known balance headline
            expect(text).toContain('Combined Known Balance');
            expect(text).toContain('A$76,000.00');
            // Mixed notice
            expect(text).toContain('Mixed Tracking Coverage (AUD)');
            // Breakdown table shows both accounts and basis
            expect(text).toContain('NAB Classic Banking');
            expect(text).toContain('Observed on 2026-09-01');
            expect(text).toContain('CommBank Everyday');
            expect(text).toContain('Ledger closing balance');
            // Inflows are visible from ledger
            expect(text).toContain('+A$1,000.00');

            globalThis.fetch = originalFetch;
        });

        it('criterion c: missing observation is preserved as unknown (never converted into Known Observed Balance $0)', async () => {
            // Why this code exists:
            // Ensures accounts with balance tracking but no accepted observation, no opening balance, and no transactions
            // are treated as entirely unknown.
            // Tricky logic:
            // Prevents false claims of zero activity (e.g. "+A$0.00") or false zero balance ("Ending Liquid Balance A$0.00").
            // Each individual card and table footer is inspected to assert honest reporting.
            // TODO: Add visual assertion when multi-currency unknown accounts exist in future milestone.
            const entity = createEntity(testDb, { name: 'Carol Household', type: 'household', currency: 'AUD' });
            // Account with balance tracking but NO observation and NO transactions
            createAccount(testDb, {
                entity_id: entity.id,
                name: 'Westpac Unobserved',
                type: 'asset',
                sub_type: 'savings',
                currency: 'AUD',
                tracking_mode: 'balance'
            });

            const cf = getActualCashFlowStatement(testDb, entity.id, '2026-09-01', '2026-09-30');

            // Domain assertions:
            expect(cf.liquid_account_coverage_by_currency?.['AUD']).toBe('unknown');
            expect(cf.observed_liquid_balance_cents_by_currency?.['AUD']).toBeNull();
            expect(cf.unrecorded_account_count_by_currency?.['AUD']).toBe(1);
            const accInfo = cf.liquid_accounts_by_currency?.['AUD']?.[0];
            expect(accInfo?.is_unknown).toBe(true);
            expect(accInfo?.balance_cents).toBeNull();
            expect(accInfo?.formatted_balance).toBe('Unknown');

            // Component rendering assertion
            const originalFetch = globalThis.fetch;
            globalThis.fetch = vi.fn(async (url: any) => {
                const urlStr = String(url);
                if (urlStr.includes('report_type=cash_flow')) {
                    return new Response(JSON.stringify({ success: true, report: cf }), { status: 200 });
                }
                return new Response(JSON.stringify({ entities: [entity] }), { status: 200 });
            });

            await act(async () => {
                renderWithProviders(<CashflowPage />);
            });

            const text = container.textContent || '';

            // 1. Inspect Financial Summary Cards (grid with 4 cards)
            const cards = Array.from(container.querySelectorAll('.grid > div'));
            
            // Inflows Card
            const inflowsCard = cards.find(c => c.textContent?.includes('Operating Inflows'));
            expect(inflowsCard).toBeDefined();
            expect(inflowsCard?.textContent).toContain('Not enough transaction history');
            expect(inflowsCard?.textContent).not.toContain('A$0.00');
            expect(inflowsCard?.textContent).not.toContain('+A$');

            // Outflows Card
            const outflowsCard = cards.find(c => c.textContent?.includes('Operating Outflows'));
            expect(outflowsCard).toBeDefined();
            expect(outflowsCard?.textContent).toContain('Not enough transaction history');
            expect(outflowsCard?.textContent).not.toContain('A$0.00');
            expect(outflowsCard?.textContent).not.toContain('-A$');

            // Net Cash Change Card
            const netCard = cards.find(c => c.textContent?.includes('Net Cash Change'));
            expect(netCard).toBeDefined();
            expect(netCard?.textContent).toContain('Not enough transaction history');
            expect(netCard?.textContent).not.toContain('A$0.00');

            // Headline Balance Card (Card 4)
            const headlineCard = cards.find(c => c.textContent?.includes('Balance Not Recorded'));
            expect(headlineCard).toBeDefined();
            expect(headlineCard?.textContent).toContain('Unknown');
            expect(headlineCard?.textContent).not.toContain('A$0.00');

            // 2. Inspect Account Row in Liquid Accounts Table
            const accountRow = container.querySelector('tbody tr');
            expect(accountRow).not.toBeNull();
            expect(accountRow?.textContent).toContain('Westpac Unobserved');
            expect(accountRow?.textContent).toContain('balance');
            expect(accountRow?.textContent).toContain('No observation or transactions');
            expect(accountRow?.textContent).toContain('Unknown');
            expect(accountRow?.textContent).not.toContain('A$0.00');

            // 3. Inspect Table Footer
            const tfoot = container.querySelector('tfoot');
            expect(tfoot).not.toBeNull();
            expect(tfoot?.textContent).toContain('Balance Subtotal');
            expect(tfoot?.textContent).toContain('Unknown');
            expect(tfoot?.textContent).not.toContain('Ending Liquid Balance');
            expect(tfoot?.textContent).not.toContain('A$0.00');

            // 4. Overall page assertions
            expect(text).not.toContain('Ending Liquid Balance A$0.00');
            expect(text).not.toContain('Known Observed Balance\nA$0.00');
            expect(text).toContain('Balance Not Recorded (AUD)');
            expect(text).toContain('1 liquid account has no recorded balance or observation');

            globalThis.fetch = originalFetch;
        });

        it('criterion d: accepted zero observation is treated as legitimate $0.00 (not unknown)', () => {
            const entity = createEntity(testDb, { name: 'David Household', type: 'household', currency: 'AUD' });
            const { account: zeroAcc } = createAccount(testDb, {
                entity_id: entity.id,
                name: 'NAB Zero Account',
                type: 'asset',
                sub_type: 'checking',
                currency: 'AUD',
                tracking_mode: 'balance'
            });
            // Accepted 0 balance
            recordBalanceObservation(testDb, {
                account_id: zeroAcc.id,
                amount_cents: 0,
                currency: 'AUD',
                effective_date: '2026-09-01',
                balance_kind: 'statement_closing_balance',
                source_type: 'manual',
                review_status: 'accepted'
            });

            const cf = getActualCashFlowStatement(testDb, entity.id, '2026-09-01', '2026-09-30');

            expect(cf.observed_liquid_balance_cents_by_currency?.['AUD']).toBe(0);
            expect(cf.formatted_observed_liquid_balance_by_currency?.['AUD']).toBe('A$0.00');
            expect(cf.unrecorded_account_count_by_currency?.['AUD']).toBe(0);
            const accInfo = cf.liquid_accounts_by_currency?.['AUD']?.[0];
            expect(accInfo?.is_unknown).toBe(false);
            expect(accInfo?.balance_cents).toBe(0);
            expect(accInfo?.formatted_balance).toBe('A$0.00');
        });

        it('criterion e: partial subtotal with missing balances discloses unrecorded accounts', async () => {
            const entity = createEntity(testDb, { name: 'Eve Household', type: 'household', currency: 'AUD' });
            const { account: cbaAcc } = createAccount(testDb, {
                entity_id: entity.id,
                name: 'CBA Active',
                type: 'asset',
                sub_type: 'checking',
                currency: 'AUD',
                tracking_mode: 'transactions',
                opening_balance_cents: 0,
                opening_date: '2026-09-01'
            });
            // Why this code exists:
            // Record income for CBA Active transaction-tracked account. Currency is derived from account.
            // Tricky logic: recordIncome infers currency from bank_account_id directly and returns TransactionWithPostings.
            // TODO: In Milestone 2, verify multi-currency transaction postings across cross-currency transfers.
            const txRes = recordIncome(testDb, {
                entity_id: entity.id,
                bank_account_id: cbaAcc.id,
                amount_cents: 500000, // A$5,000.00
                date: '2026-09-10',
                description: 'Salary'
            });
            expect(txRes.postings[0].currency).toBe('AUD');

            // Account 2: Unobserved balance-mode account
            createAccount(testDb, {
                entity_id: entity.id,
                name: 'Old Piggy Bank',
                type: 'asset',
                sub_type: 'cash',
                currency: 'AUD',
                tracking_mode: 'balance'
            });

            const cf = getActualCashFlowStatement(testDb, entity.id, '2026-09-01', '2026-09-30');

            expect(cf.combined_known_balance_cents_by_currency?.['AUD']).toBe(500000);
            expect(cf.unrecorded_account_count_by_currency?.['AUD']).toBe(1);

            const originalFetch = globalThis.fetch;
            globalThis.fetch = vi.fn(async (url: any) => {
                const urlStr = String(url);
                if (urlStr.includes('report_type=cash_flow')) {
                    return new Response(JSON.stringify({ success: true, report: cf }), { status: 200 });
                }
                return new Response(JSON.stringify({ entities: [entity] }), { status: 200 });
            });

            await act(async () => {
                renderWithProviders(<CashflowPage />);
            });

            const text = container.textContent || '';
            expect(text).toContain('(1 account with unknown balance excluded)');

            globalThis.fetch = originalFetch;
        });

        it('criterion f: missing transaction history displays "Not enough transaction history" rather than claiming proven zero activity', async () => {
            const originalFetch = globalThis.fetch;
            globalThis.fetch = vi.fn(async (url: any) => {
                const urlStr = String(url);
                if (urlStr.includes('report_type=cash_flow')) {
                    return new Response(JSON.stringify({
                        success: true,
                        report: {
                            entity_id: 'ent-1',
                            start_date: '2026-09-01',
                            end_date: '2026-09-30',
                            operating_inflows_cents_by_currency: { AUD: 0 },
                            operating_outflows_cents_by_currency: { AUD: 0 },
                            net_cash_change_cents_by_currency: { AUD: 0 },
                            starting_cash_cents_by_currency: { AUD: 0 },
                            ending_cash_cents_by_currency: { AUD: 0 },
                            observed_liquid_balance_cents_by_currency: { AUD: 7500000 },
                            liquid_account_coverage_by_currency: { AUD: 'balance_only' },
                            formatted_observed_liquid_balance_by_currency: { AUD: 'A$75,000.00' },
                            is_reconciled_by_currency: { AUD: false },
                            items: []
                        }
                    }), { status: 200 });
                }
                return new Response(JSON.stringify({
                    entities: [{ id: 'ent-1', name: 'Alice Household', type: 'household' }]
                }), { status: 200 });
            });

            await act(async () => {
                renderWithProviders(<CashflowPage />);
            });

            const text = container.textContent || '';
            // Must show "Not enough transaction history" instead of asserting +A$0.00
            expect(text).toContain('Not enough transaction history');
            expect(text).toContain('Observation basis; transactions unrecorded');

            globalThis.fetch = originalFetch;
        });

        it('criterion g: multi-currency coverage scopes notices per currency without contradictory global notices', async () => {
            const originalFetch = globalThis.fetch;
            globalThis.fetch = vi.fn(async (url: any) => {
                const urlStr = String(url);
                if (urlStr.includes('report_type=cash_flow')) {
                    return new Response(JSON.stringify({
                        success: true,
                        report: {
                            entity_id: 'ent-1',
                            start_date: '2026-09-01',
                            end_date: '2026-09-30',
                            operating_inflows_cents_by_currency: { AUD: 0, JPY: 100000 },
                            operating_outflows_cents_by_currency: { AUD: 0, JPY: 40000 },
                            net_cash_change_cents_by_currency: { AUD: 0, JPY: 60000 },
                            starting_cash_cents_by_currency: { AUD: 0, JPY: 500000 },
                            ending_cash_cents_by_currency: { AUD: 0, JPY: 560000 },
                            observed_liquid_balance_cents_by_currency: { AUD: 7500000 },
                            liquid_account_coverage_by_currency: { AUD: 'balance_only', JPY: 'ledger' },
                            formatted_observed_liquid_balance_by_currency: { AUD: 'A$75,000.00' },
                            is_reconciled_by_currency: { AUD: false, JPY: true },
                            items: [
                                {
                                    transaction_id: 'tx-jpy-1',
                                    date: '2026-09-10',
                                    description: 'Tokyo Freelance Fee',
                                    cash_account_name: 'Tokyo Bank',
                                    activity_type: 'operating',
                                    amount_cents: 100000,
                                    currency: 'JPY'
                                }
                            ]
                        }
                    }), { status: 200 });
                }
                return new Response(JSON.stringify({
                    entities: [{ id: 'ent-1', name: 'Alice Household', type: 'household' }]
                }), { status: 200 });
            });

            await act(async () => {
                renderWithProviders(<CashflowPage />);
            });

            const text = container.textContent || '';
            // Currency sections both rendered
            expect(text).toContain('Currency: AUD');
            expect(text).toContain('Currency: JPY');

            // AUD section has balance-only notice
            expect(text).toContain('Balance-Only Period Coverage');

            // JPY section has reconciled badge and transaction amounts
            expect(text).toContain('Reconciled with Ledger');
            expect(text).toContain('¥100,000');
            expect(text).toContain('Tokyo Freelance Fee');

            globalThis.fetch = originalFetch;
        });
    });

    // -------------------------------------------------------------------------
    // REQUIREMENT 4: Actual Legacy Relationship Handling
    // -------------------------------------------------------------------------
    describe('4. Actual Legacy Relationship Handling and Native Subtotals', () => {
        it('deduplicates legacy debts by established account_id relationship and preserves distinct same-named debts', async () => {
            mockSummaryData = {
                accounts: [
                    {
                        account_id: 'acc-modern-card',
                        account_name: 'Platinum Card',
                        account_type: 'liability',
                        account_sub_type: 'credit_card',
                        currency: 'AUD',
                        amount_cents: 150000, // A$1,500.00
                        formatted_amount: 'A$1,500.00',
                        basis: 'observation',
                        effective_date: '2026-09-23'
                    }
                ],
                unrecorded_accounts: [],
                total_liabilities_cents_by_currency: {
                    AUD: 150000
                }
            };

            // Two legacy items with the SAME name "Platinum Card"
            // One is linked via account_id to 'acc-modern-card' (must be deduplicated)
            // One is unlinked with a distinct id (MUST NOT be deduplicated by name!)
            mockLegacyLiabilities = [
                {
                    id: 'leg-linked',
                    account_id: 'acc-modern-card', // Linked duplicate
                    name: 'Platinum Card',
                    balance: 1500,
                    currency: 'AUD',
                    interest_rate: 19.99
                },
                {
                    id: 'leg-distinct-same-name',
                    name: 'Platinum Card', // Same name, but NOT linked to modern account!
                    balance: 450,
                    currency: 'AUD',
                    interest_rate: 15.0
                }
            ];

            await act(async () => {
                renderWithProviders(<LiabilitiesPage />);
            });

            const text = container.textContent || '';

            // Modern section has the authoritative account
            expect(text).toContain('Platinum Card');
            expect(text).toContain('A$1,500.00');

            // Unlinked legacy section must contain the unlinked distinct card, but NOT the linked duplicate
            expect(text).toContain('Legacy Debts (Unlinked)');
            expect(text).toContain('You have 1 debt stored in your legacy local vault'); // Only 1 unlinked!
            expect(text).toContain('A$450');

            // Native subtotal check without mock FX
            expect(text).toContain('Total: A$450');
        });

        it('displays native-currency subtotals without mock FX conversion for multi-currency unlinked assets', async () => {
            mockSummaryData = {
                accounts: [
                    {
                        account_id: 'acc-modern-bank',
                        account_name: 'ANZ Online',
                        account_type: 'asset',
                        account_sub_type: 'checking',
                        currency: 'AUD',
                        amount_cents: 500000,
                        formatted_amount: 'A$5,000.00',
                        basis: 'ledger',
                        effective_date: '2026-09-23'
                    }
                ],
                unrecorded_accounts: [],
                total_assets_cents_by_currency: {
                    AUD: 500000
                }
            };

            // Multi-currency unlinked legacy assets
            mockLegacyAssets = [
                {
                    id: 'leg-asset-usd',
                    name: 'US Stocks',
                    value: 2000,
                    currency: 'USD',
                    type: 'investment'
                },
                {
                    id: 'leg-asset-eur',
                    name: 'European Bond',
                    value: 1500,
                    currency: 'EUR',
                    type: 'investment'
                }
            ];

            await act(async () => {
                renderWithProviders(<AssetsPage />);
            });

            const text = container.textContent || '';
            // Must show native currency subtotals, NEVER a fake combined total via mock FX
            expect(text).toContain('Total (USD): $2,000');
            expect(text).toContain('Total (EUR): €1,500');
            // Link text check
            expect(text).toContain('View in Accounts');
        });
    });
});
