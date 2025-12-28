
'use client';

import { useState, useEffect } from 'react';
import Sidebar from '@/components/Sidebar';
import { loadAssets } from '@/lib/storage';
import { Asset } from '@/types';
import { fetchAllPrices } from '@/lib/priceService';
import { analyzePortfolio, PortfolioAnalysis } from '@/lib/portfolioAnalysis';
import PortfolioSummary from '@/components/PortfolioSummary';
import ConcentrationWarning from '@/components/ConcentrationWarning';
import HoldingCard from '@/components/HoldingCard';
import Link from 'next/link';
import { Plus, ArrowRight, TrendingUp } from 'lucide-react';
import AllocationPieChart from '@/components/AllocationPieChart';
import { generateInvestmentAdviceAction } from '@/app/actions';
import { useTheme } from '@/contexts/ThemeContext';

export default function PortfolioPage() {
    const [assets, setAssets] = useState<Asset[]>([]);
    const [analysis, setAnalysis] = useState<PortfolioAnalysis | null>(null);
    const [loading, setLoading] = useState(true);
    const [advice, setAdvice] = useState<string>('');
    const { isPrivacyBlur } = useTheme();

    useEffect(() => {
        const loadData = async () => {
            setLoading(true);
            const loadedAssets = loadAssets();

            // Filter for investments or assets that act as investments
            const investmentAssets = loadedAssets.filter(a =>
                a.type === 'investment' || a.type === 'crypto' || (a.investment && a.investment.ticker)
            );

            // Extract tickers and types
            const requests = investmentAssets
                .filter(a => a.investment?.ticker)
                .map(a => {
                    const t = a.investment!.ticker;
                    const cls = a.investment?.assetClass;
                    let type: 'stock' | 'crypto' | 'other' = 'stock';

                    if (cls === 'crypto') type = 'crypto';
                    else if (cls === 'stock' || cls === 'etf') type = 'stock';
                    else if (a.type === 'crypto') type = 'crypto'; // Fallback to asset type

                    return { ticker: t, type };
                });

            // Fetch live prices
            if (requests.length > 0) {
                const prices = await fetchAllPrices(requests);

                // Update assets with live prices
                investmentAssets.forEach(asset => {
                    if (asset.investment && asset.investment.ticker) {
                        const priceData = prices.get(asset.investment.ticker);
                        if (priceData) {
                            asset.investment.currentPrice = priceData.price;
                            asset.investment.previousClose = priceData.previousClose;
                            asset.investment.lastPriceUpdate = priceData.lastUpdated;
                        }
                    }
                });
            }

            // Run analysis
            // We pass ALL loaded assets, but the analysis logic primarily handles those with investment details
            // However, to show true portfolio weight, we might want to include all assets?
            // For "Growth Engine", we usually just want liquid investments.
            // Let's pass all assets but the analysis will distinguish.
            // Actually, for this specific "Growth Engine" page, let's focus on the investment assets.

            const result = analyzePortfolio(investmentAssets);
            setAnalysis(result);
            setAssets(investmentAssets);
            setLoading(false);

            // Fetch Advice
            if (investmentAssets.length > 0) {
                generateInvestmentAdviceAction(
                    "Warren Buffett", // Default archetype suitable for investing
                    "the Oracle of Omaha, focused on value and long-term holding",
                    {
                        totalValue: result.totalValue,
                        totalGainPercent: result.totalGainPercent,
                        topHoldings: result.holdings.slice(0, 3).map(h => ({ ticker: h.ticker, percentage: h.weight })),
                        sectorAllocation: result.sectorBreakdown.slice(0, 3).map(s => ({ sector: s.sector, percentage: s.weight })),
                        concentratedStock: result.holdings.find(h => h.isConcentrated)?.ticker
                    }
                ).then(setAdvice);
            }
        };

        loadData();
    }, []);

    if (loading) {
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

            {!analysis || assets.length === 0 ? (
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
                    <PortfolioSummary analysis={analysis} privacyBlur={isPrivacyBlur} />

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
                                {analysis.holdings.map((holding, idx) => (
                                    <HoldingCard key={`${holding.ticker}-${idx}`} holding={holding} privacySensitive={isPrivacyBlur} />
                                ))}
                            </div>
                        </div>

                        {/* Right: Allocation & Insights */}
                        <div className="space-y-6">
                            <AllocationPieChart
                                title="Asset Class Allocation"
                                data={analysis.assetClassBreakdown.map(a => ({ name: a.assetClass.toUpperCase(), value: a.weight }))}
                            />

                            <AllocationPieChart
                                title="Sector Allocation"
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
                                    "{advice || "Analyzing your portfolio strategy..."}"
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
        </div>
    );
}
