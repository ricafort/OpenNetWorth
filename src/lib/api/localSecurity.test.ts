/**
 * Local Security & Network Isolation Tests
 *
 * Why this file exists:
 * Verifies DNS rebinding defense, cross-origin request filtering, and sensitive
 * cache-control headers for local-first SQLite operations (Finding F).
 *
 * Tricky logic:
 * - NextRequest headers can include host and origin in lower or mixed case.
 * - IPv6 localhost format [::1] must be handled correctly with port suffixes.
 *
 * TODO items:
 * - Test custom bind addresses if CLI flags are added in future milestones.
 *
 * All operations execute in-memory.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { NextRequest, NextResponse } from 'next/server';
import Database from 'better-sqlite3';
import { setTestDb } from '@/infrastructure/sqlite/db';
import { runMigrations } from '@/infrastructure/sqlite/migrations';
import { validateLocalSecurity, applySensitiveHeaders } from './localSecurity';
import proxy from '@/proxy';
import { GET as vaultGet } from '@/app/api/vault/route';

describe('Local Security & Network Isolation (Item 4)', () => {
    let testDb: Database.Database;

    beforeEach(() => {
        testDb = new Database(':memory:');
        testDb.pragma('foreign_keys = ON');
        runMigrations(testDb);
        setTestDb(testDb);
    });

    afterEach(() => {
        setTestDb(null);
        testDb.close();
    });

    it('allows valid localhost and 127.0.0.1 requests on matching port', () => {
        const req1 = new NextRequest('http://localhost:4000/api/vault', {
            headers: { host: 'localhost:4000', origin: 'http://localhost:4000' }
        });
        expect(validateLocalSecurity(req1)).toBeNull();

        const req2 = new NextRequest('http://127.0.0.1:4000/api/vault', {
            headers: { host: '127.0.0.1:4000', origin: 'http://127.0.0.1:4000' }
        });
        expect(validateLocalSecurity(req2)).toBeNull();

        const req3 = new NextRequest('http://[::1]:4000/api/vault', {
            headers: { host: '[::1]:4000', origin: 'http://[::1]:4000' }
        });
        expect(validateLocalSecurity(req3)).toBeNull();
    });

    it('blocks untrusted host headers (DNS rebinding attack)', async () => {
        const req = new NextRequest('http://127.0.0.1:4000/api/vault', {
            headers: { host: 'attacker-rebind.com:4000' }
        });
        const res = validateLocalSecurity(req);
        expect(res).not.toBeNull();
        expect(res?.status).toBe(403);
        const data = await res?.json();
        expect(data.error).toContain('DNS rebinding');
    });

    it('blocks unauthorized external origins (CSRF / data exfiltration)', async () => {
        const req = new NextRequest('http://localhost:4000/api/vault', {
            headers: {
                host: 'localhost:4000',
                origin: 'https://malicious-website.com'
            }
        });
        const res = validateLocalSecurity(req);
        expect(res).not.toBeNull();
        expect(res?.status).toBe(403);
        const data = await res?.json();
        expect(data.error).toContain('Cross-origin');
    });

    // Why this test exists:
    // Fulfills Item 4: Do not trust every localhost port automatically.
    // An attacker running a service on port 9999 or 3000 must NOT be allowed cross-origin access.
    it('blocks cross-port localhost origins (rejects port 9999 targeting port 4000)', async () => {
        const req = new NextRequest('http://localhost:4000/api/vault', {
            headers: {
                host: 'localhost:4000',
                origin: 'http://localhost:9999'
            }
        });
        const res = validateLocalSecurity(req);
        expect(res).not.toBeNull();
        expect(res?.status).toBe(403);
        const data = await res?.json();
        expect(data.error).toContain('Cross-port');
    });

    it('blocks untrusted URL schemes such as javascript: or ftp:', async () => {
        const req = new NextRequest('http://localhost:4000/api/vault', {
            headers: {
                host: 'localhost:4000',
                origin: 'ftp://localhost:4000'
            }
        });
        const res = validateLocalSecurity(req);
        expect(res).not.toBeNull();
        expect(res?.status).toBe(403);
        const data = await res?.json();
        expect(data.error).toContain('scheme');
    });

    it('blocks null origin headers from sandboxed frames', async () => {
        const req = new NextRequest('http://localhost:4000/api/vault', {
            headers: {
                host: 'localhost:4000',
                origin: 'null'
            }
        });
        const res = validateLocalSecurity(req);
        expect(res).not.toBeNull();
        expect(res?.status).toBe(403);
        const data = await res?.json();
        expect(data.error).toContain('Null origin');
    });

    // Why this test exists:
    // Fulfills Item 4: Implement the claimed Referer fallback where appropriate.
    // When Origin header is omitted by the browser, Referer is verified by scheme, host, and port.
    it('evaluates Referer fallback when Origin is omitted', async () => {
        // Valid same-origin referer on matching port
        const validReq = new NextRequest('http://localhost:4000/api/vault', {
            headers: {
                host: 'localhost:4000',
                referer: 'http://localhost:4000/accounting'
            }
        });
        expect(validateLocalSecurity(validReq)).toBeNull();

        // External malicious referer
        const evilReq = new NextRequest('http://localhost:4000/api/vault', {
            headers: {
                host: 'localhost:4000',
                referer: 'https://evil.com/page'
            }
        });
        const evilRes = validateLocalSecurity(evilReq);
        expect(evilRes).not.toBeNull();
        expect(evilRes?.status).toBe(403);

        // Cross-port localhost referer
        const crossPortReq = new NextRequest('http://localhost:4000/api/vault', {
            headers: {
                host: 'localhost:4000',
                referer: 'http://localhost:8080/evil'
            }
        });
        const crossPortRes = validateLocalSecurity(crossPortReq);
        expect(crossPortRes).not.toBeNull();
        expect(crossPortRes?.status).toBe(403);
    });

    it('blocks sec-fetch-site: cross-site', async () => {
        const req = new NextRequest('http://localhost:4000/api/vault', {
            headers: {
                host: 'localhost:4000',
                'sec-fetch-site': 'cross-site'
            }
        });
        const res = validateLocalSecurity(req);
        expect(res).not.toBeNull();
        expect(res?.status).toBe(403);
        const data = await res?.json();
        expect(data.error).toContain('Cross-site');
    });

    it('applies private, no-store cache headers to sensitive responses', () => {
        const res = NextResponse.json({ test: true });
        applySensitiveHeaders(res);
        expect(res.headers.get('Cache-Control')).toBe('private, no-store, max-age=0');
        expect(res.headers.get('Pragma')).toBe('no-cache');
        expect(res.headers.get('X-Content-Type-Options')).toBe('nosniff');
    });

    // Why this test exists:
    // Fulfills Item 4: Test the actual middleware/routes as well as the helper.
    it('verifies actual proxy middleware blocks untrusted requests on /api/ routes', async () => {
        // Cross-origin request intercepted by proxy
        const attackReq = new NextRequest('http://localhost:4000/api/accounting', {
            headers: {
                host: 'localhost:4000',
                origin: 'https://evil-site.com'
            }
        });
        const blockedRes = await proxy(attackReq);
        expect(blockedRes.status).toBe(403);
        expect(blockedRes.headers.get('Cache-Control')).toBe('private, no-store, max-age=0');

        // Valid local request passes through proxy with sensitive headers attached
        const validReq = new NextRequest('http://localhost:4000/api/accounting', {
            headers: {
                host: 'localhost:4000',
                origin: 'http://localhost:4000'
            }
        });
        const passRes = await proxy(validReq);
        expect(passRes.status).toBe(200);
        expect(passRes.headers.get('Cache-Control')).toBe('private, no-store, max-age=0');
    });

    // Why this test exists:
    // Fulfills Item 4: Verifies actual API route endpoint defense.
    it('verifies actual API route GET /api/vault enforces local security boundary', async () => {
        const attackReq = new NextRequest('http://localhost:4000/api/vault', {
            headers: {
                host: 'localhost:4000',
                origin: 'http://localhost:9999' // Different port
            }
        });
        const res = await vaultGet(attackReq);
        expect(res.status).toBe(403);
        expect(res.headers.get('Cache-Control')).toBe('private, no-store, max-age=0');
    });
});
