import { Asset } from '@/features/assets/types';
import { Liability, PayoffStrategy } from '@/features/liabilities/types';
import { Goal } from '@/features/goals/types';
import { CashFlowEntry, RecurringTransaction, WealthMomentum } from '@/features/cashflow/types';
import { NetWorthSnapshot, UserSettings, DashboardConfig } from '@/types';
import { SAMPLE_ASSETS, SAMPLE_LIABILITIES, SAMPLE_GOALS } from './sampleData';

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

export type SupportedEntity = 'assets' | 'liabilities' | 'goals' | 'recurring' | 'history' | 'cashFlow' | 'settings';

/**
 * Persists an individual record durably to SQLite with scoped operation (DATA-01, DATA-02, DATA-04, DATA-05).
 * Updates local cache and throws if persistence fails.
 */
export async function persistScopedRecord<T extends { id?: string }>(
    entity: SupportedEntity,
    item: T
): Promise<T> {
    let persistedItem: any = item;
    if (typeof window !== 'undefined') {
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
        if (json?.item) {
            persistedItem = json.item;
        }
    }

    // Update local cache for fast synchronous access using the authoritative persisted record
    if (entity === 'assets') {
        const items = loadAssets();
        const idx = items.findIndex(i => i.id === persistedItem.id);
        if (idx !== -1) items[idx] = persistedItem as any;
        else items.push(persistedItem as any);
        set(STORAGE_KEYS.ASSETS, items);
    } else if (entity === 'liabilities') {
        const items = loadLiabilities();
        const idx = items.findIndex(i => i.id === persistedItem.id);
        if (idx !== -1) items[idx] = persistedItem as any;
        else items.push(persistedItem as any);
        set(STORAGE_KEYS.LIABILITIES, items);
    } else if (entity === 'goals') {
        const items = loadGoals();
        const idx = items.findIndex(i => i.id === persistedItem.id);
        if (idx !== -1) items[idx] = persistedItem as any;
        else items.push(persistedItem as any);
        set(STORAGE_KEYS.GOALS, items);
    } else if (entity === 'recurring') {
        const items = loadRecurringTransactions();
        const idx = items.findIndex(i => i.id === persistedItem.id);
        if (idx !== -1) items[idx] = persistedItem as any;
        else items.push(persistedItem as any);
        set(STORAGE_KEYS.RECURRING, items);
    } else if (entity === 'cashFlow') {
        const items = loadCashFlow();
        const persisted = persistedItem as CashFlowEntry;
        const idx = items.findIndex(i => i.id === persisted.id || i.month === persisted.month);
        if (idx !== -1) items[idx] = persisted;
        else items.push(persisted);
        set(STORAGE_KEYS.CASH_FLOW, items);
    } else if (entity === 'history') {
        const history = loadNetWorthHistory();
        const persisted = persistedItem as NetWorthSnapshot;
        const idx = history.findIndex(h => h.id === persisted.id || h.date === persisted.date);
        if (idx !== -1) history[idx] = persisted;
        else history.push(persisted);
        history.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
        set(STORAGE_KEYS.NET_WORTH_HISTORY, history);
    } else if (entity === 'settings') {
        if ((item as any).key && (item as any).value !== undefined) {
            if ((item as any).key === 'freedomSettings') {
                set(STORAGE_KEYS.FREEDOM_SETTINGS, (item as any).value);
            } else if ((item as any).key === 'dashboardLayout') {
                set(STORAGE_KEYS_DASHBOARD, (item as any).value);
            } else {
                const current = get<any>(STORAGE_KEYS.SETTINGS) || {};
                current[(item as any).key] = (item as any).value;
                set(STORAGE_KEYS.SETTINGS, current);
            }
        } else {
            set(STORAGE_KEYS.SETTINGS, item);
        }
    }

    return persistedItem as T;
}

/**
 * Deletes an individual record durably from SQLite with scoped operation (DATA-04, DATA-05).
 * Updates local cache and throws if deletion fails.
 */
export async function deleteScopedRecord(
    entity: 'assets' | 'liabilities' | 'goals' | 'recurring' | 'cashFlow' | 'history',
    id: string
): Promise<void> {
    if (typeof window !== 'undefined') {
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

    // Update local cache
    if (entity === 'assets') {
        set(STORAGE_KEYS.ASSETS, loadAssets().filter(i => i.id !== id));
    } else if (entity === 'liabilities') {
        set(STORAGE_KEYS.LIABILITIES, loadLiabilities().filter(i => i.id !== id));
    } else if (entity === 'goals') {
        set(STORAGE_KEYS.GOALS, loadGoals().filter(i => i.id !== id));
    } else if (entity === 'recurring') {
        set(STORAGE_KEYS.RECURRING, loadRecurringTransactions().filter(i => i.id !== id));
    } else if (entity === 'cashFlow') {
        set(STORAGE_KEYS.CASH_FLOW, loadCashFlow().filter(i => i.id !== id && i.month !== id));
    } else if (entity === 'history') {
        set(STORAGE_KEYS.NET_WORTH_HISTORY, loadNetWorthHistory().filter(i => i.id !== id && i.date !== id));
    }
}

// Generic helper with backward-compatible key lookup
function get<T>(key: string, parse = true): T | null {
    if (typeof window === 'undefined') return null;
    let item = localStorage.getItem(key);
    if (!item && key.startsWith('opennetworth_')) {
        // Fallback to legacy clearworth key
        const legacyKey = key.replace('opennetworth_', 'clearworth_');
        item = localStorage.getItem(legacyKey);
        // Cashflow legacy key special check (clearworth_cashflow without underscore)
        if (!item && key === STORAGE_KEYS.CASH_FLOW) {
            item = localStorage.getItem('clearworth_cashflow');
        }
    }
    if (!item) return null;
    try {
        return parse ? JSON.parse(item) : (item as unknown as T);
    } catch (e) {
        console.error(`Error parsing storage key ${key}:`, e);
        return null;
    }
}

/**
 * Updates local cache and dispatches UI update notifications.
 * 
 * Why this exists:
 * Provides fast synchronous local storage access and reactive UI updates.
 * Separated from persistence: does NOT invoke any bulk SQLite sync (DATA-04, DATA-05).
 * Durable writes must explicitly use scoped operations (persistScopedRecord / deleteScopedRecord)
 * or atomic bulk restore (importData).
 */
function set<T>(key: string, value: T) {
    if (typeof window === 'undefined') return;
    const str = JSON.stringify(value);
    localStorage.setItem(key, str);

    // Keep legacy key in sync during transition
    if (key.startsWith('opennetworth_')) {
        const legacyKey = key.replace('opennetworth_', 'clearworth_');
        localStorage.setItem(legacyKey, str);
        if (key === STORAGE_KEYS.CASH_FLOW) {
            localStorage.setItem('clearworth_cashflow', str);
        }
    }

    // Dispatch custom event for reactive UI updates
    window.dispatchEvent(new Event('opennetworth_data_updated'));
    window.dispatchEvent(new Event('clearworth_data_updated'));
}

// User Settings
export function loadSettings(): UserSettings {
    const defaults: UserSettings = {
        baseCurrency: 'USD',
        theme: 'system',
        checkInFrequency: 'monthly'
    };
    return { ...defaults, ...get<Partial<UserSettings>>(STORAGE_KEYS.SETTINGS) };
}

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

// Assets
export function loadAssets(): Asset[] {
    return get<Asset[]>(STORAGE_KEYS.ASSETS) || [];
}

export function saveAssets(assets: Asset[]): void {
    set(STORAGE_KEYS.ASSETS, assets);
}

// Liabilities
export function loadLiabilities(): Liability[] {
    return get<Liability[]>(STORAGE_KEYS.LIABILITIES) || [];
}

export function saveLiabilities(liabilities: Liability[]): void {
    set(STORAGE_KEYS.LIABILITIES, liabilities);
}

// Net Worth History
export function loadNetWorthHistory(): NetWorthSnapshot[] {
    return get<NetWorthSnapshot[]>(STORAGE_KEYS.NET_WORTH_HISTORY) || [];
}

/**
 * Saves the entire net worth history array.
 * 
 * Why this exists:
 * Used when backfilling, bulk importing, or replacing historical snapshot series.
 * 
 * Tricky logic:
 * Commit to SQLite first and verify HTTP 200 before updating local storage cache.
 * Throws on HTTP error or network rejection to prevent silent data loss or cache desync.
 * 
 * TODO: Support paginated snapshot retrieval if history exceeds 1,000 records.
 */
export async function saveNetWorthHistory(history: NetWorthSnapshot[]): Promise<void> {
    if (typeof window !== 'undefined') {
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
    // Commit succeeded: update local cache
    set(STORAGE_KEYS.NET_WORTH_HISTORY, history);
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

// Goals
export function loadGoals(): Goal[] {
    return get<Goal[]>(STORAGE_KEYS.GOALS) || [];
}

export function saveGoals(goals: Goal[]): void {
    set(STORAGE_KEYS.GOALS, goals);
}

// Cash Flow
export function loadCashFlow(): CashFlowEntry[] {
    return get<CashFlowEntry[]>(STORAGE_KEYS.CASH_FLOW) || [];
}

export function saveCashFlow(entries: CashFlowEntry[]): void {
    set(STORAGE_KEYS.CASH_FLOW, entries);
}

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

// Data Management
export function exportAllData(): string {
    const assets = loadAssets();
    const liabilities = loadLiabilities();
    const goals = loadGoals();
    const recurring = loadRecurringTransactions();
    const history = loadNetWorthHistory();
    const cashFlow = loadCashFlow();
    
    // Aggregate all user settings into the backup (payoff preferences, dashboard layout, base preferences)
    const baseSettings = get<Record<string, any>>(STORAGE_KEYS.SETTINGS) || {};
    const freedomSettings = get<Record<string, any>>(STORAGE_KEYS.FREEDOM_SETTINGS) || {};
    const dashboardLayout = get<Record<string, any>>('opennetworth_dashboard_layout') || {};

    const settings: Record<string, any> = {
        ...baseSettings,
        freedomSettings,
        dashboardLayout
    };

    const archive: BackupArchive = {
        manifest: {
            app: 'OpenNetWorth',
            appVersion: '0.1.0',
            schemaVersion: 1,
            exportTimestamp: new Date().toISOString(),
            recordCounts: {
                assets: assets.length,
                liabilities: liabilities.length,
                goals: goals.length,
                recurring: recurring.length,
                history: history.length,
                cashFlow: cashFlow.length,
                settings: Object.keys(settings).length
            }
        },
        vault: {
            assets,
            liabilities,
            goals,
            recurring,
            history,
            cashFlow,
            settings
        }
    };

    // Pre-download validation against schema (TRUST-10)
    const validation = validateBackup(archive);
    if (!validation.valid) {
        throw new Error(`Export archive validation failed: ${validation.error}`);
    }

    return JSON.stringify(archive, null, 2);
}

/**
 * Restores vault data atomically from a JSON backup archive (TRUST-11, DATA-01).
 * 
 * Why this exists:
 * - Validates backup integrity and schema before making any changes.
 * - Commits to SQLite database FIRST.
 * - Inspects response.ok: if database write fails (e.g. HTTP 500), reports error and
 *   leaves existing local storage completely untouched.
 * - Updates local cache ONLY after database confirms success.
 */
export async function importData(jsonString: string): Promise<{ success: boolean; error?: string }> {
    try {
        let parsed: any;
        try {
            parsed = JSON.parse(jsonString);
        } catch {
            return { success: false, error: 'File contains invalid JSON syntax' };
        }

        // 1. Pre-restore validation (TRUST-11)
        const validation = validateBackup(parsed);
        if (!validation.valid) {
            return { success: false, error: validation.error };
        }

        const vault = parsed.vault;

        // 2. Commit durably to SQLite FIRST via atomic bulk_restore (DATA-01, TRUST-11)
        if (typeof window !== 'undefined') {
            const res = await fetch('/api/vault', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: 'bulk_restore',
                    assets: vault.assets,
                    liabilities: vault.liabilities,
                    goals: vault.goals,
                    recurring: vault.recurring,
                    history: vault.history,
                    cashFlow: vault.cashFlow,
                    settings: vault.settings
                })
            });

            if (!res.ok) {
                const err = await res.json().catch(() => ({ error: 'Database restore failed' }));
                return { success: false, error: err.error || `Database restore returned HTTP ${res.status}` };
            }
        }

        // 3. ONLY after database confirms success (HTTP 200), refresh local browser cache
        saveAssets(vault.assets);
        saveLiabilities(vault.liabilities);
        saveGoals(vault.goals);
        saveRecurringTransactions(vault.recurring);
        set(STORAGE_KEYS.NET_WORTH_HISTORY, vault.history);
        saveCashFlow(vault.cashFlow);

        if (vault.settings) {
            const { freedomSettings, dashboardLayout, ...baseSettings } = vault.settings;
            set(STORAGE_KEYS.SETTINGS, baseSettings);
            if (freedomSettings) {
                set(STORAGE_KEYS.FREEDOM_SETTINGS, freedomSettings);
            }
            if (dashboardLayout) {
                set('opennetworth_dashboard_layout', dashboardLayout);
            }
        }

        if (typeof window !== 'undefined') {
            window.dispatchEvent(new Event('opennetworth_data_updated'));
            window.dispatchEvent(new Event('clearworth_data_updated'));
        }

        return { success: true };
    } catch (e: any) {
        return { success: false, error: e.message || 'Import failed due to an unexpected error' };
    }
}

// Freedom Settings
export function loadFreedomSettings(): { strategy: PayoffStrategy; extraMonthlyPayment: number } {
    const defaults = {
        strategy: 'avalanche' as PayoffStrategy,
        extraMonthlyPayment: 500
    };
    const saved = get<Partial<typeof defaults>>(STORAGE_KEYS.FREEDOM_SETTINGS);
    return { ...defaults, ...saved };
}

/**
 * Saves debt payoff freedom settings (strategy, extra monthly payment).
 * 
 * Why this exists:
 * Configures the debt snowball/avalanche acceleration engine.
 * 
 * Tricky logic:
 * Commit to SQLite first before updating cache. Propagates errors to caller.
 * 
 * TODO: Allow custom debt priority ordering beyond snowball and avalanche.
 */
export async function saveFreedomSettings(settings: { strategy: PayoffStrategy; extraMonthlyPayment: number }): Promise<void> {
    await persistScopedRecord('settings' as any, { key: 'freedomSettings', value: settings } as any);
}

// Recurring Transactions
export function loadRecurringTransactions(): RecurringTransaction[] {
    return get<RecurringTransaction[]>(STORAGE_KEYS.RECURRING) || [];
}

export function saveRecurringTransactions(transactions: RecurringTransaction[]): void {
    set(STORAGE_KEYS.RECURRING, transactions);
}

export function toMonthlyAmount(amount: number, frequency: string): number {
    switch (frequency) {
        case 'weekly': return amount * 4.33;
        case 'biweekly': return amount * 2.17;
        case 'monthly': return amount;
        case 'quarterly': return amount / 3;
        case 'yearly': return amount / 12;
        default: return amount;
    }
}

export function calculateWealthMomentum(): WealthMomentum {
    const transactions = loadRecurringTransactions().filter(t => t.is_active);

    const monthlyIncome = transactions
        .filter(t => t.type === 'income')
        .reduce((sum, t) => sum + toMonthlyAmount(t.amount, t.frequency), 0);

    const monthlyExpenses = transactions
        .filter(t => t.type === 'expense')
        .reduce((sum, t) => sum + toMonthlyAmount(t.amount, t.frequency), 0);

    const monthlySavings = monthlyIncome - monthlyExpenses;
    const savingsRate = monthlyIncome > 0 ? (monthlySavings / monthlyIncome) * 100 : 0;

    // Calculate base score
    let score = savingsRate;

    // Apply bonuses
    if (savingsRate > 50) score += 10;
    else if (savingsRate > 30) score += 5;
    else if (savingsRate > 20) score += 5;
    if (savingsRate < 0) score -= 10;

    // Clamp to 0-100
    score = Math.max(0, Math.min(100, score));

    return {
        score: Math.round(score),
        monthlyRecurringIncome: monthlyIncome,
        monthlyRecurringExpenses: monthlyExpenses,
        monthlySavings,
        savingsRate,
        annualProjectedSavings: monthlySavings * 12
    };
}

export function applyRecurringToMonth(month: string): boolean {
    const recurring = loadRecurringTransactions().filter(t => t.is_active);
    if (recurring.length === 0) return false;

    const cashFlowEntries = loadCashFlow();
    const existingEntry = cashFlowEntries.find((e) => e.month === month);

    if (existingEntry) return false; // Don't overwrite existing

    const income = recurring
        .filter(t => t.type === 'income')
        .reduce((sum, t) => sum + toMonthlyAmount(t.amount, t.frequency), 0);

    const expenses = recurring
        .filter(t => t.type === 'expense')
        .reduce((sum, t) => sum + toMonthlyAmount(t.amount, t.frequency), 0);

    const newEntry: CashFlowEntry = {
        id: `cf-auto-${Date.now()}`,
        month,
        income: Math.round(income),
        expenses: Math.round(expenses)
    };

    cashFlowEntries.push(newEntry);
    saveCashFlow(cashFlowEntries);

    return true;
}

/**
 * Synchronizes the Debt Freedom Accelerator as an active recurring transaction.
 * 
 * Why this exists:
 * When extra debt payments are budgeted in Freedom Settings, this creates or updates
 * an automatic monthly recurring expense transaction so cash flow accurately reflects it.
 * 
 * Tricky logic:
 * Commit to SQLite first via persistScopedRecord, which propagates failures to the caller
 * and only updates the browser cache upon verified HTTP 200 commit.
 * 
 * TODO: Link recurring payment directly to specific liability payoff timeline.
 */
export async function updateDebtRecurringTransaction(amount: number): Promise<void> {
    const DEBT_TRX_ID = 'debt-freedom-accelerator';
    const transactions = loadRecurringTransactions();
    const existing = transactions.find(t => t.id === DEBT_TRX_ID);

    if (amount <= 0) {
        if (existing) {
            const deactivated: RecurringTransaction = {
                ...existing,
                amount: 0,
                is_active: false
            };
            await persistScopedRecord('recurring', deactivated);
        }
        return;
    }

    const targetTrx: RecurringTransaction = existing
        ? { ...existing, amount, is_active: true }
        : {
            id: DEBT_TRX_ID,
            name: 'Debt Freedom Accelerator',
            amount: amount,
            type: 'expense',
            frequency: 'monthly',
            category: 'Debt Repayment',
            start_date: new Date().toISOString().split('T')[0],
            is_active: true,
            currency: 'USD'
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
    window.dispatchEvent(new Event('opennetworth_data_updated'));
    window.dispatchEvent(new Event('clearworth_data_updated'));
}

export function generateMockData(): void {
    if (typeof window === 'undefined') return;

    const today = new Date();



    // Mock History (Past 12 months with realistic growth)
    const history: NetWorthSnapshot[] = [];
    let baseNetWorth = 320000; // Starting point roughly

    for (let i = 11; i >= 0; i--) {
        const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
        const dateStr = d.toISOString().split('T')[0];

        // Add some random fluctuation/growth
        const growth = baseNetWorth * (0.008 + (Math.random() * 0.005)); // ~0.8-1.3% growth per month
        baseNetWorth += growth;

        const snapshotAssets = baseNetWorth + 393250; // Roughly back-calculating from liabilities constant for simplicity
        const snapshotLiabilities = 393250 - (i * 400); // Paying down debt slowly

        history.push({
            id: crypto.randomUUID(),
            date: dateStr,
            totalAssets: Math.round(snapshotAssets),
            totalLiabilities: Math.round(snapshotLiabilities),
            netWorth: Math.round(snapshotAssets - snapshotLiabilities)
        });
    }

    saveAssets(SAMPLE_ASSETS.map(a => ({ ...a, user_id: 'local_user' })));
    saveLiabilities(SAMPLE_LIABILITIES.map(l => ({ ...l, user_id: 'local_user' })));
    saveGoals(SAMPLE_GOALS);
    saveNetWorthHistory(history);

    // Custom Mentors Sample
    localStorage.setItem('custom_mentors', JSON.stringify([
        { id: 'm_demo_1', name: 'Naval Ravikant', archetype: 'The Modern Philosopher', description: 'Wealth, happiness, and sovereignty.', avatar: '/avatars/naval.jpg' }
    ]));
}

export function generateMockHistory(): void {
    if (typeof window === 'undefined') return;

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

    saveNetWorthHistory(history);
}

// --- Dashboard Layout Persistence ---
export const STORAGE_KEYS_DASHBOARD = 'clearworth_dashboard_layout';

export function loadDashboardLayout(): DashboardConfig | null {
    return get<DashboardConfig>(STORAGE_KEYS_DASHBOARD);
}

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

/**
 * Synchronizes client state with local SQLite database on boot.
 * 
 * Why this exists:
 * Inspects all 7 supported record types (DATA-08).
 * Uses an explicit versioned migration flag ('opennetworth_vault_migrated_v1') to perform
 * initial migration from legacy browser storage to SQLite once.
 * 
 * Tricky logic:
 * - Before migration (Findings 2 & 3):
 *   1. Preserves a recovery backup in localStorage.
 *   2. Inventories both stores and merges browser-only records if SQLite already has data.
 *   3. Commits to SQLite and verifies HTTP 200 before setting MIGRATION_FLAG.
 *   4. On commit failure, preserves source data and does NOT set migration flag.
 * - After migration (Finding 4):
 *   SQLite is unconditionally authoritative; local cache is refreshed directly from SQLite.
 *   Stale browser records absent from SQLite are NEVER revived.
 * 
 * TODO: Support background conflict resolution if multi-device sync is added in Milestone 2+.
 */
export async function initVaultSync(): Promise<void> {
    if (typeof window === 'undefined') return;

    try {
        const res = await fetch('/api/vault');
        if (!res.ok) return;
        const json = await res.json();
        const vault = json.vault;

        if (!vault) return;

        const MIGRATION_FLAG = 'opennetworth_vault_migrated_v1';
        const isMigrated = localStorage.getItem(MIGRATION_FLAG) === 'true';

        const localAssets = loadAssets();
        const localLiabs = loadLiabilities();
        const localGoals = loadGoals();
        const localRecurring = loadRecurringTransactions();
        const localHistory = loadNetWorthHistory();
        const localCashFlow = loadCashFlow();
        const localSettings = get<Record<string, any>>(STORAGE_KEYS.SETTINGS) || {};

        if (!isMigrated) {
            // 1. Preserve recovery backup of client storage
            const recoveryBackup = {
                timestamp: new Date().toISOString(),
                assets: localAssets,
                liabilities: localLiabs,
                goals: localGoals,
                recurring: localRecurring,
                history: localHistory,
                cashFlow: localCashFlow,
                settings: localSettings,
                freedomSettings: loadFreedomSettings(),
                dashboardLayout: loadDashboardLayout()
            };
            localStorage.setItem('opennetworth_migration_recovery_v1', JSON.stringify(recoveryBackup));

            // 2. Inventory and difference resolution (Finding 3):
            // Start with SQLite collections and add any browser records missing in SQLite
            const mergedAssets = [...(vault.assets || [])];
            for (const la of localAssets) {
                if (!mergedAssets.some(a => a.id === la.id)) {
                    mergedAssets.push(la);
                }
            }

            const mergedLiabs = [...(vault.liabilities || [])];
            for (const ll of localLiabs) {
                if (!mergedLiabs.some(l => l.id === ll.id)) {
                    mergedLiabs.push(ll);
                }
            }

            const mergedGoals = [...(vault.goals || [])];
            for (const lg of localGoals) {
                if (!mergedGoals.some(g => g.id === lg.id)) {
                    mergedGoals.push(lg);
                }
            }

            const mergedRecurring = [...(vault.recurring || [])];
            for (const lr of localRecurring) {
                if (!mergedRecurring.some(r => r.id === lr.id)) {
                    mergedRecurring.push(lr);
                }
            }

            const mergedHistory = [...(vault.history || [])];
            for (const lh of localHistory) {
                if (!mergedHistory.some(h => h.date === lh.date)) {
                    mergedHistory.push(lh);
                }
            }

            const mergedCashFlow = [...(vault.cashFlow || [])];
            for (const lcf of localCashFlow) {
                if (!mergedCashFlow.some(cf => cf.month === lcf.month || cf.id === lcf.id)) {
                    mergedCashFlow.push(lcf);
                }
            }

            const mergedSettings = {
                ...(localSettings || {}),
                ...(vault.settings || {})
            };
            const freedom = loadFreedomSettings();
            if (freedom && !mergedSettings.freedomSettings) {
                mergedSettings.freedomSettings = freedom;
            }
            const layout = loadDashboardLayout();
            if (layout && !mergedSettings.dashboardLayout) {
                mergedSettings.dashboardLayout = layout;
            }

            // 3. Commit the resolved inventory to SQLite
            const postRes = await fetch('/api/vault', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    assets: mergedAssets,
                    liabilities: mergedLiabs,
                    goals: mergedGoals,
                    recurring: mergedRecurring,
                    history: mergedHistory,
                    cashFlow: mergedCashFlow,
                    settings: mergedSettings
                })
            });

            // 4. Verify commit response before setting completion flag (Finding 2)
            if (!postRes.ok) {
                console.error('Migration POST commit failed with status:', postRes.status);
                localStorage.setItem('opennetworth_migration_error', `Migration failed to commit to SQLite: HTTP ${postRes.status}`);
                // DO NOT mark migration complete; keep source data preserved in browser storage
                return;
            }

            // Mark migration complete only after verified commit
            localStorage.setItem(MIGRATION_FLAG, 'true');
            localStorage.removeItem('opennetworth_migration_error');

            // Hydrate local cache with the authoritative merged data
            localStorage.setItem(STORAGE_KEYS.ASSETS, JSON.stringify(mergedAssets));
            localStorage.setItem(STORAGE_KEYS.LIABILITIES, JSON.stringify(mergedLiabs));
            localStorage.setItem(STORAGE_KEYS.GOALS, JSON.stringify(mergedGoals));
            localStorage.setItem(STORAGE_KEYS.RECURRING, JSON.stringify(mergedRecurring));
            localStorage.setItem(STORAGE_KEYS.NET_WORTH_HISTORY, JSON.stringify(mergedHistory));
            localStorage.setItem(STORAGE_KEYS.CASH_FLOW, JSON.stringify(mergedCashFlow));
            localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(mergedSettings));
            if (mergedSettings.freedomSettings) {
                localStorage.setItem(STORAGE_KEYS.FREEDOM_SETTINGS, JSON.stringify(mergedSettings.freedomSettings));
            }
            if (mergedSettings.dashboardLayout) {
                localStorage.setItem(STORAGE_KEYS_DASHBOARD, JSON.stringify(mergedSettings.dashboardLayout));
            }
            window.dispatchEvent(new Event('opennetworth_data_updated'));
        } else {
            // Post-migration: SQLite is authoritative.
            // Hydrate local cache directly from SQLite so deleted items never revive (Finding 4).
            if (vault.assets) localStorage.setItem(STORAGE_KEYS.ASSETS, JSON.stringify(vault.assets));
            if (vault.liabilities) localStorage.setItem(STORAGE_KEYS.LIABILITIES, JSON.stringify(vault.liabilities));
            if (vault.goals) localStorage.setItem(STORAGE_KEYS.GOALS, JSON.stringify(vault.goals));
            if (vault.recurring) localStorage.setItem(STORAGE_KEYS.RECURRING, JSON.stringify(vault.recurring));
            if (vault.history) localStorage.setItem(STORAGE_KEYS.NET_WORTH_HISTORY, JSON.stringify(vault.history));
            if (vault.cashFlow) localStorage.setItem(STORAGE_KEYS.CASH_FLOW, JSON.stringify(vault.cashFlow));
            if (vault.settings) {
                const s = vault.settings.userSettings || vault.settings;
                localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(s));
                if (vault.settings.freedomSettings) {
                    localStorage.setItem(STORAGE_KEYS.FREEDOM_SETTINGS, JSON.stringify(vault.settings.freedomSettings));
                }
                if (vault.settings.dashboardLayout) {
                    localStorage.setItem(STORAGE_KEYS_DASHBOARD, JSON.stringify(vault.settings.dashboardLayout));
                }
            }
            window.dispatchEvent(new Event('opennetworth_data_updated'));
        }
    } catch (e) {
        console.debug('Vault boot sync notice:', e);
    }
}

// Auto-trigger sync on browser boot
if (typeof window !== 'undefined') {
    setTimeout(() => {
        initVaultSync();
    }, 100);
}


export function resetDashboardLayout(): void {
    if (typeof window === 'undefined') return;
    localStorage.removeItem(STORAGE_KEYS_DASHBOARD);
}
