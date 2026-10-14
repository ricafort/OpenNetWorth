import { lazy } from 'react';
import { WidgetDefinition, DashboardConfig } from '@/types/dashboard';

// Registry of all available widgets
const widgetRegistry: WidgetDefinition[] = [
    // --- Stats ---
    {
        id: 'stat-networth',
        name: 'Total Net Worth',
        description: 'Your current total net worth summary',
        component: lazy(() => import('@/features/dashboard/widgets/StatNetWorthWidget')),
        defaultSize: { w: 1, h: 1 },
        // Not required: the owner can remove it via Customize, but it stays in the default
        // layout — these stat cards are the dashboard's only explicit Net Worth / Assets /
        // Liabilities totals (the header banner carries no figures).
        isRequired: false,
        category: 'stats'
    },
    {
        id: 'stat-assets',
        name: 'Total Assets',
        description: 'Summary of all your assets',
        component: lazy(() => import('@/features/assets/widgets/StatAssetsWidget')),
        defaultSize: { w: 1, h: 1 },
        isRequired: false,
        category: 'stats'
    },
    {
        id: 'stat-liabilities',
        name: 'Total Liabilities',
        description: 'Summary of all your debts',
        component: lazy(() => import('@/features/liabilities/widgets/StatLiabilitiesWidget')),
        defaultSize: { w: 1, h: 1 },
        isRequired: false,
        category: 'stats'
    },

    // --- Charts ---
    {
        id: 'chart-networth',
        name: 'Net Worth History',
        description: 'Historical trend of your net worth over time',
        component: lazy(() => import('@/features/dashboard/widgets/NetWorthChartWidget')),
        defaultSize: { w: 2, h: 2 },
        minSize: { w: 2, h: 2 },
        isRequired: true,
        category: 'charts'
    },
    {
        id: 'chart-allocation',
        name: 'Asset Allocation',
        description: 'Pie chart showing asset distribution',
        component: lazy(() => import('@/features/dashboard/widgets/AllocationChartWidget')),
        defaultSize: { w: 2, h: 1 },
        minSize: { w: 1, h: 1 },
        isRequired: false,
        category: 'charts'
    },

    // --- Insights ---
    {
        id: 'growth-engine',
        name: 'Growth Engine',
        description: 'Portfolio analysis and growth metrics',
        component: lazy(() => import('@/features/assets/widgets/GrowthEngineWidget')),
        defaultSize: { w: 2, h: 1 },
        isRequired: false,
        category: 'insights'
    },
    {
        id: 'wisdom',
        name: 'Wisdom Board',
        description: 'AI Mentors and Philosophy',
        component: lazy(() => import('@/features/mentors/widgets/WisdomWidget')),
        defaultSize: { w: 1, h: 2 },
        isRequired: false,
        category: 'insights'
    },

    // --- Tools ---
    {
        id: 'freedom-date',
        name: 'Freedom Date',
        description: 'Projected debt-free date',
        component: lazy(() => import('@/features/liabilities/widgets/FreedomDateWidget')),
        defaultSize: { w: 1, h: 1 },
        isRequired: false,
        category: 'tools'
    },
    {
        id: 'travel-power',
        name: 'Travel Power',
        description: 'Net worth in travel terms',
        component: lazy(() => import('@/features/goals/widgets/TravelPowerWidget')),
        defaultSize: { w: 1, h: 1 },
        isRequired: false,
        category: 'tools'
    },
    {
        id: 'momentum',
        name: 'Wealth Momentum',
        description: 'Financial velocity score',
        component: lazy(() => import('@/features/cashflow/widgets/MomentumWidget')),
        defaultSize: { w: 1, h: 1 },
        isRequired: false,
        category: 'tools'
    }
];

// Helper to look up widget definition
export const getWidgetById = (id: string) => widgetRegistry.find(w => w.id === id);

// Default Layout Configuration
// Version 6: the owner's manually curated arrangement, adopted as the default.
// Row 1: stat cards (Net Worth w2 + Assets + Liabilities) — the dashboard's only explicit
// totals. Row 2: the large Asset Allocation donut (w3) with Wealth Momentum beside it.
// Row 3: Wisdom Board + Growth Engine. Row 4: Net Worth History (w2) with Debt-Free and the
// Travel Simulator closing the page. AccountFreshnessCard (above) and AchievementBadges
// (below) are page-level sections, not grid widgets.
// Bumping `version` invalidates stale saved grids in DashboardContext so existing vaults get
// this grid. Note: DashboardGrid renders every non-hidden registry widget even when absent from
// the layout arrays, so widget removal requires hiddenWidgets entries, not just array removal.
export const getDefaultLayout = (): DashboardConfig => {
    return {
        version: 6,
        hiddenWidgets: [],
        collapsedWidgets: [],
        layouts: {
            lg: [
                { i: 'stat-networth', x: 0, y: 0, w: 2, h: 1 },
                { i: 'stat-assets', x: 2, y: 0, w: 1, h: 1 },
                { i: 'stat-liabilities', x: 3, y: 0, w: 1, h: 1 },
                { i: 'chart-allocation', x: 0, y: 1, w: 3, h: 3 },
                { i: 'momentum', x: 3, y: 1, w: 1, h: 3 },
                { i: 'wisdom', x: 0, y: 4, w: 2, h: 3 },
                { i: 'growth-engine', x: 2, y: 4, w: 2, h: 3 },
                { i: 'chart-networth', x: 0, y: 7, w: 2, h: 3 },
                { i: 'freedom-date', x: 2, y: 7, w: 1, h: 3 },
                { i: 'travel-power', x: 3, y: 7, w: 1, h: 3 }
            ],
            md: [
                { i: 'stat-networth', x: 0, y: 0, w: 2, h: 1 },
                { i: 'stat-assets', x: 2, y: 0, w: 1, h: 1 },
                { i: 'stat-liabilities', x: 0, y: 1, w: 1, h: 1 },
                { i: 'chart-allocation', x: 1, y: 1, w: 2, h: 3 },
                { i: 'momentum', x: 0, y: 2, w: 1, h: 3 },
                { i: 'wisdom', x: 0, y: 4, w: 3, h: 3 },
                { i: 'growth-engine', x: 0, y: 7, w: 3, h: 3 },
                { i: 'chart-networth', x: 0, y: 10, w: 2, h: 3 },
                { i: 'freedom-date', x: 2, y: 10, w: 1, h: 3 },
                { i: 'travel-power', x: 0, y: 13, w: 3, h: 3 }
            ],
            sm: [
                { i: 'stat-networth', x: 0, y: 0, w: 2, h: 1 },
                { i: 'stat-assets', x: 0, y: 1, w: 1, h: 1 },
                { i: 'stat-liabilities', x: 1, y: 1, w: 1, h: 1 },
                { i: 'chart-allocation', x: 0, y: 2, w: 2, h: 3 },
                { i: 'momentum', x: 0, y: 5, w: 1, h: 3 },
                { i: 'wisdom', x: 1, y: 5, w: 1, h: 3 },
                { i: 'growth-engine', x: 0, y: 8, w: 2, h: 3 },
                { i: 'chart-networth', x: 0, y: 11, w: 2, h: 3 },
                { i: 'freedom-date', x: 0, y: 14, w: 1, h: 3 },
                { i: 'travel-power', x: 1, y: 14, w: 1, h: 3 }
            ],
            xs: [
                { i: 'stat-networth', x: 0, y: 0, w: 1, h: 1 },
                { i: 'stat-assets', x: 0, y: 1, w: 1, h: 1 },
                { i: 'stat-liabilities', x: 0, y: 2, w: 1, h: 1 },
                { i: 'chart-allocation', x: 0, y: 3, w: 1, h: 3 },
                { i: 'momentum', x: 0, y: 6, w: 1, h: 3 },
                { i: 'wisdom', x: 0, y: 9, w: 1, h: 3 },
                { i: 'growth-engine', x: 0, y: 12, w: 1, h: 3 },
                { i: 'chart-networth', x: 0, y: 15, w: 1, h: 3 },
                { i: 'freedom-date', x: 0, y: 18, w: 1, h: 3 },
                { i: 'travel-power', x: 0, y: 21, w: 1, h: 3 }
            ],
            xxs: [
                { i: 'stat-networth', x: 0, y: 0, w: 1, h: 1 },
                { i: 'stat-assets', x: 0, y: 1, w: 1, h: 1 },
                { i: 'stat-liabilities', x: 0, y: 2, w: 1, h: 1 },
                { i: 'chart-allocation', x: 0, y: 3, w: 1, h: 3 },
                { i: 'momentum', x: 0, y: 6, w: 1, h: 3 },
                { i: 'wisdom', x: 0, y: 9, w: 1, h: 3 },
                { i: 'growth-engine', x: 0, y: 12, w: 1, h: 3 },
                { i: 'chart-networth', x: 0, y: 15, w: 1, h: 3 },
                { i: 'freedom-date', x: 0, y: 18, w: 1, h: 3 },
                { i: 'travel-power', x: 0, y: 21, w: 1, h: 3 }
            ]
        }
    };
};

export default widgetRegistry;
