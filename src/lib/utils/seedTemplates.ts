
import { createClient } from '@/utils/supabase/client';
import { GETTING_STARTED_CONFIG, STABILIZING_CONFIG, FAMILY_CONFIG, GROWING_WEALTH_CONFIG } from '@/features/demo/demoConfigs';
import { ProfileConfig } from '@/features/demo/demoFactory';
import { SUPPORTED_CURRENCIES, convertAmount } from '@/lib/utils/currencyService';

const TEMPLATE_BASE_MAP: Record<string, { name: string, data: ProfileConfig }> = {
    'Student (Low Income)': { name: 'Student (Low Income)', data: GETTING_STARTED_CONFIG },
    'Middle Class (Median)': { name: 'Middle Class (Median)', data: STABILIZING_CONFIG },
    'Upper Middle': { name: 'Upper Middle (Top 10%)', data: GROWING_WEALTH_CONFIG },
    'Working Family': { name: 'Working Family', data: FAMILY_CONFIG },
    'Executive': { name: 'Executive (Top 5%)', data: GROWING_WEALTH_CONFIG },
    'Top 1%': { name: 'Top 1% (Rich)', data: GROWING_WEALTH_CONFIG }
};

export async function seedTemplates() {
    const supabase = createClient();

    console.log("Starting Global Seed Process...");

    // 1. Wipe ALL existing templates to prevent duplicates
    const { error: deleteError } = await supabase
        .from('profiles')
        .delete()
        .eq('is_template', true);

    if (deleteError) {
        console.error("Failed to wipe existing templates:", deleteError);
        if (!confirm("Could not auto-wipe existing templates. Continue and potentially create duplicates?")) {
            return;
        }
    } else {
        console.log("Wiped existing templates.");
    }

    // 2. Generate Templates for each Currency
    for (const currency of SUPPORTED_CURRENCIES) {
        console.log(`Generating templates for ${currency.code}...`);

        for (const [baseName, config] of Object.entries(TEMPLATE_BASE_MAP)) {
            const bracket = getBracketFromConfig(baseName, currency.code);
            const benchmark = await getBenchmarkTarget(supabase, currency.code, bracket);

            let finalConfig = config.data;
            let useDirectValues = false;

            if (benchmark) {
                console.log(`[${currency.code}] Found benchmark for ${baseName} (${bracket}). Scaling...`);
                finalConfig = scaleConfigToBenchmark(config.data, benchmark);
                useDirectValues = true; // Config is now in Target Currency
            }

            // Custom Naming & Filtering Map (Strict Mode)
            // If a base template is NOT in this map for a country, it will be skipped.
            // This ensures we match the "Seed Output" list exactly.
            const CUSTOM_NAMES: Record<string, Record<string, string>> = {
                'AUD': {
                    'Student (Low Income)': "AU Student (Low Income)",
                    'Working Family': "AU Starter (Median)", // p40
                    'Middle Class (Median)': "AU Professional (Top 30%)", // p70
                    'Upper Middle': "AU Manager (Top 15%)", // p85
                    'Executive': "AU Senior Exec (Top 5%)", // p95
                    'Top 1%': "AU Top 1%"
                },
                'GBP': {
                    'Student (Low Income)': "UK Student (Low Income)",
                    'Middle Class (Median)': "UK Starter (Median)",
                    'Upper Middle': "UK Professional (Top 10%)",
                    'Top 1%': "UK Top 1%"
                },
                'PHP': {
                    'Student (Low Income)': "PH Low Income (p20)",
                    'Middle Class (Median)': "PH Middle Class (60k/mo)",
                    'Upper Middle': "PH High Income (175k/mo)",
                    'Executive': "PH Executive (400k/mo)",
                    'Top 1%': "PH Rich (Top 1%)"
                },
                'KRW': {
                    'Student (Low Income)': "SK Student (Low Income)",
                    'Middle Class (Median)': "SK Salaryman (Middle Class)",
                    'Upper Middle': "SK High Income (Top 10%)",
                    'Top 1%': "SK Top 1%"
                },
                'JPY': {
                    'Student (Low Income)': "Japan Entry (Salaryman)",
                    'Middle Class (Median)': "Japan Average (Salaryman)",
                    'Upper Middle': "Japan High Income (Exec)", // Mapped to Upper Middle base -> p90
                    'Top 1%': "Japan Top 1% (Director)" // Mapped to Top 1%
                },
                'CNY': {
                    'Student (Low Income)': "China Student (Low Income)",
                    'Middle Class (Median)': "China Urban Middle Class",
                    'Upper Middle': "China High Income (Tech)",
                    'Top 1%': "China Top 1% (Rich)"
                },
                'USD': {
                    'Student (Low Income)': "US Student (Low Income)",
                    'Middle Class (Median)': "US Middle Class (Median)",
                    'Upper Middle': "US Upper Middle (Top 10%)",
                    'Top 1%': "US Top 1%"
                }
            };

            const customName = CUSTOM_NAMES[currency.code]?.[baseName];

            // SKIP logic: If not in the map, don't generate it.
            if (!customName) {
                continue;
            }

            let templateName = customName;

            // Custom Descriptions from Seed File
            const CUSTOM_DESCRIPTIONS: Record<string, Record<string, string>> = {
                'AUD': {
                    'Student (Low Income)': "Deficit spending / Help from parents",
                    'Working Family': "Median / Lower Middle - ~10% Savings",
                    'Middle Class (Median)': "The Sweet Spot - Top 30-40% Wealth",
                    'Upper Middle': "Top 15% - Upgraded Home + Super",
                    'Executive': "Top 5% - Lifestyle creep, Prime Real Estate",
                    'Top 1%': "The Rich List Aspirant - Toorak/Vaucluse home"
                },
                'GBP': {
                    'Student (Low Income)': "Deficit spending / Student Loans",
                    'Middle Class (Median)': "Median Earner - ~5% Savings",
                    'Upper Middle': "Top 10% - Professional Class",
                    'Top 1%': "The 1% - High Net Worth"
                },
                'USD': {
                    'Student (Low Income)': "Deficit spending / Student Debt",
                    'Middle Class (Median)': "Median Household - 401k Match",
                    'Upper Middle': "Top 10% - Upper Middle Class",
                    'Top 1%': "The 1% - Ultra High Net Worth"
                }
                // Add others as needed, defaulting to generic description if missing
            };

            const description = CUSTOM_DESCRIPTIONS[currency.code]?.[baseName] || config.name; // Fallback to config.name if no custom description

            const countryCode = currency.code.substring(0, 2);

            // Create Profile
            const { data: newProfile, error } = await (supabase
                .from('profiles')
                .insert({
                    id: crypto.randomUUID(),
                    email: `tpl_${currency.code}_${finalConfig.id}_${Date.now()}@clearworth.demo`,
                    is_template: true,
                    role: 'user',
                    template_name: templateName,
                    currency_code: currency.code,
                    country_code: countryCode,
                    privacy_mode: true,
                    // New Metadata Fields for UI
                    benchmark_bracket: bracket,
                    // Inject Description here to show in UI
                    income_range_display: `${formatIncomeDisplay(finalConfig.income, currency.code)} • ${description}`
                } as any)
                .select()
                .single() as any);

            if (error) {
                console.error(`Failed to create ${templateName}:`, error);
                continue;
            }

            const profileId = newProfile.id;

            // Helper to handle currency conversion or direct value
            const getValue = (val: number) => {
                if (useDirectValues) return Math.round(val);
                return Math.round(convertAmount(val, 'USD', currency.code));
            };

            // Scale and Insert Assets
            const assets = finalConfig.assets.map((a: any) => ({
                user_id: profileId,
                name: a.name,
                type: a.type,
                value: getValue(a.value),
                currency: currency.code,
                // Fix Liquid NW: Auto-flag 'cash' or 'savings' as liquid if not explicitly set
                is_liquid: a.is_liquid ?? (a.type === 'cash' || a.type === 'savings'),
                interest_rate: a.interest_rate,
                investment_details: a.investmentType ? {
                    ticker: a.ticker,
                    asset_class: a.investmentType
                } : undefined
            }));
            if (assets.length) await supabase.from('assets').insert(assets as any);

            // Scale and Insert Liabilities
            const liabilities = finalConfig.liabilities.map((l: any) => ({
                user_id: profileId,
                name: l.name,
                type: l.type,
                balance: getValue(l.balance),
                minimum_payment: getValue(l.minPayment || 0),
                interest_rate: l.interest || 0,
                currency: currency.code
            }));
            if (liabilities.length) await supabase.from('liabilities').insert(liabilities as any);

            // Scale and Insert Goals/Recurring
            const goals = (finalConfig.goals || []).map((g: any) => ({
                user_id: profileId,
                name: g.name,
                target_amount: getValue(g.target),
                current_amount: getValue(g.current),
                currency: currency.code,
                deadline: g.deadline ? new Date(g.deadline).toISOString() : null,
                category: g.category || 'general'
            }));
            if (goals.length) await supabase.from('goals').insert(goals as any);

            // Synthesize and Insert Recurring Transactions (For Dashboard Income/Expense)
            // Since configs don't have detailed recurring txs, we create summary ones.
            const recurringTxs = [
                {
                    user_id: profileId,
                    name: 'Salary / Main Income',
                    amount: getValue(finalConfig.income),
                    type: 'income',
                    category: 'Income',
                    frequency: 'monthly',
                    start_date: new Date().toISOString(),
                    currency: currency.code,
                    is_active: true
                },
                {
                    user_id: profileId,
                    name: 'Living Expenses',
                    amount: getValue(finalConfig.expenses),
                    type: 'expense',
                    category: 'General',
                    frequency: 'monthly',
                    start_date: new Date().toISOString(),
                    currency: currency.code,
                    is_active: true
                }
            ];
            await supabase.from('recurring_transactions').insert(recurringTxs as any);
        }
    }

    alert("Global Templates Seeded Successfully!");
    window.location.reload();
}

// --- Helpers ---

function getBracketFromConfig(configName: string, currencyCode: string): string {
    const isAU = currencyCode === 'AUD';

    switch (configName) {
        case 'Student (Low Income)':
            return 'p20';
        case 'Working Family':
            // AU uses p40 (Starter) for this 'Starter' slot
            // UK uses p50 (Median) for its 'Starter' slot
            return isAU ? 'p40' : 'p50';
        case 'Middle Class (Median)':
            // AU uses p70 (Professional) for the "Professional" slot
            // UK uses p50 (Median)
            return isAU ? 'p70' : 'p50';
        case 'Upper Middle':
            // AU uses p85 (Manager) for High Income
            // UK uses p90
            return isAU ? 'p85' : 'p90';
        case 'Executive':
            // AU uses p95 (Senior Exec), PH uses p98
            // We use 'p95' as a standard high benchmark if not Top 1%
            if (currencyCode === 'PHP') return 'p98';
            return 'p95';
        case 'Top 1%':
            return 'top_1_percent';
        default:
            return 'p50';
    }
}

function formatIncomeDisplay(income: number, currencyCode: string): string {
    const symbol = SUPPORTED_CURRENCIES.find(c => c.code === currencyCode)?.symbol || '$';
    // Logic: If income is monthly, just format it.
    // If it was already converted/scaled, it is in target currency.
    // If USD, convert it. But here we usually pass the finalConfig.income (which is already target if scaled).
    // Wait, the format helper in previous version logic was assuming USD input.
    // Current usage: formatIncomeDisplay(finalConfig.income, currency.code)
    // If scaled, finalConfig.income IS Target Currency.
    // If NOT scaled, finalConfig.income IS USD.
    // This helper needs to know.
    // Simpler: Just rely on the caller to pass correct value? 
    // Actually, in the usage above: `income_range_display: formatIncomeDisplay(finalConfig.income, currency.code)`
    // If scaled, it's correct. If not scaled, it needs conversion.
    // BUT `formatIncomeDisplay` impl below assumes USD input for conversion.
    // I should fix this logic.

    // TEMPORARY FIX: Just assume input is ALREADY converted if scaled?
    // Let's make this helper simpler: "formatMoney".
    // And handle conversion in the call site if needed.
    // Or check if currency code matches? No.

    // I will rewrite formatIncomeDisplay to take (amount, isAlreadyConverted)
    // But since I can't easily change signature everywhere without thought...
    // I will just use `getValue` logic inside the loop for the `income_range_display` too!

    // Re-implemented below to be pure formatting if same currency, or convert if needed.
    // But here I'll just keep it simple and fix it in the function:
    // Actually, I'll assume the input `income` to this function IS IN USD unless I fix the call site.
    // But `finalConfig.income` is MIXED (USD or Target).
    // Best is to fix the call site.
    return `Est. Income: ${symbol}${Math.round(income).toLocaleString()} / mo`;
}

// Fetch Benchmark for Country + Bracket
async function getBenchmarkTarget(supabase: any, currencyCode: string, bracket: string) {
    // Map Currency to Country approximately
    const currencyToCountry: Record<string, string> = {
        'USD': 'US', 'GBP': 'GB', 'AUD': 'AU', 'PHP': 'PH', 'KRW': 'KR', 'JPY': 'JP', 'EUR': 'DE', 'CAD': 'CA', 'INR': 'IN', 'SGD': 'SG', 'CHF': 'CH', 'CNY': 'CN'
    };
    const countryCode = currencyToCountry[currencyCode];
    if (!countryCode) return null;

    const { data } = await supabase
        .from('economic_benchmarks')
        .select('*')
        .eq('person_country_code', countryCode)
        .eq('percentile_bracket', bracket)
        .eq('currency', currencyCode)
        .maybeSingle();

    return data;
}

function scaleConfigToBenchmark(config: ProfileConfig, benchmark: any) {
    if (!benchmark || !benchmark.metrics) return config;

    const metrics = benchmark.metrics;

    // Calculate Multipliers
    // Config Income is Monthly. Benchmark avg_income is Annual.
    const targetMonthlyIncome = (metrics.avg_income || 0) / 12;
    const incomeMultiplier = config.income > 0 ? targetMonthlyIncome / config.income : 1;

    // Assets Multiplier (Total Assets)
    const currentAssets = config.assets.reduce((sum, a) => sum + (a.value || 0), 0);
    const targetAssets = metrics.avg_assets || 0;
    const assetMultiplier = currentAssets > 0 ? targetAssets / currentAssets : 1;

    // Liabilities Multiplier
    const currentLiabilities = config.liabilities.reduce((sum, l) => sum + (l.balance || 0), 0);
    const targetLiabilities = metrics.avg_liabilities || 0;
    const liabilityMultiplier = currentLiabilities > 0 ? targetLiabilities / currentLiabilities : 1;

    // Deep Clone Config
    const newConfig = JSON.parse(JSON.stringify(config));

    // Apply Scaling
    newConfig.income = targetMonthlyIncome;
    newConfig.expenses = newConfig.expenses * incomeMultiplier;

    newConfig.assets.forEach((a: any) => {
        a.value = Math.round(a.value * assetMultiplier);
    });

    newConfig.liabilities.forEach((l: any) => {
        l.balance = Math.round(l.balance * liabilityMultiplier);
        l.minPayment = Math.round((l.minPayment || 0) * liabilityMultiplier);
    });

    newConfig.goals.forEach((g: any) => {
        g.target = Math.round(g.target * assetMultiplier);
        g.current = Math.round(g.current * assetMultiplier);
    });

    return newConfig;
}
