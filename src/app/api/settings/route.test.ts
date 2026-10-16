/**
 * /api/settings route tests (Phase 2.5 — UI state reads from the SQLite kv).
 *
 * Why this exists:
 * The settings kv table becomes the single read source for UI state. These
 * tests pin the three behaviors the client loaders rely on:
 * 1. GET returns parsed values and NEVER returns credential-bearing keys.
 * 2. POST upserts single and batch forms; baseCurrency syncs the profile row.
 * 3. DELETE removes a key by query param or body.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import Database from 'better-sqlite3';
import { createTestDb, setTestDb } from '@/infrastructure/sqlite/db';
import { GET, POST, DELETE } from './route';

function req(url: string, init?: RequestInit): Request {
    return new Request(`http://localhost:3000${url}`, init);
}

describe('/api/settings', () => {
    let db: Database.Database;

    beforeEach(() => {
        db = createTestDb();
        setTestDb(db);
    });

    afterEach(() => {
        setTestDb(null);
        try {
            db.close();
        } catch {
            // Already closed
        }
    });

    describe('GET', () => {
        it('returns parsed JSON values and plain strings verbatim', async () => {
            db.prepare("INSERT INTO settings (key, value) VALUES ('userSettings', ?)").run(
                JSON.stringify({ baseCurrency: 'AUD', theme: 'dark' })
            );
            db.prepare("INSERT INTO settings (key, value) VALUES ('plainString', 'not-json')").run();

            const res = await GET(req('/api/settings'));
            expect(res.status).toBe(200);
            const json = await res.json();
            expect(json.settings.userSettings).toEqual({ baseCurrency: 'AUD', theme: 'dark' });
            expect(json.settings.plainString).toBe('not-json');
        });

        it('filters out credential-bearing keys', async () => {
            db.prepare("INSERT INTO settings (key, value) VALUES ('plaid_access_token', 'secret-token')").run();
            db.prepare("INSERT INTO settings (key, value) VALUES ('openai_api_key', 'sk-test')").run();
            db.prepare("INSERT INTO settings (key, value) VALUES ('db_password', 'hunter2')").run();
            db.prepare("INSERT INTO settings (key, value) VALUES ('dashboardLayout', '{\"version\":1}')").run();

            const json = await (await GET(req('/api/settings'))).json();
            expect(json.settings.dashboardLayout).toEqual({ version: 1 });
            expect(json.settings.plaid_access_token).toBeUndefined();
            expect(json.settings.openai_api_key).toBeUndefined();
            expect(json.settings.db_password).toBeUndefined();
        });
    });

    describe('POST', () => {
        it('upserts a single {key, value} pair (objects stored as JSON text)', async () => {
            const res = await POST(req('/api/settings', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ key: 'freedomSettings', value: { strategy: 'snowball', extraMonthlyPayment: 250, currency: 'AUD' } })
            }));
            expect(res.status).toBe(200);

            const raw = db.prepare("SELECT value FROM settings WHERE key = 'freedomSettings'").get() as any;
            expect(JSON.parse(raw.value)).toEqual({ strategy: 'snowball', extraMonthlyPayment: 250, currency: 'AUD' });

            // Upsert (not duplicate insert)
            await POST(req('/api/settings', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ key: 'freedomSettings', value: { strategy: 'avalanche', extraMonthlyPayment: 500, currency: 'AUD' } })
            }));
            const count = db.prepare("SELECT COUNT(*) AS c FROM settings WHERE key = 'freedomSettings'").get() as any;
            expect(count.c).toBe(1);
        });

        it('syncs baseCurrency writes to the local profile row', async () => {
            await POST(req('/api/settings', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ key: 'baseCurrency', value: 'AUD' })
            }));
            const prof = db.prepare("SELECT currency_code FROM profiles WHERE id = 'local_user'").get() as any;
            expect(prof.currency_code).toBe('AUD');
        });

        it('upserts a batch {settings: {...}} form', async () => {
            const res = await POST(req('/api/settings', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    settings: {
                        ui_state_migrated_v1: true,
                        userSettings: { baseCurrency: 'GBP' },
                        dashboardLayout: { version: 3 }
                    }
                })
            }));
            expect(res.status).toBe(200);
            const rows = db.prepare('SELECT key, value FROM settings').all() as any[];
            const map = Object.fromEntries(rows.map(r => [r.key, JSON.parse(r.value)]));
            expect(map.ui_state_migrated_v1).toBe(true);
            expect(map.userSettings).toEqual({ baseCurrency: 'GBP' });
            expect(map.dashboardLayout).toEqual({ version: 3 });
        });

        it('rejects credential keys in both forms without partial writes', async () => {
            const single = await POST(req('/api/settings', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ key: 'session_token', value: 'abc' })
            }));
            expect(single.status).toBe(400);

            const batch = await POST(req('/api/settings', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ settings: { safeKey: 'ok', leaked_token: 'abc' } })
            }));
            expect(batch.status).toBe(400);
            // Validation happens before any write — the safe key must not have landed.
            const count = db.prepare("SELECT COUNT(*) AS c FROM settings WHERE key = 'safeKey'").get() as any;
            expect(count.c).toBe(0);
        });

        it('rejects malformed bodies with 400', async () => {
            const res = await POST(req('/api/settings', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ nope: true })
            }));
            expect(res.status).toBe(400);
        });
    });

    describe('DELETE', () => {
        it('removes a key passed as a query param', async () => {
            db.prepare("INSERT INTO settings (key, value) VALUES ('dashboardLayout', '{\"version\":1}')").run();
            const res = await DELETE(req('/api/settings?key=dashboardLayout', { method: 'DELETE' }));
            expect(res.status).toBe(200);
            const count = db.prepare("SELECT COUNT(*) AS c FROM settings WHERE key = 'dashboardLayout'").get() as any;
            expect(count.c).toBe(0);
        });

        it('removes a key passed in the body', async () => {
            db.prepare("INSERT INTO settings (key, value) VALUES ('stale', 'x')").run();
            const res = await DELETE(req('/api/settings', {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ key: 'stale' })
            }));
            expect(res.status).toBe(200);
            const count = db.prepare("SELECT COUNT(*) AS c FROM settings WHERE key = 'stale'").get() as any;
            expect(count.c).toBe(0);
        });

        it('requires a key', async () => {
            const res = await DELETE(req('/api/settings', { method: 'DELETE' }));
            expect(res.status).toBe(400);
        });
    });
});
