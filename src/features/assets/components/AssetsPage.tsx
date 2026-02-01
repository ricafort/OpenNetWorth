'use client';

import { useState } from 'react';
import { Plus, Trash2, Edit2 } from 'lucide-react';
import { useForm, Controller, Resolver } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { AssetSchema, AssetFormData } from '@/features/assets/data/schemas';
import { useAssetsQuery } from '@/features/assets/hooks/useAssetsQuery';
import { useNetWorth } from '@/features/dashboard/hooks/useNetWorth';
import { formatCurrency, convertAmount } from '@/lib/utils/currencyService';
import { useTheme } from '@/contexts/ThemeContext';
import CurrencySelector from '@/components/ui/CurrencySelector';
import { Asset, AssetType } from '@/features/assets/types';
import { CurrencyCode } from '@/types';
import { PageHeader } from '@/components/common/PageHeader';
import { ContentCard } from '@/components/common/ContentCard';

export const AssetsPage = () => {
    // ... existing hooks ...
    const { assets, addAsset, updateAsset, deleteAsset, isLoading } = useAssetsQuery();

    // ... state ...
    const [isAdding, setIsAdding] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const { isPrivacyBlur } = useTheme();
    const { baseCurrency } = useNetWorth();

    // ... form ...
    const {
        register,
        handleSubmit,
        control,
        reset,
        watch,
        formState: { errors, isSubmitting }
    } = useForm<AssetFormData>({
        // Use explicit Resolver cast to satisfy strict type checking between Zod/RHF versions
        resolver: zodResolver(AssetSchema) as unknown as Resolver<AssetFormData>,
        defaultValues: {
            name: '',
            /* ... defaults ... */
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

    // ... handlers ...
    const onSubmit = async (data: AssetFormData) => {
        // ... submit logic ...
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
            setIsAdding(false);
        } catch (error) {
            console.error("Failed to add asset", error);
        }
    };

    const handleUpdate = async (e: React.FormEvent<HTMLFormElement>, id: string) => {
        // ... update logic ...
        e.preventDefault();
        const formData = new FormData(e.currentTarget);
        const existing = assets.find(a => a.id === id);
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
        setEditingId(null);
    };

    const handleDelete = async (id: string) => {
        if (confirm('Delete this asset?')) {
            await deleteAsset(id);
        }
    };

    // Calculate Total in Base Currency
    const totalValue = assets.reduce((sum, asset) => {
        return sum + convertAmount(asset.value, asset.currency || 'USD', baseCurrency);
    }, 0);

    return (
        <div className="space-y-8 pb-20">
            <PageHeader
                title="Your Assets"
                description="Manage everything you own in one place."
                action={
                    <button
                        onClick={() => {
                            setIsAdding(true);
                            reset({ currency: baseCurrency });
                        }}
                        className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-xl font-bold transition-all shadow-lg shadow-primary/10 active:scale-95 hover:opacity-90"
                    >
                        <Plus size={20} />
                        Add Asset
                    </button>
                }
            />

            {isAdding && (
                <ContentCard className="shadow-xl animate-in fade-in slide-in-from-top-4 duration-200">
                    <h3 className="text-lg font-semibold mb-4">New Asset</h3>
                    <form className="grid grid-cols-1 md:grid-cols-4 gap-4" onSubmit={handleSubmit(onSubmit)}>
                        <div className="md:col-span-4 grid grid-cols-1 md:grid-cols-5 gap-4">
                            <div className="space-y-1 col-span-2">
                                <label className="text-sm font-medium text-slate-700">Name</label>
                                <input
                                    {...register('name')}
                                    placeholder="e.g. BTC Wallet"
                                    className={`w-full bg-card border rounded-lg p-2 outline-none focus:ring-2 focus:ring-primary/20 ${errors.name ? 'border-red-500' : 'border-border'}`}
                                />
                                {errors.name && <span className="text-xs text-red-500 font-bold">{errors.name.message}</span>}
                            </div>

                            <div className="space-y-1">
                                <label className="text-sm font-bold text-muted-foreground">Type</label>
                                <select {...register('type')} className="w-full bg-background border border-border rounded-lg p-2 outline-none focus:ring-2 focus:ring-primary/20">
                                    <option value="cash">Cash</option>
                                    <option value="investment">Stock / ETF</option>
                                    <option value="crypto">Crypto</option>
                                    <option value="real_estate">Real Estate</option>
                                    <option value="retirement">Retirement</option>
                                    <option value="vehicle">Vehicle</option>
                                    <option value="collectible">Collectible</option>
                                    <option value="other">Other</option>
                                </select>
                            </div>

                            <div className="space-y-1">
                                <label className="text-sm font-bold text-muted-foreground">Currency</label>
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
                                <label className="text-sm font-bold text-muted-foreground">Value</label>
                                <input
                                    {...register('value', { valueAsNumber: true })}
                                    type="number"
                                    step="0.01"
                                    placeholder="0.00"
                                    className={`w-full bg-background border rounded-lg p-2 outline-none focus:ring-2 focus:ring-primary/20 ${errors.value ? 'border-red-500' : 'border-border'}`}
                                />
                            </div>

                            <div className="space-y-1">
                                <label className="text-sm font-bold text-muted-foreground">Yield %</label>
                                <input
                                    {...register('interest_rate', { valueAsNumber: true })}
                                    type="number"
                                    step="0.01"
                                    placeholder="e.g 4.5"
                                    className="w-full bg-background border border-border rounded-lg p-2 outline-none focus:ring-2 focus:ring-primary/20"
                                />
                            </div>
                        </div>

                        {/* Conditional Investment Fields */}
                        {isInvestmentType && (
                            <div className="md:col-span-4 grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-muted/50 rounded-xl border border-dashed border-border animate-in fade-in zoom-in-95 duration-200">
                                <div className="space-y-1">
                                    <label className="text-sm font-bold text-muted-foreground">Ticker (e.g. AAPL)</label>
                                    <input {...register('investment_details.ticker')} placeholder="AAPL" className="w-full bg-background border border-border rounded-lg p-2 outline-none focus:ring-2 focus:ring-primary/20" />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-sm font-bold text-muted-foreground">Shares</label>
                                    <input {...register('investment_details.shares', { valueAsNumber: true })} type="number" step="0.0001" placeholder="0" className="w-full bg-background border border-border rounded-lg p-2 outline-none focus:ring-2 focus:ring-primary/20" />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-sm font-bold text-muted-foreground">Cost Basis</label>
                                    <input {...register('investment_details.costBasis', { valueAsNumber: true })} type="number" step="0.01" placeholder="Total Cost" className="w-full bg-background border border-border rounded-lg p-2 outline-none focus:ring-2 focus:ring-primary/20" />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-sm font-bold text-muted-foreground">Sector (Optional)</label>
                                    <input {...register('investment_details.sector')} placeholder="e.g. Technology" className="w-full bg-background border border-border rounded-lg p-2 outline-none focus:ring-2 focus:ring-primary/20" />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-sm font-bold text-muted-foreground">Dividend Yield (%)</label>
                                    <input {...register('investment_details.dividendYield', { valueAsNumber: true })} type="number" step="0.01" placeholder="e.g. 1.5" className="w-full bg-background border border-border rounded-lg p-2 outline-none focus:ring-2 focus:ring-primary/20" />
                                </div>
                            </div>
                        )}

                        <div className="md:col-span-4 flex justify-end gap-2">
                            <button type="button" onClick={() => setIsAdding(false)} className="px-4 py-2 text-muted-foreground hover:text-foreground font-medium">Cancel</button>
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
                        {isLoading ? (
                            <tr><td colSpan={5} className="px-6 py-12 text-center text-muted-foreground">Loading assets...</td></tr>
                        ) : assets.length === 0 ? (
                            <tr>
                                <td colSpan={5} className="px-6 py-12 text-center text-muted-foreground italic font-medium">No assets added yet.</td>
                            </tr>
                        ) : assets.map((asset) => (
                            <tr key={asset.id} className="hover:bg-muted/50 border-b border-border transition-colors">
                                {editingId === asset.id ? (
                                    <td colSpan={5} className="p-4 bg-blue-50/50">
                                        {/* Legacy inline edit form for quick updates */}
                                        <form className="grid grid-cols-1 md:grid-cols-5 gap-2 items-end" onSubmit={(e) => handleUpdate(e, asset.id)}>
                                            <div className="md:col-span-5 grid grid-cols-1 md:grid-cols-4 gap-2">
                                                <input name="name" defaultValue={asset.name} className="w-full bg-background border border-border rounded-lg p-2 text-sm outline-none focus:ring-2 focus:ring-primary/20" required placeholder="Name" />
                                                <select name="type" defaultValue={asset.type} className="w-full bg-background border border-border rounded-lg p-2 text-sm outline-none focus:ring-2 focus:ring-primary/20">
                                                    <option value="cash">Cash</option>
                                                    <option value="investment">Stock / ETF</option>
                                                    <option value="crypto">Crypto</option>
                                                    <option value="real_estate">Real Estate</option>
                                                    <option value="retirement">Retirement</option>
                                                    <option value="other">Other</option>
                                                </select>
                                                <select name="currency" defaultValue={asset.currency || 'USD'} className="w-full bg-background border border-border rounded-lg p-2 text-sm outline-none focus:ring-2 focus:ring-primary/20">
                                                    <option value="USD">USD</option>
                                                    <option value="EUR">EUR</option>
                                                    <option value="GBP">GBP</option>
                                                    <option value="JPY">JPY</option>
                                                    <option value="CAD">CAD</option>
                                                    <option value="AUD">AUD</option>
                                                    <option value="CHF">CHF</option>
                                                    <option value="CNY">CNY</option>
                                                    <option value="INR">INR</option>
                                                    <option value="SGD">SGD</option>
                                                </select>
                                                <input name="interest_rate" type="number" step="0.01" defaultValue={asset.interest_rate} placeholder="Rate %" className="w-full bg-background border border-border rounded-lg p-2 text-sm outline-none focus:ring-2 focus:ring-primary/20" />
                                                <input name="value" type="number" step="0.01" defaultValue={asset.value} className="w-full bg-background border border-border rounded-lg p-2 text-sm outline-none focus:ring-2 focus:ring-primary/20" required placeholder="Value" />
                                            </div>

                                            {(asset.type === 'investment' || asset.type === 'crypto') && (
                                                <div className="md:col-span-5 grid grid-cols-1 md:grid-cols-3 gap-4 p-3 bg-muted/30 rounded-lg border border-dashed border-border">
                                                    <input name="ticker" defaultValue={asset.investment_details?.ticker} placeholder="Ticker" className="w-full bg-background border border-border rounded-lg p-2 text-sm" />
                                                    <input name="shares" type="number" step="0.0001" defaultValue={asset.investment_details?.shares} placeholder="Shares" className="w-full bg-background border border-border rounded-lg p-2 text-sm" />
                                                    <input name="cost_basis" type="number" step="0.01" defaultValue={asset.investment_details?.costBasis} placeholder="Cost Basis" className="w-full bg-background border border-border rounded-lg p-2 text-sm" />
                                                    <input name="sector" defaultValue={asset.investment_details?.sector} placeholder="Sector" className="w-full bg-background border border-border rounded-lg p-2 text-sm" />
                                                    <input name="dividend_yield" type="number" step="0.01" defaultValue={asset.investment_details?.dividendYield} placeholder="Yield %" className="w-full bg-background border border-border rounded-lg p-2 text-sm" />
                                                </div>
                                            )}

                                            <div className="md:col-span-5 flex justify-end gap-2">
                                                <button type="button" onClick={() => setEditingId(null)} className="px-3 py-2 bg-muted text-muted-foreground rounded-lg text-xs font-bold hover:bg-border transition-colors">Cancel</button>
                                                <button type="submit" className="px-3 py-2 bg-primary text-primary-foreground rounded-lg text-xs font-bold hover:opacity-90">Save Changes</button>
                                            </div>
                                        </form>
                                    </td>
                                ) : (
                                    <>
                                        <td className="px-6 py-5 font-black text-foreground">
                                            {asset.name}
                                            {asset.investment_details?.ticker && (
                                                <span className={`ml-2 text-[10px] bg-muted text-muted-foreground px-2 py-0.5 rounded-full font-black uppercase tracking-tighter ${blurClass}`}>
                                                    {asset.investment_details.ticker} ({asset.investment_details.shares})
                                                </span>
                                            )}
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className="capitalize px-2 py-1 bg-muted text-muted-foreground rounded-md text-xs font-bold">
                                                {asset.type.replace('_', ' ')}
                                            </span>
                                        </td>
                                        <td className="px-6 py-5 text-right font-mono text-sm text-muted-foreground">
                                            {asset.interest_rate ? `${asset.interest_rate}%` : '-'}
                                        </td>
                                        <td className={`px-6 py-5 text-right font-mono font-black text-foreground ${blurClass}`}>
                                            {formatCurrency(convertAmount(asset.value, asset.currency || 'USD', baseCurrency), baseCurrency)}
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex justify-center items-center gap-3">
                                                <button className="text-muted-foreground hover:text-primary transition-colors" onClick={() => setEditingId(asset.id)}>
                                                    <Edit2 size={16} />
                                                </button>
                                                <button className="text-muted-foreground hover:text-destructive transition-colors" onClick={() => handleDelete(asset.id)}>
                                                    <Trash2 size={16} />
                                                </button>
                                            </div>
                                        </td>
                                    </>
                                )}
                            </tr>
                        ))}
                    </tbody>
                    <tfoot className="bg-muted/30 font-black">
                        <tr>
                            <td colSpan={2} className="px-6 py-6 text-muted-foreground uppercase text-xs tracking-widest">Total Portfolio Value</td>
                            <td className={`px-6 py-6 text-right text-xl text-emerald-600 font-black ${blurClass}`}>
                                {isLoading ? '...' : formatCurrency(totalValue, baseCurrency)}
                            </td>
                            <td></td>
                        </tr>
                    </tfoot>
                </table>
            </ContentCard>
        </div >
    );
}
