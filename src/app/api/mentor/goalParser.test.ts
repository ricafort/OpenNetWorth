/**
 * Why this file exists:
 * Covers the mentor goal/timeline intent parser and the deterministic projection math that
 * lets mentors answer "when will I reach $X net worth?" with a concrete date instead of
 * refusing. Pure functions — zero database access.
 *
 * Tricky logic:
 * - "first million" / "millionaire" imply a 1,000,000 target.
 * - Shorthand ("$1.5m"), written-out ("two million"), and bare ("$10,000") amounts normalize
 *   to major units; AUD markers take precedence over USD so "australian dollars" stays AUD.
 * - Projection date math is calendar-component based and must not shift across year boundaries.
 */

import { describe, it, expect } from 'vitest';
import { parseGoalIntent, computeGoalProjection } from './goalParser';

describe('parseGoalIntent', () => {
    it('detects the million-dollar net worth question with implied 1,000,000 USD target', () => {
        const intent = parseGoalIntent(
            "When will I be able to achieve my first million US dollar net worth based on my cashflow?",
            'AUD'
        );
        expect(intent.isGoalQuery).toBe(true);
        expect(intent.targetAmount).toBe(1_000_000);
        expect(intent.targetCurrency).toBe('USD');
    });

    it('parses shorthand amounts and AUD markers', () => {
        const intent = parseGoalIntent('How long until I hit A$2 million net worth?', 'USD');
        expect(intent.isGoalQuery).toBe(true);
        expect(intent.targetAmount).toBe(2_000_000);
        expect(intent.targetCurrency).toBe('AUD');
    });

    it('parses $1.5m shorthand', () => {
        const intent = parseGoalIntent('When will my net worth reach $1.5m?', 'AUD');
        expect(intent.isGoalQuery).toBe(true);
        expect(intent.targetAmount).toBe(1_500_000);
        expect(intent.targetCurrency).toBe('AUD'); // falls back to preferred currency
    });

    it('parses written-out multipliers', () => {
        const intent = parseGoalIntent('How many years until I become a two million dollar millionaire?', 'USD');
        expect(intent.isGoalQuery).toBe(true);
        expect(intent.targetAmount).toBe(2_000_000);
    });

    it('detects financial independence questions without an explicit amount', () => {
        const intent = parseGoalIntent('When will I be financially independent?', 'AUD');
        expect(intent.isGoalQuery).toBe(true);
        expect(intent.isFinancialIndependence).toBe(true);
        expect(intent.targetAmount).toBeUndefined();
    });

    it('does not treat spending queries as goal queries', () => {
        const intent = parseGoalIntent('How much did I spend in July?', 'AUD');
        expect(intent.isGoalQuery).toBe(false);
    });

    it('parses bare dollar amounts for smaller goals', () => {
        const intent = parseGoalIntent('When will I reach $10,000 net worth?', 'USD');
        expect(intent.isGoalQuery).toBe(true);
        expect(intent.targetAmount).toBe(10_000);
    });
});

describe('computeGoalProjection', () => {
    it('projects the million-dollar date from net worth, surplus, and as-of date', () => {
        // US$873,514 net worth, US$7,458.23/mo surplus, US$1,000,000 target, as of 2026-10-09
        const p = computeGoalProjection(873514, 7458.23, 1_000_000, '2026-10-09');
        expect(p.feasible).toBe(true);
        expect(p.alreadyAchieved).toBe(false);
        expect(p.gap).toBeCloseTo(126486, 2);
        expect(p.months).toBe(17);
        expect(p.projectedDate).toBe('2028-03');
        expect(p.projectedLabel).toBe('March 2028');
    });

    it('rolls over year boundaries correctly', () => {
        const p = computeGoalProjection(0, 1, 3, '2026-11-15');
        expect(p.months).toBe(3);
        expect(p.projectedDate).toBe('2027-02');
        expect(p.projectedLabel).toBe('February 2027');
    });

    it('reports already achieved when net worth exceeds the target', () => {
        const p = computeGoalProjection(1_200_000, 1000, 1_000_000, '2026-10-09');
        expect(p.feasible).toBe(true);
        expect(p.alreadyAchieved).toBe(true);
        expect(p.months).toBe(0);
    });

    it('reports infeasible when the surplus is zero or negative', () => {
        const p = computeGoalProjection(5000, -100, 10_000, '2026-10-09');
        expect(p.feasible).toBe(false);
        expect(p.alreadyAchieved).toBe(false);
        expect(p.reason).toContain('surplus');
    });
});
