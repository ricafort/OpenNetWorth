import { NextResponse } from 'next/server';
import { getDb } from '@/infrastructure/sqlite/db';

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const accountId = searchParams.get('accountId');

        if (!accountId) {
            return NextResponse.json({ error: 'accountId is required' }, { status: 400 });
        }

        const db = getDb();
        const rules = db.prepare('SELECT * FROM m1_categorization_rules WHERE account_id = ? ORDER BY match_string ASC').all(accountId);

        return NextResponse.json(rules);
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function DELETE(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const id = searchParams.get('id');

        if (!id) {
            return NextResponse.json({ error: 'id is required' }, { status: 400 });
        }

        const db = getDb();
        db.prepare('DELETE FROM m1_categorization_rules WHERE id = ?').run(id);

        return NextResponse.json({ success: true });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function PATCH(request: Request) {
    try {
        const body = await request.json();
        const { id, target_category } = body;

        if (!id || !target_category) {
            return NextResponse.json({ error: 'id and target_category are required' }, { status: 400 });
        }

        const db = getDb();
        const now = new Date().toISOString();
        
        const result = db.prepare(`
            UPDATE m1_categorization_rules 
            SET target_category = ?, updated_at = ? 
            WHERE id = ?
        `).run(target_category, now, id);

        if (result.changes === 0) {
            return NextResponse.json({ error: 'Rule not found' }, { status: 404 });
        }

        return NextResponse.json({ success: true });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
