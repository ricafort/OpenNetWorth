'use client';

import { RecurringTransaction } from '@/types';
import { toMonthlyAmount } from '@/lib/storage';
import { Edit2, Trash2, Power } from 'lucide-react';

interface Props {
    transactions: RecurringTransaction[];
    onEdit: (t: RecurringTransaction) => void;
    onDelete: (id: string) => void;
    onToggle: (id: string) => void; // Toggle isActive
}

export default function RecurringList({ transactions, onEdit, onDelete, onToggle }: Props) {
    const income = transactions.filter(t => t.type === 'income');
    const expenses = transactions.filter(t => t.type === 'expense');

    const totalRecurringIncome = income
        .filter(t => t.isActive)
        .reduce((sum, t) => sum + toMonthlyAmount(t.amount, t.frequency), 0);

    const totalRecurringExpenses = expenses
        .filter(t => t.isActive)
        .reduce((sum, t) => sum + toMonthlyAmount(t.amount, t.frequency), 0);

    const renderList = (items: RecurringTransaction[], title: string, total: number, colorClass: string) => (
        <div className="bg-muted rounded-2xl p-4 md:p-6 border border-border">
            <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold text-muted-foreground uppercase text-xs tracking-wider">{title}</h3>
                <span className={`font-black font-mono ${colorClass} privacy-value`}>
                    ${total.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}/mo
                </span>
            </div>

            <div className="space-y-3">
                {items.length === 0 ? (
                    <p className="text-sm text-slate-400 italic">No recurring items added.</p>
                ) : (
                    items.map(t => (
                        <div key={t.id} className={`flex items-center gap-3 p-3 bg-white rounded-xl border transition-all ${t.isActive ? 'border-slate-200 shadow-sm' : 'border-border opacity-60 grayscale'}`}>
                            {/* Toggle */}
                            <button
                                onClick={() => onToggle(t.id)}
                                className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors ${t.isActive ? 'bg-blue-100 text-blue-600' : 'bg-slate-100 text-slate-400'}`}
                                title={t.isActive ? 'Deactivate' : 'Activate'}
                            >
                                <Power size={14} />
                            </button>

                            {/* Info */}
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center justify-between">
                                    <span className="font-bold text-slate-900 truncate">{t.name}</span>
                                    <span className="font-bold text-slate-900">${t.amount.toLocaleString()}</span>
                                </div>
                                <div className="flex items-center justify-between text-xs text-muted-foreground">
                                    <span className="capitalize">{t.frequency} • {t.category}</span>
                                    {t.frequency !== 'monthly' && (
                                        <span className="text-slate-400">
                                            (${Math.round(toMonthlyAmount(t.amount, t.frequency)).toLocaleString()}/mo)
                                        </span>
                                    )}
                                </div>
                            </div>

                            {/* Actions */}
                            <div className="flex items-center gap-1 border-l border-border pl-2">
                                <button onClick={() => onEdit(t)} className="p-1.5 hover:bg-muted text-slate-400 hover:text-blue-500 rounded-lg transition-colors">
                                    <Edit2 size={14} />
                                </button>
                                <button onClick={() => onDelete(t.id)} className="p-1.5 hover:bg-red-50 text-slate-400 hover:text-red-500 rounded-lg transition-colors">
                                    <Trash2 size={14} />
                                </button>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {renderList(income, 'Recurring Income', totalRecurringIncome, 'text-emerald-600')}
            {renderList(expenses, 'Recurring Expenses', totalRecurringExpenses, 'text-red-500')}
        </div>
    );
}
