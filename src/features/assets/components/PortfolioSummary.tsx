import { TrendingUp, DollarSign, PieChart } from 'lucide-react';
import { PortfolioAnalysis } from '@/lib/domain/portfolioAnalysis';
import { formatCurrency } from '@/lib/utils/currencyService';
import { CurrencyCode } from '@/types';

interface PortfolioSummaryProps {
    analysis: PortfolioAnalysis;
    privacyBlur?: boolean;
    currencyCode?: CurrencyCode;
}

export default function PortfolioSummary({ analysis, privacyBlur = false, currencyCode = 'USD' }: PortfolioSummaryProps) {
    // Note: The caller (GrowthEngineWidget) ensures 'analysis' values are already in 'currencyCode' units.
    const blurClass = 'privacy-value';

    return (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Total Value Card */}
            <div className="bg-card p-6 rounded-2xl border border-border shadow-sm">
                <div className="flex items-center gap-3 mb-2">
                    <div className="p-2 bg-blue-500/10 rounded-lg text-blue-600 dark:text-blue-400">
                        <DollarSign className="w-5 h-5" />
                    </div>
                    <span className="text-sm font-medium text-muted-foreground">Portfolio Value</span>
                </div>
                <div className={`text-2xl font-bold text-foreground ${blurClass}`}>
                    {formatCurrency(analysis.totalValue, currencyCode)}
                </div>
                <div className="text-sm text-green-600 dark:text-green-400 font-medium mt-1">
                    Live Updated
                </div>
            </div>

            {/* Total Return Card */}
            <div className="bg-card p-6 rounded-2xl border border-border shadow-sm">
                <div className="flex items-center gap-3 mb-2">
                    <div className="p-2 bg-emerald-500/10 rounded-lg text-emerald-600 dark:text-emerald-400">
                        <TrendingUp className="w-5 h-5" />
                    </div>
                    <span className="text-sm font-medium text-muted-foreground">Total Return</span>
                </div>
                {analysis.hasCostBasis ? (
                    <>
                        <div className={`text-2xl font-bold text-foreground flex items-baseline gap-2 ${blurClass}`}>
                            {formatCurrency(analysis.totalGain, currencyCode)}
                            {analysis.totalGainPercent !== null ? (
                                <span className={`text-sm font-medium ${analysis.totalGainPercent >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                                    ({analysis.totalGainPercent.toFixed(1)}%)
                                </span>
                            ) : null}
                        </div>
                        <div className="text-xs text-muted-foreground mt-1">
                            {analysis.totalGainPercent !== null
                                ? 'All-time performance'
                                : 'Percentage return unavailable — zero cost basis'}
                        </div>
                    </>
                ) : (
                    <>
                        <div className="text-xl font-bold text-muted-foreground">
                            Return unavailable
                        </div>
                        <div className="text-xs text-muted-foreground mt-1">
                            Cost basis missing for {analysis.missingCostBasisCount} of {analysis.totalHoldingsCount} holdings
                        </div>
                    </>
                )}
            </div>

            {/* Projected Income Card */}
            <div className="bg-card p-6 rounded-2xl border border-border shadow-sm">
                <div className="flex items-center gap-3 mb-2">
                    <div className="p-2 bg-purple-500/10 rounded-lg text-purple-600 dark:text-purple-400">
                        <PieChart className="w-5 h-5" />
                    </div>
                    <span className="text-sm font-medium text-muted-foreground">Projected Income</span>
                </div>
                <div className={`text-2xl font-bold text-foreground ${blurClass}`}>
                    {formatCurrency(analysis.estimatedAnnualDividends, currencyCode)}
                </div>
                <div className="text-xs text-muted-foreground mt-1">
                    / year in dividends (est.)
                </div>
            </div>
        </div>
    );
}
