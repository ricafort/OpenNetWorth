
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

// Load env from .env.local
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!; // Or Service Role if needed for RLS bypass

// Using service role key if available would be better to bypass RLS during backfill
// But let's try with what we have or assume user might have headers. 
// Actually for admin tasks, we usually need SERVICE_ROLE_KEY.
// Let's check if we can read .env.local to find a secret key, otherwise we might hit RLS issues 
// if we try to insert for *other* users.
// However, the migration SQL runs as postgres user usually.

// Let's try to run the Raw SQL via an RPC if available, or just standard client calls.
// Since we don't have a direct "Run SQL" command in js client without a specific function,
// we might be better off asking the user to run the migration or using the 'postgres' library if available.
// But we don't know if 'postgres' lib is installed.

// Alternative: We can use the 'supabase' CLI if installed? No, we shouldn't rely on it.

// Let's rely on the fact that I can seemingly read/write files and maybe I can use the 
// REST API to insert if the table exists.

// PROBLEM: If the table doesn't exist, I can't insert.
// I need to ensure the DDL runs.

// Let's Look at how other migrations are run. 
// There is no obvious migration runner in 'scripts/'.

// HYPOTHESIS: The user's 'npm run dev' does NOT auto-migrate new SQL files in 'supabase_migrations/'.
// Verification: I will ask the user to restart dev server OR run a command.
// BUT, I can try to fix it by creating a script that uses the SERVICE ROLE key to backfill,
// assuming the table exists. If the table does not exist, everything fails.

// Let's try to read .env.local to see if we have SERVICE_ROLE_KEY.
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, serviceRoleKey!);

async function run() {
    console.log('Starting Backfill...');

    // 1. Check if table exists by trying to select.
    const { error: tableCheck } = await supabase.from('user_badges').select('*').limit(1);

    if (tableCheck && tableCheck.code === '42P01') { // undefined_table
        console.error("CRITICAL: 'user_badges' table does not exist. The migration '13_gamification_schema.sql' has not been applied.");
        console.log("Please run: 'npx supabase migration up' or restart your database.");
        return;
    }

    // 2. Fetch all profiles
    const { data: profiles } = await supabase.from('profiles').select('id');
    if (!profiles) return;

    console.log(`Found ${profiles.length} profiles. Checking eligibility...`);

    for (const p of profiles) {
        // Check Assets
        const { count } = await supabase.from('assets').select('*', { count: 'exact', head: true }).eq('user_id', p.id);

        if (count && count > 0) {
            console.log(`User ${p.id}: Has Assets. Awarding 'first-steps'...`);
            await supabase.from('user_badges').upsert({
                user_id: p.id,
                badge_id: 'first-steps'
            }, { onConflict: 'user_id, badge_id' });
        }

        // 3. Check Net Worth (Calculate on-the-fly, history might be empty)
        const { data: userAssets } = await supabase.from('assets').select('value').eq('user_id', p.id);
        const { data: userLiabilities } = await supabase.from('liabilities').select('balance').eq('user_id', p.id);

        const totalAssets = userAssets?.reduce((sum, a) => sum + (a.value || 0), 0) || 0;
        const totalLiabilities = userLiabilities?.reduce((sum, l) => sum + (l.balance || 0), 0) || 0;
        const netWorth = totalAssets - totalLiabilities;

        console.log(`User ${p.id}: NW=${netWorth} (Assets: ${totalAssets}, Liabs: ${totalLiabilities})`);

        if (netWorth > 0) {
            await supabase.from('user_badges').upsert({ user_id: p.id, badge_id: 'wealth-tracker' }, { onConflict: 'user_id, badge_id' });
        }
        if (netWorth >= 1000000) {
            await supabase.from('user_badges').upsert({ user_id: p.id, badge_id: 'millionaire' }, { onConflict: 'user_id, badge_id' });
        }

        // Check Goals
        const { count: goalCount } = await supabase.from('goals').select('*', { count: 'exact', head: true }).eq('user_id', p.id);
        if (goalCount && goalCount > 0) {
            console.log(`User ${p.id}: Has Goals. Awarding 'goal-setter'...`);
            await supabase.from('user_badges').upsert({ user_id: p.id, badge_id: 'goal-setter' }, { onConflict: 'user_id, badge_id' });
        }

        // Check Liabilities (Debt Slayer)
        const { data: liabilities } = await supabase.from('liabilities').select('balance').eq('user_id', p.id);
        if (liabilities) {
            const paidOff = liabilities.some(l => l.balance === 0);
            if (paidOff) {
                console.log(`User ${p.id}: Has paid off liability. Awarding 'debt-slayer'...`);
                await supabase.from('user_badges').upsert({ user_id: p.id, badge_id: 'debt-slayer' }, { onConflict: 'user_id, badge_id' });
            }
        }
    }

    console.log("Backfill Complete.");
}

run();
