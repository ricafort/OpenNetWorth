'use client';

import { WealthMomentum } from '@/features/cashflow/types';
import { PieChart, Pie, Cell } from 'recharts';
import { Info } from 'lucide-react';
import { useNetWorth } from '@/features/dashboard/hooks/useNetWorth';
import { formatCurrency } from '@/lib/utils/currencyService';

interface Props {
    momentum: WealthMomentum;
}

/**
 * WealthMomentumGauge
 * 
 * Why this component exists:
 * Displays planned monthly surplus, break-even, or deficit based on scheduled recurring rules.
 * 
 * Tricky logic:
 * - Resolves Finding 5 & Clarification 7:
 *   1. Determines "No recurring rules" from whether applicable rules exist (`activeRulesCount === 0`),
 *      not merely whether both totals equal zero.
 *   2. Bases Surplus / Break-even / Deficit strictly on the signed monetary difference
 *      (`monthlyIncome - monthlyExpenses`), not a rounded percentage score.
 *   3. Clearly distinguishes four distinct states:
 *      - No rules configured
 *      - Break-even ($0 net difference)
 *      - Small / Planned surplus (positive difference)
 *      - Planned deficit (negative difference)
 * 
 * TODO: In Milestone 2, connect gauge to actual double-entry postings for true realized cash flow.
 */
export default function WealthMomentumGauge({ momentum }: Props) {
    const { baseCurrency } = useNetWorth();
    const {
        score,
        monthlySavings,
        annualProjectedSavings,
        monthlyRecurringIncome,
        monthlyRecurringExpenses,
        activeRulesCount
    } = momentum;

    const monthlySavingsBase = monthlySavings;
    const annualProjectedBase = annualProjectedSavings;
    const diff = monthlySavingsBase;

    // Check if applicable recurring rules exist
    const hasRules = activeRulesCount !== undefined
        ? activeRulesCount > 0
        : (monthlyRecurringIncome > 0 || monthlyRecurringExpenses > 0);

    let color = '#94a3b8'; // Neutral slate
    let status = 'No Recurring Rules';
    let isNoRules = false;

    if (!hasRules) {
        isNoRules = true;
        color = '#94a3b8';
        status = 'No Recurring Rules';
    } else if (Math.abs(diff) < 0.01) {
        // Break-even: exact zero monetary difference
        color = '#3b82f6'; // Blue
        status = 'Break-Even';
    } else if (diff > 0) {
        color = '#10b981'; // Emerald
        // Differentiate small surplus (< $200/mo or low rate) from strong surplus
        status = (diff < 200 || momentum.savingsRate < 10) ? 'Small Surplus' : 'Planned Surplus';
    } else {
        // Deficit: expenses exceed income
        color = '#ef4444'; // Red
        status = 'Planned Deficit';
    }

    const displayScore = isNoRules ? 0 : Math.max(0, Math.min(100, Math.round(momentum.savingsRate)));
    const data = [
        { value: isNoRules ? 0 : displayScore },
        { value: isNoRules ? 100 : (100 - displayScore) }
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
                        <span className="text-3xl font-black text-foreground leading-none">
                            {isNoRules ? '--' : `${displayScore}%`}
                        </span>
                        <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mt-0.5">
                            {status}
                        </span>
                    </div>
                </div>

                <div className="mt-4 text-center space-y-1">
                    {isNoRules ? (
                        <p className="text-sm font-medium text-muted-foreground">
                            No recurring rules configured
                        </p>
                    ) : (
                        <>
                            <p className="text-sm font-medium text-muted-foreground">
                                Planned Difference:{' '}
                                <span className={`font-bold privacy-value ${diff >= 0 ? 'text-foreground' : 'text-rose-600'}`}>
                                    {diff > 0 ? '+' : ''}{formatCurrency(monthlySavingsBase, baseCurrency)}/mo
                                </span>
                            </p>
                            <p className="text-xs text-muted-foreground">
                                Annualized <span className="font-bold text-foreground privacy-value">{formatCurrency(annualProjectedBase, baseCurrency)}</span> / year
                            </p>
                        </>
                    )}
                </div>

                {/* Savings Rate / Status Badge */}
                <div className="mt-3 px-3 py-1 bg-muted rounded-full border border-border text-xs font-bold text-muted-foreground">
                    {isNoRules
                        ? '0 Active Rules'
                        : `${momentum.savingsRate.toFixed(1)}% Planned Savings Rate`}
                </div>

                {/* Honest Scope Disclosure */}
                <p className="text-[10px] text-muted-foreground text-center mt-3 opacity-75 max-w-xs">
                    {isNoRules
                        ? 'Add recurring income and expenses in Cash Flow to calculate planned monthly surplus.'
                        : 'Based on scheduled recurring rules. Discretionary spending and unscheduled debts are not included.'}
                </p>
            </div>
        </div>
    );
}
