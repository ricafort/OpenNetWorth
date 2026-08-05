// Why this file exists:
// Centralized Zod schema validation for runtime environment variables.
// Guarantees type safety across server and client boundaries and prevents silent runtime failures due to missing configuration.

import { z } from 'zod';

const envSchema = z.object({
    // Required Core Infra
    NEXT_PUBLIC_SUPABASE_URL: z.string().url("NEXT_PUBLIC_SUPABASE_URL must be a valid URL"),
    NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1, "NEXT_PUBLIC_SUPABASE_ANON_KEY is missing"),
    GEMINI_API_KEY: z.string().min(1, "GEMINI_API_KEY is missing"),

    // Bank Integrations
    PLAID_CLIENT_ID: z.string().optional(),
    PLAID_SECRET: z.string().optional(),
    PLAID_ENV: z.enum(['sandbox', 'development', 'production']).default('sandbox'),
    
    // Australian Open Banking (Basiq)
    BASIQ_API_KEY: z.string().optional(),
    BASIQ_ENV: z.enum(['sandbox', 'production']).default('sandbox'),
    NEXT_PUBLIC_APP_URL: z.string().url().optional(),
    // Basiq sends REAL SMS in sandbox. Set to your real mobile number in E.164 format (e.g. +61412345678)
    BASIQ_SANDBOX_MOBILE: z.string().optional(),

    // Stock Market Data Integrations (Replaced Alpha Vantage with Finnhub)
    FINNHUB_API_KEY: z.string().optional(),
});

export const validateEnv = () => {
    // Tricky logic: process.env on client side might only expose NEXT_PUBLIC_ variables during bundle compile time.
    // SafeParse allows optional keys to pass without blowing up client components.
    const parsed = envSchema.safeParse(process.env);

    if (!parsed.success) {
        console.error("❌ Invalid environment variables:", parsed.error.flatten().fieldErrors);
        throw new Error("Invalid environment variables. Check .env.local");
    }

    return parsed.data;
};

// Singleton env object
// TODO: Ensure secret keys like BASIQ_API_KEY and FINNHUB_API_KEY are never accessed in 'use client' components directly.
export const env = validateEnv();
