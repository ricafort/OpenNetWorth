import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

export async function POST(req: Request) {
    // 1. Verify Webhook Signature (Skipped for MVP, but Critical for Prod)
    // Plaid sends a JWT signature. We should verify it.

    const body = await req.json();
    const { webhook_type, webhook_code, item_id } = body;

    console.log(`Received Plaid Webhook: ${webhook_type} (${webhook_code}) for Item ${item_id}`);

    if (webhook_type === 'TRANSACTIONS') {
        if (webhook_code === 'SYNC_UPDATES_AVAILABLE' || webhook_code === 'DEFAULT_UPDATE') {
            // Trigger a sync for this specific item?
            // Or just mark it as "dirty" to be picked up by the next Cron?
            // For simplicity: We acknowledge. The nightly cron will catch it.
            // Advanced: Call `syncItem(item_id)` immediately (async).
        }
    }

    if (webhook_type === 'ITEM') {
        if (webhook_code === 'ERROR') {
            // Update DB status to 'error_relogin_required'
            const adminSupabase = createClient(); // Needs Admin/Service Role!
            // Ignoring for now since we don't have Admin Client easily accessible here without fix.
            console.error('Plaid Item Error reported via Webhook');
        }
    }

    return NextResponse.json({ received: true });
}
