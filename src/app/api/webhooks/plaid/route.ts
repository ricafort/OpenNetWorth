import { NextResponse } from 'next/server';
import getDb from '@/infrastructure/sqlite/db';
import { getLinkedItems, upsertLinkedItem } from '@/features/bank/bankVault';

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
            // Mark the linked item so the UI can prompt a re-login.
            const db = getDb();
            const items = getLinkedItems(db);
            const item = items.find(i => i.item_id === item_id);
            if (item) {
                item.status = 'error_relogin_required';
                item.updated_at = new Date().toISOString();
                upsertLinkedItem(db, item);
            }
            console.error('Plaid Item Error reported via Webhook');
        }
    }

    return NextResponse.json({ received: true });
}
