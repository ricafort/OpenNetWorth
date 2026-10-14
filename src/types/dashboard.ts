import { ComponentType } from 'react';

export type DashboardCategory = 'stats' | 'charts' | 'insights' | 'tools';

export interface WidgetDefinition {
    id: string;
    name: string;
    description: string;
    component: ComponentType<any>;
    defaultSize: { w: number; h: number };
    minSize?: { w: number; h: number };
    maxSize?: { w: number; h: number };
    isRequired: boolean; // If true, cannot be removed (e.g. Total Net Worth)
    category: DashboardCategory;
}

export interface WidgetLayout {
    i: string;
    x: number;
    y: number;
    w: number;
    h: number;
    static?: boolean;
}

export interface DashboardConfig {
    layouts: {
        lg: WidgetLayout[];
        md: WidgetLayout[];
        sm: WidgetLayout[];
        xs: WidgetLayout[];
        xxs: WidgetLayout[];
    };
    hiddenWidgets: string[];
    // Widget ids rendered as a compact one-row bar instead of their full content.
    // Persisted alongside hiddenWidgets; absent in pre-collapse saved configs, so
    // DashboardContext normalizes it to [] on load.
    collapsedWidgets: string[];
    version: number;
}

export interface DashboardMetrics {
    total_assets: number;
    total_liabilities: number;
    net_worth: number;
    debt_to_asset_ratio: number;
    liquidity_ratio: number;
    savings_rate: number;
}
