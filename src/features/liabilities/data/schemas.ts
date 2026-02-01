import { z } from 'zod';

export const CurrencyCodeSchema = z.enum([
    'USD', 'EUR', 'GBP', 'JPY', 'CAD', 'AUD', 'CHF', 'CNY', 'INR', 'SGD', 'PHP', 'KRW'
]);

export const LiabilityTypeSchema = z.enum([
    'mortgage',
    'student_loan',
    'auto_loan',
    'credit_card',
    'other'
]);

export const LiabilitySchema = z.object({
    id: z.string().uuid().optional(),
    user_id: z.string().optional(),
    name: z.string().min(1, "Name is required"),
    type: LiabilityTypeSchema,
    balance: z.coerce.number().min(0, "Balance must be positive"),
    currency: CurrencyCodeSchema,
    interest_rate: z.coerce.number().min(0).max(100).default(0),
    minimum_payment: z.coerce.number().min(0).optional(),
    is_good_debt: z.boolean().default(false),
    last_updated: z.string().optional()
});

export type LiabilityFormData = z.infer<typeof LiabilitySchema>;
