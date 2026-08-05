// Why this file exists:
// API endpoint for initializing bank connection sessions.
// For Plaid (US/EU), returns a link_token for the Plaid Link modal widget.
// For Basiq (AU), returns an auth link URL for redirecting to Basiq's Open Banking portal.

import { NextResponse } from 'next/server';
import { getBankConnector } from '@/features/bank/factory';
import { createClient } from '@/utils/supabase/server';

export async function POST(req: Request) {
    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { country = 'US' } = await req.json().catch(() => ({}));
        const countryCode = country.toUpperCase().trim();

        const connector = getBankConnector(countryCode);
        const linkToken = await connector.createLinkToken(user.id);

        // Tricky logic: Client needs to know whether to open Plaid Link modal widget ('plaid_link')
        // or redirect window to external Basiq auth URL ('redirect').
        const mode = countryCode === 'AU' ? 'redirect' : 'plaid_link';

        return NextResponse.json({ link_token: linkToken, mode });

    } catch (error: any) {
        console.error('Error creating link token:', error);
        return NextResponse.json(
            { error: error.message || 'Failed to create link token' },
            { status: 500 }
        );
    }
}
