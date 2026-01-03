'use client';

import { useState, useEffect } from 'react';
import { Plus, TrendingUp, TrendingDown, DollarSign, Repeat, History } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts';
import { RecurringTransaction, CashFlowEntry } from '@/types';
// import {
//     loadRecurringTransactions,
//     saveRecurringTransactions,
//     applyRecurringToMonth
// } from '@/lib/storage'; // Removed
import RecurringList from '@/components/RecurringList';
import RecurringTransactionForm from '@/components/RecurringTransactionForm';
import { useDashboard } from '@/contexts/DashboardContext';
import { useProfile } from '@/contexts/ProfileContext'; // Added
import { formatCurrency, convertAmount } from '@/lib/currencyService';

export default function CashFlowPage() {
    const { baseCurrency } = useDashboard();
    const {
        recurring,
        addRecurring: addRecurringContext,
        updateRecurring: updateRecurringContext,
        deleteRecurring: deleteRecurringContext,
        isDemoMode
    } = useProfile();

    // Shared State
    const [view, setView] = useState<'history' | 'autopilot'>('history');

    // History State
    const [entries, setEntries] = useState<CashFlowEntry[]>([]);
    const [isAdding, setIsAdding] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);

    // Autopilot State
    // recurring is now coming from Context
    const [isAddingRecurring, setIsAddingRecurring] = useState(false);
    const [editingRecurring, setEditingRecurring] = useState<RecurringTransaction | null>(null);

    // Initial Load
    useEffect(() => {
        // Load Cash Flow History
        const savedHistory = localStorage.getItem('clearworth_cashflow');
        if (savedHistory) {
            setEntries(JSON.parse(savedHistory).sort((a: any, b: any) => a.month.localeCompare(b.month)));
        } else {
            // Seed with dummy data
            const dummy: CashFlowEntry[] = [
                { id: '1', month: '2024-10', income: 8200, expenses: 4800 },
                { id: '2', month: '2024-11', income: 8500, expenses: 5100 },
                { id: '3', month: '2024-12', income: 9100, expenses: 4200 },
            ];
            setEntries(dummy);
            localStorage.setItem('clearworth_cashflow', JSON.stringify(dummy));
        }

        // Removed manual loadRecurringTransactions() since useProfile handles it
    }, []);

    // --- History Handlers ---
    const saveEntries = (newEntries: CashFlowEntry[]) => {
        const sorted = newEntries.sort((a, b) => a.month.localeCompare(b.month));
        setEntries(sorted);
        localStorage.setItem('clearworth_cashflow', JSON.stringify(sorted));
    };

    const handleSaveEntry = (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        const formData = new FormData(e.currentTarget);
        const month = formData.get('month') as string;
        const income = parseFloat(formData.get('income') as string) || 0;
        const expenses = parseFloat(formData.get('expenses') as string) || 0;

        const newEntry: CashFlowEntry = {
            id: editingId || `cf-${Date.now()}`,
            month,
            income,
            expenses
        };

        const existingIndex = entries.findIndex(e => e.month === month);

        let updated;
        if (existingIndex >= 0 && (!editingId || entries[existingIndex].id === editingId)) {
            updated = [...entries];
            updated[existingIndex] = newEntry;
        } else {
            updated = [...entries, newEntry];
        }

        saveEntries(updated);
        setIsAdding(false);
        setEditingId(null);
    };

    const handleDeleteEntry = (id: string) => {
        if (confirm('Delete this entry?')) {
            const updated = entries.filter(e => e.id !== id);
            saveEntries(updated);
        }
    };

    // --- Autopilot Handlers ---
    // Note: The form returns a RecurringTransaction object.
    // We assume the form puts the "amount" in the correct numeric value.
    // If the currency handling in the app expects USD storage:
    // With ProfileContext, we should simply store what we get, along with the currency code if possible.
    // But currently RecurringTransaction doesn't strictly enforce a currency column, 
    // it usually assumes the User's base currency or USD.
    // In God Mode, we want to store it exactly as entered (GBP).

    const handleSaveRecurring = async (t: RecurringTransaction) => {
        // Ensure ID is valid UUID if new
        const transactionToSave = {
            ...t,
            id: t.id || crypto.randomUUID(), // Use UUID for Supabase
            // Respect the form's currency selection, fallback to base only if missing
            currency: t.currency || baseCurrency
        };

        if (editingRecurring) {
            await updateRecurringContext(transactionToSave);
            setEditingRecurring(null);
        } else {
            await addRecurringContext(transactionToSave);
            setIsAddingRecurring(false);
        }
    };

    const handleDeleteRecurring = async (id: string) => {
        if (confirm('Delete this recurring item?')) {
            await deleteRecurringContext(id);
        }
    };

    const handleToggleRecurring = async (id: string) => {
        const item = recurring.find(r => r.id === id);
        if (item) {
            await updateRecurringContext({ ...item, isActive: !item.isActive });
        }
    };

    // --- Derived Metrics ---
    const latest = entries[entries.length - 1] || { income: 0, expenses: 0 };

    // Currency Conversion for Display
    const latestIncome = convertAmount(latest.income, 'USD', baseCurrency);
    const latestExpenses = convertAmount(latest.expenses, 'USD', baseCurrency);
    const net = latestIncome - latestExpenses;
    const savingsRate = latestIncome > 0 ? (net / latestIncome) * 100 : 0;

    // Convert entries for Chart
    const chartData = entries.map(e => ({
        ...e,
        income: convertAmount(e.income, 'USD', baseCurrency),
        expenses: convertAmount(e.expenses, 'USD', baseCurrency)
    }));

    return (
        <div className="space-y-8 max-w-5xl mx-auto">
            {/* Header & Tabs */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                <div>
                    <h2 className="text-3xl font-black text-foreground tracking-tight">Cash Flow</h2>
                    <p className="text-muted-foreground mt-2 font-medium">Master your inflows and outflows.</p>
                </div>

                <div className="flex bg-slate-100 p-1 rounded-xl">
                    <button
                        onClick={() => setView('history')}
                        className={`px-4 py-2 rounded-lg font-bold text-sm transition-all flex items-center gap-2 ${view === 'history' ? 'bg-card shadow text-foreground' : 'text-muted-foreground hover:text-muted-foreground'
                            }`}
                    >
                        <History size={16} />
                        History
                    </button>
                    <button
                        onClick={() => setView('autopilot')}
                        className={`px-4 py-2 rounded-lg font-bold text-sm transition-all flex items-center gap-2 ${view === 'autopilot' ? 'bg-card shadow text-blue-600' : 'text-muted-foreground hover:text-muted-foreground'
                            }`}
                    >
                        <Repeat size={16} />
                        Autopilot
                    </button>
                </div>
            </div>

            {/* VIEWS */}
            {view === 'history' ? (
                // --- HISTORY VIEW ---
                <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-300">
                    {/* Actions */}
                    <div className="flex justify-end">
                        <button
                            onClick={() => setIsAdding(true)}
                            className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-medium transition-colors"
                        >
                            <Plus size={20} />
                            Log Month
                        </button>
                    </div>

                    {isAdding && (
                        <div className="bg-card p-6 rounded-2xl border border-emerald-100 shadow-sm border-2 animate-in fade-in slide-in-from-top-4 duration-200">
                            <h3 className="text-lg font-semibold mb-4 text-emerald-900">Log Income & Expenses</h3>
                            <form className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end" onSubmit={handleSaveEntry}>
                                <div className="space-y-1">
                                    <label className="text-sm font-medium text-muted-foreground">Month</label>
                                    <input name="month" type="month" defaultValue={new Date().toISOString().slice(0, 7)} className="w-full bg-muted border border-border rounded-lg p-2 outline-none focus:ring-2 focus:ring-emerald-500" required />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-sm font-medium text-muted-foreground">Total Income ({baseCurrency})</label>
                                    <input name="income" type="number" step="0.01" placeholder="0.00" className="w-full bg-muted border border-border rounded-lg p-2 outline-none focus:ring-2 focus:ring-emerald-500" required />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-sm font-medium text-muted-foreground">Total Expenses ({baseCurrency})</label>
                                    <input name="expenses" type="number" step="0.01" placeholder="0.00" className="w-full bg-muted border border-border rounded-lg p-2 outline-none focus:ring-2 focus:ring-emerald-500" required />
                                </div>
                                <div className="flex gap-2">
                                    <button type="submit" className="flex-1 bg-slate-900 text-white rounded-lg p-2 font-medium hover:bg-slate-800 transition-colors">Save</button>
                                    <button type="button" onClick={() => setIsAdding(false)} className="px-4 py-2 text-muted-foreground hover:text-muted-foreground font-medium">Cancel</button>
                                </div>
                            </form>
                        </div>
                    )}

                    {/* Latest Summary Card */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className="bg-card p-6 rounded-2xl border border-border shadow-sm">
                            <div className="flex items-center gap-3 mb-2">
                                <div className="p-2 bg-emerald-100 text-emerald-600 rounded-lg">
                                    <TrendingUp size={20} />
                                </div>
                                <span className="text-muted-foreground font-medium">Income</span>
                            </div>
                            <p className="text-2xl font-bold text-foreground privacy-value">{formatCurrency(latestIncome, baseCurrency)}</p>
                        </div>
                        <div className="bg-card p-6 rounded-2xl border border-border shadow-sm">
                            <div className="flex items-center gap-3 mb-2">
                                <div className="p-2 bg-rose-100 text-rose-600 rounded-lg">
                                    <TrendingDown size={20} />
                                </div>
                                <span className="text-muted-foreground font-medium">Expenses</span>
                            </div>
                            <p className="text-2xl font-bold text-foreground privacy-value">{formatCurrency(latestExpenses, baseCurrency)}</p>
                        </div>
                        <div className="bg-card p-6 rounded-2xl border border-border shadow-sm">
                            <div className="flex items-center gap-3 mb-2">
                                <div className="p-2 bg-blue-100 text-blue-600 rounded-lg">
                                    <DollarSign size={20} />
                                </div>
                                <span className="text-muted-foreground font-medium">Net Savings</span>
                            </div>
                            <div className="flex justify-between items-baseline">
                                <p className={`text-2xl font-bold ${net >= 0 ? 'text-emerald-600' : 'text-rose-600'} privacy-value`}>
                                    {net >= 0 ? '+' : ''}{formatCurrency(net, baseCurrency)}
                                </p>
                                <span className="text-sm font-semibold text-slate-400">{savingsRate.toFixed(1)}% Rate</span>
                            </div>
                        </div>
                    </div>

                    {/* Chart */}
                    <div className="bg-card p-6 rounded-2xl border border-border shadow-sm">
                        <h3 className="text-lg font-bold text-foreground mb-6">Monthly Trends</h3>
                        <div className="w-full flex items-center justify-center">
                            <BarChart width={900} height={350} data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                                <XAxis
                                    dataKey="month"
                                    axisLine={false}
                                    tickLine={false}
                                    tick={{ fill: '#64748b', fontSize: 12 }}
                                    dy={10}
                                />
                                <YAxis
                                    axisLine={false}
                                    tickLine={false}
                                    tick={{ fill: '#64748b', fontSize: 12 }}
                                    tickFormatter={(val) => formatCurrency(val, baseCurrency, 'en-US').replace(/\p{Sc}/u, '').trim()}
                                />
                                <Tooltip
                                    cursor={{ fill: '#f1f5f9' }}
                                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                                    formatter={(val: any) => formatCurrency(Number(val), baseCurrency)}
                                />
                                <Bar dataKey="income" name="Income" fill="#10b981" radius={[4, 4, 0, 0]} barSize={20} />
                                <Bar dataKey="expenses" name="Expenses" fill="#f43f5e" radius={[4, 4, 0, 0]} barSize={20} />
                            </BarChart>
                        </div>
                    </div>

                    {/* History Table */}
                    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                        <div className="px-6 py-4 border-b border-border bg-slate-50/50">
                            <h3 className="font-bold text-slate-900">History</h3>
                        </div>
                        <table className="w-full text-left">
                            <thead className="bg-slate-50 border-b border-slate-200 text-slate-700 text-sm font-bold">
                                <tr>
                                    <th className="px-6 py-4">Month</th>
                                    <th className="px-6 py-4 text-right">Income</th>
                                    <th className="px-6 py-4 text-right">Expenses</th>
                                    <th className="px-6 py-4 text-right">Net</th>
                                    <th className="px-6 py-4 text-center">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 text-sm">
                                {entries.slice().reverse().map((entry) => {
                                    const inc = convertAmount(entry.income, 'USD', baseCurrency);
                                    const exp = convertAmount(entry.expenses, 'USD', baseCurrency);
                                    const netVal = inc - exp;

                                    return (
                                        <tr key={entry.id} className="hover:bg-muted transition-colors">
                                            <td className="px-6 py-4 font-semibold text-slate-800">{entry.month}</td>
                                            <td className="px-6 py-4 text-right text-emerald-600 font-medium privacy-value">+{formatCurrency(inc, baseCurrency)}</td>
                                            <td className="px-6 py-4 text-right text-rose-600 font-medium privacy-value">-{formatCurrency(exp, baseCurrency)}</td>
                                            <td className="px-6 py-4 text-right font-bold text-slate-900 privacy-value">{formatCurrency(netVal, baseCurrency)}</td>
                                            <td className="px-6 py-4">
                                                <div className="flex justify-center items-center gap-3">
                                                    <button className="text-slate-400 hover:text-blue-500" onClick={() => {
                                                        setIsAdding(true); /* Reuse form logic manually or refactor */
                                                    }}>Edit</button>
                                                    <button className="text-slate-400 hover:text-rose-500" onClick={() => handleDeleteEntry(entry.id)}>Delete</button>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
            ) : (
                // --- AUTOPILOT VIEW ---
                <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
                    <div className="bg-blue-50 border border-blue-100 p-6 rounded-2xl flex items-start gap-4">
                        <div className="p-3 bg-white rounded-xl shadow-sm text-blue-600">
                            <Repeat size={24} />
                        </div>
                        <div>
                            <h3 className="font-bold text-blue-900 text-lg">Autopilot Income</h3>
                            <p className="text-blue-700 text-sm mt-1 leading-relaxed">
                                Define your recurring income and expenses here. ClearWorth will use these to calculate your
                                <strong> Wealth Momentum Score™</strong> and help you auto-fill monthly logs.
                            </p>
                        </div>
                        <div className="ml-auto">
                            <button
                                onClick={() => setIsAddingRecurring(true)}
                                className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-medium transition-colors shadow-lg shadow-blue-200"
                            >
                                <Plus size={20} />
                                Add Item
                            </button>
                        </div>
                    </div>

                    <RecurringList
                        transactions={recurring}
                        onEdit={setEditingRecurring}
                        onDelete={handleDeleteRecurring}
                        onToggle={handleToggleRecurring}
                        currencyCode={baseCurrency}
                    />

                    {/* Editor Modal */}
                    {(isAddingRecurring || editingRecurring) && (
                        <RecurringTransactionForm
                            initialData={editingRecurring}
                            onSave={handleSaveRecurring}
                            onCancel={() => {
                                setIsAddingRecurring(false);
                                setEditingRecurring(null);
                            }}
                        />
                    )}
                </div>
            )}
        </div>
    );
}
