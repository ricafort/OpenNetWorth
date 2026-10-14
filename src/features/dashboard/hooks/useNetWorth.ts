'use client';

import { useMemo, useState, useEffect } from 'react';
import { useProfile } from '@/contexts/ProfileContext';
import { loadSettings } from '@/infrastructure/local_driver';
import { CurrencyCode } from '@/types';
import { useFinancialSourceSelection } from '@/features/dashboard/hooks/useFinancialSourceSelection';
import { centsToMajorUnits } from '@/lib/domain/accounting/types';
import { Asset } from '@/features/assets/types';
import { Liability } from '@/features/liabilities/types';

/**
 * Hook to calculate Net Worth and Totals.
 * Decoupled from DashboardContext.
 * Fulfills Deliverable 3: Automatic net-worth goals using authoritative financial totals
 */
export function useNetWorth() {
    const { profile, isDemoMode } = useProfile();
    const [baseCurrency, setBaseCurrency] = useState<CurrencyCode>('USD');

    useEffect(() => {
        if (profile?.currency_code) {
            setBaseCurrency(profile.currency_code as CurrencyCode);
        } else {
            // Only access localStorage on the client after mount
            const settings = loadSettings();
            setBaseCurrency(settings.baseCurrency);
        }
    }, [profile]);

    const sourceState = useFinancialSourceSelection(baseCurrency);

    const metrics = useMemo(() => {
        const assetsByCurrency: Partial<Record<CurrencyCode, number>> = {};
        const liabilitiesByCurrency: Partial<Record<CurrencyCode, number>> = {};
        const netWorthByCurrency: Partial<Record<CurrencyCode, number>> = {};

        if (sourceState.mode === 'modern_usable' || sourceState.mode === 'modern_missing_balances') {
            // Use authoritative accounting figures, convert cents to major units
            const { summary } = sourceState;
            
            for (const [curr, cents] of Object.entries(summary.total_assets_cents_by_currency)) {
                assetsByCurrency[curr as CurrencyCode] = centsToMajorUnits(cents as number, curr as CurrencyCode);
            }
            for (const [curr, cents] of Object.entries(summary.total_liabilities_cents_by_currency)) {
                liabilitiesByCurrency[curr as CurrencyCode] = centsToMajorUnits(cents as number, curr as CurrencyCode);
            }
            for (const [curr, cents] of Object.entries(summary.net_worth_cents_by_currency)) {
                netWorthByCurrency[curr as CurrencyCode] = centsToMajorUnits(cents as number, curr as CurrencyCode);
            }
        } else if (sourceState.mode === 'legacy') {
            // Legacy behavior
            sourceState.assets.forEach((a: Asset) => {
                const curr = (a.currency || 'USD') as CurrencyCode;
                assetsByCurrency[curr] = (assetsByCurrency[curr] || 0) + a.value;
                netWorthByCurrency[curr] = (netWorthByCurrency[curr] || 0) + a.value;
            });
    
            sourceState.liabilities.forEach((l: Liability) => {
                const curr = (l.currency || 'USD') as CurrencyCode;
                liabilitiesByCurrency[curr] = (liabilitiesByCurrency[curr] || 0) + l.balance;
                netWorthByCurrency[curr] = (netWorthByCurrency[curr] || 0) - l.balance;
            });
        }

        // Determine if coverage is complete
        let isComplete = true;
        let isError = false;
        let error = null;

        if (sourceState.mode === 'error') {
            isComplete = false;
            isError = true;
            error = sourceState.error;
        } else if (sourceState.mode === 'modern_usable' || sourceState.mode === 'modern_missing_balances') {
            if (!sourceState.summary.is_complete) {
                isComplete = false;
            }
        }

        // Fulfills Deliverable 5: Evidenced FX. If rates are missing, converted_net_worth will not be complete.
        let totalAssetsBase: number | null = assetsByCurrency[baseCurrency] || 0;
        let totalLiabilitiesBase: number | null = liabilitiesByCurrency[baseCurrency] || 0;
        let netWorthBase: number | null = netWorthByCurrency[baseCurrency] || 0;

        if (sourceState.mode === 'modern_usable' || sourceState.mode === 'modern_missing_balances') {
             if (sourceState.summary.converted_net_worth?.is_complete) {
                 netWorthBase = centsToMajorUnits(sourceState.summary.converted_net_worth.amount_cents, baseCurrency);
                 if (sourceState.summary.converted_total_assets?.is_complete) {
                     totalAssetsBase = centsToMajorUnits(sourceState.summary.converted_total_assets.amount_cents, baseCurrency);
                 }
                 if (sourceState.summary.converted_total_liabilities?.is_complete) {
                     totalLiabilitiesBase = centsToMajorUnits(sourceState.summary.converted_total_liabilities.amount_cents, baseCurrency);
                 }
             } else {
                 // Do not substitute base-currency-only totals for complete net worth!
                 netWorthBase = null;
                 totalAssetsBase = null;
                 totalLiabilitiesBase = null;
                 isComplete = false;
             }
        } else if (sourceState.mode === 'error') {
            netWorthBase = null;
            totalAssetsBase = null;
            totalLiabilitiesBase = null;
        } else {
             // Legacy mode: We only have assets and liabilities, and if they have cross-currency, we can't reliably convert them here without FX
             // We do a naive sum for legacy fallback, but we should flag if it's mixed currency
             const uniqueCurrencies = Object.keys(netWorthByCurrency);
             if (uniqueCurrencies.length > 1 || (uniqueCurrencies.length === 1 && uniqueCurrencies[0] !== baseCurrency)) {
                 isComplete = false;
                 netWorthBase = null; // Cannot provide accurate total
             } else {
                 netWorthBase = totalAssetsBase - totalLiabilitiesBase;
             }
        }

        const totalAssetsUSD = assetsByCurrency['USD'] || 0;
        const totalLiabilitiesUSD = liabilitiesByCurrency['USD'] || 0;
        const netWorthUSD = totalAssetsUSD - totalLiabilitiesUSD;

        const assetCurrencies = Object.keys(assetsByCurrency) as CurrencyCode[];
        const liabilityCurrencies = Object.keys(liabilitiesByCurrency) as CurrencyCode[];
        const netWorthCurrencies = Object.keys(netWorthByCurrency) as CurrencyCode[];

        return {
            assets: totalAssetsBase,
            liabilities: totalLiabilitiesBase,
            netWorth: netWorthBase,
            assetsUSD: totalAssetsUSD,
            liabilitiesUSD: totalLiabilitiesUSD,
            netWorthUSD: netWorthUSD,
            assetsByCurrency,
            liabilitiesByCurrency,
            netWorthByCurrency,
            assetCurrencies,
            liabilityCurrencies,
            netWorthCurrencies,
            baseCurrency,
            isComplete,
            isError,
            error
        };
    }, [sourceState, baseCurrency]);

    return {
        ...metrics,
        // Exposed so consumers (e.g. the Achievements widget) can inspect authoritative account
        // evidence without issuing a second summary fetch. Additive — existing callers unaffected.
        sourceState,
        isLoading: sourceState.isLoading
    };
}
