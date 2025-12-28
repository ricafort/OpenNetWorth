'use client';

import { useState, useEffect } from 'react';
import { Plus, Trash2, Edit2, PieChart } from 'lucide-react';
import { Asset, AssetType, CurrencyCode } from '@/types';
import { loadAssets, saveAssets } from '@/lib/storage';
import { useDashboard } from '@/contexts/DashboardContext'; // Import useDashboard
import { formatCurrency, convertAmount } from '@/lib/currencyService'; // Import convertAmount
import CurrencySelector from '@/components/CurrencySelector'; // Restore Import

import { useTheme } from '@/contexts/ThemeContext';

export default function AssetsPage() {
    const [assets, setAssets] = useState<Asset[]>([]);
    const [isAdding, setIsAdding] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const { isPrivacyBlur } = useTheme();
    const { baseCurrency } = useDashboard(); // Get baseCurrency

    const blurClass = isPrivacyBlur ? 'privacy-value' : '';
    const softBlurClass = isPrivacyBlur ? 'opacity-20 blur-[2px] pointer-events-none transition-all duration-500' : 'transition-all duration-500';

    useEffect(() => {
        const saved = loadAssets();
        if (saved.length > 0) {
            setAssets(saved);
        }
    }, []);



    const [defaultCurrency, setDefaultCurrency] = useState<CurrencyCode>(baseCurrency);

    const handleAddAsset = (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        const formData = new FormData(e.currentTarget);

        const type = formData.get('type') as AssetType;
        const ticker = formData.get('ticker') as string;
        const shares = parseFloat(formData.get('shares') as string) || 0;
        const costBasis = parseFloat(formData.get('cost_basis') as string) || 0;
        const sector = formData.get('sector') as string;
        const dividendYield = parseFloat(formData.get('dividend_yield') as string) || 0;

        const newAsset: Asset = {
            id: `asset-${Date.now()}`,
            name: formData.get('name') as string,
            type,
            value: parseFloat(formData.get('value') as string) || 0,
            currency: defaultCurrency,
            is_liquid: type === 'cash' || type === 'investment',
            last_updated: new Date().toISOString(),
            investment: (type === 'investment' || type === 'crypto') && ticker ? {
                ticker,
                shares,
                costBasis,
                sector,
                dividendYield,
                assetClass: (type === 'crypto' ? 'crypto' : 'stock') as 'crypto' | 'stock' | 'etf' | 'other'
            } : undefined
        };

        const updated = [...assets, newAsset];
        setAssets(updated);
        saveAssets(updated);
        setIsAdding(false);
    };

    const handleUpdateAsset = (e: React.FormEvent<HTMLFormElement>, id: string) => {
        e.preventDefault();
        const formData = new FormData(e.currentTarget);
        const currency = formData.get('currency') as CurrencyCode;

        const updatedAssets = assets.map(asset => {
            if (asset.id === id) {
                const type = formData.get('type') as AssetType;
                const ticker = formData.get('ticker') as string;
                const shares = parseFloat(formData.get('shares') as string) || 0;
                const costBasis = parseFloat(formData.get('cost_basis') as string) || 0;
                const sector = formData.get('sector') as string;
                const dividendYield = parseFloat(formData.get('dividend_yield') as string) || 0;

                return {
                    ...asset,
                    name: formData.get('name') as string,
                    type,
                    value: parseFloat(formData.get('value') as string) || 0,
                    currency,
                    is_liquid: type === 'cash' || type === 'investment',
                    last_updated: new Date().toISOString(),
                    investment: (type === 'investment' || type === 'crypto') && ticker ? {
                        ticker,
                        shares,
                        costBasis,
                        sector,
                        dividendYield,
                        assetClass: (type === 'crypto' ? 'crypto' : 'stock') as 'crypto' | 'stock' | 'etf' | 'other'
                    } : undefined
                };
            }
            return asset;
        });

        setAssets(updatedAssets);
        saveAssets(updatedAssets);
        setEditingId(null);
    };

    const handleDelete = (id: string) => {
        if (confirm('Delete this asset?')) {
            const updated = assets.filter(a => a.id !== id);
            setAssets(updated);
            saveAssets(updated);
        }
    };

    // Calculate Total in Base Currency
    const totalValue = assets.reduce((sum, asset) => {
        return sum + convertAmount(asset.value, asset.currency || 'USD', baseCurrency);
    }, 0);

    return (
        <div className="space-y-8">
            <div className="flex justify-between items-end">
                <div className={softBlurClass}>
                    <h2 className="text-3xl font-black text-foreground tracking-tight">Your Assets</h2>
                    <p className="text-muted-foreground mt-2 font-medium">Manage everything you own in one place.</p>
                </div>
                <button
                    onClick={() => {
                        setIsAdding(true);
                        setDefaultCurrency(baseCurrency);
                    }}
                    className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-xl font-bold transition-all shadow-lg shadow-primary/10 active:scale-95 hover:opacity-90"
                >
                    <Plus size={20} />
                    Add Asset
                </button>
            </div>

            {isAdding && (
                <div className="bg-card p-6 rounded-2xl border border-border shadow-xl animate-in fade-in slide-in-from-top-4 duration-200">
                    <h3 className="text-lg font-semibold mb-4">New Asset</h3>
                    <form className="grid grid-cols-1 md:grid-cols-4 gap-4" onSubmit={handleAddAsset}>
                        <div className="md:col-span-4 grid grid-cols-1 md:grid-cols-5 gap-4">
                            <div className="space-y-1 col-span-2">
                                <label className="text-sm font-medium text-slate-700">Name</label>
                                <input name="name" type="text" placeholder="e.g. BTC Wallet" className="w-full bg-card border border-border rounded-lg p-2 outline-none focus:ring-2 focus:ring-primary/20" required />
                            </div>
                            <div className="space-y-1">
                                <label className="text-sm font-bold text-muted-foreground">Type</label>
                                <select
                                    name="type"
                                    className="w-full bg-background border border-border rounded-lg p-2 outline-none focus:ring-2 focus:ring-primary/20"
                                    onChange={(e) => {
                                        const type = e.target.value;
                                        const investmentFields = document.getElementById('add-investment-fields');
                                        if (investmentFields) {
                                            investmentFields.style.display = (type === 'investment' || type === 'crypto') ? 'grid' : 'none';
                                        }
                                    }}
                                >
                                    <option value="cash">Cash</option>
                                    <option value="investment">Stock / ETF</option>
                                    <option value="crypto">Crypto</option>
                                    <option value="real_estate">Real Estate</option>
                                    <option value="retirement">Retirement</option>
                                    <option value="other">Other</option>
                                </select>
                            </div>
                            <div className="space-y-1">
                                <label className="text-sm font-bold text-muted-foreground">Currency</label>
                                <CurrencySelector value={defaultCurrency} onChange={setDefaultCurrency} className="w-full" />
                            </div>
                            <div className="space-y-1">
                                <label className="text-sm font-bold text-muted-foreground">Value</label>
                                <input name="value" type="number" placeholder="0.00" step="0.01" className="w-full bg-background border border-border rounded-lg p-2 outline-none focus:ring-2 focus:ring-primary/20" required />
                            </div>
                        </div>

                        <div id="add-investment-fields" className="md:col-span-4 grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-muted/50 rounded-xl border border-dashed border-border" style={{ display: 'none' }}>
                            <div className="space-y-1">
                                <label className="text-sm font-bold text-muted-foreground">Ticker (e.g. AAPL)</label>
                                <input name="ticker" type="text" placeholder="AAPL" className="w-full bg-background border border-border rounded-lg p-2 outline-none focus:ring-2 focus:ring-primary/20" />
                            </div>
                            <div className="space-y-1">
                                <label className="text-sm font-bold text-muted-foreground">Shares</label>
                                <input name="shares" type="number" step="0.0001" placeholder="0" className="w-full bg-background border border-border rounded-lg p-2 outline-none focus:ring-2 focus:ring-primary/20" />
                            </div>
                            <div className="space-y-1">
                                <label className="text-sm font-bold text-muted-foreground">Cost Basis ($)</label>
                                <input name="cost_basis" type="number" step="0.01" placeholder="Total Cost" className="w-full bg-background border border-border rounded-lg p-2 outline-none focus:ring-2 focus:ring-primary/20" />
                            </div>
                            <div className="space-y-1">
                                <label className="text-sm font-bold text-muted-foreground">Sector (Optional)</label>
                                <input name="sector" type="text" placeholder="e.g. Technology" className="w-full bg-background border border-border rounded-lg p-2 outline-none focus:ring-2 focus:ring-primary/20" />
                            </div>
                            <div className="space-y-1">
                                <label className="text-sm font-bold text-muted-foreground">Dividend Yield (%)</label>
                                <input name="dividend_yield" type="number" step="0.01" placeholder="e.g. 1.5" className="w-full bg-background border border-border rounded-lg p-2 outline-none focus:ring-2 focus:ring-primary/20" />
                            </div>
                        </div>

                        <div className="md:col-span-4 flex justify-end gap-2">
                            <button type="button" onClick={() => setIsAdding(false)} className="px-4 py-2 text-muted-foreground hover:text-foreground font-medium">Cancel</button>
                            <button type="submit" className="bg-primary text-primary-foreground rounded-lg px-6 py-2 font-bold hover:opacity-90 transition-all shadow-lg shadow-primary/10">Save Asset</button>
                        </div>
                    </form>
                </div>
            )}

            <div className="bg-card rounded-2xl border border-border shadow-sm overflow-hidden">
                <table className="w-full text-left">
                    <thead className="bg-muted text-muted-foreground text-xs uppercase font-black tracking-wider">
                        <tr>
                            <th className="px-6 py-4">Name</th>
                            <th className="px-6 py-4">Type</th>
                            <th className="px-6 py-4 text-right">Value</th>
                            <th className="px-6 py-4 text-center">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-border text-sm">
                        {assets.length === 0 ? (
                            <tr>
                                <td colSpan={4} className="px-6 py-12 text-center text-muted-foreground italic font-medium">No assets added yet.</td>
                            </tr>
                        ) : assets.map((asset) => (
                            <tr key={asset.id} className="hover:bg-muted/50 border-b border-border transition-colors">
                                {editingId === asset.id ? (
                                    <td colSpan={4} className="p-4 bg-blue-50/50">
                                        {/* ... inside map loop ... */}
                                        <form className="grid grid-cols-1 md:grid-cols-5 gap-2 items-end" onSubmit={(e) => handleUpdateAsset(e, asset.id)}>
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
                                                <input name="value" type="number" step="0.01" defaultValue={asset.value} className="w-full bg-background border border-border rounded-lg p-2 text-sm outline-none focus:ring-2 focus:ring-primary/20" required placeholder="Value" />
                                            </div>

                                            {(asset.type === 'investment' || asset.type === 'crypto') && (
                                                <div className="md:col-span-5 grid grid-cols-1 md:grid-cols-3 gap-4 p-3 bg-muted/30 rounded-lg border border-dashed border-border">
                                                    <input name="ticker" defaultValue={asset.investment?.ticker} placeholder="Ticker" className="w-full bg-background border border-border rounded-lg p-2 text-sm" />
                                                    <input name="shares" type="number" step="0.0001" defaultValue={asset.investment?.shares} placeholder="Shares" className="w-full bg-background border border-border rounded-lg p-2 text-sm" />
                                                    <input name="cost_basis" type="number" step="0.01" defaultValue={asset.investment?.costBasis} placeholder="Cost Basis" className="w-full bg-background border border-border rounded-lg p-2 text-sm" />
                                                    <input name="sector" defaultValue={asset.investment?.sector} placeholder="Sector" className="w-full bg-background border border-border rounded-lg p-2 text-sm" />
                                                    <input name="dividend_yield" type="number" step="0.01" defaultValue={asset.investment?.dividendYield} placeholder="Yield %" className="w-full bg-background border border-border rounded-lg p-2 text-sm" />
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
                                            {asset.investment?.ticker && (
                                                <span className={`ml-2 text-[10px] bg-muted text-muted-foreground px-2 py-0.5 rounded-full font-black uppercase tracking-tighter ${blurClass}`}>
                                                    {asset.investment.ticker} ({asset.investment.shares})
                                                </span>
                                            )}
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className="capitalize px-2 py-1 bg-muted text-muted-foreground rounded-md text-xs font-bold">
                                                {asset.type.replace('_', ' ')}
                                            </span>
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
                                {formatCurrency(totalValue, baseCurrency)}
                            </td>
                            <td></td>
                        </tr>
                    </tfoot>
                </table>
            </div>
        </div >
    );
}
