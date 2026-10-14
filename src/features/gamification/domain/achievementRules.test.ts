/**
 * Why this file exists:
 * Regression tests for the dashboard Achievements activations. The shipped widget locked
 * "First Steps" (it only saw the legacy empty assets table) and locked "Wealth Tracker"/
 * "Millionaire" (it used USD-only balances while the user's net worth is AUD), and never
 * evaluated "Debt Slayer"/"Consistent" at all. These rules are pure — zero DB, zero React.
 */

import { describe, it, expect } from 'vitest';
import {
    evaluateAchievements,
    computeCheckInStreak,
    AchievementFacts
} from './achievementRules';

const base: AchievementFacts = {
    hasAnyAsset: false,
    hasAnyGoal: false,
    netWorthBase: null,
    hasAnyDebt: false,
    checkInStreakDays: 0
};

describe('evaluateAchievements', () => {
    it('unlocks First Steps from modern accounting asset accounts (legacy table empty)', () => {
        const unlocked = evaluateAchievements({ ...base, hasAnyAsset: true });
        expect(unlocked.has('first-steps')).toBe(true);
    });

    it('unlocks Wealth Tracker and Millionaire on converted base-currency net worth (AUD user regression)', () => {
        // A$1,255,770.38 net worth, zero USD-denominated accounts: previously netWorthUSD=0
        // locked both badges despite a seven-figure balance sheet.
        const unlocked = evaluateAchievements({
            ...base,
            hasAnyAsset: true,
            netWorthBase: 1_255_770.38
        });
        expect(unlocked.has('wealth-tracker')).toBe(true);
        expect(unlocked.has('millionaire')).toBe(true);
    });

    it('keeps net-worth badges locked when the converted figure is not reliably known', () => {
        const unlocked = evaluateAchievements({ ...base, hasAnyAsset: true, netWorthBase: null });
        expect(unlocked.has('wealth-tracker')).toBe(false);
        expect(unlocked.has('millionaire')).toBe(false);
    });

    it('keeps Millionaire locked below the base-currency threshold', () => {
        const unlocked = evaluateAchievements({ ...base, netWorthBase: 873_513.88 });
        expect(unlocked.has('wealth-tracker')).toBe(true);
        expect(unlocked.has('millionaire')).toBe(false);
    });

    it('keeps Wealth Tracker locked at exactly zero or negative net worth', () => {
        expect(evaluateAchievements({ ...base, netWorthBase: 0 }).has('wealth-tracker')).toBe(false);
        expect(evaluateAchievements({ ...base, netWorthBase: -50 }).has('wealth-tracker')).toBe(false);
    });

    it('unlocks Debt Slayer when completely debt-free (user rule: zero debt activates it)', () => {
        const unlocked = evaluateAchievements({ ...base, hasAnyDebt: false });
        expect(unlocked.has('debt-slayer')).toBe(true);
    });

    it('keeps Debt Slayer locked while any debt exists', () => {
        const unlocked = evaluateAchievements({ ...base, hasAnyDebt: true });
        expect(unlocked.has('debt-slayer')).toBe(false);
    });

    it('evaluates Consistent (previously never checked in local mode)', () => {
        expect(evaluateAchievements({ ...base, checkInStreakDays: 3 }).has('consistency')).toBe(true);
        expect(evaluateAchievements({ ...base, checkInStreakDays: 2 }).has('consistency')).toBe(false);
    });

    it('unlocks Goal Setter only when goals exist', () => {
        expect(evaluateAchievements({ ...base, hasAnyGoal: true }).has('goal-setter')).toBe(true);
        expect(evaluateAchievements(base).has('goal-setter')).toBe(false);
    });
});

describe('computeCheckInStreak', () => {
    it('returns 0 for no snapshots', () => {
        expect(computeCheckInStreak([])).toBe(0);
    });

    it('deduplicates same-day snapshots and counts consecutive days', () => {
        expect(computeCheckInStreak([
            '2026-10-01', '2026-10-01', '2026-10-02', '2026-10-03'
        ])).toBe(3);
    });

    it('takes the longest run, not the total', () => {
        expect(computeCheckInStreak([
            '2026-10-01', '2026-10-02', '2026-10-03', '2026-10-10', '2026-10-11'
        ])).toBe(3);
    });

    it('handles year boundaries', () => {
        expect(computeCheckInStreak(['2026-12-30', '2026-12-31', '2027-01-01'])).toBe(3);
    });

    it('ignores malformed dates', () => {
        expect(computeCheckInStreak(['garbage', '', '2026-10-05'])).toBe(1);
    });
});
