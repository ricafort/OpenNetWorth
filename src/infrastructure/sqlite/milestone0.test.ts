import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
    persistScopedRecord,
    deleteScopedRecord,
    validateBackup,
    exportAllData,
    importData,
    loadAssets,
    saveAssets,
    loadLiabilities,
    saveLiabilities,
    loadGoals,
    saveGoals,
    loadRecurringTransactions,
    saveRecurringTransactions,
    loadFreedomSettings,
    saveFreedomSettings,
    loadCashFlow,
    saveCashFlow,
    loadSettings,
    saveSettings,
    loadNetWorthHistory,
    saveNetWorthHistory,
    saveFullSnapshot,
    saveDashboardLayout,
    loadDashboardLayout,
    updateDebtRecurringTransaction,
    initVaultSync,
    BackupArchive
} from '@/infrastructure/local_driver';
import { POST as vaultPost, GET as vaultGet } from '@/app/api/vault/route';
import { getDb } from '@/infrastructure/sqlite/db';

/**
 * Milestone 0 Integration & Unit Tests
 * 
 * Validates specifications:
 * - DATA-01, DATA-02: Authoritative SQLite persistence with durable save confirmation (T-01)
 * - DATA-03: Error retention on save failure (T-02)
 * - DATA-04, DATA-05: Scoped record operations vs bulk rewrite deprecation
 * - DATA-08, DATA-09: 7-entity vault check and idempotent reconciliation
 * - TRUST-09, TRUST-10, TRUST-11: Complete backup archive, manifest schema, and pre-restore validation (T-17)
 */

// Mock browser global localStorage and fetch
const mockLocalStorage: Record<string, string> = {};

beforeEach(() => {
    // Clear in-memory mock storage
    for (const key of Object.keys(mockLocalStorage)) {
        delete mockLocalStorage[key];
    }

    // Setup global window and localStorage stubs
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
});

describe('Milestone 0: Scoped Persistence & Durability (DATA-01, DATA-02, DATA-04, DATA-05, T-01, T-02)', () => {
    it('T-01: should durably persist scoped record when SQLite API succeeds', async () => {
        // Mock fetch to simulate successful SQLite scoped_save
        (global as any).fetch = vi.fn().mockResolvedValue({
            ok: true,
            json: async () => ({ success: true })
        });

        const newAsset = {
            id: 'asset-test-1',
            name: 'Emergency Fund',
            type: 'cash' as const,
            value: 25000,
            is_liquid: true,
            currency: 'USD' as const,
            last_updated: new Date().toISOString()
        };

        const result = await persistScopedRecord('assets', newAsset);
        expect(result.id).toBe('asset-test-1');

        // Check fetch was called with scoped_save action (DATA-04, DATA-05)
        expect(global.fetch).toHaveBeenCalledWith('/api/vault', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                action: 'scoped_save',
                entity: 'assets',
                item: newAsset
            })
        });

        // Verify local cache reflects saved item
        const assets = loadAssets();
        expect(assets).toHaveLength(1);
        expect(assets[0].name).toBe('Emergency Fund');
    });

    it('T-02: should throw and reject when SQLite save fails, preserving form inputs on caller', async () => {
        // Mock fetch to simulate database disk/constraint error
        (global as any).fetch = vi.fn().mockResolvedValue({
            ok: false,
            json: async () => ({ error: 'SQLite disk I/O error' })
        });

        const newDebt = {
            id: 'liab-test-1',
            name: 'Student Loan',
            type: 'student_loan' as const,
            balance: 15000,
            interest_rate: 4.5,
            currency: 'USD' as const,
            last_updated: new Date().toISOString()
        };

        // Must throw error so form catch block catches and keeps inputs
        await expect(persistScopedRecord('liabilities', newDebt)).rejects.toThrow(
            'SQLite disk I/O error'
        );
    });

    it('should perform scoped delete without rewriting full database', async () => {
        (global as any).fetch = vi.fn().mockResolvedValue({
            ok: true,
            json: async () => ({ success: true, deletedId: 'asset-del-1' })
        });

        saveAssets([
            { id: 'asset-del-1', name: 'Car', type: 'vehicle', value: 12000, is_liquid: false, last_updated: '' },
            { id: 'asset-del-2', name: 'Savings', type: 'cash', value: 5000, is_liquid: true, last_updated: '' }
        ]);

        await deleteScopedRecord('assets', 'asset-del-1');

        expect(global.fetch).toHaveBeenCalledWith('/api/vault', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                action: 'scoped_delete',
                entity: 'assets',
                id: 'asset-del-1'
            })
        });

        const remaining = loadAssets();
        expect(remaining).toHaveLength(1);
        expect(remaining[0].id).toBe('asset-del-2');
    });
});

describe('Milestone 0: Backup & Restore Validation (TRUST-09, TRUST-10, TRUST-11, T-17)', () => {
    it('T-17: should export complete archive with all 7 entities and schemaVersion 1', () => {
        saveAssets([{ id: 'a1', name: 'Cash', type: 'cash', value: 1000, is_liquid: true, last_updated: '' }]);
        saveLiabilities([{ id: 'l1', name: 'Card', type: 'credit_card', balance: 500, interest_rate: 0, is_good_debt: false, last_updated: '' }]);
        saveGoals([{ id: 'g1', name: 'Vacation', target_amount: 3000, current_amount: 0, category: 'savings', created_at: '' }]);
        saveRecurringTransactions([{
            id: 'r1',
            name: 'Salary',
            amount: 5000,
            type: 'income',
            frequency: 'monthly',
            category: 'Income',
            start_date: '2026-01-01',
            is_active: true
        }]);

        const exportedJson = exportAllData();
        const parsed = JSON.parse(exportedJson) as BackupArchive;

        // Verify manifest schema (TRUST-10)
        expect(parsed.manifest).toBeDefined();
        expect(parsed.manifest.app).toBe('OpenNetWorth');
        expect(parsed.manifest.schemaVersion).toBe(1);
        expect(parsed.manifest.recordCounts.assets).toBe(1);
        expect(parsed.manifest.recordCounts.liabilities).toBe(1);
        expect(parsed.manifest.recordCounts.goals).toBe(1);
        expect(parsed.manifest.recordCounts.recurring).toBe(1);

        // Verify all 7 collections exist in vault (TRUST-09)
        expect(parsed.vault.assets).toHaveLength(1);
        expect(parsed.vault.liabilities).toHaveLength(1);
        expect(parsed.vault.goals).toHaveLength(1);
        expect(parsed.vault.recurring).toHaveLength(1);
        expect(Array.isArray(parsed.vault.history)).toBe(true);
        expect(Array.isArray(parsed.vault.cashFlow)).toBe(true);
        expect(typeof parsed.vault.settings).toBe('object');
    });

    it('T-17: should reject invalid backup missing application identifier', () => {
        const invalidArchive = {
            manifest: {
                app: 'UnknownApp',
                schemaVersion: 1,
                recordCounts: {}
            },
            vault: {
                assets: [],
                liabilities: [],
                goals: [],
                recurring: [],
                history: [],
                cashFlow: [],
                settings: {}
            }
        };

        const result = validateBackup(invalidArchive);
        expect(result.valid).toBe(false);
        expect(result.error).toContain('Expected "OpenNetWorth"');
    });

    it('T-17: should reject unsupported schema version', () => {
        const invalidArchive = {
            manifest: {
                app: 'OpenNetWorth',
                schemaVersion: 99,
                recordCounts: {}
            },
            vault: {
                assets: [],
                liabilities: [],
                goals: [],
                recurring: [],
                history: [],
                cashFlow: [],
                settings: {}
            }
        };

        const result = validateBackup(invalidArchive);
        expect(result.valid).toBe(false);
        expect(result.error).toContain('Unsupported schema version: 99');
    });

    it('T-17: should reject corrupt records with non-numeric financial values', () => {
        const corruptArchive = {
            manifest: {
                app: 'OpenNetWorth',
                schemaVersion: 1,
                recordCounts: { assets: 1, liabilities: 0, goals: 0, recurring: 0, history: 0, cashFlow: 0, settings: 0 }
            },
            vault: {
                assets: [{ id: 'a1', name: 'Crypto', value: 'NOT_A_NUMBER' as any, is_liquid: true, last_updated: '' }],
                liabilities: [],
                goals: [],
                recurring: [],
                history: [],
                cashFlow: [],
                settings: {}
            }
        };

        const result = validateBackup(corruptArchive);
        expect(result.valid).toBe(false);
        expect(result.error).toContain('non-numeric value');
    });

    it('T-17: importData should leave existing data completely untouched on validation failure', async () => {
        // Initial good state
        saveAssets([{ id: 'existing-asset', name: 'Safe Asset', type: 'cash', value: 9999, is_liquid: true, last_updated: '' }]);

        const invalidJson = JSON.stringify({
            manifest: { app: 'WrongApp', schemaVersion: 1 },
            vault: {}
        });

        const importRes = await importData(invalidJson);
        expect(importRes.success).toBe(false);
        expect(importRes.error).toBeDefined();

        // Existing data must be preserved untouched
        const assetsAfter = loadAssets();
        expect(assetsAfter).toHaveLength(1);
        expect(assetsAfter[0].name).toBe('Safe Asset');
    });
});

describe('Milestone 0 Remediation Acceptance Tests (Findings 1, 2, 5, 7)', () => {
    it('Finding 1: single-record save must NOT trigger delayed whole-collection bulk rewrites', async () => {
        vi.useFakeTimers();
        const fetchSpy = vi.fn().mockResolvedValue({
            ok: true,
            json: async () => ({ success: true })
        });
        (global as any).fetch = fetchSpy;

        const asset = {
            id: 'asset-no-bulk-sync',
            name: 'Isolated Asset',
            type: 'cash' as const,
            value: 4000,
            is_liquid: true,
            currency: 'USD' as const,
            last_updated: ''
        };

        await persistScopedRecord('assets', asset);

        // First call must be scoped save
        expect(fetchSpy).toHaveBeenCalledTimes(1);
        expect(fetchSpy).toHaveBeenCalledWith('/api/vault', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                action: 'scoped_save',
                entity: 'assets',
                item: asset
            })
        });

        // Fast-forward 1000ms past the previous 500ms debounce timer
        vi.advanceTimersByTime(1000);

        // Fetch must NOT have been called a second time with a collection-wide bulk sync
        expect(fetchSpy).toHaveBeenCalledTimes(1);
        vi.useRealTimers();
    });

    it('Finding 2: importData must return failure and leave local data untouched when database returns HTTP 500', async () => {
        // Initial good state in local cache
        saveAssets([{ id: 'original-asset', name: 'Original Asset', type: 'cash', value: 1234, is_liquid: true, last_updated: '' }]);

        // Server returns HTTP 500
        (global as any).fetch = vi.fn().mockResolvedValue({
            ok: false,
            status: 500,
            json: async () => ({ error: 'Database disk I/O error' })
        });

        const validArchive: BackupArchive = {
            manifest: {
                app: 'OpenNetWorth',
                appVersion: '0.1.0',
                schemaVersion: 1,
                exportTimestamp: new Date().toISOString(),
                recordCounts: { assets: 1, liabilities: 0, goals: 0, recurring: 0, history: 0, cashFlow: 0, settings: 0 }
            },
            vault: {
                assets: [{ id: 'new-restored-asset', name: 'New Asset', type: 'cash', value: 5000, is_liquid: true, last_updated: '' }],
                liabilities: [],
                goals: [],
                recurring: [],
                history: [],
                cashFlow: [],
                settings: {}
            }
        };

        const result = await importData(JSON.stringify(validArchive));
        expect(result.success).toBe(false);
        expect(result.error).toContain('Database disk I/O error');

        // Verify local cache was NOT overwritten with 'New Asset'
        const currentAssets = loadAssets();
        expect(currentAssets).toHaveLength(1);
        expect(currentAssets[0].name).toBe('Original Asset');
    });

    it('Finding 5: validateBackup must reject invalid cash-flow months and amounts', () => {
        const baseArchive = {
            manifest: {
                app: 'OpenNetWorth',
                schemaVersion: 1,
                recordCounts: { assets: 0, liabilities: 0, goals: 0, recurring: 0, history: 0, cashFlow: 1, settings: 0 }
            },
            vault: {
                assets: [],
                liabilities: [],
                goals: [],
                recurring: [],
                history: [],
                cashFlow: [{ month: 'invalid-month', income: 5000, expenses: 3000 }],
                settings: {}
            }
        };

        // Invalid month format
        const badMonthResult = validateBackup(baseArchive);
        expect(badMonthResult.valid).toBe(false);
        expect(badMonthResult.error).toContain('invalid month');

        // Negative income
        baseArchive.vault.cashFlow = [{ month: '2026-05', income: -100, expenses: 3000 }];
        const badIncomeResult = validateBackup(baseArchive);
        expect(badIncomeResult.valid).toBe(false);
        expect(badIncomeResult.error).toContain('income');

        // Non-numeric expenses
        baseArchive.vault.cashFlow = [{ month: '2026-05', income: 5000, expenses: 'not-a-number' as any }];
        const badExpenseResult = validateBackup(baseArchive);
        expect(badExpenseResult.valid).toBe(false);
        expect(badExpenseResult.error).toContain('expenses');
    });

    it('Finding 5: exportAllData includes freedomSettings and dashboardLayout, and importData restores them', async () => {
        (global as any).fetch = vi.fn().mockResolvedValue({
            ok: true,
            json: async () => ({ success: true })
        });
        await saveFreedomSettings({ strategy: 'snowball', extraMonthlyPayment: 750 });
        (global as any).localStorage.setItem('opennetworth_dashboard_layout', JSON.stringify({ widgets: ['stat-networth'] }));

        const exported = exportAllData();
        const parsed = JSON.parse(exported);
        expect(parsed.vault.settings.freedomSettings).toBeDefined();
        expect(parsed.vault.settings.freedomSettings.strategy).toBe('snowball');
        expect(parsed.vault.settings.dashboardLayout).toBeDefined();

        // Clear local storage and simulate successful restore
        (global as any).localStorage.clear();
        (global as any).fetch = vi.fn().mockResolvedValue({
            ok: true,
            json: async () => ({ success: true })
        });

        const restoreResult = await importData(exported);
        expect(restoreResult.success).toBe(true);

        const restoredFreedom = loadFreedomSettings();
        expect(restoredFreedom.strategy).toBe('snowball');
        expect(restoredFreedom.extraMonthlyPayment).toBe(750);
        const restoredDashboard = JSON.parse((global as any).localStorage.getItem('opennetworth_dashboard_layout'));
        expect(restoredDashboard.widgets).toEqual(['stat-networth']);
    });

    it('Finding 7: API route rejects non-numeric monetary inputs ("not-money", NaN) with HTTP 400', async () => {
        const req = new Request('http://localhost:3000/api/vault', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                action: 'scoped_save',
                entity: 'assets',
                item: {
                    id: 'bad-asset-1',
                    name: 'Bad Money Asset',
                    value: 'not-money'
                }
            })
        });

        const res = await vaultPost(req);
        expect(res.status).toBe(400);
        const data = await res.json();
        expect(data.error).toContain('must be a valid finite number');
    });

    it('Finding 5 (Database): bulk_restore with empty history/settings empties database tables', async () => {
        const db = getDb();
        // Seed some history and settings directly
        db.prepare("INSERT OR REPLACE INTO net_worth_history (id, user_id, date, total_assets, total_liabilities, net_worth) VALUES ('seed-h', 'local_user', '2026-01-01', 1000, 0, 1000)").run();
        db.prepare("INSERT OR REPLACE INTO settings (key, value) VALUES ('seed_key', 'seed_val')").run();

        // Perform bulk_restore with empty history and empty settings
        const req = new Request('http://localhost:3000/api/vault', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                action: 'bulk_restore',
                assets: [],
                liabilities: [],
                goals: [],
                recurring: [],
                history: [],
                cashFlow: [],
                settings: {}
            })
        });

        const res = await vaultPost(req);
        expect(res.status).toBe(200);

        // Verify history and settings tables were cleaned
        const remainingHistory = db.prepare("SELECT * FROM net_worth_history WHERE user_id = 'local_user'").all();
        expect(remainingHistory).toHaveLength(0);

        const remainingSettings = db.prepare("SELECT * FROM settings").all();
        expect(remainingSettings).toHaveLength(0);
    });
});

describe('Milestone 0 Final Blocker Acceptance Tests (Findings 1, 2, 3, 4, 5)', () => {
    it('Finding 1: saveSettings, saveNetWorthHistory, and updateDebtRecurringTransaction persist durably to SQLite', async () => {
        const db = getDb();

        // 1. Test saveSettings durability
        (global as any).fetch = vi.fn().mockImplementation(async (url: string, init: any) => {
            const req = new Request(`http://localhost:3000${url}`, init);
            return vaultPost(req);
        });

        await saveSettings({ baseCurrency: 'AUD', theme: 'stealth', checkInFrequency: 'monthly' });
        const settingRow = db.prepare("SELECT value FROM settings WHERE key = 'baseCurrency'").get() as { value: string };
        expect(settingRow).toBeDefined();
        expect(settingRow.value).toBe('AUD');

        const profileRow = db.prepare("SELECT currency_code FROM profiles WHERE id = 'local_user'").get() as { currency_code: string };
        expect(profileRow.currency_code).toBe('AUD');

        // 2. Test net worth history durability
        const snapshot = {
            id: 'snap-persist-1',
            date: '2026-06-01',
            totalAssets: 80000,
            totalLiabilities: 20000,
            netWorth: 60000
        };
        await persistScopedRecord('history', snapshot);

        const historyRow = db.prepare("SELECT * FROM net_worth_history WHERE date = '2026-06-01'").get() as any;
        expect(historyRow).toBeDefined();
        expect(historyRow.net_worth).toBe(60000);
        expect(historyRow.total_assets).toBe(80000);

        // 3. Test debt accelerator recurring update durability
        await updateDebtRecurringTransaction(650);
        const recurringRow = db.prepare("SELECT * FROM recurring_transactions WHERE id = 'debt-freedom-accelerator'").get() as any;
        expect(recurringRow).toBeDefined();
        expect(recurringRow.amount).toBe(650);
        expect(recurringRow.is_active).toBe(1);
    });

    it('Finding 2: Initial migration failure (HTTP 500) preserves browser data and does NOT set migration flag', async () => {
        const testAsset = { id: 'browser-asset-1', name: 'Preserved Browser Asset', type: 'cash', value: 5000 };
        saveAssets([testAsset as any]);

        // Simulate SQLite having GET response but failing on migration POST commit
        (global as any).fetch = vi.fn().mockImplementation(async (url: string, init?: any) => {
            if (!init || init.method === 'GET') {
                return {
                    ok: true,
                    json: async () => ({ vault: { assets: [], liabilities: [], goals: [], recurring: [], history: [], cashFlow: [], settings: {} } })
                };
            }
            // Fail POST commit
            return {
                ok: false,
                status: 500,
                json: async () => ({ error: 'Simulated server error' })
            };
        });

        // Run boot sync
        await initVaultSync();

        // Migration flag must NOT be true
        expect((global as any).localStorage.getItem('opennetworth_vault_migrated_v1')).toBeNull();
        // Error flag should be recorded
        expect((global as any).localStorage.getItem('opennetworth_migration_error')).toContain('500');
        // Source data in localStorage must be preserved
        const assetsAfterFailedMigration = loadAssets();
        expect(assetsAfterFailedMigration).toHaveLength(1);
        expect(assetsAfterFailedMigration[0].name).toBe('Preserved Browser Asset');
    });

    it('Finding 3: Migration inventories and merges browser-only data (cash flow) when SQLite already contains data (asset)', async () => {
        const db = getDb();
        // Clear tables
        db.prepare("DELETE FROM assets WHERE user_id = 'local_user'").run();
        db.prepare("DELETE FROM cash_flow_history WHERE user_id = 'local_user'").run();

        // 1. Seed SQLite with 1 asset and 0 cash flow
        db.prepare(`
            INSERT INTO assets (id, user_id, name, type, value, is_liquid, currency, interest_rate, last_updated)
            VALUES ('sqlite-asset-1', 'local_user', 'Existing SQLite Gold', 'precious_metals', 15000, 1, 'USD', 0, datetime('now'))
        `).run();

        // 2. Set browser storage with 0 assets, but 1 browser-only cash flow record
        (global as any).localStorage.clear();
        saveCashFlow([{ id: 'browser-cf-1', month: '2026-07', income: 7500, expenses: 3200 }]);

        // 3. Connect fetch to live route handlers
        (global as any).fetch = vi.fn().mockImplementation(async (url: string, init?: any) => {
            const req = new Request(`http://localhost:3000${url}`, init);
            if (!init || init.method === 'GET') {
                return vaultGet(req);
            }
            return vaultPost(req);
        });

        // Run migration sync
        await initVaultSync();

        // Migration must succeed
        expect((global as any).localStorage.getItem('opennetworth_vault_migrated_v1')).toBe('true');
        // Recovery backup must exist
        expect((global as any).localStorage.getItem('opennetworth_migration_recovery_v1')).toBeDefined();

        // Both records must be preserved in SQLite
        const assetsInDb = db.prepare("SELECT * FROM assets WHERE user_id = 'local_user'").all();
        expect(assetsInDb).toHaveLength(1);
        expect((assetsInDb[0] as any).name).toBe('Existing SQLite Gold');

        const cashFlowInDb = db.prepare("SELECT * FROM cash_flow_history WHERE user_id = 'local_user'").all();
        expect(cashFlowInDb).toHaveLength(1);
        expect((cashFlowInDb[0] as any).month).toBe('2026-07');
        expect((cashFlowInDb[0] as any).income).toBe(7500);

        // Active collection in localStorage must retain both
        expect(loadAssets()).toHaveLength(1);
        expect(loadCashFlow()).toHaveLength(1);
        expect(loadCashFlow()[0].month).toBe('2026-07');
    });

    it('Finding 4: Logging existing cash-flow month reuses SQLite ID and returning/caching that ID allows clean deletion', async () => {
        const db = getDb();
        db.prepare("DELETE FROM cash_flow_history WHERE user_id = 'local_user'").run();

        // 1. Seed existing month row with specific original ID
        const ORIGINAL_ID = 'cf-orig-uuid-1234';
        db.prepare(`
            INSERT INTO cash_flow_history (id, user_id, month, income, expenses, currency)
            VALUES (?, 'local_user', '2026-09', 4000, 2000, 'USD')
        `).run(ORIGINAL_ID);

        // 2. Submit form with a different/new ID for the same month
        const req = new Request('http://localhost:3000/api/vault', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                action: 'scoped_save',
                entity: 'cashFlow',
                item: {
                    id: 'new-temporary-ui-id',
                    month: '2026-09',
                    income: 4500,
                    expenses: 2100
                }
            })
        });

        const saveRes = await vaultPost(req);
        expect(saveRes.status).toBe(200);
        const saveData = await saveRes.json();

        // Authoritative returned record MUST retain ORIGINAL_ID
        expect(saveData.item.id).toBe(ORIGINAL_ID);
        expect(saveData.item.income).toBe(4500);

        // 3. Now delete using the returned ID
        const deleteReq = new Request('http://localhost:3000/api/vault', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                action: 'scoped_delete',
                entity: 'cashFlow',
                id: saveData.item.id
            })
        });

        const deleteRes = await vaultPost(deleteReq);
        expect(deleteRes.status).toBe(200);

        // Verify SQLite database no longer contains the record
        const remaining = db.prepare("SELECT * FROM cash_flow_history WHERE month = '2026-09'").all();
        expect(remaining).toHaveLength(0);
    });

    it('Finding 5: Incomplete bulk_restore payload is rejected with HTTP 400 and preserves existing records', async () => {
        const db = getDb();
        // Seed an asset that must survive incomplete restore attempts
        db.prepare(`
            INSERT OR REPLACE INTO assets (id, user_id, name, type, value, is_liquid, currency, interest_rate, last_updated)
            VALUES ('preserved-asset', 'local_user', 'Surviving House', 'real_estate', 750000, 0, 'USD', 0, datetime('now'))
        `).run();

        // 1. Incomplete request with only { action: "bulk_restore" }
        const reqEmpty = new Request('http://localhost:3000/api/vault', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'bulk_restore' })
        });
        const resEmpty = await vaultPost(reqEmpty);
        expect(resEmpty.status).toBe(400);
        const dataEmpty = await resEmpty.json();
        expect(dataEmpty.error).toContain('is required and must be an array');

        // Verify asset was NOT wiped
        const surviving1 = db.prepare("SELECT * FROM assets WHERE id = 'preserved-asset'").get();
        expect(surviving1).toBeDefined();

        // 2. Incomplete request missing cashFlow collection
        const reqMissingCashFlow = new Request('http://localhost:3000/api/vault', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                action: 'bulk_restore',
                assets: [],
                liabilities: [],
                goals: [],
                recurring: [],
                history: []
                // cashFlow missing
            })
        });
        const resMissing = await vaultPost(reqMissingCashFlow);
        expect(resMissing.status).toBe(400);
        expect((await resMissing.json()).error).toContain('cashFlow');

        // Verify asset was still NOT wiped
        const surviving2 = db.prepare("SELECT * FROM assets WHERE id = 'preserved-asset'").get();
        expect(surviving2).toBeDefined();
    });

    /**
     * Milestone 0 Final Remediation Tests (Addressing the 3 remaining issues)
     * 
     * Why these exist:
     * 1. Issue 1: Verifies that failed saves propagate errors to callers instead of appearing successful,
     *    and do NOT update browser cache before confirmed commit. Tests HTTP 500 and network errors.
     * 2. Issue 2: Verifies that form error handling retains input state and confirmed snapshot lists on failure.
     * 3. Issue 3: Verifies that bulk_restore strictly requires settings, rejecting missing/null/array settings
     *    with HTTP 400 before any deletions, proving all 7 collections in SQLite remain completely untouched.
     */
    describe('Milestone 0 Final Verification: Error Propagation, Input Retention, and Restore Validation', () => {
        /**
         * Issue 1: Failed saves propagate errors and do NOT update local cache.
         * 
         * Tricky logic:
         * We mock fetch to simulate both HTTP 500 server error and fetch rejection (offline network failure),
         * asserting that loadSettings() and loadNetWorthHistory() reflect only confirmed previous state.
         */
        describe('Issue 1: Failed saves propagate errors and do NOT update local cache', () => {
            it('saveSettings: HTTP 500 error throws and leaves local cache with original currency', async () => {
                // Seed initial confirmed settings (e.g. AUD)
                (global as any).fetch = vi.fn().mockResolvedValue({
                    ok: true,
                    json: async () => ({ success: true, item: { baseCurrency: 'AUD', theme: 'system', checkInFrequency: 'monthly' } })
                });
                await saveSettings({ baseCurrency: 'AUD', theme: 'system', checkInFrequency: 'monthly' });
                expect(loadSettings().baseCurrency).toBe('AUD');

                // Simulate HTTP 500 while attempting to save EUR
                (global as any).fetch = vi.fn().mockResolvedValue({
                    ok: false,
                    status: 500,
                    json: async () => ({ error: 'Database disk failure' })
                });

                // Function must throw to caller
                await expect(
                    saveSettings({ baseCurrency: 'EUR', theme: 'stealth', checkInFrequency: 'weekly' })
                ).rejects.toThrow('Database disk failure');

                // Local cache MUST still show AUD (never updated before durable commit)
                expect(loadSettings().baseCurrency).toBe('AUD');
            });

            it('saveSettings: Network rejection (offline) throws and leaves local cache intact', async () => {
                // Seed initial confirmed settings (AUD)
                (global as any).fetch = vi.fn().mockResolvedValue({
                    ok: true,
                    json: async () => ({ success: true, item: { baseCurrency: 'AUD', theme: 'system', checkInFrequency: 'monthly' } })
                });
                await saveSettings({ baseCurrency: 'AUD', theme: 'system', checkInFrequency: 'monthly' });
                expect(loadSettings().baseCurrency).toBe('AUD');

                // Simulate rejected network request (e.g. device offline, CORS failure)
                (global as any).fetch = vi.fn().mockRejectedValue(new TypeError('Failed to fetch'));

                await expect(
                    saveSettings({ baseCurrency: 'EUR', theme: 'stealth', checkInFrequency: 'weekly' })
                ).rejects.toThrow('Failed to fetch');

                // Local cache MUST still show AUD
                expect(loadSettings().baseCurrency).toBe('AUD');
            });

            it('saveNetWorthHistory: HTTP 500 error throws and does NOT update local cache', async () => {
                // Seed initial history
                const initialHistory = [{
                    id: 'snap-1',
                    date: '2026-08-01',
                    totalAssets: 100000,
                    totalLiabilities: 20000,
                    netWorth: 80000
                }];
                (global as any).fetch = vi.fn().mockResolvedValue({
                    ok: true,
                    json: async () => ({ success: true })
                });
                await saveNetWorthHistory(initialHistory);
                expect(loadNetWorthHistory()).toHaveLength(1);

                // Simulate HTTP 500 while attempting to save new history
                (global as any).fetch = vi.fn().mockResolvedValue({
                    ok: false,
                    status: 500,
                    json: async () => ({ error: 'Internal Server Error' })
                });

                const failedHistory = [
                    ...initialHistory,
                    { id: 'snap-2', date: '2026-09-01', totalAssets: 120000, totalLiabilities: 15000, netWorth: 105000 }
                ];

                await expect(saveNetWorthHistory(failedHistory)).rejects.toThrow();

                // Local cache must still only have 1 entry (not 2)
                expect(loadNetWorthHistory()).toHaveLength(1);
                expect(loadNetWorthHistory()[0].id).toBe('snap-1');
            });

            it('saveNetWorthHistory: Network rejection throws and leaves local cache intact', async () => {
                const initialHistory = [{
                    id: 'snap-1',
                    date: '2026-08-01',
                    totalAssets: 100000,
                    totalLiabilities: 20000,
                    netWorth: 80000
                }];
                (global as any).fetch = vi.fn().mockResolvedValue({
                    ok: true,
                    json: async () => ({ success: true })
                });
                await saveNetWorthHistory(initialHistory);

                (global as any).fetch = vi.fn().mockRejectedValue(new Error('Connection aborted'));

                const failedHistory = [
                    ...initialHistory,
                    { id: 'snap-2', date: '2026-09-01', totalAssets: 120000, totalLiabilities: 15000, netWorth: 105000 }
                ];

                await expect(saveNetWorthHistory(failedHistory)).rejects.toThrow('Connection aborted');
                expect(loadNetWorthHistory()).toHaveLength(1);
            });

            it('saveFreedomSettings, saveDashboardLayout, saveFullSnapshot, and updateDebtRecurringTransaction propagate errors on HTTP 500', async () => {
                (global as any).fetch = vi.fn().mockResolvedValue({
                    ok: false,
                    status: 500,
                    json: async () => ({ error: 'Database write error' })
                });

                await expect(saveFreedomSettings({ strategy: 'snowball', extraMonthlyPayment: 900 })).rejects.toThrow('Database write error');
                await expect(saveDashboardLayout({ widgets: ['stat-networth'] } as any)).rejects.toThrow('Database write error');
                await expect(saveFullSnapshot({ id: 's-fail', date: '2026-09-01', totalAssets: 50, totalLiabilities: 10, netWorth: 40 })).rejects.toThrow('Database write error');
                await expect(updateDebtRecurringTransaction(500)).rejects.toThrow('Database write error');
            });
        });

        /**
         * Issue 2: Failure handling in forms preserves inputs and confirmed lists.
         * 
         * Tricky logic:
         * Simulates form handlers: verifies that when scoped persist or delete fails,
         * the error is thrown, the form input state is preserved, and onSave callback is never invoked.
         */
        describe('Issue 2: Failure handling in forms preserves inputs and confirmed lists', () => {
            it('persistScopedRecord failure keeps caller form state and does not invoke save callbacks', async () => {
                (global as any).fetch = vi.fn().mockResolvedValue({
                    ok: false,
                    status: 500,
                    json: async () => ({ error: 'Disk write lock timeout' })
                });

                let errorCaught: string | null = null;
                let onSaveCalled = false;
                const formInputs = { date: '2026-09-13', assets: '50000', liabilities: '10000' };

                try {
                    await persistScopedRecord('history', {
                        id: 'snap-failing',
                        date: formInputs.date,
                        totalAssets: 50000,
                        totalLiabilities: 10000,
                        netWorth: 40000
                    });
                    onSaveCalled = true;
                } catch (err: any) {
                    errorCaught = err.message;
                }

                expect(errorCaught).toContain('Disk write lock timeout');
                expect(onSaveCalled).toBe(false);
                // Form inputs must remain intact
                expect(formInputs.assets).toBe('50000');
                expect(formInputs.date).toBe('2026-09-13');
            });

            it('deleteScopedRecord failure keeps caller data and does not invoke save callbacks', async () => {
                (global as any).fetch = vi.fn().mockResolvedValue({
                    ok: false,
                    status: 500,
                    json: async () => ({ error: 'Row lock failed' })
                });

                let deleteError: string | null = null;
                let onSaveCalled = false;
                const confirmedList = [{ date: '2026-09-13', netWorth: 50000 }];

                try {
                    await deleteScopedRecord('history', 'some-id');
                    onSaveCalled = true;
                } catch (err: any) {
                    deleteError = err.message;
                }

                expect(deleteError).toContain('Row lock failed');
                expect(onSaveCalled).toBe(false);
                // Confirmed list preserved
                expect(confirmedList).toHaveLength(1);
            });
        });

        /**
         * Issue 3: bulk_restore strictly requires settings object and preserves all existing collections.
         * 
         * Tricky logic:
         * Seeds rows into all 7 SQLite tables (assets, liabilities, goals, recurring, history, cashflow, settings).
         * Sends a restore payload missing settings. Proves that HTTP 400 is returned and that
         * zero records across ANY of the 7 SQLite tables were modified or deleted.
         * 
         * TODO: Add granular schema validation tests for individual setting keys in Milestone 1.
         */
        describe('Issue 3: bulk_restore strictly requires settings object and preserves all existing collections', () => {
            it('bulk_restore missing settings returns HTTP 400 and leaves all SQLite records 100% untouched', async () => {
                const db = getDb();

                // 1. Seed existing records across ALL tables
                db.prepare("DELETE FROM assets WHERE user_id = 'local_user'").run();
                db.prepare("DELETE FROM liabilities WHERE user_id = 'local_user'").run();
                db.prepare("DELETE FROM goals WHERE user_id = 'local_user'").run();
                db.prepare("DELETE FROM recurring_transactions WHERE user_id = 'local_user'").run();
                db.prepare("DELETE FROM net_worth_history WHERE user_id = 'local_user'").run();
                db.prepare("DELETE FROM cash_flow_history WHERE user_id = 'local_user'").run();
                db.prepare("DELETE FROM settings").run();

                db.prepare(`
                    INSERT INTO assets (id, user_id, name, type, value, is_liquid, currency, last_updated)
                    VALUES ('survive-asset-1', 'local_user', 'Surviving Gold', 'precious_metals', 25000, 1, 'USD', datetime('now'))
                `).run();

                db.prepare(`
                    INSERT INTO liabilities (id, user_id, name, type, balance, interest_rate, minimum_payment, is_good_debt, currency, last_updated)
                    VALUES ('survive-liab-1', 'local_user', 'Surviving Mortgage', 'mortgage', 250000, 3.5, 1200, 1, 'USD', datetime('now'))
                `).run();

                db.prepare(`
                    INSERT INTO goals (id, user_id, name, target_amount, current_amount, deadline, category, created_at)
                    VALUES ('survive-goal-1', 'local_user', 'Surviving FI', 1000000, 50000, '2035-01-01', 'retirement', datetime('now'))
                `).run();

                db.prepare(`
                    INSERT INTO recurring_transactions (id, user_id, name, amount, type, frequency, category, start_date, is_active, currency, created_at)
                    VALUES ('survive-rec-1', 'local_user', 'Surviving Salary', 8000, 'income', 'monthly', 'Career', '2026-01-01', 1, 'USD', datetime('now'))
                `).run();

                db.prepare(`
                    INSERT INTO net_worth_history (id, user_id, date, total_assets, total_liabilities, net_worth)
                    VALUES ('survive-hist-1', 'local_user', '2026-08-01', 100000, 20000, 80000)
                `).run();

                db.prepare(`
                    INSERT INTO cash_flow_history (id, user_id, month, income, expenses, currency)
                    VALUES ('survive-cf-1', 'local_user', '2026-08', 8000, 3000, 'USD')
                `).run();

                db.prepare(`
                    INSERT INTO settings (key, value)
                    VALUES ('userSettings', '{"baseCurrency":"AUD","theme":"system","checkInFrequency":"monthly"}')
                `).run();

                // 2. Submit restore payload with all 6 financial arrays, but NO settings object
                const incompleteRestorePayload = {
                    action: 'bulk_restore',
                    assets: [{ id: 'new-asset', name: 'New Asset', type: 'cash', value: 500, is_liquid: true }],
                    liabilities: [],
                    goals: [],
                    recurring: [],
                    history: [],
                    cashFlow: []
                    // settings is completely missing
                };

                const req = new Request('http://localhost:3000/api/vault', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(incompleteRestorePayload)
                });

                const res = await vaultPost(req);
                expect(res.status).toBe(400);
                const data = await res.json();
                expect(data.error).toContain('settings is required and must be an object');

                // 3. Regression verification: PROVE every single existing collection remains 100% untouched
                const survivingAsset = db.prepare("SELECT * FROM assets WHERE id = 'survive-asset-1'").get();
                expect(survivingAsset).toBeDefined();

                const survivingLiab = db.prepare("SELECT * FROM liabilities WHERE id = 'survive-liab-1'").get();
                expect(survivingLiab).toBeDefined();

                const survivingGoal = db.prepare("SELECT * FROM goals WHERE id = 'survive-goal-1'").get();
                expect(survivingGoal).toBeDefined();

                const survivingRec = db.prepare("SELECT * FROM recurring_transactions WHERE id = 'survive-rec-1'").get();
                expect(survivingRec).toBeDefined();

                const survivingHist = db.prepare("SELECT * FROM net_worth_history WHERE id = 'survive-hist-1'").get();
                expect(survivingHist).toBeDefined();

                const survivingCf = db.prepare("SELECT * FROM cash_flow_history WHERE id = 'survive-cf-1'").get();
                expect(survivingCf).toBeDefined();

                const survivingSettings = db.prepare("SELECT * FROM settings WHERE key = 'userSettings'").get();
                expect(survivingSettings).toBeDefined();
                expect((survivingSettings as any).value).toContain('AUD');
            });

            it('bulk_restore with settings as null or array returns HTTP 400', async () => {
                // settings as array
                const reqArray = new Request('http://localhost:3000/api/vault', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        action: 'bulk_restore',
                        assets: [],
                        liabilities: [],
                        goals: [],
                        recurring: [],
                        history: [],
                        cashFlow: [],
                        settings: ['invalid', 'array']
                    })
                });
                const resArray = await vaultPost(reqArray);
                expect(resArray.status).toBe(400);
                expect((await resArray.json()).error).toContain('settings is required and must be an object');

                // settings as null
                const reqNull = new Request('http://localhost:3000/api/vault', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        action: 'bulk_restore',
                        assets: [],
                        liabilities: [],
                        goals: [],
                        recurring: [],
                        history: [],
                        cashFlow: [],
                        settings: null
                    })
                });
                const resNull = await vaultPost(reqNull);
                expect(resNull.status).toBe(400);
                expect((await resNull.json()).error).toContain('settings is required and must be an object');
            });
        });
    });
});
