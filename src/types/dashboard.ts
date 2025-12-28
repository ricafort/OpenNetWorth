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
    version: number;
}
