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
export async function persistScopedRecord<T extends { id: string }>(
    entity: SupportedEntity,
    item: T
): Promise<T> {
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
    }

    // Update local cache for fast synchronous access
    if (entity === 'assets') {
        const items = loadAssets();
        const idx = items.findIndex(i => i.id === item.id);
        if (idx !== -1) items[idx] = item as any;
        else items.push(item as any);
        set(STORAGE_KEYS.ASSETS, items);
    } else if (entity === 'liabilities') {
        const items = loadLiabilities();
        const idx = items.findIndex(i => i.id === item.id);
        if (idx !== -1) items[idx] = item as any;
        else items.push(item as any);
        set(STORAGE_KEYS.LIABILITIES, items);
    } else if (entity === 'goals') {
        const items = loadGoals();
        const idx = items.findIndex(i => i.id === item.id);
        if (idx !== -1) items[idx] = item as any;
        else items.push(item as any);
        set(STORAGE_KEYS.GOALS, items);
    } else if (entity === 'recurring') {
        const items = loadRecurringTransactions();
        const idx = items.findIndex(i => i.id === item.id);
        if (idx !== -1) items[idx] = item as any;
        else items.push(item as any);
        set(STORAGE_KEYS.RECURRING, items);
    } else if (entity === 'cashFlow') {
        const items = loadCashFlow();
        const idx = items.findIndex(i => i.id === item.id);
        if (idx !== -1) items[idx] = item as any;
        else items.push(item as any);
        set(STORAGE_KEYS.CASH_FLOW, items);
    }

    return item;
}

/**
 * Deletes an individual record durably from SQLite with scoped operation (DATA-04, DATA-05).
 * Updates local cache and throws if deletion fails.
 */
export async function deleteScopedRecord(
    entity: 'assets' | 'liabilities' | 'goals' | 'recurring' | 'cashFlow',
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
        set(STORAGE_KEYS.CASH_FLOW, loadCashFlow().filter(i => i.id !== id));
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
    }
    if (!item) return null;
    try {
        return parse ? JSON.parse(item) : (item as unknown as T);
    } catch (e) {
        console.error(`Error parsing storage key ${key}:`, e);
        return null;
    }
}

// Background synchronization with local SQLite engine
let syncDebounceTimer: any = null;
const pendingSyncData: Record<string, any> = {};

function syncToSqlite(key: string, value: any) {
    if (typeof window === 'undefined') return;

    // Map storage keys to SQLite vault entity names
    const entityMap: Record<string, string> = {
        [STORAGE_KEYS.ASSETS]: 'assets',
        [STORAGE_KEYS.LIABILITIES]: 'liabilities',
        [STORAGE_KEYS.NET_WORTH_HISTORY]: 'history',
        [STORAGE_KEYS.GOALS]: 'goals',
        [STORAGE_KEYS.CASH_FLOW]: 'cashFlow',
        [STORAGE_KEYS.SETTINGS]: 'settings',
        'opennetworth_recurring': 'recurring',
        'opennetworth_recurring_txs': 'recurring'
    };

    const entityName = entityMap[key];
    if (!entityName) return;

    pendingSyncData[entityName] = value;

    if (syncDebounceTimer) clearTimeout(syncDebounceTimer);
    syncDebounceTimer = setTimeout(async () => {
        try {
            const payload = { ...pendingSyncData };
            await fetch('/api/vault', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
        } catch (e) {
            // Silently swallow in offline or serverless contexts
            console.debug('SQLite auto-sync notification:', e);
        }
    }, 500);
}

function set<T>(key: string, value: T) {
    if (typeof window === 'undefined') return;
    const str = JSON.stringify(value);
    localStorage.setItem(key, str);

    // Keep legacy key in sync during transition
    if (key.startsWith('opennetworth_')) {
        const legacyKey = key.replace('opennetworth_', 'clearworth_');
        localStorage.setItem(legacyKey, str);
    }

    // Persist to local SQLite embedded database
    syncToSqlite(key, value);

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

export function saveSettings(settings: UserSettings): void {
    set(STORAGE_KEYS.SETTINGS, settings);
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

export function saveNetWorthHistory(history: NetWorthSnapshot[]): void {
    // Basic hygiene: limit to one entry per day (keep latest)
    // AND ensure we capture full state for the "monthly" snapshot
    // If the provided history update relies on implicit accumulation, we need to be careful.
    // However, usually we append a new snapshot.

    // Let's ensure the LATEST snapshot has full state if it's the first one of the month OR if it's explicitly requested.
    // For this MVP, we will try to attach current assets/liabilities to the latest snapshot if they are missing
    // AND it's a significant update.

    // Actually, simpler approach for "Time Machine":
    // When saving a NEW snapshot (which usually happens in this function calling flow),
    // we should check if we should attach the detailed data.

    // We'll trust the caller to attach data if needed, OR we fetch it here?
    // defineAssets/Liabilities are not passed here.
    // Better strategy: The caller (Dashboard) has the state, it should construct the snapshot with data.
    // This function just saves what it gets.
    set(STORAGE_KEYS.NET_WORTH_HISTORY, history);
}

export function saveFullSnapshot(snapshot: NetWorthSnapshot): void {
    const history = loadNetWorthHistory();
    // Remove existing entry for same date if exists
    const filtered = history.filter(h => h.date !== snapshot.date);
    const updated = [...filtered, snapshot].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    set(STORAGE_KEYS.NET_WORTH_HISTORY, updated);
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
    }

    // Individual data integrity validation
    for (const [idx, item] of assets.entries()) {
        if (!item || !item.id || typeof item.id !== 'string') {
            return { valid: false, error: `Asset at index ${idx} is missing a valid id` };
        }
        if (typeof item.name !== 'string') {
            return { valid: false, error: `Asset "${item.id}" has an invalid name` };
        }
        if (typeof item.value !== 'number' || isNaN(item.value)) {
            return { valid: false, error: `Asset "${item.name || item.id}" has a non-numeric value` };
        }
    }

    for (const [idx, item] of liabilities.entries()) {
        if (!item || !item.id || typeof item.id !== 'string') {
            return { valid: false, error: `Liability at index ${idx} is missing a valid id` };
        }
        if (typeof item.name !== 'string') {
            return { valid: false, error: `Liability "${item.id}" has an invalid name` };
        }
        if (typeof item.balance !== 'number' || isNaN(item.balance)) {
            return { valid: false, error: `Liability "${item.name || item.id}" has a non-numeric balance` };
        }
    }

    for (const [idx, item] of goals.entries()) {
        if (!item || !item.id || typeof item.id !== 'string') {
            return { valid: false, error: `Goal at index ${idx} is missing a valid id` };
        }
        if (typeof item.name !== 'string') {
            return { valid: false, error: `Goal "${item.id}" has an invalid name` };
        }
        if (typeof item.target_amount !== 'number' || isNaN(item.target_amount)) {
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
        if (typeof item.amount !== 'number' || isNaN(item.amount)) {
            return { valid: false, error: `Recurring item "${item.name || item.id}" has a non-numeric amount` };
        }
    }

    for (const [idx, item] of history.entries()) {
        const netWorth = item.netWorth ?? item.net_worth;
        if (typeof netWorth !== 'number' || isNaN(netWorth)) {
            return { valid: false, error: `History record at index ${idx} has a non-numeric net worth` };
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
    const settings = get<Record<string, any>>(STORAGE_KEYS.SETTINGS) || {};

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

export async function importData(jsonString: string): Promise<{ success: boolean; error?: string }> {
    try {
        let parsed: any;
        try {
            parsed = JSON.parse(jsonString);
        } catch {
            return { success: false, error: 'File contains invalid JSON syntax' };
        }

        // Pre-restore validation (TRUST-11)
        const validation = validateBackup(parsed);
        if (!validation.valid) {
            return { success: false, error: validation.error };
        }

        const vault = parsed.vault;

        // Apply to local cache
        saveAssets(vault.assets);
        saveLiabilities(vault.liabilities);
        saveGoals(vault.goals);
        saveRecurringTransactions(vault.recurring);
        saveNetWorthHistory(vault.history);
        saveCashFlow(vault.cashFlow);
        if (vault.settings) {
            set(STORAGE_KEYS.SETTINGS, vault.settings);
        }

        // Apply durably to SQLite
        if (typeof window !== 'undefined') {
            await fetch('/api/vault', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    assets: vault.assets,
                    liabilities: vault.liabilities,
                    goals: vault.goals,
                    recurring: vault.recurring,
                    history: vault.history,
                    cashFlow: vault.cashFlow,
                    settings: vault.settings
                })
            });
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

export function saveFreedomSettings(settings: { strategy: PayoffStrategy; extraMonthlyPayment: number }): void {
    set(STORAGE_KEYS.FREEDOM_SETTINGS, settings);
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

export function updateDebtRecurringTransaction(amount: number): void {
    const DEBT_TRX_ID = 'debt-freedom-accelerator';
    const transactions = loadRecurringTransactions();
    const existingIndex = transactions.findIndex(t => t.id === DEBT_TRX_ID);

    if (amount <= 0) {
        // If amount is 0, remove the transaction or set to inactive?
        // Let's set to inactive to preserve the "idea" of it, or remove it.
        // User might want to see it but 0.
        // Let's just remove it to keep list clean, or update to 0 and inactive.
        if (existingIndex >= 0) {
            transactions[existingIndex].amount = 0;
            transactions[existingIndex].is_active = false;
            saveRecurringTransactions(transactions);
        }
        return;
    }

    const newTrx: RecurringTransaction = {
        id: DEBT_TRX_ID,
        name: 'Debt Freedom Accelerator',
        amount: amount,
        type: 'expense',
        frequency: 'monthly',
        category: 'Debt Repayment',
        start_date: new Date().toISOString(),
        is_active: true
    };

    if (existingIndex >= 0) {
        // Update existing
        transactions[existingIndex] = { ...transactions[existingIndex], amount, is_active: true };
    } else {
        // Add new
        transactions.push(newTrx);
    }
    saveRecurringTransactions(transactions);
}

export async function clearAllData(): Promise<void> {
    if (typeof window === 'undefined') return;
    localStorage.clear();
    try {
        await fetch('/api/vault', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'clear_vault' })
        });
    } catch (e) {
        console.error('Failed to clear SQLite vault:', e);
    }
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

export function saveDashboardLayout(config: DashboardConfig): void {
    set(STORAGE_KEYS_DASHBOARD, config);
}

/**
 * Synchronizes client state with local SQLite database on boot.
 * - Inspects all 7 supported record types (DATA-08).
 * - Vaults containing only goals or recurring transactions are preserved.
 * - Idempotent reconciliation produces 0 changes when already reconciled (DATA-09).
 */
export async function initVaultSync(): Promise<void> {
    if (typeof window === 'undefined') return;

    try {
        const res = await fetch('/api/vault');
        if (!res.ok) return;
        const json = await res.json();
        const vault = json.vault;

        if (!vault) return;

        const localAssets = loadAssets();
        const localLiabs = loadLiabilities();
        const localGoals = loadGoals();
        const localRecurring = loadRecurringTransactions();
        const localHistory = loadNetWorthHistory();
        const localCashFlow = loadCashFlow();
        const localSettings = get<Record<string, any>>(STORAGE_KEYS.SETTINGS) || {};

        // Inspect ALL 7 supported record types (DATA-08)
        const sqliteHasData =
            (Array.isArray(vault.assets) && vault.assets.length > 0) ||
            (Array.isArray(vault.liabilities) && vault.liabilities.length > 0) ||
            (Array.isArray(vault.goals) && vault.goals.length > 0) ||
            (Array.isArray(vault.recurring) && vault.recurring.length > 0) ||
            (Array.isArray(vault.history) && vault.history.length > 0) ||
            (Array.isArray(vault.cashFlow) && vault.cashFlow.length > 0) ||
            (vault.settings && Object.keys(vault.settings).length > 0);

        const clientHasData =
            localAssets.length > 0 ||
            localLiabs.length > 0 ||
            localGoals.length > 0 ||
            localRecurring.length > 0 ||
            localHistory.length > 0 ||
            localCashFlow.length > 0 ||
            Object.keys(localSettings).length > 0;

        if (sqliteHasData && !clientHasData) {
            // Restore from SQLite into localStorage
            if (vault.assets) localStorage.setItem(STORAGE_KEYS.ASSETS, JSON.stringify(vault.assets));
            if (vault.liabilities) localStorage.setItem(STORAGE_KEYS.LIABILITIES, JSON.stringify(vault.liabilities));
            if (vault.goals) localStorage.setItem(STORAGE_KEYS.GOALS, JSON.stringify(vault.goals));
            if (vault.recurring) localStorage.setItem(STORAGE_KEYS.RECURRING, JSON.stringify(vault.recurring));
            if (vault.history) localStorage.setItem(STORAGE_KEYS.NET_WORTH_HISTORY, JSON.stringify(vault.history));
            if (vault.cashFlow) localStorage.setItem(STORAGE_KEYS.CASH_FLOW, JSON.stringify(vault.cashFlow));
            if (vault.settings) localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(vault.settings));
            window.dispatchEvent(new Event('opennetworth_data_updated'));
        } else if (!sqliteHasData && clientHasData) {
            // Initial seed of existing client data to SQLite
            await fetch('/api/vault', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    assets: localAssets,
                    liabilities: localLiabs,
                    goals: localGoals,
                    recurring: localRecurring,
                    history: localHistory,
                    cashFlow: localCashFlow,
                    settings: localSettings
                })
            });
        } else if (sqliteHasData && clientHasData) {
            // Idempotent reconciliation (DATA-09):
            // Reconciling an already-reconciled database produces zero changes and zero duplicate records.
            const reconcile = <T extends { id: string }>(sqliteList: T[] = [], localList: T[] = []): T[] => {
                const map = new Map<string, T>();
                for (const item of sqliteList) {
                    map.set(item.id, item);
                }
                for (const item of localList) {
                    if (!map.has(item.id)) {
                        map.set(item.id, item);
                    }
                }
                return Array.from(map.values());
            };

            const reconciledAssets = reconcile(vault.assets, localAssets);
            const reconciledLiabs = reconcile(vault.liabilities, localLiabs);
            const reconciledGoals = reconcile(vault.goals, localGoals);
            const reconciledRecurring = reconcile(vault.recurring, localRecurring);
            const reconciledCashFlow = reconcile(vault.cashFlow, localCashFlow);

            localStorage.setItem(STORAGE_KEYS.ASSETS, JSON.stringify(reconciledAssets));
            localStorage.setItem(STORAGE_KEYS.LIABILITIES, JSON.stringify(reconciledLiabs));
            localStorage.setItem(STORAGE_KEYS.GOALS, JSON.stringify(reconciledGoals));
            localStorage.setItem(STORAGE_KEYS.RECURRING, JSON.stringify(reconciledRecurring));
            localStorage.setItem(STORAGE_KEYS.CASH_FLOW, JSON.stringify(reconciledCashFlow));
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
