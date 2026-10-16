/**
 * UI state boot migration + vault loaders (Phase 2.5).
 *
 * Why this exists:
 * UI state (general settings, freedom plan, dashboard layout) used to live in
 * localStorage with SQLite as a write-only mirror. These tests pin the new
 * contract:
 * 1. On first vault read, localStorage values are pushed into the settings kv
 *    exactly once, guarded by a marker row INSIDE the kv table.
 * 2. The marker makes the migration idempotent: later localStorage edits do
 *    not re-push (the vault is authoritative after migration).
 * 3. Vault loaders return explicit defaults when both stores are empty.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import Database from 'better-sqlite3';
import { createTestDb, setTestDb } from '@/infrastructure/sqlite/db';
import { GET as settingsGet, POST as settingsPost, DELETE as settingsDelete } from '@/app/api/settings/route';
import {
    loadSettingsFromVault,
    loadFreedomSettingsFromVault,
    loadDashboardLayoutFromVault,
    resetDashboardLayout,
    resetUiStateMigrationForTests
} from '@/infrastructure/local_driver';

const mockLocalStorage: Record<string, string> = {};

function bridgeFetchToSettingsRoute() {
    (global as any).fetch = vi.fn().mockImplementation(async (url: string, init?: any) => {
        const req = new Request(`http://localhost:3000${url}`, init);
        const method = (init?.method || 'GET').toUpperCase();
        if (method === 'GET') return settingsGet(req);
        if (method === 'POST') return settingsPost(req);
        if (method === 'DELETE') return settingsDelete(req);
        throw new Error(`Unexpected fetch method ${method}`);
    });
}

describe('UI state vault migration and loaders', () => {
    let db: Database.Database;

    beforeEach(() => {
        db = createTestDb();
        setTestDb(db);

        for (const key of Object.keys(mockLocalStorage)) {
            delete mockLocalStorage[key];
        }
        (global as any).window = {
            dispatchEvent: vi.fn(),
            location: { reload: vi.fn(), href: '' }
        };
        (global as any).localStorage = {
            getItem: (key: string) => mockLocalStorage[key] || null,
            setItem: (key: string, val: string) => { mockLocalStorage[key] = val; },
            removeItem: (key: string) => { delete mockLocalStorage[key]; },
            clear: () => {
                for (const k of Object.keys(mockLocalStorage)) {
                    delete mockLocalStorage[k];
                }
            }
        };

        // The migration singleton is module-level; reset it per test.
        resetUiStateMigrationForTests();
        bridgeFetchToSettingsRoute();
    });

    afterEach(() => {
        setTestDb(null);
        delete (global as any).window;
        delete (global as any).localStorage;
        delete (global as any).fetch;
        try {
            db.close();
        } catch {
            // Already closed
        }
    });

    it('migrates localStorage UI state into the settings kv once, then serves it from SQLite', async () => {
        mockLocalStorage['opennetworth_settings'] = JSON.stringify({
            baseCurrency: 'AUD',
            theme: 'dark',
            checkInFrequency: 'weekly',
            lastCheckIn: '2026-09-01T00:00:00.000Z'
        });
        mockLocalStorage['opennetworth_freedom_settings'] = JSON.stringify({
            strategy: 'snowball',
            extraMonthlyPayment: 250,
            currency: 'AUD'
        });
        mockLocalStorage['clearworth_dashboard_layout'] = JSON.stringify({ version: 1, hiddenWidgets: ['news'] });

        const settings = await loadSettingsFromVault();
        expect(settings.baseCurrency).toBe('AUD');
        expect(settings.theme).toBe('dark');
        expect(settings.lastCheckIn).toBe('2026-09-01T00:00:00.000Z');

        const freedom = await loadFreedomSettingsFromVault();
        expect(freedom).toEqual({ strategy: 'snowball', extraMonthlyPayment: 250, currency: 'AUD' });

        const layout = await loadDashboardLayoutFromVault();
        expect(layout).toEqual({ version: 1, hiddenWidgets: ['news'] });

        // Marker row lives in the kv table itself, not in localStorage.
        const marker = db.prepare("SELECT value FROM settings WHERE key = 'ui_state_migrated_v1'").get() as any;
        expect(marker).toBeTruthy();
        expect(mockLocalStorage['ui_state_migrated_v1']).toBeUndefined();
    });

    it('marker makes the migration idempotent: later localStorage edits never re-push', async () => {
        mockLocalStorage['opennetworth_settings'] = JSON.stringify({ baseCurrency: 'AUD' });
        const first = await loadSettingsFromVault();
        expect(first.baseCurrency).toBe('AUD');

        // Simulate a stale/edited localStorage after migration completed.
        mockLocalStorage['opennetworth_settings'] = JSON.stringify({ baseCurrency: 'JPY' });
        resetUiStateMigrationForTests(); // force the migration check to run again

        const second = await loadSettingsFromVault();
        expect(second.baseCurrency).toBe('AUD'); // SQLite remains authoritative
        const raw = db.prepare("SELECT value FROM settings WHERE key = 'userSettings'").get() as any;
        expect(JSON.parse(raw.value).baseCurrency).toBe('AUD');
    });

    it('picks up legacy clearworth_* keys via the storage fallback', async () => {
        mockLocalStorage['clearworth_settings'] = JSON.stringify({ baseCurrency: 'GBP', theme: 'light' });
        const settings = await loadSettingsFromVault();
        expect(settings.baseCurrency).toBe('GBP');
        expect(settings.theme).toBe('light');
    });

    it('returns explicit defaults when both stores are empty', async () => {
        const settings = await loadSettingsFromVault();
        expect(settings).toEqual({ baseCurrency: 'USD', theme: 'system', checkInFrequency: 'monthly' });

        const freedom = await loadFreedomSettingsFromVault();
        expect(freedom).toEqual({ strategy: 'avalanche', extraMonthlyPayment: 500, currency: 'USD' });

        const layout = await loadDashboardLayoutFromVault();
        expect(layout).toBeNull();
    });

    it('resetDashboardLayout deletes the vault key so the default layout wins next load', async () => {
        db.prepare("INSERT INTO settings (key, value) VALUES ('dashboardLayout', '{\"version\":1,\"hiddenWidgets\":[\"news\"]}')").run();

        await resetDashboardLayout();

        const count = db.prepare("SELECT COUNT(*) AS c FROM settings WHERE key = 'dashboardLayout'").get() as any;
        expect(count.c).toBe(0);
        const layout = await loadDashboardLayoutFromVault();
        expect(layout).toBeNull();
    });
});
