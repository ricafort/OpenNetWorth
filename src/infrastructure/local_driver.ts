import { Asset } from '@/features/assets/types';
import { Liability, PayoffStrategy } from '@/features/liabilities/types';
import { Goal } from '@/features/goals/types';
import { CashFlowEntry, RecurringTransaction } from '@/features/cashflow/types';
import { NetWorthSnapshot, UserSettings, DashboardConfig, CurrencyCode } from '@/types';

// Key constants - Primary OpenNetWorth keys with backward compatibility
const STORAGE_KEYS = {
    ASSETS: 'opennetworth_assets',
    LIABILITIES: 'opennetworth_liabilities',
    NET_WORTH_HISTORY: 'opennetworth_nw_history',
    GOALS: 'opennetworth_goals',
    CASH_FLOW: 'opennetworth_cash_flow',
    RECURRING: 'opennetworth_recurring',
    SETTINGS: 'opennetworth_settings',
    FREEDOM_SETTINGS: 'opennetworth_freedom_settings'
};

export type SupportedEntity = 'goals' | 'recurring' | 'history' | 'cashFlow' | 'settings';

/**
 * Persists an individual record durably to SQLite with scoped operation (DATA-01, DATA-02, DATA-04, DATA-05).
 * Throws if persistence fails. The SQLite vault is the only store — there is no local cache to update.
 */
export async function persistScopedRecord<T extends { id?: string }>(
    entity: SupportedEntity,
    item: T
): Promise<T> {
    if (typeof window === 'undefined') {
        return item;
    }

    const res = await fetch('/api/vault', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            action: 'scoped_save',
            entity,
            item
        })
    });

    if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'Durable database write failed' }));
        throw new Error(err.error || `Failed to persist ${entity} record to local SQLite database`);
    }

    const json = await res.json().catch(() => null);
    return (json?.item ?? item) as T;
}

/**
 * Deletes an individual record durably from SQLite with scoped operation (DATA-04, DATA-05).
 * Throws if deletion fails. The SQLite vault is the only store — there is no local cache to update.
 */
export async function deleteScopedRecord(
    entity: 'goals' | 'recurring' | 'cashFlow' | 'history',
    id: string
): Promise<void> {
    if (typeof window === 'undefined') return;

    const res = await fetch('/api/vault', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            action: 'scoped_delete',
            entity,
            id
        })
    });

    if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'Durable database delete failed' }));
        throw new Error(err.error || `Failed to delete ${entity} record from local SQLite database`);
    }
}

/**
 * Reads a localStorage value. Only used by the one-time UI-state boot migration
 * (ensureUiStateMigrated) — the SQLite vault is authoritative for everything else.
 */
function get<T>(key: string, parse = true): T | null {
    if (typeof window === 'undefined') return null;
    const item = localStorage.getItem(key);
    if (!item) return null;
    try {
        return parse ? JSON.parse(item) : (item as unknown as T);
    } catch (e) {
        console.error(`Error parsing storage key ${key}:`, e);
        return null;
    }
}

// User Settings
/**
 * Saves general user settings.
 * 
 * Why this exists:
 * Persists application preferences (baseCurrency, theme, checkInFrequency).
 * 
 * Tricky logic:
 * Must commit to SQLite FIRST before updating the browser cache.
 * We delegate directly to persistScopedRecord, which only updates local cache
 * upon a verified HTTP 200 response, and propagates HTTP errors (e.g. 500) and
 * network rejections directly to the caller.
 * 
 * TODO: Support partial settings patching if preferences become modular.
 */
export async function saveSettings(settings: UserSettings): Promise<void> {
    await persistScopedRecord('settings' as any, settings as any);
}

// Net Worth History
/**
 * Saves the entire net worth history array.
 *
 * Why this exists:
 * Used when backfilling, bulk importing, or replacing historical snapshot series.
 *
 * Tricky logic:
 * Throws on HTTP error or network rejection to prevent silent data loss.
 *
 * TODO: Support paginated snapshot retrieval if history exceeds 1,000 records.
 */
export async function saveNetWorthHistory(history: NetWorthSnapshot[]): Promise<void> {
    if (typeof window === 'undefined') return;
    const res = await fetch('/api/vault', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ history })
    });
    if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'Durable net worth history write failed' }));
        throw new Error(err.error || 'Failed to persist net worth history to local SQLite database');
    }
}

/**
 * Saves a single net worth snapshot (e.g. at end of monthly check-in or asset change).
 * 
 * Why this exists:
 * Records the point-in-time net worth calculation.
 * 
 * Tricky logic:
 * Delegates to persistScopedRecord which performs commit-first SQLite storage,
 * updating the local history cache only after verified HTTP 200, and propagating errors.
 * 
 * TODO: Auto-prune duplicate daily snapshots if multiple edits occur in one calendar day.
 */
export async function saveFullSnapshot(snapshot: NetWorthSnapshot): Promise<void> {
    await persistScopedRecord('history', snapshot);
}

// Backup archives (schemaVersion 1). v1 archives still carry the retired
// assets/liabilities arrays — bulk_restore maps them into the ledger.
export interface BackupManifest {
    app: string;
    appVersion: string;
    schemaVersion: number;
    exportTimestamp: string;
    recordCounts: {
        assets: number;
        liabilities: number;
        goals: number;
        recurring: number;
        history: number;
        cashFlow: number;
        settings: number;
    };
}

export interface BackupArchive {
    manifest: BackupManifest;
    vault: {
        assets: Asset[];
        liabilities: Liability[];
        goals: Goal[];
        recurring: RecurringTransaction[];
        history: NetWorthSnapshot[];
        cashFlow: CashFlowEntry[];
        settings: Record<string, any>;
        drafts?: any[];
    };
}

/**
 * Pre-restore backup validator (TRUST-11).
 * Verifies valid JSON structure, matching application identifier ("OpenNetWorth"),
 * schemaVersion: 1, presence of all seven record collections, and individual data integrity.
 */
export function validateBackup(data: any): { valid: boolean; error?: string } {
    if (!data || typeof data !== 'object') {
        return { valid: false, error: 'Backup data is not a valid JSON object' };
    }

    if (!data.manifest || typeof data.manifest !== 'object') {
        return { valid: false, error: 'Missing backup manifest in archive' };
    }

    if (data.manifest.app !== 'OpenNetWorth') {
        return { valid: false, error: `Invalid application identifier: "${data.manifest.app}". Expected "OpenNetWorth".` };
    }

    if (data.manifest.schemaVersion !== 1) {
        return { valid: false, error: `Unsupported schema version: ${data.manifest.schemaVersion}. Supported version is 1.` };
    }

    if (!data.vault || typeof data.vault !== 'object') {
        return { valid: false, error: 'Missing vault collections object in backup' };
    }

    const { assets, liabilities, goals, recurring, history, cashFlow, settings } = data.vault;

    if (!Array.isArray(assets)) return { valid: false, error: 'Missing or invalid assets collection in vault' };
    if (!Array.isArray(liabilities)) return { valid: false, error: 'Missing or invalid liabilities collection in vault' };
    if (!Array.isArray(goals)) return { valid: false, error: 'Missing or invalid goals collection in vault' };
    if (!Array.isArray(recurring)) return { valid: false, error: 'Missing or invalid recurring transactions collection in vault' };
    if (!Array.isArray(history)) return { valid: false, error: 'Missing or invalid history collection in vault' };
    if (!Array.isArray(cashFlow)) return { valid: false, error: 'Missing or invalid cash flow collection in vault' };
    if (!settings || typeof settings !== 'object') return { valid: false, error: 'Missing or invalid settings collection in vault' };

    // Record count validation
    const counts = data.manifest.recordCounts;
    if (counts) {
        if (counts.assets !== undefined && counts.assets !== assets.length) {
            return { valid: false, error: `Asset count mismatch: manifest declares ${counts.assets}, found ${assets.length}` };
        }
        if (counts.liabilities !== undefined && counts.liabilities !== liabilities.length) {
            return { valid: false, error: `Liabilities count mismatch: manifest declares ${counts.liabilities}, found ${liabilities.length}` };
        }
        if (counts.goals !== undefined && counts.goals !== goals.length) {
            return { valid: false, error: `Goals count mismatch: manifest declares ${counts.goals}, found ${goals.length}` };
        }
        if (counts.recurring !== undefined && counts.recurring !== recurring.length) {
            return { valid: false, error: `Recurring count mismatch: manifest declares ${counts.recurring}, found ${recurring.length}` };
        }
        if (counts.cashFlow !== undefined && counts.cashFlow !== cashFlow.length) {
            return { valid: false, error: `Cash flow count mismatch: manifest declares ${counts.cashFlow}, found ${cashFlow.length}` };
        }
        if (counts.history !== undefined && counts.history !== history.length) {
            return { valid: false, error: `History count mismatch: manifest declares ${counts.history}, found ${history.length}` };
        }
    }

    // Individual data integrity validation
    for (const [idx, item] of assets.entries()) {
        if (!item || !item.id || typeof item.id !== 'string') {
            return { valid: false, error: `Asset at index ${idx} is missing a valid id` };
        }
        if (typeof item.name !== 'string') {
            return { valid: false, error: `Asset "${item.id}" has an invalid name` };
        }
        if (typeof item.value !== 'number' || isNaN(item.value) || !isFinite(item.value)) {
            return { valid: false, error: `Asset "${item.name || item.id}" has a non-numeric value` };
        }
        if (item.value < 0) {
            return { valid: false, error: `Asset "${item.name || item.id}" cannot have a negative value` };
        }
    }

    for (const [idx, item] of liabilities.entries()) {
        if (!item || !item.id || typeof item.id !== 'string') {
            return { valid: false, error: `Liability at index ${idx} is missing a valid id` };
        }
        if (typeof item.name !== 'string') {
            return { valid: false, error: `Liability "${item.id}" has an invalid name` };
        }
        if (typeof item.balance !== 'number' || isNaN(item.balance) || !isFinite(item.balance)) {
            return { valid: false, error: `Liability "${item.name || item.id}" has a non-numeric balance` };
        }
        if (item.balance < 0) {
            return { valid: false, error: `Liability "${item.name || item.id}" cannot have a negative balance` };
        }
    }

    for (const [idx, item] of goals.entries()) {
        if (!item || !item.id || typeof item.id !== 'string') {
            return { valid: false, error: `Goal at index ${idx} is missing a valid id` };
        }
        if (typeof item.name !== 'string') {
            return { valid: false, error: `Goal "${item.id}" has an invalid name` };
        }
        if (typeof item.target_amount !== 'number' || isNaN(item.target_amount) || !isFinite(item.target_amount) || item.target_amount < 0) {
            return { valid: false, error: `Goal "${item.name || item.id}" has a non-numeric target_amount` };
        }
    }

    for (const [idx, item] of recurring.entries()) {
        if (!item || !item.id || typeof item.id !== 'string') {
            return { valid: false, error: `Recurring transaction at index ${idx} is missing a valid id` };
        }
        if (typeof item.name !== 'string') {
            return { valid: false, error: `Recurring item "${item.id}" has an invalid name` };
        }
        if (typeof item.amount !== 'number' || isNaN(item.amount) || !isFinite(item.amount) || item.amount < 0) {
            return { valid: false, error: `Recurring item "${item.name || item.id}" has a non-numeric amount` };
        }
    }

    for (const [idx, item] of history.entries()) {
        const netWorth = item.netWorth ?? item.net_worth;
        if (typeof netWorth !== 'number' || isNaN(netWorth) || !isFinite(netWorth)) {
            return { valid: false, error: `History record at index ${idx} has a non-numeric net worth` };
        }
    }

    for (const [idx, item] of cashFlow.entries()) {
        if (!item || typeof item !== 'object') {
            return { valid: false, error: `Cash flow entry at index ${idx} is not an object` };
        }
        if (!item.month || typeof item.month !== 'string' || !/^\d{4}-(?:0[1-9]|1[0-2])$/.test(item.month)) {
            return { valid: false, error: `Cash flow entry at index ${idx} has invalid month "${item?.month}". Expected YYYY-MM.` };
        }
        if (typeof item.income !== 'number' || isNaN(item.income) || !isFinite(item.income) || item.income < 0) {
            return { valid: false, error: `Cash flow entry for ${item.month} has invalid or negative income` };
        }
        if (typeof item.expenses !== 'number' || isNaN(item.expenses) || !isFinite(item.expenses) || item.expenses < 0) {
            return { valid: false, error: `Cash flow entry for ${item.month} has invalid or negative expenses` };
        }
    }

    return { valid: true };
}

/**
 * Exports the complete, authoritative SQLite database vault (Version 2) via the backend API.
 * 
 * Why this exists:
 * Milestone 1 and independent assessment findings require that exports represent a point-in-time
 * consistent database snapshot containing both legacy and modern accounting/document collections
 * directly from SQLite, rather than partial data read from browser localStorage.
 */
export async function exportAuthoritativeVault(): Promise<string> {
    if (typeof window !== 'undefined') {
        const res = await fetch('/api/vault');
        if (!res.ok) {
            const err = await res.json().catch(() => ({ error: 'Database export failed' }));
            throw new Error(err.error || `Database export returned HTTP ${res.status}`);
        }
        const data = await res.json();
        const archive = {
            manifest: data.manifest || {
                app: 'OpenNetWorth',
                schemaVersion: 3,
                table_naming: 'plain',
                exportTimestamp: new Date().toISOString()
            },
            vault: data.vault
        };
        return JSON.stringify(archive, null, 2);
    }
    throw new Error('exportAuthoritativeVault requires a browser window (it fetches /api/vault)');
}

/**
 * Restores vault data atomically from a JSON backup archive (TRUST-11, DATA-01).
 * 
 * Why this exists:
 * - Validates backup integrity and schema before making any changes.
 * - Commits to SQLite database FIRST.
 * - Inspects response.ok: if database write fails (e.g. HTTP 500), reports error and
 *   leaves the existing vault completely untouched.
 */
export async function importData(jsonString: string): Promise<{ success: boolean; error?: string }> {
    try {
        let parsed: any;
        try {
            parsed = JSON.parse(jsonString);
        } catch {
            return { success: false, error: 'File contains invalid JSON syntax' };
        }

        const schemaVersion = parsed.manifest?.schemaVersion ?? parsed.schemaVersion ?? parsed.vault?.schemaVersion ?? 1;

        // If it's a legacy V1 backup, validate using validateBackup
        if (schemaVersion < 2) {
            const validation = validateBackup(parsed);
            if (!validation.valid) {
                return { success: false, error: validation.error };
            }
        }

        const vault = parsed.vault || parsed;

        // 2. Commit durably to SQLite FIRST via atomic bulk_restore (DATA-01, TRUST-11)
        if (typeof window !== 'undefined') {
            const res = await fetch('/api/vault', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: 'bulk_restore',
                    schemaVersion,
                    manifest: parsed.manifest,
                    vault
                })
            });

            if (!res.ok) {
                const err = await res.json().catch(() => ({ error: 'Database restore failed' }));
                return { success: false, error: err.error || `Database restore returned HTTP ${res.status}` };
            }
        }

        // 3. The SQLite vault is the only store — there is no local cache to refresh.

        return { success: true };
    } catch (e: any) {
        return { success: false, error: e.message || 'Import failed due to an unexpected error' };
    }
}

// Freedom Settings
/**
 * Saves debt payoff freedom settings (strategy, extra monthly payment, and currency).
 * 
 * Why this exists:
 * Configures the debt snowball/avalanche acceleration engine.
 * Persists extraMonthlyPayment together with its explicit currency (Item 5).
 * 
 * Tricky logic:
 * Commit to SQLite first before updating cache. Propagates errors to caller.
 * Retains currency explicitly so reloading or cross-currency calculation never silently alters units.
 * 
 * TODO: Allow custom debt priority ordering beyond snowball and avalanche.
 */
export async function saveFreedomSettings(settings: { strategy: PayoffStrategy; extraMonthlyPayment: number; currency?: CurrencyCode }): Promise<void> {
    await persistScopedRecord('settings' as any, { key: 'freedomSettings', value: settings } as any);
}

// Recurring Transactions — the factor table moved to the domain layer
// (`recurringNormalization.ts`) so server-side services (cash-flow forecast)
// can share it without importing this browser-only module. Re-exported here so
// existing importers (useWealthMomentum, RecurringList, autopilotGenerator)
// keep their import paths.
export { toMonthlyAmount } from '@/lib/domain/accounting/recurringNormalization';

// NOTE: The old `applyRecurringToMonth` here fabricated fake cash_flow_summaries
// rows from schedule sums. It was removed (zero callers) and replaced by
// `applyRecurringToMonth` in `src/features/cashflow/data/autopilotGenerator.ts`,
// which posts real double-entry transactions with origin='recurring'.

const DEBT_TRX_ID = 'debt-freedom-accelerator';

/**
 * Reads the Debt Freedom Accelerator schedule from the SQLite vault.
 *
 * Why this exists:
 * localStorage is no longer a store, so the existing record must be looked up
 * through the vault API (the same scoped GET the cashflow repository uses).
 * Returns undefined when the record is absent or the fetch fails — callers
 * treat "unknown" like "absent" for the amount<=0 no-write guard.
 */
async function fetchDebtAcceleratorSchedule(): Promise<RecurringTransaction | undefined> {
    if (typeof window === 'undefined') return undefined;
    try {
        const res = await fetch('/api/vault?entity=recurring');
        if (!res.ok) return undefined;
        const json = await res.json().catch(() => null);
        const rows: any[] = json?.data || [];
        const row = rows.find(r => r.id === DEBT_TRX_ID);
        if (!row) return undefined;
        return {
            id: row.id,
            user_id: row.user_id,
            name: row.name,
            amount: row.amount,
            type: row.type,
            frequency: row.frequency,
            category: row.category,
            start_date: row.start_date,
            end_date: row.end_date ?? undefined,
            is_active: row.is_active === 1,
            currency: row.currency as CurrencyCode
        };
    } catch {
        return undefined;
    }
}

/**
 * Synchronizes the Debt Freedom Accelerator as an active recurring transaction.
 *
 * Why this exists:
 * When extra debt payments are budgeted in Freedom Settings, this creates or updates
 * an automatic monthly recurring expense transaction so cash flow accurately reflects it.
 *
 * Tricky logic:
 * - Pass intended currency into updateDebtRecurringTransaction (Item 5).
 * - Create and update recurring entries with the intended currency;
 *   do not hardcode USD or silently retain an incompatible old currency.
 * - The existing record is read from the SQLite vault (GET /api/vault?entity=recurring)
 *   and written back through persistScopedRecord, which propagates failures to the caller.
 *
 * TODO: Link recurring payment directly to specific liability payoff timeline.
 */
export async function updateDebtRecurringTransaction(amount: number, currency: CurrencyCode = 'USD'): Promise<void> {
    const existing = await fetchDebtAcceleratorSchedule();

    if (amount <= 0) {
        if (existing) {
            const deactivated: RecurringTransaction = {
                ...existing,
                amount: 0,
                currency,
                is_active: false
            };
            await persistScopedRecord('recurring', deactivated);
        }
        return;
    }

    const targetTrx: RecurringTransaction = existing
        ? { ...existing, amount, currency, is_active: true }
        : {
            id: DEBT_TRX_ID,
            name: 'Debt Freedom Accelerator',
            amount: amount,
            type: 'expense',
            frequency: 'monthly',
            category: 'Debt Repayment',
            start_date: new Date().toISOString().split('T')[0],
            is_active: true,
            currency: currency
        };

    await persistScopedRecord('recurring', targetTrx);
}

/**
 * Wipes all user data across both SQLite and local storage.
 * 
 * Why this exists:
 * Used during reset app / re-onboard danger zone actions.
 * 
 * Tricky logic:
 * Issue durable wipe to SQLite first. If SQLite returns an error or network rejects,
 * throw immediately without clearing localStorage, so the user's data is not prematurely lost.
 * 
 * TODO: Add confirmation token requirement for API-level wipe operations.
 */
export async function clearAllData(): Promise<void> {
    if (typeof window === 'undefined') return;
    const res = await fetch('/api/vault', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'clear_vault' })
    });
    if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'Failed to clear SQLite vault' }));
        throw new Error(err.error || 'Failed to clear local SQLite database');
    }
    localStorage.clear();
}

/**
 * Generates 24 months of mock snapshots and persists them to the SQLite vault
 * via saveNetWorthHistory.
 *
 * Why this exists:
 * Async + returning the generated series removes a race: callers previously
 * re-read the localStorage cache before the durable POST had resolved and saw
 * stale data. Awaiting here guarantees the vault is committed before the UI
 * refreshes.
 */
export async function generateMockHistory(): Promise<NetWorthSnapshot[]> {
    if (typeof window === 'undefined') return [];

    const today = new Date();
    const history: NetWorthSnapshot[] = [];
    let baseNetWorth = 150000; // Starting point

    // Generate 24 months of history
    for (let i = 23; i >= 0; i--) {
        const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
        const dateStr = d.toISOString().split('T')[0];

        // Add some random fluctuation/growth
        // Trend up generally, but with some noise
        const growth = baseNetWorth * (0.01 + (Math.random() * 0.02 - 0.005));
        baseNetWorth += growth;

        // Assets/Liabilities split (rough approximation)
        const snapshotAssets = baseNetWorth * 1.5;
        const snapshotLiabilities = baseNetWorth * 0.5;

        history.push({
            id: crypto.randomUUID(),
            date: dateStr,
            totalAssets: Math.round(snapshotAssets),
            totalLiabilities: Math.round(snapshotLiabilities),
            netWorth: Math.round(snapshotAssets - snapshotLiabilities)
        });
    }

    await saveNetWorthHistory(history);
    return history;
}

// --- Dashboard Layout Persistence ---
export const STORAGE_KEYS_DASHBOARD = 'clearworth_dashboard_layout';

/**
 * Saves user dashboard layout customization.
 * 
 * Why this exists:
 * Allows user to toggle and reorder dashboard widgets.
 * 
 * Tricky logic:
 * Commit to SQLite first before updating cache. Propagates errors to caller.
 * 
 * TODO: Provide cloud sync or export for dashboard layouts across devices.
 */
export async function saveDashboardLayout(config: DashboardConfig): Promise<void> {
    await persistScopedRecord('settings' as any, { key: 'dashboardLayout', value: config } as any);
}

// --- UI state reads from the SQLite settings kv (Phase 2.5) ---
/**
 * Why this exists:
 * UI state (general settings, debt payoff plan, dashboard layout) used to be
 * read from localStorage with SQLite as a write-only mirror. Reads now come
 * from the settings kv table via /api/settings, so state survives browser
 * resets and is covered by vault backups. localStorage remains only as the
 * demo-persona store (removed with the demo-mode rework) and as a one-time
 * migration source.
 *
 * Tricky logic:
 * The one-time localStorage -> settings-kv migration is guarded by a marker
 * row INSIDE the kv table ('ui_state_migrated_v1'), not a localStorage flag,
 * so it is idempotent across browsers and re-runs. If the migration POST
 * fails, the singleton promise is reset so the next boot retries instead of
 * silently swallowing the migration forever.
 */
const UI_STATE_MIGRATION_KEY = 'ui_state_migrated_v1';
let uiStateMigrationPromise: Promise<void> | null = null;

async function ensureUiStateMigrated(): Promise<void> {
    if (typeof window === 'undefined') return;
    if (!uiStateMigrationPromise) {
        uiStateMigrationPromise = (async () => {
            try {
                const res = await fetch('/api/settings');
                if (!res.ok) {
                    uiStateMigrationPromise = null;
                    return;
                }
                const json = await res.json().catch(() => null);
                const existing = json?.settings || {};
                if (existing[UI_STATE_MIGRATION_KEY]) return;

                // Legacy clearworth_* keys are fallback sources: users whose
                // browser still holds pre-rename keys keep their UI state.
                const userSettings = get<Record<string, any>>(STORAGE_KEYS.SETTINGS) ?? get<Record<string, any>>('clearworth_settings');
                const freedom = get<Record<string, any>>(STORAGE_KEYS.FREEDOM_SETTINGS) ?? get<Record<string, any>>('clearworth_freedom_settings');
                const layout = get<DashboardConfig>(STORAGE_KEYS_DASHBOARD);

                const payload: Record<string, any> = { [UI_STATE_MIGRATION_KEY]: true };
                if (userSettings) payload.userSettings = userSettings;
                if (freedom) payload.freedomSettings = freedom;
                if (layout) payload.dashboardLayout = layout;

                const post = await fetch('/api/settings', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ settings: payload })
                });
                if (!post.ok) {
                    // Leave the marker unset so the next boot retries.
                    uiStateMigrationPromise = null;
                }
            } catch (e) {
                uiStateMigrationPromise = null;
                console.debug('UI state migration notice:', e);
            }
        })();
    }
    return uiStateMigrationPromise;
}

/** Test seam: force the next vault settings read to re-run the boot migration. */
export function resetUiStateMigrationForTests(): void {
    uiStateMigrationPromise = null;
}

export async function getVaultSettings(): Promise<Record<string, any>> {
    await ensureUiStateMigrated();
    const res = await fetch('/api/settings');
    if (!res.ok) {
        throw new Error(`Failed to load settings from SQLite vault (HTTP ${res.status})`);
    }
    const json = await res.json().catch(() => null);
    return json?.settings || {};
}

export async function loadSettingsFromVault(): Promise<UserSettings> {
    const s = await getVaultSettings();
    const defaults: UserSettings = {
        baseCurrency: 'USD',
        theme: 'system',
        checkInFrequency: 'monthly'
    };
    return { ...defaults, ...(s.userSettings || {}) };
}

export async function loadFreedomSettingsFromVault(): Promise<{ strategy: PayoffStrategy; extraMonthlyPayment: number; currency: CurrencyCode }> {
    const s = await getVaultSettings();
    const saved = s.freedomSettings as Partial<{ strategy: PayoffStrategy; extraMonthlyPayment: number; currency: CurrencyCode }> | undefined;
    // Same historical-USD preservation rule as the localStorage reader:
    // a currency-less saved plan keeps its original USD meaning, never a silent
    // reinterpretation in the current reporting currency.
    return {
        strategy: saved?.strategy || 'avalanche',
        extraMonthlyPayment: saved?.extraMonthlyPayment !== undefined ? saved.extraMonthlyPayment : 500,
        currency: (saved?.currency || 'USD') as CurrencyCode
    };
}

export async function loadDashboardLayoutFromVault(): Promise<DashboardConfig | null> {
    const s = await getVaultSettings();
    return (s.dashboardLayout as DashboardConfig) ?? null;
}

// NOTE: `initVaultSync` (the boot-time localStorage<->SQLite merge) was removed with
// the single-data-layer collapse. The SQLite vault is the only store; the one-time
// localStorage -> settings-kv migration lives in ensureUiStateMigrated above.


export async function resetDashboardLayout(): Promise<void> {
    if (typeof window === 'undefined') return;
    localStorage.removeItem(STORAGE_KEYS_DASHBOARD);
    // The vault is the read source now — the key must go there too, otherwise
    // the next load would resurrect the old layout. The vault key is
    // 'dashboardLayout' (what saveDashboardLayout writes), not the localStorage key.
    try {
        await fetch('/api/settings?key=dashboardLayout', { method: 'DELETE' });
    } catch (e) {
        console.debug('Dashboard layout reset: vault delete notice:', e);
    }
}
