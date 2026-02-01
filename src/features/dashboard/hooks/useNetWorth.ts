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
        // Calculate Totals (USD) - Standardized Intermediate
        const totalAssetsUSD = assets.reduce((sum: number, a: Asset) => {
            return sum + convertAmount(a.value, a.currency || 'USD', 'USD');
        }, 0);

        const totalLiabilitiesUSD = liabilities.reduce((sum: number, l: Liability) => {
            const converted = convertAmount(l.balance, l.currency || 'USD', 'USD');
            return sum + converted;
        }, 0);

        const netWorthUSD = totalAssetsUSD - totalLiabilitiesUSD;

        // Calculate Totals (Base Currency) - Display
        const totalAssetsBase = convertAmount(totalAssetsUSD, 'USD', baseCurrency);
        const totalLiabilitiesBase = convertAmount(totalLiabilitiesUSD, 'USD', baseCurrency);
        const netWorthBase = totalAssetsBase - totalLiabilitiesBase;

        return {
            assets: totalAssetsBase,
            liabilities: totalLiabilitiesBase,
            netWorth: netWorthBase,
            assetsUSD: totalAssetsUSD,
            liabilitiesUSD: totalLiabilitiesUSD,
            netWorthUSD: netWorthUSD,
            baseCurrency
        };
    }, [assets, liabilities, baseCurrency]);

    return {
        ...metrics,
        isLoading: assetsLoading || liabilitiesLoading
    };
}
