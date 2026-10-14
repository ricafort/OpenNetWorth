/**
 * Why this file exists:
 * Pure, testable unlock rules for the dashboard Achievements widget.
 *
 * Regression this fixes:
 * The previous inline logic checked the LEGACY localStorage/`assets` table for "First Steps"
 * and a USD-only net worth for "Wealth Tracker"/"Millionaire", so a user whose entire balance
 * sheet lives in the modern accounting DB (m1_accounts) in AUD saw a seven-figure net worth
 * with those badges locked. "Debt Slayer" and "Consistent" were never evaluated at all in
 * local mode. These rules evaluate against authoritative facts supplied by the caller instead.
 *
 * Debt Slayer semantics (user decision, 2026-10-09): being completely debt-free unlocks it —
 * a user who has always had zero debt has "slain" their debt burden, so the badge activates.
 * A liability awaiting its first balance keeps it locked: unknown debt is not proven zero.
 *
 * Tricky logic:
 * - netWorthBase is the converted base-currency figure; null means "not reliably known"
 *   (incomplete balances or missing FX rates) and must NOT unlock net-worth badges.
 * - Millionaire is measured in the user's base currency — the same currency the dashboard
 *   displays — and the badge label discloses that currency.
 * - Check-in streak uses calendar-day arithmetic on YYYY-MM-DD snapshot dates (UTC epoch
 *   math, no local-timezone drift) and deduplicates same-day snapshots.
 */

export interface AchievementFacts {
    hasAnyAsset: boolean;              // legacy assets OR modern asset accounts (recorded or unrecorded)
    hasAnyGoal: boolean;
    netWorthBase: number | null;       // base-currency major units; null = not reliably known
    hasAnyDebt: boolean;               // any liability with a non-zero recorded balance, or awaiting a balance (unknown debt is not debt-free)
    checkInStreakDays: number;         // longest run of consecutive net-worth snapshot dates
}

export const MILLIONAIRE_THRESHOLD_BASE = 1_000_000;
export const CONSISTENCY_STREAK_DAYS = 3;

/** Longest consecutive-calendar-day run among the given YYYY-MM-DD dates. */
export function computeCheckInStreak(dates: string[]): number {
    const unique = Array.from(
        new Set(dates.filter(d => typeof d === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(d)))
    ).sort();
    if (unique.length === 0) return 0;

    let best = 1;
    let run = 1;
    for (let i = 1; i < unique.length; i++) {
        const prev = Date.parse(`${unique[i - 1]}T00:00:00Z`);
        const cur = Date.parse(`${unique[i]}T00:00:00Z`);
        const diffDays = Math.round((cur - prev) / 86_400_000);
        run = diffDays === 1 ? run + 1 : 1;
        if (run > best) best = run;
    }
    return best;
}

export function evaluateAchievements(facts: AchievementFacts): Set<string> {
    const unlocked = new Set<string>();

    if (facts.hasAnyAsset) unlocked.add('first-steps');
    if (facts.hasAnyGoal) unlocked.add('goal-setter');
    if (facts.netWorthBase !== null && facts.netWorthBase > 0) unlocked.add('wealth-tracker');
    if (!facts.hasAnyDebt) unlocked.add('debt-slayer');
    if (facts.checkInStreakDays >= CONSISTENCY_STREAK_DAYS) unlocked.add('consistency');
    if (facts.netWorthBase !== null && facts.netWorthBase >= MILLIONAIRE_THRESHOLD_BASE) {
        unlocked.add('millionaire');
    }

    return unlocked;
}
