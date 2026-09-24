import { TrendingUp, DollarSign, PieChart } from 'lucide-react';
import { PortfolioAnalysis } from '@/lib/domain/portfolioAnalysis';
import { formatCurrency } from '@/lib/utils/currencyService';
import { CurrencyCode } from '@/types';

interface PortfolioSummaryProps {
    analysis: PortfolioAnalysis;
    privacyBlur?: boolean;
    currencyCode?: CurrencyCode;
    accountValuations?: any[];
    isAuthoritativeMode?: boolean;
}

export default function PortfolioSummary({ analysis, privacyBlur = false, currencyCode = 'USD', accountValuations = [], isAuthoritativeMode = false }: PortfolioSummaryProps) {
    const blurClass = 'privacy-value';

    const totalsByCurrency = new Map<string, number>();
    
    if (isAuthoritativeMode) {
        // Modern Mode: Account valuations are the strict, sole source of truth for wealth.
        // We include both valued and unvalued (null) accounts for display counting, but only sum valid numbers.
        accountValuations.forEach(val => {
            if (val.value !== null && val.value !== undefined) {
                if (val.convertedValue !== undefined && val.convertedValue !== null) {
                    totalsByCurrency.set(currencyCode, (totalsByCurrency.get(currencyCode) || 0) + val.convertedValue);
                } else {
                    const cur = val.currency || 'USD';
                    totalsByCurrency.set(cur, (totalsByCurrency.get(cur) || 0) + val.value);
                }
            }
        });
    } else {
        // Legacy Mode: Holdings define the wealth. We use the mapped native totals to prevent dropping foreign assets.
        Object.entries(analysis.totalsByCurrency).forEach(([cur, val]) => {
            if (val > 0) {
                totalsByCurrency.set(cur, val);
            }
        });
    }

    const totalsArray = Array.from(totalsByCurrency.entries());
    if (totalsArray.length === 0) totalsArray.push([currencyCode, 0]);

    // Check if we have unvalued accounts
    const hasUnvaluedAccounts = isAuthoritativeMode && accountValuations.some(val => val.value === null || val.value === undefined);
    const allUnvaluedAccounts = isAuthoritativeMode && accountValuations.length > 0 && accountValuations.every(val => val.value === null || val.value === undefined);
    const hasLiveQuotes = analysis.holdings.some(h => h.price > 0 && h.ticker !== 'Manual');

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
                <div className={`text-2xl font-bold text-foreground ${blurClass} flex flex-col gap-1`}>
                    {allUnvaluedAccounts ? (
                        <span className="text-muted-foreground italic">Unknown</span>
                    ) : (
                        totalsArray.map(([cur, val]) => (
                            <span key={cur}>{formatCurrency(val, cur as CurrencyCode)}</span>
                        ))
                    )}
                </div>
                <div className="text-sm font-medium mt-1">
                    {hasUnvaluedAccounts ? (
                        <span className="flex flex-col">
                            {accountValuations.length > 0 && !allUnvaluedAccounts && (
                                <span className="text-amber-600 dark:text-amber-400 mb-1">Known portfolio value</span>
                            )}
                            <button onClick={() => {
                                const unvalued = accountValuations.filter(val => val.value === null || val.value === undefined);
                                const targetId = unvalued.length === 1 ? unvalued[0].id : undefined;
                                window.dispatchEvent(new CustomEvent('opennetworth_open_balance_update', { detail: { mode: 'manual', accountId: targetId } }));
                            }} className="text-amber-600 dark:text-amber-400 hover:underline text-left">
                                Balance not recorded (Update balance)
                            </button>
                        </span>
                    ) : accountValuations.length > 0 ? (
                        <span className="text-green-600 dark:text-green-400">Combined Value</span>
                    ) : hasLiveQuotes ? (
                        <span className="text-green-600 dark:text-green-400">Saved prices</span>
                    ) : (
                        <span className="text-muted-foreground">Manual Valuation</span>
                    )}
                </div>
            </div>

            {/* Total Return Card */}
            <div className="bg-card p-6 rounded-2xl border border-border shadow-sm">
                <div className="flex items-center gap-3 mb-2">
                    <div className="p-2 bg-emerald-500/10 rounded-lg text-emerald-600 dark:text-emerald-400">
                        <TrendingUp className="w-5 h-5" />
                    </div>
                    <span className="text-sm font-medium text-muted-foreground">
                        {isAuthoritativeMode ? 'Tracked holdings return' : 'Total Return'}
                    </span>
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
                                ? (isAuthoritativeMode && accountValuations.length > 0 ? 'Excludes un-detailed account valuations' : 'All-time performance')
                                : 'Percentage return unavailable — zero cost basis'}
                        </div>
                    </>
                ) : (
                    <>
                        <div className="text-xl font-bold text-muted-foreground">
                            Return unavailable
                        </div>
                        <div className="text-xs text-muted-foreground mt-1">
                            {analysis.totalHoldingsCount === 0 
                                ? 'Add holdings and purchase costs to calculate returns.'
                                : `Cost basis missing for ${analysis.missingCostBasisCount} of ${analysis.totalHoldingsCount} holdings`}
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
                    {analysis.estimatedAnnualDividends > 0 || analysis.hasDividendData
                        ? formatCurrency(analysis.estimatedAnnualDividends, currencyCode)
                        : <span className="text-lg text-muted-foreground">Income estimate unavailable</span>}
                </div>
                <div className="text-xs text-muted-foreground mt-1">
                    / year in dividends (est.)
                </div>
            </div>
        </div>
    );
}
