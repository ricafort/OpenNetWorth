
'use client';

import { useState, useEffect, useMemo } from 'react';
import { Liability, LiabilityType, DebtPayoffResult, PayoffStrategy } from '@/features/liabilities/types';
import { calculatePayoff } from '@/lib/domain/debtCalculator';
import { loadFreedomSettingsFromVault, saveFreedomSettings, updateDebtRecurringTransaction } from '@/infrastructure/local_driver';
import { TrendingDown, Calendar, DollarSign, ArrowRight, ShieldCheck, AlertCircle } from 'lucide-react';
import { useDashboard } from '@/features/dashboard/context/DashboardContext';
import { useNetWorth } from '@/features/dashboard/hooks/useNetWorth';
import { formatCurrency } from '@/lib/utils/currencyService';
import { CurrencyCode } from '@/types';

import { centsToMajorUnits } from '@/lib/domain/accounting/types';
import PayoffScheduleChart from '@/components/charts/PayoffScheduleChart';
import { ContentCard } from '@/components/common/ContentCard';

import { useLiabilitiesQuery } from '@/features/liabilities/hooks/useLiabilitiesQuery';
import { useSharedFinancialSummary } from '@/features/sync/hooks/useSharedFinancialSummary';
import { useAccountingCheck } from '@/features/accounting/hooks/useAccountingCheck';

export default function DebtPayoffCalculator() {
    const { baseCurrency } = useNetWorth();
    const { liabilities, isLoading: isLiabilitiesLoading } = useLiabilitiesQuery();
    const {
        summary,
        isLoading: isSummaryLoading,
        error: summaryError,
        refresh: refreshSummary
    } = useSharedFinancialSummary({ reportingCurrency: baseCurrency });
    const { hasModernLiabilities, isError: isAccountingError, isLoading: isAccountingCheckLoading } = useAccountingCheck();

    const isLoading = isLiabilitiesLoading || isAccountingCheckLoading || (hasModernLiabilities && isSummaryLoading && !summaryError);

    // Modern liabilities from authoritative summary
    const modernDebts = useMemo((): Liability[] => {
        if (!summary?.accounts) return [];
        return summary.accounts
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
            }));
    }, [summary?.accounts]);

    const unrecordedLiabilities = useMemo(() => {
        if (!summary?.unrecorded_accounts) return [];
        return summary.unrecorded_accounts.filter(a => a.account_type === 'liability');
    }, [summary?.unrecorded_accounts]);

    // Unified debt collection prioritizing authoritative modern debts
    // Fulfills Requirement 4: Deduplicate by established account_id relationships, never infer identity from matching names.
    const allDebts = useMemo(() => {
        if (modernDebts.length > 0) {
            const modernAccountIds = new Set(modernDebts.map(d => d.id));
            const unlinkedLegacy = liabilities.filter(l => !l.account_id || !modernAccountIds.has(l.account_id));
            
            const mergedModern = modernDebts.map(md => {
                const legacy = liabilities.find(l => l.account_id === md.id);
                if (legacy) {
                    return {
                        ...md,
                        interest_rate: legacy.interest_rate,
                        minimum_payment: legacy.minimum_payment
                    };
                }
                return md;
            });

            return [...mergedModern, ...unlinkedLegacy];
        }
        return liabilities;
    }, [modernDebts, liabilities]);

    const activeDebts = useMemo(() => allDebts.filter(l => (l.balance || 0) > 0), [allDebts]);

    const debtsLackingInputs = useMemo(() => {
        return activeDebts.filter(d => 
            d.interest_rate === undefined || d.interest_rate === null ||
            d.minimum_payment === undefined || d.minimum_payment === null
        );
    }, [activeDebts]);

    const hasDebtsLackingInputs = debtsLackingInputs.length > 0;

    const rawCurrencies = useMemo(() => {
        return Array.from(new Set(activeDebts.map(l => (l.currency || 'USD') as CurrencyCode)));
    }, [activeDebts]);
    const isMultiCurrency = rawCurrencies.length > 1;
    const debtCurrency = (rawCurrencies[0] || (baseCurrency as CurrencyCode) || 'USD') as CurrencyCode;

    // Saved settings loaded from the SQLite settings kv (localStorage only for demo personas)
    // Why this exists:
    // Holds the currently persisted freedom plan (strategy, extraMonthlyPayment, currency).
    // Tricky logic:
    // Preserves historical USD meaning of old currency-less settings (defaults to 'USD').
    // The load is async, so settingsLoaded gates the currency-change block below: without it,
    // that block would run with placeholder defaults and could lock in a default amount
    // before the real saved plan arrives.
    // TODO: Support multiple named scenario profiles in SQLite settings.
    const [savedSettings, setSavedSettings] = useState<{ strategy: PayoffStrategy; extraMonthlyPayment: number; currency: CurrencyCode }>({
        strategy: 'avalanche',
        extraMonthlyPayment: 500,
        currency: 'USD'
    });
    const [settingsLoaded, setSettingsLoaded] = useState(false);

    useEffect(() => {
        let cancelled = false;
        const apply = (s: { strategy: PayoffStrategy; extraMonthlyPayment: number; currency: CurrencyCode }) => {
            if (cancelled) return;
            setSavedSettings(s);
            setStrategy(s.strategy);
            setSettingsLoaded(true);
        };
        // The payoff plan lives in the SQLite settings kv; in demo mode the
        // `demo_persona` cookie makes the read target the persona vault (Phase 2.7).
        loadFreedomSettingsFromVault()
            .then(apply)
            .catch(() => { if (!cancelled) setSettingsLoaded(true); /* keep visible defaults */ });
        return () => { cancelled = true; };
    }, []);

    // Associated editable payment state coupled to its currency
    // Why this exists:
    // Fulfills Item 5 Loading-State Correction:
    // - Associates the editable extra payment amount with its explicit currency.
    // - Prevents state initialized before async debts finish loading from corrupting calculations.
    // - When debt currency changes, prevents an amount from previous currency reaching the calculation.
    // - Restores matching saved plans correctly when debt currency matches saved plan currency.
    // - Preserves deliberate user edits during ordinary rerenders.
    // Tricky logic:
    // We track prevDebtCurrency and update state when !isLoading and debtCurrency changes.
    // In the current render pass, extraPayment immediately derives a safe value in debtCurrency,
    // ensuring zero render passes ever execute with cross-currency numbers.
    // TODO: Support scenario undo/redo history stack across multiple currency profiles.
    const [paymentPlan, setPaymentPlan] = useState<{ amount: number; currency: CurrencyCode } | null>(null);
    const [prevDebtCurrency, setPrevDebtCurrency] = useState<CurrencyCode | null>(null);

    if (!isLoading && settingsLoaded && debtCurrency !== prevDebtCurrency) {
        setPrevDebtCurrency(debtCurrency);
        const initialAmount = (savedSettings.currency && savedSettings.currency === debtCurrency)
            ? savedSettings.extraMonthlyPayment
            : 0;
        setPaymentPlan({ amount: initialAmount, currency: debtCurrency });
    }

    // Effective extra payment in debtCurrency for calculations and display
    const extraPayment = (paymentPlan && paymentPlan.currency === debtCurrency)
        ? paymentPlan.amount
        : ((savedSettings.currency && savedSettings.currency === debtCurrency) ? savedSettings.extraMonthlyPayment : 0);

    const handleExtraPaymentChange = (val: number) => {
        setPaymentPlan({ amount: val, currency: debtCurrency });
    };

    // Why this check exists:
    // Fulfills Item 5: A saved-plan/debt currency mismatch cannot silently change units.
    // If the saved plan was created in USD (or legacy currency-less setting defaulting to USD)
    // and active debts are in AUD, we must flag this mismatch and show a clear review state.
    // Tricky logic:
    // Guards with !isLoading and activeDebts.length > 0 so that mismatch warnings do not flash
    // prematurely while data is still loading or when no debts exist.
    // TODO: In Milestone 2, offer an automated FX conversion preview using dated exchange rates.
    const isCurrencyMismatch = Boolean(
        !isLoading &&
        settingsLoaded &&
        activeDebts.length > 0 &&
        !isMultiCurrency &&
        savedSettings.currency &&
        savedSettings.currency !== debtCurrency
    );

    // Seeded with the default; the settings-load effect above syncs it from the vault
    // (or localStorage for demo personas) once the saved plan arrives.
    const [strategy, setStrategy] = useState<PayoffStrategy>('avalanche');

    const [isSaving, setIsSaving] = useState(false);
    const [saveSuccessMessage, setSaveSuccessMessage] = useState<string | null>(null);
    const [saveErrorMessage, setSaveErrorMessage] = useState<string | null>(null);

    const hasUnsavedChanges = useMemo(() => {
        // While the saved plan is still loading, the placeholder defaults must not
        // masquerade as unsaved edits (e.g. a USD placeholder vs AUD debts).
        if (!settingsLoaded) return false;
        return strategy !== savedSettings.strategy ||
            Math.round(extraPayment) !== Math.round(savedSettings.extraMonthlyPayment) ||
            savedSettings.currency !== debtCurrency;
    }, [settingsLoaded, strategy, extraPayment, savedSettings, debtCurrency]);

    const handleSavePlan = async () => {
        setIsSaving(true);
        setSaveSuccessMessage(null);
        setSaveErrorMessage(null);
        try {
            await saveFreedomSettings({ strategy, extraMonthlyPayment: extraPayment, currency: debtCurrency });
            await updateDebtRecurringTransaction(strategy === 'minimum' ? 0 : extraPayment, debtCurrency);
            setSavedSettings({ strategy, extraMonthlyPayment: extraPayment, currency: debtCurrency });
            setPaymentPlan({ amount: extraPayment, currency: debtCurrency });
            setSaveSuccessMessage('Plan saved to your budget successfully.');
            setTimeout(() => setSaveSuccessMessage(null), 4000);
        } catch (err: any) {
            console.error('Failed to save debt plan:', err);
            setSaveErrorMessage(err?.message || 'Failed to save plan to budget.');
        } finally {
            setIsSaving(false);
        }
    };

    const handleResetPlan = () => {
        setStrategy(savedSettings.strategy);
        const resetAmount = (savedSettings.currency && savedSettings.currency === debtCurrency)
            ? savedSettings.extraMonthlyPayment
            : 0;
        setPaymentPlan({ amount: resetAmount, currency: debtCurrency });
        setSaveSuccessMessage(null);
        setSaveErrorMessage(null);
    };

    // Debts are calculated strictly in their native currency
    const calcLiabilities = activeDebts;

    // Why this is memoized:
    // Pure, synchronous calculation runs in the same render pass as extraPayment and strategy updates.
    // Eliminates 1-frame async state lag and ensures rendered timeline and schedule table always agree.
    const result = useMemo(() => {
        if (calcLiabilities.length === 0) return null;
        return calculatePayoff(calcLiabilities, extraPayment, strategy);
    }, [calcLiabilities, extraPayment, strategy]);

    const baselineResult = useMemo(() => {
        if (calcLiabilities.length === 0 || strategy === 'minimum') return null;
        return calculatePayoff(calcLiabilities, 0, 'minimum');
    }, [calcLiabilities, strategy]);

    const savings = useMemo(() => {
        if (!result || !baselineResult) return null;
        // Why this check exists:
        // Do not calculate savings against a failed (insufficient payment) or truncated (horizon exceeded) baseline (Assessor Finding A).
        if (result.isInsufficientPayment || result.isHorizonExceeded || result.isMultiCurrencyUnsupported) return null;
        if (baselineResult.isInsufficientPayment || baselineResult.isHorizonExceeded || baselineResult.isMultiCurrencyUnsupported) return null;
        if (baselineResult.monthsToPayoff <= 0) return null;
        return {
            months: Math.max(0, baselineResult.monthsToPayoff - result.monthsToPayoff),
            interest: Math.max(0, baselineResult.totalInterestPaid - result.totalInterestPaid)
        };
    }, [result, baselineResult]);

    // Fulfills Requirement 2: A failed summary must not produce "No liabilities" or "Debt Free".
    if (summaryError || isAccountingError) {
        return (
            <ContentCard className="text-center p-8 border-destructive/30 bg-destructive/10">
                <AlertCircle size={48} className="mx-auto text-destructive mb-4" />
                <h3 className="text-xl font-bold text-foreground">Failed to Load Debt Balances</h3>
                <p className="text-muted-foreground mt-2 text-sm max-w-md mx-auto">
                    An error occurred while loading your authoritative liability balances{summaryError ? `: ${summaryError}` : '.'}
                </p>
                <button
                    onClick={() => { refreshSummary(); window.location.reload(); }}
                    className="mt-4 px-4 py-2 bg-destructive text-destructive-foreground rounded-xl text-xs font-bold hover:opacity-90 transition cursor-pointer"
                >
                    Retry
                </button>
            </ContentCard>
        );
    }

    if (isLoading) {
        return (
            <ContentCard className="text-center p-8 animate-pulse">
                <div className="h-12 w-12 bg-slate-200 rounded-full mx-auto mb-4"></div>
                <div className="h-6 w-1/3 bg-slate-200 rounded mx-auto mt-2"></div>
            </ContentCard>
        );
    }

    if (activeDebts.length === 0) {
        if (unrecordedLiabilities.length > 0) {
            return (
                <ContentCard className="text-center p-8 bg-amber-50/50 border-amber-200">
                    <AlertCircle size={48} className="mx-auto text-amber-500 mb-4" />
                    <h3 className="text-xl font-bold text-foreground">Liability Balances Pending</h3>
                    <p className="text-muted-foreground mt-2">
                        You have recorded debt accounts without accepted balances. Complete your valuations in Accounts to calculate debt payoff projections.
                    </p>
                </ContentCard>
            );
        }

        return (
            <ContentCard className="text-center p-8">
                <ShieldCheck size={48} className="mx-auto text-emerald-500 mb-4" />
                <h3 className="text-xl font-bold text-foreground">You are Debt Free!</h3>
                <p className="text-muted-foreground mt-2">No liabilities found. Enjoy your freedom!</p>
            </ContentCard>
        );
    }

    // Fulfills Governing Principle & Requirement 2:
    // If a debt lacks interest-rate or repayment details needed for a projection, show its known balance
    // and explain the missing inputs. Do not invent an interest rate or payoff date.
    if (hasDebtsLackingInputs) {
        return (
            <div className="space-y-6">
                <ContentCard className="border border-border">
                    <div className="flex items-start gap-4">
                        <div className="p-3 bg-amber-100 dark:bg-amber-900/40 text-amber-600 rounded-xl">
                            <AlertCircle size={24} />
                        </div>
                        <div className="space-y-2 flex-1">
                            <h3 className="text-lg font-bold text-foreground">
                                Active Debts Recorded — Projection Inputs Required
                            </h3>
                            <p className="text-sm text-muted-foreground leading-relaxed">
                                Debt payoff schedules require an annual interest rate and minimum payment terms.
                                The following recorded debts have known balances, but lack projection terms:
                            </p>
                            <div className="divide-y divide-border border border-border rounded-xl overflow-hidden mt-3">
                                {debtsLackingInputs.map(d => (
                                    <div key={d.id} className="p-4 flex justify-between items-center bg-card">
                                        <div>
                                            <span className="font-bold text-foreground">{d.name}</span>
                                            <span className="ml-2 text-xs uppercase px-2 py-0.5 rounded bg-muted text-muted-foreground font-semibold">
                                                {d.type.replace('_', ' ')}
                                            </span>
                                        </div>
                                        <div className="text-right">
                                            <div className="font-mono font-black text-rose-500 text-base">
                                                {formatCurrency(d.balance, d.currency || debtCurrency)}
                                            </div>
                                            <span className="text-[11px] text-amber-600 font-medium">
                                                Interest rate and repayment terms not configured
                                            </span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                            <p className="text-xs text-muted-foreground pt-2">
                                To prevent fabricated financial projections, payoff horizons and interest savings are not invented without these inputs.{' '}
                                <a href="/accounting?view=accounts" className="text-primary font-bold hover:underline">
                                    Manage accounts in Accounting
                                </a>.
                            </p>
                        </div>
                    </div>
                </ContentCard>
            </div>
        );
    }

    return (
        <div className="space-y-8">
            {/* Controls */}
            <ContentCard className="shadow-sm">
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
                        <div className="flex items-center justify-between mb-3">
                            <label className="block text-sm font-bold text-muted-foreground">Extra Monthly Payment</label>
                            <span className="text-xs font-bold px-2 py-0.5 rounded bg-muted text-foreground border border-border font-mono">
                                {debtCurrency}
                            </span>
                        </div>
                        <div className="relative">
                            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground font-bold text-sm">
                                {formatCurrency(0, debtCurrency).replace(/\d/g, '').replace(/[\.,\s]/g, '')}
                            </span>
                            <input
                                type="number"
                                value={Math.round(extraPayment)} // Display rounded in native debt currency
                                onChange={(e) => {
                                    handleExtraPaymentChange(Number(e.target.value));
                                }}
                                className="w-full pl-14 pr-16 py-3 bg-muted border border-border rounded-xl font-bold text-foreground focus:ring-2 focus:ring-blue-500 outline-none"
                            />
                            <span className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground font-bold text-xs font-mono">
                                {debtCurrency}
                            </span>
                        </div>
                        {strategy === 'minimum' && (
                            <p className="text-xs text-amber-500 mt-2 font-medium">
                                Extra payment is ignored in "Minimum" strategy.
                            </p>
                        )}
                    </div>
                </div>

                {/* Currency Mismatch Review Banner (Item 5) */}
                {isCurrencyMismatch && (
                    <div role="alert" className="mt-6 p-4 bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-700 rounded-xl text-amber-900 dark:text-amber-200">
                        <div className="flex items-start gap-3">
                            <AlertCircle className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                            <div className="text-sm">
                                <p className="font-bold">Currency Mismatch: Plan Review Required</p>
                                <p className="mt-1 text-xs text-amber-800 dark:text-amber-300 leading-relaxed">
                                    Your saved plan was configured in <span className="font-mono font-bold">{savedSettings.currency}</span> ({formatCurrency(savedSettings.extraMonthlyPayment, savedSettings.currency)}/mo), but your active debts are in <span className="font-mono font-bold">{debtCurrency}</span>.
                                    To prevent silently converting or reinterpreting amounts across currencies, review and confirm your extra payment in <span className="font-mono font-bold">{debtCurrency}</span> before saving to your budget.
                                </p>
                            </div>
                        </div>
                    </div>
                )}

                {/* Plan Persistence & Scenario Action Bar (Handover Section 15 & 16) */}
                <div className="mt-6 pt-4 border-t border-border flex flex-wrap items-center justify-between gap-4">
                    <div className="flex flex-wrap items-center gap-2">
                        {isCurrencyMismatch ? (
                            <span className="inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                                <AlertCircle size={14} className="text-amber-500" />
                                Saved in {savedSettings.currency} — review required before saving
                            </span>
                        ) : hasUnsavedChanges ? (
                            <span className="inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                                <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse"></span>
                                Scenario preview (not saved to budget)
                            </span>
                        ) : (
                            <span className="inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                                <ShieldCheck size={14} />
                                Active plan saved ({savedSettings.currency})
                            </span>
                        )}
                        {saveSuccessMessage && (
                            <span className="text-xs font-medium text-emerald-600 dark:text-emerald-400 animate-in fade-in duration-200">
                                {saveSuccessMessage}
                            </span>
                        )}
                        {saveErrorMessage && (
                            <span className="text-xs font-medium text-destructive animate-in fade-in duration-200">
                                {saveErrorMessage}
                            </span>
                        )}
                    </div>

                    <div className="flex items-center gap-2">
                        {hasUnsavedChanges && (
                            <button
                                type="button"
                                onClick={handleResetPlan}
                                disabled={isSaving}
                                className="px-3 py-2 text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors cursor-pointer rounded-lg hover:bg-muted"
                            >
                                Reset
                            </button>
                        )}
                        <button
                            type="button"
                            onClick={handleSavePlan}
                            disabled={isSaving || !hasUnsavedChanges}
                            className={`px-4 py-2 text-xs font-bold rounded-xl transition-all flex items-center gap-2 ${
                                hasUnsavedChanges
                                    ? 'bg-primary text-primary-foreground hover:opacity-90 shadow-sm cursor-pointer active:scale-95'
                                    : 'bg-muted text-muted-foreground cursor-not-allowed opacity-60'
                            }`}
                        >
                            {isSaving ? 'Saving...' : 'Save Plan to Budget'}
                        </button>
                    </div>
                </div>
            </ContentCard>

            {/* Multi-Currency Notice */}
            {result?.isMultiCurrencyUnsupported && (
                <ContentCard className="bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800 text-amber-900 dark:text-amber-200 p-6">
                    <div className="flex items-start gap-4">
                        <AlertCircle className="w-8 h-8 text-amber-600 shrink-0 mt-0.5" />
                        <div>
                            <h3 className="font-bold text-lg">Multi-Currency Debts</h3>
                            <p className="text-sm text-amber-800 dark:text-amber-300 mt-1">
                                Debt payoff projection requires debts to be in a single currency. Mixed currencies found: {result.unsupportedCurrencies?.join(', ')}.
                            </p>
                        </div>
                    </div>
                </ContentCard>
            )}

            {/* Insufficient Payment Notice */}
            {result?.isInsufficientPayment && (
                <ContentCard className="bg-rose-50 dark:bg-rose-950/30 border-rose-200 dark:border-rose-800 text-rose-900 dark:text-rose-200 p-6">
                    <div className="flex items-start gap-4">
                        <AlertCircle className="w-8 h-8 text-rose-600 shrink-0 mt-0.5" />
                        <div>
                            <h3 className="font-bold text-lg">Insufficient Monthly Payments</h3>
                            <p className="text-sm text-rose-800 dark:text-rose-300 mt-1">
                                {result.insufficientPaymentReason || 'Monthly payments do not cover accrued interest charges. Loans will not amortise.'}
                            </p>
                            {result.insufficientDebts && result.insufficientDebts.length > 0 && (
                                <ul className="mt-3 space-y-1 text-xs text-rose-700 dark:text-rose-400">
                                    {result.insufficientDebts.map(d => (
                                        <li key={d.id}>
                                            • <span className="font-semibold">{d.name}</span>: Minimum payment ({formatCurrency(d.minimumPayment, debtCurrency)}) does not cover monthly interest ({formatCurrency(d.monthlyInterest, debtCurrency)}).
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </div>
                    </div>
                </ContentCard>
            )}

            {/* Horizon Exceeded Notice */}
            {result?.isHorizonExceeded && (
                <ContentCard className="bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800 text-amber-900 dark:text-amber-200 p-6">
                    <div className="flex items-start gap-4">
                        <AlertCircle className="w-8 h-8 text-amber-600 shrink-0 mt-0.5" />
                        <div>
                            <h3 className="font-bold text-lg">Payoff Exceeds 50-Year Horizon</h3>
                            <p className="text-sm text-amber-800 dark:text-amber-300 mt-1">
                                {result.horizonExceededReason || 'Debt payoff exceeds the 50-year projection horizon with the current payment schedule.'}
                            </p>
                            <p className="text-xs text-amber-700 dark:text-amber-400 mt-2">
                                While monthly payments exceed accrued interest charges, the current rate of amortization would take longer than 50 years to extinguish the principal balance. Consider increasing your monthly payment to accelerate payoff.
                            </p>
                        </div>
                    </div>
                </ContentCard>
            )}

            {/* Results */}
            {result && !result.isMultiCurrencyUnsupported && !result.isInsufficientPayment && !result.isHorizonExceeded && (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Main Freedom Card */}
                    <div className="lg:col-span-2 bg-gradient-to-br from-blue-600 to-indigo-700 rounded-2xl p-8 text-white shadow-lg relative overflow-hidden">
                        <div className="absolute top-0 right-0 p-32 bg-white opacity-5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none"></div>

                        <div className="relative z-10">
                            <div className="flex items-center gap-3 mb-2 opacity-90">
                                <Calendar className="w-5 h-5" />
                                <span className="text-sm font-bold tracking-wider uppercase">
                                    {unrecordedLiabilities.length > 0 ? "Estimated Payoff for Included Debts" : "Your Freedom Date"}
                                </span>
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
                                                // This is the "interest cost" of the current month in debtCurrency
                                                const monthlyBurn = calcLiabilities.reduce((sum, l) => sum + (l.balance * (l.interest_rate / 100 / 12)), 0);
                                                return formatCurrency(monthlyBurn, debtCurrency);
                                            })()
                                        }</p>
                                        <span className="text-xs text-blue-200 font-medium">lost to interest</span>
                                    </div>
                                </div>
                            </div>

                            <div className="flex flex-wrap gap-8">
                                <div>
                                    <p className="text-blue-100 text-sm font-medium mb-1">Time to Payoff</p>
                                    <p className="text-2xl font-bold privacy-value">{result.monthsToPayoff} {result.monthsToPayoff === 1 ? 'month' : 'months'}</p>
                                </div>
                                <div>
                                    <p className="text-blue-100 text-sm font-medium mb-1">Total Interest</p>
                                    <p className="text-2xl font-bold privacy-value">{formatCurrency(result.totalInterestPaid, debtCurrency)}</p>
                                </div>
                                <div>
                                    <p className="text-blue-100 text-sm font-medium mb-1">Total Paid</p>
                                    <p className="text-2xl font-bold privacy-value">{formatCurrency(result.totalPayments, debtCurrency)}</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Right: Chart */}
                    <div className="lg:col-span-1">
                        <PayoffScheduleChart schedule={result.schedule} currency={debtCurrency} />

                        {/* Comparison Card - Moved inside right column for better layout */}
                        {savings && (
                            <ContentCard className="flex flex-col justify-center mt-6 shadow-sm">
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
                                            <p className="text-2xl font-black text-emerald-600 privacy-value">{formatCurrency(savings.interest, debtCurrency)}</p>
                                        </div>
                                    </div>

                                    <div className="pt-4 border-t border-border">
                                        <p className="text-xs text-muted-foreground leading-relaxed italic">
                                            "Compound interest is the eighth wonder of the world. He who understands it, earns it... he who doesn't... pays it."
                                        </p>
                                    </div>
                                </div>
                            </ContentCard>
                        )}
                    </div>
                </div>
            )}

            {/* Payoff Schedule Preview */}
            {result && !result.isMultiCurrencyUnsupported && !result.isInsufficientPayment && !result.isHorizonExceeded && (
                <ContentCard className="overflow-hidden p-0">
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
                                        <td className="px-6 py-4 privacy-value">{formatCurrency(row.payment, debtCurrency)}</td>
                                        <td className="px-6 py-4 text-emerald-600 privacy-value">{formatCurrency(row.principal, debtCurrency)}</td>
                                        <td className="px-6 py-4 text-rose-500 privacy-value">{formatCurrency(row.interest, debtCurrency)}</td>
                                        <td className="px-6 py-4 font-bold text-foreground privacy-value">{formatCurrency(row.balance, debtCurrency)}</td>
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
                </ContentCard>
            )}
        </div>
    );
}
