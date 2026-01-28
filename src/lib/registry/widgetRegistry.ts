import { lazy } from 'react';
import { WidgetDefinition, DashboardConfig } from '@/types/dashboard';

// Registry of all available widgets
const widgetRegistry: WidgetDefinition[] = [
    // --- Stats ---
    {
        id: 'stat-networth',
        name: 'Total Net Worth',
        description: 'Your current total net worth summary',
        component: lazy(() => import('@/components/widgets/StatNetWorthWidget')),
        defaultSize: { w: 1, h: 1 },
        isRequired: true,
        category: 'stats'
    },
    {
        id: 'stat-assets',
        name: 'Total Assets',
        description: 'Summary of all your assets',
        component: lazy(() => import('@/components/widgets/StatAssetsWidget')),
        defaultSize: { w: 1, h: 1 },
        isRequired: false,
        category: 'stats'
    },
    {
        id: 'stat-liabilities',
        name: 'Total Liabilities',
        description: 'Summary of all your debts',
        component: lazy(() => import('@/components/widgets/StatLiabilitiesWidget')),
        defaultSize: { w: 1, h: 1 },
        isRequired: false,
        category: 'stats'
    },

    // --- Charts ---
    {
        id: 'chart-networth',
        name: 'Net Worth History',
        description: 'Historical trend of your net worth over time',
        component: lazy(() => import('@/components/widgets/NetWorthChartWidget')),
        defaultSize: { w: 2, h: 2 },
        minSize: { w: 2, h: 2 },
        isRequired: true,
        category: 'charts'
    },
    {
        id: 'chart-allocation',
        name: 'Asset Allocation',
        description: 'Pie chart showing asset distribution',
        component: lazy(() => import('@/components/widgets/AllocationChartWidget')),
        defaultSize: { w: 2, h: 1 }, // Changed to 2x1 to fit nicely under main chart? Or keep flexible.
        minSize: { w: 1, h: 1 },
        isRequired: false,
        category: 'charts'
    },

    // --- Insights ---
    {
        id: 'growth-engine',
        name: 'Growth Engine',
        description: 'Portfolio analysis and growth metrics',
        component: lazy(() => import('@/components/widgets/GrowthEngineWidget')),
        defaultSize: { w: 2, h: 1 },
        isRequired: false,
        category: 'insights'
    },
    {
        id: 'wisdom',
        name: 'Wisdom Board',
        description: 'AI Mentors and Philosophy',
        component: lazy(() => import('@/components/widgets/WisdomWidget')),
        defaultSize: { w: 1, h: 2 },
        isRequired: false,
        category: 'insights'
    },

    // --- Tools ---
    {
        id: 'freedom-date',
        name: 'Freedom Date',
        description: 'Projected debt-free date',
        component: lazy(() => import('@/components/widgets/FreedomDateWidget')),
        defaultSize: { w: 1, h: 1 },
        isRequired: false,
        category: 'tools'
    },
    {
        id: 'travel-power',
        name: 'Travel Power',
        description: 'Net worth in travel terms',
        component: lazy(() => import('@/components/widgets/TravelPowerWidget')),
        defaultSize: { w: 1, h: 1 },
        isRequired: false,
        category: 'tools'
    },
    {
        id: 'momentum',
        name: 'Wealth Momentum',
        description: 'Financial velocity score',
        component: lazy(() => import('@/components/widgets/MomentumWidget')),
        defaultSize: { w: 1, h: 1 },
        isRequired: false,
        category: 'tools'
    }
];

// Helper to look up widget definition
export const getWidgetById = (id: string) => widgetRegistry.find(w => w.id === id);

// Default Layout Configuration
export const getDefaultLayout = (): DashboardConfig => {
    return {
        version: 1,
        hiddenWidgets: [],
        layouts: {
            lg: [
                // Top Row: Stats (taller for better visibility)
                { i: 'stat-networth', x: 0, y: 0, w: 1, h: 2 },
                { i: 'stat-assets', x: 1, y: 0, w: 1, h: 2 },
                { i: 'stat-liabilities', x: 2, y: 0, w: 1, h: 2 },
                { i: 'momentum', x: 3, y: 0, w: 1, h: 2 },

                // Second Row: Main Chart (taller for better visibility)
                { i: 'chart-networth', x: 0, y: 2, w: 3, h: 3 },
                { i: 'wisdom', x: 3, y: 2, w: 1, h: 3 },

                // Third Row: Side widgets (taller)
                { i: 'freedom-date', x: 0, y: 5, w: 1, h: 2 },
                { i: 'travel-power', x: 1, y: 5, w: 1, h: 2 },
                { i: 'chart-allocation', x: 2, y: 5, w: 2, h: 2 },

                // Bottom Row
                { i: 'growth-engine', x: 0, y: 7, w: 4, h: 2 }
            ],
            md: [
                // 3 Columns (taller widgets)
                { i: 'stat-networth', x: 0, y: 0, w: 1, h: 2 },
                { i: 'stat-assets', x: 1, y: 0, w: 1, h: 2 },
                { i: 'stat-liabilities', x: 2, y: 0, w: 1, h: 2 },

                { i: 'chart-networth', x: 0, y: 2, w: 2, h: 3 },
                { i: 'wisdom', x: 2, y: 2, w: 1, h: 3 },

                { i: 'momentum', x: 0, y: 5, w: 1, h: 2 },
                { i: 'freedom-date', x: 1, y: 5, w: 1, h: 2 },
                { i: 'travel-power', x: 2, y: 5, w: 1, h: 2 },

                { i: 'chart-allocation', x: 0, y: 7, w: 2, h: 2 },
                { i: 'growth-engine', x: 0, y: 9, w: 3, h: 2 }
            ],
            sm: [
                // 2 Columns (Mobile/Tablet - taller widgets)
                { i: 'stat-networth', x: 0, y: 0, w: 1, h: 2 },
                { i: 'stat-assets', x: 1, y: 0, w: 1, h: 2 },

                { i: 'stat-liabilities', x: 0, y: 2, w: 1, h: 2 },
                { i: 'momentum', x: 1, y: 2, w: 1, h: 2 },

                { i: 'chart-networth', x: 0, y: 4, w: 2, h: 3 },

                { i: 'freedom-date', x: 0, y: 7, w: 1, h: 2 },
                { i: 'travel-power', x: 1, y: 7, w: 1, h: 2 },

                { i: 'wisdom', x: 0, y: 9, w: 2, h: 2 },
                { i: 'chart-allocation', x: 0, y: 11, w: 2, h: 2 },
                { i: 'growth-engine', x: 0, y: 13, w: 2, h: 2 }
            ],
            xs: [
                { i: 'stat-networth', x: 0, y: 0, w: 1, h: 2 },
                { i: 'chart-networth', x: 0, y: 2, w: 1, h: 3 },
                { i: 'wisdom', x: 0, y: 5, w: 1, h: 2 },
                { i: 'freedom-date', x: 0, y: 7, w: 1, h: 2 },
                { i: 'travel-power', x: 0, y: 9, w: 1, h: 2 },
                { i: 'stat-assets', x: 0, y: 11, w: 1, h: 1 },
                { i: 'stat-liabilities', x: 0, y: 12, w: 1, h: 1 },
                { i: 'momentum', x: 0, y: 13, w: 1, h: 1 },
                { i: 'chart-allocation', x: 0, y: 14, w: 1, h: 2 },
                { i: 'growth-engine', x: 0, y: 16, w: 1, h: 2 }
            ],
            xxs: [
                { i: 'stat-networth', x: 0, y: 0, w: 1, h: 2 },
                { i: 'chart-networth', x: 0, y: 2, w: 1, h: 3 },
                { i: 'wisdom', x: 0, y: 5, w: 1, h: 2 },
                { i: 'freedom-date', x: 0, y: 7, w: 1, h: 2 },
                { i: 'travel-power', x: 0, y: 9, w: 1, h: 2 },
                { i: 'stat-assets', x: 0, y: 11, w: 1, h: 1 },
                { i: 'stat-liabilities', x: 0, y: 12, w: 1, h: 1 },
                { i: 'momentum', x: 0, y: 13, w: 1, h: 1 },
                { i: 'chart-allocation', x: 0, y: 14, w: 1, h: 2 },
                { i: 'growth-engine', x: 0, y: 16, w: 1, h: 2 }
            ]
        }
    };
};

export default widgetRegistry;
