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
import { formatCurrency } from '@/lib/utils/currencyService';

export default function GrowthEngineWidget() {
    const { assets: legacyAssetsQuery, isLoading: legacyIsLoading } = useAssetsQuery();
    const { baseCurrency } = useNetWorth();
    const sourceState = useFinancialSourceSelection(baseCurrency);
    const { isEditMode, hideWidget } = useDashboard();
    const { isPrivacyBlur } = useTheme();

    const { assets, accountValuations } = useMemo(() => {
        let holdingsAssets: any[] = [];
        let modernValuations: any[] = [];
        
        if (sourceState.mode === 'modern_usable' || sourceState.mode === 'modern_missing_balances') {
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

    // Largest investment accounts breakdown: makes the widget informative even when
    // cost-basis returns and dividend income are unavailable. Only uses recorded
    // valuations; converted values display in base currency, native ones stay native
    // (never fabricate cross-currency totals).
    const topInvestmentAccounts = useMemo(() => {
        return accountValuations
            .filter(v => v.value !== null && v.value !== undefined)
            .sort((a, b) => ((b.convertedValue ?? b.value ?? 0) - (a.convertedValue ?? a.value ?? 0)))
            .slice(0, 3);
    }, [accountValuations]);

    const latestValuationDate = useMemo(() => {
        const dates = accountValuations
            .map(v => v.effectiveDate)
            .filter((d): d is string => Boolean(d));
        if (dates.length === 0) return null;
        return dates.reduce((max, d) => (d > max ? d : max));
    }, [accountValuations]);

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
                isAuthoritativeMode
                valueContextNote="Same total as the Investment slice in Asset Allocation"
            />
            {topInvestmentAccounts.length > 0 && (
                // px-2 keeps the list clear of the card's border: the widget content box
                // has overflow-hidden, so flush-edge text was being clipped.
                <div className="mt-4 px-2">
                    <div className="flex items-center justify-between mb-1.5">
                        <span className="text-[10px] uppercase font-bold tracking-wide text-muted-foreground">
                            Largest investment accounts
                        </span>
                        {latestValuationDate && (
                            <span className="text-[10px] text-muted-foreground">
                                as of {new Date(latestValuationDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                            </span>
                        )}
                    </div>
                    <div className="space-y-1">
                        {topInvestmentAccounts.map(v => {
                            const isConverted = v.convertedValue !== null && v.convertedValue !== undefined;
                            const amount = isConverted ? v.convertedValue : v.value;
                            return (
                                <div key={v.id} className="flex items-center justify-between gap-2 text-xs border-b border-border/40 pb-1 last:border-0">
                                    <span className="min-w-0 truncate font-medium text-foreground">{v.name}</span>
                                    <span className="text-muted-foreground tabular-nums whitespace-nowrap">
                                        {formatCurrency(amount, isConverted ? baseCurrency : (v.currency || baseCurrency))}
                                    </span>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}
            <div className="mt-4 text-center">
                <Link href="/portfolio" className="text-xs font-bold text-blue-600 hover:text-blue-700 hover:underline">
                    View Detailed Analysis &rarr;
                </Link>
            </div>
        </WidgetWrapper>
    );
}
