'use client';

import { useState, useEffect } from 'react';
import { Plus, TrendingUp, TrendingDown, DollarSign, Repeat, History } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts';
import { RecurringTransaction, CashFlowEntry } from '@/features/cashflow/types';
import RecurringList from '@/features/cashflow/components/RecurringList';
import RecurringTransactionForm from '@/features/cashflow/components/RecurringTransactionForm';
import { useCashflowQuery } from '@/features/cashflow/hooks/useCashflowQuery';
import { useProfile } from '@/contexts/ProfileContext';
import { formatCurrency, convertAmount } from '@/lib/utils/currencyService';
import { useNetWorth } from '@/features/dashboard/hooks/useNetWorth';

import { PageHeader } from '@/components/common/PageHeader';
import { ContentCard } from '@/components/common/ContentCard';
import { loadCashFlow, persistScopedRecord, deleteScopedRecord } from '@/infrastructure/local_driver';

export const CashflowPage = () => { // Named export
    const { baseCurrency } = useNetWorth();
    const {
        recurring,
        addRecurring: addRecurringContext,
        updateRecurring: updateRecurringContext,
        deleteRecurring: deleteRecurringContext,
        isLoading
    } = useCashflowQuery();
    const { isDemoMode } = useProfile();

    // Shared State
    const [view, setView] = useState<'history' | 'autopilot'>('history');

    // ... history state ...
    const [entries, setEntries] = useState<CashFlowEntry[]>([]);
    const [isAdding, setIsAdding] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [entryError, setEntryError] = useState<string | null>(null);

    // ... autopilot state ...
    const [isAddingRecurring, setIsAddingRecurring] = useState(false);
    const [editingRecurring, setEditingRecurring] = useState<RecurringTransaction | null>(null);

    useEffect(() => {
        /**
         * Load Cash Flow History from authoritative local_driver (DATA-01, DATA-04).
         * 
         * Why this exists:
         * Migrates any legacy records from clearworth_cashflow into opennetworth_cash_flow
         * and SQLite so backups always include monthly figures (Finding 3).
         */
        const existing = loadCashFlow();
        if (existing.length > 0) {
            setEntries(existing.sort((a, b) => a.month.localeCompare(b.month)));
        } else {
            // Check legacy clearworth_cashflow key if present
            const legacy = localStorage.getItem('clearworth_cashflow');
            if (legacy) {
                try {
                    const parsed = JSON.parse(legacy);
                    if (Array.isArray(parsed) && parsed.length > 0) {
                        setEntries(parsed.sort((a, b) => a.month.localeCompare(b.month)));
                        // Migrate each legacy record into SQLite persistence
                        parsed.forEach(item => {
                            persistScopedRecord('cashFlow', item).catch(() => {});
                        });
                    }
                } catch (e) {
                    console.error('Error parsing legacy cash flow:', e);
                }
            } else {
                setEntries([]);
            }
        }
    }, []);

    const handleSaveEntry = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setEntryError(null);
        const formData = new FormData(e.currentTarget);
        const month = formData.get('month') as string;
        const incomeRaw = formData.get('income') as string;
        const expensesRaw = formData.get('expenses') as string;

        const income = parseFloat(incomeRaw);
        const expenses = parseFloat(expensesRaw);

        if (!month || !/^\d{4}-(?:0[1-9]|1[0-2])$/.test(month)) {
            setEntryError('Please specify a valid month in YYYY-MM format.');
            return;
        }

        if (isNaN(income) || income < 0 || isNaN(expenses) || expenses < 0) {
            setEntryError('Income and expenses must be valid non-negative numbers.');
            return;
        }

        /**
         * Why this exists (Finding 4):
         * Reuse existing month ID if logging an already-existing month, preventing ID desync
         * between SQLite and the UI/local cache.
         */
        const existingForMonth = entries.find(e => e.month === month);
        const entryId = editingId || existingForMonth?.id || `cf-${month}`;

        const newEntry: CashFlowEntry = {
            id: entryId,
            month,
            income,
            expenses
        };

        try {
            const saved = await persistScopedRecord('cashFlow', newEntry);
            const persistedEntry = (saved as any)?.item || saved || newEntry;
            const currentEntries = loadCashFlow().filter(e => e.id !== persistedEntry.id && e.month !== persistedEntry.month);
            const updatedEntries = [...currentEntries, persistedEntry].sort((a, b) => a.month.localeCompare(b.month));
            setEntries(updatedEntries);
            setIsAdding(false);
            setEditingId(null);
        } catch (err: any) {
            setEntryError(err.message || 'Failed to save cash flow record to local database.');
        }
    };

    const handleDeleteEntry = async (id: string) => {
        if (confirm('Delete this entry?')) {
            try {
                await deleteScopedRecord('cashFlow', id);
                const updatedEntries = loadCashFlow().sort((a, b) => a.month.localeCompare(b.month));
                setEntries(updatedEntries);
            } catch (err: any) {
                alert(err.message || 'Failed to delete cash flow record.');
            }
        }
    };

    const handleSaveRecurring = async (t: RecurringTransaction) => {
        const transactionToSave = {
            ...t,
            id: t.id || crypto.randomUUID(),
            currency: t.currency || baseCurrency,
            end_date: t.end_date || undefined // Let repo handle null conversion
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
            await updateRecurringContext({ ...item, is_active: !item.is_active });
        }
    };

    // --- Derived Metrics ---
    const latest = entries[entries.length - 1] || { income: 0, expenses: 0 };
    const latestIncome = convertAmount(latest.income, 'USD', baseCurrency);
    const latestExpenses = convertAmount(latest.expenses, 'USD', baseCurrency);
    const net = latestIncome - latestExpenses;
    const savingsRate = latestIncome > 0 ? (net / latestIncome) * 100 : 0;
    const chartData = entries.map(e => ({
        ...e,
        income: convertAmount(e.income, 'USD', baseCurrency),
        expenses: convertAmount(e.expenses, 'USD', baseCurrency)
    }));

    return (
        <div className="space-y-8 max-w-5xl mx-auto">
            {/* Header & Tabs */}
            <PageHeader
                title="Cash Flow"
                description="Master your inflows and outflows."
                action={
                    <div className="flex bg-slate-100 p-1 rounded-xl">
                        <button
                            onClick={() => setView('history')}
                            className={`px-4 py-2 rounded-lg font-bold text-sm transition-all flex items-center gap-2 ${view === 'history' ? 'bg-card shadow text-foreground' : 'text-muted-foreground hover:text-muted-foreground'}`}
                        >
                            <History size={16} />
                            History
                        </button>
                        <button
                            onClick={() => setView('autopilot')}
                            className={`px-4 py-2 rounded-lg font-bold text-sm transition-all flex items-center gap-2 ${view === 'autopilot' ? 'bg-card shadow text-blue-600' : 'text-muted-foreground hover:text-muted-foreground'}`}
                        >
                            <Repeat size={16} />
                            Autopilot
                        </button>
                    </div>
                }
            />

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

                    {isAdding && (() => {
                        const editingEntry = editingId ? entries.find(e => e.id === editingId) : null;
                        return (
                            <ContentCard className="border-emerald-100 shadow-sm border-2 animate-in fade-in slide-in-from-top-4 duration-200">
                                <h3 className="text-lg font-semibold mb-4 text-emerald-900">
                                    {editingEntry ? 'Edit Cash Flow' : 'Log Income & Expenses'}
                                </h3>
                                {entryError && (
                                    <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl font-medium">
                                        {entryError}
                                    </div>
                                )}
                                <form className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end" onSubmit={handleSaveEntry}>
                                    <div className="space-y-1">
                                        <label htmlFor="cf-month" className="text-sm font-medium text-muted-foreground">Month</label>
                                        <input id="cf-month" name="month" type="month" defaultValue={editingEntry?.month || new Date().toISOString().slice(0, 7)} className="w-full bg-muted border border-border rounded-lg p-2 outline-none focus:ring-2 focus:ring-emerald-500" required />
                                    </div>
                                    <div className="space-y-1">
                                        <label htmlFor="cf-income" className="text-sm font-medium text-muted-foreground">Total Income ({baseCurrency})</label>
                                        <input id="cf-income" name="income" type="number" step="0.01" defaultValue={editingEntry?.income ?? ''} placeholder="0.00" className="w-full bg-muted border border-border rounded-lg p-2 outline-none focus:ring-2 focus:ring-emerald-500" required />
                                    </div>
                                    <div className="space-y-1">
                                        <label htmlFor="cf-expenses" className="text-sm font-medium text-muted-foreground">Total Expenses ({baseCurrency})</label>
                                        <input id="cf-expenses" name="expenses" type="number" step="0.01" defaultValue={editingEntry?.expenses ?? ''} placeholder="0.00" className="w-full bg-muted border border-border rounded-lg p-2 outline-none focus:ring-2 focus:ring-emerald-500" required />
                                    </div>
                                    <div className="flex gap-2">
                                        <button type="submit" className="flex-1 bg-slate-900 text-white rounded-lg p-2 font-medium hover:bg-slate-800 transition-colors">Save</button>
                                        <button type="button" onClick={() => { setIsAdding(false); setEditingId(null); setEntryError(null); }} className="px-4 py-2 text-muted-foreground hover:text-muted-foreground font-medium">Cancel</button>
                                    </div>
                                </form>
                            </ContentCard>
                        );
                    })()}

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
                                    formatter={(val: number | string | undefined) => formatCurrency(Number(val || 0), baseCurrency)}
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
                                                    <button
                                                        className="text-slate-400 hover:text-blue-500"
                                                        aria-label={`Edit cash flow entry for ${entry.month}`}
                                                        onClick={() => {
                                                            setIsAdding(true);
                                                            setEditingId(entry.id);
                                                            setEntryError(null);
                                                        }}
                                                    >Edit</button>
                                                    <button
                                                        className="text-slate-400 hover:text-rose-500"
                                                        aria-label={`Delete cash flow entry for ${entry.month}`}
                                                        onClick={() => handleDeleteEntry(entry.id)}
                                                    >Delete</button>
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
