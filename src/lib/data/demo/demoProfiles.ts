import { Asset, Liability, Goal, RecurringTransaction, NetWorthSnapshot, CashFlowEntry } from '@/types';
import widgetRegistry from '@/lib/registry/widgetRegistry';
import { generateDemoProfile } from './demoFactory';
// Demo Profiles - Re-exported for usage (Force Update)
import { GETTING_STARTED_CONFIG, STABILIZING_CONFIG, BUILDING_FOUNDATIONS_CONFIG, FAMILY_CONFIG, GROWING_WEALTH_CONFIG } from './demoConfigs';

export interface DemoProfile {
    assets: Asset[];
    liabilities: Liability[];
    goals: Goal[];
    recurring: RecurringTransaction[];
    history: NetWorthSnapshot[];
    cashflow: CashFlowEntry[];
}

// Generate base data
const p1 = generateDemoProfile(GETTING_STARTED_CONFIG);
const p2 = generateDemoProfile(STABILIZING_CONFIG);
const p3 = generateDemoProfile(BUILDING_FOUNDATIONS_CONFIG);
const p4 = generateDemoProfile(FAMILY_CONFIG);
const p5 = generateDemoProfile(GROWING_WEALTH_CONFIG);

function hydrateProfile(gen: typeof p1): DemoProfile {
    return {
        assets: gen.assets,
        liabilities: gen.liabilities,
        recurring: gen.recurring,
        goals: gen.goals,
        history: [], // Generated dynamically in demoMode
        cashflow: [] // Generated dynamically in demoMode
    };
}

export const GETTING_STARTED_DATA = hydrateProfile(p1);
export const STABILIZING_DATA = hydrateProfile(p2);
export const BUILDING_FOUNDATIONS_DATA = hydrateProfile(p3);
export const FAMILY_DATA = hydrateProfile(p4);
export const GROWING_WEALTH_DATA = hydrateProfile(p5);

// Keep previous exports for compatibility if needed (aliased)
export const STARTER_DATA = GETTING_STARTED_DATA;
export const ASPIRATIONAL_DATA = GROWING_WEALTH_DATA; // Aliasing old name to new equivalent
