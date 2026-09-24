import WidgetWrapper from '@/features/dashboard/widgets/WidgetWrapper';
import PortfolioSummary from '@/features/assets/components/PortfolioSummary';
import { analyzePortfolio } from '@/lib/domain/portfolioAnalysis';
import { useDashboard } from '@/features/dashboard/context/DashboardContext';
import { useMemo } from 'react';
import Link from 'next/link';

import { useTheme } from '@/contexts/ThemeContext';

import { useAssetsQuery } from '@/features/assets/hooks/useAssetsQuery';
import { useNetWorth } from '@/features/dashboard/hooks/useNetWorth';
import { useFinancialSourceSelection } from '@/features/dashboard/hooks/useFinancialSourceSelection';
import { centsToMajorUnits } from '@/lib/domain/accounting/types';

export default function GrowthEngineWidget() {
    const { assets: legacyAssetsQuery, isLoading: legacyIsLoading } = useAssetsQuery();
    const { baseCurrency } = useNetWorth();
    const sourceState = useFinancialSourceSelection(baseCurrency);
    const { isEditMode, hideWidget } = useDashboard();
    const { isPrivacyBlur } = useTheme();

    const { assets, accountValuations } = useMemo(() => {
        let holdingsAssets: any[] = [];
        let modernValuations: any[] = [];
        
        if (sourceState.mode === 'legacy') {
            holdingsAssets = sourceState.assets.filter(a =>
                a.type === 'investment' || a.type === 'crypto' || (a.investment_details && a.investment_details.ticker)
            );
        } else if (sourceState.mode === 'modern_usable' || sourceState.mode === 'modern_missing_balances') {
            const investmentSubTypes = ['investment', 'brokerage', 'crypto', 'retirement', 'superannuation', 'pension'];
            
            const modernAssetAccounts = (sourceState.summary?.accounts || []).filter(a => 
                a.account_type === 'asset' && investmentSubTypes.includes(a.account_sub_type)
            );

            const authoritativeAccountIds = new Set(
                (sourceState.summary?.accounts || []).map(a => a.account_id)
            );
            const unrecordedInvestmentAccounts = (sourceState.summary?.unrecorded_accounts || []).filter(a =>
                a.account_type === 'asset' && a.account_sub_type && investmentSubTypes.includes(a.account_sub_type)
            );
            unrecordedInvestmentAccounts.forEach(a => authoritativeAccountIds.add(a.id));

            modernValuations = modernAssetAccounts.map(a => ({
                id: a.account_id,
                name: a.account_name,
                value: a.amount_cents !== null && a.amount_cents !== undefined ? centsToMajorUnits(a.amount_cents, a.currency) : null,
                currency: a.currency,
                effectiveDate: a.effective_date,
                evidenceBasis: a.basis,
                convertedValue: a.converted_amount_cents !== undefined && a.converted_amount_cents !== null ? centsToMajorUnits(a.converted_amount_cents, baseCurrency) : null
            }));

            const unrecordedValuations = unrecordedInvestmentAccounts.map(a => ({
                id: a.id,
                name: a.name,
                value: null,
                currency: a.currency,
                effectiveDate: null,
                evidenceBasis: 'unrecorded',
                convertedValue: null
            }));

            modernValuations = [...modernValuations, ...unrecordedValuations];

            const linkedLegacy = legacyAssetsQuery.filter(a =>
                a.account_id && authoritativeAccountIds.has(a.account_id)
            );
            holdingsAssets = linkedLegacy.filter(a =>
                a.type === 'investment' || a.type === 'crypto' || (a.investment_details && a.investment_details.ticker)
            );
        }

        return { assets: holdingsAssets, accountValuations: modernValuations };
    }, [sourceState, legacyAssetsQuery, baseCurrency]);

    const hasInvestments = assets.length > 0 || accountValuations.length > 0;

    if (sourceState.mode === 'error') {
        return (
            <WidgetWrapper id="growth-engine" title="Growth Engine" isEditMode={isEditMode} onRemove={() => hideWidget('growth-engine')}>
                <div className="h-full flex flex-col items-center justify-center text-center p-4">
                    <p className="text-sm text-destructive mb-2">Failed to load portfolio.</p>
                    <button onClick={() => window.location.reload()} className="text-xs font-bold text-destructive hover:underline">Retry</button>
                </div>
            </WidgetWrapper>
        );
    }

    if (sourceState.isLoading || legacyIsLoading) {
        return (
            <WidgetWrapper id="growth-engine" title="Growth Engine" isEditMode={isEditMode} onRemove={() => hideWidget('growth-engine')}>
                <div className="h-full flex items-center justify-center p-4">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
                </div>
            </WidgetWrapper>
        );
    }

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
            <PortfolioSummary 
                analysis={analyzePortfolio(assets, baseCurrency)} 
                privacyBlur={isPrivacyBlur} 
                currencyCode={baseCurrency} 
                accountValuations={accountValuations} 
                isAuthoritativeMode={sourceState.mode !== 'legacy'} 
            />
            <div className="mt-4 text-center">
                <Link href="/portfolio" className="text-xs font-bold text-blue-600 hover:text-blue-700 hover:underline">
                    View Detailed Analysis &rarr;
                </Link>
            </div>
        </WidgetWrapper>
    );
}
