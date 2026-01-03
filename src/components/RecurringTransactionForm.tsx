import { useState, useEffect } from 'react';
import { RecurringTransaction } from '@/types';
import { X, Save, Calendar, Repeat, Coins } from 'lucide-react';
import { useDashboard } from '@/contexts/DashboardContext';
import { getCurrencySymbol, SUPPORTED_CURRENCIES } from '@/lib/currencyService';

interface Props {
    onSave: (transaction: RecurringTransaction) => void;
    onCancel: () => void;
    initialData?: RecurringTransaction | null;
}

export default function RecurringTransactionForm({ onSave, onCancel, initialData }: Props) {
    const { baseCurrency } = useDashboard();

    const [formData, setFormData] = useState<Partial<RecurringTransaction>>({
        name: '',
        amount: 0,
        type: 'expense',
        frequency: 'monthly',
        category: 'General',
        startDate: new Date().toISOString().split('T')[0],
        isActive: true,
        currency: baseCurrency
    });

    useEffect(() => {
        if (initialData) {
            setFormData(initialData);
        } else {
            // Ensure new items start with the correct dashboard currency
            setFormData(prev => ({ ...prev, currency: baseCurrency }));
        }
    }, [initialData, baseCurrency]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSave({
            ...(formData as RecurringTransaction),
            id: initialData?.id || crypto.randomUUID(),
            // Ensure currency is set, falling back to base if somehow missing
            currency: formData.currency || baseCurrency
        });
    };

    const currencySymbol = getCurrencySymbol(formData.currency || baseCurrency);

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-card rounded-3xl w-full max-w-lg shadow-2xl border border-border overflow-hidden animate-in fade-in zoom-in duration-200">
                <form onSubmit={handleSubmit}>
                    <div className="p-6 border-b border-border flex items-center justify-between">
                        <h3 className="text-xl font-bold text-foreground">
                            {initialData ? 'Edit Recurring Item' : 'Add Recurring Item'}
                        </h3>
                        <button type="button" onClick={onCancel} className="p-2 hover:bg-muted rounded-full transition-colors text-muted-foreground">
                            <X size={20} />
                        </button>
                    </div>

                    <div className="p-6 space-y-4">
                        {/* Type Selection */}
                        <div className="flex bg-muted p-1 rounded-xl">
                            <button
                                type="button"
                                onClick={() => setFormData(prev => ({ ...prev, type: 'income' }))}
                                className={`flex-1 py-2 rounded-lg text-sm font-bold transition-all ${formData.type === 'income' ? 'bg-card shadow text-emerald-600' : 'text-muted-foreground hover:text-foreground'
                                    }`}
                            >
                                Income
                            </button>
                            <button
                                type="button"
                                onClick={() => setFormData(prev => ({ ...prev, type: 'expense' }))}
                                className={`flex-1 py-2 rounded-lg text-sm font-bold transition-all ${formData.type === 'expense' ? 'bg-card shadow text-red-600' : 'text-muted-foreground hover:text-foreground'
                                    }`}
                            >
                                Expense
                            </button>
                        </div>

                        {/* Name & Amount */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs font-black text-muted-foreground uppercase mb-1.5">Name</label>
                                <input
                                    type="text"
                                    required
                                    placeholder="e.g. Salary, Rent"
                                    value={formData.name}
                                    onChange={e => setFormData(prev => ({ ...prev, name: e.target.value }))}
                                    className="w-full bg-card text-card-foreground border border-border rounded-xl py-3 px-4 outline-none focus:ring-2 focus:ring-primary/20 font-bold"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-black text-muted-foreground uppercase mb-1.5">Amount</label>
                                <div className="relative">
                                    <span className="absolute left-4 top-3 text-muted-foreground font-bold">{currencySymbol}</span>
                                    <input
                                        type="number"
                                        required
                                        min="0"
                                        step="0.01"
                                        placeholder="0.00"
                                        value={formData.amount === 0 ? '' : formData.amount}
                                        onChange={e => setFormData(prev => ({ ...prev, amount: parseFloat(e.target.value) || 0 }))}
                                        className="w-full bg-card text-card-foreground border border-border rounded-xl py-3 pl-14 pr-4 outline-none focus:ring-2 focus:ring-primary/20 font-bold"
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Currency & Frequency */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs font-black text-muted-foreground uppercase mb-1.5">Currency</label>
                                <div className="relative">
                                    <Coins size={16} className="absolute left-4 top-3.5 text-muted-foreground" />
                                    <select
                                        value={formData.currency}
                                        onChange={e => setFormData(prev => ({ ...prev, currency: e.target.value as any }))}
                                        className="w-full bg-card text-card-foreground border border-border rounded-xl py-3 pl-10 pr-4 outline-none focus:ring-2 focus:ring-primary/20 font-medium appearance-none"
                                    >
                                        {SUPPORTED_CURRENCIES.map(c => (
                                            <option key={c.code} value={c.code}>{c.code} ({c.symbol})</option>
                                        ))}
                                    </select>
                                </div>
                            </div>
                            <div>
                                <label className="block text-xs font-black text-muted-foreground uppercase mb-1.5">Frequency</label>
                                <div className="relative">
                                    <Repeat size={16} className="absolute left-4 top-3.5 text-muted-foreground" />
                                    <select
                                        value={formData.frequency}
                                        onChange={e => setFormData(prev => ({ ...prev, frequency: e.target.value as any }))}
                                        className="w-full bg-card text-card-foreground border border-border rounded-xl py-3 pl-10 pr-4 outline-none focus:ring-2 focus:ring-primary/20 font-medium appearance-none"
                                    >
                                        <option value="weekly">Weekly</option>
                                        <option value="biweekly">Bi-weekly</option>
                                        <option value="monthly">Monthly</option>
                                        <option value="quarterly">Quarterly</option>
                                        <option value="yearly">Yearly</option>
                                    </select>
                                </div>
                            </div>
                        </div>

                        {/* Category & Date */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs font-black text-muted-foreground uppercase mb-1.5">Category</label>
                                <input
                                    type="text"
                                    required
                                    placeholder="e.g. Housing"
                                    value={formData.category}
                                    onChange={e => setFormData(prev => ({ ...prev, category: e.target.value }))}
                                    className="w-full bg-card text-card-foreground border border-border rounded-xl py-3 px-4 outline-none focus:ring-2 focus:ring-primary/20 font-medium"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-black text-muted-foreground uppercase mb-1.5">Start Date</label>
                                <div className="relative">
                                    <Calendar size={16} className="absolute left-4 top-3.5 text-muted-foreground" />
                                    <input
                                        type="date"
                                        required
                                        value={formData.startDate}
                                        onChange={e => setFormData(prev => ({ ...prev, startDate: e.target.value }))}
                                        className="w-full bg-card text-card-foreground border border-border rounded-xl py-3 pl-10 pr-4 outline-none focus:ring-2 focus:ring-primary/20 font-medium"
                                    />
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="p-6 pt-2 flex gap-3">
                        <button type="button" onClick={onCancel} className="flex-1 py-3 rounded-xl font-bold text-muted-foreground hover:bg-muted transition-colors">
                            Cancel
                        </button>
                        <button type="submit" className="flex-1 py-3 rounded-xl font-bold text-primary-foreground bg-primary hover:opacity-90 transition-all flex items-center justify-center gap-2 shadow-lg">
                            <Save size={18} />
                            Save Item
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
