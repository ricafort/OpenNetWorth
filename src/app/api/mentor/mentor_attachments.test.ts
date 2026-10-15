/**
 * Why this file exists:
 * Proves /api/mentor grounds the user turn in the stored extracted_text of
 * attached documents rows: text/CSV content lands in the prompt (truncated
 * at 8000 chars), images are disclosed as unanalyzed (vision off), rows without
 * extraction get an explicit "answer without it" line, and unknown attachment
 * ids are skipped without breaking the reply contract.
 *
 * Tricky logic:
 * - The recurring_schedules table is created by full app DB init, not
 *   initAccountingSchema, so this test creates it explicitly in the in-memory DB.
 * - documents rows are seeded directly (the ingest route has its own test);
 *   this file only checks how the mentor route consumes them.
 * - The untrusted-content footer must always follow the attachment block so a
 *   malicious CSV cannot override the system prompt.
 *
 * All operations execute strictly in-memory using setTestDb; zero live storage modifications.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { NextRequest } from 'next/server';
import Database from 'better-sqlite3';
import { setTestDb } from '@/infrastructure/sqlite/db';
import { initAccountingSchema } from '@/lib/domain/accounting/schema';
import { initDocumentSchema } from '@/lib/domain/document/schema';
import { POST } from './route';

const queryLocalLlm = vi.fn().mockResolvedValue('Mocked mentor reply.');

vi.mock('@/lib/api/localLlm', () => ({
    queryLocalLlm: (...args: any[]) => queryLocalLlm(...args)
}));

function makeRequest(body: any) {
    return new NextRequest('http://localhost:4000/api/mentor', {
        method: 'POST',
        headers: {
            host: 'localhost:4000',
            origin: 'http://localhost:4000',
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(body)
    });
}

function seedDocument(id: string, filename: string, mimeType: string, extractedText: string | null, rawContent = 'raw') {
    db.prepare(`
        INSERT INTO documents (id, filename, content_hash, mime_type, byte_size, raw_content, extracted_text, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(id, filename, `hash-${id}`, mimeType, 10, rawContent, extractedText, new Date().toISOString());
}

let db: Database.Database;

describe('/api/mentor attachments grounding', () => {
    beforeEach(() => {
        db = new Database(':memory:');
        initAccountingSchema(db);
        initDocumentSchema(db);
        db.exec(`
            CREATE TABLE IF NOT EXISTS recurring_schedules (
                id TEXT PRIMARY KEY,
                user_id TEXT NOT NULL,
                name TEXT NOT NULL,
                amount REAL NOT NULL,
                type TEXT NOT NULL,
                frequency TEXT NOT NULL,
                category TEXT NOT NULL,
                start_date TEXT NOT NULL,
                end_date TEXT,
                is_active INTEGER DEFAULT 1,
                currency TEXT DEFAULT 'USD',
                created_at TEXT NOT NULL
            );
        `);
        setTestDb(db);
        queryLocalLlm.mockClear();
    });

    afterEach(() => {
        setTestDb(null);
        db.close();
    });

    function lastUserContent(): string {
        const messages = queryLocalLlm.mock.calls[0][0];
        return messages[messages.length - 1].content;
    }

    it('appends the stored extracted_text of a text attachment to the user turn', async () => {
        seedDocument('doc-csv', 'bank.csv', 'text/csv', 'date,amount\n2026-01-01,-500.00\n');

        const res = await POST(makeRequest({
            mentor: { name: 'Warren Buffett', archetype: 'Value Investing' },
            mode: 'reflect',
            userContext: { currency: 'USD' },
            message: 'What do you see in this file?',
            attachments: [{ id: 'doc-csv', filename: 'bank.csv', mimeType: 'text/csv', byteSize: 10 }]
        }));
        expect(res.status).toBe(200);

        const content = lastUserContent();
        expect(content).toContain('What do you see in this file?');
        expect(content).toContain('USER-ATTACHED FILES FOR THIS MESSAGE:');
        expect(content).toContain('[Attached: bank.csv]');
        expect(content).toContain('2026-01-01,-500.00');
        expect(content).toContain('untrusted document content');
    });

    it('truncates extracted text at 8000 characters', async () => {
        seedDocument('doc-long', 'big.csv', 'text/csv', 'x'.repeat(9000));

        const res = await POST(makeRequest({
            mentor: { name: 'Naval', archetype: 'Wealth & Leverage' },
            mode: 'analyze',
            userContext: { currency: 'USD' },
            message: 'Summarize this file',
            attachments: [{ id: 'doc-long', filename: 'big.csv', mimeType: 'text/csv', byteSize: 9000 }]
        }));
        expect(res.status).toBe(200);

        const content = lastUserContent();
        expect(content).toContain('x'.repeat(8000));
        expect(content).not.toContain('x'.repeat(8001));
    });

    it('discloses images as attached-but-not-analyzed when vision is off', async () => {
        seedDocument('doc-img', 'receipt.png', 'image/png', null);

        const res = await POST(makeRequest({
            mentor: { name: 'Naval', archetype: 'Wealth & Leverage' },
            mode: 'reflect',
            userContext: { currency: 'USD' },
            message: 'What does my receipt say?',
            attachments: [{ id: 'doc-img', filename: 'receipt.png', mimeType: 'image/png', byteSize: 10 }]
        }));
        expect(res.status).toBe(200);

        const content = lastUserContent();
        expect(content).toContain('[Attached image: receipt.png]');
        expect(content).toContain('vision is disabled');
    });

    it('says so explicitly when a non-image row has no extracted text', async () => {
        seedDocument('doc-scan', 'scan.pdf', 'application/pdf', null);

        const res = await POST(makeRequest({
            mentor: { name: 'Naval', archetype: 'Wealth & Leverage' },
            mode: 'analyze',
            userContext: { currency: 'USD' },
            message: 'Read my statement',
            attachments: [{ id: 'doc-scan', filename: 'scan.pdf', mimeType: 'application/pdf', byteSize: 10 }]
        }));
        expect(res.status).toBe(200);

        const content = lastUserContent();
        expect(content).toContain('[Attached: scan.pdf]');
        expect(content).toContain('No readable text could be extracted');
    });

    it('skips unknown or malformed attachment ids without breaking the reply', async () => {
        seedDocument('doc-real', 'notes.txt', 'text/plain', 'keep this line');

        const res = await POST(makeRequest({
            mentor: { name: 'Naval', archetype: 'Wealth & Leverage' },
            mode: 'reflect',
            userContext: { currency: 'USD' },
            message: 'Any red flags?',
            attachments: [
                { id: 'doc-missing', filename: 'ghost.csv', mimeType: 'text/csv', byteSize: 1 },
                null,
                { filename: 'no-id.txt' },
                { id: 'doc-real', filename: 'notes.txt', mimeType: 'text/plain', byteSize: 10 }
            ]
        }));
        expect(res.status).toBe(200);

        const content = lastUserContent();
        expect(content).not.toContain('ghost.csv');
        expect(content).toContain('[Attached: notes.txt]');
        expect(content).toContain('keep this line');
    });

    it('caps the grounded attachments at the first four ids', async () => {
        for (let i = 0; i < 5; i++) {
            seedDocument(`doc-${i}`, `file-${i}.txt`, 'text/plain', `marker-${i}`);
        }

        const res = await POST(makeRequest({
            mentor: { name: 'Naval', archetype: 'Wealth & Leverage' },
            mode: 'analyze',
            userContext: { currency: 'USD' },
            message: 'Five files attached',
            attachments: Array.from({ length: 5 }, (_, i) => ({ id: `doc-${i}`, filename: `file-${i}.txt`, mimeType: 'text/plain', byteSize: 10 }))
        }));
        expect(res.status).toBe(200);

        const content = lastUserContent();
        for (let i = 0; i < 4; i++) expect(content).toContain(`marker-${i}`);
        expect(content).not.toContain('marker-4');
    });

    it('sends image parts to the model when vision is enabled in local config', async () => {
        seedDocument('doc-vision', 'receipt.png', 'image/png', null, 'aGVsbG8gcmVjZWlwdA==');

        const res = await POST(makeRequest({
            mentor: { name: 'Naval', archetype: 'Wealth & Leverage' },
            mode: 'analyze',
            userContext: { currency: 'USD' },
            message: 'What does my receipt say?',
            localConfig: { visionEnabled: true },
            attachments: [{ id: 'doc-vision', filename: 'receipt.png', mimeType: 'image/png', byteSize: 10 }]
        }));
        expect(res.status).toBe(200);

        const messages = queryLocalLlm.mock.calls[0][0];
        const userMsg = messages[messages.length - 1];
        expect(Array.isArray(userMsg.content)).toBe(true);
        expect(userMsg.content[0].type).toBe('text');
        expect(userMsg.content[0].text).toContain('What does my receipt say?');
        expect(userMsg.content[0].text).toContain('[Attached image: receipt.png]');
        expect(userMsg.content[1]).toEqual({
            type: 'image_url',
            image_url: { url: 'data:image/png;base64,aGVsbG8gcmVjZWlwdA==' }
        });
    });

    it('retries once text-only when the vision request fails, with a disclosure', async () => {
        seedDocument('doc-vfail', 'chart.png', 'image/png', null, 'QUJD');
        queryLocalLlm
            .mockRejectedValueOnce(new Error('HTTP 400: model does not support images'))
            .mockResolvedValueOnce('Text-only recovery answer.');

        const res = await POST(makeRequest({
            mentor: { name: 'Naval', archetype: 'Wealth & Leverage' },
            mode: 'analyze',
            userContext: { currency: 'USD' },
            message: 'Describe this chart',
            localConfig: { visionEnabled: true },
            attachments: [{ id: 'doc-vfail', filename: 'chart.png', mimeType: 'image/png', byteSize: 10 }]
        }));
        expect(res.status).toBe(200);
        const body = await res.json();
        expect(body.response).toBe('Text-only recovery answer.');
        expect(queryLocalLlm).toHaveBeenCalledTimes(2);

        // Second attempt must be text-only and disclose the failed image analysis.
        const retryMessages = queryLocalLlm.mock.calls[1][0];
        const retryUser = retryMessages[retryMessages.length - 1];
        expect(typeof retryUser.content).toBe('string');
        expect(retryUser.content).toContain('could not be analyzed');
    });

    it('leaves the user turn untouched when attachments are absent (regression guard)', async () => {
        const res = await POST(makeRequest({
            mentor: { name: 'Naval', archetype: 'Wealth & Leverage' },
            mode: 'reflect',
            userContext: { currency: 'USD' },
            message: 'Plain question'
        }));
        expect(res.status).toBe(200);

        const content = lastUserContent();
        expect(content).toBe('[Mode: reflect]\n\nPlain question');
    });
});
