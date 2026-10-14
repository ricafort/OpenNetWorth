/**
 * Why this file exists:
 * classifyCategory was extracted verbatim from AssetAllocationChart.tsx so the
 * HTML financial report can bucket the same way the on-screen donut does.
 * This parity table locks the mapping — if a bucket changes, the chart and the
 * downloaded report must change together, never silently apart.
 */

import { describe, it, expect } from 'vitest';
import { classifyCategory } from './classifyCategory';

describe('classifyCategory', () => {
    it.each([
        ['cash', 'Cash'],
        ['checking', 'Cash'],
        ['savings', 'Cash'],
        ['bank', 'Cash'],
        ['brokerage', 'Investment'],
        ['investment', 'Investment'],
        ['retirement', 'Investment'],
        ['superannuation', 'Investment'],
        ['pension', 'Investment'],
        ['stock', 'Investment'],
        ['etf', 'Investment'],
        ['property', 'Real Estate'],
        ['real_estate', 'Real Estate'],
        ['real estate', 'Real Estate'],
        ['land', 'Real Estate'],
        ['crypto', 'Crypto'],
        ['cryptocurrency', 'Crypto'],
        ['bitcoin', 'Crypto'],
        ['vehicle', 'Vehicle'],
        ['car', 'Vehicle'],
        ['automobile', 'Vehicle'],
        ['precious_metals', 'Precious Metals'],
        ['precious metals', 'Precious Metals'],
        ['gold', 'Precious Metals'],
    ])('maps known subtype %s to %s', (input, expected) => {
        expect(classifyCategory(input)).toBe(expected);
    });

    it('falls back to title-cased snake_case for unknown subtypes', () => {
        expect(classifyCategory('collectible_watch')).toBe('Collectible Watch');
    });

    it('defaults to Other when neither subtype nor type is given', () => {
        expect(classifyCategory(undefined, undefined)).toBe('Other');
    });

    it('uses the legacy Asset.type when subType is absent', () => {
        expect(classifyCategory(undefined, 'crypto')).toBe('Crypto');
    });

    it('prefers subType over type when both are present', () => {
        expect(classifyCategory('savings', 'crypto')).toBe('Cash');
    });

    it('is case- and whitespace-insensitive', () => {
        expect(classifyCategory('  CRYPTO ')).toBe('Crypto');
        expect(classifyCategory('Real_Estate')).toBe('Real Estate');
    });
});
