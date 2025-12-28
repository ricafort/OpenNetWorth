import { saveAssets, saveLiabilities, saveGoals, saveNetWorthHistory, clearAllData, saveRecurringTransactions, saveCashFlow } from '@/lib/storage';
import { SAMPLE_ASSETS, SAMPLE_LIABILITIES, SAMPLE_GOALS, SAMPLE_NET_WORTH_HISTORY, SAMPLE_RECURRING, SAMPLE_CASHFLOW, SAMPLE_MENTORS, SAMPLE_QUOTES, SAMPLE_FREEDOM_SETTINGS, SAMPLE_PRICE_CACHE } from '@/lib/sampleData';

const DEMO_MODE_KEY = 'clearworth_demo_mode';

export function isDemoMode(): boolean {
    if (typeof window === 'undefined') return false;
    return localStorage.getItem(DEMO_MODE_KEY) === 'true';
}

export function enableDemoMode(): void {
    if (typeof window === 'undefined') return;

    // Set flag
    localStorage.setItem(DEMO_MODE_KEY, 'true');
    localStorage.setItem('clearworth_initialized', 'true'); // Also mark as initialized so we don't see welcome screen again

    // Load rich sample data
    saveAssets(SAMPLE_ASSETS);
    saveLiabilities(SAMPLE_LIABILITIES);
    saveGoals(SAMPLE_GOALS);
    saveNetWorthHistory(SAMPLE_NET_WORTH_HISTORY);
    saveRecurringTransactions(SAMPLE_RECURRING);
    saveCashFlow(SAMPLE_CASHFLOW);

    // Load Extras
    localStorage.setItem('custom_mentors', JSON.stringify(SAMPLE_MENTORS));
    localStorage.setItem('saved_quotes', JSON.stringify(SAMPLE_QUOTES));
    localStorage.setItem('clearworth_freedom_settings', JSON.stringify(SAMPLE_FREEDOM_SETTINGS));
    localStorage.setItem('clearworth_price_cache', JSON.stringify(SAMPLE_PRICE_CACHE));

    // Force reload to refresh context
    window.location.reload();
}

export function exitDemoMode(): void {
    if (typeof window === 'undefined') return;

    localStorage.removeItem(DEMO_MODE_KEY);
    // keeping initialized true
    clearAllData();
    // Re-mark initialized because clearAllData might wipe it? 
    // clearAllData wipes everything. So we should re-mark initialized if we want them to land on empty dashboard not welcome screen?
    // Actually, if they exit demo, they might want to start fresh which IS the empty dashboard.
    // But if we wipe 'clearworth_initialized', they might see Welcome Screen again?
    // Let's check WelcomeScreen logic. It usually shows if NOT initialized.
    // If they exit demo, they probably want to see "Start connection" or "Manual entry" options, aka Welcome Screen?
    // Or maybe just empty dashboard.
    // Let's decide: Exit Demo -> Empty Dashboard.
    localStorage.setItem('clearworth_initialized', 'true');

    window.location.reload();
}

export function resetApp(): void {
    if (typeof window === 'undefined') return;

    localStorage.removeItem(DEMO_MODE_KEY);
    localStorage.removeItem('clearworth_initialized');
    clearAllData();

    window.location.reload();
}
