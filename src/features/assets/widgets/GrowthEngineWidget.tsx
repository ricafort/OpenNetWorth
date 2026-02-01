import WidgetWrapper from '@/features/dashboard/widgets/WidgetWrapper';
import PortfolioSummary from '@/features/assets/components/PortfolioSummary';
import { analyzePortfolio } from '@/lib/domain/portfolioAnalysis';
import { useDashboard } from '@/features/dashboard/context/DashboardContext';
import { convertAmount } from '@/lib/utils/currencyService';
import { useMemo } from 'react';
import Link from 'next/link';

import { useTheme } from '@/contexts/ThemeContext';

import { useAssetsQuery } from '@/features/assets/hooks/useAssetsQuery';
import { useNetWorth } from '@/features/dashboard/hooks/useNetWorth';

export default function GrowthEngineWidget() {
    const { assets: allAssets } = useAssetsQuery();
    const { baseCurrency } = useNetWorth();
    const { isEditMode, hideWidget } = useDashboard();
    const { isPrivacyBlur } = useTheme();

    const assets = allAssets.filter(a =>
        a.type === 'investment' || a.type === 'crypto' || (a.investment_details && a.investment_details.ticker)
    );

    // Convert assets to base currency for analysis
    const convertedAssets = useMemo(() => {
        return assets.map(a => {
            const conversionRate = a.currency && a.currency !== baseCurrency
                ? convertAmount(1, a.currency, baseCurrency)
                : (a.currency === undefined && baseCurrency !== 'USD' ? convertAmount(1, 'USD', baseCurrency) : 1);

            // Create a deep copy with converted values
            const newAsset = { ...a, currency: baseCurrency };

            // Convert raw value
            newAsset.value = a.value * conversionRate;

            // Convert investment details if present
            if (a.investment_details) {
                newAsset.investment_details = {
                    ...a.investment_details,
                    costBasis: a.investment_details.costBasis * conversionRate,
                    currentPrice: (a.investment_details.currentPrice || 0) * conversionRate,
                    previousClose: a.investment_details.previousClose ? a.investment_details.previousClose * conversionRate : undefined
                };
            }
            return newAsset;
        });
    }, [assets, baseCurrency]);

    // Logic to hide if empty, but in Widget system usually we let user decide layout.
    // But if no investments, it's empty.
    const hasInvestments = assets.some(a => a.type === 'investment' || a.type === 'crypto');

    if (!hasInvestments && !isEditMode) {
        // Option: Return null, which leaves a hole in the grid? 
        // Or render an placeholder "Add Investments to see Growth"?
        // Let's render placeholder.
        return (
            <WidgetWrapper
                id="growth-engine"
                title="Growth Engine"
                isEditMode={isEditMode}
                onRemove={() => hideWidget('growth-engine')}
            >
                <div className="h-full flex flex-col items-center justify-center text-center p-4">
                    <p className="text-sm text-muted-foreground mb-2">Add investments to unlock portfolio analysis.</p>
                    <Link href="/assets" className="text-xs font-bold text-blue-600 hover:underline">Go to Assets</Link>
                </div>
            </WidgetWrapper>
        );
    }

    return (
        <WidgetWrapper
            id="growth-engine"
            title="Growth Engine"
            isEditMode={isEditMode}
            onRemove={() => hideWidget('growth-engine')}
        >
            <PortfolioSummary analysis={analyzePortfolio(convertedAssets)} privacyBlur={isPrivacyBlur} currencyCode={baseCurrency} />
            <div className="mt-4 text-center">
                <Link href="/portfolio" className="text-xs font-bold text-blue-600 hover:text-blue-700 hover:underline">
                    View Detailed Analysis &rarr;
                </Link>
            </div>
        </WidgetWrapper>
    );
}
