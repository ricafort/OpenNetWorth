
'use client';

import { useState, useEffect } from 'react';
import { Liability, DebtPayoffResult } from '@/types';
import { calculatePayoff } from '@/lib/debtCalculator';
import { loadLiabilities, loadFreedomSettings } from '@/lib/storage';
import { Calendar, TrendingUp, AlertCircle } from 'lucide-react';
import Link from 'next/link';

import { generateDebtAdviceAction } from '@/app/actions';

export default function FreedomDateCard() {
    const [freedomDate, setFreedomDate] = useState<string | null>(null);
    const [daysRemaining, setDaysRemaining] = useState<number | null>(null);
    const [hasDebt, setHasDebt] = useState(false);
    const [advice, setAdvice] = useState<string>('Analyzing your path to freedom...');

    useEffect(() => {
        const liabilities = loadLiabilities();
        const activeDebts = liabilities.filter(l => l.balance > 0);

        if (activeDebts.length > 0) {
            setHasDebt(true);
            const settings = loadFreedomSettings();
            const result = calculatePayoff(liabilities, settings.extraMonthlyPayment, settings.strategy);
            setFreedomDate(result.freedomDate);
            setDaysRemaining(result.daysUntilFreedom);

            // Fetch AI Advice
            // We use a default persona for the "General" dashboard view, or random?
            // Let's use "Dave Ramsey" style for Debt as a default if none selected, 
            // or just a "Financial Mentor".
            // Ideally we check the user's selected mentor from localStorage, but for this widget 
            // let's stick to a solid default or fetch the "primary" mentor.
            // For MVP, hardcoding a "Wise Mentor" persona.

            generateDebtAdviceAction(
                "The Mentor",
                "a wise, direct, and encouraging financial guide",
                {
                    totalDebt: liabilities.reduce((sum, l) => sum + l.balance, 0),
                    highestInterestRate: Math.max(...liabilities.map(l => l.interest_rate)),
                    monthlyIncome: 5000, // TODO: Fetch from CashFlow or Settings
                    monthlyExpenses: 3000, // TODO: Fetch
                    payoffStrategy: loadFreedomSettings().strategy
                }
            ).then(setAdvice);

        } else {
            setHasDebt(false);
        }
    }, []);

    if (!hasDebt) return null;

    return (
        <div className="bg-gradient-to-br from-indigo-600 to-violet-700 rounded-2xl p-6 text-white shadow-lg relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-24 bg-white opacity-5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 transition-transform duration-700 group-hover:scale-110"></div>

            <div className="relative z-10">
                <div className="flex justify-between items-start mb-4">
                    <div className="flex items-center gap-2 bg-white/10 px-3 py-1 rounded-full backdrop-blur-sm">
                        <Calendar size={14} className="text-indigo-200" />
                        <span className="text-xs font-bold uppercase tracking-wider text-indigo-50">Freedom Date</span>
                    </div>
                </div>

                <div className="mb-6">
                    <h3 className="text-3xl font-black tracking-tight">
                        {freedomDate ? new Date(freedomDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }) : '...'}
                    </h3>
                    <p className="text-indigo-200 font-medium mt-1">
                        {daysRemaining !== null ? `${daysRemaining} days away` : 'Calculating...'}
                    </p>
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
