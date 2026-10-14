/**
 * @vitest-environment happy-dom
 */
/**
 * Hook-Level Tests for useSharedFinancialSummary
 *
 * Why this file exists:
 * Verifies Priority 2 fix: Monotonic request tracking in useSharedFinancialSummary
 * prevents out-of-order stale responses from overwriting the currently selected financial scope.
 *
 * Tricky logic:
 * - Mounts a TestComponent using useSharedFinancialSummary.
 * - Simulates out-of-order network responses:
 *   1. Dispatches Request 1 (household).
 *   2. Switches to Request 2 (business).
 *   3. Resolves Request 2 first (business arrives and displays).
 *   4. Resolves Request 1 later (older household arrives).
 * - Verifies that the hook does NOT overwrite the business data with stale household data.
 *
 * TODO items:
 * - None.
 */

import React, { act, useState } from 'react';
import ReactDOM from 'react-dom/client';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { useSharedFinancialSummary } from './useSharedFinancialSummary';
import { CurrencyCode } from '@/lib/domain/accounting/types';

(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;

describe('useSharedFinancialSummary Stale Response Prevention', () => {
    let container: HTMLDivElement;
    let root: ReactDOM.Root;

    beforeEach(() => {
        container = document.createElement('div');
        document.body.appendChild(container);
        root = ReactDOM.createRoot(container);
    });

    afterEach(() => {
        act(() => {
            root.unmount();
        });
        container.remove();
        vi.restoreAllMocks();
    });

    it('ignores older out-of-order responses when switching financial scope', async () => {
        // Track deferred promises for controlled resolution
        const deferredFetches: Array<{
            url: string;
            resolve: (val: any) => void;
        }> = [];

        global.fetch = vi.fn().mockImplementation((url: string) => {
            return new Promise((resolve) => {
                deferredFetches.push({
                    url,
                    resolve: (data: any) => {
                        resolve({
                            ok: true,
                            json: async () => data
                        });
                    }
                });
            });
        });

        function ScopeConsumer({ scope, asOfDate, currency }: { scope: string; asOfDate?: string; currency?: CurrencyCode }) {
            const { summary, isLoading } = useSharedFinancialSummary({
                entityId: scope,
                asOfDate,
                reportingCurrency: currency
            });

            return (
                <div>
                    <div id="loading">{isLoading ? 'loading' : 'ready'}</div>
                    <div id="current-scope">{summary?.scope_entity_id || 'all'}</div>
                    <div id="total">{summary?.total_assets_cents_by_currency?.['AUD'] ?? -1}</div>
                </div>
            );
        }

        function Wrapper() {
            const [scope, setScope] = useState('household');
            const [date, setDate] = useState('2026-09-01');
            const [curr, setCurr] = useState<CurrencyCode>('AUD');

            return (
                <div>
                    <button id="btn-business" onClick={() => setScope('business')}>Switch to Business</button>
                    <ScopeConsumer scope={scope} asOfDate={date} currency={curr} />
                </div>
            );
        }

        // 1. Initial mount dispatches Request 1 (household)
        await act(async () => {
            root.render(<Wrapper />);
        });

        expect(deferredFetches.length).toBe(1);
        expect(deferredFetches[0].url).toContain('entity_id=household');

        // 2. User switches scope to business before Request 1 resolves -> dispatches Request 2
        const btnBusiness = container.querySelector('#btn-business') as HTMLButtonElement;
        await act(async () => {
            btnBusiness.click();
        });

        expect(deferredFetches.length).toBe(2);
        expect(deferredFetches[1].url).toContain('entity_id=business');

        // 3. Resolve Request 2 (business) first
        await act(async () => {
            deferredFetches[1].resolve({
                success: true,
                summary: {
                    scope_entity_id: 'business',
                    as_of_date: '2026-09-01',
                    reporting_currency: 'AUD',
                    total_assets_cents_by_currency: { AUD: 39000 },
                    total_liabilities_cents_by_currency: {},
                    net_worth_cents_by_currency: { AUD: 39000 },
                    accounts_included: [],
                    coverage_notes: [],
                    unrecorded_accounts: [],
                    unrecorded_count: 0,
                    is_complete: true
                }
            });
        });

        expect(container.querySelector('#current-scope')?.textContent).toBe('business');
        expect(container.querySelector('#total')?.textContent).toBe('39000');
        expect(container.querySelector('#loading')?.textContent).toBe('ready');

        // 4. Older Request 1 (household) arrives late
        await act(async () => {
            deferredFetches[0].resolve({
                success: true,
                summary: {
                    scope_entity_id: 'household',
                    as_of_date: '2026-09-01',
                    reporting_currency: 'AUD',
                    total_assets_cents_by_currency: { AUD: 100000 },
                    total_liabilities_cents_by_currency: {},
                    net_worth_cents_by_currency: { AUD: 100000 },
                    accounts_included: [],
                    coverage_notes: [],
                    unrecorded_accounts: [],
                    unrecorded_count: 0,
                    is_complete: true
                }
            });
        });

        // 5. Verify the screen strictly preserved the business scope and did NOT get overwritten by household
        expect(container.querySelector('#current-scope')?.textContent).toBe('business');
        expect(container.querySelector('#total')?.textContent).toBe('39000');
        expect(container.querySelector('#loading')?.textContent).toBe('ready');
    });
});
