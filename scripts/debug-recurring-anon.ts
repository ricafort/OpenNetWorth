
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!anonKey) {
    console.error("❌ MISSING NEXT_PUBLIC_SUPABASE_ANON_KEY");
    process.exit(1);
}

const supabase = createClient(supabaseUrl!, anonKey);

async function check() {
    console.log("🔍 Debugging Recurring Transactions (ANON KEY)...");

    // Check SK High Income Template
    const templateId = '00000000-0000-0000-0000-000000000023';
    console.log(`\nChecking Template ID: ${templateId} as Anonymous User`);

    // In Dashboard, the user is authenticated as THEMSELVES (or anon if not logged in).
    // The policy "Public can view template recurring" should allow ANYONE (even anon) to view.
    // Assuming the policy I wrote: USING (EXISTS (SELECT 1 FROM profiles ...))

    // Note: We are simulating an unauthenticated request (or authenticated as random user, if we don't sign in).
    // The createClient() without auth params creates an anonymous client.

    const { data: rows, error: err } = await supabase
        .from('recurring_transactions')
        .select('*')
        .eq('user_id', templateId);

    if (err) {
        console.error("❌ Error fetching rows:", err);
    } else {
        console.log(`Found ${rows?.length} recurring transactions.`);
        if (rows?.length === 0) {
            console.warn("⚠️  NO TRANSACTIONS FOUND! RLS is likely blocking read access.");
        } else {
            console.dir(rows, { depth: null });
        }
    }
}

check();
