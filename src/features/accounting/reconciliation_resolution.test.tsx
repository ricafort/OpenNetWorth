/**
 * @vitest-environment happy-dom
 */
/**
 * Component-Level Integration Tests for Batch C2
 * Explain and Resolve Balance Differences
 */

import React, { act } from 'react';
import ReactDOM from 'react-dom/client';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { BalanceCheckModal } from './components/BalanceCheckModal';

(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;

describe('BalanceCheckModal Component-Level Tests', () => {
    let container: HTMLElement;
    let root: ReactDOM.Root;
    let mockFetchData: any;

    beforeEach(() => {
        container = document.createElement('div');
        document.body.appendChild(container);
        root = ReactDOM.createRoot(container);

        mockFetchData = {
            reconciliation: {
                account_id: 'acc1',
                account_name: 'Test Account',
                currency: 'AUD',
                effective_date: '2026-09-01',
                reported_amount_cents: 10000,
                reported_balance_kind: 'statement_closing_balance',
                recorded_ledger_cents: 10000,
                diff_cents: 0,
                is_comparable: true,
                status: 'matched'
            }
        };

        globalThis.fetch = vi.fn().mockImplementation((url: string, init: any) => {
            if (url.includes('/api/accounting/balances/reconcile')) {
                return Promise.resolve({
                    ok: true,
                    json: () => Promise.resolve(mockFetchData)
                });
            }
            return Promise.resolve({ ok: false });
        });
    });

    afterEach(() => {
        act(() => {
            root.unmount();
        });
        container.remove();
        vi.restoreAllMocks();
    });

    it('renders matching state without prompting for adjustments', async () => {
        const onActionImport = vi.fn();
        const onActionSetup = vi.fn();
        const onActionReview = vi.fn();
        const onClose = vi.fn();

        await act(async () => {
            root.render(
                <BalanceCheckModal
                    isOpen={true}
                    accountId="acc1"
                    onClose={onClose}
                    onActionImport={onActionImport}
                    onActionSetup={onActionSetup}
                    onActionReview={onActionReview}
                />
            );
        });

        const text = container.textContent || '';
        expect(text).toContain('Balances match as of 2026-09-01');
        expect(text).toContain('Based on your recorded transactions.');
        expect(text).not.toContain('Import missing transactions');
        expect(text).toContain('Review transactions');
    });

    it('renders exact known difference and actionable import workflow', async () => {
        mockFetchData.reconciliation.status = 'discrepancy';
        mockFetchData.reconciliation.recorded_ledger_cents = 8000;
        mockFetchData.reconciliation.diff_cents = 2000;

        await act(async () => {
            root.render(
                <BalanceCheckModal
                    isOpen={true}
                    accountId="acc1"
                    onClose={vi.fn()}
                    onActionImport={vi.fn()}
                    onActionSetup={vi.fn()}
                    onActionReview={vi.fn()}
                />
            );
        });

        const text = container.textContent || '';
        expect(text).toContain('There is a difference of A$20.00');
        expect(text).toContain('The reported statement balance is higher than your recorded ledger balance.');
        expect(text).toContain('Import missing transactions');
        expect(text).toContain('Review transactions');
    });

    it('renders missing history when starting balance is missing', async () => {
        mockFetchData.reconciliation.status = 'insufficient_history';
        mockFetchData.reconciliation.recorded_ledger_cents = 8000;
        mockFetchData.reconciliation.diff_cents = 2000;

        await act(async () => {
            root.render(
                <BalanceCheckModal
                    isOpen={true}
                    accountId="acc1"
                    onClose={vi.fn()}
                    onActionImport={vi.fn()}
                    onActionSetup={vi.fn()}
                    onActionReview={vi.fn()}
                />
            );
        });

        const text = container.textContent || '';
        expect(text).toContain('More information is needed to compare this balance');
        expect(text).toContain('Review account setup');
        expect(text).not.toContain('Import missing transactions');
    });

    it('renders non-comparable outcomes without numerical diffs', async () => {
        mockFetchData.reconciliation.status = 'not_directly_comparable';
        mockFetchData.reconciliation.reported_balance_kind = 'available_balance';
        mockFetchData.reconciliation.notes = 'Reported available balance accounts for pending holds and cannot be reconciled directly against settled double-entry journal postings.';

        await act(async () => {
            root.render(
                <BalanceCheckModal
                    isOpen={true}
                    accountId="acc1"
                    onClose={vi.fn()}
                    onActionImport={vi.fn()}
                    onActionSetup={vi.fn()}
                    onActionReview={vi.fn()}
                />
            );
        });

        const text = container.textContent || '';
        expect(text).toContain('Balance recorded as of 2026-09-01');
        expect(text).toContain('Reported available balance accounts for pending holds');
        expect(text).not.toContain('Difference');
    });
});
