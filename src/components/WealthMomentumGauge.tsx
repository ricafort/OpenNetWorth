'use client';

import { WealthMomentum } from '@/types';
import { PieChart, Pie, Cell } from 'recharts';
import { Info } from 'lucide-react';

interface Props {
    momentum: WealthMomentum;
}

export default function WealthMomentumGauge({ momentum }: Props) {
    const { score, monthlySavings, annualProjectedSavings } = momentum;

    // Determine color based on score
    let color = '#ef4444'; // Red (0-30)
    let status = 'Stalled';

    if (score > 60) {
        color = '#10b981'; // Emerald (61-100)
        status = 'Thriving';
    } else if (score > 30) {
        color = '#f59e0b'; // Amber (31-60)
        status = 'Building';
    }

    const data = [
        { value: score },
        { value: 100 - score }
    ];

    return (
        <div className="bg-card rounded-3xl p-6 border border-border shadow-sm relative overflow-hidden">
            {/* Background decoration */}
            <div className="absolute top-0 right-0 p-4 opacity-5">
                <Info size={100} />
            </div>

            <h3 className="text-xs font-black text-muted-foreground uppercase tracking-widest mb-4 z-10 relative">Wealth Momentum™</h3>

            <div className="flex flex-col items-center relative z-10">
                <div className="w-48 h-24 overflow-hidden relative translate-y-2">
                    <PieChart width={200} height={200}>
                        <Pie
                            data={data}
                            cx="50%"
                            cy="50%"
                            startAngle={180}
                            endAngle={0}
                            innerRadius={60}
                            outerRadius={80}
                            stroke="none"
                            dataKey="value"
                        >
                            <Cell key="score" fill={color} />
                            <Cell key="remaining" fill="#f1f5f9" />
                        </Pie>
                    </PieChart>
                    {/* Score Text */}
                    <div className="absolute inset-0 flex flex-col items-center justify-end pb-2">
                        <span className="text-4xl font-black text-foreground leading-none">{score}</span>
                        <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">{status}</span>
                    </div>
                </div>

                <div className="mt-4 text-center space-y-1">
                    <p className="text-sm font-medium text-muted-foreground">
                        Autopilot Savings: <span className="font-bold text-foreground privacy-value">${monthlySavings.toLocaleString()}/mo</span>
                    </p>
                    <p className="text-xs text-muted-foreground">
                        Projected <span className="font-bold text-emerald-600 privacy-value">${annualProjectedSavings.toLocaleString()}</span> / year
                    </p>
                </div>

                {/* Savings Rate Badge */}
                <div className="mt-4 px-3 py-1 bg-slate-50 rounded-full border border-slate-100 text-xs font-bold text-slate-500">
                    {momentum.savingsRate.toFixed(1)}% Savings Rate
                </div>
            </div>
        </div>
    );
}
