/**
 * Single-data-layer persistence tests (replaces the retired milestone0.test.ts).
 *
 * Why this test file exists:
 * After the schema collapse (migrations 0006/0007) the SQLite vault is the ONLY store:
 * the m0 `assets`/`liabilities` tables are gone and the localStorage layer was removed
 * from `local_driver.ts`. These tests pin the surviving surface end-to-end:
 * - DATA-01/02/04/05 (T-01/T-02): scoped save/delete go through /api/vault and throw on failure.
 * - Finding 1: settings, snapshots, freedom plan, and the Debt Freedom Accelerator schedule
 *   are durable in SQLite (settings kv, net_worth_history, recurring_transactions).
 * - Finding 7 / Issue 2: route validation errors (bad numbers, bad dates, missing rows)
 *   propagate to the caller with the route's own message.
 * - ID agreement: cashFlow/history scoped saves reuse the existing row id (month/date key),
 *   so deletes by that id always hit.
 * - TRUST-09/10/11: v1 backup manifest validation and bulk_restore wiring.
 * - DATA-03: failed writes leave the vault untouched.
 *
 * Tricky logic:
 * Every test runs against an isolated in-memory SQLite database (`createTestDb()` +
 * `setTestDb()`), so the live vault (`data/opennetworth.sqlite`) is never touched.
 * The fetch bridge below routes the local_driver's relative fetches straight into the
 * route handlers, so writes land in the test database and can be asserted with raw SQL.
 * `resetUiStateMigrationForTests()` clears the module-level UI-state migration singleton
 * so each test re-runs the one-time boot migration against its own vault.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
    persistScopedRecord,
    deleteScopedRecord,
    validateBackup,
    importData,
    exportAuthoritativeVault,
    saveSettings,
    saveFullSnapshot,
    saveFreedomSettings,
    saveDashboardLayout,
    updateDebtRecurringTransaction,
    clearAllData,
    getVaultSettings,
    loadSettingsFromVault,
    loadFreedomSettingsFromVault,
    loadDashboardLayoutFromVault,
    resetDashboardLayout,
    resetUiStateMigrationForTests,
    STORAGE_KEYS_DASHBOARD
} from '@/infrastructure/local_driver';
import { POST as vaultPost, GET as vaultGet } from '@/app/api/vault/route';
import { GET as settingsGet, POST as settingsPost, DELETE as settingsDelete } from '@/app/api/settings/route';
import { createTestDb, setTestDb, closeDb, isTestEnvironment } from '@/infrastructure/sqlite/db';
import Database from 'better-sqlite3';

// Mock browser global localStorage and fetch
const mockLocalStorage: Record<string, string> = {};
let testDb: Database.Database;

/**
 * Routes local_driver's relative fetches ('/api/vault', '/api/settings') directly
 * into the route handlers so writes land in the injected test database.
 */
function installFetchBridge() {
    (global as any).fetch = vi.fn(async (url: string, init?: RequestInit) => {
        const req = new Request(`http://localhost:3000${url}`, init);
        if (url.startsWith('/api/settings')) {
            if (req.method === 'GET') return settingsGet(req);
            if (req.method === 'DELETE') return settingsDelete(req);
            return settingsPost(req);
        }
        if (req.method === 'GET') return vaultGet(req);
        return vaultPost(req);
    });
}

beforeEach(() => {
    // Fresh isolated in-memory vault per test — never the live data/opennetworth.sqlite.
    testDb = createTestDb();
    setTestDb(testDb);

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

    // The UI-state boot migration is a module singleton; re-arm it per test.
    resetUiStateMigrationForTests();
});

afterEach(() => {
    closeDb();
    setTestDb(null);
    vi.restoreAllMocks();
});

function settingValue(key: string): string | undefined {
    const row = testDb.prepare('SELECT value FROM settings WHERE key = ?').get(key) as { value: string } | undefined;
    return row?.value;
}

describe('Scoped persistence (DATA-01, DATA-02, DATA-04, DATA-05, T-01, T-02)', () => {
    it('T-01: persistScopedRecord POSTs scoped_save and returns the persisted item', async () => {
        const goal = {
            id: 'goal-test-1',
            name: 'Emergency Fund',
            target_amount: 10000,
            current_amount: 2000,
            currency: 'USD'
        };
        (global as any).fetch = vi.fn().mockResolvedValue({
            ok: true,
            json: async () => ({ success: true, item: goal })
        });

        const result = await persistScopedRecord('goals', goal);
        expect(result.id).toBe('goal-test-1');

        expect(global.fetch).toHaveBeenCalledWith('/api/vault', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'scoped_save', entity: 'goals', item: goal })
        });
    });

    it('T-02: persistScopedRecord rejects with the route error when the write fails', async () => {
        (global as any).fetch = vi.fn().mockResolvedValue({
            ok: false,
            json: async () => ({ error: 'SQLite disk I/O error' })
        });

        await expect(
            persistScopedRecord('goals', { id: 'goal-fail-1', name: 'Broken', target_amount: 100 })
        ).rejects.toThrow('SQLite disk I/O error');
    });

    it('deleteScopedRecord POSTs scoped_delete with the entity and id', async () => {
        (global as any).fetch = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ success: true }) });

        await deleteScopedRecord('goals', 'goal-9');
        expect(global.fetch).toHaveBeenCalledWith('/api/vault', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'scoped_delete', entity: 'goals', id: 'goal-9' })
        });
    });

    it('deleteScopedRecord surfaces the route 404 for a missing row', async () => {
        installFetchBridge();
        await expect(deleteScopedRecord('history', 'missing-row'))
            .rejects.toThrow('Record not found for delete in history with id: missing-row');
    });
});

describe('Net worth snapshots (history entity)', () => {
    it('saveFullSnapshot writes a snake_case row into net_worth_history', async () => {
        installFetchBridge();
        await saveFullSnapshot({
            id: 'snap-1',
            date: '2026-03-01',
            totalAssets: 120000,
            totalLiabilities: 45000,
            netWorth: 75000,
            currency: 'AUD'
        } as any);

        const row = testDb.prepare("SELECT * FROM net_worth_history WHERE id = 'snap-1'").get() as any;
        expect(row).toBeDefined();
        expect(row.total_assets).toBe(120000);
        expect(row.total_liabilities).toBe(45000);
        expect(row.net_worth).toBe(75000);
        expect(row.currency).toBe('AUD');
    });

    it('a second snapshot on the same date reuses the existing row id', async () => {
        installFetchBridge();
        await saveFullSnapshot({ id: 'snap-first', date: '2026-03-05', totalAssets: 100, totalLiabilities: 50, netWorth: 50 } as any);
        const second = await persistScopedRecord('history', {
            id: 'snap-second', date: '2026-03-05', totalAssets: 200, totalLiabilities: 50, netWorth: 150
        } as any);

        expect(second.id).toBe('snap-first');
        const rows = testDb.prepare("SELECT * FROM net_worth_history WHERE date = '2026-03-05'").all() as any[];
        expect(rows).toHaveLength(1);
        expect(rows[0].id).toBe('snap-first');
        expect(rows[0].total_assets).toBe(200);
    });

    it('a non-numeric net worth is rejected with the route validation message', async () => {
        installFetchBridge();
        await expect(persistScopedRecord('history', {
            id: 'snap-bad', date: '2026-03-06', totalAssets: 100, totalLiabilities: 50, netWorth: 'not-money'
        } as any)).rejects.toThrow('Net worth must be a valid finite number, received: "not-money"');

        expect(testDb.prepare("SELECT COUNT(*) AS cnt FROM net_worth_history WHERE id = 'snap-bad'").get()).toMatchObject({ cnt: 0 });
    });

    it('a malformed snapshot date is rejected', async () => {
        installFetchBridge();
        await expect(persistScopedRecord('history', {
            id: 'snap-baddate', date: 'March 2026', totalAssets: 100, totalLiabilities: 50, netWorth: 50
        } as any)).rejects.toThrow('History snapshot date must be YYYY-MM-DD');
    });

    it('deleteScopedRecord removes the snapshot by id', async () => {
        installFetchBridge();
        await saveFullSnapshot({ id: 'snap-del', date: '2026-03-09', totalAssets: 10, totalLiabilities: 5, netWorth: 5 } as any);
        await deleteScopedRecord('history', 'snap-del');
        expect(testDb.prepare("SELECT COUNT(*) AS cnt FROM net_worth_history WHERE id = 'snap-del'").get()).toMatchObject({ cnt: 0 });
    });
});

describe('Cash flow summaries keep their row id (month key agreement)', () => {
    it('a re-save for the same month reuses the original row id so deletes hit', async () => {
        installFetchBridge();
        await persistScopedRecord('cashFlow', { id: 'cf-original', month: '2026-05', income: 100, expenses: 50 } as any);

        const second = await persistScopedRecord('cashFlow', { id: 'cf-different', month: '2026-05', income: 120, expenses: 60 } as any);
        expect(second.id).toBe('cf-original');

        const rows = testDb.prepare("SELECT * FROM cash_flow_history WHERE month = '2026-05'").all() as any[];
        expect(rows).toHaveLength(1);
        expect(rows[0].id).toBe('cf-original');
        expect(rows[0].income).toBe(120);

        await deleteScopedRecord('cashFlow', 'cf-original');
        expect(testDb.prepare("SELECT COUNT(*) AS cnt FROM cash_flow_history WHERE month = '2026-05'").get()).toMatchObject({ cnt: 0 });
    });
});

describe('Settings kv durability (Finding 1)', () => {
    it('saveSettings stores baseCurrency verbatim and syncs the profile currency', async () => {
        installFetchBridge();
        await saveSettings({ baseCurrency: 'AUD', theme: 'dark', checkInFrequency: 'weekly' } as any);

        expect(settingValue('baseCurrency')).toBe('AUD');
        expect(JSON.parse(settingValue('userSettings')!)).toMatchObject({ theme: 'dark', checkInFrequency: 'weekly' });
        const profile = testDb.prepare("SELECT currency_code FROM profiles WHERE id = 'local_user'").get() as any;
        expect(profile.currency_code).toBe('AUD');
    });

    it('saveFreedomSettings stores the payoff plan as JSON in the settings kv', async () => {
        installFetchBridge();
        await saveFreedomSettings({ strategy: 'snowball', extraMonthlyPayment: 750, currency: 'AUD' as any });

        expect(JSON.parse(settingValue('freedomSettings')!)).toEqual({ strategy: 'snowball', extraMonthlyPayment: 750, currency: 'AUD' });
    });

    it('saveDashboardLayout stores the layout in the settings kv', async () => {
        installFetchBridge();
        await saveDashboardLayout({ hidden: ['news'], order: ['networth'] } as any);

        expect(JSON.parse(settingValue('dashboardLayout')!)).toEqual({ hidden: ['news'], order: ['networth'] });
    });

    it('loadFreedomSettingsFromVault keeps USD meaning for a currency-less saved plan', async () => {
        installFetchBridge();
        testDb.prepare("INSERT INTO settings (key, value) VALUES ('freedomSettings', ?)")
            .run(JSON.stringify({ strategy: 'snowball', extraMonthlyPayment: 400 }));

        const settings = await loadFreedomSettingsFromVault();
        expect(settings).toEqual({ strategy: 'snowball', extraMonthlyPayment: 400, currency: 'USD' });
    });

    it('loadSettingsFromVault falls back to defaults when the kv is empty', async () => {
        installFetchBridge();
        const settings = await loadSettingsFromVault();
        expect(settings).toMatchObject({ baseCurrency: 'USD', theme: 'system', checkInFrequency: 'monthly' });
    });

    it('loadDashboardLayoutFromVault reads the kv and resetDashboardLayout clears both stores', async () => {
        installFetchBridge();
        // Run the one-time boot migration first (empty localStorage) so later
        // localStorage seeds cannot be copied over the kv by the migration.
        await getVaultSettings();
        await saveDashboardLayout({ hidden: ['x'], order: ['y'] } as any);
        mockLocalStorage[STORAGE_KEYS_DASHBOARD] = JSON.stringify({ hidden: ['legacy'], order: [] });

        expect(await loadDashboardLayoutFromVault()).toEqual({ hidden: ['x'], order: ['y'] });

        await resetDashboardLayout();
        expect(settingValue('dashboardLayout')).toBeUndefined();
        expect(mockLocalStorage[STORAGE_KEYS_DASHBOARD]).toBeUndefined();
    });

    it('the one-time boot migration copies localStorage UI state into the settings kv exactly once', async () => {
        installFetchBridge();
        mockLocalStorage['opennetworth_settings'] = JSON.stringify({ baseCurrency: 'EUR', theme: 'light' });
        mockLocalStorage['opennetworth_freedom_settings'] = JSON.stringify({ strategy: 'snowball', extraMonthlyPayment: 200, currency: 'EUR' });
        mockLocalStorage[STORAGE_KEYS_DASHBOARD] = JSON.stringify({ hidden: ['old'], order: ['a'] });

        const first = await getVaultSettings();
        expect(first[ 'ui_state_migrated_v1']).toBe(true);
        expect(first.userSettings).toMatchObject({ baseCurrency: 'EUR' });
        expect(first.freedomSettings).toMatchObject({ extraMonthlyPayment: 200 });
        expect(first.dashboardLayout).toEqual({ hidden: ['old'], order: ['a'] });

        // Changing localStorage afterwards must NOT re-migrate (marker lives in the kv).
        mockLocalStorage['opennetworth_settings'] = JSON.stringify({ baseCurrency: 'JPY' });
        const second = await getVaultSettings();
        expect(second.userSettings).toMatchObject({ baseCurrency: 'EUR' });
    });
});

describe('Debt Freedom Accelerator schedule (recurring_transactions)', () => {
    it('updateDebtRecurringTransaction creates the accelerator row when absent', async () => {
        installFetchBridge();
        await updateDebtRecurringTransaction(650, 'AUD' as any);

        const row = testDb.prepare("SELECT * FROM recurring_transactions WHERE id = 'debt-freedom-accelerator'").get() as any;
        expect(row).toBeDefined();
        expect(row.amount).toBe(650);
        expect(row.currency).toBe('AUD');
        expect(row.is_active).toBe(1);
    });

    it('updateDebtRecurringTransaction(0) deactivates an existing row instead of deleting it', async () => {
        installFetchBridge();
        testDb.prepare(`
            INSERT INTO recurring_transactions (id, user_id, name, amount, type, frequency, category, start_date, is_active, currency, created_at)
            VALUES ('debt-freedom-accelerator', 'local_user', 'Debt Freedom Accelerator', 650, 'expense', 'monthly', 'Debt Repayment', '2026-01-01', 1, 'AUD', datetime('now'))
        `).run();

        await updateDebtRecurringTransaction(0, 'AUD' as any);

        const row = testDb.prepare("SELECT * FROM recurring_transactions WHERE id = 'debt-freedom-accelerator'").get() as any;
        expect(row.amount).toBe(0);
        expect(row.is_active).toBe(0);
    });

    it('updateDebtRecurringTransaction(0) with no existing row writes nothing', async () => {
        installFetchBridge();
        await updateDebtRecurringTransaction(0, 'AUD' as any);
        expect(testDb.prepare("SELECT COUNT(*) AS cnt FROM recurring_transactions").get()).toMatchObject({ cnt: 0 });
    });
});

describe('Backup validation and restore (TRUST-09, TRUST-10, TRUST-11)', () => {
    function validV1Archive(overrides: Record<string, any> = {}): any {
        const vault = {
            assets: [],
            liabilities: [],
            goals: [{ id: 'goal-1', name: 'Emergency Fund', target_amount: 10000, current_amount: 2000, currency: 'USD' }],
            recurring: [{ id: 'rec-1', name: 'Rent', amount: 1800, type: 'expense', frequency: 'monthly', category: 'Housing', start_date: '2026-01-01', is_active: true, currency: 'USD' }],
            history: [{ id: 'hist-1', date: '2026-01-31', totalAssets: 100000, totalLiabilities: 40000, netWorth: 60000 }],
            cashFlow: [{ id: 'cf-1', month: '2026-01', income: 5000, expenses: 3200, currency: 'USD' }],
            settings: { baseCurrency: 'USD', theme: 'dark' },
            ...overrides
        };
        return {
            manifest: {
                app: 'OpenNetWorth',
                appVersion: '1.0.0',
                schemaVersion: 1,
                exportTimestamp: new Date().toISOString(),
                recordCounts: {
                    assets: vault.assets.length,
                    liabilities: vault.liabilities.length,
                    goals: vault.goals.length,
                    recurring: vault.recurring.length,
                    history: vault.history.length,
                    cashFlow: vault.cashFlow.length,
                    settings: Object.keys(vault.settings).length
                }
            },
            vault
        };
    }

    it('accepts a complete v1 archive', () => {
        expect(validateBackup(validV1Archive())).toEqual({ valid: true });
    });

    it('rejects an archive from another application', () => {
        const archive = validV1Archive();
        archive.manifest.app = 'SomeOtherApp';
        expect(validateBackup(archive).error).toBe('Invalid application identifier: "SomeOtherApp". Expected "OpenNetWorth".');
    });

    it('rejects an unsupported schema version', () => {
        const archive = validV1Archive();
        archive.manifest.schemaVersion = 99;
        expect(validateBackup(archive).error).toBe('Unsupported schema version: 99. Supported version is 1.');
    });

    it('rejects non-numeric and negative asset values', () => {
        const badValue = validV1Archive({ assets: [{ id: 'a1', name: 'Car', type: 'vehicle', value: 'fifteen-thousand' }] });
        expect(validateBackup(badValue).error).toBe('Asset "Car" has a non-numeric value');

        const negative = validV1Archive({ assets: [{ id: 'a2', name: 'Short', type: 'other', value: -5 }] });
        expect(validateBackup(negative).error).toBe('Asset "Short" cannot have a negative value');
    });

    it('rejects a malformed cash flow month', () => {
        const archive = validV1Archive({ cashFlow: [{ id: 'cf-bad', month: '2026-13', income: 1, expenses: 1 }] });
        expect(validateBackup(archive).error).toBe('Cash flow entry at index 0 has invalid month "2026-13". Expected YYYY-MM.');
    });

    it('rejects manifest record count mismatches', () => {
        const archive = validV1Archive();
        archive.manifest.recordCounts.goals = 42;
        expect(validateBackup(archive).error).toBe('Goals count mismatch: manifest declares 42, found 1');
    });

    it('importData rejects invalid JSON syntax without touching the vault', async () => {
        installFetchBridge();
        const res = await importData('{ not json !!');
        expect(res).toEqual({ success: false, error: 'File contains invalid JSON syntax' });
    });

    it('importData refuses an invalid archive before making any request', async () => {
        (global as any).fetch = vi.fn();
        const archive = validV1Archive();
        archive.manifest.app = 'NotOpenNetWorth';

        const res = await importData(JSON.stringify(archive));
        expect(res.success).toBe(false);
        expect(res.error).toContain('Invalid application identifier');
        expect(global.fetch).not.toHaveBeenCalled();
    });

    it('importData restores a valid v1 archive into the vault', async () => {
        installFetchBridge();
        const res = await importData(JSON.stringify(validV1Archive()));
        expect(res).toEqual({ success: true });

        expect(testDb.prepare("SELECT COUNT(*) AS cnt FROM goals WHERE id = 'goal-1'").get()).toMatchObject({ cnt: 1 });
        expect(testDb.prepare("SELECT COUNT(*) AS cnt FROM recurring_transactions WHERE id = 'rec-1'").get()).toMatchObject({ cnt: 1 });
        expect(testDb.prepare("SELECT COUNT(*) AS cnt FROM net_worth_history WHERE id = 'hist-1'").get()).toMatchObject({ cnt: 1 });
        expect(testDb.prepare("SELECT COUNT(*) AS cnt FROM cash_flow_history WHERE id = 'cf-1'").get()).toMatchObject({ cnt: 1 });
        expect(settingValue('baseCurrency')).toBe('USD');
    });
});

describe('Authoritative export (Version 2 snapshot)', () => {
    it('exportAuthoritativeVault returns a v2 archive built from the live vault', async () => {
        installFetchBridge();
        testDb.prepare(`
            INSERT INTO goals (id, user_id, name, target_amount, currency, category, created_at)
            VALUES ('goal-exp', 'local_user', 'Holiday Fund', 4000, 'AUD', 'Travel', datetime('now'))
        `).run();
        testDb.prepare("INSERT INTO settings (key, value) VALUES ('baseCurrency', 'AUD')").run();

        const raw = await exportAuthoritativeVault();
        const archive = JSON.parse(raw);
        expect(archive.manifest.app).toBe('OpenNetWorth');
        expect(archive.manifest.schemaVersion).toBe(2);
        expect(archive.manifest.recordCounts.goals).toBe(1);
        expect(archive.vault.schemaVersion).toBe(2);
        expect(archive.vault.goals[0].name).toBe('Holiday Fund');
        expect(archive.vault.settings.baseCurrency).toBe('AUD');
    });

    it('exportAuthoritativeVault throws outside a browser context', async () => {
        const savedWindow = (global as any).window;
        delete (global as any).window;
        try {
            await expect(exportAuthoritativeVault()).rejects.toThrow('requires a browser window');
        } finally {
            (global as any).window = savedWindow;
        }
    });
});

describe('Failed writes leave the vault untouched (DATA-03)', () => {
    it('a failed settings write propagates and stores nothing', async () => {
        (global as any).fetch = vi.fn().mockResolvedValue({
            ok: false,
            json: async () => ({ error: 'Database write error' })
        });

        await expect(saveSettings({ baseCurrency: 'AUD' } as any)).rejects.toThrow('Database write error');
        expect(testDb.prepare("SELECT COUNT(*) AS cnt FROM settings").get()).toMatchObject({ cnt: 0 });
    });

    it('a network rejection propagates to the caller', async () => {
        (global as any).fetch = vi.fn().mockRejectedValue(new Error('Failed to fetch'));
        await expect(persistScopedRecord('goals', { id: 'goal-net', name: 'Net fail', target_amount: 10 }))
            .rejects.toThrow('Failed to fetch');
    });
});

describe('clearAllData (DATA-01, DATA-05)', () => {
    it('wipes planning tables and settings but preserves the ledger', async () => {
        installFetchBridge();
        testDb.prepare(`
            INSERT INTO goals (id, user_id, name, target_amount, currency, category, created_at)
            VALUES ('goal-wipe', 'local_user', 'Wipe me', 100, 'USD', 'General', datetime('now'))
        `).run();
        testDb.prepare("INSERT INTO settings (key, value) VALUES ('baseCurrency', 'USD')").run();
        testDb.prepare(`
            INSERT INTO m1_entities (id, name, type, currency, created_at, updated_at)
            VALUES ('ent-keep', 'Owner', 'person', 'USD', datetime('now'), datetime('now'))
        `).run();
        testDb.prepare(`
            INSERT INTO m1_accounts (id, entity_id, name, type, sub_type, currency, created_at, updated_at)
            VALUES ('acc-keep', 'ent-keep', 'Checking', 'asset', 'checking', 'USD', datetime('now'), datetime('now'))
        `).run();
        mockLocalStorage['opennetworth_settings'] = '{"baseCurrency":"USD"}';

        await clearAllData();

        expect(testDb.prepare("SELECT COUNT(*) AS cnt FROM goals").get()).toMatchObject({ cnt: 0 });
        expect(testDb.prepare("SELECT COUNT(*) AS cnt FROM settings").get()).toMatchObject({ cnt: 0 });
        expect(testDb.prepare("SELECT COUNT(*) AS cnt FROM m1_entities").get()).toMatchObject({ cnt: 1 });
        expect(testDb.prepare("SELECT COUNT(*) AS cnt FROM m1_accounts").get()).toMatchObject({ cnt: 1 });
        expect(Object.keys(mockLocalStorage)).toHaveLength(0);
    });
});

describe('Test isolation guards', () => {
    it('mutations land in the isolated in-memory vault, never the live file', () => {
        expect(isTestEnvironment()).toBe(true);
        const databases = testDb.pragma('database_list') as Array<{ file: string }>;
        expect(databases[0].file === '' || databases[0].file === ':memory:').toBe(true);

        testDb.prepare("INSERT INTO settings (key, value) VALUES ('isolation-probe', 'yes')").run();
        expect(settingValue('isolation-probe')).toBe('yes');
    });
});
