/**
 * Settings key-value API (Phase 2.5 of the single-data-layer collapse).
 *
 * Why this exists:
 * UI state (base currency, theme, check-in frequency, debt payoff plan,
 * dashboard layout) used to be read from browser localStorage with SQLite as a
 * write-only mirror. This route makes the SQLite `settings` kv table the single
 * read source, so state survives browser resets and is covered by vault
 * backups. Writes keep going through the existing vault scoped_save path;
 * this route adds the missing read (and a keyed delete for resets).
 *
 * Tricky logic:
 * - GET filters out credential-bearing keys (same regex as the vault backup
 *   export) so tokens that live in the kv table never reach the UI layer.
 * - Values are stored as JSON text; values that are not valid JSON (legacy
 *   plain strings) are returned verbatim.
 * - baseCurrency writes also sync the local profile row, mirroring the vault
 *   scoped_save behavior so currency stays consistent across reads.
 */

import { NextResponse } from 'next/server';
import { getDb } from '@/infrastructure/sqlite/db';
import { validateLocalSecurity, applySensitiveHeaders } from '@/lib/api/localSecurity';

function secureJson(data: any, init?: ResponseInit): NextResponse {
    return applySensitiveHeaders(NextResponse.json(data, init));
}

// Mirrors the vault backup export filter (vault/route.ts) — credential keys
// must never cross the API boundary into client-side settings state.
const SECRET_KEY_RE = /token|secret|password|credential|apikey|api_key/i;

function parseValue(raw: string): any {
    try {
        return JSON.parse(raw);
    } catch {
        return raw;
    }
}

export async function GET(request: Request) {
    const securityCheck = validateLocalSecurity(request);
    if (securityCheck) return securityCheck;
    try {
        const db = getDb();
        const rows = db.prepare('SELECT key, value FROM settings').all() as { key: string; value: string }[];
        const settings: Record<string, any> = {};
        for (const row of rows) {
            if (SECRET_KEY_RE.test(row.key)) continue;
            settings[row.key] = parseValue(row.value);
        }
        return secureJson({ settings });
    } catch (e: any) {
        return secureJson({ error: e.message || 'Failed to read settings' }, { status: 500 });
    }
}

export async function POST(request: Request) {
    const securityCheck = validateLocalSecurity(request);
    if (securityCheck) return securityCheck;
    try {
        const body = await request.json().catch(() => null);
        const db = getDb();
        const upsert = db.prepare(`
            INSERT INTO settings (key, value)
            VALUES (?, ?)
            ON CONFLICT(key) DO UPDATE SET value = excluded.value
        `);
        const syncCurrency = (currency: any) => {
            if (typeof currency === 'string' && currency) {
                db.prepare("UPDATE profiles SET currency_code = ? WHERE id = 'local_user'").run(currency);
            }
        };

        // Single-key form: { key, value }
        if (body && typeof body === 'object' && 'key' in body) {
            const { key, value } = body as { key: any; value: any };
            if (typeof key !== 'string' || !key) {
                return secureJson({ error: 'key must be a non-empty string' }, { status: 400 });
            }
            if (SECRET_KEY_RE.test(key)) {
                return secureJson({ error: `Refusing to store credential key "${key}" via the settings API` }, { status: 400 });
            }
            if (value === undefined) {
                return secureJson({ error: 'value is required' }, { status: 400 });
            }
            upsert.run(key, typeof value === 'string' ? value : JSON.stringify(value));
            if (key === 'baseCurrency') syncCurrency(value);
            return secureJson({ success: true, key });
        }

        // Batch form: { settings: { key: value, ... } }
        if (body && typeof body === 'object' && body.settings && typeof body.settings === 'object') {
            // Validate every key BEFORE writing any — a rejected credential key must
            // not leave the earlier entries of the batch half-applied.
            for (const key of Object.keys(body.settings)) {
                if (SECRET_KEY_RE.test(key)) {
                    return secureJson({ error: `Refusing to store credential key "${key}" via the settings API` }, { status: 400 });
                }
            }
            for (const [key, value] of Object.entries(body.settings)) {
                upsert.run(key, typeof value === 'string' ? value : JSON.stringify(value));
            }
            if ((body.settings as any).baseCurrency) syncCurrency((body.settings as any).baseCurrency);
            return secureJson({ success: true });
        }

        return secureJson({ error: 'Body must be {key, value} or {settings: {...}}' }, { status: 400 });
    } catch (e: any) {
        return secureJson({ error: e.message || 'Failed to save settings' }, { status: 500 });
    }
}

export async function DELETE(request: Request) {
    const securityCheck = validateLocalSecurity(request);
    if (securityCheck) return securityCheck;
    try {
        const { searchParams } = new URL(request.url);
        let key = searchParams.get('key');
        if (!key) {
            const body = await request.json().catch(() => null);
            if (body && typeof body.key === 'string') key = body.key;
        }
        if (!key) {
            return secureJson({ error: 'Missing key for settings delete' }, { status: 400 });
        }
        const db = getDb();
        db.prepare('DELETE FROM settings WHERE key = ?').run(key);
        return secureJson({ success: true, key });
    } catch (e: any) {
        return secureJson({ error: e.message || 'Failed to delete setting' }, { status: 500 });
    }
}
