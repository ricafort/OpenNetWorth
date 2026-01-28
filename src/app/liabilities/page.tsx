'use client';

import { useState, useEffect } from 'react';
import { Plus, Trash2, Edit2, TrendingDown } from 'lucide-react';
import { Liability, LiabilityType, CurrencyCode } from '@/types';
import { useLiabilities } from '@/hooks'; // 👈 NEW: Using domain hook
import { useDashboard } from '@/contexts/DashboardContext';
import { formatCurrency, convertAmount } from '@/lib/utils/currencyService';
import { useTheme } from '@/contexts/ThemeContext';
import CurrencySelector from '@/components/CurrencySelector';

export default function LiabilitiesPage() {
    const { liabilities, addLiability, updateLiability, deleteLiability } = useLiabilities(); // 👈 Using hook
    const [isAdding, setIsAdding] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const { isPrivacyBlur } = useTheme();
    const { baseCurrency } = useDashboard(); // Get Global Base Currency

    const blurClass = 'privacy-value';
    const softBlurClass = isPrivacyBlur ? 'opacity-20 blur-[2px] pointer-events-none transition-all duration-500' : 'transition-all duration-500';

    // Removed useEffect that loaded from LocalStorage
    // Removed [liabilities, setLiabilities] state, now managed by Context

    const [defaultCurrency, setDefaultCurrency] = useState<CurrencyCode>(baseCurrency);

    const handleAddLiability = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        const formData = new FormData(e.currentTarget);

        const newLiability: Liability = {
            id: crypto.randomUUID(), // Fix: Use real UUID for database compatibility
            user_id: 'local',
            name: formData.get('name') as string,
            type: formData.get('type') as LiabilityType,
            balance: parseFloat(formData.get('balance') as string) || 0,
            currency: defaultCurrency,
            interest_rate: parseFloat(formData.get('interest_rate') as string) || 0,
            is_good_debt: ['mortgage', 'student_loan'].includes(formData.get('type') as string),
            last_updated: new Date().toISOString()
        };

        await addLiability(newLiability);
        setIsAdding(false);
    };

    const handleUpdateLiability = async (e: React.FormEvent<HTMLFormElement>, id: string) => {
        e.preventDefault();
        const formData = new FormData(e.currentTarget);
        const currency = formData.get('currency') as CurrencyCode;

        // Find existing to preserve ID and other non-form fields if needed
        const existing = liabilities.find(l => l.id === id);
        if (!existing) return;

        const updatedItem = {
            ...existing,
            name: formData.get('name') as string,
            type: formData.get('type') as LiabilityType,
            balance: parseFloat(formData.get('balance') as string) || 0,
            currency,
            interest_rate: parseFloat(formData.get('interest_rate') as string) || 0,
            is_good_debt: ['mortgage', 'student_loan'].includes(formData.get('type') as string),
            last_updated: new Date().toISOString()
        };

        await updateLiability(updatedItem);
        setEditingId(null);
    };

    const handleDelete = async (id: string) => {
        if (confirm('Delete this liability?')) {
            await deleteLiability(id);
        }
    };

    // Calculate Total in Base Currency
    const totalLiabilities = liabilities.reduce((sum, liability) => {
        return sum + convertAmount(liability.balance, liability.currency || 'USD', baseCurrency);
    }, 0);

    return (
        <div className="space-y-8">
            <div className="flex justify-between items-end">
                <div className={softBlurClass}>
                    <h2 className="text-3xl font-black text-foreground tracking-tight">Your Liabilities</h2>
                    <p className="text-muted-foreground mt-2 font-medium">Track your debts and leverage profile.</p>
                </div>
                <button
                    onClick={() => {
                        setIsAdding(true);
                        setDefaultCurrency(baseCurrency);
                    }}
                    className="flex items-center gap-2 px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl font-medium transition-colors"
                >
                    <Plus size={20} />
                    Add Liability
                </button>
            </div>

            {isAdding && (
                <div className="bg-card p-6 rounded-2xl border border-border shadow-sm border-2 animate-in fade-in slide-in-from-top-4 duration-200">
                    <h3 className="text-lg font-semibold mb-4 text-rose-900">New Liability</h3>
                    <form className="grid grid-cols-1 md:grid-cols-5 gap-4" onSubmit={handleAddLiability}>
                        <div className="bg-white col-span-2 space-y-1">
                            <label className="text-sm font-medium text-slate-700">Name</label>
                            <input name="name" type="text" placeholder="e.g. Credit Card" className="w-full bg-card border border-border rounded-lg p-2 outline-none focus:ring-2 focus:ring-primary/20" required />
                        </div>
                        <div className="space-y-1">
                            <label className="text-sm font-medium text-muted-foreground">Type</label>
                            <select name="type" className="w-full bg-card text-card-foreground border border-border rounded-lg p-2 outline-none focus:ring-2 focus:ring-primary/20">
                                <option value="mortgage">Mortgage</option>
                                <option value="student_loan">Student Loan</option>
                                <option value="auto_loan">Auto Loan</option>
                                <option value="credit_card">Credit Card</option>
                                <option value="other">Other</option>
                            </select>
                        </div>
                        <div className="space-y-1">
                            <label className="text-sm font-medium text-slate-700">Currency</label>
                            <CurrencySelector value={defaultCurrency} onChange={setDefaultCurrency} className="w-full" />
                        </div>
                        <div className="space-y-1">
                            <label className="text-sm font-medium text-slate-700">Balance</label>
                            <input name="balance" type="number" placeholder="0.00" step="0.01" className="w-full bg-card border border-border rounded-lg p-2 outline-none focus:ring-2 focus:ring-primary/20" required />
                        </div>
                        <div className="space-y-1">
                            <label className="text-sm font-medium text-slate-700">Interest Rate (%)</label>
                            <input name="interest_rate" type="number" placeholder="0.0" step="0.01" className="w-full bg-card border border-border rounded-lg p-2 outline-none focus:ring-2 focus:ring-primary/20" />
                        </div>

                        <div className="col-span-5 flex justify-end gap-2">
                            <button type="button" onClick={() => setIsAdding(false)} className="px-4 py-2 text-slate-500 hover:text-slate-700 font-medium">Cancel</button>
                            <button type="submit" className="bg-slate-900 text-white rounded-lg px-6 py-2 font-medium hover:bg-slate-800 transition-colors">Save Liability</button>
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
                            <th className="px-6 py-4 text-right">Balance</th>
                            <th className="px-6 py-4 text-right">Rate</th>
                            <th className="px-6 py-4 text-center">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-border text-sm">
                        {liabilities.length === 0 ? (
                            <tr>
                                <td colSpan={5} className="px-6 py-12 text-center text-muted-foreground italic font-medium">No liabilities found. Good job!</td>
                            </tr>
                        ) : liabilities.map((liability) => (
                            <tr key={liability.id} className="hover:bg-muted/50 border-b border-border transition-colors">
                                {editingId === liability.id ? (
                                    <td colSpan={5} className="p-4 bg-rose-50/50">
                                        <form className="grid grid-cols-1 md:grid-cols-5 gap-4 items-end" onSubmit={(e) => handleUpdateLiability(e, liability.id)}>
                                            <input name="name" defaultValue={liability.name} className="w-full bg-input border border-border rounded-lg p-2 text-sm outline-none focus:ring-2 focus:ring-rose-500" required />
                                            <select name="type" defaultValue={liability.type} className="w-full bg-input border border-border rounded-lg p-2 text-sm outline-none focus:ring-2 focus:ring-rose-500">
                                                <option value="mortgage">Mortgage</option>
                                                <option value="student_loan">Student Loan</option>
                                                <option value="auto_loan">Auto Loan</option>
                                                <option value="credit_card">Credit Card</option>
                                                <option value="other">Other</option>
                                            </select>
                                            <select name="currency" defaultValue={liability.currency || 'USD'} className="w-full bg-card text-card-foreground border border-border rounded-lg p-2 text-sm outline-none focus:ring-2 focus:ring-primary/20">
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
                                            <input name="balance" type="number" step="0.01" defaultValue={liability.balance} className="w-full bg-card border border-border rounded-lg p-2 text-sm outline-none focus:ring-2 focus:ring-primary/20" required />
                                            <input name="interest_rate" type="number" step="0.01" defaultValue={liability.interest_rate} placeholder="Rate %" className="w-full bg-card border border-border rounded-lg p-2 text-sm outline-none focus:ring-2 focus:ring-primary/20" />
                                            <div className="flex gap-2 col-span-5 justify-end">
                                                <button type="button" onClick={() => setEditingId(null)} className="px-3 py-2 bg-slate-200 text-slate-600 rounded-lg text-xs font-bold hover:bg-slate-300">Cancel</button>
                                                <button type="submit" className="px-3 py-2 bg-rose-600 text-white rounded-lg text-xs font-bold hover:bg-rose-700">Save</button>
                                            </div>
                                        </form>
                                    </td>
                                ) : (
                                    <>
                                        <td className="px-6 py-5 font-black text-foreground">{liability.name}</td>
                                        <td className="px-6 py-4">
                                            <span className="capitalize px-2 py-1 bg-slate-100 text-slate-600 rounded-md text-xs font-medium">
                                                {liability.type.replace('_', ' ')}
                                            </span>
                                        </td>
                                        <td className={`px-6 py-5 text-right font-mono font-black text-rose-500 ${blurClass}`}>
                                            {formatCurrency(convertAmount(liability.balance, liability.currency || 'USD', baseCurrency), baseCurrency)}
                                        </td>
                                        <td className="px-6 py-5 text-right font-medium text-slate-500">
                                            {liability.interest_rate > 0 ? `${liability.interest_rate}%` : '-'}
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex justify-center items-center gap-3">
                                                <button className="text-slate-400 hover:text-blue-500 transition-colors" onClick={() => setEditingId(liability.id)}>
                                                    <Edit2 size={16} />
                                                </button>
                                                <button className="text-slate-400 hover:text-rose-500 transition-colors" onClick={() => handleDelete(liability.id)}>
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
                            <td colSpan={2} className="px-6 py-6 text-muted-foreground uppercase text-xs tracking-widest">Total Liabilities</td>
                            <td className={`px-6 py-6 text-right text-xl text-rose-500 font-black ${blurClass}`}>
                                {formatCurrency(totalLiabilities, baseCurrency)}
                            </td>
                            <td colSpan={2}></td>
                        </tr>
                    </tfoot>
                </table>
            </div>
        </div>
    );
}
