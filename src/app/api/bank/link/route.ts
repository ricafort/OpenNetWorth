// Why this file exists:
// API endpoint for initializing bank connection sessions.
// For Plaid (US/EU), returns a link_token for the Plaid Link modal widget.
// For Basiq (AU), returns an auth link URL for redirecting to Basiq's Open Banking portal.
// Mobile is required for AU/Basiq — Basiq sends an SMS OTP to verify the user's identity.

import { NextResponse } from 'next/server';
import { getBankConnector } from '@/features/bank/factory';
import { demoReadOnlyResponse } from '@/infrastructure/sqlite/db';
import { LOCAL_USER_ID } from '@/features/bank/bankVault';

export async function POST(req: Request) {
    // Demo personas are read-only sample vaults — no bank linking.
    const demoDenied = demoReadOnlyResponse(req);
    if (demoDenied) return demoDenied;

    try {
        const { country = 'US', mobile } = await req.json().catch(() => ({}));
        const countryCode = country.toUpperCase().trim();

        const connector = getBankConnector(countryCode);

        // Tricky: Basiq requires mobile for SMS OTP. Pass it from the client-side modal.
        // Plaid doesn't use mobile at all, so it's safely ignored for non-AU connectors.
        const linkToken = await connector.createLinkToken(LOCAL_USER_ID, mobile);

        // Client needs to know whether to open Plaid Link modal ('plaid_link')
        // or redirect to external Basiq auth URL ('redirect').
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
