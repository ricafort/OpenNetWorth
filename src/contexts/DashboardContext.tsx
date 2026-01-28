'use client';

import { createContext, useContext, useEffect, useState, ReactNode, useCallback } from 'react';
import { Asset, Liability, Goal, NetWorthSnapshot, WealthMomentum, CurrencyCode, UserSettings, DashboardConfig, RecurringTransaction } from '@/types';
import { loadSettings, loadDashboardLayout, saveDashboardLayout, toMonthlyAmount } from '@/lib/data/storage';
import { convertAmount } from '@/lib/utils/currencyService';
import { getDefaultLayout } from '@/lib/registry/widgetRegistry';
import { useProfile } from '@/contexts/ProfileContext';
import { useAssets, useLiabilities, useGoals, useRecurring, useHistory } from '@/hooks';

interface DashboardContextType {
    // Financial Data
    metrics: { assets: number; liabilities: number; netWorth: number };
    metricsUSD: { assets: number; liabilities: number; netWorth: number };
    netWorth: number; // Expose strictly
    assets: Asset[];
    liabilities: Liability[];
    goals: Goal[];
    netWorthHistory: NetWorthSnapshot[];
    momentum: WealthMomentum | null;
    baseCurrency: CurrencyCode;
    refreshAttributes: () => void;
    refreshHistory: () => void;

    // Layout State
    isEditMode: boolean;
    setIsEditMode: (v: boolean) => void;
    layout: DashboardConfig;
    updateLayout: (layout: DashboardConfig) => void;
    hideWidget: (id: string) => void;
    showWidget: (id: string) => void;
    resetLayout: () => void;

    // UI Triggers
    openSettings: () => void;
    closeSettings: () => void;
    isSettingsOpen: boolean;
}

const DashboardContext = createContext<DashboardContextType | undefined>(undefined);

export function DashboardProvider({ children }: { children: ReactNode }) {
    // --- Financial State (Sourced from ProfileContext) ---
    // --- Financial State (Sourced from Domain Hooks) ---
    const { profile, isDemoMode } = useProfile();
    const { assets, refreshAssets } = useAssets();
    const { liabilities, refreshLiabilities } = useLiabilities();
    const { goals, refreshGoals } = useGoals();
    const { recurring, refreshRecurring } = useRecurring();
    const { history, refreshHistory } = useHistory();

    const [baseCurrency, setBaseCurrency] = useState<CurrencyCode>('USD');
    const [momentum, setMomentum] = useState<WealthMomentum | null>(null);
    const [metrics, setMetrics] = useState({ assets: 0, liabilities: 0, netWorth: 0 });
    const [metricsUSD, setMetricsUSD] = useState({ assets: 0, liabilities: 0, netWorth: 0 });

    const loadData = useCallback(() => {
        // Settings / Currency Logic
        // 1. If in Demo Mode (or profile has a preference), use that currency.
        // 2. Otherwise fall back to local device settings.
        let targetCurrency: CurrencyCode = 'USD';

        if (profile?.currency_code) {
            // We trust the profile currency if it exists (Template or User preference)
            targetCurrency = profile.currency_code as CurrencyCode;
        } else {
            const settings = loadSettings();
            targetCurrency = settings.baseCurrency;
        }

        setBaseCurrency(targetCurrency);

        // Calculate Totals (USD)
        const totalAssetsUSD = assets.reduce((sum: number, a: Asset) => {
            return sum + convertAmount(a.value, a.currency || 'USD', 'USD');
        }, 0);

        const totalLiabilitiesUSD = liabilities.reduce((sum: number, l: Liability) => {
            const converted = convertAmount(l.balance, l.currency || 'USD', 'USD');
            return sum + converted;
        }, 0);

        const netWorthUSD = totalAssetsUSD - totalLiabilitiesUSD;
        setMetricsUSD({ assets: totalAssetsUSD, liabilities: totalLiabilitiesUSD, netWorth: netWorthUSD });

        // Calculate Totals (Base Currency)
        const totalAssetsBase = convertAmount(totalAssetsUSD, 'USD', targetCurrency);
        const totalLiabilitiesBase = convertAmount(totalLiabilitiesUSD, 'USD', targetCurrency);

        setMetrics({
            assets: totalAssetsBase,
            liabilities: totalLiabilitiesBase,
            netWorth: totalAssetsBase - totalLiabilitiesBase
        });

        // Momentum Calculation (Live & Currency Aware)
        // We calculate this HERE instead of storage.ts to use the Supabase data
        const activeRecurring = recurring.filter(t => t.isActive);

        const monthlyIncome = activeRecurring
            .filter(t => t.type === 'income')
            .reduce((sum: number, t: RecurringTransaction) => {
                const monthly = toMonthlyAmount(t.amount, t.frequency);
                return sum + convertAmount(monthly, t.currency || 'USD', targetCurrency);
            }, 0);

        const monthlyExpenses = activeRecurring
            .filter(t => t.type === 'expense')
            .reduce((sum: number, t: RecurringTransaction) => {
                const monthly = toMonthlyAmount(t.amount, t.frequency);
                return sum + convertAmount(monthly, t.currency || 'USD', targetCurrency);
            }, 0);

        const monthlySavings = monthlyIncome - monthlyExpenses;
        const savingsRate = monthlyIncome > 0 ? (monthlySavings / monthlyIncome) * 100 : 0;

        let score = savingsRate;
        if (savingsRate > 50) score += 10;
        else if (savingsRate > 30) score += 5;
        else if (savingsRate > 20) score += 5;
        if (savingsRate < 0) score -= 10;
        score = Math.max(0, Math.min(100, score));

        setMomentum({
            score: Math.round(score),
            monthlyRecurringIncome: monthlyIncome,
            monthlyRecurringExpenses: monthlyExpenses,
            monthlySavings,
            savingsRate,
            annualProjectedSavings: monthlySavings * 12
        });

    }, [assets, liabilities, goals, profile, recurring]); // Added recurring dependency

    useEffect(() => {
        loadData();
    }, [loadData]);
    // We removed the event listener because ProfileContext should trigger re-renders when its data changes.
    // However, if we write to LocalStorage directly bypassing ProfileContext (which we shouldn't), we might miss updates.
    // ProfileContext handles writes now.



    // --- Layout State ---
    const [isEditMode, setIsEditMode] = useState(false);
    const [layout, setLayout] = useState<DashboardConfig>(getDefaultLayout());

    useEffect(() => {
        const saved = loadDashboardLayout();
        if (saved) {
            setLayout(saved);
        }
    }, []);

    const updateLayout = (newLayout: DashboardConfig) => {
        setLayout(prev => {
            const updated = typeof newLayout === 'function' ? (newLayout as any)(prev) : newLayout;
            saveDashboardLayout(updated);
            return updated;
        });
    };

    const hideWidget = (id: string) => {
        const newLayout = {
            ...layout,
            hiddenWidgets: [...layout.hiddenWidgets, id]
        };
        updateLayout(newLayout);
    };

    const showWidget = (id: string) => {
        const newLayout = {
            ...layout,
            hiddenWidgets: layout.hiddenWidgets.filter(wId => wId !== id)
        };
        updateLayout(newLayout);
    };

    const resetLayout = () => {
        const def = getDefaultLayout();
        updateLayout(def);
        // Force reload from registry just in case
        window.location.reload();
    };

    // --- Settings Modal State ---
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);
    const openSettings = () => setIsSettingsOpen(true);
    const closeSettings = () => setIsSettingsOpen(false);


    return (
        <DashboardContext.Provider value={{
            assets, liabilities, goals, metrics, metricsUSD, netWorthHistory: history, momentum, baseCurrency,
            netWorth: metrics.netWorth, // Pass top-level
            refreshAttributes: loadData, // Recalculates metrics (hooks handle data refresh automatically)
            refreshHistory, // Expose specific refresher if needed
            isEditMode, setIsEditMode, layout, updateLayout, hideWidget, showWidget, resetLayout,
            openSettings, closeSettings, isSettingsOpen
        }}>
            {children}
        </DashboardContext.Provider>
    );
}

export const useDashboard = () => {
    const context = useContext(DashboardContext);
    if (!context) throw new Error('useDashboard must be used within DashboardProvider');
    return context;
};
