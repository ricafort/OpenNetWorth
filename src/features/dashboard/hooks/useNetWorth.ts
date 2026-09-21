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
        // TODO: In Milestone 2, deprecate legacy asset table completely in favour of double-entry ledger.
        let totalAssetsBase = 0;
        let totalLiabilitiesBase = 0;
        let totalAssetsUSD = 0;
        let totalLiabilitiesUSD = 0;

        assets.forEach((a: Asset) => {
            const curr = (a.currency || 'USD') as CurrencyCode;
            if (curr === baseCurrency) {
                totalAssetsBase += a.value;
            }
            if (curr === 'USD') {
                totalAssetsUSD += a.value;
            }
        });

        liabilities.forEach((l: Liability) => {
            const curr = (l.currency || 'USD') as CurrencyCode;
            if (curr === baseCurrency) {
                totalLiabilitiesBase += l.balance;
            }
            if (curr === 'USD') {
                totalLiabilitiesUSD += l.balance;
            }
        });

        const netWorthBase = totalAssetsBase - totalLiabilitiesBase;
        const netWorthUSD = totalAssetsUSD - totalLiabilitiesUSD;

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
