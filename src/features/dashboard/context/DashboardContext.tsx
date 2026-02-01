'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { DashboardConfig } from '@/types';
import { loadDashboardLayout, saveDashboardLayout } from '@/infrastructure/local_driver';
import { getDefaultLayout } from '@/lib/registry/widgetRegistry';

interface DashboardContextType {
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
    // --- Layout State ---
    const [isEditMode, setIsEditMode] = useState(false);
    const [layout, setLayout] = useState<DashboardConfig>(getDefaultLayout());

    useEffect(() => {
        // Ensure consistent hydration - only load from storage on client mount
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
