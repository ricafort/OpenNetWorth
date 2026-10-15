import { NextResponse } from 'next/server';
import { getDb } from '@/infrastructure/sqlite/db';
import { bulkUpdateProposalAccount } from '@/lib/domain/document/documentInboxService';

export async function PATCH(request: Request) {
    try {
        const db = getDb();

        const body = await request.json();
        const { document_id, account_id } = body;

        if (!document_id || typeof document_id !== 'string') {
            return NextResponse.json({ error: 'Missing required field: document_id' }, { status: 400 });
        }
        if (!account_id || typeof account_id !== 'string') {
            return NextResponse.json({ error: 'Missing required field: account_id' }, { status: 400 });
        }

        const updatedCount = bulkUpdateProposalAccount(db, document_id, account_id);

        return NextResponse.json({ success: true, updatedCount });
    } catch (err: any) {
        console.error('Failed to bulk update proposals:', err);
        return NextResponse.json({ error: err.message || 'Failed to bulk update proposals.' }, { status: 400 });
    }
}
