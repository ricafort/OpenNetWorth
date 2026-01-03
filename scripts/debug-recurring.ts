
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!serviceRoleKey) {
    console.error("❌ MISSING SUPABASE_SERVICE_ROLE_KEY");
    process.exit(1);
}

const supabase = createClient(supabaseUrl!, serviceRoleKey);

async function check() {
    console.log("🔍 Debugging Recurring Transactions...");

    // 1. Check Table Info (via simple select)
    const { data: sample, error: err1 } = await supabase
        .from('recurring_transactions')
        .select('*')
        .limit(1);

    if (err1) {
        console.error("❌ Error fetching table:", err1);
    } else {
        console.log("✅ Table is accessible. Sample row keys:", sample && sample[0] ? Object.keys(sample[0]) : "No rows yet");
    }

    // 2. Check SK High Income Template
    const templateId = '00000000-0000-0000-0000-000000000023';
    console.log(`\nChecking Template ID: ${templateId}`);

    const { data: rows, error: err2 } = await supabase
        .from('recurring_transactions')
        .select('*')
        .eq('user_id', templateId);

    if (err2) {
        console.error("❌ Error fetching rows:", err2);
    } else {
        console.log(`Found ${rows?.length} recurring transactions.`);
        if (rows?.length === 0) {
            console.warn("⚠️  NO TRANSACTIONS FOUND! Hydration likely failed or didn't run for this table.");
        } else {
            console.dir(rows, { depth: null });
        }
    }
}

check();
