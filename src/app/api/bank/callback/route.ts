// Why this file exists:
// Callback endpoint for Basiq Open Banking redirects.
// After an Australian user completes bank login on connect.basiq.io, Basiq redirects them back to this URL.
// We record the linked bank item in Supabase and redirect the user back to the application dashboard.

import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

export async function GET(req: Request) {
    try {
        const url = new URL(req.url);
        const provider = url.searchParams.get('provider') || 'basiq';
        const userId = url.searchParams.get('userId');
        const connectionId = url.searchParams.get('connectionId') || url.searchParams.get('jobId') || 'basiq-conn-default';

        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();

        const effectiveUserId = user?.id || userId;

        if (!effectiveUserId) {
            console.error('Basiq Callback missing user context');
            return NextResponse.redirect(new URL('/auth/login', req.url));
        }

        // Save connection to Supabase linked_items
        const { error } = await supabase.from('linked_items' as any).insert({
            user_id: effectiveUserId,
            provider,
            item_id: connectionId,
            access_token: connectionId,
            status: 'active'
        });

        if (error && error.code !== '23505') { // Ignore duplicate linking error
            console.error('Failed to store Basiq connection in database:', error);
        }

        // Redirect back to bank accounts / assets overview page
        // TODO: Update redirect path if custom onboarding step is preferred
        return NextResponse.redirect(new URL('/dashboard?bank_linked=true', req.url));

    } catch (error) {
        console.error('Error handling Basiq OAuth callback:', error);
        return NextResponse.redirect(new URL('/dashboard?error=bank_link_failed', req.url));
    }
}
