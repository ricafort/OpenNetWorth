import { z } from 'zod';

export const CurrencyCodeSchema = z.enum([
    'USD', 'EUR', 'GBP', 'JPY', 'CAD', 'AUD', 'CHF', 'CNY', 'INR', 'SGD', 'PHP', 'KRW'
]);

export const RecurringFrequencySchema = z.enum([
    'weekly',
    'biweekly',
    'monthly',
    'quarterly',
    'yearly'
]);

export const RecurringTransactionSchema = z.object({
    id: z.string().uuid().optional(),
    name: z.string().min(1, "Name is required"),
    amount: z.coerce.number().min(0, "Amount must be positive"),
    type: z.enum(['income', 'expense']),
    frequency: RecurringFrequencySchema,
    category: z.string().min(1, "Category is required"),
    start_date: z.string().min(1, "Start date is required"), // ISO date string
    end_date: z.string().optional(),
    is_active: z.boolean().default(true),
    currency: CurrencyCodeSchema.optional(), // Added for God Mode support
    notes: z.string().optional()
});

export type RecurringTransactionFormData = z.infer<typeof RecurringTransactionSchema>;
