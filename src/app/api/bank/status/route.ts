import { NextResponse } from 'next/server';
import { getDbForRequest, demoErrorResponse } from '@/infrastructure/sqlite/db';
import { getLinkedItems } from '@/features/bank/bankVault';

export async function GET(req: Request) {
    try {
        // Demo cookie present → the persona vault's linked items (usually none).
        const db = getDbForRequest(req);
        const items = getLinkedItems(db).map(i => ({
            id: i.id,
            provider: i.provider,
            status: i.status,
            last_synced_at: i.updated_at
        }));
        return NextResponse.json({ items });
    } catch (e: any) {
        const demoRes = demoErrorResponse(e);
        if (demoRes) return demoRes;
        return NextResponse.json({ error: 'Failed' }, { status: 500 });
    }
}
