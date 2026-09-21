'use client';

import { useMemo, useState, useEffect } from 'react';
import { useAssetsQuery } from '@/features/assets/hooks/useAssetsQuery';
import { useLiabilitiesQuery } from '@/features/liabilities/hooks/useLiabilitiesQuery';
import { useProfile } from '@/contexts/ProfileContext';
import { loadSettings } from '@/infrastructure/local_driver';
import { convertAmount } from '@/lib/utils/currencyService';
import { CurrencyCode } from '@/types';
import { Asset } from '@/features/assets/types';
import { Liability } from '@/features/liabilities/types';

/**
 * Hook to calculate Net Worth and Totals.
 * Decoupled from DashboardContext.
 */
export function useNetWorth() {
    const { assets, isLoading: assetsLoading } = useAssetsQuery();
    const { liabilities, isLoading: liabilitiesLoading } = useLiabilitiesQuery();
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

    const metrics = useMemo(() => {
        // Why this exists:
        // Calculates native base currency totals for legacy items without applying unverified mock exchange rates.
        // Tricky logic:
        // When legacy assets are in foreign currencies (e.g. USD when base is AUD), summing with fake rates (1.54)
        // produces fabricated financial figures. We sum matching base currency items, and also track USD native items.
        // Group legacy holdings by native currency (Resolves Issue 1)
        const assetsByCurrency: Partial<Record<CurrencyCode, number>> = {};
        const liabilitiesByCurrency: Partial<Record<CurrencyCode, number>> = {};
        const netWorthByCurrency: Partial<Record<CurrencyCode, number>> = {};

        assets.forEach((a: Asset) => {
            const curr = (a.currency || 'USD') as CurrencyCode;
            assetsByCurrency[curr] = (assetsByCurrency[curr] || 0) + a.value;
            netWorthByCurrency[curr] = (netWorthByCurrency[curr] || 0) + a.value;
        });

        liabilities.forEach((l: Liability) => {
            const curr = (l.currency || 'USD') as CurrencyCode;
            liabilitiesByCurrency[curr] = (liabilitiesByCurrency[curr] || 0) + l.balance;
            netWorthByCurrency[curr] = (netWorthByCurrency[curr] || 0) - l.balance;
        });

        const totalAssetsBase = assetsByCurrency[baseCurrency] || 0;
        const totalLiabilitiesBase = liabilitiesByCurrency[baseCurrency] || 0;
        const netWorthBase = totalAssetsBase - totalLiabilitiesBase;

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
            baseCurrency
        };
    }, [assets, liabilities, baseCurrency]);

    return {
        ...metrics,
        isLoading: assetsLoading || liabilitiesLoading
    };
}
