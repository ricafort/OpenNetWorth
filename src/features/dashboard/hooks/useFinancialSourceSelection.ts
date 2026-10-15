'use client';

import { useMemo } from 'react';
import { useSharedFinancialSummary } from '@/features/sync/hooks/useSharedFinancialSummary';
import { useAssetsQuery } from '@/features/assets/hooks/useAssetsQuery';
import { useLiabilitiesQuery } from '@/features/liabilities/hooks/useLiabilitiesQuery';
import { CurrencyCode } from '@/types';
import { SharedFinancialSummary, SharedFinancialSummaryAccount } from '@/lib/domain/accounting/types';
import { Asset } from '@/features/assets/types';
import { Liability } from '@/features/liabilities/types';

/**
 * Unified Financial Source State
 * 
 * Why this exists:
 * Guarantees that the headline cards (Net Worth, Assets, Liabilities) and the Asset Allocation chart
 * consume the exact same financial data source and present identical, reconciled figures.
 * Prevents silent fallback to legacy totals when modern accounts exist but lack balances.
 * 
 * Tricky logic:
 * - `summary.accounts` only contains accounts with recorded balances on or before asOfDate.
 * - An empty `summary.accounts` does NOT mean accounts don't exist: accounts may be unobserved (`summary.unrecorded_count > 0`).
 * - If accounts exist but all balances are unknown, state is 'modern_missing_balances'.
 * - Zero accounts at all (fresh vault) is 'modern_usable' with empty accounts — the
 *   summary totals are legitimately $0.
 * - If holdings coexist that the summary does not cover, `hasExcludedLegacy` is set
 *   to true with clear disclosure.
 *
 * The old 'legacy' mode (browser-storage totals) was deleted with the single-data-layer
 * collapse (Phase 2.7): every figure now comes from the SQLite ledger via the shared
 * summary, and the `demo_persona` cookie makes the same reads serve persona vaults.
 */
export type FinancialSourceState =
    | {
        mode: 'loading';
        isLoading: true;
        summary: null;
        baseCurrency: CurrencyCode;
    }
    | {
        mode: 'error';
        isLoading: false;
        error: string;
        summary: null;
        baseCurrency: CurrencyCode;
    }
    | {
        mode: 'modern_missing_balances';
        isLoading: false;
        summary: SharedFinancialSummary;
        unrecordedCount: number;
        hasExcludedLegacy: boolean;
        baseCurrency: CurrencyCode;
    }
    | {
        mode: 'modern_usable';
        isLoading: false;
        summary: SharedFinancialSummary;
        accounts: SharedFinancialSummaryAccount[];
        unrecordedCount: number;
        hasExcludedLegacy: boolean;
        baseCurrency: CurrencyCode;
    };

export function useFinancialSourceSelection(baseCurrency: CurrencyCode): FinancialSourceState {
    const { summary, isLoading: isSummaryLoading, error: summaryError } = useSharedFinancialSummary({
        reportingCurrency: baseCurrency
    });
    const { assets: legacyAssets, isLoading: isAssetsLoading } = useAssetsQuery();
    const { liabilities: legacyLiabilities, isLoading: isLiabilitiesLoading } = useLiabilitiesQuery();

    return useMemo((): FinancialSourceState => {
        if (isSummaryLoading || isAssetsLoading || isLiabilitiesLoading) {
            return { mode: 'loading', isLoading: true, summary: null, baseCurrency };
        }

        if (summaryError) {
            // Do NOT silently fall back to legacy totals if a request fails!
            return { mode: 'error', isLoading: false, error: summaryError, summary: null, baseCurrency };
        }

        if (!summary) {
            // No summary and no explicit error — surface it, never fall back.
            return {
                mode: 'error',
                isLoading: false,
                error: 'Financial summary unavailable',
                summary: null,
                baseCurrency
            };
        }

        const usableAccounts = summary.accounts || [];
        const unrecordedCount = summary.unrecorded_count || 0;
        // After the ledger cutover the "legacy" queries are ledger accounts
        // themselves; only rows the summary does not already account for
        // (recorded or unrecorded) count as excluded legacy data.
        const knownAccountIds = new Set<string>([
            ...usableAccounts.map(a => a.account_id),
            ...((summary.unrecorded_accounts || []).map(a => a.id))
        ]);
        const hasExcludedLegacy =
            legacyAssets.some(a => !knownAccountIds.has(a.id)) ||
            legacyLiabilities.some(l => !knownAccountIds.has(l.id));

        if (usableAccounts.length === 0 && unrecordedCount > 0) {
            // Accounts exist, but all balances are unknown
            return {
                mode: 'modern_missing_balances',
                isLoading: false,
                summary,
                unrecordedCount,
                hasExcludedLegacy,
                baseCurrency
            };
        }

        // Usable balances — including the fresh-vault case with zero accounts,
        // where the summary totals are legitimately $0.
        return {
            mode: 'modern_usable',
            isLoading: false,
            summary,
            accounts: usableAccounts,
            unrecordedCount,
            hasExcludedLegacy,
            baseCurrency
        };
    }, [
        summary,
        isSummaryLoading,
        summaryError,
        legacyAssets,
        legacyLiabilities,
        isAssetsLoading,
        isLiabilitiesLoading,
        baseCurrency
    ]);
}
