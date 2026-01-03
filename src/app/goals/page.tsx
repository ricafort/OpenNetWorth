'use client';

import { useState, useEffect } from 'react';
import { Target, Plus, Trophy, Trash2, Edit2, TrendingUp, AlertTriangle } from 'lucide-react';
import { Goal, NetWorthSnapshot } from '@/types';
// import { loadGoals, saveGoals, loadNetWorthHistory } from '@/lib/storage'; // Removed
import { useTheme } from '@/contexts/ThemeContext';
import { useDashboard } from '@/contexts/DashboardContext';
import { useProfile } from '@/contexts/ProfileContext'; // Added
import { formatCurrency, convertAmount } from '@/lib/currencyService';

export default function GoalsPage() {
    // const [goals, setGoals] = useState<Goal[]>([]); // Removed local state
    const { goals, addGoal, updateGoal, deleteGoal } = useProfile(); // Use ProfileContext

    const [isAdding, setIsAdding] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const { isPrivacyBlur } = useTheme();
    const { netWorth, baseCurrency } = useDashboard();
    const blurClass = 'privacy-value';
    const softBlurClass = isPrivacyBlur ? 'opacity-20 blur-[2px] pointer-events-none transition-all duration-500' : 'transition-all duration-500';

    // useEffect(() => { ... }, []); // Removed local load effect

    const handleAddGoal = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        const formData = new FormData(e.currentTarget);
        const type = formData.get('category') as string;
        const target = parseFloat(formData.get('targetAmount') as string) || 0;

        // Auto-set current amount if it's a Net Worth goal
        const current = type === 'net_worth' ? netWorth : parseFloat(formData.get('currentAmount') as string) || 0;

        const newGoal: Goal = {
            id: crypto.randomUUID(),
            name: formData.get('name') as string,
            targetAmount: target,
            currentAmount: current,
            currency: baseCurrency, // Save formatted in current base currency
            deadline: formData.get('deadline') as string,
            category: type as any,
            createdAt: new Date().toISOString(),
            // Set startAmount to currentAmount for tracking progress from this point
            startAmount: current
        };

        await addGoal(newGoal);
        setIsAdding(false);
    };

    const handleUpdateGoal = async (e: React.FormEvent<HTMLFormElement>, id: string) => {
        e.preventDefault();
        const formData = new FormData(e.currentTarget);
        const type = formData.get('category') as string;
        const target = parseFloat(formData.get('targetAmount') as string) || 0;
        const current = type === 'net_worth' ? netWorth : parseFloat(formData.get('currentAmount') as string) || 0;

        const existing = goals.find(g => g.id === id);
        if (!existing) return;

        const updatedGoal: Goal = {
            ...existing,
            name: formData.get('name') as string,
            category: type as any,
            targetAmount: target,
            currentAmount: current,
            currency: baseCurrency,
            deadline: formData.get('deadline') as string
        };

        await updateGoal(updatedGoal);
        setEditingId(null);
    };

    const handleDelete = async (id: string) => {
        if (confirm('Remove this goal?')) {
            await deleteGoal(id);
        }
    };

    const updateProgress = async (id: string, newAmount: number) => {
        const existing = goals.find(g => g.id === id);
        if (!existing) return;

        await updateGoal({
            ...existing,
            currentAmount: newAmount,
            currency: baseCurrency
        });
    };

    return (
        <div className="space-y-8 max-w-5xl mx-auto">
            <div className="flex justify-between items-end">
                <div className={softBlurClass}>
                    <h2 className="text-3xl font-black text-foreground tracking-tight">Financial Goals</h2>
                    <p className="text-muted-foreground mt-2 font-medium">Set targets and track your journey to freedom.</p>
                </div>
                <button
                    onClick={() => setIsAdding(true)}
                    className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-xl font-bold transition-all shadow-lg shadow-primary/10 active:scale-95 hover:opacity-90"
                >
                    <Plus size={20} />
                    New Goal
                </button>
            </div>

            {/* Add Goal Form */}
            {isAdding && (
                <div className="bg-card p-6 rounded-2xl border border-border shadow-sm border-2 animate-in fade-in slide-in-from-top-4 duration-200">
                    <h3 className="text-lg font-semibold mb-4">Create New Goal</h3>
                    <form className="grid grid-cols-1 md:grid-cols-2 gap-6" onSubmit={handleAddGoal}>
                        <div className="space-y-1">
                            <label className="text-sm font-medium text-muted-foreground">Goal Name</label>
                            <input name="name" type="text" placeholder="e.g. Millionaire Status" className="w-full bg-card text-gray-900 dark:text-gray-100 border border-border rounded-lg p-2.5 outline-none focus:ring-2 focus:ring-primary/20" required />
                        </div>
                        <div className="space-y-1">
                            <label className="text-sm font-medium text-muted-foreground">Category</label>
                            <select name="category" className="w-full bg-card text-card-foreground border border-border rounded-lg p-2.5 outline-none focus:ring-2 focus:ring-primary/20">
                                <option value="net_worth">Net Worth Milestone (Auto-tracked)</option>
                                <option value="savings">Savings Target</option>
                                <option value="debt_payoff">Debt Payoff</option>
                                <option value="custom">Custom</option>
                            </select>
                        </div>
                        <div className="space-y-1">
                            <label className="text-sm font-medium text-muted-foreground">Target Amount ({baseCurrency})</label>
                            <input name="targetAmount" type="number" placeholder="100000" className="w-full bg-card text-gray-900 dark:text-gray-100 border border-border rounded-lg p-2.5 outline-none focus:ring-2 focus:ring-primary/20" required />
                        </div>
                        <div className="space-y-1">
                            <label className="text-sm font-medium text-muted-foreground">Deadline (Optional)</label>
                            <input name="deadline" type="date" className="w-full bg-card text-gray-900 dark:text-gray-100 border border-border rounded-lg p-2.5 outline-none focus:ring-2 focus:ring-primary/20" />
                        </div>

                        {/* Note: Current amount is hidden for Net Worth goals in a real app, 
                            but for simplicity we handle it in logic. 
                            Users can manual overrides for other types. */}

                        <div className="md:col-span-2 flex items-center justify-end gap-3 pt-2">
                            <button type="button" onClick={() => setIsAdding(false)} className="px-4 py-2 text-muted-foreground hover:text-foreground font-medium">Cancel</button>
                            <button type="submit" className="px-6 py-2 bg-primary text-primary-foreground rounded-lg font-bold hover:opacity-90 transition-all">Create Goal</button>
                        </div>
                    </form>
                </div>
            )}

            {/* Goals List */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {goals.length === 0 ? (
                    <div className="md:col-span-2 py-16 text-center bg-muted/30 rounded-3xl border border-dashed border-border">
                        <Trophy size={48} className="mx-auto text-muted-foreground/30 mb-4" />
                        <h3 className="text-xl font-black text-foreground">No goals set yet</h3>
                        <p className="text-muted-foreground">Start by defining what you want to achieve.</p>
                    </div>
                ) : goals.map(goal => {
                    // Logic to ensure values are in Base Currency for display

                    // 1. Target Value
                    const targetVal = convertAmount(goal.targetAmount, goal.currency || 'USD', baseCurrency);

                    // 2. Current Value
                    let currentVal = 0;
                    if (goal.category === 'net_worth') {
                        // Net Worth from context is already in Base Currency
                        currentVal = netWorth;
                    } else {
                        // Convert manual current amount
                        currentVal = convertAmount(goal.currentAmount || 0, goal.currency || 'USD', baseCurrency);
                    }

                    // Determine if Debt Goal (inverse logic)
                    const isDebt = goal.category === 'debt_payoff';

                    // Start Value for progress calc (also convert)
                    const startVal = convertAmount(goal.startAmount || 0, goal.currency || 'USD', baseCurrency);

                    let progress = 0;
                    if (isDebt) {
                        // For debt: Progress is how much we've paid down from the start
                        // If startAmount is missing (old data), assume 0% progress unless completed

                        // We use the converted values for calculation to ensure consistent scale
                        const effectiveStart = startVal || Math.max(currentVal, targetVal);
                        const totalToPay = effectiveStart - targetVal;
                        const paidSoFar = effectiveStart - currentVal;

                        if (totalToPay > 0) {
                            progress = (paidSoFar / totalToPay) * 100;
                        }
                    } else {
                        // For savings/investing: Progress is current / target
                        if (targetVal > 0) {
                            progress = (currentVal / targetVal) * 100;
                        }
                    }
                    progress = Math.min(100, Math.max(0, progress));

                    // Completion check
                    const isCompleted = isDebt ? currentVal <= targetVal : currentVal >= targetVal;

                    // Check for deadline warning: < 90% progress and deadline within 30 days or passed
                    let isWarning = false;
                    if (goal.deadline && !isCompleted && progress < 90) {
                        const daysLeft = Math.ceil((new Date(goal.deadline).getTime() - new Date().getTime()) / (1000 * 3600 * 24));
                        if (daysLeft <= 30) isWarning = true;
                    }

                    if (editingId === goal.id) {
                        return (
                            <div key={goal.id} className="bg-card p-6 rounded-2xl border border-primary/20 shadow-sm ring-2 ring-primary/10">
                                <h3 className="text-sm font-bold text-primary mb-3">Edit Goal</h3>
                                <form className="space-y-4" onSubmit={(e) => handleUpdateGoal(e, goal.id)}>
                                    <div>
                                        <label className="text-xs font-bold text-muted-foreground">Name</label>
                                        <input name="name" defaultValue={goal.name} className="w-full bg-background text-foreground border border-input rounded px-2 py-1.5 text-sm" />
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            {/* Note: In edit mode, we show/edit raw values? 
                                                OR we show converted? 
                                                If we show converted, we must save as new currency. 
                                                Given we update currency to baseCurrency on save, showing converted (targetVal) makes sense.
                                            */}
                                            <label className="text-xs font-bold text-muted-foreground">Target ({baseCurrency})</label>
                                            <input name="targetAmount" type="number" defaultValue={targetVal} className="w-full bg-background text-foreground border border-input rounded px-2 py-1.5 text-sm" />
                                        </div>
                                        <div>
                                            <label className="text-xs font-bold text-muted-foreground">Current ({baseCurrency})</label>
                                            <input name="currentAmount" type="number" defaultValue={currentVal} disabled={goal.category === 'net_worth'} className="w-full bg-background text-foreground border border-input rounded px-2 py-1.5 text-sm disabled:opacity-50" />
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="text-xs font-bold text-muted-foreground">Category</label>
                                            <select name="category" defaultValue={goal.category} className="w-full bg-background text-foreground border border-input rounded px-2 py-1.5 text-sm">
                                                <option value="net_worth">Net Worth</option>
                                                <option value="savings">Savings</option>
                                                <option value="debt_payoff">Debt Payoff</option>
                                                <option value="custom">Custom</option>
                                            </select>
                                        </div>
                                        <div>
                                            <label className="text-xs font-bold text-muted-foreground">Deadline</label>
                                            <input name="deadline" type="date" defaultValue={goal.deadline} className="w-full bg-background text-foreground border border-input rounded px-2 py-1.5 text-sm" />
                                        </div>
                                    </div>
                                    <div className="flex gap-2 justify-end pt-2">
                                        <button type="button" onClick={() => setEditingId(null)} className="px-3 py-1.5 text-xs font-bold text-slate-500 bg-slate-100 rounded hover:bg-slate-200">Cancel</button>
                                        <button type="submit" className="px-3 py-1.5 text-xs font-bold text-white bg-blue-600 rounded hover:bg-blue-700">Save Changes</button>
                                    </div>
                                </form>
                            </div>
                        );
                    }

                    return (
                        <div key={goal.id} className="bg-card p-7 rounded-3xl border border-border shadow-sm relative overflow-hidden group hover:shadow-xl hover:shadow-primary/5 transition-all">
                            {isCompleted && (
                                <div className="absolute top-0 right-0 p-2 bg-emerald-100 text-emerald-600 rounded-bl-2xl z-10">
                                    <Trophy size={20} className="animate-bounce" />
                                </div>
                            )}

                            <div className="flex justify-between items-start mb-4">
                                <div>
                                    <div className="flex items-center gap-2 mb-1">
                                        <TrendingUp size={16} className="text-blue-500" />
                                        <span className="text-xs font-bold text-blue-600 uppercase tracking-wider">{goal.category.replace('_', ' ')}</span>
                                        {isWarning && (
                                            <span className="flex items-center gap-1 bg-amber-100 text-amber-700 text-[10px] px-1.5 py-0.5 rounded-full font-bold ml-1">
                                                <AlertTriangle size={10} />
                                                At Risk
                                            </span>
                                        )}
                                    </div>
                                    <h3 className="text-xl font-black text-foreground">{goal.name}</h3>
                                </div>
                                <div className="flex gap-1 opacity-100 md:opacity-0 group-hover:opacity-100 transition-opacity">
                                    <button onClick={() => setEditingId(goal.id)} className="p-2 text-slate-300 hover:text-blue-500 transition-colors">
                                        <Edit2 size={16} />
                                    </button>
                                    <button onClick={() => handleDelete(goal.id)} className="p-2 text-slate-300 hover:text-rose-500 transition-colors">
                                        <Trash2 size={16} />
                                    </button>
                                </div>
                            </div>

                            <div className="space-y-4">
                                <div>
                                    <div className="flex justify-between text-xs font-black mb-2 uppercase tracking-widest">
                                        <span className="text-muted-foreground opacity-70">Progress</span>
                                        <span className="text-foreground">{progress.toFixed(1)}%</span>
                                    </div>
                                    <div className="h-3 bg-slate-100 rounded-full overflow-hidden">
                                        <div
                                            className={`h-full rounded-full transition-all duration-1000 ${isCompleted ? 'bg-emerald-500' : 'bg-blue-600'}`}
                                            style={{ width: `${progress}%` }}
                                        />
                                    </div>
                                </div>

                                <div className="flex justify-between items-baseline">
                                    <div className="text-xs font-black text-muted-foreground uppercase tracking-wider">
                                        Target: <span className={`text-sm text-foreground ${blurClass}`}>{formatCurrency(targetVal, baseCurrency)}</span>
                                    </div>
                                    <div className={`text-2xl font-black text-foreground tracking-tighter ${blurClass}`}>
                                        {formatCurrency(currentVal, baseCurrency)}
                                    </div>
                                </div>

                                {goal.category !== 'net_worth' && (
                                    <div className="pt-4 border-t border-slate-100">
                                        <label className="text-xs font-medium text-muted-foreground mb-1 block">Update Progress</label>
                                        <div className="flex gap-2">
                                            <input
                                                type="number"
                                                defaultValue={currentVal}
                                                className={`w-full bg-card border border-border rounded-lg px-2 py-1 text-sm outline-none focus:ring-2 focus:ring-primary/20 ${blurClass}`}
                                                onBlur={(e) => updateProgress(goal.id, parseFloat(e.target.value))}
                                                onKeyDown={(e) => {
                                                    if (e.key === 'Enter') {
                                                        updateProgress(goal.id, parseFloat(e.currentTarget.value));
                                                        e.currentTarget.blur();
                                                    }
                                                }}
                                            />
                                        </div>
                                    </div>
                                )}

                                {goal.deadline && (
                                    <p className="text-xs text-slate-400 text-right mt-2">
                                        Deadline: {new Date(goal.deadline).toLocaleDateString()}
                                    </p>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
