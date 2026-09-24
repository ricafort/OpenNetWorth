'use client';

/**
 * Liabilities Management Page
 * 
 * Why this file exists:
 * Fulfills Batch B Delivery 1 (Consistent Liabilities):
 * Connects the Liabilities view directly to authoritative account and balance services.
 * 
 * Tricky logic:
 * - Shows modern debt accounts from m1_accounts.
 * - NEVER claims "No liabilities" or "Debt free" when modern debts exist or when balances are unknown.
 * - Preserves native currency and positive liability sign conventions (e.g. AUD 300.00 outstanding).
 * - Distinguishes an outstanding valuation balance from available credit or credit limit.
 * - Distinguishes known zero ($0.00) from an unknown balance.
 * - Shows balance date/basis.
 * - Discloses unlinked legacy debts separately to prevent double-counting when modern debts exist.
 * - Retains 100% backward compatibility for legacy-only users.
 */

import { useState, useMemo } from 'react';
import { Plus, Trash2, Edit2, AlertTriangle, ExternalLink, RefreshCw, Info } from 'lucide-react';
import { useForm, Controller, Resolver } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { LiabilitySchema, LiabilityFormData } from '@/features/liabilities/data/schemas';
import { useLiabilitiesQuery } from '@/features/liabilities/hooks/useLiabilitiesQuery';
import { useSharedFinancialSummary } from '@/features/sync/hooks/useSharedFinancialSummary';
import { useNetWorth } from '@/features/dashboard/hooks/useNetWorth';
import { formatCurrency } from '@/lib/utils/currencyService';
import { formatMoney } from '@/lib/domain/accounting/types';
import { useTheme } from '@/contexts/ThemeContext';
import CurrencySelector from '@/components/ui/CurrencySelector';
import { Liability, LiabilityType } from '@/features/liabilities/types';
import { CurrencyCode } from '@/types';
import { PageHeader } from '@/components/common/PageHeader';
import { ContentCard } from '@/components/common/ContentCard';
import Link from 'next/link';

export const LiabilitiesPage = () => {
    const { baseCurrency } = useNetWorth();

    // Authoritative modern accounting summary
    const {
        summary,
        isLoading: isSummaryLoading,
        error: summaryError,
        refresh: refreshSummary
    } = useSharedFinancialSummary({ reportingCurrency: baseCurrency });

    // Legacy liabilities repository hook (for backward compatibility and mixed data)
    const {
        liabilities: legacyLiabilities,
        addLiability,
        updateLiability,
        deleteLiability,
        isLoading: isLegacyLoading
    } = useLiabilitiesQuery();

    const [isAddingLegacy, setIsAddingLegacy] = useState(false);
    const [editingLegacyId, setEditingLegacyId] = useState<string | null>(null);
    const [saveError, setSaveError] = useState<string | null>(null);
    const { isPrivacyBlur } = useTheme();

    // Modern liabilities from summary
    const modernLiabilities = useMemo(() => {
        if (!summary?.accounts) return [];
        return summary.accounts.filter(a => a.account_type === 'liability');
    }, [summary?.accounts]);

    const unrecordedLiabilities = useMemo(() => {
        if (!summary?.unrecorded_accounts) return [];
        return summary.unrecorded_accounts.filter(a => a.account_type === 'liability');
    }, [summary?.unrecorded_accounts]);

    const hasModernLiabilities = modernLiabilities.length > 0 || unrecordedLiabilities.length > 0;
    const isLoading = isSummaryLoading || isLegacyLoading;

    // Modern Total Liabilities calculation
    const modernTotalLiabilitiesByCurrency = summary?.total_liabilities_cents_by_currency || {};
    const liabilityCurrencies = Object.keys(modernTotalLiabilitiesByCurrency) as CurrencyCode[];

    // Authoritative modern liability account IDs
    const modernAccountIds = useMemo(() => {
        return new Set([
            ...modernLiabilities.map(a => a.account_id),
            ...unrecordedLiabilities.map(a => a.id)
        ]);
    }, [modernLiabilities, unrecordedLiabilities]);

    // Fulfills Requirement 4: Deduplicate legacy liabilities by established account_id relationships
    // Exclude linked duplicates from unlinked section, preserve distinct same-named debts
    const unlinkedLegacyLiabilities = useMemo(() => {
        return legacyLiabilities.filter(l => !l.account_id || !modernAccountIds.has(l.account_id));
    }, [legacyLiabilities, modernAccountIds]);

    // Fulfills Requirement 4: Remove mock FX. Group unlinked legacy totals strictly by native currency.
    const unlinkedTotalsByCurrency = useMemo(() => {
        return unlinkedLegacyLiabilities.reduce((acc, l) => {
            const curr = (l.currency || 'USD') as CurrencyCode;
            acc[curr] = (acc[curr] || 0) + (l.balance || 0);
            return acc;
        }, {} as Record<CurrencyCode, number>);
    }, [unlinkedLegacyLiabilities]);

    const {
        register,
        handleSubmit,
        control,
        reset,
        formState: { errors, isSubmitting }
    } = useForm<LiabilityFormData>({
        resolver: zodResolver(LiabilitySchema) as unknown as Resolver<LiabilityFormData>,
        defaultValues: {
            name: '',
            type: 'credit_card',
            balance: 0,
            currency: baseCurrency,
            interest_rate: 0,
            is_good_debt: false
        }
    });

    const blurClass = 'privacy-value';

    const onSubmitLegacy = async (data: LiabilityFormData) => {
        setSaveError(null);
        try {
            const isGoodDebt = ['mortgage', 'student_loan'].includes(data.type);
            await addLiability({
                ...data,
                id: crypto.randomUUID(),
                is_good_debt: isGoodDebt,
                last_updated: new Date().toISOString()
            });

            reset();
            setIsAddingLegacy(false);
        } catch (error: any) {
            console.error("Failed to add liability", error);
            setSaveError(error?.message || 'Failed to save liability. Please try again.');
        }
    };

    const handleUpdateLegacy = async (e: React.FormEvent<HTMLFormElement>, id: string) => {
        e.preventDefault();
        const formData = new FormData(e.currentTarget);
        const existing = legacyLiabilities.find(l => l.id === id);
        if (!existing) return;

        const type = formData.get('type') as LiabilityType;
        const updatedItem: Liability = {
            ...existing,
            name: formData.get('name') as string,
            type: type,
            balance: parseFloat(formData.get('balance') as string) || 0,
            currency: formData.get('currency') as CurrencyCode,
            interest_rate: parseFloat(formData.get('interest_rate') as string) || 0,
            is_good_debt: ['mortgage', 'student_loan'].includes(type),
            last_updated: new Date().toISOString()
        };

        await updateLiability(updatedItem);
        setEditingLegacyId(null);
    };

    const handleDeleteLegacy = async (id: string) => {
        if (confirm('Delete this liability?')) {
            await deleteLiability(id);
        }
    };

    return (
        <div className="space-y-8 pb-20 max-w-6xl mx-auto">
            <PageHeader
                title="Your Liabilities"
                description="Track your debts and leverage profile with authoritative accuracy."
                action={
                    <div className="flex items-center gap-3">
                        <Link
                            href="/accounting?view=accounts"
                            className="flex items-center gap-2 px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl font-medium transition-colors text-sm"
                        >
                            <Plus size={18} />
                            Add Account
                        </Link>
                        <button
                            onClick={() => refreshSummary()}
                            disabled={isLoading}
                            className="p-2 text-muted-foreground hover:text-foreground rounded-xl border border-border hover:bg-muted transition"
                            title="Refresh Authoritative Balances"
                        >
                            <RefreshCw size={18} className={isLoading ? 'animate-spin' : ''} />
                        </button>
                    </div>
                }
            />

            {/* Error Banner with Retry */}
            {summaryError && (
                <div role="alert" className="p-4 bg-destructive/15 border border-destructive/30 text-destructive rounded-xl flex items-center justify-between gap-3 text-sm font-medium">
                    <div className="flex items-center gap-2">
                        <AlertTriangle size={18} className="shrink-0" />
                        <span>Failed to load authoritative liability balances: {summaryError}</span>
                    </div>
                    <button
                        onClick={() => refreshSummary()}
                        className="px-3 py-1 bg-destructive text-destructive-foreground rounded-lg text-xs font-bold hover:opacity-90"
                    >
                        Retry
                    </button>
                </div>
            )}

            {/* 1. AUTHORITATIVE MODERN LIABILITIES */}
            {isLoading ? (
                <ContentCard className="text-center py-12 border border-border">
                    <div className="flex flex-col items-center justify-center gap-3">
                        <RefreshCw className="w-8 h-8 animate-spin text-rose-500" />
                        <p className="text-sm font-medium text-muted-foreground">Loading debts and liability accounts...</p>
                    </div>
                </ContentCard>
            ) : hasModernLiabilities ? (
                <div className="space-y-4">
                    {/* Coverage Disclosures */}
                    {unrecordedLiabilities.length > 0 && (
                        <div className="p-4 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 rounded-xl flex items-start gap-3 text-xs text-amber-800 dark:text-amber-200">
                            <Info size={16} className="shrink-0 mt-0.5" />
                            <div>
                                <span className="font-bold">Partial Balance Coverage: </span>
                                <span>
                                    {unrecordedLiabilities.length} debt account{unrecordedLiabilities.length > 1 ? 's do' : ' does'} not have an accepted balance observation. Total debt reflects recorded balances only; unknown balances are not assumed to be zero debt.
                                </span>
                            </div>
                        </div>
                    )}

                    <ContentCard className="overflow-hidden p-0 border border-border shadow-sm">
                        <div className="px-6 py-4 bg-muted/40 border-b border-border flex justify-between items-center">
                            <div>
                                <h3 className="font-bold text-foreground text-base">Recorded Liabilities & Debts</h3>
                                <p className="text-xs text-muted-foreground">
                                    Authoritative balances from your double-entry accounts and credit statements.
                                </p>
                            </div>
                            <span className="text-xs font-semibold px-2.5 py-1 bg-rose-500/10 text-rose-600 rounded-full">
                                {modernLiabilities.length + unrecordedLiabilities.length} Debt{modernLiabilities.length + unrecordedLiabilities.length !== 1 ? 's' : ''}
                            </span>
                        </div>

                        <table className="w-full text-left">
                            <thead className="bg-muted text-muted-foreground text-xs uppercase font-black tracking-wider">
                                <tr>
                                    <th className="px-6 py-4">Account Name</th>
                                    <th className="px-6 py-4">Type</th>
                                    <th className="px-6 py-4">Balance Basis & Date</th>
                                    <th className="px-6 py-4 text-right">Outstanding Balance</th>
                                    <th className="px-6 py-4 text-center">Details</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-border text-sm">
                                {modernLiabilities.map((account) => (
                                    <tr key={account.account_id} className="hover:bg-muted/50 border-b border-border transition-colors">
                                        <td className="px-6 py-5 font-black text-foreground">
                                            <div className="flex items-center gap-2">
                                                <span>{account.account_name}</span>
                                                {account.is_stale && (
                                                    <span className="text-[10px] bg-amber-100 text-amber-800 dark:bg-amber-900/60 dark:text-amber-200 px-2 py-0.5 rounded-full font-bold">
                                                        Stale (&gt;45d)
                                                    </span>
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className="capitalize px-2 py-1 bg-muted text-muted-foreground rounded-md text-xs font-bold">
                                                {account.account_sub_type ? account.account_sub_type.replace('_', ' ') : 'Liability'}
                                            </span>
                                        </td>
                                        <td className="px-6 py-5 text-xs text-muted-foreground">
                                            <div>
                                                <span className="font-semibold text-foreground">
                                                    {account.balance_kind ? account.balance_kind.replace('_', ' ') : 'Outstanding balance'}
                                                </span>
                                                <div className="text-[11px] text-muted-foreground font-mono">
                                                    As of {account.effective_date}
                                                </div>
                                            </div>
                                        </td>
                                        <td className={`px-6 py-5 text-right font-mono font-black ${blurClass}`}>
                                            {account.amount_cents === 0 ? (
                                                <span className="text-muted-foreground font-bold">
                                                    {formatMoney({ amount_cents: 0, currency: account.currency })}
                                                </span>
                                            ) : (
                                                <span className="text-rose-500 font-black">
                                                    {formatMoney({ amount_cents: account.amount_cents, currency: account.currency })}
                                                </span>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            <Link
                                                href={`/accounting?view=accounts&accountId=${account.account_id}`}
                                                className="inline-flex items-center gap-1 text-xs font-bold text-primary hover:underline"
                                                title={`View ${account.account_name} in accounting ledger`}
                                            >
                                                <span>View in Accounts</span>
                                                <ExternalLink size={12} />
                                            </Link>
                                        </td>
                                    </tr>
                                ))}

                                {/* Accounts with Unknown Balances */}
                                {unrecordedLiabilities.map((account) => (
                                    <tr key={account.id} className="hover:bg-muted/50 border-b border-border transition-colors bg-amber-50/20">
                                        <td className="px-6 py-5 font-bold text-foreground">
                                            {account.name}
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className="capitalize px-2 py-1 bg-muted text-muted-foreground rounded-md text-xs font-bold">
                                                {account.account_sub_type ? account.account_sub_type.replace('_', ' ') : 'Debt'}
                                            </span>
                                        </td>
                                        <td className="px-6 py-5 text-xs text-amber-700 dark:text-amber-400 italic">
                                            No balance observation recorded
                                        </td>
                                        <td className="px-6 py-5 text-right font-semibold text-amber-600 dark:text-amber-400 italic text-xs">
                                            Unknown (Balance needed)
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            <Link
                                                href={`/accounting?view=accounts&accountId=${account.id}`}
                                                className="inline-flex items-center gap-1 text-xs font-bold text-amber-700 dark:text-amber-400 hover:underline"
                                            >
                                                <span>Record in Accounts</span>
                                                <ExternalLink size={12} />
                                            </Link>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                            <tfoot className="bg-muted/30 font-black">
                                <tr>
                                    <td colSpan={3} className="px-6 py-6 text-muted-foreground uppercase text-xs tracking-widest">
                                        Total Outstanding Debt
                                        {unrecordedLiabilities.length > 0 && (
                                            <span className="ml-2 lowercase text-[10px] text-amber-600 font-semibold tracking-normal">
                                                ({unrecordedLiabilities.length} debt{unrecordedLiabilities.length > 1 ? 's' : ''} pending balance)
                                            </span>
                                        )}
                                    </td>
                                    <td className={`px-6 py-6 text-right text-xl text-rose-500 font-black ${blurClass}`}>
                                        {liabilityCurrencies.length === 0 ? (
                                            formatMoney({ amount_cents: 0, currency: baseCurrency })
                                        ) : liabilityCurrencies.length === 1 ? (
                                            formatMoney({ amount_cents: modernTotalLiabilitiesByCurrency[liabilityCurrencies[0]], currency: liabilityCurrencies[0] })
                                        ) : (
                                            <div className="space-y-1 text-right">
                                                {liabilityCurrencies.map(curr => (
                                                    <div key={curr} className="text-base">
                                                        {formatMoney({ amount_cents: modernTotalLiabilitiesByCurrency[curr], currency: curr })}
                                                    </div>
                                                ))}
                                                {summary?.converted_total_liabilities?.is_complete && (
                                                    <div className="text-xs text-muted-foreground font-semibold">
                                                        Total ({baseCurrency}): {formatMoney({ amount_cents: summary.converted_total_liabilities.amount_cents, currency: baseCurrency })}
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </td>
                                    <td></td>
                                </tr>
                            </tfoot>
                        </table>
                    </ContentCard>
                </div>
            ) : null}

            {/* 2. UNLINKED LEGACY LIABILITIES SECTION (When modern debts exist alongside unlinked legacy items) */}
            {hasModernLiabilities && unlinkedLegacyLiabilities.length > 0 && (
                <div className="space-y-4 pt-4 border-t border-border">
                    <div className="p-4 bg-muted/50 rounded-xl border border-border flex items-start gap-3 text-xs text-muted-foreground">
                        <Info size={16} className="shrink-0 mt-0.5 text-blue-500" />
                        <div>
                            <span className="font-bold text-foreground">Legacy Debts (Unlinked): </span>
                            <span>
                                You have {unlinkedLegacyLiabilities.length} debt{unlinkedLegacyLiabilities.length !== 1 ? 's' : ''} stored in your legacy local vault. Because their relationship to your modern accounts is not established, they are disclosed separately below to avoid double-counting.
                            </span>
                        </div>
                    </div>

                    <ContentCard className="overflow-hidden p-0 border border-border shadow-sm opacity-90">
                        <div className="px-6 py-3 bg-muted/20 border-b border-border flex justify-between items-center text-xs font-bold text-muted-foreground">
                            <span>Unlinked Legacy Items</span>
                            <span>
                                Total: {Object.keys(unlinkedTotalsByCurrency).length === 0
                                    ? formatCurrency(0, baseCurrency)
                                    : Object.entries(unlinkedTotalsByCurrency)
                                        .map(([curr, total]) => formatCurrency(total, curr))
                                        .join(' · ')}
                            </span>
                        </div>
                        <table className="w-full text-left text-sm">
                            <thead className="bg-muted/50 text-muted-foreground text-xs uppercase font-bold">
                                <tr>
                                    <th className="px-6 py-3">Legacy Name</th>
                                    <th className="px-6 py-3">Type</th>
                                    <th className="px-6 py-3 text-right">Balance</th>
                                    <th className="px-6 py-3 text-center">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-border">
                                {unlinkedLegacyLiabilities.map((liability) => (
                                    <tr key={liability.id} className="hover:bg-muted/30">
                                        <td className="px-6 py-4 font-bold text-foreground">{liability.name}</td>
                                        <td className="px-6 py-4 capitalize text-xs text-muted-foreground">{liability.type}</td>
                                        <td className={`px-6 py-4 text-right font-mono font-bold text-rose-500 ${blurClass}`}>
                                            {formatCurrency(liability.balance, liability.currency || 'USD')}
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            <button
                                                className="text-muted-foreground hover:text-destructive p-1 rounded"
                                                onClick={() => handleDeleteLegacy(liability.id)}
                                                title="Delete legacy item"
                                            >
                                                <Trash2 size={15} />
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </ContentCard>
                </div>
            )}

            {/* Error State when Modern Summary Failed and No Modern Debts Loaded */}
            {summaryError && !hasModernLiabilities && (
                <ContentCard className="text-center py-12 border-destructive/30 bg-destructive/10">
                    <AlertTriangle size={36} className="mx-auto text-destructive mb-3" />
                    <h3 className="text-lg font-bold text-foreground">Unable to Load Liabilities</h3>
                    <p className="text-sm text-muted-foreground mt-1 max-w-md mx-auto">
                        Unable to connect to the authoritative liability balance service: {summaryError}
                    </p>
                    <button
                        onClick={() => refreshSummary()}
                        className="mt-4 px-4 py-2 bg-destructive text-destructive-foreground rounded-xl text-xs font-bold hover:opacity-90 transition cursor-pointer"
                    >
                        Retry Loading
                    </button>
                </ContentCard>
            )}

            {/* 3. LEGACY-ONLY DISPLAY (When zero modern accounts exist and no error occurred) */}
            {!hasModernLiabilities && !isLoading && !summaryError && (
                <div>
                    {isAddingLegacy && (
                        <ContentCard className="border-2 mb-6">
                            <h3 className="text-lg font-semibold mb-4 text-rose-900">New Liability</h3>
                            {saveError && (
                                <div role="alert" className="p-3 mb-4 rounded-xl bg-destructive/15 border border-destructive/30 text-destructive text-sm font-medium flex items-center gap-2">
                                    <AlertTriangle size={16} className="shrink-0" />
                                    <span>{saveError}</span>
                                </div>
                            )}
                            <form className="grid grid-cols-1 md:grid-cols-5 gap-4" onSubmit={handleSubmit(onSubmitLegacy)}>
                                <div className="bg-white col-span-2 space-y-1">
                                    <label className="text-sm font-medium text-slate-700">Name</label>
                                    <input
                                        {...register('name')}
                                        placeholder="e.g. Credit Card"
                                        className={`w-full bg-card border rounded-lg p-2 outline-none focus:ring-2 focus:ring-primary/20 ${errors.name ? 'border-red-500' : 'border-border'}`}
                                    />
                                    {errors.name && <span className="text-xs text-red-500 font-bold">{errors.name.message}</span>}
                                </div>

                                <div className="space-y-1">
                                    <label className="text-sm font-medium text-muted-foreground">Type</label>
                                    <select {...register('type')} className="w-full bg-card text-card-foreground border border-border rounded-lg p-2 outline-none focus:ring-2 focus:ring-primary/20">
                                        <option value="mortgage">Mortgage</option>
                                        <option value="student_loan">Student Loan</option>
                                        <option value="auto_loan">Auto Loan</option>
                                        <option value="credit_card">Credit Card</option>
                                        <option value="other">Other</option>
                                    </select>
                                </div>

                                <div className="space-y-1">
                                    <label className="text-sm font-medium text-slate-700">Currency</label>
                                    <Controller
                                        name="currency"
                                        control={control}
                                        render={({ field }) => (
                                            <CurrencySelector
                                                value={field.value}
                                                onChange={field.onChange}
                                                className="w-full"
                                            />
                                        )}
                                    />
                                </div>

                                <div className="space-y-1">
                                    <label className="text-sm font-medium text-slate-700">Balance</label>
                                    <input
                                        {...register('balance', { valueAsNumber: true })}
                                        type="number"
                                        placeholder="0.00"
                                        step="0.01"
                                        className={`w-full bg-card border rounded-lg p-2 outline-none focus:ring-2 focus:ring-primary/20 ${errors.balance ? 'border-red-500' : 'border-border'}`}
                                    />
                                    {errors.balance && <span className="text-xs text-red-500 font-bold">{errors.balance.message}</span>}
                                </div>

                                <div className="space-y-1">
                                    <label className="text-sm font-medium text-slate-700">Interest Rate (%)</label>
                                    <input
                                        {...register('interest_rate', { valueAsNumber: true })}
                                        type="number"
                                        placeholder="0.0"
                                        step="0.01"
                                        className="w-full bg-card border border-border rounded-lg p-2 outline-none focus:ring-2 focus:ring-primary/20"
                                    />
                                </div>

                                <div className="col-span-5 flex justify-end gap-2">
                                    <button type="button" onClick={() => setIsAddingLegacy(false)} className="px-4 py-2 text-slate-500 hover:text-slate-700 font-medium">Cancel</button>
                                    <button
                                        type="submit"
                                        disabled={isSubmitting}
                                        className="bg-slate-900 text-white rounded-lg px-6 py-2 font-medium hover:bg-slate-800 transition-colors disabled:opacity-50"
                                    >
                                        {isSubmitting ? 'Saving...' : 'Save Liability'}
                                    </button>
                                </div>
                            </form>
                        </ContentCard>
                    )}

                    <ContentCard className="overflow-hidden p-0 border border-border shadow-sm">
                        <table className="w-full text-left">
                            <thead className="bg-muted text-muted-foreground text-xs uppercase font-black tracking-wider">
                                <tr>
                                    <th className="px-6 py-4">Name</th>
                                    <th className="px-6 py-4">Type</th>
                                    <th className="px-6 py-4 text-right">Balance</th>
                                    <th className="px-6 py-4 text-right">Rate</th>
                                    <th className="px-6 py-4 text-center">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-border text-sm">
                                {legacyLiabilities.length === 0 ? (
                                    <tr>
                                        <td colSpan={5} className="px-6 py-12 text-center text-muted-foreground italic font-medium">
                                            No liabilities recorded.
                                        </td>
                                    </tr>
                                ) : (
                                    legacyLiabilities.map((liability: Liability) => (
                                        <tr key={liability.id} className="hover:bg-muted/50 border-b border-border transition-colors">
                                            <td className="px-6 py-5 font-black text-foreground">{liability.name}</td>
                                            <td className="px-6 py-4">
                                                <span className="capitalize px-2 py-1 bg-slate-100 text-slate-600 rounded-md text-xs font-medium">
                                                    {liability.type.replace('_', ' ')}
                                                </span>
                                            </td>
                                            <td className={`px-6 py-5 text-right font-mono font-black text-rose-500 ${blurClass}`}>
                                                {formatCurrency(liability.balance, liability.currency || baseCurrency || 'USD')}
                                            </td>
                                            <td className="px-6 py-5 text-right font-medium text-slate-500">
                                                {liability.interest_rate > 0 ? `${liability.interest_rate}%` : '-'}
                                            </td>
                                            <td className="px-6 py-4 text-center">
                                                <button
                                                    className="text-slate-400 hover:text-rose-500 transition-colors p-1 rounded hover:bg-muted cursor-pointer"
                                                    onClick={() => handleDeleteLegacy(liability.id)}
                                                    title={`Delete ${liability.name}`}
                                                >
                                                    <Trash2 size={16} />
                                                </button>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                            {legacyLiabilities.length > 0 && (
                                <tfoot className="bg-muted/30 font-black">
                                    <tr>
                                        <td colSpan={2} className="px-6 py-6 text-muted-foreground uppercase text-xs tracking-widest">Total Liabilities</td>
                                        <td className={`px-6 py-6 text-right text-xl text-rose-500 font-black ${blurClass}`}>
                                            {Object.entries(
                                                legacyLiabilities.reduce((acc, l) => {
                                                    const curr = (l.currency || baseCurrency || 'USD') as CurrencyCode;
                                                    acc[curr] = (acc[curr] || 0) + (l.balance || 0);
                                                    return acc;
                                                }, {} as Record<CurrencyCode, number>)
                                            ).map(([curr, val]) => (
                                                <div key={curr}>{formatCurrency(val, curr as CurrencyCode)}</div>
                                            ))}
                                        </td>
                                        <td colSpan={2}></td>
                                    </tr>
                                </tfoot>
                            )}
                        </table>
                    </ContentCard>
                </div>
            )}
        </div>
    );
};
