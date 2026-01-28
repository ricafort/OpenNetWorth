'use client';

import { useEffect, useState } from 'react';
import { useDashboard } from '@/contexts/DashboardContext';
import { useProfile } from '@/contexts/ProfileContext'; // Added
import { createClient } from '@/utils/supabase/client';
import { Lock } from 'lucide-react';

const BADGES = [
    { id: 'first-steps', name: 'First Steps', icon: '🎯', description: 'Add your first asset' },
    { id: 'goal-setter', name: 'Goal Setter', icon: '🏆', description: 'Create a financial goal' },
    { id: 'wealth-tracker', name: 'Wealth Tracker', icon: '📊', description: 'Achieve positive net worth' },
    { id: 'debt-slayer', name: 'Debt Slayer', icon: '⚔️', description: 'Pay off a liability completely' },
    { id: 'consistency', name: 'Consistent', icon: '🔥', description: '3-day check-in streak' },
    { id: 'millionaire', name: 'Millionaire', icon: '💎', description: 'Reach $1M Net Worth' },
];

export default function AchievementBadges() {
    const { assets, liabilities, goals, metrics, metricsUSD, netWorthHistory } = useDashboard();

    // Get the *Active* profile (could be the authorized user OR a simulated template)
    const { profile } = useProfile();

    const [unlockedBadges, setUnlockedBadges] = useState<Set<string>>(new Set());
    const supabase = createClient();

    // Fetch badges from the database (Persistent Truth)
    useEffect(() => {
        async function fetchBadges() {
            // Validate: Must be a real UUID (not 'local_user') and exist
            const isUUID = (str: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str);

            console.log("AchievementBadges: Checking Profile:", profile);

            if (!profile?.id || !isUUID(profile.id)) {
                console.log("AchievementBadges: Profile Invalid or Local", profile?.id);
                return;
            }

            // Query badges specifically for the ACTIVE profile ID
            // Explicitly use the public client to ensure RLS policies apply correctly
            const { data, error } = await supabase
                .from('user_badges')
                .select('badge_id')
                .eq('user_id', profile.id);

            if (error) {
                console.error("AchievementBadges: Supabase Error:", error);
            }

            if (data) {
                console.log("AchievementBadges: Found Badges:", data.length);
                const loadedBadges = new Set((data as { badge_id: string }[]).map(b => b.badge_id));
                setUnlockedBadges(loadedBadges);

                // --- AUTO GRANT CHECK (Recovery/Sync) ---
                // If local state qualifies for a badge but it is NOT in DB, grant it now.
                // This handles cases where triggers missed (e.g. data imported locally but not synced perfectly via individual inserts)
                const missingBadges: string[] = [];

                if (!loadedBadges.has('first-steps') && assets.length > 0) missingBadges.push('first-steps');
                if (!loadedBadges.has('goal-setter') && goals.length > 0) missingBadges.push('goal-setter');
                if (!loadedBadges.has('wealth-tracker') && (metricsUSD?.netWorth || 0) > 0) missingBadges.push('wealth-tracker');
                if (!loadedBadges.has('millionaire') && (metricsUSD?.netWorth || 0) >= 1000000) missingBadges.push('millionaire');

                if (missingBadges.length > 0) {
                    console.log("AchievementBadges: Granting missing badges...", missingBadges);

                    // We call the server function 'award_badge' for each. 
                    // Ideally we could batch, but simple loop is fine for rare event.
                    // Note: award_badge is a Postgres function we can call via RPC.
                    missingBadges.forEach(async (badgeId) => {
                        const { error } = await supabase.rpc('award_badge', {
                            target_user_id: profile.id,
                            badge_slug: badgeId
                        });
                        if (!error) {
                            loadedBadges.add(badgeId); // Update local state immediately
                            setUnlockedBadges(new Set(loadedBadges));
                        } else {
                            console.error("Failed to grant badge:", badgeId, error);
                        }
                    });
                }
            }
        }

        if (profile?.id === 'local_user') {
            // --- LOCAL GUEST MODE CALCULATION ---
            const localUnlocked = new Set<string>();

            // 1. First Steps (Asset > 0)
            if (assets.length > 0) localUnlocked.add('first-steps');

            // 2. Goal Setter (Goal > 0)
            if (goals.length > 0) localUnlocked.add('goal-setter');

            // 3. Wealth Tracker (NW > 0)
            // metrics can be null initially
            if ((metricsUSD?.netWorth || 0) > 0) localUnlocked.add('wealth-tracker');

            // 4. Debt Slayer (Liabilities = 0 OR Paid off? checking for 0 liabilities is easiest proxy for "Debt Free" or "Slayer")
            // The badge says "Pay off a liability completely". Hard to track event locally without history.
            // Proxy: If liabilities exist but Total is 0?
            // Let's just check if we have 0 liabilities but we HAVE assets (so not just empty state).
            // Actually, usually "Slayer" means paying one off.
            // Let's skip complex logic for guest for now or just check if liabilities.length > 0 and metricsUSD.totalLiabilities === 0?
            // Let's stick to safe ones.

            // 5. Millionaire
            if ((metricsUSD?.netWorth || 0) >= 1000000) localUnlocked.add('millionaire');

            setUnlockedBadges(localUnlocked);

        } else {
            // --- SUPABASE MODE ---
            fetchBadges();
        }

        // Optional: Realtime subscription could go here
    }, [assets, liabilities, goals, metricsUSD, supabase, profile?.id]); // Re-fetch/Re-calc on any data change
    // Ideally, we re-fetch when 'assets' change because our Trigger might have just fired.
    // For now, dependency on 'assets' length implies a change happened.

    // Fallback: Hybrid approach? 
    // The previous logic was "Consistency" badge = streak calculation.
    // Database triggers can't easily calculate "Streak" without complex history queries or a scheduled job.
    // So for "Consistency" (Streak), we might keep doing it client-side OR build a better backend job.
    // Proposal said "Move Badge logic... to Server-Side". 
    // Let's assume 'Consistency' is hard to trigger via simple SQL triggers on other tables.
    // We can leave 'Consistency' as client-side derived for now, OR remove it if strictly following Spec.
    // Let's keep it derived for the visual demo, but 'first-steps' comes from DB.

    // HYBRID CHECKER
    const isUnlocked = (id: string) => {
        // 1. Check DB Persistence
        if (unlockedBadges.has(id)) return true;

        // 2. Client-Side Calculation (Legacy/Fallback for tricky ones like Streak)
        // We preserve 'Consistency' here because we didn't write a DB trigger for it yet.
        if (id === 'consistency') {
            // ... logic from before ...
            // We'd need to re-implement calculateStreak helper if we want to keep it.
            return false; // Disabling for now to strictly test persistence, or re-add helper.
        }

        return false;
    };

    return (
        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm mt-8">
            <h3 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
                <span>Achievements</span>
                <span className="text-xs font-normal text-slate-500 bg-slate-100 px-2 py-1 rounded-full">
                    {BADGES.filter(b => isUnlocked(b.id)).length} / {BADGES.length}
                </span>
            </h3>

            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                {BADGES.map(badge => {
                    const unlocked = isUnlocked(badge.id);
                    return (
                        <div
                            key={badge.id}
                            className={`relative p-4 rounded-2xl border flex flex-col items-center text-center transition-all ${unlocked
                                ? 'bg-amber-50/50 border-amber-100'
                                : 'bg-slate-50 border-slate-100 opacity-60 grayscale'
                                }`}
                        >
                            <div className="text-3xl mb-2">{badge.icon}</div>
                            <h4 className={`text-sm font-bold mb-1 ${unlocked ? 'text-slate-900' : 'text-slate-500'}`}>
                                {badge.name}
                            </h4>
                            <p className="text-[10px] text-slate-500 leading-tight">
                                {badge.description}
                            </p>

                            {!unlocked && (
                                <div className="absolute top-2 right-2 text-slate-300">
                                    <Lock size={12} />
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
