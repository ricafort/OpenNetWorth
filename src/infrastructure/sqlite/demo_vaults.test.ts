/**
 * Demo vault routing tests (Phase 2.7 of the single-data-layer collapse).
 *
 * Why this test file exists:
 * Demo mode now serves each persona from a separate READ-ONLY SQLite file under
 * `data/demo_vaults/<persona>.sqlite`, selected by the `demo_persona` cookie in
 * `getDbForRequest`. These tests prove the four rewired routes (vault, settings,
 * accounting, accounting/balances):
 * 1. With a persona cookie they read ONLY the persona vault — never the live vault.
 * 2. Mutations carrying the cookie are refused with 403 (demo is read-only).
 * 3. Unknown persona keys → 400; unseeded personas → 503.
 * 4. Cookie values that fail the allowlist regex (e.g. path traversal) fall back
 *    to the live vault — no file outside the demo dir is ever opened.
 *
 * Tricky logic:
 * The seeder and db.ts both honor OPENNETWORTH_DEMO_DIR, so the whole test runs
 * against a temp directory; the live vault is never touched. `closeDb()` closes
 * the cached read-only demo connections — mandatory on Windows before deleting
 * the temp files (file locks).
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach } from 'vitest';
import fs from 'fs';
import os from 'os';
import path from 'path';
import Database from 'better-sqlite3';
import { GET as vaultGet, POST as vaultPost } from '@/app/api/vault/route';
import { GET as settingsGet, POST as settingsPost } from '@/app/api/settings/route';
import { GET as accountingGet, POST as accountingPost } from '@/app/api/accounting/route';
import { GET as balancesGet } from '@/app/api/accounting/balances/route';
import { createTestDb, setTestDb, closeDb } from '@/infrastructure/sqlite/db';

describe('Demo vaults via demo_persona cookie (Phase 2.7)', () => {
    let tmpDir: string;
    let seedPersona: (cfg: any) => void;
    let startCfg: any;

    beforeAll(async () => {
        tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'onw-demo-vaults-'));
        process.env.OPENNETWORTH_DEMO_DIR = tmpDir;
        // Dynamic import keeps the seeder's module side effects out of collection time.
        const mod = await import('../../../scripts/seed-demo-vaults');
        seedPersona = mod.seedPersona;
        startCfg = mod.PERSONAS.find((p: any) => p.id === 'start');
        expect(startCfg, 'persona "start" must exist in demoConfigs').toBeTruthy();
        seedPersona(startCfg);
    });

    afterAll(() => {
        closeDb(); // closes cached read-only demo connections (Windows file locks)
        setTestDb(null);
        delete process.env.OPENNETWORTH_DEMO_DIR;
        fs.rmSync(tmpDir, { recursive: true, force: true });
    });

    beforeEach(() => {
        // Stand-in for the live vault: anything appearing here must never leak
        // into a persona-cookie response.
        const live = createTestDb();
        live.prepare("INSERT INTO settings (key, value) VALUES ('liveMarker', '\"live-only\"')").run();
        setTestDb(live);
    });

    afterEach(() => {
        closeDb();
        setTestDb(null);
    });

    const req = (url: string, opts: { cookie?: string; method?: string; body?: any } = {}) => {
        const headers: Record<string, string> = {};
        if (opts.cookie) headers.cookie = opts.cookie;
        if (opts.body !== undefined) headers['content-type'] = 'application/json';
        return new Request(url, {
            method: opts.method || 'GET',
            headers,
            body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined
        });
    };
    const demoCookie = 'demo_persona=start';

    it('GET /api/vault?entity=goals with persona cookie reads the persona vault', async () => {
        const res = await vaultGet(req('http://localhost:3000/api/vault?entity=goals', { cookie: demoCookie }));
        expect(res.status).toBe(200);
        const json = await res.json();
        expect(json.data.length).toBeGreaterThan(0);
        for (const row of json.data) {
            expect(String(row.id).startsWith('start-g-')).toBe(true);
        }
    });

    it('GET /api/vault without cookie reads the live vault (persona rows absent)', async () => {
        const res = await vaultGet(req('http://localhost:3000/api/vault?entity=goals'));
        expect(res.status).toBe(200);
        const json = await res.json();
        expect(json.data).toEqual([]); // live stand-in has no goals
    });

    it('GET /api/vault full snapshot with persona cookie serves persona accounts and history', async () => {
        const res = await vaultGet(req('http://localhost:3000/api/vault', { cookie: demoCookie }));
        expect(res.status).toBe(200);
        const json = await res.json();
        // Full GET wraps everything in { success, manifest, vault: {...} }.
        const vault = json.vault || {};
        const accountIds = (vault.accounts || []).map((a: any) => a.id);
        expect(accountIds.some((id: string) => id.startsWith('start-a-'))).toBe(true);
        expect(accountIds.some((id: string) => id.startsWith('start-l-'))).toBe(true);
        expect((vault.goals || []).length).toBeGreaterThan(0);
        expect((vault.history || []).length).toBe(24);
        expect((vault.cashFlow || []).length).toBe(12);
    });

    it('POST /api/vault with persona cookie is refused 403 (read-only)', async () => {
        const res = await vaultPost(req('http://localhost:3000/api/vault', {
            cookie: demoCookie,
            method: 'POST',
            body: { action: 'scoped_save', entity: 'goals', item: { id: 'x', name: 'Nope', target_amount: 1 } }
        }));
        expect(res.status).toBe(403);
        const json = await res.json();
        expect(json.error).toContain('read-only');
    });

    it('GET with unknown persona cookie → 400', async () => {
        const res = await vaultGet(req('http://localhost:3000/api/vault?entity=goals', { cookie: 'demo_persona=notreal' }));
        expect(res.status).toBe(400);
        const json = await res.json();
        expect(json.error).toContain('Unknown demo persona');
    });

    it('GET with unseeded (but allowlisted) persona → 503', async () => {
        // "grow" is on the allowlist but only "start" was seeded into the temp dir.
        const res = await vaultGet(req('http://localhost:3000/api/vault?entity=goals', { cookie: 'demo_persona=grow' }));
        expect(res.status).toBe(503);
        const json = await res.json();
        expect(json.error).toContain('not seeded');
    });

    it('cookie value failing the allowlist regex falls back to the live vault (no traversal)', async () => {
        // The regex ([A-Za-z0-9_-]+) cannot capture "../" style values, so the
        // request behaves as cookie-less: live vault, never a path outside the demo dir.
        const res = await vaultGet(req('http://localhost:3000/api/vault?entity=goals', {
            cookie: 'demo_persona=../../opennetworth'
        }));
        expect(res.status).toBe(200);
        const json = await res.json();
        expect(json.data).toEqual([]); // live stand-in data, not persona rows
    });

    it('GET /api/settings with persona cookie serves persona kv, not the live marker', async () => {
        const res = await settingsGet(req('http://localhost:3000/api/settings', { cookie: demoCookie }));
        expect(res.status).toBe(200);
        const json = await res.json();
        expect(json.settings.liveMarker).toBeUndefined();
        expect(json.settings.userSettings?.baseCurrency).toBe('USD');
        expect(json.settings.freedomSettings).toBeTruthy();
    });

    it('GET /api/settings without cookie serves the live kv', async () => {
        const res = await settingsGet(req('http://localhost:3000/api/settings'));
        expect(res.status).toBe(200);
        const json = await res.json();
        expect(json.settings.liveMarker).toBe('live-only');
    });

    it('POST /api/settings with persona cookie is refused 403', async () => {
        const res = await settingsPost(req('http://localhost:3000/api/settings', {
            cookie: demoCookie, method: 'POST', body: { key: 'theme', value: 'dark' }
        }));
        expect(res.status).toBe(403);
    });

    it('GET /api/accounting with persona cookie lists persona ledger accounts', async () => {
        const res = await accountingGet(req('http://localhost:3000/api/accounting', { cookie: demoCookie }));
        expect(res.status).toBe(200);
        const json = await res.json();
        expect(json.success).toBe(true);
        const ids = (json.accounts || []).map((a: any) => a.id);
        expect(ids.some((id: string) => id.startsWith('start-a-'))).toBe(true);
    });

    it('POST /api/accounting with persona cookie is refused 403', async () => {
        const res = await accountingPost(req('http://localhost:3000/api/accounting', {
            cookie: demoCookie, method: 'POST', body: { action: 'record_income', amount_cents: 100 }
        }));
        expect(res.status).toBe(403);
    });

    it('GET /api/accounting/balances with persona cookie returns persona summary totals', async () => {
        const res = await balancesGet(req('http://localhost:3000/api/accounting/balances', { cookie: demoCookie }));
        expect(res.status).toBe(200);
        const json = await res.json();
        expect(json.success).toBe(true);
        const ids = (json.summary.accounts || []).map((a: any) => a.account_id);
        expect(ids.length).toBe(startCfg.assets.length + startCfg.liabilities.length);
        expect(ids.every((id: string) => id.startsWith('start-'))).toBe(true);
    });

    it('seeded persona vault is a plain single-file DB (journal_mode=DELETE) openable read-only', () => {
        // Read-only enforcement lives at the CONNECTION level (better-sqlite3
        // readonly: true in getDemoDb) plus the 403 route guard — the file itself
        // stays writable, which is what makes re-seeding possible. journal_mode=DELETE
        // guarantees no WAL sidecars, so a readonly connection never needs write access
        // to the directory.
        const dbPath = path.join(tmpDir, 'start.sqlite');
        const check = new Database(dbPath, { readonly: true });
        try {
            const row = check.pragma('journal_mode') as any[];
            expect(String(row[0].journal_mode).toLowerCase()).toBe('delete');
            expect(() => check.prepare("INSERT INTO settings (key, value) VALUES ('hack', '1')").run())
                .toThrow(); // readonly connection rejects writes at the driver
        } finally {
            check.close();
        }
    });
});
