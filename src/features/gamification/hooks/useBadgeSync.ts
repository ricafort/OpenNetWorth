import { useEffect, useState } from 'react';
import { useProfile } from '@/contexts/ProfileContext';
import { createClient } from '@/utils/supabase/client';
import { GamificationRepository } from '../data/repository';
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

    // Repository Pattern
    const supabase = createClient();
    const repository = new GamificationRepository(supabase);

    useEffect(() => {
        async function syncBadges() {
            // 1. Validation
            const isUUID = (str: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str);

            if (!profile?.id) return;

            // 2. Local/Guest Mode Logic — evaluate ALL six badges against authoritative facts.
            // (Previously only four badges were checked, using legacy assets and USD-only net
            // worth, which wrongly locked badges for users whose data lives in the accounting DB.)
            if (profile.id === 'local_user') {
                setUnlockedBadges(evaluateAchievements({
                    hasAnyAsset: assets.length > 0 || assetAccountCount > 0,
                    hasAnyGoal: goals.length > 0,
                    netWorthBase,
                    hasAnyDebt,
                    checkInStreakDays
                }));
                return;
            }

            // 3. Real Mode: Fetch & Sync
            if (!isUUID(profile.id)) return;

            // A. Fetch existing
            const loadedBadges = await repository.getEarnedBadges(profile.id);
            setUnlockedBadges(loadedBadges);

            // B. Check for missing badges (Trigger Backup)
            const locallyEarned = evaluateAchievements({
                hasAnyAsset: assets.length > 0 || assetAccountCount > 0,
                hasAnyGoal: goals.length > 0,
                netWorthBase,
                hasAnyDebt,
                checkInStreakDays
            });
            const missingBadges = Array.from(locallyEarned).filter(id => !loadedBadges.has(id));

            // C. Award missing
            if (missingBadges.length > 0) {
                console.log("useBadgeSync: Awarding missing badges", missingBadges);
                for (const badgeId of missingBadges) {
                    const success = await repository.awardBadge(profile.id, badgeId);
                    if (success) {
                        loadedBadges.add(badgeId);
                    }
                }
                setUnlockedBadges(new Set(loadedBadges));
            }
        }

        syncBadges();
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
