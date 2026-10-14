/**
 * Normalizes granular account subtypes into standard asset allocation categories.
 *
 * Why this function exists:
 * Maps diverse banking, brokerage, property, and legacy asset classifications
 * into consistent visual buckets (Cash, Investment, Real Estate, Crypto, Vehicle, Other).
 * Extracted verbatim from AssetAllocationChart.tsx so the HTML financial report
 * can build the same allocation donut without importing the React chart.
 *
 * Tricky logic:
 * Handles both double-entry `account_sub_type` (snake_case) and legacy `Asset.type` values.
 *
 * TODO: In Milestone 2, allow user-defined allocation taxonomy mapping.
 */
export function classifyCategory(subType?: string, type?: string): string {
    const raw = subType || type || 'other';
    const s = raw.toLowerCase().trim();
    if (['cash', 'checking', 'savings', 'bank'].includes(s)) return 'Cash';
    if (['brokerage', 'investment', 'retirement', 'superannuation', 'pension', 'stock', 'etf'].includes(s)) return 'Investment';
    if (['property', 'real_estate', 'real estate', 'land'].includes(s)) return 'Real Estate';
    if (['crypto', 'cryptocurrency', 'bitcoin'].includes(s)) return 'Crypto';
    if (['vehicle', 'car', 'automobile'].includes(s)) return 'Vehicle';
    if (['precious_metals', 'precious metals', 'gold'].includes(s)) return 'Precious Metals';
    return s.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}
