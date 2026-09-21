'use client';

import { WealthMomentum } from '@/features/cashflow/types';
import { PieChart, Pie, Cell } from 'recharts';
import { Info } from 'lucide-react';
import { useNetWorth } from '@/features/dashboard/hooks/useNetWorth';
import { convertAmount, formatCurrency } from '@/lib/utils/currencyService';

interface Props {
    momentum: WealthMomentum;
}

export default function WealthMomentumGauge({ momentum }: Props) {
    const { baseCurrency } = useNetWorth();
    const { score, monthlySavings, annualProjectedSavings, monthlyRecurringIncome, monthlyRecurringExpenses } = momentum;

    // Momentum is ALREADY calculated in the base currency by DashboardContext.
    // We should NOT convert it again.
    const monthlySavingsBase = monthlySavings;
    const annualProjectedBase = annualProjectedSavings;


    // Truthful status based on planned savings rate
    // Why this exists:
    // Avoids over-claiming "Thriving" financial health based solely on 2 recurring rules.
    // Tricky logic:
    // Score directly reflects the recurring savings rate percentage without artificial point bonuses.
    // TODO: Connect to actual period cash flow statement from double-entry postings in Milestone 2.
    let color = '#ef4444'; // Red (< 15%)
    let status = 'Deficit';

    if (score >= 50) {
        color = '#10b981'; // Emerald (>= 50%)
        status = 'Strong Surplus';
    } else if (score >= 20) {
        color = '#3b82f6'; // Blue (20-49%)
        status = 'Moderate Surplus';
    } else if (score > 0) {
        color = '#f59e0b'; // Amber (1-19%)
        status = 'Modest Surplus';
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

            <div className="flex items-center justify-between mb-4 z-10 relative">
                <div>
                    <h3 className="text-xs font-black text-foreground uppercase tracking-widest">Planned Monthly Surplus</h3>
                    <p className="text-[10px] text-muted-foreground font-medium">Scheduled Bills & Income</p>
                </div>
            </div>

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
                        <span className="text-3xl font-black text-foreground leading-none">{score}%</span>
                        <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">{status}</span>
                    </div>
                </div>

                <div className="mt-4 text-center space-y-1">
                    <p className="text-sm font-medium text-muted-foreground">
                        Planned Savings: <span className="font-bold text-foreground privacy-value">{formatCurrency(monthlySavingsBase, baseCurrency)}/mo</span>
                    </p>
                    <p className="text-xs text-muted-foreground">
                        Annualized <span className="font-bold text-emerald-600 privacy-value">{formatCurrency(annualProjectedBase, baseCurrency)}</span> / year
                    </p>
                </div>

                {/* Savings Rate Badge */}
                <div className="mt-3 px-3 py-1 bg-muted rounded-full border border-border text-xs font-bold text-muted-foreground">
                    {momentum.savingsRate.toFixed(1)}% Planned Savings Rate
                </div>

                {/* Honest Scope Disclosure */}
                <p className="text-[10px] text-muted-foreground text-center mt-3 opacity-75 max-w-xs">
                    Based on scheduled recurring rules. Discretionary spending and unscheduled debts are not included.
                </p>
            </div>
        </div>
    );
}
