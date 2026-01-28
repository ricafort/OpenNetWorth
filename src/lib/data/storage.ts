import { Asset, Liability, NetWorthSnapshot, Goal, CashFlowEntry, RecurringTransaction, WealthMomentum, UserSettings, DashboardConfig, PayoffStrategy } from '@/types';
import { SAMPLE_ASSETS, SAMPLE_LIABILITIES, SAMPLE_GOALS } from './sampleData';

// Key constants
const STORAGE_KEYS = {
    ASSETS: 'clearworth_assets',
    LIABILITIES: 'clearworth_liabilities',
    NET_WORTH_HISTORY: 'clearworth_nw_history',
    GOALS: 'clearworth_goals',
    CASH_FLOW: 'clearworth_cash_flow',
    SETTINGS: 'clearworth_settings',
    FREEDOM_SETTINGS: 'clearworth_freedom_settings'
};

// Generic helper
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

function set(key: string, value: any) {
    if (typeof window === 'undefined') return;
    localStorage.setItem(key, JSON.stringify(value));

    // Dispatch custom event for reactive UI updates
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

// Data Management
export function exportAllData(): string {
    const data = {
        assets: loadAssets(),
        liabilities: loadLiabilities(),
        netWorthHistory: loadNetWorthHistory(),
        goals: loadGoals(),
        cashFlow: loadCashFlow(),
        settings: get(STORAGE_KEYS.SETTINGS) || {},
        customMentors: get('custom_mentors') || [],
        savedQuotes: get('saved_quotes') || [],
        exportDate: new Date().toISOString()
    };
    return JSON.stringify(data, null, 2);
}

export function importData(jsonString: string): boolean {
    try {
        const data = JSON.parse(jsonString);

        // Basic validation
        if (!data.exportDate) {
            throw new Error('Invalid export file');
        }

        if (data.assets) saveAssets(data.assets);
        if (data.liabilities) saveLiabilities(data.liabilities);
        if (data.netWorthHistory) saveNetWorthHistory(data.netWorthHistory);
        if (data.goals) saveGoals(data.goals);
        if (data.cashFlow) saveCashFlow(data.cashFlow);
        if (data.settings) set(STORAGE_KEYS.SETTINGS, data.settings);
        if (data.customMentors) set('custom_mentors', data.customMentors);
        if (data.savedQuotes) set('saved_quotes', data.savedQuotes);

        return true;
    } catch (e) {
        console.error('Import failed:', e);
        return false;
    }
}

// Freedom Settings
export function loadFreedomSettings(): { strategy: PayoffStrategy; extraMonthlyPayment: number } {
    const defaults = {
        strategy: 'avalanche' as PayoffStrategy,
        extraMonthlyPayment: 500
    };
    const saved = get<any>(STORAGE_KEYS.FREEDOM_SETTINGS);
    return { ...defaults, ...saved };
}

export function saveFreedomSettings(settings: { strategy: PayoffStrategy; extraMonthlyPayment: number }): void {
    set(STORAGE_KEYS.FREEDOM_SETTINGS, settings);
}

// Recurring Transactions
export function loadRecurringTransactions(): RecurringTransaction[] {
    return get<RecurringTransaction[]>('clearworth_recurring') || [];
}

export function saveRecurringTransactions(transactions: RecurringTransaction[]): void {
    set('clearworth_recurring', transactions);
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
    const transactions = loadRecurringTransactions().filter(t => t.isActive);

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
    const recurring = loadRecurringTransactions().filter(t => t.isActive);
    if (recurring.length === 0) return false;

    const cashFlowEntries = loadCashFlow();
    const existingEntry = cashFlowEntries.find((e: any) => e.month === month);

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
            transactions[existingIndex].isActive = false;
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
        startDate: new Date().toISOString(),
        isActive: true
    };

    if (existingIndex >= 0) {
        // Update existing
        transactions[existingIndex] = { ...transactions[existingIndex], amount, isActive: true };
    } else {
        // Add new
        transactions.push(newTrx);
    }
    saveRecurringTransactions(transactions);
}

export function clearAllData(): void {
    if (typeof window === 'undefined') return;
    localStorage.clear();
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

    saveAssets(SAMPLE_ASSETS);
    saveLiabilities(SAMPLE_LIABILITIES);
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

export function resetDashboardLayout(): void {
    if (typeof window === 'undefined') return;
    localStorage.removeItem(STORAGE_KEYS_DASHBOARD);
}
