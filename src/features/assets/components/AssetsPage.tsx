'use client';

/**
 * Assets Management Page
 * 
 * Why this file exists:
 * Fulfills Batch B Delivery 1 (Consistent Assets):
 * Connects the Assets view directly to the authoritative modern accounting engine
 * (m1_accounts, balance observations, and double-entry ledger).
 * 
 * Tricky logic:
 * - Distinguishes known zero ($0.00) from unknown balances (unrecorded valuation observation).
 * - Surfaces balance date, basis (ledger vs observation), and stale indicators.
 * - Preserves original account identity (account_id) with direct links to Accounting.
 * - Prevents blind addition of modern ledger records and unlinked legacy holdings.
 *   Discloses legacy coverage separately when both exist, without claiming a false combined total.
 * - Retains full backward compatibility for legacy-only vault users.
 * - Fully respects privacy blur mode and multi-currency native representation.
 */

import { useState, useMemo } from 'react';
import { Plus, Trash2, Edit2, AlertTriangle, ExternalLink, RefreshCw, ShieldCheck, Info } from 'lucide-react';
import { useForm, Controller, Resolver } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { AssetSchema, AssetFormData } from '@/features/assets/data/schemas';
import { useAssetsQuery } from '@/features/assets/hooks/useAssetsQuery';
import { useSharedFinancialSummary } from '@/features/sync/hooks/useSharedFinancialSummary';
import { useNetWorth } from '@/features/dashboard/hooks/useNetWorth';
import { formatCurrency } from '@/lib/utils/currencyService';
import { formatMoney } from '@/lib/domain/accounting/types';
import { useTheme } from '@/contexts/ThemeContext';
import CurrencySelector from '@/components/ui/CurrencySelector';
import { Asset, AssetType } from '@/features/assets/types';
import { CurrencyCode } from '@/types';
import { PageHeader } from '@/components/common/PageHeader';
import { ContentCard } from '@/components/common/ContentCard';
import Link from 'next/link';

export const AssetsPage = () => {
    // Authoritative modern accounting summary
    const { baseCurrency } = useNetWorth();
    const {
        summary,
        isLoading: isSummaryLoading,
        error: summaryError,
        refresh: refreshSummary
    } = useSharedFinancialSummary({ reportingCurrency: baseCurrency });

    // Legacy assets repository hook (for backward compatibility and mixed data)
    const {
        assets: legacyAssets,
        addAsset,
        updateAsset,
        deleteAsset,
        isLoading: isLegacyLoading
    } = useAssetsQuery();

    const [isAddingLegacy, setIsAddingLegacy] = useState(false);
    const [editingLegacyId, setEditingLegacyId] = useState<string | null>(null);
    const [saveError, setSaveError] = useState<string | null>(null);
    const { isPrivacyBlur } = useTheme();

    // Legacy form hook
    const {
        register,
        handleSubmit,
        control,
        reset,
        watch,
        formState: { errors, isSubmitting }
    } = useForm<AssetFormData>({
        resolver: zodResolver(AssetSchema) as unknown as Resolver<AssetFormData>,
        defaultValues: {
            name: '',
            type: 'cash',
            value: 0,
            currency: baseCurrency,
            interest_rate: undefined,
            is_liquid: true,
            investment_details: {
                shares: 0,
                costBasis: 0,
                dividendYield: 0,
                assetClass: 'stock'
            }
        }
    });

    const watchedType = watch('type');
    const isInvestmentType = watchedType === 'investment' || watchedType === 'crypto';
    const blurClass = 'privacy-value';

    // 1. Authoritative Modern Assets
    const modernAssetAccounts = useMemo(() => {
        if (!summary?.accounts) return [];
        return summary.accounts.filter(a => a.account_type === 'asset');
    }, [summary?.accounts]);

    const unrecordedAssetAccounts = useMemo(() => {
        if (!summary?.unrecorded_accounts) return [];
        return summary.unrecorded_accounts.filter(a => a.account_type === 'asset' || !a.account_type);
    }, [summary?.unrecorded_accounts]);

    const hasModernAssets = modernAssetAccounts.length > 0 || unrecordedAssetAccounts.length > 0;
    const isLoading = isSummaryLoading || isLegacyLoading;

    // Modern Total Assets calculation
    const modernTotalAssetsByCurrency = summary?.total_assets_cents_by_currency || {};
    const assetCurrencies = Object.keys(modernTotalAssetsByCurrency) as CurrencyCode[];

    // Authoritative modern asset account IDs
    const authoritativeAccountIds = useMemo(() => {
        return new Set([
            ...modernAssetAccounts.map(a => a.account_id),
            ...unrecordedAssetAccounts.map(a => a.id)
        ]);
    }, [modernAssetAccounts, unrecordedAssetAccounts]);

    // Fulfills Requirement 4: Deduplicate legacy assets strictly by established account_id relationships
    // Exclude linked duplicates from unlinked section, preserve distinct same-named assets
    const unlinkedLegacyAssets = useMemo(() => {
        return legacyAssets.filter(a => !a.account_id || !authoritativeAccountIds.has(a.account_id));
    }, [legacyAssets, authoritativeAccountIds]);

    // Fulfills Requirement 4: Remove mock FX. Group unlinked legacy totals strictly by native currency.
    const unlinkedTotalsByCurrency = useMemo(() => {
        return unlinkedLegacyAssets.reduce((acc, a) => {
            const curr = (a.currency || baseCurrency || 'USD') as CurrencyCode;
            acc[curr] = (acc[curr] || 0) + (a.value || 0);
            return acc;
        }, {} as Record<CurrencyCode, number>);
    }, [unlinkedLegacyAssets, baseCurrency]);

    // Legacy Form Handlers
    const onSubmitLegacy = async (data: AssetFormData) => {
        setSaveError(null);
        try {
            const isLiquid = data.type === 'cash' || data.type === 'investment';
            let investmentData;
            if (isInvestmentType && data.investment_details?.ticker) {
                investmentData = {
                    ...data.investment_details,
                    ticker: data.investment_details.ticker as string,
                    shares: data.investment_details.shares || 0,
                    costBasis: data.investment_details.costBasis || 0,
                    dividendYield: data.investment_details.dividendYield || 0,
                    assetClass: data.investment_details.assetClass || 'stock'
                };
            }

            await addAsset({
                ...data,
                id: crypto.randomUUID(),
                is_liquid: isLiquid,
                investment_details: investmentData,
                last_updated: new Date().toISOString()
            });

            reset();
            setIsAddingLegacy(false);
        } catch (error: any) {
            console.error("Failed to add asset", error);
            setSaveError(error?.message || 'Failed to save asset. Please try again.');
        }
    };

    const handleUpdateLegacy = async (e: React.FormEvent<HTMLFormElement>, id: string) => {
        e.preventDefault();
        const formData = new FormData(e.currentTarget);
        const existing = legacyAssets.find(a => a.id === id);
        if (!existing) return;

        const type = formData.get('type') as AssetType;
        const updatedAsset: Asset = {
            ...existing,
            name: formData.get('name') as string,
            type,
            value: parseFloat(formData.get('value') as string) || 0,
            currency: formData.get('currency') as CurrencyCode,
            interest_rate: parseFloat(formData.get('interest_rate') as string) || undefined,
            last_updated: new Date().toISOString()
        };

        if ((type === 'investment' || type === 'crypto') && existing.investment_details) {
            const ticker = formData.get('ticker') as string;
            if (ticker) {
                updatedAsset.investment_details = {
                    ...existing.investment_details,
                    ticker,
                    shares: parseFloat(formData.get('shares') as string) || existing.investment_details.shares,
                    costBasis: parseFloat(formData.get('cost_basis') as string) || existing.investment_details.costBasis,
                    dividendYield: parseFloat(formData.get('dividend_yield') as string) || existing.investment_details.dividendYield,
                    sector: formData.get('sector') as string || existing.investment_details.sector,
                };
            }
        }

        await updateAsset(updatedAsset);
        setEditingLegacyId(null);
    };

    const handleDeleteLegacy = async (id: string) => {
        if (confirm('Delete this legacy asset?')) {
            await deleteAsset(id);
        }
    };

    // Fulfills Requirement 2: Loading & Error States
    // A failed summary request must not fall through to "No assets recorded yet"
    if (summaryError && !hasModernAssets && unlinkedLegacyAssets.length === 0) {
        return (
            <div className="space-y-6 pb-20 max-w-6xl mx-auto">
                <PageHeader
                    title="Your Assets"
                    description="Manage everything you own with consistent, authoritative reporting."
                />
                <ContentCard className="text-center py-12 border border-destructive/30 bg-destructive/5">
                    <AlertTriangle className="w-10 h-10 text-destructive mx-auto mb-3" />
                    <h3 className="font-bold text-foreground text-lg mb-1">Unable to Load Assets</h3>
                    <p className="text-sm text-muted-foreground max-w-md mx-auto mb-4">
                        {summaryError}
                    </p>
                    <button
                        onClick={() => refreshSummary()}
                        className="px-4 py-2 bg-destructive text-destructive-foreground rounded-lg font-bold text-sm hover:opacity-90 transition"
                    >
                        Retry Loading
                    </button>
                </ContentCard>
            </div>
        );
    }

    return (
        <div className="space-y-8 pb-20 max-w-6xl mx-auto">
            <PageHeader
                title="Your Assets"
                description="Manage everything you own with consistent, authoritative reporting."
                action={
                    <div className="flex items-center gap-3">
                        <Link
                            href="/accounting?view=accounts"
                            className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-xl font-bold transition-all shadow-lg shadow-primary/10 active:scale-95 hover:opacity-90 text-sm"
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
                        <span>Failed to load authoritative account balances: {summaryError}</span>
                    </div>
                    <button
                        onClick={() => refreshSummary()}
                        className="px-3 py-1 bg-destructive text-destructive-foreground rounded-lg text-xs font-bold hover:opacity-90"
                    >
                        Retry
                    </button>
                </div>
            )}

            {/* 1. AUTHORITATIVE MODERN ASSETS SECTION */}
            {isLoading ? (
                <ContentCard className="text-center py-12 border border-border">
                    <div className="flex flex-col items-center justify-center gap-3">
                        <RefreshCw className="w-8 h-8 animate-spin text-primary" />
                        <p className="text-sm font-medium text-muted-foreground">Loading assets and authoritative balances...</p>
                    </div>
                </ContentCard>
            ) : hasModernAssets ? (
                <div className="space-y-4">
                    {/* Coverage Disclosures */}
                    {unrecordedAssetAccounts.length > 0 && (
                        <div className="p-4 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 rounded-xl flex items-start gap-3 text-xs text-amber-800 dark:text-amber-200">
                            <Info size={16} className="shrink-0 mt-0.5" />
                            <div>
                                <span className="font-bold">Partial Valuation Coverage: </span>
                                <span>
                                    {unrecordedAssetAccounts.length} asset account{unrecordedAssetAccounts.length > 1 ? 's do' : ' does'} not have an accepted valuation. Totals reflect recorded balances only; unknown balances are not assumed to be zero.
                                </span>
                            </div>
                        </div>
                    )}

                    <ContentCard className="overflow-hidden p-0 border border-border shadow-sm">
                        <div className="px-6 py-4 bg-muted/40 border-b border-border flex justify-between items-center">
                            <div>
                                <h3 className="font-bold text-foreground text-base">Recorded Asset Accounts</h3>
                                <p className="text-xs text-muted-foreground">
                                    Authoritative balances from your accounts and double-entry ledger.
                                </p>
                            </div>
                            <span className="text-xs font-semibold px-2.5 py-1 bg-primary/10 text-primary rounded-full">
                                {modernAssetAccounts.length + unrecordedAssetAccounts.length} Account{modernAssetAccounts.length + unrecordedAssetAccounts.length !== 1 ? 's' : ''}
                            </span>
                        </div>

                        <table className="w-full text-left">
                            <thead className="bg-muted text-muted-foreground text-xs uppercase font-black tracking-wider">
                                <tr>
                                    <th className="px-6 py-4">Account Name</th>
                                    <th className="px-6 py-4">Category</th>
                                    <th className="px-6 py-4">Balance Basis & Date</th>
                                    <th className="px-6 py-4 text-right">Balance</th>
                                    <th className="px-6 py-4 text-center">Details</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-border text-sm">
                                {modernAssetAccounts.map((account) => (
                                    <tr key={account.account_id} className="hover:bg-muted/50 border-b border-border transition-colors">
                                        <td className="px-6 py-5 font-black text-foreground">
                                            <div className="flex items-center gap-2 flex-wrap">
                                                <span>{account.account_name}</span>
                                                {account.entity_name && (
                                                    <span className="text-[10px] bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border border-slate-200 dark:border-slate-700 px-2 py-0.5 rounded-full font-bold">
                                                        {account.entity_name}
                                                    </span>
                                                )}
                                                {account.is_stale && (
                                                    <span className="text-[10px] bg-amber-100 text-amber-800 dark:bg-amber-900/60 dark:text-amber-200 px-2 py-0.5 rounded-full font-bold">
                                                        Stale (&gt;45d)
                                                    </span>
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className="capitalize px-2 py-1 bg-muted text-muted-foreground rounded-md text-xs font-bold">
                                                {account.account_sub_type ? account.account_sub_type.replace('_', ' ') : 'Asset'}
                                            </span>
                                        </td>
                                        <td className="px-6 py-5 text-xs text-muted-foreground">
                                            <div>
                                                <span className="font-semibold text-foreground">
                                                    {account.basis === 'ledger' ? 'Ledger balance' : 'Valuation observation'}
                                                </span>
                                                <div className="text-[11px] text-muted-foreground font-mono">
                                                    As of {account.effective_date}
                                                </div>
                                            </div>
                                        </td>
                                        <td className={`px-6 py-5 text-right font-mono font-black text-foreground ${blurClass}`}>
                                            {account.amount_cents === 0 ? (
                                                <span className="text-muted-foreground font-bold">
                                                    {formatMoney({ amount_cents: 0, currency: account.currency })}
                                                </span>
                                            ) : (
                                                <span className="text-emerald-600 dark:text-emerald-400">
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
                                {unrecordedAssetAccounts.map((account) => (
                                    <tr key={account.id} className="hover:bg-muted/50 border-b border-border transition-colors bg-amber-50/20">
                                        <td className="px-6 py-5 font-bold text-foreground">
                                            <div className="flex items-center gap-2 flex-wrap">
                                                <span>{account.name}</span>
                                                {account.entity_name && (
                                                    <span className="text-[10px] bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border border-slate-200 dark:border-slate-700 px-2 py-0.5 rounded-full font-bold">
                                                        {account.entity_name}
                                                    </span>
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className="capitalize px-2 py-1 bg-muted text-muted-foreground rounded-md text-xs font-bold">
                                                {account.account_sub_type ? account.account_sub_type.replace('_', ' ') : 'Asset'}
                                            </span>
                                        </td>
                                        <td className="px-6 py-5 text-xs text-amber-700 dark:text-amber-400 italic">
                                            No valuation observation recorded
                                        </td>
                                        <td className="px-6 py-5 text-right font-semibold text-amber-600 dark:text-amber-400 italic text-xs">
                                            Unknown (Valuation needed)
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
                                        Total Known Asset Value
                                        {unrecordedAssetAccounts.length > 0 && (
                                            <span className="ml-2 lowercase text-[10px] text-amber-600 font-semibold tracking-normal">
                                                ({unrecordedAssetAccounts.length} account{unrecordedAssetAccounts.length > 1 ? 's' : ''} pending valuation)
                                            </span>
                                        )}
                                    </td>
                                    <td className={`px-6 py-6 text-right text-xl text-emerald-600 dark:text-emerald-400 font-black ${blurClass}`}>
                                        {assetCurrencies.length === 0 ? (
                                            formatMoney({ amount_cents: 0, currency: baseCurrency })
                                        ) : assetCurrencies.length === 1 ? (
                                            formatMoney({ amount_cents: modernTotalAssetsByCurrency[assetCurrencies[0]], currency: assetCurrencies[0] })
                                        ) : (
                                            <div className="space-y-1 text-right">
                                                {assetCurrencies.map(curr => (
                                                    <div key={curr} className="text-base">
                                                        {formatMoney({ amount_cents: modernTotalAssetsByCurrency[curr], currency: curr })}
                                                    </div>
                                                ))}
                                                {summary?.converted_total_assets?.is_complete && (
                                                    <div className="text-xs text-muted-foreground font-semibold">
                                                        Total ({baseCurrency}): {formatMoney(summary.converted_total_assets)}
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

            {/* 2. UNLINKED LEGACY ASSETS SECTION (When modern accounts exist alongside legacy items) */}
            {hasModernAssets && unlinkedLegacyAssets.length > 0 && (
                <div className="space-y-4 pt-4 border-t border-border">
                    <div className="p-4 bg-muted/50 rounded-xl border border-border flex items-start gap-3 text-xs text-muted-foreground">
                        <Info size={16} className="shrink-0 mt-0.5 text-blue-500" />
                        <div>
                            <span className="font-bold text-foreground">Legacy Vault Holdings (Unlinked): </span>
                            <span>
                                You have {unlinkedLegacyAssets.length} asset{unlinkedLegacyAssets.length !== 1 ? 's' : ''} stored in your legacy local vault. Because their relationship to your modern accounts is not established, they are disclosed separately below to avoid double-counting.
                            </span>
                        </div>
                    </div>

                    <ContentCard className="overflow-hidden p-0 border border-border shadow-sm opacity-90">
                        <div className="px-6 py-3 bg-muted/20 border-b border-border flex justify-between items-center text-xs font-bold text-muted-foreground">
                            <span>Unlinked Legacy Items</span>
                            <div className="flex items-center gap-3">
                                {Object.entries(unlinkedTotalsByCurrency).map(([curr, val]) => (
                                    <span key={curr}>
                                        Total ({curr}): {formatCurrency(val, curr as CurrencyCode)}
                                    </span>
                                ))}
                            </div>
                        </div>
                        <table className="w-full text-left text-sm">
                            <thead className="bg-muted/50 text-muted-foreground text-xs uppercase font-bold">
                                <tr>
                                    <th className="px-6 py-3">Legacy Name</th>
                                    <th className="px-6 py-3">Type</th>
                                    <th className="px-6 py-3 text-right">Value</th>
                                    <th className="px-6 py-3 text-center">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-border">
                                {unlinkedLegacyAssets.map((asset) => (
                                    <tr key={asset.id} className="hover:bg-muted/30">
                                        <td className="px-6 py-4 font-bold text-foreground">{asset.name}</td>
                                        <td className="px-6 py-4 capitalize text-xs text-muted-foreground">{asset.type}</td>
                                        <td className={`px-6 py-4 text-right font-mono font-bold ${blurClass}`}>
                                            {formatCurrency(asset.value, asset.currency || baseCurrency || 'USD')}
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            <button
                                                className="text-muted-foreground hover:text-destructive p-1 rounded"
                                                onClick={() => handleDeleteLegacy(asset.id)}
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

            {/* 3. LEGACY-ONLY DISPLAY (When zero modern accounts exist) */}
            {!hasModernAssets && !isLoading && (
                <div>
                    {isAddingLegacy && (
                        <ContentCard className="shadow-xl mb-6">
                            <h3 className="text-lg font-semibold mb-4">New Asset</h3>
                            {saveError && (
                                <div role="alert" className="p-3 mb-4 rounded-xl bg-destructive/15 border border-destructive/30 text-destructive text-sm font-medium flex items-center gap-2">
                                    <AlertTriangle size={16} className="shrink-0" />
                                    <span>{saveError}</span>
                                </div>
                            )}
                            <form className="grid grid-cols-1 md:grid-cols-4 gap-4" onSubmit={handleSubmit(onSubmitLegacy)}>
                                <div className="md:col-span-4 grid grid-cols-1 md:grid-cols-5 gap-4">
                                    <div className="space-y-1 col-span-2">
                                        <label htmlFor="asset-name-input" className="text-sm font-medium text-slate-700">Name</label>
                                        <input
                                            id="asset-name-input"
                                            {...register('name')}
                                            placeholder="e.g. Savings Account"
                                            className={`w-full bg-card border rounded-lg p-2 outline-none focus:ring-2 focus:ring-primary/20 ${errors.name ? 'border-red-500' : 'border-border'}`}
                                        />
                                        {errors.name && <span className="text-xs text-red-500 font-bold">{errors.name.message}</span>}
                                    </div>

                                    <div className="space-y-1">
                                        <label htmlFor="asset-type-select" className="text-sm font-bold text-muted-foreground">Type</label>
                                        <select id="asset-type-select" {...register('type')} className="w-full bg-background border border-border rounded-lg p-2 outline-none focus:ring-2 focus:ring-primary/20">
                                            <option value="cash">Cash</option>
                                            <option value="investment">Stock / ETF</option>
                                            <option value="crypto">Crypto</option>
                                            <option value="real_estate">Real Estate</option>
                                            <option value="retirement">Retirement</option>
                                            <option value="other">Other</option>
                                        </select>
                                    </div>

                                    <div className="space-y-1">
                                        <label htmlFor="asset-currency-select" className="text-sm font-bold text-muted-foreground">Currency</label>
                                        <Controller
                                            name="currency"
                                            control={control}
                                            render={({ field }) => (
                                                <CurrencySelector
                                                    id="asset-currency-select"
                                                    value={field.value}
                                                    onChange={field.onChange}
                                                    className="w-full"
                                                />
                                            )}
                                        />
                                    </div>

                                    <div className="space-y-1">
                                        <label htmlFor="asset-value-input" className="text-sm font-bold text-muted-foreground">Value</label>
                                        <input
                                            id="asset-value-input"
                                            {...register('value', { valueAsNumber: true })}
                                            type="number"
                                            step="0.01"
                                            placeholder="0.00"
                                            className={`w-full bg-background border rounded-lg p-2 outline-none focus:ring-2 focus:ring-primary/20 ${errors.value ? 'border-red-500' : 'border-border'}`}
                                        />
                                    </div>

                                    <div className="space-y-1">
                                        <label htmlFor="asset-yield-input" className="text-sm font-bold text-muted-foreground">Yield %</label>
                                        <input
                                            id="asset-yield-input"
                                            {...register('interest_rate', { valueAsNumber: true })}
                                            type="number"
                                            step="0.01"
                                            placeholder="e.g 4.5"
                                            className="w-full bg-background border border-border rounded-lg p-2 outline-none focus:ring-2 focus:ring-primary/20"
                                        />
                                    </div>
                                </div>

                                <div className="md:col-span-4 flex justify-end gap-2">
                                    <button type="button" onClick={() => setIsAddingLegacy(false)} className="px-4 py-2 text-muted-foreground hover:text-foreground font-medium">Cancel</button>
                                    <button
                                        type="submit"
                                        disabled={isSubmitting}
                                        className="bg-primary text-primary-foreground rounded-lg px-6 py-2 font-bold hover:opacity-90 transition-all shadow-lg shadow-primary/10 disabled:opacity-50"
                                    >
                                        {isSubmitting ? 'Saving...' : 'Save Asset'}
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
                                    <th className="px-6 py-4 text-right">Rate</th>
                                    <th className="px-6 py-4 text-right">Value</th>
                                    <th className="px-6 py-4 text-center">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-border text-sm">
                                {legacyAssets.length === 0 ? (
                                    <tr>
                                        <td colSpan={5} className="px-6 py-12 text-center text-muted-foreground italic font-medium">
                                            No assets recorded yet. Add an account in Accounts or add an asset here.
                                        </td>
                                    </tr>
                                ) : (
                                    legacyAssets.map((asset) => (
                                        <tr key={asset.id} className="hover:bg-muted/50 border-b border-border transition-colors">
                                            <td className="px-6 py-5 font-black text-foreground">{asset.name}</td>
                                            <td className="px-6 py-4">
                                                <span className="capitalize px-2 py-1 bg-muted text-muted-foreground rounded-md text-xs font-bold">
                                                    {asset.type.replace('_', ' ')}
                                                </span>
                                            </td>
                                            <td className="px-6 py-5 text-right font-mono text-sm text-muted-foreground">
                                                {asset.interest_rate ? `${asset.interest_rate}%` : '-'}
                                            </td>
                                            <td className={`px-6 py-5 text-right font-mono font-black text-foreground ${blurClass}`}>
                                                {formatCurrency(asset.value, asset.currency || baseCurrency || 'USD')}
                                            </td>
                                            <td className="px-6 py-4 text-center">
                                                <button
                                                    className="text-muted-foreground hover:text-destructive p-1 rounded"
                                                    onClick={() => handleDeleteLegacy(asset.id)}
                                                    title={`Delete ${asset.name}`}
                                                >
                                                    <Trash2 size={16} />
                                                </button>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                            {legacyAssets.length > 0 && (
                                <tfoot className="bg-muted/30 font-black">
                                    <tr>
                                        <td colSpan={2} className="px-6 py-6 text-muted-foreground uppercase text-xs tracking-widest">Total Portfolio Value</td>
                                        <td className={`px-6 py-6 text-right text-xl text-emerald-600 font-black ${blurClass}`}>
                                            {Object.entries(
                                                legacyAssets.reduce((acc, a) => {
                                                    const curr = (a.currency || baseCurrency || 'USD') as CurrencyCode;
                                                    acc[curr] = (acc[curr] || 0) + (a.value || 0);
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
