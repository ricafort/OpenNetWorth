import { z } from 'zod';

export const CurrencyCodeSchema = z.enum([
    'USD', 'EUR', 'GBP', 'JPY', 'CAD', 'AUD', 'CHF', 'CNY', 'INR', 'SGD', 'PHP', 'KRW'
]);

export const GoalCategorySchema = z.enum([
    'net_worth',
    'savings',
    'debt_payoff',
    'custom'
]);

export const GoalSchema = z.object({
    id: z.string().uuid().optional(),
    name: z.string().min(1, "Name is required"),
    target_amount: z.coerce.number().min(0, "Target must be positive"),
    current_amount: z.coerce.number().min(0).default(0),
    currency: CurrencyCodeSchema.optional(),
    start_amount: z.coerce.number().min(0).optional(),
    deadline: z.string().optional(), // ISO date string or empty
    category: GoalCategorySchema,
    is_completed: z.boolean().optional(),
    last_updated: z.string().optional()
});

export type GoalFormData = z.infer<typeof GoalSchema>;
