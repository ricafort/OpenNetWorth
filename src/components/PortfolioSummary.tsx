
// src/components/PortfolioSummary.tsx
'use client';

import { TrendingUp, DollarSign, PieChart } from 'lucide-react';
import { PortfolioAnalysis } from '@/lib/portfolioAnalysis';

interface PortfolioSummaryProps {
    analysis: PortfolioAnalysis;
    privacyBlur?: boolean;
}

export default function PortfolioSummary({ analysis, privacyBlur = false }: PortfolioSummaryProps) {
    const blurClass = privacyBlur ? 'privacy-value' : '';

    return (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Total Value Card */}
            <div className="bg-card p-6 rounded-2xl border border-border shadow-sm">
                <div className="flex items-center gap-3 mb-2">
                    <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg text-blue-600 dark:text-blue-400">
                        <DollarSign className="w-5 h-5" />
                    </div>
                    <span className="text-sm font-medium text-muted-foreground">Portfolio Value</span>
                </div>
                <div className={`text-2xl font-bold text-foreground ${blurClass}`}>
                    ${analysis.totalValue.toLocaleString()}
                </div>
                <div className="text-sm text-green-600 dark:text-green-400 font-medium mt-1">
                    Live Updated
                </div>
            </div>

            {/* Total Return Card */}
            <div className="bg-card p-6 rounded-2xl border border-border shadow-sm">
                <div className="flex items-center gap-3 mb-2">
                    <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg text-green-600 dark:text-green-400">
                        <TrendingUp className="w-5 h-5" />
                    </div>
                    <span className="text-sm font-medium text-muted-foreground">Total Return</span>
                </div>
                <div className={`text-2xl font-bold text-foreground flex items-baseline gap-2 ${blurClass}`}>
                    ${analysis.totalGain.toLocaleString()}
                    <span className="text-sm text-green-600 font-medium">({analysis.totalGainPercent.toFixed(1)}%)</span>
                </div>
                <div className="text-xs text-muted-foreground mt-1">
                    All-time performance
                </div>
            </div>

            {/* Projected Income Card */}
            <div className="bg-card p-6 rounded-2xl border border-border shadow-sm">
                <div className="flex items-center gap-3 mb-2">
                    <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg text-purple-600 dark:text-purple-400">
                        <PieChart className="w-5 h-5" />
                    </div>
                    <span className="text-sm font-medium text-muted-foreground">Projected Income</span>
                </div>
                <div className={`text-2xl font-bold text-foreground ${blurClass}`}>
                    ${analysis.estimatedAnnualDividends.toLocaleString()}
                </div>
                <div className="text-xs text-muted-foreground mt-1">
                    / year in dividends (est.)
                </div>
            </div>
        </div>
    );
}
