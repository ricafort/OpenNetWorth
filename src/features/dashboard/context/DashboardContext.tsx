'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { DashboardConfig } from '@/types';
import { loadDashboardLayout, loadDashboardLayoutFromVault, saveDashboardLayout } from '@/infrastructure/local_driver';
import { getDefaultLayout } from '@/lib/registry/widgetRegistry';
import { useProfile } from '@/contexts/ProfileContext';

interface DashboardContextType {
    // Layout State
    isEditMode: boolean;
    setIsEditMode: (v: boolean) => void;
    layout: DashboardConfig;
    updateLayout: (layout: DashboardConfig) => void;
    hideWidget: (id: string) => void;
    showWidget: (id: string) => void;
    toggleWidgetCollapsed: (id: string) => void;
    resetLayout: () => void;

    // UI Triggers
    openSettings: () => void;
    closeSettings: () => void;
    isSettingsOpen: boolean;
}

const DashboardContext = createContext<DashboardContextType | undefined>(undefined);

export function DashboardProvider({ children }: { children: ReactNode }) {
    // --- Layout State ---
    const { isDemoMode } = useProfile(); // Provider nesting: ProfileProvider wraps DashboardProvider in layout.tsx
    const [isEditMode, setIsEditMode] = useState(false);
    const [layout, setLayout] = useState<DashboardConfig>(getDefaultLayout());

    useEffect(() => {
        // Ensure consistent hydration - only load saved layout on client mount.
        // Why the version check: when the shipped default grid changes (version bump in
        // widgetRegistry), stale saved grids would keep the old cramped layout forever.
        // A mismatch falls back to the new default; users can re-customize via Customize.
        // Demo personas keep their state in localStorage until the demo rework (Phase 2.7);
        // the real vault reads the layout from the SQLite settings kv.
        let cancelled = false;
        const def = getDefaultLayout();
        const apply = (saved: DashboardConfig | null) => {
            if (cancelled) return;
            if (saved && saved.version === def.version) {
                // Saved configs from before the collapse feature lack collapsedWidgets;
                // normalize so every consumer can rely on the field.
                setLayout({ ...saved, collapsedWidgets: saved.collapsedWidgets ?? [] });
            } else {
                setLayout(def);
            }
        };
        if (isDemoMode) {
            apply(loadDashboardLayout());
        } else {
            loadDashboardLayoutFromVault()
                .then(apply)
                .catch(() => apply(null));
        }
        return () => { cancelled = true; };
    }, [isDemoMode]);

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

    const toggleWidgetCollapsed = (id: string) => {
        const current = layout.collapsedWidgets ?? [];
        const newLayout = {
            ...layout,
            collapsedWidgets: current.includes(id)
                ? current.filter(wId => wId !== id)
                : [...current, id]
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
            isEditMode, setIsEditMode, layout, updateLayout, hideWidget, showWidget, toggleWidgetCollapsed, resetLayout,
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
