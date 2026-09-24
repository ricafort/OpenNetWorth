'use client';

import { useState, useEffect } from 'react';
import Sidebar from '@/components/layout/Sidebar';
import { useAssetsQuery } from '@/features/assets/hooks/useAssetsQuery';
import { useProfile } from '@/contexts/ProfileContext'; // Import this
import { Asset } from '@/features/assets/types';
import { getPricesAction } from '@/features/assets/actions/getPrices';
import { analyzePortfolio, PortfolioAnalysis } from '@/lib/domain/portfolioAnalysis';
import PortfolioSummary from '@/features/assets/components/PortfolioSummary';
import ConcentrationWarning from '@/features/assets/components/ConcentrationWarning';
import HoldingCard from '@/features/assets/components/HoldingCard';
import Link from 'next/link';
import { Plus, ArrowRight, TrendingUp } from 'lucide-react';
import AllocationPieChart from '@/features/assets/components/AllocationPieChart';
import UpdateBalancesModal from '@/features/sync/components/UpdateBalancesModal';
import { generateInvestmentAdviceAction } from '@/app/actions';
import { useTheme } from '@/contexts/ThemeContext';
import { useNetWorth } from '@/features/dashboard/hooks/useNetWorth';
import { useFinancialSourceSelection } from '@/features/dashboard/hooks/useFinancialSourceSelection';
import { centsToMajorUnits } from '@/lib/domain/accounting/types';

function isAustralianTicker(ticker: string): boolean {
    return ticker.toUpperCase().endsWith('.AX');
}

export default function PortfolioPage() {
    const { assets: legacyAssetsQuery, isLoading } = useAssetsQuery();
    const { isDemoMode } = useProfile(); // Use context source of truth
    const { baseCurrency } = useNetWorth();
    const sourceState = useFinancialSourceSelection(baseCurrency);
    const { isPrivacyBlur } = useTheme();

    const [analysis, setAnalysis] = useState<PortfolioAnalysis | null>(null);
    const [advice, setAdvice] = useState<string>('');
    const [isAnalyzing, setIsAnalyzing] = useState(true);
    const [accountValuations, setAccountValuations] = useState<any[]>([]);
    const [unlinkedLegacyAssets, setUnlinkedLegacyAssets] = useState<Asset[]>([]);
    const [isUpdateModalOpen, setIsUpdateModalOpen] = useState(false);
    const [updateModalAccountId, setUpdateModalAccountId] = useState<string | undefined>(undefined);

    const [updateModalMode, setUpdateModalMode] = useState<'paste' | 'statement' | 'manual'>('manual');

    useEffect(() => {
        const handleOpenUpdate = (e: any) => {
            if (e.detail?.mode) setUpdateModalMode(e.detail.mode);
            setUpdateModalAccountId(e.detail?.accountId);
            setIsUpdateModalOpen(true);
        };
        window.addEventListener('opennetworth_open_balance_update', handleOpenUpdate);
        return () => window.removeEventListener('opennetworth_open_balance_update', handleOpenUpdate);
    }, []);

    useEffect(() => {
        const analyze = async () => {
            if (sourceState.isLoading || isLoading) return;
            setIsAnalyzing(true);

            // Combine legacy investment assets and modern accounting asset accounts
            let investmentAssets: Asset[] = [];
            let modernValuations: any[] = [];
            let unlinkedAssets: Asset[] = [];

            if (sourceState.mode === 'legacy') {
                investmentAssets = sourceState.assets.filter(a =>
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

                const unlinkedLegacy = legacyAssetsQuery.filter(a => 
                    !a.account_id || !authoritativeAccountIds.has(a.account_id)
                );
                
                unlinkedAssets = unlinkedLegacy.filter(a =>
                    a.type === 'investment' || a.type === 'crypto' || (a.investment_details && a.investment_details.ticker)
                );

                const linkedLegacy = legacyAssetsQuery.filter(a =>
                    a.account_id && authoritativeAccountIds.has(a.account_id)
                );
                investmentAssets = linkedLegacy.filter(a =>
                    a.type === 'investment' || a.type === 'crypto' || (a.investment_details && a.investment_details.ticker)
                );
            }
            
            setAccountValuations(modernValuations);
            setUnlinkedLegacyAssets(unlinkedAssets);

            // Extract tickers
            const requests = investmentAssets
                .filter(a => a.investment_details?.ticker)
                .map(a => {
                    const t = a.investment_details!.ticker;
                    const cls = a.investment_details?.assetClass;
                    let type: 'stock' | 'crypto' | 'other' = 'stock';

                    if (cls === 'crypto') type = 'crypto';
                    else if (cls === 'stock' || cls === 'etf') type = 'stock';
                    else if (a.type === 'crypto') type = 'crypto';

                    return { ticker: t, type };
                });

            // Fetch live prices
            let prices = new Map<string, any>();
            if (requests.length > 0) {
                try {
                    const pricesObj = await getPricesAction(requests, { isDemo: isDemoMode });
                    prices = new Map(Object.entries(pricesObj));
                } catch (err) {
                    console.error("Failed to fetch prices", err);
                }
            }

            // Normalize
            const normalizedAssets = investmentAssets.map(asset => {
                const newAsset = { ...asset };
                const assetCurrency = asset.currency || 'USD';
                if (newAsset.investment_details && newAsset.investment_details.ticker) {
                    const priceData = prices.get(newAsset.investment_details.ticker);
                    if (priceData) {
                        const quoteCurrency = priceData.currency || (isAustralianTicker(newAsset.investment_details.ticker) ? 'AUD' : 'USD');
                        
                        // Per Remediation Feedback: Missing FX => unavailable/partial information, never invented conversion.
                        // We do not have synchronous exchange rates to safely convert cross-currency price data.
                        // We preserve the native amounts; analyzePortfolio will safely exclude them from authoritative aggregation.
                        newAsset.investment_details = {
                            ...newAsset.investment_details,
                            currentPrice: priceData.price,
                            previousClose: priceData.previousClose,
                            lastPriceUpdate: priceData.lastUpdated,
                            costBasis: newAsset.investment_details.costBasis
                        };
                    }
                }
                return newAsset;
            });

            // Analyze
            const result = analyzePortfolio(normalizedAssets, baseCurrency);
            setAnalysis(result);
            setIsAnalyzing(false);

            // Advice
            if (investmentAssets.length > 0) {
                generateInvestmentAdviceAction(
                    "Warren Buffett",
                    "the Oracle of Omaha",
                    {
                        totalValue: result.totalValue,
                        totalGainPercent: result.totalGainPercent ?? 0,
                        topHoldings: result.holdings.slice(0, 3).map(h => ({ ticker: h.ticker, percentage: h.weight })),
                        sectorAllocation: result.sectorBreakdown.slice(0, 3).map(s => ({ sector: s.sector, percentage: s.weight })),
                        concentratedStock: result.holdings.find(h => h.isConcentrated)?.ticker
                    }
                ).then(setAdvice);
            }
        };

        analyze();
    }, [sourceState, isLoading, legacyAssetsQuery, baseCurrency, isDemoMode]);

    if (isLoading || isAnalyzing) {
        return (
            <div className="flex-1 flex items-center justify-center min-h-[50vh]">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
        );
    }

    return (
        <div className="space-y-8">
            {/* Header */}
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-black text-foreground tracking-tight">Growth Engine</h1>
                    <p className="text-muted-foreground mt-2 font-medium">Analyze and optimize your investment portfolio.</p>
                </div>
                <Link href="/assets" className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors">
                    <Plus className="w-4 h-4" />
                    Add Holdings
                </Link>
            </div>

            {sourceState.mode === 'error' ? (
                <div className="text-center py-20 bg-card rounded-2xl border border-destructive/20 shadow-sm">
                    <h3 className="text-lg font-semibold text-destructive mb-2">Failed to load portfolio</h3>
                    <p className="text-muted-foreground max-w-md mx-auto mb-6">
                        There was an error retrieving your accounting summary. Please try again.
                    </p>
                    <button onClick={() => window.location.reload()} className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-lg font-medium hover:bg-primary/90 transition-colors">
                        Retry
                    </button>
                </div>
            ) : !analysis || (analysis.totalHoldingsCount === 0 && accountValuations.length === 0 && unlinkedLegacyAssets.length === 0) ? (
                <div className="text-center py-20 bg-card rounded-2xl border border-dashed border-border">
                    <h3 className="text-lg font-semibold text-foreground mb-2">No investments tracked yet</h3>
                    <p className="text-muted-foreground max-w-md mx-auto mb-6">
                        Add your stocks, crypto, or ETFs in the Assets section to unlock the Growth Engine.
                    </p>
                    <Link href="/assets" className="inline-flex items-center gap-2 text-primary font-medium hover:underline">
                        Go to Assets <ArrowRight className="w-4 h-4" />
                    </Link>
                </div>
            ) : (
                <div className="space-y-8">
                    {/* Summary Cards */}
                    <PortfolioSummary 
                        analysis={analysis} 
                        privacyBlur={isPrivacyBlur} 
                        currencyCode={baseCurrency} 
                        accountValuations={accountValuations} 
                        isAuthoritativeMode={sourceState.mode !== 'legacy'} 
                    />

                    {/* Concentration Warnings */}
                    <ConcentrationWarning warnings={analysis.concentrationWarnings} />

                    {/* Main Content Grid */}
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                        {/* Left: Holdings List */}
                        <div className="lg:col-span-2 space-y-6">
                            <div className="flex justify-between items-center">
                                <h2 className="text-xl font-bold text-foreground">Holdings</h2>
                                <div className="text-sm text-muted-foreground">
                                    Sorted by Value
                                </div>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {analysis.holdings.filter(h => h.ticker !== 'Manual').map((holding, idx) => (
                                    <HoldingCard key={`${holding.ticker}-${idx}`} holding={holding} privacySensitive={isPrivacyBlur} currencyCode={baseCurrency} />
                                ))}
                                {analysis.holdings.filter(h => h.ticker !== 'Manual').length === 0 && (
                                    <div className="md:col-span-2 p-6 rounded-xl bg-muted/50 border border-border text-center text-sm text-muted-foreground">
                                        No specific holdings data tracked.
                                    </div>
                                )}
                            </div>

                            {accountValuations.length > 0 && (
                                <div className="pt-6">
                                    <div className="flex justify-between items-center mb-4">
                                        <h2 className="text-xl font-bold text-foreground">Account Valuations</h2>
                                        <div className="text-sm text-muted-foreground">
                                            Included in wealth, excluded from holdings analysis
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        {accountValuations.map((val, idx) => (
                                            <div key={`val-${val.id}-${idx}`} className="bg-card p-4 rounded-xl border border-border shadow-sm">
                                                <h3 className="font-bold text-foreground mb-1">{val.name}</h3>
                                                <div className="text-lg font-bold text-foreground mb-2">
                                                    {val.value !== null && val.value !== undefined ? `${val.value.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })} ${val.currency}` : 'Balance not recorded'}
                                                </div>
                                                <div className="flex justify-between text-xs text-muted-foreground bg-secondary/50 p-2 rounded-lg">
                                                    <span className="capitalize">{val.evidenceBasis}</span>
                                                    <span>{val.effectiveDate || 'Pending'}</span>
                                                </div>
                                                {val.value === null || val.value === undefined ? (
                                                    <div className="mt-3">
                                                        <button onClick={() => window.dispatchEvent(new CustomEvent('opennetworth_open_balance_update', { detail: { mode: 'manual', accountId: val.id } }))} className="text-xs font-medium text-amber-600 hover:text-amber-700 hover:underline">
                                                            Update balance &rarr;
                                                        </button>
                                                    </div>
                                                ) : null}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {unlinkedLegacyAssets.length > 0 && (
                                <div className="pt-6">
                                    <div className="flex justify-between items-center mb-4">
                                        <h2 className="text-xl font-bold text-foreground">Unlinked Legacy Investments</h2>
                                        <div className="text-sm text-muted-foreground">
                                            Excluded from Authoritative Totals
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        {unlinkedLegacyAssets.map((asset, idx) => (
                                            <div key={`unlinked-${asset.id}-${idx}`} className="bg-card p-4 rounded-xl border border-dashed border-border shadow-sm opacity-70">
                                                <h3 className="font-bold text-foreground mb-1">{asset.name}</h3>
                                                <div className="text-lg font-bold text-foreground">
                                                    {asset.value !== null && asset.value !== undefined ? `${asset.value.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })} ${asset.currency || 'USD'}` : 'Unvalued'}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Right: Allocation & Insights */}
                        <div className="space-y-6">
                            <AllocationPieChart
                                title="Asset Class Allocation (Tracked holdings only)"
                                data={analysis.assetClassBreakdown.map(a => ({ name: a.assetClass.toUpperCase(), value: a.weight }))}
                            />

                            <AllocationPieChart
                                title="Sector Allocation (Tracked holdings only)"
                                data={analysis.sectorBreakdown.map(s => ({ name: s.sector, value: s.weight }))}
                                colors={['#0ea5e9', '#ec4899', '#8b5cf6', '#f59e0b', '#10b981', '#6366f1']}
                            />

                            {/* Mentor Insight */}
                            <div className="bg-card p-6 rounded-2xl border border-indigo-200 dark:border-indigo-800 shadow-sm relative overflow-hidden group">
                                <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                                    <TrendingUp size={48} className="text-indigo-600" />
                                </div>
                                <h3 className="font-bold text-indigo-700 dark:text-indigo-400 mb-2 flex items-center gap-2 relative z-10">
                                    Mentor's Take
                                </h3>
                                <p className="text-sm text-foreground italic relative z-10 font-medium leading-relaxed">
                                    {advice 
                                        ? `"${advice}"` 
                                        : analysis.totalHoldingsCount === 0 
                                            ? "Add tracked holdings to unlock AI portfolio insights." 
                                            : "Analyzing your portfolio strategy..."}
                                </p>
                                <p className="text-xs text-muted-foreground mt-3 font-semibold relative z-10 flex items-center gap-2">
                                    <span className="w-2 h-2 rounded-full bg-indigo-500"></span>
                                    AI Investment Analyst
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            )}
            <UpdateBalancesModal 
                isOpen={isUpdateModalOpen}
                onClose={() => setIsUpdateModalOpen(false)}
                initialMode={updateModalMode}
                initialAccountId={updateModalAccountId}
            />
        </div>
    );
}
