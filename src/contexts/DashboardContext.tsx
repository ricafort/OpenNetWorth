'use client';

import { createContext, useContext, useEffect, useState, ReactNode, useCallback } from 'react';
import { Asset, Liability, Goal, NetWorthSnapshot, WealthMomentum, CurrencyCode, UserSettings, DashboardConfig } from '@/types';
import { loadAssets, loadLiabilities, loadGoals, loadNetWorthHistory, loadSettings, calculateWealthMomentum, loadDashboardLayout, saveDashboardLayout } from '@/lib/storage';
import { convertAmount } from '@/lib/currencyService';
import { getDefaultLayout } from '@/lib/widgetRegistry';

interface DashboardContextType {
    // Financial Data
    metrics: { assets: number; liabilities: number; netWorth: number };
    metricsUSD: { assets: number; liabilities: number; netWorth: number };
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
    // --- Financial State ---
    const [assets, setAssets] = useState<Asset[]>([]);
    const [liabilities, setLiabilities] = useState<Liability[]>([]);
    const [goals, setGoals] = useState<Goal[]>([]);
    const [netWorthHistory, setNetWorthHistory] = useState<NetWorthSnapshot[]>([]);
    const [baseCurrency, setBaseCurrency] = useState<CurrencyCode>('USD');
    const [momentum, setMomentum] = useState<WealthMomentum | null>(null);
    const [metrics, setMetrics] = useState({ assets: 0, liabilities: 0, netWorth: 0 });
    const [metricsUSD, setMetricsUSD] = useState({ assets: 0, liabilities: 0, netWorth: 0 });

    const loadData = useCallback(() => {
        // Settings
        const settings = loadSettings();
        setBaseCurrency(settings.baseCurrency);

        // Assets & Liabilities & Goals
        const loadedAssets = loadAssets();
        const loadedLiabilities = loadLiabilities();
        const loadedGoals = loadGoals();

        setAssets(loadedAssets);
        setLiabilities(loadedLiabilities);
        setGoals(loadedGoals);

        // Calculate Totals (USD)
        const totalAssetsUSD = loadedAssets.reduce((sum, a) => {
            return sum + convertAmount(a.value, a.currency || 'USD', 'USD');
        }, 0);

        const totalLiabilitiesUSD = loadedLiabilities.reduce((sum, l) => {
            return sum + convertAmount(l.balance, l.currency || 'USD', 'USD');
        }, 0);

        const netWorthUSD = totalAssetsUSD - totalLiabilitiesUSD;
        setMetricsUSD({ assets: totalAssetsUSD, liabilities: totalLiabilitiesUSD, netWorth: netWorthUSD });

        // Calculate Totals (Base Currency)
        const totalAssetsBase = convertAmount(totalAssetsUSD, 'USD', settings.baseCurrency);
        const totalLiabilitiesBase = convertAmount(totalLiabilitiesUSD, 'USD', settings.baseCurrency);
        setMetrics({
            assets: totalAssetsBase,
            liabilities: totalLiabilitiesBase,
            netWorth: totalAssetsBase - totalLiabilitiesBase
        });

        // History
        setNetWorthHistory(loadNetWorthHistory());

        // Momentum
        setMomentum(calculateWealthMomentum());
    }, []);

    useEffect(() => {
        loadData();

        // Listen for data updates across the app (storage.ts dispatches this)
        const handleDataUpdate = () => {
            loadData();
        };

        window.addEventListener('clearworth_data_updated', handleDataUpdate);
        return () => window.removeEventListener('clearworth_data_updated', handleDataUpdate);
    }, [loadData]);


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
            assets, liabilities, goals, metrics, metricsUSD, netWorthHistory, momentum, baseCurrency,
            refreshAttributes: loadData,
            refreshHistory: () => setNetWorthHistory(loadNetWorthHistory()),
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
