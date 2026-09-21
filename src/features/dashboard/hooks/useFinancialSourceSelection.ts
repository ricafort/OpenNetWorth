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
 * - An empty `summary.accounts` does NOT mean modern accounts don't exist: accounts may be unobserved (`summary.unrecorded_count > 0`).
 * - We check `totalModernAccounts = accounts.length + unrecorded_count`.
 * - If modern accounts exist but all balances are unknown, state is 'modern_missing_balances', NOT 'legacy'.
 * - If legacy holdings coexist with modern accounts, `hasExcludedLegacy` is set to true with clear disclosure.
 * 
 * TODO: Support automated 1-click migration of legacy assets into modern accounting in Milestone 2.
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
    }
    | {
        mode: 'legacy';
        isLoading: false;
        summary: null;
        assets: Asset[];
        liabilities: Liability[];
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
            return {
                mode: 'legacy',
                isLoading: false,
                summary: null,
                assets: legacyAssets,
                liabilities: legacyLiabilities,
                baseCurrency
            };
        }

        const usableAccounts = summary.accounts || [];
        const unrecordedCount = summary.unrecorded_count || 0;
        const totalModernAccounts = usableAccounts.length + unrecordedCount;
        const hasExcludedLegacy = (legacyAssets.length > 0 || legacyLiabilities.length > 0);

        if (totalModernAccounts > 0) {
            if (usableAccounts.length === 0) {
                // Modern accounts exist, but all balances are unknown
                return {
                    mode: 'modern_missing_balances',
                    isLoading: false,
                    summary,
                    unrecordedCount,
                    hasExcludedLegacy,
                    baseCurrency
                };
            }

            return {
                mode: 'modern_usable',
                isLoading: false,
                summary,
                accounts: usableAccounts,
                unrecordedCount,
                hasExcludedLegacy,
                baseCurrency
            };
        }

        // Zero modern accounts in SQLite -> use legacy storage
        return {
            mode: 'legacy',
            isLoading: false,
            summary: null,
            assets: legacyAssets,
            liabilities: legacyLiabilities,
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
