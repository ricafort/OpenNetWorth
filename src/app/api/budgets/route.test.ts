/**
 * /api/budgets route tests (budgets-vs-actuals feature).
 *
 * Why this exists:
 * Pins the contract the Budgets tab and the Actual-tab comparison rely on:
 * 1. GET requires entity_id and returns that entity's budgets only.
 * 2. POST upserts by (entity_id, category, currency); validation errors map to
 *    400 (not 500), malformed bodies to 400.
 * 3. DELETE accepts ?id= or body {id}, returns 404 when no row matched.
 * 4. Demo mode (demo_persona cookie) refuses writes with 403.
 *
 * Handlers are called directly with `new Request(...)` against an isolated
 * in-memory vault via createTestDb()/setTestDb() — zero live storage effects.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import Database from 'better-sqlite3';
import { createTestDb, setTestDb } from '@/infrastructure/sqlite/db';
import { GET, POST, DELETE } from './route';

function req(url: string, init?: RequestInit): Request {
    return new Request(`http://localhost:3000${url}`, init);
}

function postBudget(payload: Record<string, unknown>): Request {
    return req('/api/budgets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'upsert', payload })
    });
}

describe('/api/budgets', () => {
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
        it('requires entity_id', async () => {
            const res = await GET(req('/api/budgets'));
            expect(res.status).toBe(400);
        });

        it('returns only the requested entity budgets', async () => {
            await POST(postBudget({ entity_id: 'ent-1', category: 'groceries', currency: 'USD', limit_cents: 40000 }));
            await POST(postBudget({ entity_id: 'ent-2', category: 'bank_fee', currency: 'USD', limit_cents: 1500 }));

            const json = await (await GET(req('/api/budgets?entity_id=ent-1'))).json();
            expect(json.success).toBe(true);
            expect(json.budgets.length).toBe(1);
            expect(json.budgets[0].category).toBe('groceries');
            expect(json.budgets[0].limit_cents).toBe(40000);
        });
    });

    describe('POST', () => {
        it('upserts a budget and returns the stored row', async () => {
            const res = await POST(postBudget({ entity_id: 'ent-1', category: 'groceries', currency: 'USD', limit_cents: 40000 }));
            expect(res.status).toBe(200);
            const json = await res.json();
            expect(json.budget.id).toBeTruthy();
            expect(json.budget.entity_id).toBe('ent-1');

            const row = db.prepare('SELECT * FROM budgets WHERE entity_id = ?').get('ent-1') as any;
            expect(row.limit_cents).toBe(40000);
        });

        it('updates in place on re-save (upsert key is entity+category+currency)', async () => {
            await POST(postBudget({ entity_id: 'ent-1', category: 'groceries', currency: 'USD', limit_cents: 40000 }));
            const res = await POST(postBudget({ entity_id: 'ent-1', category: 'groceries', currency: 'USD', limit_cents: 45000 }));
            expect(res.status).toBe(200);
            const count = (db.prepare('SELECT COUNT(*) AS c FROM budgets').get() as any).c;
            expect(count).toBe(1);
            expect((db.prepare('SELECT limit_cents FROM budgets').get() as any).limit_cents).toBe(45000);
        });

        it('rejects malformed bodies with 400', async () => {
            const res = await POST(req('/api/budgets', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ nope: true })
            }));
            expect(res.status).toBe(400);
        });

        it('maps validation failures to 400, not 500', async () => {
            const zeroLimit = await POST(postBudget({ entity_id: 'ent-1', category: 'groceries', currency: 'USD', limit_cents: 0 }));
            expect(zeroLimit.status).toBe(400);

            const fractional = await POST(postBudget({ entity_id: 'ent-1', category: 'groceries', currency: 'USD', limit_cents: 12.5 }));
            expect(fractional.status).toBe(400);

            const blankCategory = await POST(postBudget({ entity_id: 'ent-1', category: '   ', currency: 'USD', limit_cents: 40000 }));
            expect(blankCategory.status).toBe(400);

            const count = (db.prepare('SELECT COUNT(*) AS c FROM budgets').get() as any).c;
            expect(count).toBe(0);
        });

        it('refuses writes in demo mode with 403', async () => {
            const res = await POST(new Request('http://localhost:3000/api/budgets', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    cookie: 'demo_persona=friendly_sam'
                },
                body: JSON.stringify({ action: 'upsert', payload: { entity_id: 'ent-1', category: 'groceries', currency: 'USD', limit_cents: 40000 } })
            }));
            expect(res.status).toBe(403);
        });
    });

    describe('DELETE', () => {
        it('removes a budget passed as a query param', async () => {
            const created = await POST(postBudget({ entity_id: 'ent-1', category: 'groceries', currency: 'USD', limit_cents: 40000 }));
            const { budget } = await created.json();

            const res = await DELETE(req(`/api/budgets?id=${budget.id}`, { method: 'DELETE' }));
            expect(res.status).toBe(200);
            const count = (db.prepare('SELECT COUNT(*) AS c FROM budgets').get() as any).c;
            expect(count).toBe(0);
        });

        it('removes a budget passed in the body', async () => {
            const created = await POST(postBudget({ entity_id: 'ent-1', category: 'utilities', currency: 'USD', limit_cents: 18000 }));
            const { budget } = await created.json();

            const res = await DELETE(req('/api/budgets', {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id: budget.id })
            }));
            expect(res.status).toBe(200);
        });

        it('returns 404 when no budget matches the id', async () => {
            const res = await DELETE(req('/api/budgets?id=missing', { method: 'DELETE' }));
            expect(res.status).toBe(404);
        });

        it('requires an id', async () => {
            const res = await DELETE(req('/api/budgets', { method: 'DELETE' }));
            expect(res.status).toBe(400);
        });

        it('refuses deletes in demo mode with 403', async () => {
            const res = await DELETE(new Request('http://localhost:3000/api/budgets?id=whatever', {
                method: 'DELETE',
                headers: { cookie: 'demo_persona=friendly_sam' }
            }));
            expect(res.status).toBe(403);
        });
    });
});
