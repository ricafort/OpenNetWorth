'use client';

/**
 * ForecastChart
 *
 * Why this component exists:
 * Plots the projected liquid balance from today to the forecast horizon end
 * for ONE currency. The forecast service never FX-joins currencies, so this
 * chart never mixes series either — one chart per currency section.
 *
 * Tricky logic:
 * - Balance points are integer CENTS; the axis and tooltip convert to major
 *   units once at the display boundary (formatCurrency takes major units).
 * - When the projection dips below zero the area switches to the destructive
 *   red gradient and a zero ReferenceLine is drawn, so the crossing point is
 *   visible rather than implied.
 * - Gradient ids are currency-suffixed: multiple per-currency charts render on
 *   the same page and duplicate SVG gradient ids would cross-paint.
 * - ResponsiveContainer is postponed until after mount to avoid Recharts'
 *   -1-width ResizeObserver errors (same gate as NetWorthChart).
 */

import { useEffect, useState } from 'react';
import {
    AreaChart,
    Area,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ReferenceLine,
    ResponsiveContainer
} from 'recharts';
import { TrendingDown } from 'lucide-react';
import { formatCurrency } from '@/lib/utils/currencyService';
import type { ForecastPoint } from '@/features/cashflow/data/repository';

interface ForecastChartProps {
    points: ForecastPoint[];
    currency: string;
    goesNegative: boolean;
}

export default function ForecastChart({ points, currency, goesNegative }: ForecastChartProps) {
    const [isMounted, setIsMounted] = useState(false);

    useEffect(() => {
        setIsMounted(true);
    }, []);

    if (points.length === 0) {
        return (
            <div className="h-64 flex flex-col items-center justify-center text-muted-foreground p-6 text-center">
                <TrendingDown size={32} className="mb-2 opacity-50" />
                <p className="font-semibold text-sm">Nothing to project</p>
                <p className="text-xs text-muted-foreground mt-1">
                    This currency has no starting balance to project from.
                </p>
            </div>
        );
    }

    if (!isMounted) {
        return <div className="h-72 w-full bg-slate-50/50 rounded-2xl animate-pulse" />;
    }

    // Cents → major units once, at the display boundary.
    const data = points.map(p => ({ date: p.date, balance: p.balance_cents / 100 }));
    const gradientId = `colorForecast-${currency}`;
    const strokeColor = goesNegative ? '#ef4444' : '#0ea5e9';

    const formatAxisValue = (value: number) =>
        formatCurrency(value, currency, 'en-US', { maximumFractionDigits: 0 });
    const formatAxisDate = (dateStr: string) =>
        new Date(dateStr).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
    const formatFullDate = (dateStr: string) =>
        new Date(dateStr).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });

    return (
        <div className="w-full h-72">
            <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                    <defs>
                        <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor={strokeColor} stopOpacity={0.4} />
                            <stop offset="95%" stopColor={strokeColor} stopOpacity={0} />
                        </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} className="stroke-border" />
                    <XAxis
                        dataKey="date"
                        tickFormatter={formatAxisDate}
                        tick={{ fill: 'var(--muted-foreground)', fontSize: 12 }}
                        axisLine={false}
                        tickLine={false}
                        minTickGap={48}
                    />
                    <YAxis
                        tickFormatter={formatAxisValue}
                        tick={{ fill: 'var(--muted-foreground)', fontSize: 12 }}
                        axisLine={false}
                        tickLine={false}
                        width={80}
                    />
                    <Tooltip
                        contentStyle={{
                            backgroundColor: 'var(--card)',
                            color: 'var(--card-foreground)',
                            borderRadius: '12px',
                            border: '1px solid var(--border)',
                            boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'
                        }}
                        formatter={(value: number | string | undefined) =>
                            [formatCurrency(Number(value), currency), 'Projected balance']
                        }
                        labelFormatter={formatFullDate}
                        labelStyle={{ color: 'var(--muted-foreground)', marginBottom: '4px', fontSize: '12px' }}
                    />
                    {goesNegative && (
                        <ReferenceLine
                            y={0}
                            stroke="var(--destructive)"
                            strokeDasharray="4 4"
                            strokeWidth={1.5}
                        />
                    )}
                    <Area
                        type="monotone"
                        name="Projected balance"
                        dataKey="balance"
                        stroke={strokeColor}
                        fill={`url(#${gradientId})`}
                        fillOpacity={1}
                        strokeWidth={2.5}
                        activeDot={{ r: 5, strokeWidth: 2, stroke: 'var(--card)' }}
                    />
                </AreaChart>
            </ResponsiveContainer>
        </div>
    );
}
