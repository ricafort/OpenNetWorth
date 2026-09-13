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
    BackupArchive
} from '@/infrastructure/local_driver';

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
        saveLiabilities([{ id: 'l1', name: 'Card', type: 'credit_card', balance: 500, last_updated: '' }]);
        saveGoals([{ id: 'g1', name: 'Vacation', target_amount: 3000, category: 'savings', created_at: '' }]);
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
