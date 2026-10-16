import { useEffect, useState } from 'react';
import { useProfile } from '@/contexts/ProfileContext';
import { evaluateAchievements } from '../domain/achievementRules';

// Domain Types needed for checks
import { Asset } from '@/features/assets/types';
import { Goal } from '@/features/goals/types';

interface UseBadgeSyncProps {
    assets: Asset[];
    goals: Goal[];
    /** Converted net worth in the user's base currency; null when not reliably known. */
    netWorthBase: number | null;
    /** Modern accounting asset accounts (recorded or awaiting a balance). */
    assetAccountCount: number;
    /** Any liability with a non-zero recorded balance, or awaiting a balance (unknown ≠ debt-free). */
    hasAnyDebt: boolean;
    /** Longest consecutive-day run of net-worth snapshots. */
    checkInStreakDays: number;
}

export function useBadgeSync({
    assets,
    goals,
    netWorthBase,
    assetAccountCount,
    hasAnyDebt,
    checkInStreakDays
}: UseBadgeSyncProps) {
    const { profile } = useProfile();
    const [unlockedBadges, setUnlockedBadges] = useState<Set<string>>(new Set());

    // Badges are derived facts, not stored state: evaluate them in-memory against
    // the authoritative m1 figures supplied by the caller. The old Supabase
    // user_badges sync branch (fetch earned badges, award missing ones via RPC)
    // was removed in Phase 2.6 — there is no cloud badge store to reconcile
    // against, and the local evaluation was already the source of truth for
    // every profile the app actually serves.
    useEffect(() => {
        if (!profile?.id) return;

        setUnlockedBadges(evaluateAchievements({
            hasAnyAsset: assets.length > 0 || assetAccountCount > 0,
            hasAnyGoal: goals.length > 0,
            netWorthBase,
            hasAnyDebt,
            checkInStreakDays
        }));
    }, [
        assets.length,
        goals.length,
        netWorthBase,
        assetAccountCount,
        hasAnyDebt,
        checkInStreakDays,
        profile?.id
    ]);

    return { unlockedBadges };
}
