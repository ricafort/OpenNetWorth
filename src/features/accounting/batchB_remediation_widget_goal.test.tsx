/**
 * @vitest-environment happy-dom
 */

import React, { act } from 'react';
import ReactDOM from 'react-dom/client';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;

import GoalItem from '@/features/goals/components/GoalItem';
import GrowthEngineWidget from '@/features/assets/widgets/GrowthEngineWidget';

let mockSummaryData: any = null;
let mockSummaryLoading = false;
let mockSummaryError: string | null = null;
let mockReportingCurrency = 'AUD';

vi.mock('@/features/sync/hooks/useSharedFinancialSummary', () => ({
    useSharedFinancialSummary: (options: any) => ({
        summary: mockSummaryData?.reporting_currency === options.reportingCurrency ? mockSummaryData : null,
        isLoading: mockSummaryLoading,
        error: mockSummaryError,
        refresh: vi.fn()
    })
}));

let mockSourceMode = 'modern_usable';
vi.mock('@/features/dashboard/hooks/useFinancialSourceSelection', () => ({
    useFinancialSourceSelection: () => ({
        mode: mockSourceMode,
        assets: [],
        summary: mockSummaryData
    })
}));

let mockBaseCurrency = 'AUD';
vi.mock('@/features/dashboard/hooks/useNetWorth', () => ({
    useNetWorth: () => ({
        baseCurrency: mockBaseCurrency,
    })
}));

let mockAssets: any[] = [];
vi.mock('@/features/assets/hooks/useAssetsQuery', () => ({
    useAssetsQuery: () => ({ assets: mockAssets, isLoading: false })
}));

vi.mock('@/contexts/ThemeContext', () => ({
    useTheme: () => ({ isPrivacyBlur: false })
}));

vi.mock('@/features/dashboard/context/DashboardContext', () => ({
    useDashboard: () => ({ isEditMode: false, hideWidget: vi.fn() })
}));

describe('Batch B Remediation - GoalItem and GrowthEngineWidget', () => {
    let container: HTMLDivElement;
    let root: ReactDOM.Root;
    let queryClient: QueryClient;

    const renderWithProviders = (ui: React.ReactElement) => {
        return root.render(
            <QueryClientProvider client={queryClient}>
                {ui}
            </QueryClientProvider>
        );
    };

    beforeEach(() => {
        queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
        container = document.createElement('div');
        document.body.appendChild(container);
        root = ReactDOM.createRoot(container);
        
        mockSummaryData = null;
        mockSummaryLoading = false;
        mockSummaryError = null;
        mockSourceMode = 'modern_usable';
        mockBaseCurrency = 'AUD';
        mockAssets = [];
    });

    afterEach(() => {
        act(() => { root.unmount(); });
        container.remove();
        vi.restoreAllMocks();
    });

    describe('GrowthEngineWidget', () => {
        it('renders consistent overview excluding cross-currency assets, avoiding duplication for linked holdings', async () => {
            mockSourceMode = 'modern_usable';
            mockBaseCurrency = 'AUD';
            mockSummaryData = {
                accounts: [
                    { account_id: '1', account_type: 'asset', account_sub_type: 'investment', currency: 'AUD', amount_cents: 2000000 },
                    { account_id: '2', account_type: 'asset', account_sub_type: 'investment', currency: 'USD', amount_cents: 500000 }
                ]
            };
            mockAssets = [
                { id: 'a1', account_id: '1', name: 'Linked AUD Asset', currency: 'AUD', value: 20000 },
                { id: 'a2', account_id: '2', name: 'Linked USD Asset', currency: 'USD', value: 5000 }
            ];

            await act(async () => {
                renderWithProviders(<GrowthEngineWidget />);
            });

            const text = container.textContent || '';
            // It should only show 20,000 once (from the account), not 40,000
            expect(text).toContain('A$20,000');
            expect(text).not.toContain('A$40,000');
            expect(text).toContain('$5,000'); // Displayed as mixed currency
        });

        it('displays error state on failed summary', async () => {
            mockSourceMode = 'error';
            await act(async () => {
                renderWithProviders(<GrowthEngineWidget />);
            });

            const text = container.textContent || '';
            expect(text).toContain('Failed to load portfolio.');
            expect(text).not.toContain('No investments tracked yet');
        });

        it('displays $0 for an explicitly zero account and includes unrecorded ones', async () => {
            mockSourceMode = 'modern_usable';
            mockBaseCurrency = 'AUD';
            mockSummaryData = {
                accounts: [
                    { account_id: '1', account_type: 'asset', account_sub_type: 'investment', currency: 'AUD', amount_cents: 0 }
                ],
                unrecorded_accounts: [
                    { id: 'unr1', name: 'Forgotten Account', account_type: 'asset', account_sub_type: 'investment', currency: 'AUD' }
                ]
            };

            await act(async () => {
                renderWithProviders(<GrowthEngineWidget />);
            });

            const text = container.textContent || '';
            expect(text).toContain('A$0'); // 0 is rendered
            expect(text).toContain('Balance not recorded'); // Unrecorded is rendered
            expect(text).toContain('Update balance'); // Link exists
        });
    });

    describe('GoalItem', () => {
        const mockGoal = {
            id: 'g1',
            name: 'House Deposit',
            category: 'net_worth',
            target_amount: 100000,
            currency: 'AUD'
        } as any;

        it('uses legacy fallback for legacy-only same-currency goal', async () => {
            mockSourceMode = 'legacy';
            mockBaseCurrency = 'AUD';
            
            await act(async () => {
                renderWithProviders(
                    <GoalItem goal={mockGoal} netWorth={25000} baseCurrency="AUD" onUpdate={vi.fn()} onDelete={vi.fn()} />
                );
            });

            const text = container.textContent || '';
            expect(text).toContain('A$25,000'); // Should read from netWorth prop
            expect(text).toContain('25.0%');
        });

        it('shows Unavailable for legacy USD holdings against AUD goal without FX', async () => {
            mockSourceMode = 'legacy';
            // Base currency is USD, Goal currency is AUD
            mockBaseCurrency = 'USD';
            
            await act(async () => {
                renderWithProviders(
                    <GoalItem goal={mockGoal} netWorth={20000} baseCurrency="USD" onUpdate={vi.fn()} onDelete={vi.fn()} />
                );
            });

            const text = container.textContent || '';
            expect(text).toContain('Unavailable'); // Because it's legacy mode and no FX engine is available
            expect(text).not.toContain('A$20,000');
            expect(text).not.toContain('A$0');
        });

        it('handles delayed response while changing goal currency', async () => {
            mockSourceMode = 'modern_usable';
            mockBaseCurrency = 'AUD';
            mockSummaryData = { reporting_currency: 'USD', converted_net_worth: { is_complete: true, amount_cents: 1000000 } };
            
            await act(async () => {
                renderWithProviders(
                    <GoalItem goal={mockGoal} netWorth={0} baseCurrency="AUD" onUpdate={vi.fn()} onDelete={vi.fn()} />
                );
            });

            const text = container.textContent || '';
            expect(text).toContain('Unavailable'); // Since summary reporting_currency (USD) != goal currency (AUD)
            expect(text).not.toContain('A$10,000'); // Should NOT use stale data
        });
    });
});
