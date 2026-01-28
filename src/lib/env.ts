import { z } from 'zod';

const envSchema = z.object({
    // Required
    NEXT_PUBLIC_SUPABASE_URL: z.string().url("NEXT_PUBLIC_SUPABASE_URL must be a valid URL"),
    NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1, "NEXT_PUBLIC_SUPABASE_ANON_KEY is missing"),
    GEMINI_API_KEY: z.string().min(1, "GEMINI_API_KEY is missing"),

    // Optional
    PLAID_CLIENT_ID: z.string().optional(),
    PLAID_SECRET: z.string().optional(),
    PLAID_ENV: z.enum(['sandbox', 'development', 'production']).default('sandbox'),
    NEXT_PUBLIC_ALPHA_VANTAGE_KEY: z.string().optional(),
});

export const validateEnv = () => {
    const parsed = envSchema.safeParse(process.env);

    if (!parsed.success) {
        console.error("❌ Invalid environment variables:", parsed.error.flatten().fieldErrors);
        throw new Error("Invalid environment variables. Check .env.local");
    }

    return parsed.data;
};

// Singleton env object
export const env = validateEnv();
