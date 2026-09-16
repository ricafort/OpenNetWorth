import { NextResponse } from 'next/server';
import { getDb } from '@/infrastructure/sqlite/db';

export const dynamic = 'force-dynamic'; // Prevent static caching of API routes

export async function GET(req: Request) {
    try {
        const url = new URL(req.url);
        const docId = url.searchParams.get('id');

        if (!docId) {
            return NextResponse.json({ error: 'Missing id parameter' }, { status: 400 });
        }

        const db = getDb();
        const doc = db.prepare('SELECT mime_type, raw_content FROM m1_documents WHERE id = ?').get(docId) as any;

        if (!doc || !doc.raw_content) {
            return new NextResponse('Document not found or has no raw content', { status: 404 });
        }

        const isPdf = doc.mime_type === 'application/pdf';
        const buffer = isPdf ? Buffer.from(doc.raw_content, 'base64') : Buffer.from(doc.raw_content, 'utf-8');
        return new NextResponse(buffer, {
            headers: {
                'Content-Type': doc.mime_type || 'application/octet-stream',
                'Cache-Control': 'private, no-store, max-age=0'
            }
        });
    } catch (err: any) {
        console.error('Raw doc error:', err);
        return NextResponse.json({ error: 'Internal Server Error', details: err.message }, { status: 500 });
    }
}
