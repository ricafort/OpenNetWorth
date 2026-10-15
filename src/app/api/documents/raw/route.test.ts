import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { NextRequest } from 'next/server';
import { GET } from './route';
import { getDb } from '@/infrastructure/sqlite/db';
import Database from 'better-sqlite3';

describe('Raw Document API Route', () => {
    let db: Database.Database;

    beforeEach(() => {
        // Under Vitest, getDb() returns an isolated in-memory database that has
        // already run the full migration list (documents table included).
        db = getDb();
    });

    afterEach(() => {
        db.prepare('DELETE FROM documents').run();
    });

    it('returns 400 if id is missing', async () => {
        const req = new NextRequest('http://localhost/api/documents/raw');
        const res = await GET(req);
        expect(res.status).toBe(400);
    });

    it('blocks foreign-origin requests with 403 (raw docs can contain statements/receipts)', async () => {
        const req = new NextRequest('http://localhost/api/documents/raw?id=doc_csv_123', {
            headers: { host: 'localhost:4000', origin: 'https://evil.example' }
        });
        const res = await GET(req);
        expect(res.status).toBe(403);
    });

    it('returns 404 if document is not found', async () => {
        const req = new NextRequest('http://localhost/api/documents/raw?id=missing');
        const res = await GET(req);
        expect(res.status).toBe(404);
    });

    it('returns base64-decoded bytes for PDFs', async () => {
        const id = 'doc_pdf_123';
        db.prepare(`
            INSERT INTO documents (id, filename, content_hash, raw_content, mime_type, byte_size, created_at)
            VALUES (?, 'test.pdf', 'hash1', 'SGVsbG8gUERGLg==', 'application/pdf', 10, '2026-01-01')
        `).run(id);

        const req = new NextRequest(`http://localhost/api/documents/raw?id=${id}`);
        const res = await GET(req);
        
        expect(res.status).toBe(200);
        expect(res.headers.get('Content-Type')).toBe('application/pdf');
        expect(res.headers.get('Cache-Control')).toBe('private, no-store, max-age=0');
        
        const text = await res.text();
        expect(text).toBe('Hello PDF.'); // "Hello PDF." in base64 is SGVsbG8gUERGLg==
    });

    it('returns raw UTF-8 bytes for CSVs', async () => {
        const id = 'doc_csv_123';
        db.prepare(`
            INSERT INTO documents (id, filename, content_hash, raw_content, mime_type, byte_size, created_at)
            VALUES (?, 'test.csv', 'hash2', 'Header\\nValue', 'text/csv', 12, '2026-01-01')
        `).run(id);

        const req = new NextRequest(`http://localhost/api/documents/raw?id=${id}`);
        const res = await GET(req);
        
        expect(res.status).toBe(200);
        expect(res.headers.get('Content-Type')).toBe('text/csv');
        expect(res.headers.get('Cache-Control')).toBe('private, no-store, max-age=0');
        
        const text = await res.text();
        expect(text).toBe('Header\\nValue');
    });
});
