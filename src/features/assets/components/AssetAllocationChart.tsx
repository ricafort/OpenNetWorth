'use client';

import { useState, useEffect } from 'react';
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Asset } from '@/features/assets/types';
import { useNetWorth } from '@/features/dashboard/hooks/useNetWorth';
import { convertAmount, formatCurrency } from '@/lib/utils/currencyService';

interface AssetAllocationChartProps {
    assets: Asset[];
}

export default function AssetAllocationChart({ assets }: AssetAllocationChartProps) {
    const { baseCurrency } = useNetWorth();

    // Why: Recharts' ResponsiveContainer uses ResizeObserver which fires during the
    // synchronous render pass — before the flex parent has resolved its layout.
    // At that point the container reports width=-1, height=-1, which triggers the warning.
    // Fix: hold off rendering the chart until after useEffect (post-DOM-paint),
    // when the browser has completed layout and ResizeObserver gets real dimensions.
    const [isMounted, setIsMounted] = useState(false);
    useEffect(() => { setIsMounted(true); }, []);

    // 1. Group assets by type and sum values (converted to base currency)
    const dataByType = assets.reduce((acc, asset) => {
        const type = asset.type;
        const val = convertAmount(asset.value, asset.currency || 'USD', baseCurrency);
        acc[type] = (acc[type] || 0) + val;
        return acc;
    }, {} as Record<string, number>);

    // 2. Format for Recharts
    const data = Object.entries(dataByType)
        .map(([name, value]) => ({
            name: name.replace('_', ' ').replace(/\b\w/g, c => c.toUpperCase()), // Title Case
            value
        }))
        .filter(item => item.value > 0) // Hide empty categories
        .sort((a, b) => b.value - a.value); // Sort biggest to smallest

    // 3. Define colors per asset category
    const COLORS: Record<string, string> = {
        'Cash': '#3b82f6',         // blue-500
        'Investment': '#10b981',   // emerald-500
        'Real Estate': '#f59e0b',  // amber-500
        'Crypto': '#8b5cf6',       // violet-500
        'Vehicle': '#64748b',      // slate-500
        'Other': '#94a3b8'         // slate-400
    };

    const DEFAULT_COLOR = '#cbd5e1';

    if (assets.length === 0) {
        return (
            <div className="h-full flex items-center justify-center text-slate-400 text-sm">
                <p>No assets to display.</p>
            </div>
        );
    }

    return (
        // Render a same-height placeholder on the first paint (SSR + sync render pass).
        // The chart only mounts after useEffect, when the DOM is laid out and
        // ResizeObserver can read real pixel dimensions instead of -1.
        <div className="w-full h-full" style={{ minHeight: 240 }}>
            {isMounted ? (
            <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                    <Pie
                        data={data}
                        cx="50%"
                        cy="50%"
                        innerRadius="60%"
                        outerRadius="80%"
                        paddingAngle={5}
                        dataKey="value"
                    >
                        {data.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[entry.name] || DEFAULT_COLOR} />
                        ))}
                    </Pie>
                    <Tooltip
                        formatter={(value: number | string | undefined) => [formatCurrency(Number(value || 0), baseCurrency), 'Value']}
                        contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                    />
                    <Legend
                        layout="vertical"
                        verticalAlign="middle"
                        align="right"
                        wrapperStyle={{ fontSize: '12px', fontWeight: 500 }}
                    />
                </PieChart>
            </ResponsiveContainer>
            ) : null}
        </div>
    );
}
