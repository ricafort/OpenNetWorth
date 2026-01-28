
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

// Load env from .env.local
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!serviceRoleKey) {
    console.error("❌ MISSING SUPABASE_SERVICE_ROLE_KEY. Cannot hydrate templates without admin privileges.");
    process.exit(1);
}

const supabase = createClient(supabaseUrl!, serviceRoleKey);


// Import our new Truth Dictionary
import { getInterestRate } from '../src/lib/domain/economicConstants';

async function hydrate() {
    console.log("💧 Starting Template Hydration...");

    // 1. Fetch Templates
    const { data: templates, error: pError } = await supabase
        .from('profiles')
        .select('*')
        .eq('is_template', true);

    if (pError || !templates) {
        console.error("❌ Failed to fetch templates:", pError);
        return;
    }

    console.log(`Found ${templates.length} templates.`);

    for (const tmpl of templates) {
        if (!tmpl.benchmark_bracket || !tmpl.country_code) {
            console.log(`⚠️  Skipping ${tmpl.full_name}: Missing benchmark mapping.`);
            continue;
        }

        console.log(`\n🌊 Hydrating: ${tmpl.full_name} (${tmpl.country_code} ${tmpl.benchmark_bracket})`);

        // 2. Fetch Benchmark Data
        const { data: benchmark, error: bError } = await supabase
            .from('economic_benchmarks')
            .select('*')
            .eq('person_country_code', tmpl.country_code)
            .eq('percentile_bracket', tmpl.benchmark_bracket)
            .order('year', { ascending: false })
            .limit(1)
            .single();

        if (bError || !benchmark) {
            console.error(`   ❌ No benchmark found for ${tmpl.country_code} ${tmpl.benchmark_bracket}`);
            continue;
        }

        const m = benchmark.metrics;
        const cur = tmpl.currency_code;
        const userId = tmpl.id;
        const country = tmpl.country_code;

        // 3. WIPE EXISTING DATA (Start Fresh)
        await supabase.from('assets').delete().eq('user_id', userId);
        await supabase.from('liabilities').delete().eq('user_id', userId);
        await supabase.from('recurring_transactions').delete().eq('user_id', userId);

        // 4. CREATE ASSETS
        // Real Estate
        const realEstateVal = Math.round(m.avg_assets * m.composition.real_estate_ratio);
        if (realEstateVal > 0) {
            await supabase.from('assets').insert({
                user_id: userId,
                name: 'Primary Residence',
                type: 'real_estate',
                value: realEstateVal,
                currency: cur,
                is_liquid: false
            });
        }

        // Financial / Retirement
        const financialVal = Math.round(m.avg_assets * m.composition.financial_ratio);
        if (financialVal > 0) {
            await supabase.from('assets').insert({
                user_id: userId,
                name: country === 'AU' ? 'Superannuation Fund' : 'Investment Portfolio',
                type: 'retirement',
                value: financialVal,
                currency: cur,
                is_liquid: false
            });
        }

        // Cash / Remainder
        const remainder = m.avg_assets - realEstateVal - financialVal;
        if (remainder > 0) {
            if (remainder > 0) {
                const savingsRate = getInterestRate(cur, 'SAVINGS');
                await supabase.from('assets').insert({
                    user_id: userId,
                    name: 'High Yield Savings',
                    type: 'cash',
                    value: remainder,
                    currency: cur,
                    is_liquid: true,
                    interest_rate: savingsRate
                });
            }
        }

        // 5. CREATE LIABILITIES (More Granular)
        const totalLiabilities = m.avg_liabilities;
        if (totalLiabilities > 0) {
            let remainingDebt = totalLiabilities;

            // A) Mortgage (60-80% of debt usually, if they own a home)
            if (realEstateVal > 0) {
                const mortgageAmt = Math.round(remainingDebt * 0.85); // Heavy weighting to mortgage
                const rate = getInterestRate(cur, 'MORTGAGE');

                await supabase.from('liabilities').insert({
                    user_id: userId,
                    name: 'Home Mortgage',
                    type: 'mortgage',
                    balance: mortgageAmt,
                    currency: cur,
                    interest_rate: rate,
                    is_good_debt: true
                });
                remainingDebt -= mortgageAmt;
            }

            // B) Student Loan (If mostly non-mortgage, or remaining chunk)
            // Heuristic: Median/Avg earners often have student debt.
            // Let's allocate 50% of remaining to Student Loan unless it's small
            if (remainingDebt > 5000) {
                const studentLoanAmt = Math.round(remainingDebt * 0.6);
                const rate = getInterestRate(cur, 'STUDENT_LOAN');

                await supabase.from('liabilities').insert({
                    user_id: userId,
                    name: country === 'AU' ? 'HECS-HELP Debt' : 'Student Loans',
                    type: 'student_loan',
                    balance: studentLoanAmt,
                    currency: cur,
                    interest_rate: rate,
                    is_good_debt: true // debatable but usually considered investment in self
                });
                remainingDebt -= studentLoanAmt;
            }

            // C) Credit Card / Personal Loan (The rest)
            if (remainingDebt > 0) {
                const rate = getInterestRate(cur, 'CREDIT_CARD');
                await supabase.from('liabilities').insert({
                    user_id: userId,
                    name: 'Credit Card Balance',
                    type: 'credit_card',
                    balance: remainingDebt,
                    currency: cur,
                    interest_rate: rate,
                    is_good_debt: false
                });
            }
        }

        // 6. CREATE INCOME & EXPENSES
        const monthlyIncome = Math.round(m.avg_income / 12);
        if (monthlyIncome > 0) {
            await supabase.from('recurring_transactions').insert({
                user_id: userId,
                name: 'Primary Income',
                amount: monthlyIncome,
                type: 'income',
                frequency: 'monthly',
                category: 'Salary',
                start_date: new Date().toISOString(),
                is_active: true,
                currency: cur
            });

            // Living Expenses
            const monthlyExpenses = Math.round(m.avg_expenses / 12);
            if (monthlyExpenses > 0) {
                await supabase.from('recurring_transactions').insert({
                    user_id: userId,
                    name: 'General Living Expenses',
                    amount: monthlyExpenses,
                    type: 'expense',
                    frequency: 'monthly',
                    category: 'Living Cost',
                    start_date: new Date().toISOString(),
                    is_active: true,
                    currency: cur
                });
            }
        }

        console.log(`   ✅ Hydrated: Net Worth $${(m.avg_assets - m.avg_liabilities).toLocaleString()}`);
    }
    console.log("\n🏁 Hydration Complete.");
}

hydrate();
