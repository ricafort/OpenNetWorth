
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

// Load env from .env.local
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// Initialize Supabase with the ANON key (simulating a public user)
const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function testAccess() {
    console.log("Testing Public (Anon) Access to Templates...");

    // 1. Try to fetch ANY profile that is a template
    const { data, error } = await supabase
        .from('profiles')
        .select('id, is_template')
        .eq('is_template', true)
        .limit(1);

    if (error) {
        console.error("❌ PERMISSION CHECK FAILED on 'profiles' table:");
        console.error(error);
        console.log("\nCause: The 'anon' role cannot read the 'profiles' table.");
        console.log("Fix: You MUST run the '15_fix_public_access.sql' migration.");
        return;
    }

    if (!data || data.length === 0) {
        console.log("⚠️ No templates found. The query worked, but returned no data.");
        // This suggests RLS might be hiding them, OR there are simply no templates with is_template=true.
        console.log("Double check if you have users with 'is_template = true'.");
        return;
    }

    console.log("✅ SUCCESS! Found a template profile:", data[0]);

    // 2. Now try to fetch Badges for this template
    const templateId = data[0].id;
    console.log(`\nTesting Badge Access for User ${templateId}...`);

    const { data: badges, error: badgeError } = await supabase
        .from('user_badges')
        .select('*')
        .eq('user_id', templateId);

    if (badgeError) {
        console.error("❌ PERMISSION CHECK FAILED on 'user_badges' table:");
        console.error(badgeError);
    } else {
        console.log(`✅ SUCCESS! Public access to badges is working. Found ${badges?.length || 0} badges.`);
    }
}

testAccess();
