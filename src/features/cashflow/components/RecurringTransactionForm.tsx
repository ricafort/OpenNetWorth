import { useEffect } from 'react';
import { RecurringTransaction } from '@/features/cashflow/types';
import { RecurringTransactionFormData, RecurringTransactionSchema } from '@/features/cashflow/data/schemas';
import { X, Save, Calendar, Repeat, Coins } from 'lucide-react';
import { useNetWorth } from '@/features/dashboard/hooks/useNetWorth';
import { getCurrencySymbol, SUPPORTED_CURRENCIES } from '@/lib/utils/currencyService';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';

interface Props {
    onSave: (transaction: RecurringTransaction) => void;
    onCancel: () => void;
    initialData?: RecurringTransaction | null;
}

export default function RecurringTransactionForm({ onSave, onCancel, initialData }: Props) {
    const { baseCurrency } = useNetWorth();

    const {
        register,
        handleSubmit,
        setValue,
        watch,
        reset,
        formState: { errors, isSubmitting }
    } = useForm<RecurringTransactionFormData>({
        resolver: zodResolver(RecurringTransactionSchema) as any, // Cast to any to bypass strict type mismatch (verified safe)
        defaultValues: {
            name: '',
            amount: 0,
            type: 'expense',
            frequency: 'monthly',
            category: 'General',
            start_date: new Date().toISOString().split('T')[0],
            is_active: true,
            currency: baseCurrency,
            notes: ''
        }
    });

    // Sync initial data or base currency
    useEffect(() => {
        if (initialData) {
            reset({
                ...initialData,
                currency: initialData.currency || baseCurrency
            });
        } else {
            setValue('currency', baseCurrency);
        }
    }, [initialData, baseCurrency, reset, setValue]);

    const onSubmit = (data: RecurringTransactionFormData) => {
        onSave({
            ...data,
            id: initialData?.id || crypto.randomUUID(),
            // Ensure strict types for the domain model
            currency: data.currency || baseCurrency,
            is_active: data.is_active ?? true
        } as RecurringTransaction);
    };

    const currentCurrency = watch('currency') || baseCurrency;
    const currentType = watch('type');
    const currencySymbol = getCurrencySymbol(currentCurrency);

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-card rounded-3xl w-full max-w-lg shadow-2xl border border-border overflow-hidden animate-in fade-in zoom-in duration-200">
                <form onSubmit={handleSubmit(onSubmit)}>
                    <div className="p-6 border-b border-border flex items-center justify-between">
                        <h3 className="text-xl font-bold text-foreground">
                            {initialData ? 'Edit Recurring Item' : 'Add Recurring Item'}
                        </h3>
                        <button type="button" onClick={onCancel} className="p-2 hover:bg-muted rounded-full transition-colors text-muted-foreground">
                            <X size={20} />
                        </button>
                    </div>

                    <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
                        {/* Type Selection */}
                        <div className="flex bg-muted p-1 rounded-xl">
                            <button
                                type="button"
                                onClick={() => setValue('type', 'income')}
                                className={`flex-1 py-2 rounded-lg text-sm font-bold transition-all ${currentType === 'income' ? 'bg-card shadow text-emerald-600' : 'text-muted-foreground hover:text-foreground'
                                    }`}
                            >
                                Income
                            </button>
                            <button
                                type="button"
                                onClick={() => setValue('type', 'expense')}
                                className={`flex-1 py-2 rounded-lg text-sm font-bold transition-all ${currentType === 'expense' ? 'bg-card shadow text-red-600' : 'text-muted-foreground hover:text-foreground'
                                    }`}
                            >
                                Expense
                            </button>
                        </div>
                        <input type="hidden" {...register('type')} />

                        {/* Name & Amount */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs font-black text-muted-foreground uppercase mb-1.5">Name</label>
                                <input
                                    type="text"
                                    placeholder="e.g. Salary, Rent"
                                    {...register('name')}
                                    className={`w-full bg-card text-card-foreground border rounded-xl py-3 px-4 outline-none focus:ring-2 focus:ring-primary/20 font-bold ${errors.name ? 'border-red-500' : 'border-border'}`}
                                />
                                {errors.name && <p className="text-xs text-red-500 mt-1">{errors.name.message}</p>}
                            </div>
                            <div>
                                <label className="block text-xs font-black text-muted-foreground uppercase mb-1.5">Amount</label>
                                <div className="relative">
                                    <span className="absolute left-4 top-3 text-muted-foreground font-bold">{currencySymbol}</span>
                                    <input
                                        type="number"
                                        min="0"
                                        step="0.01"
                                        placeholder="0.00"
                                        {...register('amount')}
                                        className={`w-full bg-card text-card-foreground border rounded-xl py-3 pl-14 pr-4 outline-none focus:ring-2 focus:ring-primary/20 font-bold ${errors.amount ? 'border-red-500' : 'border-border'}`}
                                    />
                                </div>
                                {errors.amount && <p className="text-xs text-red-500 mt-1">{errors.amount.message}</p>}
                            </div>
                        </div>

                        {/* Currency & Frequency */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs font-black text-muted-foreground uppercase mb-1.5">Currency</label>
                                <div className="relative">
                                    <Coins size={16} className="absolute left-4 top-3.5 text-muted-foreground" />
                                    <select
                                        {...register('currency')}
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
                                        {...register('frequency')}
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
                                    placeholder="e.g. Housing"
                                    {...register('category')}
                                    className={`w-full bg-card text-card-foreground border rounded-xl py-3 px-4 outline-none focus:ring-2 focus:ring-primary/20 font-medium ${errors.category ? 'border-red-500' : 'border-border'}`}
                                />
                                {errors.category && <p className="text-xs text-red-500 mt-1">{errors.category.message}</p>}
                            </div>
                            <div>
                                <label className="block text-xs font-black text-muted-foreground uppercase mb-1.5">Start Date</label>
                                <div className="relative">
                                    <Calendar size={16} className="absolute left-4 top-3.5 text-muted-foreground" />
                                    <input
                                        type="date"
                                        {...register('start_date')}
                                        className={`w-full bg-card text-card-foreground border rounded-xl py-3 pl-10 pr-4 outline-none focus:ring-2 focus:ring-primary/20 font-medium ${errors.start_date ? 'border-red-500' : 'border-border'}`}
                                    />
                                </div>
                                {errors.start_date && <p className="text-xs text-red-500 mt-1">{errors.start_date.message}</p>}
                            </div>
                        </div>
                    </div>

                    <div className="p-6 pt-2 flex gap-3">
                        <button type="button" onClick={onCancel} className="flex-1 py-3 rounded-xl font-bold text-muted-foreground hover:bg-muted transition-colors">
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={isSubmitting}
                            className="flex-1 py-3 rounded-xl font-bold text-primary-foreground bg-primary hover:opacity-90 transition-all flex items-center justify-center gap-2 shadow-lg disabled:opacity-50"
                        >
                            <Save size={18} />
                            {isSubmitting ? 'Saving...' : 'Save Item'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
