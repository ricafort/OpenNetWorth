import { z } from 'zod';

export const CurrencyCodeSchema = z.enum([
    'USD', 'EUR', 'GBP', 'JPY', 'CAD', 'AUD', 'CHF', 'CNY', 'INR', 'SGD', 'PHP', 'KRW'
]);

export const AssetTypeSchema = z.enum([
    'cash',
    'investment',
    'crypto',
    'real_estate',
    'retirement',
    'vehicle',
    'collectible',
    'other'
]);

export const AssetClassSchema = z.enum([
    'stock',
    'etf',
    'crypto',
    'bond',
    'other'
]);

export const InvestmentDataSchema = z.object({
    ticker: z.string().optional(),
    shares: z.coerce.number().min(0).default(0),
    costBasis: z.coerce.number().min(0).default(0),
    sector: z.string().optional(),
    dividendYield: z.coerce.number().min(0).default(0),
    assetClass: AssetClassSchema.default('stock'),
    currentPrice: z.number().optional(),
    previousClose: z.number().optional(),
    lastPriceUpdate: z.string().optional()
});

export const AssetSchema = z.object({
    id: z.string().uuid().optional(),
    user_id: z.string().optional(),
    name: z.string().min(1, "Name is required"),
    type: AssetTypeSchema,
    value: z.coerce.number().min(0, "Value must be positive"),
    currency: CurrencyCodeSchema,
    is_liquid: z.boolean().default(true),
    interest_rate: z.coerce.number().min(0).max(100).optional(),
    last_updated: z.string().optional(),
    investment_details: InvestmentDataSchema.optional(),
});

export type AssetFormData = z.infer<typeof AssetSchema>;
