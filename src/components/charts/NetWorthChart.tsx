'use client';

import { useMemo, useState, useEffect } from 'react';
import {
    AreaChart,
    Area,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    Legend,
    ResponsiveContainer
} from 'recharts';
import { NetWorthSnapshot } from '@/types';
import { useNetWorth } from '@/features/dashboard/hooks/useNetWorth';
import { formatCurrency } from '@/lib/utils/currencyService';
import { Calendar, History } from 'lucide-react';

interface NetWorthChartProps {
    data: NetWorthSnapshot[];
    timeRange: '6m' | '1y' | 'all';
}

/**
 * NetWorthChart
 * 
 * Why this component exists:
 * Visualizes historical net worth and liabilities snapshots over time.
 * 
 * Tricky logic:
 * - Chronological sorting: Historical records in SQLite or LocalStorage may be inserted out-of-order.
 *   We sort by date ascending before filtering and plotting.
 * - Single-snapshot state: A flat single-point area chart looks like an error; when only 1 snapshot exists,
 *   we render an informative milestone banner explaining that a trend line requires 2+ snapshots.
 * - Filtered empty state: Distinguishes between having zero total records vs having no records in the selected 6m/1y window.
 * - Responsive container: Postpones render until post-mount to avoid Recharts -1 width ResizeObserver errors.
 * 
 * TODO: Integrate point-in-time currency conversion rates per snapshot date in Milestone 2.
 */
export default function NetWorthChart({ data, timeRange }: NetWorthChartProps) {
    const { baseCurrency } = useNetWorth();
    const [isMounted, setIsMounted] = useState(false);

    useEffect(() => {
        setIsMounted(true);
    }, []);

    // 1. Sort snapshots chronologically
    const sortedData = useMemo(() => {
        return data.slice().sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    }, [data]);

    // 2. Filter by selected time window
    const filteredData = useMemo(() => {
        if (timeRange === 'all') return sortedData;

        const now = new Date();
        const monthsBack = timeRange === '6m' ? 6 : 12;
        const cutoff = new Date(now.getFullYear(), now.getMonth() - monthsBack, now.getDate());
        return sortedData.filter(d => new Date(d.date) >= cutoff);
    }, [sortedData, timeRange]);

    const formatCurrencyAxis = (value: number) => {
        return formatCurrency(value, baseCurrency, { notation: 'compact', maximumFractionDigits: 1 } as any);
    };

    const formatAxisDate = (dateStr: string) => {
        return new Date(dateStr).toLocaleDateString(undefined, { month: 'short', year: '2-digit' });
    };

    const formatFullDate = (dateStr: string) => {
        return new Date(dateStr).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
    };

    if (data.length === 0) {
        return (
            <div className="h-64 flex flex-col items-center justify-center text-muted-foreground p-6 text-center">
                <History size={32} className="mb-2 opacity-50" />
                <p className="font-semibold text-sm">No history yet</p>
                <p className="text-xs text-muted-foreground mt-1">Your net worth snapshots will appear here over time.</p>
            </div>
        );
    }

    if (filteredData.length === 0) {
        return (
            <div className="h-64 flex flex-col items-center justify-center text-muted-foreground p-6 text-center">
                <Calendar size={32} className="mb-2 opacity-50" />
                <p className="font-semibold text-sm">No snapshots in this period</p>
                <p className="text-xs text-muted-foreground mt-1">
                    Select a wider time range (e.g. "All") to view earlier snapshots.
                </p>
            </div>
        );
    }

    // When only 1 snapshot exists, display a clear milestone state rather than an awkward flat area line
    if (filteredData.length === 1) {
        const snap = filteredData[0];
        return (
            <div className="h-64 flex flex-col items-center justify-center bg-muted/30 rounded-2xl p-6 text-center border border-dashed border-border">
                <div className="p-3 bg-blue-500/10 text-blue-600 rounded-full mb-3">
                    <History size={24} />
                </div>
                <h4 className="font-bold text-sm text-foreground">One recorded snapshot so far</h4>
                <p className="text-xs text-muted-foreground mt-1 max-w-sm">
                    Recorded on <span className="font-semibold text-foreground">{formatFullDate(snap.date)}</span>: Net Worth of{' '}
                    <span className="font-bold text-blue-600">{formatCurrency(snap.netWorth, baseCurrency)}</span>.
                </p>
                <p className="text-[11px] text-muted-foreground mt-3 italic">
                    Your trajectory chart will automatically connect as new snapshots are recorded.
                </p>
            </div>
        );
    }

    if (!isMounted) {
        return <div className="h-72 w-full bg-slate-50/50 rounded-2xl animate-pulse" />;
    }

    return (
        <div className="w-full h-72">
            <ResponsiveContainer width="100%" height="100%">
                <AreaChart
                    data={filteredData}
                    margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
                >
                    <defs>
                        <linearGradient id="colorNetWorth" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#2563eb" stopOpacity={0.3} />
                            <stop offset="95%" stopColor="#2563eb" stopOpacity={0} />
                        </linearGradient>
                        <linearGradient id="colorLiabilities" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#e11d48" stopOpacity={0.3} />
                            <stop offset="95%" stopColor="#e11d48" stopOpacity={0} />
                        </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} className="stroke-border" />
                    <XAxis
                        dataKey="date"
                        tickFormatter={formatAxisDate}
                        className="text-muted-foreground"
                        tick={{ fill: 'var(--muted-foreground)', fontSize: 12 }}
                        axisLine={false}
                        tickLine={false}
                    />
                    <YAxis
                        tickFormatter={formatCurrencyAxis}
                        className="text-muted-foreground"
                        tick={{ fill: 'var(--muted-foreground)', fontSize: 12 }}
                        axisLine={false}
                        tickLine={false}
                    />
                    <Tooltip
                        contentStyle={{
                            backgroundColor: 'var(--card)',
                            color: 'var(--card-foreground)',
                            borderRadius: '12px',
                            border: '1px solid var(--border)',
                            boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'
                        }}
                        formatter={(value: number | string | undefined, name: string | undefined) => {
                            const num = Number(value);
                            const label = name === 'netWorth' ? 'Net Worth' : 'Total Liabilities';
                            return [formatCurrency(num, baseCurrency), label];
                        }}
                        labelFormatter={formatFullDate}
                        labelStyle={{ color: 'var(--muted-foreground)', marginBottom: '4px', fontSize: '12px' }}
                    />
                    <Legend
                        verticalAlign="top"
                        align="right"
                        wrapperStyle={{ fontSize: '12px', paddingBottom: '8px' }}
                    />
                    <Area
                        type="monotone"
                        name="Total Liabilities"
                        dataKey="totalLiabilities"
                        stroke="#e11d48"
                        fill="url(#colorLiabilities)"
                        fillOpacity={1}
                        strokeWidth={2}
                    />
                    <Area
                        type="monotone"
                        name="Net Worth"
                        dataKey="netWorth"
                        stroke="#2563eb"
                        fill="url(#colorNetWorth)"
                        fillOpacity={1}
                        strokeWidth={2}
                    />
                </AreaChart>
            </ResponsiveContainer>
        </div>
    );
}
