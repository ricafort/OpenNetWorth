'use client';

import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts';
import { PayoffScheduleEntry } from '@/types';
import { useDashboard } from '@/contexts/DashboardContext';
import { formatCurrency } from '@/lib/utils/currencyService';

interface PayoffScheduleChartProps {
    schedule: PayoffScheduleEntry[];
}

export default function PayoffScheduleChart({ schedule }: PayoffScheduleChartProps) {
    const { baseCurrency } = useDashboard();

    if (!schedule || schedule.length === 0) return null;

    // Aggregate by month to get total remaining balance curve
    const data = schedule.reduce((acc, entry) => {
        const existing = acc.find(d => d.month === entry.month);
        if (existing) {
            existing.balance += entry.remainingBalance;
        } else {
            acc.push({
                month: entry.month,
                formattedDate: new Date(entry.month + '-01').toLocaleDateString(undefined, { month: 'short', year: '2-digit' }),
                balance: entry.remainingBalance
            });
        }
        return acc;
    }, [] as { month: string; formattedDate: string; balance: number }[]);

    return (
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm h-[300px]">
            <h3 className="text-lg font-bold text-foreground mb-4">Payoff Timeline</h3>
            <div className="w-full flex items-center justify-center">
                <AreaChart width={700} height={230} data={data} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                    <defs>
                        <linearGradient id="colorBalance" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#818cf8" stopOpacity={0.8} />
                            <stop offset="95%" stopColor="#818cf8" stopOpacity={0} />
                        </linearGradient>
                    </defs>
                    <XAxis
                        dataKey="formattedDate"
                        axisLine={false}
                        tickLine={false}
                        tick={{ fontSize: 12, fill: '#64748b' }}
                        minTickGap={30}
                    />
                    <YAxis
                        hide
                    />
                    <Tooltip
                        formatter={(value: any) => [formatCurrency(Number(value), baseCurrency), 'Remaining Debt']}
                        contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                    />
                    <Area
                        type="monotone"
                        dataKey="balance"
                        stroke="#4f46e5"
                        fillOpacity={1}
                        fill="url(#colorBalance)"
                        strokeWidth={3}
                    />
                </AreaChart>
            </div>
        </div>
    );
}
