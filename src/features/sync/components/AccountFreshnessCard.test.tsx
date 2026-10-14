/**
 * @vitest-environment happy-dom
 * 
 * Why this test exists:
 * Verifies truthfulness in evidence labels on AccountFreshnessCard:
 * - Manual valuations are not labeled as statement-verified.
 * - Statement evidence is not automatically assumed to be successful reconciliation (distinguishes matched vs discrepancy).
 * - Ledger-calculated accounts without statement evidence are truthfully labeled.
 * 
 * Tricky logic:
 * Uses happy-dom with React 19 root rendering. Mock summary data provides various combinations
 * of source_type, basis, and reconciliation status to ensure UI badge conditions render accurately.
 * 
 * TODO: Add interaction tests for the "Update Balances" action button inside this card.
 */
import React, { act } from 'react';
import ReactDOM from 'react-dom/client';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { AccountFreshnessCard } from './AccountFreshnessCard';
import { SharedFinancialSummary } from '@/lib/domain/accounting/types';

(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;

// Mock useSharedFinancialSummary hook
let mockSummaryData: Partial<SharedFinancialSummary> | null = null;
let mockIsLoading = false;

vi.mock('../hooks/useSharedFinancialSummary', () => ({
    useSharedFinancialSummary: () => ({
        summary: mockSummaryData,
        isLoading: mockIsLoading,
        refresh: vi.fn()
    })
}));

describe('AccountFreshnessCard Truthful Evidence Labels', () => {
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
    });

    it('labels manual valuations truthfully and never claims statement-verified', async () => {
        mockSummaryData = {
            as_of_date: '2026-09-24',
            reporting_currency: 'AUD',
            total_assets_cents_by_currency: { AUD: 500000 },
            total_liabilities_cents_by_currency: { AUD: 0 },
            net_worth_cents_by_currency: { AUD: 500000 },
            unrecorded_accounts: [],
            unrecorded_count: 0,
            is_complete: true,
            accounts: [
                {
                    account_id: 'acc-manual',
                    account_name: 'Manual Super',
                    entity_id: 'ent-1',
                    entity_name: 'Alice Household',
                    account_type: 'asset',
                    account_sub_type: 'superannuation',
                    tracking_mode: 'balance',
                    basis: 'observation',
                    source_type: 'manual', // Manually entered valuation
                    amount_cents: 500000,
                    currency: 'AUD',
                    effective_date: '2026-09-24',
                    is_stale: false
                }
            ]
        };

        await act(async () => {
            root.render(<AccountFreshnessCard />);
        });

        // Assert: It must display "1 manual valuation"
        expect(container.textContent).toContain('1 manual valuation');
        // Assert: It must NOT claim "statement-verified"
        expect(container.textContent).not.toContain('statement-verified');
        expect(container.textContent).not.toContain('statement-sourced');
    });

    it('labels statement-sourced accounts and distinguishes reconciliation status', async () => {
        mockSummaryData = {
            as_of_date: '2026-09-24',
            reporting_currency: 'AUD',
            total_assets_cents_by_currency: { AUD: 1200000 },
            total_liabilities_cents_by_currency: { AUD: 0 },
            net_worth_cents_by_currency: { AUD: 1200000 },
            unrecorded_accounts: [],
            unrecorded_count: 0,
            is_complete: true,
            accounts: [
                {
                    account_id: 'acc-reconciled',
                    account_name: 'Checking Account',
                    entity_id: 'ent-1',
                    account_type: 'asset',
                    account_sub_type: 'checking',
                    tracking_mode: 'transactions',
                    basis: 'ledger',
                    amount_cents: 500000,
                    currency: 'AUD',
                    effective_date: '2026-09-24',
                    is_stale: false,
                    reconciliation: {
                        account_id: 'acc-reconciled',
                        account_name: 'Checking Account',
                        currency: 'AUD',
                        effective_date: '2026-09-24',
                        reported_amount_cents: 500000,
                        reported_balance_kind: 'statement_closing_balance',
                        recorded_ledger_cents: 500000,
                        diff_cents: 0,
                        is_comparable: true,
                        status: 'matched',
                        source_document_name: 'statement_sept.pdf'
                    }
                },
                {
                    account_id: 'acc-discrepancy',
                    account_name: 'Savings Account',
                    entity_id: 'ent-1',
                    account_type: 'asset',
                    account_sub_type: 'savings',
                    tracking_mode: 'transactions',
                    basis: 'ledger',
                    amount_cents: 700000,
                    currency: 'AUD',
                    effective_date: '2026-09-24',
                    is_stale: false,
                    reconciliation: {
                        account_id: 'acc-discrepancy',
                        account_name: 'Savings Account',
                        currency: 'AUD',
                        effective_date: '2026-09-24',
                        reported_amount_cents: 750000,
                        reported_balance_kind: 'statement_closing_balance',
                        recorded_ledger_cents: 700000,
                        diff_cents: 50000,
                        is_comparable: true,
                        status: 'discrepancy',
                        source_document_name: 'savings_sept.pdf'
                    }
                }
            ]
        };

        await act(async () => {
            root.render(<AccountFreshnessCard />);
        });

        // Reconciled account is labeled as reconciled with statement
        expect(container.textContent).toContain('1 reconciled with statement');
        // Discrepancy account is labeled truthfully with variance/discrepancy
        expect(container.textContent).toContain('1 statement variance (discrepancy)');
    });

    it('labels ledger transactions without statements as calculated through today', async () => {
        mockSummaryData = {
            as_of_date: '2026-09-24',
            reporting_currency: 'AUD',
            total_assets_cents_by_currency: { AUD: 300000 },
            total_liabilities_cents_by_currency: { AUD: 0 },
            net_worth_cents_by_currency: { AUD: 300000 },
            unrecorded_accounts: [],
            unrecorded_count: 0,
            is_complete: true,
            accounts: [
                {
                    account_id: 'acc-ledger',
                    account_name: 'Everyday Cash',
                    entity_id: 'ent-1',
                    account_type: 'asset',
                    account_sub_type: 'cash',
                    tracking_mode: 'transactions',
                    basis: 'ledger',
                    amount_cents: 300000,
                    currency: 'AUD',
                    effective_date: '2026-09-24',
                    is_stale: false
                }
            ]
        };

        await act(async () => {
            root.render(<AccountFreshnessCard />);
        });

        expect(container.textContent).toContain('1 calculated through today (ledger transactions)');
        expect(container.textContent).not.toContain('statement-verified');
        expect(container.textContent).toContain('1 statement not checked');
    });

    it('an old observation does not appear recently verified when summary is calculated today', async () => {
        // Old observation (90 days ago), but summary and account effective_date calculated as of today (2026-09-24)
        mockSummaryData = {
            as_of_date: '2026-09-24',
            reporting_currency: 'AUD',
            total_assets_cents_by_currency: { AUD: 500000 },
            total_liabilities_cents_by_currency: { AUD: 0 },
            net_worth_cents_by_currency: { AUD: 500000 },
            unrecorded_accounts: [],
            unrecorded_count: 0,
            is_complete: true,
            accounts: [
                {
                    account_id: 'acc-old-obs',
                    account_name: 'Old Statement Account',
                    entity_id: 'ent-1',
                    account_type: 'asset',
                    account_sub_type: 'checking',
                    tracking_mode: 'transactions',
                    basis: 'ledger',
                    amount_cents: 500000,
                    currency: 'AUD',
                    effective_date: '2026-09-24', // Calculation date is today
                    observation_date: '2026-05-01', // Actual observation is ~146 days old
                    is_stale: true,
                    reconciliation: {
                        account_id: 'acc-old-obs',
                        account_name: 'Old Statement Account',
                        currency: 'AUD',
                        effective_date: '2026-05-01',
                        reported_amount_cents: 500000,
                        reported_balance_kind: 'statement_closing_balance',
                        recorded_ledger_cents: 500000,
                        diff_cents: 0,
                        is_comparable: true,
                        status: 'matched',
                        source_document_name: 'may_statement.pdf'
                    }
                }
            ]
        };

        await act(async () => {
            root.render(<AccountFreshnessCard />);
        });

        // Assert: Must be identified as stale (older than 30d)
        expect(container.textContent).toContain('1 account older than 30d');
        // Assert: MUST NOT say "Evidence verified recently"
        expect(container.textContent).not.toContain('Evidence verified recently');
    });

    it('manual observations are not called statement reconciliation', async () => {
        // Matched manual observation (source_type: manual, no document)
        mockSummaryData = {
            as_of_date: '2026-09-24',
            reporting_currency: 'AUD',
            total_assets_cents_by_currency: { AUD: 200000 },
            total_liabilities_cents_by_currency: { AUD: 0 },
            net_worth_cents_by_currency: { AUD: 200000 },
            unrecorded_accounts: [],
            unrecorded_count: 0,
            is_complete: true,
            accounts: [
                {
                    account_id: 'acc-manual-match',
                    account_name: 'Cash Vault',
                    entity_id: 'ent-1',
                    account_type: 'asset',
                    account_sub_type: 'cash',
                    tracking_mode: 'transactions',
                    basis: 'ledger',
                    amount_cents: 200000,
                    currency: 'AUD',
                    effective_date: '2026-09-24',
                    observation_date: '2026-09-24',
                    is_stale: false,
                    source_type: 'manual',
                    reconciliation: {
                        account_id: 'acc-manual-match',
                        account_name: 'Cash Vault',
                        currency: 'AUD',
                        effective_date: '2026-09-24',
                        reported_amount_cents: 200000,
                        reported_balance_kind: 'current_balance',
                        recorded_ledger_cents: 200000,
                        diff_cents: 0,
                        is_comparable: true,
                        status: 'matched',
                        source_type: 'manual'
                        // No source_document_name or document_id
                    }
                }
            ]
        };

        await act(async () => {
            root.render(<AccountFreshnessCard />);
        });

        // Assert: Must NOT be called "reconciled with statement"
        expect(container.textContent).not.toContain('reconciled with statement');
        // Assert: Must be described accurately as manual observation match
        expect(container.textContent).toContain('1 matches manual observation');
    });

    describe('collapse persistence (regression)', () => {
        const COLLAPSE_KEY = 'opennetworth:freshness-card-collapsed';

        const oneAccountSummary: Partial<SharedFinancialSummary> = {
            as_of_date: '2026-10-11',
            reporting_currency: 'AUD',
            total_assets_cents_by_currency: { AUD: 300000 },
            total_liabilities_cents_by_currency: { AUD: 0 },
            net_worth_cents_by_currency: { AUD: 300000 },
            unrecorded_accounts: [],
            unrecorded_count: 0,
            is_complete: true,
            accounts: [
                {
                    account_id: 'acc-persist',
                    account_name: 'Everyday Cash',
                    entity_id: 'ent-1',
                    entity_name: 'Alice Household',
                    account_type: 'asset',
                    account_sub_type: 'cash',
                    tracking_mode: 'transactions',
                    basis: 'ledger',
                    amount_cents: 300000,
                    currency: 'AUD',
                    effective_date: '2026-10-11',
                    is_stale: false
                }
            ]
        };

        // StrictMode matters here: the App Router enables it by default, and its double
        // effect invocation is what exposed the bug — the persist effect used to write the
        // pre-hydration `false` over the saved preference before the second read saw it.
        it('restores a saved collapsed state and never clobbers it on mount', async () => {
            mockSummaryData = oneAccountSummary;
            localStorage.setItem(COLLAPSE_KEY, 'true');

            await act(async () => {
                root.render(
                    <React.StrictMode>
                        <AccountFreshnessCard />
                    </React.StrictMode>
                );
            });

            // Compact notice row is rendered instead of the full panel
            expect(container.textContent).toContain('Show Details');
            // The saved preference survived mount (was not overwritten with 'false')
            expect(localStorage.getItem(COLLAPSE_KEY)).toBe('true');
        });

        it('persists the collapsed state when the chevron is clicked', async () => {
            mockSummaryData = oneAccountSummary;
            localStorage.removeItem(COLLAPSE_KEY);

            await act(async () => {
                root.render(
                    <React.StrictMode>
                        <AccountFreshnessCard />
                    </React.StrictMode>
                );
            });
            expect(localStorage.getItem(COLLAPSE_KEY)).toBe('false');

            const chevron = Array.from(container.querySelectorAll('button'))
                .find(b => b.title === 'Collapse to compact notice');
            expect(chevron).toBeDefined();

            await act(async () => {
                chevron!.click();
            });

            expect(localStorage.getItem(COLLAPSE_KEY)).toBe('true');
            expect(container.textContent).toContain('Show Details');
        });
    });
});
