/**
 * Why this file exists:
 * End-to-end contract test for /api/mentor/sessions — the persistence backbone of
 * the Mentors Chat History sidebar. Covers the local-security boundary (403 on a
 * foreign origin, no-store on every response), the POST → GET list → GET ?id=
 * round-trip in camelCase client shape, DELETE semantics, and 400 validation.
 *
 * Tricky logic:
 * - createTestDb() runs the full migration list, so the mentor chat tables exist
 *   exactly like they do in production, where getDb() migrates on database open.
 * - Restored messages must come back camelCase with parsed JSON payloads so the
 *   client can drop them straight into React state.
 *
 * All operations execute strictly in-memory using setTestDb; zero live storage
 * modifications.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { NextRequest } from 'next/server';
import Database from 'better-sqlite3';
import { createTestDb, setTestDb } from '@/infrastructure/sqlite/db';
import { DELETE, GET, POST } from './route';

function makeRequest(path: string, init?: { method?: string; body?: string; headers?: Record<string, string> }) {
    return new NextRequest(`http://localhost:4000${path}`, {
        method: init?.method,
        body: init?.body,
        headers: {
            host: 'localhost:4000',
            origin: 'http://localhost:4000',
            'Content-Type': 'application/json',
            ...(init?.headers || {})
        }
    });
}

describe('/api/mentor/sessions', () => {
    let db: Database.Database;

    beforeEach(() => {
        db = createTestDb();
        setTestDb(db);
    });

    afterEach(() => {
        setTestDb(null);
        db.close();
    });

    it('starts with an empty session list', async () => {
        const res = await GET(makeRequest('/api/mentor/sessions'));
        expect(res.status).toBe(200);
        const data = await res.json();
        expect(data.sessions).toEqual([]);
    });

    it('blocks foreign-origin requests with 403 before touching the database', async () => {
        const res = await GET(new NextRequest('http://localhost:4000/api/mentor/sessions', {
            headers: { host: 'localhost:4000', origin: 'https://evil.example' }
        }));
        expect(res.status).toBe(403);
    });

    it('serves every response with no-store cache headers', async () => {
        const res = await GET(makeRequest('/api/mentor/sessions'));
        expect(res.headers.get('Cache-Control')).toContain('no-store');
    });

    it('round-trips a full conversation through POST → GET list → GET ?id=', async () => {
        const postRes = await POST(makeRequest('/api/mentor/sessions', {
            method: 'POST',
            body: JSON.stringify({
                title: 'Moats and margins',
                messages: [
                    { id: 'u1', role: 'user', content: 'How is my posture?', createdAt: '2026-10-01T00:00:00.000Z' },
                    {
                        id: 'a1',
                        role: 'action_confirm',
                        actionIntent: { action: 'add_asset', name: 'Savings', amount: 5000 },
                        actionIntentResolved: 'confirmed'
                    },
                    {
                        id: 'm1',
                        role: 'mentor',
                        mentorId: 'buffett',
                        mentorName: 'Warren Buffett',
                        content: 'Moats matter.',
                        facts: { entityName: 'Personal' },
                        attachments: [{ id: 'doc-1', filename: 'bank.csv', mimeType: 'text/csv', byteSize: 120 }]
                    }
                ]
            })
        }));
        expect(postRes.status).toBe(200);
        const posted = await postRes.json();
        expect(posted.success).toBe(true);
        expect(posted.session.title).toBe('Moats and margins');
        const sessionId = posted.session.id;

        // List shows it with a message count
        const listRes = await GET(makeRequest('/api/mentor/sessions'));
        const list = await listRes.json();
        expect(list.sessions.length).toBe(1);
        expect(list.sessions[0].id).toBe(sessionId);
        expect(list.sessions[0].message_count).toBe(3);

        // Detail returns camelCase messages in seq order, JSON payloads parsed
        const detailRes = await GET(makeRequest(`/api/mentor/sessions?id=${sessionId}`));
        expect(detailRes.status).toBe(200);
        const detail = await detailRes.json();
        expect(detail.messages.map((m: any) => m.id)).toEqual(['u1', 'a1', 'm1']);
        expect(detail.messages[1].actionIntent.name).toBe('Savings');
        expect(detail.messages[1].actionIntentResolved).toBe('confirmed');
        expect(detail.messages[2].mentorName).toBe('Warren Buffett');
        expect(detail.messages[2].attachments[0].filename).toBe('bank.csv');
    });

    it('re-saving with the same id replaces the transcript instead of duplicating it', async () => {
        const first = await POST(makeRequest('/api/mentor/sessions', {
            method: 'POST',
            body: JSON.stringify({
                messages: [
                    { id: 'u1', role: 'user', content: 'one' },
                    { id: 'm1', role: 'mentor', content: 'reply' }
                ]
            })
        }));
        const { session } = await first.json();

        await POST(makeRequest('/api/mentor/sessions', {
            method: 'POST',
            body: JSON.stringify({
                id: session.id,
                messages: [{ id: 'u2', role: 'user', content: 'edited question' }]
            })
        }));

        const detail = await (await GET(makeRequest(`/api/mentor/sessions?id=${session.id}`))).json();
        expect(detail.messages.length).toBe(1);
        expect(detail.messages[0].id).toBe('u2');
    });

    it('deletes a session and 404s on repeat deletes and unknown ids', async () => {
        const created = await POST(makeRequest('/api/mentor/sessions', {
            method: 'POST',
            body: JSON.stringify({ messages: [{ id: 'u1', role: 'user', content: 'bye' }] })
        }));
        const { session } = await created.json();

        const delRes = await DELETE(makeRequest(`/api/mentor/sessions?id=${session.id}`, { method: 'DELETE' }));
        expect(delRes.status).toBe(200);

        const again = await DELETE(makeRequest(`/api/mentor/sessions?id=${session.id}`, { method: 'DELETE' }));
        expect(again.status).toBe(404);

        const missing = await GET(makeRequest('/api/mentor/sessions?id=does-not-exist'));
        expect(missing.status).toBe(404);
    });

    it('rejects invalid message roles with 400', async () => {
        const res = await POST(makeRequest('/api/mentor/sessions', {
            method: 'POST',
            body: JSON.stringify({ messages: [{ id: 'x', role: 'system', content: 'injected' }] })
        }));
        expect(res.status).toBe(400);
        expect((await res.json()).error).toContain('Invalid message role');
    });
});
