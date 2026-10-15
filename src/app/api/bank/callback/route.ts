// Why this file exists:
// Callback endpoint for Basiq Open Banking redirects.
// After an Australian user completes bank login on connect.basiq.io, Basiq redirects them back to this URL.
// We record the linked bank item in the local vault's settings kv and redirect
// the user back to the application dashboard.

import { NextResponse } from 'next/server';
import { getDbForRequest, demoErrorResponse, readDemoPersona } from '@/infrastructure/sqlite/db';
import { upsertLinkedItem, LOCAL_USER_ID } from '@/features/bank/bankVault';

export async function GET(req: Request) {
    try {
        // Demo personas are read-only sample vaults — send them straight back.
        if (readDemoPersona(req) !== null) {
            return NextResponse.redirect(new URL('/dashboard?error=demo_readonly', req.url));
        }

        const url = new URL(req.url);
        const provider = url.searchParams.get('provider') || 'basiq';
        const connectionId = url.searchParams.get('connectionId') || url.searchParams.get('jobId') || 'basiq-conn-default';

        const db = getDbForRequest(req);
        const now = new Date().toISOString();
        upsertLinkedItem(db, {
            id: crypto.randomUUID(),
            user_id: LOCAL_USER_ID,
            provider,
            item_id: connectionId,
            access_token: connectionId, // Basiq identifies connections by id, not a bearer token
            status: 'active',
            created_at: now,
            updated_at: now
        });

        // Redirect back to bank accounts / assets overview page
        return NextResponse.redirect(new URL('/dashboard?bank_linked=true', req.url));

    } catch (error) {
        const demoRes = demoErrorResponse(error);
        if (demoRes) return demoRes;
        console.error('Error handling Basiq OAuth callback:', error);
        return NextResponse.redirect(new URL('/dashboard?error=bank_link_failed', req.url));
    }
}
