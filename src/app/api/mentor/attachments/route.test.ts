/**
 * Why this file exists:
 * Proves the mentor-chat attachment ingest route enforces its limits (mime
 * allowlist 400, 10 MB cap 413, ≤4 files 400), stores files into m1_documents
 * with the right raw_content convention, dedups identical bytes via the UNIQUE
 * content_hash (backfilling extracted_text on reuse), and never lets a failed
 * PDF extraction reject the upload — it becomes a disclosure instead.
 *
 * Tricky logic:
 * - The test wires a fully-migrated in-memory DB through setTestDb, mirroring
 *   production where getDb() runs migrations at database open.
 * - raw_content must stay UTF-8 for text/* and base64 for binary so
 *   GET /api/documents/raw?id= keeps serving files correctly.
 * - The dedup-backfill case seeds a row with extracted_text NULL (as stored
 *   before the column existed) and asserts the same id comes back filled.
 *
 * All operations execute strictly in-memory using setTestDb; zero live storage modifications.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { NextRequest } from 'next/server';
import { createHash, randomUUID } from 'crypto';
import Database from 'better-sqlite3';
import { createTestDb, setTestDb } from '@/infrastructure/sqlite/db';
import { POST } from './route';

function makeRequest(body: any, headers?: Record<string, string>) {
    return new NextRequest('http://localhost:4000/api/mentor/attachments', {
        method: 'POST',
        headers: {
            host: 'localhost:4000',
            origin: 'http://localhost:4000',
            'Content-Type': 'application/json',
            ...(headers || {})
        },
        body: JSON.stringify(body)
    });
}

function b64(text: string): string {
    return Buffer.from(text, 'utf-8').toString('base64');
}

describe('/api/mentor/attachments', () => {
    let db: Database.Database;

    beforeEach(() => {
        db = createTestDb();
        setTestDb(db);
    });

    afterEach(() => {
        setTestDb(null);
        db.close();
    });

    it('blocks foreign-origin requests with 403 before touching the database', async () => {
        const res = await POST(makeRequest(
            { files: [{ filename: 'bank.csv', mimeType: 'text/csv', dataBase64: b64('a,b\n1,2\n') }] },
            { host: 'localhost:4000', origin: 'https://evil.example' }
        ));
        expect(res.status).toBe(403);
        const rows = db.prepare('SELECT COUNT(*) AS cnt FROM m1_documents').get() as any;
        expect(rows.cnt).toBe(0);
    });

    it('rejects a missing or empty files array with 400', async () => {
        const missing = await POST(makeRequest({}));
        expect(missing.status).toBe(400);
        const empty = await POST(makeRequest({ files: [] }));
        expect(empty.status).toBe(400);
    });

    it('rejects more than four files with 400', async () => {
        const files = Array.from({ length: 5 }, (_, i) => ({
            filename: `note-${i}.txt`,
            mimeType: 'text/plain',
            dataBase64: b64(`contents ${i}`)
        }));
        const res = await POST(makeRequest({ files }));
        expect(res.status).toBe(400);
    });

    it('rejects disallowed mime types with 400', async () => {
        const res = await POST(makeRequest({
            files: [{ filename: 'payload.exe', mimeType: 'application/x-msdownload', dataBase64: b64('MZ...') }]
        }));
        expect(res.status).toBe(400);
        const rows = db.prepare('SELECT COUNT(*) AS cnt FROM m1_documents').get() as any;
        expect(rows.cnt).toBe(0);
    });

    it('rejects a file over 10 MB with 413', async () => {
        const oversized = Buffer.alloc(10 * 1024 * 1024 + 1, 0x41).toString('base64');
        const res = await POST(makeRequest({
            files: [{ filename: 'huge.csv', mimeType: 'text/csv', dataBase64: oversized }]
        }));
        expect(res.status).toBe(413);
    });

    it('stores a text file with UTF-8 raw_content and passthrough extracted_text', async () => {
        const csv = 'date,amount\n2026-01-01,-500.00\n';
        const res = await POST(makeRequest({
            files: [{ filename: 'bank.csv', mimeType: 'text/csv', dataBase64: b64(csv) }]
        }));
        expect(res.status).toBe(200);
        const body = await res.json();
        expect(body.success).toBe(true);
        expect(body.attachments).toHaveLength(1);
        expect(body.attachments[0]).toMatchObject({ filename: 'bank.csv', mimeType: 'text/csv', byteSize: Buffer.byteLength(csv) });

        const row = db.prepare('SELECT id, raw_content, extracted_text, content_hash FROM m1_documents WHERE id = ?')
            .get(body.attachments[0].id) as any;
        expect(row.raw_content).toBe(csv); // UTF-8, not base64 — matches /api/documents/raw serving
        expect(row.extracted_text).toBe(csv);
        expect(row.content_hash).toBe(createHash('sha256').update(Buffer.from(csv, 'utf-8')).digest('hex'));
    });

    it('reuses the existing row for identical bytes and backfills missing extracted_text', async () => {
        const csv = 'date,amount\n2026-02-02,-42.00\n';
        const hash = createHash('sha256').update(Buffer.from(csv, 'utf-8')).digest('hex');
        const legacyId = randomUUID();
        // Simulate a row stored before extracted_text existed.
        db.prepare(`
            INSERT INTO m1_documents (id, filename, content_hash, mime_type, byte_size, raw_content, extracted_text, created_at)
            VALUES (?, 'old-name.csv', ?, 'text/csv', ?, ?, NULL, ?)
        `).run(legacyId, hash, Buffer.byteLength(csv), csv, new Date().toISOString());

        const res = await POST(makeRequest({
            files: [{ filename: 'bank.csv', mimeType: 'text/csv', dataBase64: b64(csv) }]
        }));
        const body = await res.json();
        expect(body.attachments[0].id).toBe(legacyId); // dedup via UNIQUE content_hash
        const rows = db.prepare('SELECT extracted_text FROM m1_documents WHERE id = ?').get(legacyId) as any;
        expect(rows.extracted_text).toBe(csv); // backfilled on reuse
        const count = db.prepare('SELECT COUNT(*) AS cnt FROM m1_documents').get() as any;
        expect(count.cnt).toBe(1);
    });

    it('discloses that images are attached but not analyzed (vision off)', async () => {
        const png = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x01]);
        const res = await POST(makeRequest({
            files: [{ filename: 'receipt.png', mimeType: 'image/png', dataBase64: png.toString('base64') }]
        }));
        expect(res.status).toBe(200);
        const body = await res.json();
        expect(body.attachments).toHaveLength(1);
        expect(body.disclosures.join('\n')).toContain('vision is off');

        const row = db.prepare('SELECT raw_content, extracted_text FROM m1_documents WHERE id = ?').get(body.attachments[0].id) as any;
        expect(row.raw_content).toBe(png.toString('base64')); // binary stays base64
        expect(row.extracted_text).toBeNull();
    });

    it('stores an unreadable PDF anyway and reports the extraction failure as a disclosure', async () => {
        const fakePdf = Buffer.from('this is not really a PDF', 'utf-8');
        const res = await POST(makeRequest({
            files: [{ filename: 'statement.pdf', mimeType: 'application/pdf', dataBase64: fakePdf.toString('base64') }]
        }));
        expect(res.status).toBe(200); // extraction failure never rejects the upload
        const body = await res.json();
        expect(body.attachments).toHaveLength(1);
        expect(body.disclosures.length).toBeGreaterThan(0);
        expect(body.disclosures[0]).toContain('statement.pdf');

        const row = db.prepare('SELECT extracted_text FROM m1_documents WHERE id = ?').get(body.attachments[0].id) as any;
        expect(row.extracted_text).toBeNull();
    });

    it('serves every response with no-store cache headers', async () => {
        const res = await POST(makeRequest({
            files: [{ filename: 'note.txt', mimeType: 'text/plain', dataBase64: b64('hello') }]
        }));
        expect(res.headers.get('Cache-Control')).toContain('no-store');
        expect(res.headers.get('X-Content-Type-Options')).toBe('nosniff');
    });
});
