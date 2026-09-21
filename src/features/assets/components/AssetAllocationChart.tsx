'use client';

import { useState, useEffect, useMemo } from 'react';
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Asset } from '@/features/assets/types';
import { useNetWorth } from '@/features/dashboard/hooks/useNetWorth';
import { formatCurrency } from '@/lib/utils/currencyService';
import { useFinancialSourceSelection } from '@/features/dashboard/hooks/useFinancialSourceSelection';
import { CURRENCY_DECIMALS, CurrencyCode } from '@/lib/domain/accounting/types';
import { AlertCircle, Scale } from 'lucide-react';

interface AssetAllocationChartProps {
    assets?: Asset[];
}

/**
 * Normalizes granular account subtypes into standard asset allocation categories.
 * 
 * Why this function exists:
 * Maps diverse banking, brokerage, property, and legacy asset classifications
 * into consistent visual buckets (Cash, Investment, Real Estate, Crypto, Vehicle, Other).
 * 
 * Tricky logic:
 * Handles both double-entry `account_sub_type` (snake_case) and legacy `Asset.type` values.
 * 
 * TODO: In Milestone 2, allow user-defined allocation taxonomy mapping.
 */
function classifyCategory(subType?: string, type?: string): string {
    const raw = subType || type || 'other';
    const s = raw.toLowerCase().trim();
    if (['cash', 'checking', 'savings', 'bank'].includes(s)) return 'Cash';
    if (['brokerage', 'investment', 'retirement', 'superannuation', 'pension', 'stock', 'etf'].includes(s)) return 'Investment';
    if (['property', 'real_estate', 'real estate', 'land'].includes(s)) return 'Real Estate';
    if (['crypto', 'cryptocurrency', 'bitcoin'].includes(s)) return 'Crypto';
    if (['vehicle', 'car', 'automobile'].includes(s)) return 'Vehicle';
    if (['precious_metals', 'precious metals', 'gold'].includes(s)) return 'Precious Metals';
    return s.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}

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
export default function AssetAllocationChart({ assets: fallbackLegacyAssets = [] }: AssetAllocationChartProps) {
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

    const legacyAssetsList = useMemo(() => {
        if (sourceState.mode !== 'legacy') return [];
        return sourceState.assets || fallbackLegacyAssets;
    }, [sourceState, fallbackLegacyAssets]);

    const availableCurrencies = useMemo(() => {
        if (sourceState.mode === 'modern_usable') {
            return Array.from(new Set(modernAssetAccounts.map(a => a.currency))) as CurrencyCode[];
        }
        if (sourceState.mode === 'legacy') {
            return Array.from(new Set(legacyAssetsList.map(a => (a.currency || 'USD') as CurrencyCode))) as CurrencyCode[];
        }
        return [];
    }, [sourceState.mode, modernAssetAccounts, legacyAssetsList]);

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
        } else if (sourceState.mode === 'legacy') {
            // Scenario C: Pure legacy mode (Resolves Issue 1: native currency grouping for legacy assets)
            const legacyList = legacyAssetsList;

            if (availableCurrencies.length === 1 && availableCurrencies[0] !== baseCurrency) {
                // Single foreign currency (e.g. USD 25,000 with AUD display)
                dispCurr = availableCurrencies[0];
                converted = false;
                notice = `Exchange rate to ${baseCurrency} unavailable — allocation displayed in native ${dispCurr}.`;
                legacyList.forEach(asset => {
                    const cat = classifyCategory(undefined, asset.type);
                    const val = asset.value;
                    categoryTotals[cat] = (categoryTotals[cat] || 0) + val;
                    total += val;
                    count++;
                });
            } else if (availableCurrencies.length > 1) {
                // Multi-currency legacy assets: filter by activeCurrency tab
                dispCurr = activeCurrency;
                converted = false;
                notice = `Showing native ${activeCurrency} holdings. Switch tabs to view other currencies without fabricated exchange rates.`;
                const filtered = legacyList.filter(a => ((a.currency || 'USD') as CurrencyCode) === activeCurrency);
                filtered.forEach(asset => {
                    const cat = classifyCategory(undefined, asset.type);
                    const val = asset.value;
                    categoryTotals[cat] = (categoryTotals[cat] || 0) + val;
                    total += val;
                    count++;
                });
            } else {
                // Standard single base currency
                dispCurr = baseCurrency;
                legacyList.forEach(asset => {
                    const cat = classifyCategory(undefined, asset.type);
                    const val = asset.value;
                    categoryTotals[cat] = (categoryTotals[cat] || 0) + val;
                    total += val;
                    count++;
                });
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
    }, [sourceState, modernAssetAccounts, activeCurrency, availableCurrencies, baseCurrency, fallbackLegacyAssets]);

    // Define colors per asset category
    const COLORS: Record<string, string> = {
        'Cash': '#3b82f6',         // blue-500
        'Investment': '#10b981',   // emerald-500
        'Real Estate': '#f59e0b',  // amber-500
        'Crypto': '#8b5cf6',       // violet-500
        'Vehicle': '#64748b',      // slate-500
        'Precious Metals': '#eab308', // yellow-500
        'Other': '#94a3b8'         // slate-400
    };

    const DEFAULT_COLOR = '#cbd5e1';

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
            {/* Multi-currency tabs when modern accounts contain multiple unconverted currencies */}
            {sourceState.mode === 'modern_usable' && !isConverted && availableCurrencies.length > 1 && (
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
                <div className="w-full h-56">
                    <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                            <Pie
                                data={data}
                                cx="40%"
                                cy="50%"
                                innerRadius="55%"
                                outerRadius="78%"
                                paddingAngle={4}
                                dataKey="value"
                            >
                                {data.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={COLORS[entry.name] || DEFAULT_COLOR} />
                                ))}
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
                            />
                            <Legend
                                layout="vertical"
                                verticalAlign="middle"
                                align="right"
                                formatter={(value: string) => {
                                    const item = data.find(d => d.name === value);
                                    if (!item || grandTotal === 0) return value;
                                    const pct = ((item.value / grandTotal) * 100).toFixed(1);
                                    return (
                                        <span className="text-xs font-medium text-foreground">
                                            {value}: <span className="font-bold">{formatCurrency(item.value, displayCurrency)}</span> ({pct}%)
                                        </span>
                                    );
                                }}
                                wrapperStyle={{ fontSize: '11px', paddingLeft: '8px' }}
                            />
                        </PieChart>
                    </ResponsiveContainer>
                </div>
            ) : (
                <div className="h-56 w-full bg-slate-50/50 rounded-2xl animate-pulse" />
            )}

            {/* Incomplete FX notice if applicable */}
            {unconvertedNotice && (
                <div className="px-2 py-1 mb-1 rounded-lg bg-amber-500/10 text-amber-700 dark:text-amber-400 text-[10px] leading-tight">
                    {unconvertedNotice}
                </div>
            )}

            <div className="text-[10px] text-muted-foreground px-2 pt-2 border-t border-border flex flex-col sm:flex-row justify-between items-start sm:items-center gap-1">
                <span>
                    Includes {totalCount} {totalCount === 1 ? 'holding' : 'holdings'}
                    {sourceState.mode === 'modern_usable' && sourceState.hasExcludedLegacy && (
                        <span className="ml-1 text-muted-foreground/80 italic">(legacy records excluded)</span>
                    )}
                </span>
                <span className="font-medium text-foreground">
                    Total: {formatCurrency(grandTotal, displayCurrency)}
                </span>
            </div>
        </div>
    );
}
