'use client';

import { useState, useEffect, useMemo } from 'react';
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer, Sector } from 'recharts';
import { useNetWorth } from '@/features/dashboard/hooks/useNetWorth';
import { formatCurrency } from '@/lib/utils/currencyService';
import { useFinancialSourceSelection } from '@/features/dashboard/hooks/useFinancialSourceSelection';
import { CURRENCY_DECIMALS, CurrencyCode } from '@/lib/domain/accounting/types';
import { AlertCircle, Scale } from 'lucide-react';
import { classifyCategory } from '@/features/assets/utils/classifyCategory';

/**
 * AssetAllocationChart
 * 
 * Why this component exists:
 * Visualizes the proportional distribution of assets across categories.
 * 
 * Tricky logic:
 * - Resolves Finding 1 & Clarification 2: Consumes unified source selection rule.
 *   Never silently falls back to legacy totals when modern accounts exist.
 * - Resolves Finding 2 & Clarification 3: Never calculates allocation percentages across mixed native currencies.
 *   If converted amounts are authoritatively complete via `converted_total_assets`, calculates allocation in `baseCurrency`.
 *   If unconverted (e.g. single foreign currency or missing exchange rates), groups strictly by native currency
 *   and provides a native currency selector to prevent fabricating cross-currency ratios.
 * - Discloses excluded legacy records when modern vault accounts are active.
 * 
 * TODO: Add a toggle between donut and horizontal sorted bar view for large numbers of asset classes.
 */
export default function AssetAllocationChart() {
    const { baseCurrency } = useNetWorth();
    const sourceState = useFinancialSourceSelection(baseCurrency);
    const [isMounted, setIsMounted] = useState(false);
    const [selectedCurrencyOverride, setSelectedCurrencyOverride] = useState<CurrencyCode | null>(null);

    useEffect(() => {
        setIsMounted(true);
    }, []);

    // 1. Determine available currencies for active holdings
    const modernAssetAccounts = useMemo(() => {
        if (sourceState.mode !== 'modern_usable') return [];
        return sourceState.accounts.filter(a => a.account_type === 'asset');
    }, [sourceState]);

    const availableCurrencies = useMemo(() => {
        if (sourceState.mode === 'modern_usable') {
            return Array.from(new Set(modernAssetAccounts.map(a => a.currency))) as CurrencyCode[];
        }
        return [];
    }, [sourceState.mode, modernAssetAccounts]);

    // Active selected currency for unconverted native multi-currency view
    const activeCurrency = useMemo((): CurrencyCode => {
        if (selectedCurrencyOverride && availableCurrencies.includes(selectedCurrencyOverride)) {
            return selectedCurrencyOverride;
        }
        if (availableCurrencies.includes(baseCurrency)) {
            return baseCurrency;
        }
        return availableCurrencies[0] || baseCurrency;
    }, [selectedCurrencyOverride, availableCurrencies, baseCurrency]);

    // 2. Calculate allocation breakdown
    const { data, grandTotal, totalCount, displayCurrency, isConverted, unconvertedNotice } = useMemo(() => {
        const categoryTotals: Record<string, number> = {};
        let total = 0;
        let count = 0;
        let dispCurr: CurrencyCode = baseCurrency;
        let converted = false;
        let notice: string | undefined = undefined;

        if (sourceState.mode === 'modern_usable') {
            const { summary } = sourceState;
            const isConvertedComplete = Boolean(summary.converted_total_assets?.is_complete);

            if (isConvertedComplete) {
                // Scenario A: Authoritatively converted into baseCurrency
                converted = true;
                dispCurr = baseCurrency;
                const baseDecimals = CURRENCY_DECIMALS[baseCurrency] ?? 2;

                modernAssetAccounts.forEach(acc => {
                    if (acc.converted_amount_cents !== undefined) {
                        const val = acc.converted_amount_cents / Math.pow(10, baseDecimals);
                        const cat = classifyCategory(acc.account_sub_type);
                        categoryTotals[cat] = (categoryTotals[cat] || 0) + val;
                        total += val;
                        count++;
                    }
                });
            } else {
                // Scenario B: Converted rate missing or unverified.
                // Group strictly by native currency to prevent cross-currency distortion.
                converted = false;
                dispCurr = activeCurrency;
                const decimals = CURRENCY_DECIMALS[activeCurrency] ?? 2;

                const filteredAccounts = modernAssetAccounts.filter(a => a.currency === activeCurrency);
                filteredAccounts.forEach(acc => {
                    const val = acc.amount_cents / Math.pow(10, decimals);
                    const cat = classifyCategory(acc.account_sub_type);
                    categoryTotals[cat] = (categoryTotals[cat] || 0) + val;
                    total += val;
                    count++;
                });

                if (availableCurrencies.length === 1 && activeCurrency !== baseCurrency) {
                    notice = `Exchange rate to ${baseCurrency} unavailable — allocation displayed in native ${activeCurrency}.`;
                } else if (availableCurrencies.length > 1) {
                    notice = `Showing native ${activeCurrency} holdings. Switch tabs to view other currencies without fabricated exchange rates.`;
                }
            }
        }

        const formattedData = Object.entries(categoryTotals)
            .map(([name, value]) => ({
                name,
                value
            }))
            .filter(item => item.value > 0)
            .sort((a, b) => b.value - a.value);

        return {
            data: formattedData,
            grandTotal: total,
            totalCount: count,
            displayCurrency: dispCurr,
            isConverted: converted,
            unconvertedNotice: notice
        };
    }, [sourceState, modernAssetAccounts, activeCurrency, availableCurrencies, baseCurrency]);

    // Vivid two-stop gradients per asset category. The donut slices and the legend chips share
    // the same gradient, so each legend row reads as a direct key for its ring segment.
    // High-saturation light→dark stops keep adjacent slices distinguishable on both themes
    // and give the ring depth instead of flat fills.
    const CATEGORY_GRADIENTS: Record<string, [string, string]> = {
        'Cash': ['#22d3ee', '#2563eb'],            // cyan → blue
        'Investment': ['#34d399', '#059669'],      // mint → emerald
        'Real Estate': ['#fbbf24', '#ea580c'],     // amber → orange
        'Crypto': ['#c084fc', '#7c3aed'],          // orchid → violet
        'Vehicle': ['#94a3b8', '#475569'],         // slate
        'Precious Metals': ['#fde047', '#d97706'], // gold
        'Other': ['#cbd5e1', '#94a3b8']            // light slate
    };
    const DEFAULT_GRADIENT: [string, string] = ['#a5b4fc', '#6366f1']; // indigo for custom categories

    // Loading state
    if (sourceState.mode === 'loading') {
        return <div className="h-56 w-full bg-slate-50/50 rounded-2xl animate-pulse" />;
    }

    // Error state: Never fall back to legacy totals on error
    if (sourceState.mode === 'error') {
        return (
            <div className="h-full flex flex-col items-center justify-center text-rose-600 text-sm p-6 text-center">
                <AlertCircle size={28} className="mb-2 opacity-80" />
                <p className="font-semibold">Unable to load asset allocation</p>
                <p className="text-xs text-muted-foreground mt-1">{sourceState.error}</p>
            </div>
        );
    }

    // Modern accounts exist, but all balances are unknown: Never fall back to legacy
    if (sourceState.mode === 'modern_missing_balances') {
        return (
            <div className="h-full flex flex-col items-center justify-center text-muted-foreground text-sm p-6 text-center">
                <Scale size={28} className="mb-2 text-amber-500 opacity-80" />
                <p className="font-semibold text-foreground">Balances needed for allocation breakdown</p>
                <p className="text-xs text-amber-600 dark:text-amber-400 mt-1 font-medium">
                    {sourceState.unrecordedCount} {sourceState.unrecordedCount === 1 ? 'account has' : 'accounts have'} no recorded valuation on or before the selected date.
                </p>
                <p className="text-[11px] text-muted-foreground mt-2 max-w-xs">
                    Record account balances to view verified portfolio asset class distribution.
                </p>
            </div>
        );
    }

    // Empty state
    if (totalCount === 0 || data.length === 0) {
        return (
            <div className="h-full flex flex-col items-center justify-center text-muted-foreground text-sm p-6 text-center">
                <p className="font-medium">No assets to display.</p>
                <p className="text-xs text-muted-foreground mt-1">Add accounts or assets to see your allocation breakdown.</p>
            </div>
        );
    }

    return (
        <div className="w-full h-full flex flex-col justify-between" style={{ minHeight: 260 }}>
            {/* Multi-currency tabs when accounts contain multiple unconverted currencies (modern or legacy) */}
            {!isConverted && availableCurrencies.length > 1 && (
                <div className="flex items-center gap-1.5 pb-2 px-1 border-b border-border/40 overflow-x-auto">
                    <span className="text-[10px] uppercase font-bold text-muted-foreground mr-1">Currency:</span>
                    {availableCurrencies.map(curr => (
                        <button
                            key={curr}
                            onClick={() => setSelectedCurrencyOverride(curr)}
                            className={`px-2.5 py-0.5 rounded-full text-xs font-bold transition-all ${
                                activeCurrency === curr
                                    ? 'bg-blue-600 text-white shadow-sm'
                                    : 'bg-muted text-muted-foreground hover:bg-muted/80'
                            }`}
                        >
                            {curr}
                        </button>
                    ))}
                </div>
            )}

            {isMounted ? (
                // flex-1 lets the donut grow with taller grid cells (was a fixed h-56,
                // which left dead space under the chart in h:3 widgets). px-2 keeps the
                // donut clear of the card border: the right-side legend consumes chart
                // width, so an oversized radius was clipping the donut's left edge.
                <div className="w-full flex-1 min-h-56 px-2">
                    <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                            <defs>
                                {data.map((entry, index) => {
                                    const [from, to] = CATEGORY_GRADIENTS[entry.name] || DEFAULT_GRADIENT;
                                    return (
                                        <linearGradient key={`grad-${index}`} id={`alloc-grad-${index}`} x1="0" y1="0" x2="1" y2="1">
                                            <stop offset="0%" stopColor={from} />
                                            <stop offset="100%" stopColor={to} />
                                        </linearGradient>
                                    );
                                })}
                            </defs>
                            <Pie
                                data={data}
                                cx="42%"
                                cy="50%"
                                innerRadius="58%"
                                outerRadius="84%"
                                paddingAngle={3}
                                cornerRadius={6}
                                stroke="none"
                                dataKey="value"
                                activeShape={(props: any) => (
                                    // Intentional hover feedback: the slice grows slightly with its
                                    // own gradient — replaces recharts' default active outline,
                                    // which ignored the theme.
                                    <Sector
                                        {...props}
                                        cornerRadius={6}
                                        outerRadius={(props.outerRadius || 0) + 6}
                                        fill={`url(#alloc-grad-${props.index})`}
                                        stroke="none"
                                    />
                                )}
                            >
                                {data.map((entry, index) => {
                                    const [, to] = CATEGORY_GRADIENTS[entry.name] || DEFAULT_GRADIENT;
                                    // `color` (not just `fill`) feeds the tooltip payload: a raw
                                    // url(#…) fill is invalid as a text/indicator color, which made
                                    // the tooltip render dark-on-dark in the dark theme.
                                    return (
                                        <Cell key={`cell-${index}`} fill={`url(#alloc-grad-${index})`} color={to} />
                                    );
                                })}
                            </Pie>
                            <Tooltip
                                formatter={(value: number | string | undefined) => {
                                    const val = Number(value || 0);
                                    const pct = grandTotal > 0 ? ((val / grandTotal) * 100).toFixed(1) : '0';
                                    return [`${formatCurrency(val, displayCurrency)} (${pct}%)`, 'Allocation'];
                                }}
                                contentStyle={{
                                    borderRadius: '12px',
                                    border: '1px solid var(--border)',
                                    backgroundColor: 'var(--card)',
                                    color: 'var(--card-foreground)',
                                    boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'
                                }}
                                itemStyle={{ color: 'var(--card-foreground)', fontWeight: 600 }}
                                labelStyle={{ color: 'var(--muted-foreground)', marginBottom: '2px' }}
                            />
                            {/* Custom legend: gradient chips mirror the ring slices, names/values
                                use full-foreground weight for contrast, and each percentage gets
                                a tinted badge in its slice color instead of muted gray text. */}
                            <Legend
                                layout="vertical"
                                verticalAlign="middle"
                                align="right"
                                content={() => (
                                    <div className="flex flex-col gap-2.5 pl-4 pr-1">
                                        {data.map((entry, index) => {
                                            const [from, to] = CATEGORY_GRADIENTS[entry.name] || DEFAULT_GRADIENT;
                                            const pct = grandTotal > 0 ? ((entry.value / grandTotal) * 100).toFixed(1) : '0';
                                            return (
                                                <div key={entry.name} className="flex items-center gap-2.5">
                                                    <span
                                                        className="w-3.5 h-3.5 rounded-md shrink-0"
                                                        style={{ background: `linear-gradient(135deg, ${from}, ${to})` }}
                                                    />
                                                    <span className="text-sm font-bold text-foreground">{entry.name}</span>
                                                    <span className="text-sm font-semibold text-foreground/80 tabular-nums">
                                                        {formatCurrency(entry.value, displayCurrency)}
                                                    </span>
                                                    <span
                                                        className="text-[11px] font-black px-1.5 py-0.5 rounded-md tabular-nums"
                                                        style={{ color: to, backgroundColor: `${to}22` }}
                                                    >
                                                        {pct}%
                                                    </span>
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                                wrapperStyle={{ paddingLeft: '4px' }}
                            />
                        </PieChart>
                    </ResponsiveContainer>
                    {/* Center total label removed: at this donut's size the figure spilled over
                        the ring and collided with the hover tooltip. The Total Assets stat card
                        above already carries the figure; the footer keeps the holdings count. */}
                </div>
            ) : (
                <div className="flex-1 min-h-56 w-full bg-slate-50/50 rounded-2xl animate-pulse" />
            )}

            {/* Incomplete FX notice if applicable */}
            {unconvertedNotice && (
                <div className="px-2 py-1 mb-1 rounded-lg bg-amber-500/10 text-amber-700 dark:text-amber-400 text-[10px] leading-tight">
                    {unconvertedNotice}
                </div>
            )}

            {/* Footer shows only the holdings count: the legend already itemizes every slice
                value, and the Total Assets stat card carries the grand total — repeating
                "Total:" here was redundant. */}
            <div className="text-[10px] text-muted-foreground px-2 pt-2 border-t border-border flex flex-col sm:flex-row justify-between items-start sm:items-center gap-1">
                <span>
                    Includes {totalCount} {totalCount === 1 ? 'holding' : 'holdings'}
                    {sourceState.mode === 'modern_usable' && sourceState.hasExcludedLegacy && (
                        <span className="ml-1 text-muted-foreground/80 italic">(legacy records excluded)</span>
                    )}
                </span>
            </div>
        </div>
    );
}
