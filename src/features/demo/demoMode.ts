import { saveAssets, saveLiabilities, saveGoals, saveNetWorthHistory, clearAllData, saveRecurringTransactions, saveCashFlow } from '@/infrastructure/local_driver';
import { createClient } from '@/utils/supabase/client';
import { GETTING_STARTED_DATA, STABILIZING_DATA, BUILDING_FOUNDATIONS_DATA, FAMILY_DATA, GROWING_WEALTH_DATA, DemoProfile } from './demoProfiles';
import widgetRegistry from '@/lib/registry/widgetRegistry';
import { Asset } from '@/features/assets/types';
import { Liability } from '@/features/liabilities/types';
import { Goal } from '@/features/goals/types';
import { RecurringTransaction, CashFlowEntry } from '@/features/cashflow/types';
import { NetWorthSnapshot, CurrencyCode } from '@/types';
import { SAMPLE_MENTORS, SAMPLE_QUOTES, SAMPLE_FREEDOM_SETTINGS, SAMPLE_PRICE_CACHE } from '@/infrastructure/sampleData';
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

function generateHistory(baseAssets: number, baseLiabilities: number, currency: CurrencyCode): NetWorthSnapshot[] {
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

function generateCashFlow(profile: DemoProfile, currency: CurrencyCode): CashFlowEntry[] {
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

function generateCashFlowFromRecurring(recurring: RecurringTransaction[], currency: CurrencyCode): CashFlowEntry[] {
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

export function enableDemoMode(profileType: ProfileType = 'getting_started', currency: CurrencyCode = 'USD'): void {
    if (typeof window === 'undefined') return;

    // Set flag
    localStorage.setItem(DEMO_MODE_KEY, 'true');
    localStorage.setItem('clearworth_initialized', 'true');

    const baseData = getProfileData(profileType);
    localStorage.setItem('clearworth_demo_profile_label', getProfileLabel(profileType));

    // Scale Logic Helper
    const scaleAsset = (a: Asset) => ({ ...a, value: scaleAmount(a.value, currency), currency: currency });
    const scaleLiability = (l: Liability) => ({ ...l, balance: scaleAmount(l.balance, currency), minimum_payment: l.minimum_payment ? scaleAmount(l.minimum_payment, currency) : 0, currency: currency });
    const scaleGoal = (g: Goal) => ({ ...g, target_amount: scaleAmount(g.target_amount, currency), current_amount: scaleAmount(g.current_amount, currency), start_amount: g.start_amount ? scaleAmount(g.start_amount, currency) : 0 });
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

    // Override User ID to 'local_user' for all items to ensure they are editable in Guest Mode
    // 1. Assets
    const assets = data.assets.map(a => ({ ...a, user_id: 'local_user' }));

    // 2. Liabilities
    const liabilities = data.liabilities.map(l => ({ ...l, user_id: 'local_user' }));

    // 3. Goals
    const goals = data.goals.map(g => ({ ...g, user_id: 'local_user' }));

    // 4. Recurring Transactions
    const recurring = data.recurring.map(r => ({ ...r, user_id: 'local_user' }));

    // 5. Generate History based on these totals
    const totalAssets = assets.reduce((sum, a) => sum + a.value, 0);
    const totalLiabs = liabilities.reduce((sum, l) => sum + l.balance, 0);
    const history = generateHistory(totalAssets, totalLiabs, currency);
    const cashflow = generateCashFlowFromRecurring(recurring, currency); // This needs checking if it expects user_id

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

    // Freedom Settings default
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

    // Force logout (clear session) so ProfileContext falls back to LocalStorage
    createClient().auth.signOut().then(() => {
        // Force reload WITHOUT params to enter Guest Mode (Local Storage)
        window.location.href = '/';
    });
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

    // 1. Remove the demo flag - this makes the data "real" (Guest Mode)
    localStorage.removeItem(DEMO_MODE_KEY);

    // 2. Set a flag to indicate we want to migrate this data upon Login
    localStorage.setItem('clearworth_migration_requested', 'true');

    // 3. Keep History?
    if (!keepHistory) {
        // If we don't want history, we wipe it.
        saveNetWorthHistory([]);
        saveCashFlow([]);
    }

    // 4. Reload to local vault dashboard with saved demo data
    window.location.href = '/';
}

