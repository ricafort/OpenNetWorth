import { NextResponse } from 'next/server';
import { getBankConnector } from '@/features/bank/factory';
import { getDbForRequest, demoErrorResponse, demoReadOnlyResponse } from '@/infrastructure/sqlite/db';
import { getLinkedItems, upsertLinkedItem, LOCAL_USER_ID } from '@/features/bank/bankVault';

// CAUTION: This endpoint handles sensitive Access Tokens.
// They are stored in the vault's settings kv under a key the settings read API
// and backup export both reject (see bankVault.ts), so tokens never leave the
// live vault file.

export async function POST(req: Request) {
    // Demo personas are read-only sample vaults — no bank linking.
    const demoDenied = demoReadOnlyResponse(req);
    if (demoDenied) return demoDenied;

    try {
        const { public_token, country = 'US' } = await req.json();

        if (!public_token) {
            return NextResponse.json({ error: 'Missing public_token' }, { status: 400 });
        }

        const connector = getBankConnector(country);
        const result = await connector.exchangePublicToken(public_token);

        const db = getDbForRequest(req);
        if (getLinkedItems(db).some(i => i.item_id === result.originalItemId)) {
            return NextResponse.json({ error: 'Bank already linked' }, { status: 409 });
        }

        const now = new Date().toISOString();
        upsertLinkedItem(db, {
            id: crypto.randomUUID(),
            user_id: LOCAL_USER_ID,
            provider: result.provider,
            item_id: result.originalItemId,
            access_token: result.accessToken,
            status: 'active',
            created_at: now,
            updated_at: now
        });

        return NextResponse.json({ success: true, item_id: result.originalItemId });
    } catch (error: any) {
        const demoRes = demoErrorResponse(error);
        if (demoRes) return demoRes;
        console.error('Error exchanging token:', error);
        return NextResponse.json(
            { error: error.message || 'Failed to link bank' },
            { status: 500 }
        );
    }
}
