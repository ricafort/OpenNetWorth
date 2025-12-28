'use client';

import { useMemo } from 'react';
import {
    AreaChart,
    Area,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip
} from 'recharts';
import { NetWorthSnapshot } from '@/types';

interface NetWorthChartProps {
    data: NetWorthSnapshot[];
    timeRange: '6m' | '1y' | 'all';
}

export default function NetWorthChart({ data, timeRange }: NetWorthChartProps) {
    const filteredData = useMemo(() => {
        if (timeRange === 'all') return data;

        const now = new Date();
        const monthsBack = timeRange === '6m' ? 6 : 12;
        const cutoff = new Date(now.setMonth(now.getMonth() - monthsBack));

        return data.filter(d => new Date(d.date) >= cutoff);
    }, [data, timeRange]);

    const formatCurrency = (value: number) => {
        if (Math.abs(value) >= 1000000) {
            return `$${(value / 1000000).toFixed(1)}M`;
        }
        return `$${(value / 1000).toFixed(0)}k`;
    };

    const formatDate = (dateStr: string) => {
        return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
    };

    if (data.length === 0) {
        return (
            <div className="h-full flex flex-col items-center justify-center text-slate-400">
                <p className="font-semibold">No history yet</p>
                <p className="text-sm">Your net worth snapshots will appear here over time.</p>
            </div>
        );
    }

    return (
        <div className="w-full h-full">
            <AreaChart
                width={800}
                height={350}
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
                    tickFormatter={formatDate}
                    className="text-muted-foreground"
                    tick={{ fill: 'var(--muted-foreground)', fontSize: 12 }}
                    axisLine={false}
                    tickLine={false}
                />
                <YAxis
                    tickFormatter={formatCurrency}
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
                    formatter={(value: any, name: any) => {
                        const num = Number(value);
                        const label = name === 'netWorth' ? 'Net Worth' : 'Total Debt';
                        return [`$${num.toLocaleString()}`, label];
                    }}
                    labelFormatter={formatDate}
                    labelStyle={{ color: 'var(--muted-foreground)', marginBottom: '4px', fontSize: '12px' }}
                />
                <Area
                    type="monotone"
                    dataKey="totalLiabilities"
                    stroke="#e11d48"
                    fill="url(#colorLiabilities)"
                    fillOpacity={1}
                    strokeWidth={2}
                    stackId="1"
                />
                <Area
                    type="monotone"
                    dataKey="netWorth"
                    stroke="#2563eb"
                    fill="url(#colorNetWorth)"
                    fillOpacity={1}
                    strokeWidth={2}
                    stackId="2"
                />
            </AreaChart>
        </div>
    );
}
