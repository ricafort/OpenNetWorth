'use client';

import { useState, useEffect, useMemo } from 'react';
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Asset } from '@/features/assets/types';
import { useNetWorth } from '@/features/dashboard/hooks/useNetWorth';
import { formatCurrency } from '@/lib/utils/currencyService';
import { useSharedFinancialSummary } from '@/features/sync/hooks/useSharedFinancialSummary';
import { CURRENCY_DECIMALS } from '@/lib/domain/accounting/types';

interface AssetAllocationChartProps {
    assets: Asset[];
}

/**
 * AssetAllocationChart
 * 
 * Why this component exists:
 * Visualizes the proportional distribution of assets across categories (Cash, Investments, Real Estate, etc.).
 * 
 * Tricky logic:
 * - Unified asset coverage: Combines modern balance-tracked accounts from `useSharedFinancialSummary`
 *   with legacy manual assets, avoiding the disconnected-source problem where modern accounts were ignored.
 * - Multi-currency scaling: Scales modern asset `amount_cents` by CURRENCY_DECIMALS per native currency.
 * - Enhanced Legend & Tooltips: Explicitly shows the category name, monetary amount, and percentage.
 * 
 * TODO: Add a toggle between donut and horizontal sorted bar view for large numbers of asset classes.
 */
export default function AssetAllocationChart({ assets }: AssetAllocationChartProps) {
    const { baseCurrency } = useNetWorth();
    const { summary } = useSharedFinancialSummary();
    const [isMounted, setIsMounted] = useState(false);

    useEffect(() => {
        setIsMounted(true);
    }, []);

    // 1. Group assets by type from BOTH legacy assets and modern accounting accounts
    const { data, grandTotal, totalCount } = useMemo(() => {
        const categoryTotals: Record<string, number> = {};
        let total = 0;
        let count = 0;

        // A. Add legacy assets if present
        assets.forEach(asset => {
            const cat = asset.type.replace('_', ' ').replace(/\b\w/g, c => c.toUpperCase());
            const val = asset.value;
            categoryTotals[cat] = (categoryTotals[cat] || 0) + val;
            total += val;
            count++;
        });

        // B. Add modern accounting assets from shared financial summary
        if (summary?.accounts) {
            summary.accounts.forEach(acc => {
                if (acc.account_type === 'asset') {
                    const decimals = CURRENCY_DECIMALS[acc.currency] ?? 2;
                    const val = acc.amount_cents / Math.pow(10, decimals);
                    
                    // WHY: Normalizes granular double-entry account subtypes into top-level asset classes for portfolio allocation visualization.
                    // TRICKY: AccountSubType uses 'cash', 'checking', and 'savings' rather than 'bank', and multiple sub-types represent investments/real-estate.
                    // TODO: In future iterations, support user-customizable asset class mappings.
                    let cat = 'Other';
                    if (acc.account_sub_type === 'cash' || acc.account_sub_type === 'checking' || acc.account_sub_type === 'savings') {
                        cat = 'Cash';
                    } else if (
                        acc.account_sub_type === 'brokerage' ||
                        acc.account_sub_type === 'investment' ||
                        acc.account_sub_type === 'retirement' ||
                        acc.account_sub_type === 'superannuation' ||
                        acc.account_sub_type === 'pension'
                    ) {
                        cat = 'Investment';
                    } else if (acc.account_sub_type === 'property' || acc.account_sub_type === 'real_estate' || acc.account_sub_type === 'land') {
                        cat = 'Real Estate';
                    } else if (acc.account_sub_type === 'crypto') {
                        cat = 'Crypto';
                    } else if (acc.account_sub_type === 'vehicle') {
                        cat = 'Vehicle';
                    } else if (acc.account_sub_type) {
                        cat = acc.account_sub_type.replace('_', ' ').replace(/\b\w/g, c => c.toUpperCase());
                    }

                    categoryTotals[cat] = (categoryTotals[cat] || 0) + val;
                    total += val;
                    count++;
                }
            });
        }

        const formattedData = Object.entries(categoryTotals)
            .map(([name, value]) => ({
                name,
                value
            }))
            .filter(item => item.value > 0)
            .sort((a, b) => b.value - a.value);

        return { data: formattedData, grandTotal: total, totalCount: count };
    }, [assets, summary]);

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
                                    return [`${formatCurrency(val, baseCurrency)} (${pct}%)`, 'Allocation'];
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
                                            {value}: <span className="font-bold">{formatCurrency(item.value, baseCurrency)}</span> ({pct}%)
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

            <div className="text-[10px] text-muted-foreground px-2 pt-2 border-t border-border flex justify-between items-center">
                <span>Includes {totalCount} asset {totalCount === 1 ? 'holding' : 'holdings'}</span>
                <span className="font-medium text-foreground">Total: {formatCurrency(grandTotal, baseCurrency)}</span>
            </div>
        </div>
    );
}
