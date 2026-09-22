'use client';

import { useState } from 'react';
import { Goal } from '@/features/goals/types';
import { CurrencyCode } from '@/types';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { GoalSchema, GoalFormData } from '@/features/goals/data/schemas';
import { Trophy, Trash2, Edit2, TrendingUp, AlertTriangle } from 'lucide-react';
import { formatCurrency, convertAmount } from '@/lib/utils/currencyService';

interface GoalItemProps {
    goal: Goal;
    netWorth: number;
    baseCurrency: CurrencyCode;
    onUpdate: (updatedGoal: Goal) => Promise<any>;
    onDelete: (id: string) => Promise<any>;
}

export default function GoalItem({ goal, netWorth, baseCurrency, onUpdate, onDelete }: GoalItemProps) {
    const [isEditing, setIsEditing] = useState(false);
    const [editError, setEditError] = useState<string | null>(null);

    // Why this exists: Each financial goal has a native currency representing the actual purchasing power
    // target (e.g., $10,000 USD holiday or $50,000 AUD mortgage offset). Defaults to USD for legacy records.
    // Tricky logic: Storing and calculating in the goal's native currency prevents conversion drift and ensures
    // the user's explicit target is never modified by changing the dashboard base currency (Handover Section 16).
    // TODO: Support multi-currency split targets (e.g. dual AUD/USD goals) when international accounts expand.
    const goalCurrency = (goal.currency || 'USD') as CurrencyCode;

    // --- FORM SETUP (for Edit Mode) ---
    const {
        register,
        handleSubmit,
        watch,
        formState: { errors, isSubmitting }
    } = useForm<GoalFormData>({
        resolver: zodResolver(GoalSchema) as any,
        defaultValues: {
            name: goal.name,
            target_amount: goal.target_amount,
            current_amount: goal.current_amount || 0,
            currency: goalCurrency,
            category: goal.category,
            deadline: goal.deadline || undefined // Goal uses null, Form uses undefined
        }
    });

    const editCategory = watch('category');
    const editCurrency = watch('currency') || goalCurrency;

    const onSubmit = async (data: GoalFormData) => {
        setEditError(null);
        try {
            const selectedCurrency = (data.currency || goalCurrency) as CurrencyCode;
            // If category is net_worth, calculate current amount in the chosen goal currency
            const netWorthInSelectedCurrency = selectedCurrency === baseCurrency
                ? netWorth
                : convertAmount(netWorth, baseCurrency, selectedCurrency);

            await onUpdate({
                ...goal,
                ...data,
                currency: selectedCurrency,
                current_amount: data.category === 'net_worth' ? netWorthInSelectedCurrency : data.current_amount
            } as Goal);
            setIsEditing(false);
        } catch (err: any) {
            // Retain inputs on failure and display actionable error (DATA-03)
            console.error("Failed to update goal", err);
            setEditError(err?.message || 'Failed to update goal');
        }
    };

    // --- DERIVED METRICS ---
    // Why this exists: Progress calculations are strictly performed in native goal currency to ensure that
    // foreign exchange rate shifts do not artificially modify the progress percentage or completion status.
    // Converted amounts in baseCurrency are computed for portfolio-level reference only.
    const currentNativeAmount = goal.category === 'net_worth'
        ? (goalCurrency === baseCurrency ? netWorth : convertAmount(netWorth, baseCurrency, goalCurrency))
        : (goal.current_amount || 0);

    const targetNativeAmount = goal.target_amount;
    const startNativeAmount = goal.start_amount || 0;

    const isDebt = goal.category === 'debt_payoff';

    let progress = 0;
    if (isDebt) {
        const effectiveStart = startNativeAmount || Math.max(currentNativeAmount, targetNativeAmount);
        const totalToPay = effectiveStart - targetNativeAmount;
        const paidSoFar = effectiveStart - currentNativeAmount;
        if (totalToPay > 0) {
            progress = (paidSoFar / totalToPay) * 100;
        }
    } else {
        if (targetNativeAmount > 0) {
            progress = (currentNativeAmount / targetNativeAmount) * 100;
        }
    }
    progress = Math.min(100, Math.max(0, progress));
    const isCompleted = isDebt ? currentNativeAmount <= targetNativeAmount : currentNativeAmount >= targetNativeAmount;

    // Secondary reference conversions for when base currency differs from goal currency
    const isDifferentCurrency = goalCurrency !== baseCurrency;
    const currentValBase = convertAmount(currentNativeAmount, goalCurrency, baseCurrency);
    const targetValBase = convertAmount(targetNativeAmount, goalCurrency, baseCurrency);

    let isWarning = false;
    if (goal.deadline && !isCompleted && progress < 90) {
        const daysLeft = Math.ceil((new Date(goal.deadline).getTime() - new Date().getTime()) / (1000 * 3600 * 24));
        if (daysLeft <= 30) isWarning = true;
    }

    const blurClass = 'privacy-value';

    // Quick Update Handler
    // Why this exists: Users want to quickly update progress on savings/custom goals without opening the full edit form.
    // Tricky logic: MUST preserve goal.currency and operate in native units. Previously it overwrote goal.currency
    // with baseCurrency, corrupting the target amount purchasing power (Handover Section 16 & Batch B2).
    // TODO: Add support for quick "+$500" / "-$500" increment buttons.
    const handleQuickUpdate = async (val: number) => {
        if (isNaN(val)) return;
        await onUpdate({
            ...goal,
            current_amount: val,
            currency: goalCurrency // Preserves native currency intact
        });
    };

    if (isEditing) {
        return (
            <div className="bg-card p-6 rounded-2xl border border-primary/20 shadow-sm ring-2 ring-primary/10">
                <h3 className="text-sm font-bold text-primary mb-3">Edit Goal</h3>
                {editError && (
                    <div role="alert" className="p-3 mb-3 rounded-xl bg-destructive/15 border border-destructive/30 text-destructive text-sm font-medium flex items-center gap-2">
                        <AlertTriangle size={16} className="shrink-0" />
                        <span>{editError}</span>
                    </div>
                )}
                <form className="space-y-4" onSubmit={handleSubmit(onSubmit)}>
                    <div>
                        <label className="text-xs font-bold text-muted-foreground">Name</label>
                        <input {...register('name')} className="w-full bg-background text-foreground border border-input rounded px-2 py-1.5 text-sm" />
                        {errors.name && <p className="text-xs text-red-500">{errors.name.message}</p>}
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="text-xs font-bold text-muted-foreground">Category</label>
                            <select {...register('category')} className="w-full bg-background text-foreground border border-input rounded px-2 py-1.5 text-sm">
                                <option value="net_worth">Net Worth</option>
                                <option value="savings">Savings</option>
                                <option value="debt_payoff">Debt Payoff</option>
                                <option value="custom">Custom</option>
                            </select>
                        </div>
                        <div>
                            <label className="text-xs font-bold text-muted-foreground">Currency</label>
                            <select {...register('currency')} className="w-full bg-background text-foreground border border-input rounded px-2 py-1.5 text-sm">
                                {['AUD', 'USD', 'EUR', 'GBP', 'CAD', 'JPY', 'CHF', 'CNY', 'INR', 'SGD', 'PHP', 'KRW'].map(c => (
                                    <option key={c} value={c}>{c}</option>
                                ))}
                            </select>
                        </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="text-xs font-bold text-muted-foreground">Target ({editCurrency})</label>
                            <input type="number" step="0.01" {...register('target_amount')} className="w-full bg-background text-foreground border border-input rounded px-2 py-1.5 text-sm" />
                            {errors.target_amount && <p className="text-xs text-red-500">{errors.target_amount.message}</p>}
                        </div>
                        <div>
                            <label className="text-xs font-bold text-muted-foreground">Current ({editCurrency})</label>
                            <input type="number" step="0.01" {...register('current_amount')} disabled={editCategory === 'net_worth'} className="w-full bg-background text-foreground border border-input rounded px-2 py-1.5 text-sm disabled:opacity-50" />
                        </div>
                    </div>
                    <div>
                        <label className="text-xs font-bold text-muted-foreground">Deadline</label>
                        <input type="date" {...register('deadline')} className="w-full bg-background text-foreground border border-input rounded px-2 py-1.5 text-sm" />
                    </div>
                    <div className="flex gap-2 justify-end pt-2">
                        <button type="button" onClick={() => setIsEditing(false)} className="px-3 py-1.5 text-xs font-bold text-slate-500 bg-slate-100 rounded hover:bg-slate-200 cursor-pointer">Cancel</button>
                        <button type="submit" disabled={isSubmitting} className="px-3 py-1.5 text-xs font-bold text-white bg-blue-600 rounded hover:bg-blue-700 cursor-pointer">
                            {isSubmitting ? 'Saving...' : 'Save Changes'}
                        </button>
                    </div>
                </form>
            </div>
        );
    }

    return (
        <div className="bg-card p-7 rounded-3xl border border-border shadow-sm relative overflow-hidden group hover:shadow-xl hover:shadow-primary/5 transition-all">
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
                    <button
                        onClick={() => setIsEditing(true)}
                        aria-label={`Edit goal ${goal.name}`}
                        title={`Edit ${goal.name}`}
                        className="p-2 text-slate-400 hover:text-blue-500 rounded hover:bg-muted transition-colors cursor-pointer"
                    >
                        <Edit2 size={16} />
                    </button>
                    <button
                        onClick={() => onDelete(goal.id)}
                        aria-label={`Delete goal ${goal.name}`}
                        title={`Delete ${goal.name}`}
                        className="p-2 text-slate-400 hover:text-rose-500 rounded hover:bg-muted transition-colors cursor-pointer"
                    >
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
                        Target: <span className={`text-sm text-foreground ${blurClass}`}>{formatCurrency(targetNativeAmount, goalCurrency)}</span>
                        {isDifferentCurrency && (
                            <span className="text-[11px] text-muted-foreground font-normal ml-1">
                                (≈ {formatCurrency(targetValBase, baseCurrency)})
                            </span>
                        )}
                    </div>
                    <div className="text-right">
                        <div className={`text-2xl font-black text-foreground tracking-tighter ${blurClass}`}>
                            {formatCurrency(currentNativeAmount, goalCurrency)}
                        </div>
                        {isDifferentCurrency && (
                            <div className="text-xs text-muted-foreground">
                                ≈ {formatCurrency(currentValBase, baseCurrency)}
                            </div>
                        )}
                    </div>
                </div>

                {goal.category !== 'net_worth' && (
                    <div className="pt-4 border-t border-border">
                        <label className="text-xs font-medium text-muted-foreground mb-1 block">
                            Update Progress ({goalCurrency})
                        </label>
                        <div className="flex gap-2">
                            <input
                                type="number"
                                step="0.01"
                                defaultValue={goal.current_amount || 0}
                                className={`w-full bg-card border border-border rounded-lg px-2 py-1 text-sm outline-none focus:ring-2 focus:ring-primary/20 ${blurClass}`}
                                onBlur={(e) => handleQuickUpdate(parseFloat(e.target.value))}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter') {
                                        handleQuickUpdate(parseFloat(e.currentTarget.value));
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
}
