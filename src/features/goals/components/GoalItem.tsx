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

    // --- FORM SETUP (for Edit Mode) ---
    const {
        register,
        handleSubmit,
        formState: { errors, isSubmitting }
    } = useForm<GoalFormData>({
        resolver: zodResolver(GoalSchema) as any,
        defaultValues: {
            ...goal,
            // Ensure inputs use the converted values or stored values?
            // The existing page uses converted values for display in inputs.
            // If we edit, we should probably edit in base currency OR store currency.
            // GoalSchema has 'currency'. If we stick to stored currency, that's safest.
            // But UI displays in baseCurrency.
            // Let's stick to the pattern: Edit form shows values in Base Currency (if consistent with Page logic)
            // Actually, best practice: Edit values as stored in `goal.currency`.
            // BUT the original page converted everything to `baseCurrency`.
            // Let's follow the original page Logic: "values are in Base Currency for display".
            // We'll init form with converting values if needed, but careful about saving back.
            // Simplest: init with goal values, let user edit, save back.
            // If goal.currency != baseCurrency, we might want to convert for the user?
            // The original page did: defaultValue={targetVal} (converted).
            // So we should load converted values into the form.
            target_amount: convertAmount(goal.target_amount, goal.currency || 'USD', baseCurrency),
            current_amount: goal.category === 'net_worth' ? netWorth : convertAmount(goal.current_amount || 0, goal.currency || 'USD', baseCurrency),
            start_amount: convertAmount(goal.start_amount || 0, goal.currency || 'USD', baseCurrency),
            currency: baseCurrency, // We switch to baseCurrency on save
            deadline: goal.deadline || undefined // Fix: Goal uses null, Form uses undefined
        }
    });

    const onSubmit = async (data: GoalFormData) => {
        await onUpdate({
            ...goal,
            ...data,
            // Ensure we save with the currency we displayed/edited in
            current_amount: data.category === 'net_worth' ? netWorth : data.current_amount
        } as Goal); // Cast needed if Schema differs slightly from Type (it shouldn't)
        setIsEditing(false);
    };

    // --- DERIVED METRICS ---
    const targetVal = convertAmount(goal.target_amount, goal.currency || 'USD', baseCurrency);

    let currentVal = 0;
    if (goal.category === 'net_worth') {
        currentVal = netWorth;
    } else {
        currentVal = convertAmount(goal.current_amount || 0, goal.currency || 'USD', baseCurrency);
    }

    const isDebt = goal.category === 'debt_payoff';
    const startVal = convertAmount(goal.start_amount || 0, goal.currency || 'USD', baseCurrency);

    let progress = 0;
    if (isDebt) {
        const effectiveStart = startVal || Math.max(currentVal, targetVal);
        const totalToPay = effectiveStart - targetVal;
        const paidSoFar = effectiveStart - currentVal;
        if (totalToPay > 0) {
            progress = (paidSoFar / totalToPay) * 100;
        }
    } else {
        if (targetVal > 0) {
            progress = (currentVal / targetVal) * 100;
        }
    }
    progress = Math.min(100, Math.max(0, progress));
    const isCompleted = isDebt ? currentVal <= targetVal : currentVal >= targetVal;

    let isWarning = false;
    if (goal.deadline && !isCompleted && progress < 90) {
        const daysLeft = Math.ceil((new Date(goal.deadline).getTime() - new Date().getTime()) / (1000 * 3600 * 24));
        if (daysLeft <= 30) isWarning = true;
    }

    const blurClass = 'privacy-value';

    // Quick Update Handler
    const handleQuickUpdate = async (val: number) => {
        if (isNaN(val)) return;
        await onUpdate({
            ...goal,
            current_amount: val,
            currency: baseCurrency // Update to current base since we're inputting in base
        });
    };

    if (isEditing) {
        return (
            <div className="bg-card p-6 rounded-2xl border border-primary/20 shadow-sm ring-2 ring-primary/10">
                <h3 className="text-sm font-bold text-primary mb-3">Edit Goal</h3>
                <form className="space-y-4" onSubmit={handleSubmit(onSubmit)}>
                    <div>
                        <label className="text-xs font-bold text-muted-foreground">Name</label>
                        <input {...register('name')} className="w-full bg-background text-foreground border border-input rounded px-2 py-1.5 text-sm" />
                        {errors.name && <p className="text-xs text-red-500">{errors.name.message}</p>}
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="text-xs font-bold text-muted-foreground">Target ({baseCurrency})</label>
                            <input type="number" step="0.01" {...register('target_amount')} className="w-full bg-background text-foreground border border-input rounded px-2 py-1.5 text-sm" />
                        </div>
                        <div>
                            <label className="text-xs font-bold text-muted-foreground">Current ({baseCurrency})</label>
                            <input type="number" step="0.01" {...register('current_amount')} disabled={goal.category === 'net_worth'} className="w-full bg-background text-foreground border border-input rounded px-2 py-1.5 text-sm disabled:opacity-50" />
                        </div>
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
                            <label className="text-xs font-bold text-muted-foreground">Deadline</label>
                            <input type="date" {...register('deadline')} className="w-full bg-background text-foreground border border-input rounded px-2 py-1.5 text-sm" />
                        </div>
                    </div>
                    <div className="flex gap-2 justify-end pt-2">
                        <button type="button" onClick={() => setIsEditing(false)} className="px-3 py-1.5 text-xs font-bold text-slate-500 bg-slate-100 rounded hover:bg-slate-200">Cancel</button>
                        <button type="submit" disabled={isSubmitting} className="px-3 py-1.5 text-xs font-bold text-white bg-blue-600 rounded hover:bg-blue-700">
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
                    <button onClick={() => setIsEditing(true)} className="p-2 text-slate-300 hover:text-blue-500 transition-colors">
                        <Edit2 size={16} />
                    </button>
                    <button onClick={() => onDelete(goal.id)} className="p-2 text-slate-300 hover:text-rose-500 transition-colors">
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
