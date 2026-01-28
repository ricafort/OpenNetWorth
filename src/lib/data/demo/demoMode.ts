import { saveAssets, saveLiabilities, saveGoals, saveNetWorthHistory, clearAllData, saveRecurringTransactions, saveCashFlow } from '@/lib/data/storage';
import { GETTING_STARTED_DATA, STABILIZING_DATA, BUILDING_FOUNDATIONS_DATA, FAMILY_DATA, GROWING_WEALTH_DATA, DemoProfile } from './demoProfiles';
import widgetRegistry from '@/lib/registry/widgetRegistry';
import { NetWorthSnapshot, Asset, Liability, RecurringTransaction, CashFlowEntry, Goal, CurrencyCode } from '@/types';
import { SAMPLE_MENTORS, SAMPLE_QUOTES, SAMPLE_FREEDOM_SETTINGS, SAMPLE_PRICE_CACHE } from '@/lib/data/sampleData';
import { scaleAmount } from '@/lib/utils/currencyScale';
import { FullTemplateData } from '@/lib/domain/templateService';

const DEMO_MODE_KEY = 'clearworth_demo_mode'; // v2

export type ProfileType = 'getting_started' | 'stabilizing' | 'building' | 'family' | 'growing';

export function isDemoMode(): boolean {
    if (typeof window === 'undefined') return false;
    return localStorage.getItem(DEMO_MODE_KEY) === 'true';
}

function getProfileData(type: ProfileType): DemoProfile {
    switch (type) {
        case 'getting_started': return GETTING_STARTED_DATA;
        case 'stabilizing': return STABILIZING_DATA;
        case 'building': return BUILDING_FOUNDATIONS_DATA;
        case 'family': return FAMILY_DATA;
        case 'growing': return GROWING_WEALTH_DATA;
        default: return GETTING_STARTED_DATA;
    }
}

function getProfileLabel(type: ProfileType): string {
    switch (type) {
        case 'getting_started': return 'Getting Started';
        case 'stabilizing': return 'Stabilizing';
        case 'building': return 'Building Foundations';
        case 'family': return 'Working Family';
        case 'growing': return 'Growing Wealth';
        default: return 'Sample Data';
    }
}

function generateHistory(baseAssets: number, baseLiabilities: number, currency: string): NetWorthSnapshot[] {
    const history: NetWorthSnapshot[] = [];
    const today = new Date();

    let curAssets = baseAssets;
    let curLiabilities = baseLiabilities;

    // Generate 24 months back
    for (let i = 0; i < 24; i++) {
        const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
        const dateStr = d.toISOString().split('T')[0];

        // Reverse growth simulation
        // Previous month was likely smaller (so we divide by 1+growth)
        // Assets grew ~0.8% typically
        curAssets = curAssets / (1 + (0.005 + Math.random() * 0.005));

        // Liabilities were likely HIGHER (so we add payments)
        curLiabilities = curLiabilities + (scaleAmount(500, currency) + Math.random() * scaleAmount(200, currency));

        history.push({
            id: crypto.randomUUID(), // Ensure ID exists
            date: dateStr,
            totalAssets: Math.round(curAssets),
            totalLiabilities: Math.round(curLiabilities),
            netWorth: Math.round(curAssets - curLiabilities)
        });
    }
    return history.reverse(); // Return chronological
}

function generateCashFlow(profile: DemoProfile, currency: string): CashFlowEntry[] {
    const entries: CashFlowEntry[] = [];
    const today = new Date();

    // Calculate base monthly from recurring
    const baseIncome = profile.recurring
        .filter(r => r.type === 'income')
        .reduce((sum, r) => sum + r.amount, 0);

    const baseExpense = profile.recurring
        .filter(r => r.type === 'expense')
        .reduce((sum, r) => sum + r.amount, 0);

    // Generate 12 months
    for (let i = 0; i < 12; i++) {
        const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
        const monthStr = d.toISOString().slice(0, 7);

        // Add variety
        const income = Math.round(scaleAmount(baseIncome, currency) + (Math.random() * scaleAmount(200, currency) - scaleAmount(100, currency)));
        const expenses = Math.round(scaleAmount(baseExpense, currency) + (Math.random() * scaleAmount(400, currency) - scaleAmount(100, currency)));

        entries.push({ id: `cf-${i}`, month: monthStr, income, expenses });
    }
    return entries;
}

function generateCashFlowFromRecurring(recurring: RecurringTransaction[], currency: string): CashFlowEntry[] {
    const entries: CashFlowEntry[] = [];
    const today = new Date();

    const baseIncome = recurring
        .filter(r => r.type === 'income')
        .reduce((sum, r) => sum + r.amount, 0);

    const baseExpense = recurring
        .filter(r => r.type === 'expense')
        .reduce((sum, r) => sum + r.amount, 0);

    // Generate 12 months
    for (let i = 0; i < 12; i++) {
        const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
        const monthStr = d.toISOString().slice(0, 7);

        // Less variance for templates as they are specific
        const income = Math.round(baseIncome);
        const expenses = Math.round(baseExpense);

        entries.push({ id: `cf-${i}`, month: monthStr, income, expenses });
    }
    return entries;
}

export function enableDemoMode(profileType: ProfileType = 'getting_started', currency: string = 'USD'): void {
    if (typeof window === 'undefined') return;

    // Set flag
    localStorage.setItem(DEMO_MODE_KEY, 'true');
    localStorage.setItem('clearworth_initialized', 'true');

    const baseData = getProfileData(profileType);
    localStorage.setItem('clearworth_demo_profile_label', getProfileLabel(profileType));

    // Scale Logic Helper
    const scaleAsset = (a: Asset) => ({ ...a, value: scaleAmount(a.value, currency), currency: currency as any }); // Cast as any or CurrencyCode if imported
    const scaleLiability = (l: Liability) => ({ ...l, balance: scaleAmount(l.balance, currency), minimum_payment: l.minimum_payment ? scaleAmount(l.minimum_payment, currency) : 0, currency: currency as any });
    const scaleGoal = (g: Goal) => ({ ...g, targetAmount: scaleAmount(g.targetAmount, currency), currentAmount: scaleAmount(g.currentAmount, currency), startAmount: g.startAmount ? scaleAmount(g.startAmount, currency) : 0 });
    const scaleRecurring = (r: RecurringTransaction) => ({ ...r, amount: scaleAmount(r.amount, currency) });

    // 1. Scale Assets & Liabs
    const assets = baseData.assets.map(scaleAsset);
    const liabilities = baseData.liabilities.map(scaleLiability);
    const goals = baseData.goals.map(scaleGoal);
    const recurring = baseData.recurring.map(scaleRecurring);

    // 2. Generate History based on these new totals
    const totalAssets = assets.reduce((sum, a) => sum + a.value, 0);
    const totalLiabs = liabilities.reduce((sum, l) => sum + l.balance, 0);
    const history = generateHistory(totalAssets, totalLiabs, currency);
    const cashflow = generateCashFlow(baseData, currency); // Pass base data, function handles scaling inside

    // Save
    saveAssets(assets);
    saveLiabilities(liabilities);
    saveGoals(goals);
    saveNetWorthHistory(history);
    saveRecurringTransactions(recurring);
    saveCashFlow(cashflow);

    // Load Extras (Mentors, Quotes) - No scaling needed for text, but settings might need it
    localStorage.setItem('custom_mentors', JSON.stringify(SAMPLE_MENTORS));
    localStorage.setItem('saved_quotes', JSON.stringify(SAMPLE_QUOTES));

    // Scale Payment Setting
    const freedomSettings = { ...SAMPLE_FREEDOM_SETTINGS, extraMonthlyPayment: scaleAmount(SAMPLE_FREEDOM_SETTINGS.extraMonthlyPayment, currency) };
    localStorage.setItem('clearworth_freedom_settings', JSON.stringify(freedomSettings));

    localStorage.setItem('clearworth_price_cache', JSON.stringify(SAMPLE_PRICE_CACHE));

    // Initialize Last Check-In to NOW to prevent immediate popup
    const currentSettings = JSON.parse(localStorage.getItem('clearworth_settings') || '{}');
    const newSettings = {
        baseCurrency: 'USD',
        theme: 'system',
        checkInFrequency: 'monthly',
        ...currentSettings,
        lastCheckIn: new Date().toISOString()
    };
    localStorage.setItem('clearworth_settings', JSON.stringify(newSettings));

    // Force reload
    window.location.reload();
}

/**
 * Enables demo mode using data fetched from a Database Template.
 * Does NOT perform currency scaling (assumes template data is already in correct currency).
 */
export function enableDemoModeFromData(data: FullTemplateData): void {
    if (typeof window === 'undefined') return;

    // Set flag
    localStorage.setItem(DEMO_MODE_KEY, 'true');
    localStorage.setItem('clearworth_initialized', 'true');

    localStorage.setItem('clearworth_demo_profile_label', data.profile.full_name || 'Template');
    localStorage.setItem('clearworth_demo_origin_id', data.profile.id); // Save Origin ID for badges

    const currency = data.profile.currency_code;

    // 1. Data is already correct, just use it
    const assets = data.assets;
    const liabilities = data.liabilities;
    const goals = data.goals;
    const recurring = data.recurring;

    // 2. Generate History based on these totals
    const totalAssets = assets.reduce((sum, a) => sum + a.value, 0);
    const totalLiabs = liabilities.reduce((sum, l) => sum + l.balance, 0);
    const history = generateHistory(totalAssets, totalLiabs, currency);
    const cashflow = generateCashFlowFromRecurring(recurring, currency);

    // Save
    saveAssets(assets);
    saveLiabilities(liabilities);
    saveGoals(goals);
    saveNetWorthHistory(history);
    saveRecurringTransactions(recurring);
    saveCashFlow(cashflow);

    // Load Extras
    localStorage.setItem('custom_mentors', JSON.stringify(SAMPLE_MENTORS));
    localStorage.setItem('saved_quotes', JSON.stringify(SAMPLE_QUOTES));

    // Freedom Settings default (can be improved later to be smarter)
    const freedomSettings = { ...SAMPLE_FREEDOM_SETTINGS };
    localStorage.setItem('clearworth_freedom_settings', JSON.stringify(freedomSettings));
    localStorage.setItem('clearworth_price_cache', JSON.stringify(SAMPLE_PRICE_CACHE));

    // Settings
    const currentSettings = JSON.parse(localStorage.getItem('clearworth_settings') || '{}');
    const newSettings = {
        baseCurrency: currency,
        theme: 'system',
        checkInFrequency: 'monthly',
        ...currentSettings,
        lastCheckIn: new Date().toISOString()
    };
    localStorage.setItem('clearworth_settings', JSON.stringify(newSettings));

    // Force reload
    window.location.reload();
}

export function exitDemoMode(): void {
    if (typeof window === 'undefined') return;

    localStorage.removeItem(DEMO_MODE_KEY);
    localStorage.setItem('clearworth_initialized', 'true');
    // We do NOT clear data here usually, so user can "keep" it if they want? 
    // Actually standard behavior is usually wipe.
    clearAllData();

    window.location.reload();
}

export function resetApp(): void {
    if (typeof window === 'undefined') return;

    localStorage.removeItem(DEMO_MODE_KEY);
    localStorage.removeItem('clearworth_initialized');
    clearAllData();

    window.location.reload();
}

export function convertDemoToReal(keepHistory: boolean = false): void {
    if (typeof window === 'undefined') return;

    // 1. Remove the demo flag - this makes the data "real"
    localStorage.removeItem(DEMO_MODE_KEY);

    // 2. Ideally we clear the "fake" history so they start fresh tracking from today
    // BUT we keep the Assets/Liabilities/Goals as they are
    if (!keepHistory) {
        saveNetWorthHistory([]);
        saveCashFlow([]);
    }

    // 3. Reload to refresh the UI state (remove banner etc)
    window.location.reload();
}
