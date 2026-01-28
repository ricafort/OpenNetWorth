
'use client';

import { useState, useEffect, useMemo } from 'react';
import { Liability, DebtPayoffResult, PayoffStrategy } from '@/types';
import { calculatePayoff } from '@/lib/domain/debtCalculator';
import { loadLiabilities, loadFreedomSettings, saveFreedomSettings, updateDebtRecurringTransaction } from '@/lib/data/storage';
import { TrendingDown, Calendar, DollarSign, ArrowRight, ShieldCheck } from 'lucide-react';
import { useDashboard } from '@/contexts/DashboardContext';
import { formatCurrency, convertAmount } from '@/lib/utils/currencyService';

import PayoffScheduleChart from './PayoffScheduleChart';

import { useLiabilities } from '@/hooks'; // 👈 NEW: Using domain hook

export default function DebtPayoffCalculator() {
    const { baseCurrency } = useDashboard();
    const { liabilities } = useLiabilities(); // 👈 Using hook instead of ProfileContext

    // Lazy initialization
    const [extraPaymentUSD, setExtraPaymentUSD] = useState(() => {
        if (typeof window !== 'undefined') {
            return loadFreedomSettings().extraMonthlyPayment;
        }
        return 500;
    });

    // We control the input in "Base Currency", but store in "USD"
    const extraPaymentBase = convertAmount(extraPaymentUSD, 'USD', baseCurrency);

    const handleExtraPaymentChange = (val: number) => {
        const valUSD = convertAmount(val, baseCurrency, 'USD');
        setExtraPaymentUSD(valUSD);
    };

    const [strategy, setStrategy] = useState<PayoffStrategy>(() => {
        if (typeof window !== 'undefined') {
            return loadFreedomSettings().strategy;
        }
        return 'avalanche';
    });

    const [result, setResult] = useState<DebtPayoffResult | null>(null);
    const [baselineResult, setBaselineResult] = useState<DebtPayoffResult | null>(null);

    useEffect(() => {
        // Save settings. converting stored USD value to what storage expects (USD) is default.
        saveFreedomSettings({ strategy, extraMonthlyPayment: extraPaymentUSD });
        updateDebtRecurringTransaction(extraPaymentUSD);
    }, [strategy, extraPaymentUSD]);

    // Derived: Converted Liabilities for Calculation
    const calcLiabilities = useMemo(() => {
        return liabilities.map(l => ({
            ...l,
            // Normalize balance to Base Currency
            balance: convertAmount(l.balance, l.currency || 'USD', baseCurrency)
        }));
    }, [liabilities, baseCurrency]);

    useEffect(() => {
        if (calcLiabilities.length === 0) return;

        // Calculate using Base Currency values
        const res = calculatePayoff(calcLiabilities, extraPaymentBase, strategy);
        setResult(res);

        // Calculate baseline (minimum only) for comparison
        if (strategy !== 'minimum') {
            const baseline = calculatePayoff(calcLiabilities, 0, 'minimum');
            setBaselineResult(baseline);
        } else {
            setBaselineResult(null);
        }
    }, [calcLiabilities, extraPaymentBase, strategy]);

    const savings = useMemo(() => {
        if (!result || !baselineResult) return null;
        return {
            months: Math.max(0, baselineResult.monthsToPayoff - result.monthsToPayoff),
            interest: Math.max(0, baselineResult.totalInterestPaid - result.totalInterestPaid)
        };
    }, [result, baselineResult]);

    if (liabilities.length === 0) {
        return (
            <div className="bg-card p-8 rounded-2xl border border-border text-center">
                <ShieldCheck size={48} className="mx-auto text-emerald-500 mb-4" />
                <h3 className="text-xl font-bold text-foreground">You are Debt Free!</h3>
                <p className="text-muted-foreground mt-2">No liabilities found. Enjoy your freedom!</p>
            </div>
        );
    }

    return (
        <div className="space-y-8">
            {/* Controls */}
            <div className="bg-card p-6 rounded-2xl border border-border shadow-sm">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div>
                        <label className="block text-sm font-bold text-muted-foreground mb-3">Payoff Strategy</label>
                        <div className="flex bg-muted p-1 rounded-xl">
                            {(['avalanche', 'snowball', 'minimum'] as PayoffStrategy[]).map((s) => (
                                <button
                                    key={s}
                                    onClick={() => setStrategy(s)}
                                    className={`flex-1 py-2 px-3 rounded-lg text-sm font-bold capitalize transition-all ${strategy === s
                                        ? 'bg-white dark:bg-slate-700 shadow text-blue-600 dark:text-blue-400'
                                        : 'text-muted-foreground hover:text-foreground'
                                        }`}
                                >
                                    {s}
                                </button>
                            ))}
                        </div>
                        <p className="text-xs text-muted-foreground mt-3">
                            {strategy === 'avalanche' && "Highest interest rate first. Mathematically optimal."}
                            {strategy === 'snowball' && "Lowest balance first. Best for psychological quick wins."}
                            {strategy === 'minimum' && "Paying only minimums. Slowest path."}
                        </p>
                    </div>

                    <div>
                        <label className="block text-sm font-bold text-muted-foreground mb-3">Extra Monthly Payment</label>
                        <div className="relative">
                            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground font-bold text-sm">
                                {formatCurrency(0, baseCurrency).replace(/\d/g, '').replace(/[\.,\s]/g, '')}
                            </span>
                            <input
                                type="number"
                                value={Math.round(extraPaymentBase)} // Display rounded for cleaner UI input
                                onChange={(e) => handleExtraPaymentChange(Number(e.target.value))}
                                className="w-full pl-14 pr-4 py-3 bg-muted border border-border rounded-xl font-bold text-foreground focus:ring-2 focus:ring-blue-500 outline-none"
                            />
                        </div>
                        {strategy === 'minimum' && (
                            <p className="text-xs text-amber-500 mt-2 font-medium">
                                Extra payment is ignored in "Minimum" strategy.
                            </p>
                        )}
                    </div>
                </div>
            </div>

            {/* Results */}
            {result && (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Main Freedom Card */}
                    <div className="lg:col-span-2 bg-gradient-to-br from-blue-600 to-indigo-700 rounded-2xl p-8 text-white shadow-lg relative overflow-hidden">
                        <div className="absolute top-0 right-0 p-32 bg-white opacity-5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none"></div>

                        <div className="relative z-10">
                            <div className="flex items-center gap-3 mb-2 opacity-90">
                                <Calendar className="w-5 h-5" />
                                <span className="text-sm font-bold tracking-wider uppercase">Your Freedom Date</span>
                            </div>

                            <h2 className="text-4xl md:text-5xl font-black mb-6 tracking-tight">
                                {new Date(result.freedomDate).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
                            </h2>

                            {/* Portfolio Transparency Stats */}
                            <div className="flex flex-wrap gap-6 mb-8 bg-white/10 p-4 rounded-xl border border-white/10 backdrop-blur-sm">
                                <div>
                                    <p className="text-blue-100 text-xs font-bold uppercase tracking-wider mb-1">Effective APR</p>
                                    <div className="flex items-baseline gap-2">
                                        <p className="text-2xl font-black privacy-value">{
                                            (() => {
                                                const totalBal = calcLiabilities.reduce((sum, l) => sum + l.balance, 0);
                                                if (totalBal === 0) return "0.0%";
                                                const weightedRate = calcLiabilities.reduce((sum, l) => sum + (l.balance * l.interest_rate), 0) / totalBal;
                                                return weightedRate.toFixed(1) + "%";
                                            })()
                                        }</p>
                                        <span className="text-xs text-blue-200 font-medium">(Weighted Avg)</span>
                                    </div>
                                </div>
                                <div className="h-10 w-px bg-white/20"></div>
                                <div>
                                    <p className="text-blue-100 text-xs font-bold uppercase tracking-wider mb-1">Monthly Burn</p>
                                    <div className="flex items-baseline gap-2">
                                        <p className="text-2xl font-black privacy-value">{
                                            (() => {
                                                // Monthly Burn = Sum(Balance * MonthlyRate)
                                                // This is the "interest cost" of the current month
                                                const monthlyBurn = calcLiabilities.reduce((sum, l) => sum + (l.balance * (l.interest_rate / 100 / 12)), 0);
                                                return formatCurrency(monthlyBurn, baseCurrency);
                                            })()
                                        }</p>
                                        <span className="text-xs text-blue-200 font-medium">lost to interest</span>
                                    </div>
                                </div>
                            </div>

                            <div className="flex flex-wrap gap-8">
                                <div>
                                    <p className="text-blue-100 text-sm font-medium mb-1">Time to Payoff</p>
                                    <p className="text-2xl font-bold privacy-value">{Math.ceil(result.monthsToPayoff)} months</p>
                                </div>
                                <div>
                                    <p className="text-blue-100 text-sm font-medium mb-1">Total Interest</p>
                                    <p className="text-2xl font-bold privacy-value">{formatCurrency(result.totalInterestPaid, baseCurrency)}</p>
                                </div>
                                <div>
                                    <p className="text-blue-100 text-sm font-medium mb-1">Total Paid</p>
                                    <p className="text-2xl font-bold privacy-value">{formatCurrency(result.totalPayments, baseCurrency)}</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Right: Chart */}
                    <div className="lg:col-span-1">
                        <PayoffScheduleChart schedule={result.schedule} />

                        {/* Comparison Card - Moved inside right column for better layout */}
                        {savings && (
                            <div className="bg-card p-6 rounded-2xl border border-border shadow-sm flex flex-col justify-center mt-6">
                                <h3 className="font-bold text-muted-foreground mb-6 text-sm uppercase tracking-wider">Strategy Impact</h3>

                                <div className="space-y-6">
                                    <div className="flex items-center gap-4">
                                        <div className="p-3 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 rounded-xl">
                                            <Calendar size={24} />
                                        </div>
                                        <div>
                                            <p className="text-sm text-muted-foreground">Time Saved</p>
                                            <p className="text-2xl font-black text-foreground">{Math.floor(savings.months)} months</p>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-4">
                                        <div className="p-3 bg-blue-100 dark:bg-blue-900/30 text-blue-600 rounded-xl">
                                            <TrendingDown size={24} />
                                        </div>
                                        <div>
                                            <p className="text-sm text-muted-foreground">Interest Saved</p>
                                            <p className="text-2xl font-black text-emerald-600 privacy-value">{formatCurrency(savings.interest, baseCurrency)}</p>
                                        </div>
                                    </div>

                                    <div className="pt-4 border-t border-border">
                                        <p className="text-xs text-muted-foreground leading-relaxed italic">
                                            "Compound interest is the eighth wonder of the world. He who understands it, earns it... he who doesn't... pays it."
                                        </p>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Payoff Schedule Preview */}
            {result && (
                <div className="bg-card rounded-2xl border border-border overflow-hidden">
                    <div className="p-6 border-b border-border bg-muted/30">
                        <h3 className="font-bold text-foreground">Payoff Schedule</h3>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm">
                            <thead className="bg-muted text-muted-foreground font-semibold">
                                <tr>
                                    <th className="px-6 py-4">Month</th>
                                    <th className="px-6 py-4">Total Payment</th>
                                    <th className="px-6 py-4">Principal</th>
                                    <th className="px-6 py-4">Interest</th>
                                    <th className="px-6 py-4">Remaining Balance</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-border">
                                {/* Group by month to show totals */}
                                {Object.values(result.schedule.reduce((acc, entry) => {
                                    if (!acc[entry.month]) {
                                        acc[entry.month] = {
                                            month: entry.month,
                                            payment: 0,
                                            principal: 0,
                                            interest: 0,
                                            balance: 0
                                        };
                                    }
                                    acc[entry.month].payment += entry.payment;
                                    acc[entry.month].principal += entry.principal;
                                    acc[entry.month].interest += entry.interest;
                                    acc[entry.month].balance += entry.remainingBalance;
                                    return acc;
                                }, {} as Record<string, any>)).slice(0, 12).map((row: any) => (
                                    <tr key={row.month} className="hover:bg-muted/50 transition-colors">
                                        <td className="px-6 py-4 font-mono font-medium text-foreground">{row.month}</td>
                                        <td className="px-6 py-4 privacy-value">{formatCurrency(row.payment, baseCurrency)}</td>
                                        <td className="px-6 py-4 text-emerald-600 privacy-value">{formatCurrency(row.principal, baseCurrency)}</td>
                                        <td className="px-6 py-4 text-rose-500 privacy-value">{formatCurrency(row.interest, baseCurrency)}</td>
                                        <td className="px-6 py-4 font-bold text-foreground privacy-value">{formatCurrency(row.balance, baseCurrency)}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                    {result.monthsToPayoff > 12 && (
                        <div className="p-4 text-center text-sm text-muted-foreground bg-muted/30">
                            Showing first 12 months. Total payoff in {Math.ceil(result.monthsToPayoff)} months.
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
