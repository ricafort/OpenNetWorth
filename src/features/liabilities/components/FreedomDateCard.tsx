
'use client';

import { useState, useEffect } from 'react';
import { Liability, DebtPayoffResult } from '@/features/liabilities/types';
import { calculatePayoff } from '@/lib/domain/debtCalculator';
import { loadFreedomSettings } from '@/infrastructure/local_driver';
import { Calendar, TrendingUp, AlertCircle } from 'lucide-react';
import Link from 'next/link';
import { useLiabilitiesQuery } from '@/features/liabilities/hooks/useLiabilitiesQuery';
import { useNetWorth } from '@/features/dashboard/hooks/useNetWorth';
import { useAccountingCheck } from '@/features/accounting/hooks/useAccountingCheck';

import { generateDebtAdviceAction } from '@/app/actions';

import { useWealthMomentum } from '@/features/cashflow/hooks/useWealthMomentum';

export default function FreedomDateCard() {
    const { liabilities, isLoading: isLiabilitiesLoading } = useLiabilitiesQuery();
    const { hasModernLiabilities, isLoading: isAccountingLoading } = useAccountingCheck();
    const { momentum } = useWealthMomentum();
    const [freedomDate, setFreedomDate] = useState<string | null>(null);
    const [daysRemaining, setDaysRemaining] = useState<number | null>(null);
    const [hasDebt, setHasDebt] = useState(false);
    const [advice, setAdvice] = useState<string>('Analyzing your path to freedom...');

    const isLoading = isLiabilitiesLoading || isAccountingLoading;

    useEffect(() => {
        const activeDebts = liabilities.filter(l => l.balance > 0);

        if (activeDebts.length > 0) {
            setHasDebt(true);
            const settings = loadFreedomSettings();
            const result = calculatePayoff(liabilities, settings.extraMonthlyPayment, settings.strategy);
            setFreedomDate(result.freedomDate);
            setDaysRemaining(result.daysUntilFreedom);

            // Truthful budget derivation:
            // Why this exists:
            // Prevents passing invented $5,000 income and $3,000 expenses as constants into debt advice.
            // Tricky logic:
            // Derives income and expenses from active recurring rules in Cash Flow if configured.
            // If the user has not configured recurring income, we provide prompt guidance rather than
            // claiming a fictitious $2,000/mo disposable surplus.
            // TODO: Include minimum monthly debt servicing payments in the budget context.
            const hasRecurringBudget = momentum && momentum.monthlyRecurringIncome > 0;
            const income = hasRecurringBudget ? momentum.monthlyRecurringIncome : 0;
            const expenses = hasRecurringBudget ? momentum.monthlyRecurringExpenses : 0;

            if (hasRecurringBudget && (income - expenses) > 0) {
                generateDebtAdviceAction(
                    "The Mentor",
                    "a wise, direct, and encouraging financial guide",
                    {
                        totalDebt: liabilities.reduce((sum, l) => sum + l.balance, 0),
                        highestInterestRate: Math.max(...liabilities.map(l => l.interest_rate)),
                        monthlyIncome: income,
                        monthlyExpenses: expenses,
                        payoffStrategy: loadFreedomSettings().strategy
                    }
                ).then(setAdvice);
            } else {
                setAdvice("Set your recurring income and bills in Cash Flow to receive personalized debt payoff strategy advice.");
            }

        } else {
            setHasDebt(false);
        }
    }, [liabilities, momentum]);

    if (isLoading) {
        return (
            <div className="bg-slate-100 rounded-2xl p-6 shadow-sm h-full flex flex-col justify-between animate-pulse">
                <div className="h-6 w-24 bg-slate-200 rounded-full mb-4"></div>
                <div className="space-y-3">
                    <div className="h-8 w-3/4 bg-slate-200 rounded"></div>
                    <div className="h-4 w-1/2 bg-slate-200 rounded"></div>
                </div>
            </div>
        );
    }

    if (!hasDebt) {
        if (hasModernLiabilities) {
            return (
                <div className="bg-slate-800 rounded-2xl p-6 text-slate-200 shadow-lg relative overflow-hidden h-full flex flex-col justify-between">
                    <div className="flex items-center gap-2 bg-slate-700/50 px-3 py-1 rounded-full backdrop-blur-sm w-fit">
                        <AlertCircle size={14} className="text-amber-400" />
                        <span className="text-xs font-bold uppercase tracking-wider text-slate-300">Integration Notice</span>
                    </div>

                    <div className="mt-4">
                        <h3 className="text-xl font-bold tracking-tight text-white mb-2">Incomplete View</h3>
                        <p className="text-sm text-slate-400 font-medium">
                            This view does not yet include all your recorded accounts.
                        </p>
                    </div>

                    <div className="mt-6">
                        <Link
                            href="/accounting"
                            className="text-xs font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20 px-4 py-2 rounded-lg inline-block hover:bg-amber-500/20 transition-colors"
                        >
                            See Accounts for your balances →
                        </Link>
                    </div>
                </div>
            );
        }

        return (
            <div className="bg-gradient-to-br from-emerald-500 to-teal-600 rounded-2xl p-6 text-white shadow-lg relative overflow-hidden h-full flex flex-col justify-between">
                <div className="absolute -right-4 -top-4 bg-white/10 w-24 h-24 rounded-full blur-2xl"></div>
                <div className="flex items-center gap-2 bg-white/10 px-3 py-1 rounded-full backdrop-blur-sm w-fit">
                    <TrendingUp size={14} className="text-emerald-100" />
                    <span className="text-xs font-bold uppercase tracking-wider text-emerald-50">Status</span>
                </div>

                <div className="mt-4">
                    <h3 className="text-3xl font-black tracking-tight">Debt Free! 🎉</h3>
                    <p className="text-emerald-100 font-medium mt-1">You have no active liabilities.</p>
                </div>

                <div className="mt-6">
                    <Link
                        href="/freedom"
                        className="text-xs font-bold bg-white text-emerald-600 px-4 py-2 rounded-lg inline-block hover:bg-emerald-50 transition-colors"
                    >
                        Plan Next Goal →
                    </Link>
                </div>
            </div>
        );
    }

    return (
        <div className="bg-gradient-to-br from-indigo-600 to-violet-700 rounded-2xl p-6 text-white shadow-lg relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-24 bg-white opacity-5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 transition-transform duration-700 group-hover:scale-110"></div>

            <div className="relative z-10">
                <div className="flex justify-between items-start mb-4">
                    <div className="flex items-center gap-2 bg-white/10 px-3 py-1 rounded-full backdrop-blur-sm">
                        <Calendar size={14} className="text-indigo-200" />
                        <span className="text-xs font-bold uppercase tracking-wider text-indigo-50">Estimated Debt-Free Month</span>
                    </div>
                </div>

                <div className="mb-4">
                    <h3 className="text-3xl font-black tracking-tight">
                        {freedomDate ? new Date(freedomDate).toLocaleDateString(undefined, { month: 'long', year: 'numeric' }) : '...'}
                    </h3>
                    <p className="text-indigo-200 font-medium mt-1 text-sm">
                        {daysRemaining !== null ? `Estimated ~${Math.max(1, Math.round(daysRemaining / 30))} months to payoff` : 'Calculating...'}
                    </p>
                    {hasModernLiabilities && (
                        <p className="text-[10px] text-indigo-200 mt-1.5 opacity-80">
                            Calculation covers legacy debts. Modern liability accounts are tracked in Accounts.
                        </p>
                    )}
                </div>

                <div className="bg-white/10 rounded-xl p-4 backdrop-blur-md border border-white/10">
                    <div className="flex gap-3">
                        <div className="p-2 bg-indigo-500 rounded-lg shrink-0 h-fit">
                            <TrendingUp size={18} />
                        </div>
                        <div>
                            <p className="text-xs text-indigo-200 leading-relaxed italic mb-2">
                                "{advice}"
                            </p>
                            <Link
                                href="/freedom"
                                className="text-xs font-bold bg-white text-indigo-600 px-3 py-1.5 rounded-lg inline-block hover:bg-indigo-50 transition-colors"
                            >
                                Optimize Payoff →
                            </Link>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
