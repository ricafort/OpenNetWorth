
'use client';

import { useState, useEffect } from 'react';
import { Liability, LiabilityType, DebtPayoffResult } from '@/features/liabilities/types';
import { calculatePayoff } from '@/lib/domain/debtCalculator';
import { loadFreedomSettings } from '@/infrastructure/local_driver';
import { Calendar, TrendingUp, AlertCircle } from 'lucide-react';
import Link from 'next/link';
import { useLiabilitiesQuery } from '@/features/liabilities/hooks/useLiabilitiesQuery';
import { useNetWorth } from '@/features/dashboard/hooks/useNetWorth';
import { useAccountingCheck } from '@/features/accounting/hooks/useAccountingCheck';

import { formatCurrency } from '@/lib/utils/currencyService';
import { CurrencyCode } from '@/types';
import { centsToMajorUnits } from '@/lib/domain/accounting/types';

import { generateDebtAdviceAction } from '@/app/actions';

import { useWealthMomentum } from '@/features/cashflow/hooks/useWealthMomentum';
import { useSharedFinancialSummary } from '@/features/sync/hooks/useSharedFinancialSummary';

export default function FreedomDateCard() {
    const { liabilities, isLoading: isLiabilitiesLoading } = useLiabilitiesQuery();
    const { baseCurrency } = useNetWorth();
    const { momentum } = useWealthMomentum();
    const { summary, isLoading: isSummaryLoading, error: summaryError } = useSharedFinancialSummary({ reportingCurrency: baseCurrency });
    const { hasModernLiabilities, isError: isAccountingError, isLoading: isAccountingCheckLoading } = useAccountingCheck();
    
    const unrecordedLiabilities = summary?.unrecorded_accounts?.filter(a => a.account_type === 'liability') || [];
    const isLoading = isLiabilitiesLoading || isAccountingCheckLoading || (hasModernLiabilities && isSummaryLoading && !summaryError);
    const [freedomDate, setFreedomDate] = useState<string | null>(null);
    const [daysRemaining, setDaysRemaining] = useState<number | null>(null);
    const [hasDebt, setHasDebt] = useState(false);
    const [isMultiCurrencyUnsupported, setIsMultiCurrencyUnsupported] = useState(false);
    const [isInsufficientPayment, setIsInsufficientPayment] = useState(false);
    const [isHorizonExceeded, setIsHorizonExceeded] = useState(false);
    const [unsupportedCurrencies, setUnsupportedCurrencies] = useState<string[]>([]);
    const [monthsRemaining, setMonthsRemaining] = useState<number | null>(null);
    const [isCurrencyMismatch, setIsCurrencyMismatch] = useState(false);
    const [planCurrency, setPlanCurrency] = useState<CurrencyCode>('USD');
    const [advice, setAdvice] = useState<string>('Analyzing your path to freedom...');
    const [hasDebtsLackingInputs, setHasDebtsLackingInputs] = useState(false);



    useEffect(() => {
        const modernDebts: Liability[] = summary?.accounts
            ? summary.accounts
                .filter(a => a.account_type === 'liability')
                .map(a => ({
                    id: a.account_id,
                    name: a.account_name,
                    type: (['mortgage', 'student_loan', 'auto_loan', 'credit_card'].includes(a.account_sub_type)
                        ? a.account_sub_type
                        : 'other') as LiabilityType,
                    balance: centsToMajorUnits(a.amount_cents, a.currency),
                    currency: (a.currency || 'USD') as CurrencyCode,
                    interest_rate: (a as any).interest_rate,
                    minimum_payment: (a as any).minimum_payment,
                    is_good_debt: ['mortgage', 'student_loan'].includes(a.account_sub_type),
                    last_updated: a.effective_date
                }))
            : [];

        const allDebts = modernDebts.length > 0
            ? [...modernDebts.map(md => {
                const legacy = liabilities.find(l => l.account_id === md.id);
                if (legacy) {
                    return {
                        ...md,
                        interest_rate: legacy.interest_rate,
                        minimum_payment: legacy.minimum_payment
                    };
                }
                return md;
            }), ...liabilities.filter(l => !l.account_id || !new Set(modernDebts.map(d => d.id)).has(l.account_id))]
            : liabilities;

        const activeDebts = allDebts.filter(l => (l.balance || 0) > 0);
        const debtsLackingInputs = activeDebts.filter(d => 
            d.interest_rate === undefined || d.interest_rate === null ||
            d.minimum_payment === undefined || d.minimum_payment === null
        );
        
        setHasDebtsLackingInputs(debtsLackingInputs.length > 0);

        if (activeDebts.length > 0) {
            setHasDebt(true);
            const rawCurrencies = Array.from(new Set(activeDebts.map(l => (l.currency || 'USD') as CurrencyCode)));

            // Why this check exists:
            // Implements Assessor Finding A: Mixed-currency debt pools produce invalid rollover math.
            // When debts span multiple native currencies, multi-currency payoff projection is unsupported.
            // Tricky logic:
            // Check raw currencies first before any conversion to avoid false single-currency calculation.
            // TODO: In Milestone 2, calculate independent schedules per currency.
            if (rawCurrencies.length > 1) {
                setIsMultiCurrencyUnsupported(true);
                setIsInsufficientPayment(false);
                setIsHorizonExceeded(false);
                setIsCurrencyMismatch(false);
                setUnsupportedCurrencies(rawCurrencies);
                setFreedomDate(null);
                setDaysRemaining(null);
                setMonthsRemaining(null);
                setAdvice(`Debt payoff projection requires debts to be in a single currency. Mixed currencies found: ${rawCurrencies.join(', ')}.`);
                return;
            }

            if (debtsLackingInputs.length > 0) {
                setFreedomDate(null);
                setDaysRemaining(null);
                setMonthsRemaining(null);
                setAdvice('Projection unavailable due to missing debt configurations.');
                return;
            }

            const debtCurrency = (rawCurrencies[0] || baseCurrency || 'USD') as CurrencyCode;
            const settings = loadFreedomSettings();
            const savedCurrency = settings.currency || 'USD';
            setPlanCurrency(savedCurrency);

            const mismatch = Boolean(debtCurrency && savedCurrency !== debtCurrency);
            setIsCurrencyMismatch(mismatch);

            // Why this calculation exists:
            // Fulfills Item 5: Remove silent mock FX from real debt projections.
            // Debts are calculated strictly in their native currency without synthetic mock conversion.
            // Fulfills small correction: Uses result.monthsToPayoff rather than daysRemaining / 30.
            // Tricky logic:
            // A saved-plan/debt currency mismatch cannot silently change units.
            // If the saved plan currency differs from the active debt currency (e.g. 500 USD vs AUD debts),
            // do NOT silently apply 500 USD as 500 AUD. Calculate with 0 extra (minimum baseline)
            // and prompt the user to review their plan.
            // TODO: In Milestone 2, allow selecting target calculation currency with explicit dated FX rates.
            const effectiveExtraPayment = mismatch ? 0 : settings.extraMonthlyPayment;
            const result = calculatePayoff(activeDebts, effectiveExtraPayment, settings.strategy);

            if (result.isMultiCurrencyUnsupported) {
                setIsMultiCurrencyUnsupported(true);
                setIsInsufficientPayment(false);
                setIsHorizonExceeded(false);
                setUnsupportedCurrencies(result.unsupportedCurrencies || []);
                setFreedomDate(null);
                setDaysRemaining(null);
                setMonthsRemaining(null);
                setAdvice(`Debt payoff projection requires debts to be in a single currency. Mixed currencies found: ${(result.unsupportedCurrencies || []).join(', ')}.`);
                return;
            }

            if (result.isInsufficientPayment) {
                setIsInsufficientPayment(true);
                setIsMultiCurrencyUnsupported(false);
                setIsHorizonExceeded(false);
                setFreedomDate(null);
                setDaysRemaining(null);
                setMonthsRemaining(null);
                setAdvice(result.insufficientPaymentReason || 'Monthly payments are insufficient to cover interest charges. Loans will not amortise without higher payments.');
                return;
            }

            if (result.isHorizonExceeded) {
                setIsHorizonExceeded(true);
                setIsInsufficientPayment(false);
                setIsMultiCurrencyUnsupported(false);
                setFreedomDate(null);
                setDaysRemaining(null);
                setMonthsRemaining(null);
                setAdvice(result.horizonExceededReason || 'Debt payoff exceeds the 50-year projection horizon with current monthly payments.');
                return;
            }

            setIsMultiCurrencyUnsupported(false);
            setIsInsufficientPayment(false);
            setIsHorizonExceeded(false);
            setFreedomDate(result.freedomDate);
            setDaysRemaining(result.daysUntilFreedom);
            setMonthsRemaining(result.monthsToPayoff);

            // Why this deterministic explanation exists:
            // Implements Clarification 6 & Item 5: Explains the user's configured repayment scenario (strategy and extra payment)
            // without treating an incompatible currency setting as valid or cashflow surplus as verified repayment capacity.
            // Tricky logic:
            // When currency mismatch is present, prompt the user to review in Freedom Calculator rather than assuming the mismatched currency amount.
            // TODO: In Milestone 2, calculate independent multi-currency payoff timelines.
            if (mismatch) {
                setAdvice(
                    `Plan review required: Your saved payoff plan was configured in ${savedCurrency} (${formatCurrency(settings.extraMonthlyPayment, savedCurrency)}/month extra), but your active debts are in ${debtCurrency}. Review your plan in Freedom Calculator to update your extra payment in ${debtCurrency}.`
                );
            } else {
                const monthYear = new Date(result.freedomDate).toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
                const extraFormatted = settings.extraMonthlyPayment > 0
                    ? `with ${formatCurrency(settings.extraMonthlyPayment, debtCurrency)}/month extra`
                    : 'with minimum monthly payments';

                setAdvice(`Configured payoff plan: Paying ${extraFormatted} using the ${settings.strategy.toUpperCase()} strategy leads to an estimated debt-free month of ${monthYear}. Note: Unscheduled spending and interest rate changes are not included.`);
            }
        } else {
            setHasDebt(false);
            setIsMultiCurrencyUnsupported(false);
            setIsInsufficientPayment(false);
            setIsHorizonExceeded(false);
            setIsCurrencyMismatch(false);
            setMonthsRemaining(null);
            setHasDebtsLackingInputs(false);
        }
    }, [liabilities, baseCurrency, momentum, summary]);

    if (isAccountingError || summaryError) {
        return (
            <div className="bg-slate-800 rounded-2xl p-6 text-slate-200 shadow-lg relative overflow-hidden h-full flex flex-col justify-between">
                <div className="flex items-center gap-2 bg-slate-700/50 px-3 py-1 rounded-full backdrop-blur-sm w-fit">
                    <AlertCircle size={14} className="text-red-400" />
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-300">Data Error</span>
                </div>

                <div className="mt-4">
                    <h3 className="text-xl font-bold tracking-tight text-white mb-2">Balances Unavailable</h3>
                    <p className="text-sm text-slate-400 font-medium">
                        Unable to load authoritative account balances.
                    </p>
                </div>

                <div className="mt-6">
                    <button
                        onClick={() => window.location.reload()}
                        className="text-xs font-bold bg-slate-700 text-slate-300 border border-slate-600 px-4 py-2 rounded-lg inline-block hover:bg-slate-600 transition-colors"
                    >
                        Retry
                    </button>
                </div>
            </div>
        );
    }

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
        if (unrecordedLiabilities.length > 0) {
            return (
                <div className="bg-slate-800 rounded-2xl p-6 text-slate-200 shadow-lg relative overflow-hidden h-full flex flex-col justify-between">
                    <div className="flex items-center gap-2 bg-slate-700/50 px-3 py-1 rounded-full backdrop-blur-sm w-fit">
                        <AlertCircle size={14} className="text-amber-400" />
                        <span className="text-xs font-bold uppercase tracking-wider text-slate-300">Integration Notice</span>
                    </div>

                    <div className="mt-4">
                        <h3 className="text-xl font-bold tracking-tight text-white mb-2">Liability Balances Pending</h3>
                        <p className="text-sm text-slate-400 font-medium">
                            You have unrecorded debt accounts. Complete your valuations in Accounts to calculate your freedom date.
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
                        <span className="text-xs font-bold uppercase tracking-wider text-indigo-50">
                            {unrecordedLiabilities.length > 0 ? "Estimated Payoff for Included Debts" : "Estimated Debt-Free Month"}
                        </span>
                    </div>
                </div>

                <div className="mb-4">
                    <h3 className="text-2xl md:text-3xl font-black tracking-tight">
                        {isMultiCurrencyUnsupported
                            ? 'Multi-Currency Debts'
                            : hasDebtsLackingInputs
                                ? 'Repayment details needed'
                                : isInsufficientPayment
                                    ? 'Insufficient Payment'
                                    : isHorizonExceeded
                                        ? '> 50-Year Horizon'
                                        : (freedomDate ? new Date(freedomDate).toLocaleDateString(undefined, { month: 'long', year: 'numeric' }) : '...')}
                    </h3>
                    <p className="text-indigo-200 font-medium mt-1 text-sm">
                        {isMultiCurrencyUnsupported
                            ? `Debts span ${unsupportedCurrencies.join(', ')}. Payoff projection requires debts in a single currency.`
                            : hasDebtsLackingInputs
                                ? 'Projection unavailable due to missing debt configurations.'
                                : isInsufficientPayment
                                    ? 'Monthly payments do not cover interest charges. Loans will not amortise.'
                                        : isHorizonExceeded
                                            ? 'Current payments amortise principal, but payoff takes longer than 50 years.'
                                            : isCurrencyMismatch
                                                ? `Plan currency review required (${planCurrency} saved vs active debt currency).`
                                                : (monthsRemaining !== null ? `Estimated ${monthsRemaining} ${monthsRemaining === 1 ? 'month' : 'months'} to payoff` : 'Calculating...')}
                    </p>
                    {unrecordedLiabilities.length > 0 && (
                        <p className="text-[10px] text-indigo-200 mt-1.5 opacity-80">
                            Calculation covers recorded debts. Some modern accounts lack balances.
                        </p>
                    )}
                    {hasModernLiabilities && unrecordedLiabilities.length === 0 && (
                        <p className="text-[10px] text-indigo-200 mt-1.5 opacity-80">
                            Calculation covers legacy debts and modern liability accounts.
                        </p>
                    )}
                </div>

                <div className="bg-white/10 rounded-xl p-4 backdrop-blur-md border border-white/10">
                    <div className="flex gap-3">
                        <div className="p-2 bg-indigo-500 rounded-lg shrink-0 h-fit">
                            {isMultiCurrencyUnsupported || isInsufficientPayment || isHorizonExceeded || isCurrencyMismatch ? <AlertCircle size={18} /> : <TrendingUp size={18} />}
                        </div>
                        <div>
                            <p className="text-xs text-indigo-200 leading-relaxed mb-2">
                                {advice}
                            </p>
                            <Link
                                href="/freedom"
                                className="text-xs font-bold bg-white text-indigo-600 px-3 py-1.5 rounded-lg inline-block hover:bg-indigo-50 transition-colors"
                            >
                                {isCurrencyMismatch ? 'Review Plan in Freedom →' : 'Optimize Payoff →'}
                            </Link>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
