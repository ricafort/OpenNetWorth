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
    BackupArchive
} from '@/infrastructure/local_driver';
import { POST as vaultPost } from '@/app/api/vault/route';
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
        saveFreedomSettings({ strategy: 'snowball', extraMonthlyPayment: 750 });
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
