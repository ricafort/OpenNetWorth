import { useEffect, useState } from 'react';
import { useProfile } from '@/contexts/ProfileContext';
import { createClient } from '@/utils/supabase/client';
import { GamificationRepository } from '../data/repository';

// Domain Types needed for checks
import { Asset } from '@/features/assets/types';
import { Liability } from '@/features/liabilities/types';
import { Goal } from '@/features/goals/types';

interface UseBadgeSyncProps {
    assets: Asset[];
    goals: Goal[];
    netWorthUSD: number;
}

export function useBadgeSync({ assets, goals, netWorthUSD }: UseBadgeSyncProps) {
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

            // 2. Local/Guest Mode Logic
            if (profile.id === 'local_user') {
                const localUnlocked = new Set<string>();
                if (assets.length > 0) localUnlocked.add('first-steps');
                if (goals.length > 0) localUnlocked.add('goal-setter');
                if ((netWorthUSD || 0) > 0) localUnlocked.add('wealth-tracker');
                if ((netWorthUSD || 0) >= 1000000) localUnlocked.add('millionaire');
                setUnlockedBadges(localUnlocked);
                return;
            }

            // 3. Real Mode: Fetch & Sync
            if (!isUUID(profile.id)) return;

            // A. Fetch existing
            const loadedBadges = await repository.getEarnedBadges(profile.id);
            setUnlockedBadges(loadedBadges);

            // B. Check for missing badges (Trigger Backup)
            const missingBadges: string[] = [];
            if (!loadedBadges.has('first-steps') && assets.length > 0) missingBadges.push('first-steps');
            if (!loadedBadges.has('goal-setter') && goals.length > 0) missingBadges.push('goal-setter');
            if (!loadedBadges.has('wealth-tracker') && (netWorthUSD || 0) > 0) missingBadges.push('wealth-tracker');
            if (!loadedBadges.has('millionaire') && (netWorthUSD || 0) >= 1000000) missingBadges.push('millionaire');

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
    }, [assets.length, goals.length, netWorthUSD, profile?.id]);

    return { unlockedBadges };
}
