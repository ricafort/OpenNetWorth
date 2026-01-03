
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

// Load env from .env.local
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY; // Using Anon for client-side emulation or Service Role if available
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!serviceRoleKey) {
    console.error("❌ MISSING SUPABASE_SERVICE_ROLE_KEY in .env.local");
    console.error("   The seeding script requires admin privileges to bypass RLS.");
    console.error("   Please add SUPABASE_SERVICE_ROLE_KEY=... to your .env.local file.");
    process.exit(1);
}

// Always use Service Role for seeding to bypass RLS
const supabase = createClient(supabaseUrl!, serviceRoleKey);

type BenchmarkRow = {
    person_country_code: string;
    percentile_bracket: string; // 'p50', etc.
    year: number;
    tax_year: number | null;
    currency: string;
    effective_tax_rate: number | null;
    marginal_tax_rate: number | null;
    metrics: {
        net_worth: number;
        avg_income: number;
        avg_expenses: number;
        avg_savings: number;
        avg_investments: number;
        avg_liquid_net_worth: number;
        avg_assets: number;
        avg_liabilities: number;
        composition: {
            real_estate_ratio: number;
            debt_ratio: number;
            financial_ratio: number;
        }
    }
};

/**
 * 📊 THE ECONOMIC TRUTH DATASET (V1)
 * Sources: WID (2023), OECD (2022), ATO (2024), IRS (2024).
 * Synthesized for "ClearWorth God Mode".
 */
const SEED_DATA: BenchmarkRow[] = [
    // --- AUSTRALIA (Based on 2024-25 Tax Brackets) ---

    // 1. AU Student / Low Income (Bottom 20%)
    {
        person_country_code: 'AU',
        percentile_bracket: 'p20',
        year: 2024,
        tax_year: 2024,
        currency: 'AUD',
        effective_tax_rate: 0.0, // Tax Free Threshold ($18,200)
        marginal_tax_rate: 0.0,
        metrics: {
            avg_income: 15000,
            avg_expenses: 16000,      // Deficit spending / Help from parents
            avg_savings: -1000,
            avg_assets: 5000,         // Laptop, Phone, small cash
            avg_liabilities: 20000,   // HECS (Student Debt)
            net_worth: -15000,
            avg_investments: 500,     // Micro-investing app
            avg_liquid_net_worth: -500, // Cash - Short term debt (ignoring HECS for liquidity)
            composition: { real_estate_ratio: 0, debt_ratio: 4.0, financial_ratio: 0.1 }
        }
    },

    // 2. AU Starter (Median / Lower Middle) - $18k - $45k
    {
        person_country_code: 'AU',
        percentile_bracket: 'p40',
        year: 2024,
        tax_year: 2024,
        currency: 'AUD',
        effective_tax_rate: 0.08, // Low effective rate
        marginal_tax_rate: 0.16,
        metrics: {
            avg_income: 42000,
            avg_expenses: 38000,
            avg_savings: 4000,       // ~10%
            avg_assets: 35000,       // Car + Super (Early)
            avg_liabilities: 15000,  // Car Loan / Credit
            net_worth: 20000,
            avg_investments: 15000,  // Superannuation is forced investment in AU
            avg_liquid_net_worth: 5000,
            composition: { real_estate_ratio: 0, debt_ratio: 0.42, financial_ratio: 0.4 }
        }
    },

    // 3. AU Professional (The "Sweet Spot") - $45k - $135k
    // Income: $90k (Mid-point) -> Correlates to ~Top 30-40% Wealth
    {
        person_country_code: 'AU',
        percentile_bracket: 'p70',
        year: 2024,
        tax_year: 2024,
        currency: 'AUD',
        effective_tax_rate: 0.22,
        marginal_tax_rate: 0.30,
        metrics: {
            avg_income: 95000,
            avg_expenses: 65000,
            avg_savings: 12000,     // Plus Super
            avg_assets: 550000,     // First Home + Super
            avg_liabilities: 380000,// Mortgage
            net_worth: 170000,
            avg_investments: 80000, // Super primarily
            avg_liquid_net_worth: 25000, // Cash buffer
            composition: { real_estate_ratio: 0.75, debt_ratio: 0.69, financial_ratio: 0.15 }
        }
    },

    // 3b. AU Manager / High Income - $135k - $190k
    {
        person_country_code: 'AU',
        percentile_bracket: 'p85',
        year: 2024,
        tax_year: 2024,
        currency: 'AUD',
        effective_tax_rate: 0.26, // ~42k tax on 165k income
        marginal_tax_rate: 0.37,
        metrics: {
            avg_income: 165000,
            avg_expenses: 90000,
            avg_savings: 30000,
            avg_assets: 950000,     // Upgraded Home + Super
            avg_liabilities: 550000,// Larger Mortgage
            net_worth: 400000,
            avg_investments: 200000,
            avg_liquid_net_worth: 80000,
            composition: { real_estate_ratio: 0.70, debt_ratio: 0.58, financial_ratio: 0.21 }
        }
    },

    // 4. AU Senior Exec (Top 5%) - $190k+
    {
        person_country_code: 'AU',
        percentile_bracket: 'p95',
        year: 2024,
        tax_year: 2024,
        currency: 'AUD',
        effective_tax_rate: 0.35,
        marginal_tax_rate: 0.45,
        metrics: {
            avg_income: 250000,
            avg_expenses: 120000,    // Lifestyle creep
            avg_savings: 60000,
            avg_assets: 3200000,     // Prime Real Estate + Portfolio
            avg_liabilities: 800000, // Mortgage (Good Debt)
            net_worth: 2400000,
            avg_investments: 1100000,// Shares + Super + IP
            avg_liquid_net_worth: 400000,
            composition: { real_estate_ratio: 0.55, debt_ratio: 0.25, financial_ratio: 0.35 }
        }
    },

    // 4b. AU Top 1% (The "Rich List" Aspirant)
    {
        person_country_code: 'AU',
        percentile_bracket: 'top_1_percent',
        year: 2024,
        tax_year: 2024,
        currency: 'AUD',
        effective_tax_rate: 0.39, // Higher effective rate due to progressive scale
        marginal_tax_rate: 0.45,  // Capped at 45% (plus Medicare usually, but we stick to bracket)
        metrics: {
            avg_income: 650000,
            avg_expenses: 250000,
            avg_savings: 200000,
            avg_assets: 8500000,     // Toorak/Vaucluse home + extensive portfolio
            avg_liabilities: 1500000,
            net_worth: 7000000,
            avg_investments: 4000000,
            avg_liquid_net_worth: 1500000,
            composition: { real_estate_ratio: 0.45, debt_ratio: 0.17, financial_ratio: 0.55 }
        }
    },

    // --- UNITED KINGDOM (2025-26 Brackets) ---

    // 4b. UK Student / Low Income (p20)
    {
        person_country_code: 'GB',
        percentile_bracket: 'p20',
        year: 2024,
        tax_year: 2025,
        currency: 'GBP',
        effective_tax_rate: 0.02,
        marginal_tax_rate: 0.20,
        metrics: {
            avg_income: 14000,
            avg_expenses: 13500,
            avg_savings: 500,
            avg_assets: 2000,
            avg_liabilities: 22000,
            net_worth: -20000,
            avg_investments: 200,
            avg_liquid_net_worth: 500,
            composition: { real_estate_ratio: 0.0, debt_ratio: 1.5, financial_ratio: 0.1 }
        }
    },

    // 4c. UK Median (p50)
    {
        person_country_code: 'GB',
        percentile_bracket: 'p50',
        year: 2024,
        tax_year: 2025,
        currency: 'GBP',
        effective_tax_rate: 0.13,
        marginal_tax_rate: 0.20,
        metrics: {
            avg_income: 35000,
            avg_expenses: 28000,
            avg_savings: 3000,
            avg_assets: 220000,
            avg_liabilities: 110000,
            net_worth: 110000,
            avg_investments: 15000,
            avg_liquid_net_worth: 8000,
            composition: { real_estate_ratio: 0.80, debt_ratio: 0.50, financial_ratio: 0.20 }
        }
    },

    // 4d. UK Professional (p90)
    {
        person_country_code: 'GB',
        percentile_bracket: 'p90',
        year: 2024,
        tax_year: 2025,
        currency: 'GBP',
        effective_tax_rate: 0.24,
        marginal_tax_rate: 0.40,
        metrics: {
            avg_income: 85000,
            avg_expenses: 55000,
            avg_savings: 15000,
            avg_assets: 950000,
            avg_liabilities: 300000,
            net_worth: 650000,
            avg_investments: 250000,
            avg_liquid_net_worth: 50000,
            composition: { real_estate_ratio: 0.65, debt_ratio: 0.32, financial_ratio: 0.35 }
        }
    },

    // 4e. UK Top 1%
    {
        person_country_code: 'GB',
        percentile_bracket: 'top_1_percent',
        year: 2024,
        tax_year: 2025,
        currency: 'GBP',
        effective_tax_rate: 0.38,
        marginal_tax_rate: 0.45,
        metrics: {
            avg_income: 220000,
            avg_expenses: 90000,
            avg_savings: 80000,
            avg_assets: 4000000,
            avg_liabilities: 500000,
            net_worth: 3500000,
            avg_investments: 2000000,
            avg_liquid_net_worth: 800000,
            composition: { real_estate_ratio: 0.40, debt_ratio: 0.12, financial_ratio: 0.60 }
        }
    },

    // --- PHILIPPINES (2024 Brackets) ---

    // 5. PH Low Income (p20)
    {
        person_country_code: 'PH',
        percentile_bracket: 'p20',
        year: 2024,
        tax_year: 2024,
        currency: 'PHP',
        effective_tax_rate: 0.0,
        marginal_tax_rate: 0.0,
        metrics: {
            avg_income: 180000,
            avg_expenses: 180000,
            avg_savings: 0,
            avg_assets: 10000,
            avg_liabilities: 15000,
            net_worth: -5000,
            avg_investments: 0,
            avg_liquid_net_worth: 0,
            composition: { real_estate_ratio: 0.0, debt_ratio: 1.5, financial_ratio: 0.0 }
        }
    },

    // 5b. PH Middle Class (p50)
    {
        person_country_code: 'PH',
        percentile_bracket: 'p50',
        year: 2024,
        tax_year: 2024,
        currency: 'PHP',
        effective_tax_rate: 0.06,
        marginal_tax_rate: 0.20,
        metrics: {
            avg_income: 720000,
            avg_expenses: 600000,
            avg_savings: 120000,
            avg_assets: 1000000,
            avg_liabilities: 500000,
            net_worth: 500000,
            avg_investments: 100000,
            avg_liquid_net_worth: 50000,
            composition: { real_estate_ratio: 0.50, debt_ratio: 0.50, financial_ratio: 0.10 }
        }
    },

    // 5c. PH High Income (p90)
    {
        person_country_code: 'PH',
        percentile_bracket: 'p90',
        year: 2024,
        tax_year: 2024,
        currency: 'PHP',
        effective_tax_rate: 0.20,
        marginal_tax_rate: 0.30,
        metrics: {
            avg_income: 2100000,
            avg_expenses: 1200000,
            avg_savings: 900000,
            avg_assets: 12000000,
            avg_liabilities: 4000000,
            net_worth: 8000000,
            avg_investments: 3000000,
            avg_liquid_net_worth: 1000000,
            composition: { real_estate_ratio: 0.60, debt_ratio: 0.33, financial_ratio: 0.25 }
        }
    },

    // 5c-2. PH Executive (p98)
    {
        person_country_code: 'PH',
        percentile_bracket: 'p98',
        year: 2024,
        tax_year: 2024,
        currency: 'PHP',
        effective_tax_rate: 0.26,
        marginal_tax_rate: 0.30,
        metrics: {
            avg_income: 4800000,
            avg_expenses: 2500000,
            avg_savings: 1000000,
            avg_assets: 32000000,
            avg_liabilities: 4000000,
            net_worth: 28000000,
            avg_investments: 12000000,
            avg_liquid_net_worth: 4000000,
            composition: { real_estate_ratio: 0.55, debt_ratio: 0.15, financial_ratio: 0.30 }
        }
    },

    // 5d. PH Rich (Top 1%)
    {
        person_country_code: 'PH',
        percentile_bracket: 'top_1_percent',
        year: 2024,
        tax_year: 2024,
        currency: 'PHP',
        effective_tax_rate: 0.29,
        marginal_tax_rate: 0.35,
        metrics: {
            avg_income: 10000000,
            avg_expenses: 4000000,
            avg_savings: 6000000,
            avg_assets: 85000000,
            avg_liabilities: 5000000,
            net_worth: 80000000,
            avg_investments: 50000000,
            avg_liquid_net_worth: 20000000,
            composition: { real_estate_ratio: 0.40, debt_ratio: 0.05, financial_ratio: 0.60 }
        }
    },


    // --- SOUTH KOREA (2024 Estimates) ---

    // 5e. SK Student / Low Income (p20)
    {
        person_country_code: 'KR',
        percentile_bracket: 'p20',
        year: 2024,
        tax_year: 2024,
        currency: 'KRW',
        effective_tax_rate: 0.10,
        marginal_tax_rate: 0.15,
        metrics: {
            avg_income: 29000000,
            avg_expenses: 26000000,
            avg_savings: 3000000,
            avg_assets: 15000000,
            avg_liabilities: 5000000,
            net_worth: 10000000,
            avg_investments: 1000000,
            avg_liquid_net_worth: 5000000,
            composition: { real_estate_ratio: 0.0, debt_ratio: 0.5, financial_ratio: 0.5 }
        }
    },

    // 5f. SK Middle Class (p50)
    {
        person_country_code: 'KR',
        percentile_bracket: 'p50',
        year: 2024,
        tax_year: 2024,
        currency: 'KRW',
        effective_tax_rate: 0.12,
        marginal_tax_rate: 0.24,
        metrics: {
            avg_income: 53000000,
            avg_expenses: 40000000,
            avg_savings: 13000000,
            avg_assets: 450000000,
            avg_liabilities: 150000000,
            net_worth: 300000000,
            avg_investments: 50000000,
            avg_liquid_net_worth: 80000000,
            composition: { real_estate_ratio: 0.7, debt_ratio: 0.5, financial_ratio: 0.3 }
        }
    },

    // 5g. SK High Income (p90)
    {
        person_country_code: 'KR',
        percentile_bracket: 'p90',
        year: 2024,
        tax_year: 2024,
        currency: 'KRW',
        effective_tax_rate: 0.20,
        marginal_tax_rate: 0.35,
        metrics: {
            avg_income: 135000000,
            avg_expenses: 80000000,
            avg_savings: 55000000,
            avg_assets: 1800000000,
            avg_liabilities: 600000000,
            net_worth: 1200000000,
            avg_investments: 400000000,
            avg_liquid_net_worth: 300000000,
            composition: { real_estate_ratio: 0.6, debt_ratio: 0.5, financial_ratio: 0.4 }
        }
    },

    // 5h. SK Top 1%
    {
        person_country_code: 'KR',
        percentile_bracket: 'top_1_percent',
        year: 2024,
        tax_year: 2024,
        currency: 'KRW',
        effective_tax_rate: 0.35,
        marginal_tax_rate: 0.42,
        metrics: {
            avg_income: 450000000,
            avg_expenses: 150000000,
            avg_savings: 300000000,
            avg_assets: 6000000000,
            avg_liabilities: 1000000000,
            net_worth: 5000000000,
            avg_investments: 3000000000,
            avg_liquid_net_worth: 1000000000,
            composition: { real_estate_ratio: 0.5, debt_ratio: 0.2, financial_ratio: 0.5 }
        }
    },


    // --- JAPAN (2024 Estimates) ---

    // 5i. JP Entry / Part-time (p20)
    {
        person_country_code: 'JP',
        percentile_bracket: 'p20',
        year: 2024,
        tax_year: 2024,
        currency: 'JPY',
        effective_tax_rate: 0.15,
        marginal_tax_rate: 0.15,
        metrics: {
            avg_income: 2800000,
            avg_expenses: 2600000,
            avg_savings: 200000,
            avg_assets: 1000000,
            avg_liabilities: 500000,
            net_worth: 500000,
            avg_investments: 100000,
            avg_liquid_net_worth: 300000,
            composition: { real_estate_ratio: 0.0, debt_ratio: 0.5, financial_ratio: 0.2 }
        }
    },

    // 5j. JP Median (p50)
    {
        person_country_code: 'JP',
        percentile_bracket: 'p50',
        year: 2024,
        tax_year: 2024,
        currency: 'JPY',
        effective_tax_rate: 0.20,
        marginal_tax_rate: 0.30,
        metrics: {
            avg_income: 5000000,
            avg_expenses: 4000000,
            avg_savings: 1000000,
            avg_assets: 20000000,
            avg_liabilities: 12000000,
            net_worth: 8000000,
            avg_investments: 3000000,
            avg_liquid_net_worth: 5000000,
            composition: { real_estate_ratio: 0.5, debt_ratio: 0.6, financial_ratio: 0.4 }
        }
    },

    // 5k. JP High Income (p90)
    {
        person_country_code: 'JP',
        percentile_bracket: 'p90',
        year: 2024,
        tax_year: 2024,
        currency: 'JPY',
        effective_tax_rate: 0.30,
        marginal_tax_rate: 0.43,
        metrics: {
            avg_income: 12000000,
            avg_expenses: 7000000,
            avg_savings: 5000000,
            avg_assets: 80000000,
            avg_liabilities: 40000000,
            net_worth: 40000000,
            avg_investments: 15000000,
            avg_liquid_net_worth: 10000000,
            composition: { real_estate_ratio: 0.6, debt_ratio: 0.5, financial_ratio: 0.4 }
        }
    },

    // 5l. JP Top 1%
    {
        person_country_code: 'JP',
        percentile_bracket: 'top_1_percent',
        year: 2024,
        tax_year: 2024,
        currency: 'JPY',
        effective_tax_rate: 0.40,
        marginal_tax_rate: 0.55,
        metrics: {
            avg_income: 35000000,
            avg_expenses: 12000000,
            avg_savings: 23000000,
            avg_assets: 300000000,
            avg_liabilities: 50000000,
            net_worth: 250000000,
            avg_investments: 100000000,
            avg_liquid_net_worth: 50000000,
            composition: { real_estate_ratio: 0.5, debt_ratio: 0.1, financial_ratio: 0.5 }
        }
    },


    // --- CHINA (2024 Estimates) ---

    // 5m. CN Student / Low Income (p20)
    {
        person_country_code: 'CN',
        percentile_bracket: 'p20',
        year: 2024,
        tax_year: 2024,
        currency: 'CNY',
        effective_tax_rate: 0.00,
        marginal_tax_rate: 0.00,
        metrics: {
            avg_income: 18000,
            avg_expenses: 16000,
            avg_savings: 2000,
            avg_assets: 5000,
            avg_liabilities: 2000,
            net_worth: 3000,
            avg_investments: 0,
            avg_liquid_net_worth: 3000,
            composition: { real_estate_ratio: 0.0, debt_ratio: 0.1, financial_ratio: 0.1 }
        }
    },

    // 5n. CN Urban Middle Class (p50)
    {
        person_country_code: 'CN',
        percentile_bracket: 'p50',
        year: 2024,
        tax_year: 2024,
        currency: 'CNY',
        effective_tax_rate: 0.03,
        marginal_tax_rate: 0.10,
        metrics: {
            avg_income: 120000,
            avg_expenses: 80000,
            avg_savings: 40000,
            avg_assets: 800000,
            avg_liabilities: 400000,
            net_worth: 400000,
            avg_investments: 100000,
            avg_liquid_net_worth: 100000,
            composition: { real_estate_ratio: 0.7, debt_ratio: 0.5, financial_ratio: 0.2 }
        }
    },

    // 5o. CN Urban High Income (p90)
    {
        person_country_code: 'CN',
        percentile_bracket: 'p90',
        year: 2024,
        tax_year: 2024,
        currency: 'CNY',
        effective_tax_rate: 0.15,
        marginal_tax_rate: 0.25,
        metrics: {
            avg_income: 450000,
            avg_expenses: 250000,
            avg_savings: 200000,
            avg_assets: 4000000,
            avg_liabilities: 1500000,
            net_worth: 2500000,
            avg_investments: 800000,
            avg_liquid_net_worth: 500000,
            composition: { real_estate_ratio: 0.65, debt_ratio: 0.4, financial_ratio: 0.3 }
        }
    },

    // 5p. CN Top 1% (Rich)
    {
        person_country_code: 'CN',
        percentile_bracket: 'top_1_percent',
        year: 2024,
        tax_year: 2024,
        currency: 'CNY',
        effective_tax_rate: 0.35,
        marginal_tax_rate: 0.45,
        metrics: {
            avg_income: 2500000,
            avg_expenses: 800000,
            avg_savings: 1700000,
            avg_assets: 20000000,
            avg_liabilities: 3000000,
            net_worth: 17000000,
            avg_investments: 8000000,
            avg_liquid_net_worth: 2000000,
            composition: { real_estate_ratio: 0.5, debt_ratio: 0.15, financial_ratio: 0.5 }
        }
    },

    // --- UNITED STATES (2025 Brackets / 2024 Data) ---

    // 5. US Student / Low Income (p20)
    {
        person_country_code: 'US',
        percentile_bracket: 'p20',
        year: 2024,
        tax_year: 2025,
        currency: 'USD',
        effective_tax_rate: 0.107,
        marginal_tax_rate: 0.12,
        metrics: {
            avg_income: 18460,
            avg_expenses: 19000,
            avg_savings: -540,
            avg_assets: 5000,
            avg_liabilities: 20000,
            net_worth: -15000,
            avg_investments: 1000,
            avg_liquid_net_worth: 500,
            composition: { real_estate_ratio: 0.0, debt_ratio: 4.0, financial_ratio: 0.2 }
        }
    },

    // 6. US Middle Class (p50 Median)
    {
        person_country_code: 'US',
        percentile_bracket: 'p50',
        year: 2024,
        tax_year: 2025,
        currency: 'USD',
        effective_tax_rate: 0.160,
        marginal_tax_rate: 0.22,
        metrics: {
            avg_income: 84390,
            avg_expenses: 65000,
            avg_savings: 6000,
            avg_assets: 280000,
            avg_liabilities: 160000,
            net_worth: 120000,
            avg_investments: 40000,
            avg_liquid_net_worth: 20000,
            composition: { real_estate_ratio: 0.75, debt_ratio: 0.57, financial_ratio: 0.25 }
        }
    },

    // 7. US Upper Middle (p90)
    {
        person_country_code: 'US',
        percentile_bracket: 'p90',
        year: 2024,
        tax_year: 2025,
        currency: 'USD',
        effective_tax_rate: 0.200,
        marginal_tax_rate: 0.24,
        metrics: {
            avg_income: 173176,
            avg_expenses: 110000,
            avg_savings: 28000,
            avg_assets: 1400000,
            avg_liabilities: 450000,
            net_worth: 950000,
            avg_investments: 350000,
            avg_liquid_net_worth: 150000,
            composition: { real_estate_ratio: 0.65, debt_ratio: 0.32, financial_ratio: 0.35 }
        }
    },

    // 8. US Top 1%
    {
        person_country_code: 'US',
        percentile_bracket: 'top_1_percent',
        year: 2024,
        tax_year: 2025,
        currency: 'USD',
        effective_tax_rate: 0.320,
        marginal_tax_rate: 0.37,
        metrics: {
            avg_income: 823763,
            avg_expenses: 350000,
            avg_savings: 200000,
            avg_assets: 12500000,
            avg_liabilities: 1500000,
            net_worth: 11000000,
            avg_investments: 8000000,
            avg_liquid_net_worth: 4000000,
            composition: { real_estate_ratio: 0.30, debt_ratio: 0.12, financial_ratio: 0.70 }
        }
    },

    // --- GLOBAL ---

    // 6. Global 1% (The "Whale")
    {
        person_country_code: 'GLOBAL',
        percentile_bracket: 'top_1_percent',
        year: 2023,
        tax_year: null, // Varies wildly
        currency: 'USD', // Global standard
        effective_tax_rate: 0.25, // Avg
        marginal_tax_rate: 0.40,
        metrics: {
            avg_income: 450000,     // Global 1% income threshold is remarkably lower than US 1%
            avg_expenses: 150000,
            avg_savings: 200000,
            avg_assets: 4500000,
            avg_liabilities: 500000,
            net_worth: 4000000,
            avg_investments: 3000000, // Highly diversified
            avg_liquid_net_worth: 1200000,
            composition: { real_estate_ratio: 0.30, debt_ratio: 0.11, financial_ratio: 0.65 }
        }
    }
];

async function seed() {
    console.log(`🌍 Starting Economic Truth Seeding...`);

    // 1. Seed Benchmarks
    console.log(`Payload: ${SEED_DATA.length} Benchmarks.`);
    for (const row of SEED_DATA) {
        const { error } = await supabase
            .from('economic_benchmarks')
            .upsert(row, { onConflict: 'person_country_code, percentile_bracket, year' });

        if (error) {
            console.error(`❌ Failed to seed Benchmark ${row.person_country_code} ${row.percentile_bracket}:`, error.message);
        } else {
            console.log(`✅ Seeded Benchmark: ${row.person_country_code} [${row.percentile_bracket}]`);
        }
    }

    // 2. Seed Template Profiles (The "God Mode" Users)
    console.log(`👤 Seeding Template Profiles...`);

    // We map the "Templates" (User Facing) to the "Benchmarks" (Data)
    const TEMPLATES = [
        {
            id: '00000000-0000-0000-0000-000000000001', // Fixed UUIDs for ease
            email: 'student.au@clearworth.demo',
            full_name: 'AU Student (Low Income)',
            is_template: true,
            role: 'user',
            country_code: 'AU',
            currency_code: 'AUD',
            benchmark_bracket: 'p20', // Links to AU p20 Benchmark
            income_range_display: '$0 - $18,200',
            avatar_url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Felix'
        },
        {
            id: '00000000-0000-0000-0000-000000000002',
            email: 'starter.au@clearworth.demo',
            full_name: 'AU Starter (Median)',
            is_template: true,
            role: 'user',
            country_code: 'AU',
            currency_code: 'AUD',
            benchmark_bracket: 'p40',
            income_range_display: '$18,201 - $45,000',
            avatar_url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Aneka'
        },
        {
            id: '00000000-0000-0000-0000-000000000003',
            email: 'pro.au@clearworth.demo',
            full_name: 'AU Professional (Top 30%)',
            is_template: true,
            role: 'user',
            country_code: 'AU',
            currency_code: 'AUD',
            benchmark_bracket: 'p70',
            income_range_display: '$45,001 - $135,000',
            avatar_url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Jude'
        },
        {
            id: '00000000-0000-0000-0000-000000000007', // New ID
            email: 'manager.au@clearworth.demo',
            full_name: 'AU Manager (Top 15%)',
            is_template: true,
            role: 'user',
            country_code: 'AU',
            currency_code: 'AUD',
            benchmark_bracket: 'p85',
            income_range_display: '$135,001 - $190,000',
            avatar_url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Amelia'
        },
        {
            id: '00000000-0000-0000-0000-000000000004',
            email: 'exec.au@clearworth.demo',
            full_name: 'AU Senior Exec (Top 5%)',
            is_template: true,
            role: 'user',
            country_code: 'AU',
            currency_code: 'AUD',
            benchmark_bracket: 'p95',
            income_range_display: '$190,001+',
            avatar_url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=George'
        },
        {
            id: '00000000-0000-0000-0000-000000000015',
            email: 'top1.au@clearworth.demo',
            full_name: 'AU Top 1%',
            is_template: true,
            role: 'user',
            country_code: 'AU',
            currency_code: 'AUD',
            benchmark_bracket: 'top_1_percent',
            income_range_display: '$650k+',
            avatar_url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Victoria'
        },
        {
            id: '00000000-0000-0000-0000-000000000011',
            email: 'student.uk@clearworth.demo',
            full_name: 'UK Student (Low Income)',
            is_template: true,
            role: 'user',
            country_code: 'GB',
            currency_code: 'GBP',
            benchmark_bracket: 'p20',
            income_range_display: '£0 - £12,570',
            avatar_url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Harry'
        },
        {
            id: '00000000-0000-0000-0000-000000000012',
            email: 'starter.uk@clearworth.demo',
            full_name: 'UK Starter (Median)',
            is_template: true,
            role: 'user',
            country_code: 'GB',
            currency_code: 'GBP',
            benchmark_bracket: 'p50',
            income_range_display: '£25k - £45k',
            avatar_url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Oliver'
        },
        {
            id: '00000000-0000-0000-0000-000000000013',
            email: 'pro.uk@clearworth.demo',
            full_name: 'UK Professional (Top 10%)',
            is_template: true,
            role: 'user',
            country_code: 'GB',
            currency_code: 'GBP',
            benchmark_bracket: 'p90',
            income_range_display: '£80k+',
            avatar_url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=William'
        },
        {
            id: '00000000-0000-0000-0000-000000000016',
            email: 'low.ph@clearworth.demo',
            full_name: 'PH Low Income (p20)',
            is_template: true,
            role: 'user',
            country_code: 'PH',
            currency_code: 'PHP',
            benchmark_bracket: 'p20',
            income_range_display: '₱0 - ₱250,000',
            avatar_url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Maria'
        },
        {
            id: '00000000-0000-0000-0000-000000000017',
            email: 'middle.ph@clearworth.demo',
            full_name: 'PH Middle Class (60k/mo)',
            is_template: true,
            role: 'user',
            country_code: 'PH',
            currency_code: 'PHP',
            benchmark_bracket: 'p50',
            income_range_display: '₱400k - ₱800k',
            avatar_url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Jose'
        },
        {
            id: '00000000-0000-0000-0000-000000000018',
            email: 'high.ph@clearworth.demo',
            full_name: 'PH High Income (175k/mo)',
            is_template: true,
            role: 'user',
            country_code: 'PH',
            currency_code: 'PHP',
            benchmark_bracket: 'p90',
            income_range_display: '₱2M - ₱8M',
            avatar_url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Sofia'
        },
        {
            id: '00000000-0000-0000-0000-000000000020',
            email: 'exec.ph@clearworth.demo',
            full_name: 'PH Executive (400k/mo)',
            is_template: true,
            role: 'user',
            country_code: 'PH',
            currency_code: 'PHP',
            benchmark_bracket: 'p98',
            income_range_display: '₱4M - ₱8M',
            avatar_url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Ramon'
        },
        {
            id: '00000000-0000-0000-0000-000000000019',
            email: 'rich.ph@clearworth.demo',
            full_name: 'PH Rich (Top 1%)',
            is_template: true,
            role: 'user',
            country_code: 'PH',
            currency_code: 'PHP',
            benchmark_bracket: 'top_1_percent',
            income_range_display: '₱8M+',
            avatar_url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Miguel'
        },
        {
            id: '00000000-0000-0000-0000-000000000014',
            email: 'top1.uk@clearworth.demo',
            full_name: 'UK Top 1%',
            is_template: true,
            role: 'user',
            country_code: 'GB',
            currency_code: 'GBP',
            benchmark_bracket: 'top_1_percent',
            income_range_display: '£180k+',
            avatar_url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Charles'
        },
        {
            id: '00000000-0000-0000-0000-000000000005',
            email: 'middle.us@clearworth.demo',
            full_name: 'US Middle Class (Median)',
            is_template: true,
            role: 'user',
            country_code: 'US',
            currency_code: 'USD',
            benchmark_bracket: 'p50',
            income_range_display: '$48,476 - $103,350',
            avatar_url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Betty'
        },
        {
            id: '00000000-0000-0000-0000-000000000008',
            email: 'student.us@clearworth.demo',
            full_name: 'US Student (Low Income)',
            is_template: true,
            role: 'user',
            country_code: 'US',
            currency_code: 'USD',
            benchmark_bracket: 'p20',
            income_range_display: '$0 - $11,925',
            avatar_url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Leo'
        },
        {
            id: '00000000-0000-0000-0000-000000000009',
            email: 'upper.us@clearworth.demo',
            full_name: 'US Upper Middle (Top 10%)',
            is_template: true,
            role: 'user',
            country_code: 'US',
            currency_code: 'USD',
            benchmark_bracket: 'p90',
            income_range_display: '$173k Avg',
            avatar_url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Sophia'
        },
        {
            id: '00000000-0000-0000-0000-000000000010',
            email: 'top1.us@clearworth.demo',
            full_name: 'US Top 1%',
            is_template: true,
            role: 'user',
            country_code: 'US',
            currency_code: 'USD',
            benchmark_bracket: 'top_1_percent',
            income_range_display: '$626k+',
            avatar_url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Alexander'
        },
        {
            id: '00000000-0000-0000-0000-000000000006',
            email: 'whale.global@clearworth.demo',
            full_name: 'Global Top 1%',
            is_template: true,
            role: 'user',
            country_code: 'GLOBAL',
            currency_code: 'USD',
            benchmark_bracket: 'top_1_percent',
            income_range_display: '$450k+ USD',
            avatar_url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Precious'
        },
        // --- SOUTH KOREA ---
        {
            id: '00000000-0000-0000-0000-000000000021',
            email: 'student.kr@clearworth.demo',
            full_name: 'SK Student (Low Income)',
            is_template: true,
            role: 'user',
            country_code: 'KR',
            currency_code: 'KRW',
            benchmark_bracket: 'p20',
            income_range_display: '₩0 - ₩30M',
            avatar_url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Joon'
        },
        {
            id: '00000000-0000-0000-0000-000000000022',
            email: 'middle.kr@clearworth.demo',
            full_name: 'SK Salaryman (Middle Class)',
            is_template: true,
            role: 'user',
            country_code: 'KR',
            currency_code: 'KRW',
            benchmark_bracket: 'p50',
            income_range_display: '₩40M - ₩80M',
            avatar_url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Minji'
        },
        {
            id: '00000000-0000-0000-0000-000000000023',
            email: 'high.kr@clearworth.demo',
            full_name: 'SK High Income (Top 10%)',
            is_template: true,
            role: 'user',
            country_code: 'KR',
            currency_code: 'KRW',
            benchmark_bracket: 'p90',
            income_range_display: '₩100M - ₩200M',
            avatar_url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Hyun'
        },
        {
            id: '00000000-0000-0000-0000-000000000024',
            email: 'top1.kr@clearworth.demo',
            full_name: 'SK Top 1%',
            is_template: true,
            role: 'user',
            country_code: 'KR',
            currency_code: 'KRW',
            benchmark_bracket: 'top_1_percent',
            income_range_display: '₩400M+',
            avatar_url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Sooyoung'
        },
        // --- JAPAN ---
        {
            id: '00000000-0000-0000-0000-000000000025',
            email: 'entry.jp@clearworth.demo',
            full_name: 'Japan Entry (Salaryman)',
            is_template: true,
            role: 'user',
            country_code: 'JP',
            currency_code: 'JPY',
            benchmark_bracket: 'p20',
            income_range_display: '¥2M - ¥3M',
            avatar_url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Takeshi'
        },
        {
            id: '00000000-0000-0000-0000-000000000026',
            email: 'median.jp@clearworth.demo',
            full_name: 'Japan Average (Salaryman)',
            is_template: true,
            role: 'user',
            country_code: 'JP',
            currency_code: 'JPY',
            benchmark_bracket: 'p50',
            income_range_display: '¥4M - ¥6M',
            avatar_url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Kenji'
        },
        {
            id: '00000000-0000-0000-0000-000000000027',
            email: 'high.jp@clearworth.demo',
            full_name: 'Japan High Income (Exec)',
            is_template: true,
            role: 'user',
            country_code: 'JP',
            currency_code: 'JPY',
            benchmark_bracket: 'p90',
            income_range_display: '¥10M - ¥15M',
            avatar_url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Sakura'
        },
        {
            id: '00000000-0000-0000-0000-000000000028',
            email: 'top1.jp@clearworth.demo',
            full_name: 'Japan Top 1% (Director)',
            is_template: true,
            role: 'user',
            country_code: 'JP',
            currency_code: 'JPY',
            benchmark_bracket: 'top_1_percent',
            income_range_display: '¥30M+',
            avatar_url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Yumi'
        },
        // --- CHINA ---
        {
            id: '00000000-0000-0000-0000-000000000029',
            email: 'student.cn@clearworth.demo',
            full_name: 'China Student (Low Income)',
            is_template: true,
            role: 'user',
            country_code: 'CN',
            currency_code: 'CNY',
            benchmark_bracket: 'p20',
            income_range_display: '¥10k - ¥20k',
            avatar_url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Wei'
        },
        {
            id: '00000000-0000-0000-0000-000000000030',
            email: 'middle.cn@clearworth.demo',
            full_name: 'China Urban Middle Class',
            is_template: true,
            role: 'user',
            country_code: 'CN',
            currency_code: 'CNY',
            benchmark_bracket: 'p50',
            income_range_display: '¥100k - ¥150k',
            avatar_url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Li'
        },
        {
            id: '00000000-0000-0000-0000-000000000031',
            email: 'high.cn@clearworth.demo',
            full_name: 'China High Income (Tech)',
            is_template: true,
            role: 'user',
            country_code: 'CN',
            currency_code: 'CNY',
            benchmark_bracket: 'p90',
            income_range_display: '¥400k - ¥600k',
            avatar_url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Chen'
        },
        {
            id: '00000000-0000-0000-0000-000000000032',
            email: 'top1.cn@clearworth.demo',
            full_name: 'China Top 1% (Rich)',
            is_template: true,
            role: 'user',
            country_code: 'CN',
            currency_code: 'CNY',
            benchmark_bracket: 'top_1_percent',
            income_range_display: '¥2M+',
            avatar_url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Wang'
        }
    ];

    for (const tmpl of TEMPLATES) {
        // We Upsert into 'profiles'
        const { error } = await supabase
            .from('profiles')
            .upsert(tmpl, { onConflict: 'id' });

        if (error) {
            console.error(`❌ Failed to seed Template ${tmpl.full_name}:`, error.message);
        } else {
            console.log(`✅ Seeded Template: ${tmpl.full_name}`);
        }
    }

    console.log("🏁 Seeding Finalized.");
}

seed();
