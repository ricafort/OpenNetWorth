'use client';

import { useState, useEffect } from 'react';
import { Target, Plus, Trophy, Trash2, Edit2, TrendingUp, AlertTriangle } from 'lucide-react';
import { Goal } from '@/features/goals/types';
import { useTheme } from '@/contexts/ThemeContext';
import { useNetWorth } from '@/features/dashboard/hooks/useNetWorth';
import { useGoalsQuery } from '@/features/goals/hooks/useGoalsQuery';
import { useForm, Resolver } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { GoalSchema, GoalFormData } from '@/features/goals/data/schemas';
import { formatCurrency, convertAmount } from '@/lib/utils/currencyService';
import GoalItem from '@/features/goals/components/GoalItem';

// Duplicate import removed

import { PageHeader } from '@/components/common/PageHeader';
import { ContentCard } from '@/components/common/ContentCard';

export const GoalsPage = () => {
    // ... existing hooks ...
    const { goals, addGoal, updateGoal, deleteGoal, isLoading } = useGoalsQuery();
    const [isAdding, setIsAdding] = useState(false);
    const { isPrivacyBlur } = useTheme();
    const { netWorth, baseCurrency } = useNetWorth();
    const softBlurClass = isPrivacyBlur ? 'opacity-20 blur-[2px] pointer-events-none transition-all duration-500' : 'transition-all duration-500';

    // ... form ...
    const {
        register,
        handleSubmit,
        watch,
        setValue,
        reset,
        formState: { errors, isSubmitting }
    } = useForm<GoalFormData>({
        resolver: zodResolver(GoalSchema) as unknown as Resolver<GoalFormData>,
        defaultValues: {
            name: '',
            target_amount: 0,
            current_amount: 0,
            currency: baseCurrency,
            category: 'savings'
        }
    });

    const category = watch('category');

    useEffect(() => {
        if (category === 'net_worth') {
            setValue('current_amount', netWorth);
        }
    }, [category, netWorth, setValue]);

    const handleAddGoal = async (data: GoalFormData) => {
        // ... submit logic ...
        const newGoal: Goal = {
            id: crypto.randomUUID(),
            name: data.name,
            target_amount: data.target_amount,
            current_amount: data.category === 'net_worth' ? netWorth : data.current_amount,
            currency: baseCurrency,
            deadline: data.deadline ? data.deadline : null, // Send null if empty string
            category: data.category,
            created_at: new Date().toISOString(),
            start_amount: data.category === 'net_worth' ? netWorth : data.current_amount
        };

        await addGoal(newGoal);
        setIsAdding(false);
        reset();
    };

    return (
        <div className="space-y-8 max-w-5xl mx-auto">
            <PageHeader
                title="Financial Goals"
                description="Set targets and track your journey to freedom."
                action={
                    <button
                        onClick={() => setIsAdding(true)}
                        className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-xl font-bold transition-all shadow-lg shadow-primary/10 active:scale-95 hover:opacity-90"
                    >
                        <Plus size={20} />
                        New Goal
                    </button>
                }
            />

            {/* Add Goal Form */}
            {isAdding && (
                <ContentCard className="border-2 animate-in fade-in slide-in-from-top-4 duration-200">
                    <h3 className="text-lg font-semibold mb-4">Create New Goal</h3>
                    <form className="grid grid-cols-1 md:grid-cols-2 gap-6" onSubmit={handleSubmit(handleAddGoal)}>
                        <div className="space-y-1">
                            <label className="text-sm font-medium text-muted-foreground">Goal Name</label>
                            <input
                                placeholder="e.g. Millionaire Status"
                                {...register('name')}
                                className={`w-full bg-card text-foreground border rounded-lg p-2.5 outline-none focus:ring-2 focus:ring-primary/20 ${errors.name ? 'border-red-500' : 'border-border'}`}
                            />
                            {errors.name && <p className="text-xs text-red-500">{errors.name.message}</p>}
                        </div>
                        <div className="space-y-1">
                            <label className="text-sm font-medium text-muted-foreground">Category</label>
                            <select
                                {...register('category')}
                                className="w-full bg-card text-card-foreground border border-border rounded-lg p-2.5 outline-none focus:ring-2 focus:ring-primary/20"
                            >
                                <option value="net_worth">Net Worth Milestone (Auto-tracked)</option>
                                <option value="savings">Savings Target</option>
                                <option value="debt_payoff">Debt Payoff</option>
                                <option value="custom">Custom</option>
                            </select>
                        </div>
                        <div className="space-y-1">
                            <label className="text-sm font-medium text-muted-foreground">Target Amount ({baseCurrency})</label>
                            <input
                                type="number"
                                placeholder="100000"
                                {...register('target_amount')}
                                className={`w-full bg-card text-foreground border rounded-lg p-2.5 outline-none focus:ring-2 focus:ring-primary/20 ${errors.target_amount ? 'border-red-500' : 'border-border'}`}
                            />
                            {errors.target_amount && <p className="text-xs text-red-500">{errors.target_amount.message}</p>}
                        </div>
                        <div className="space-y-1">
                            <label className="text-sm font-medium text-muted-foreground">Deadline (Optional)</label>
                            <input
                                type="date"
                                {...register('deadline')}
                                className="w-full bg-card text-foreground border border-border rounded-lg p-2.5 outline-none focus:ring-2 focus:ring-primary/20"
                            />
                        </div>

                        {/* Current amount is handled automatically for Net Worth */}

                        <div className="md:col-span-2 flex items-center justify-end gap-3 pt-2">
                            <button type="button" onClick={() => setIsAdding(false)} className="px-4 py-2 text-muted-foreground hover:text-foreground font-medium">Cancel</button>
                            <button type="submit" disabled={isSubmitting} className="px-6 py-2 bg-primary text-primary-foreground rounded-lg font-bold hover:opacity-90 transition-all">
                                {isSubmitting ? 'Creating...' : 'Create Goal'}
                            </button>
                        </div>
                    </form>
                </ContentCard>
            )}

            {/* Goals List */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {goals.length === 0 && !isLoading ? (
                    <div className="md:col-span-2 py-16 text-center bg-muted/30 rounded-3xl border border-dashed border-border">
                        <Trophy size={48} className="mx-auto text-muted-foreground/30 mb-4" />
                        <h3 className="text-xl font-black text-foreground">No goals set yet</h3>
                        <p className="text-muted-foreground">Start by defining what you want to achieve.</p>
                    </div>
                ) : (
                    goals.map(goal => (
                        <GoalItem
                            key={goal.id}
                            goal={goal}
                            netWorth={netWorth}
                            baseCurrency={baseCurrency}
                            onUpdate={updateGoal}
                            onDelete={deleteGoal}
                        />
                    ))
                )}
            </div>
        </div>
    );
}
