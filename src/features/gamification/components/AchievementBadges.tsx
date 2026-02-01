'use client';

import { Lock } from 'lucide-react';
import { useAssetsQuery } from '@/features/assets/hooks/useAssetsQuery';
import { useGoalsQuery } from '@/features/goals/hooks/useGoalsQuery';
import { useNetWorth } from '@/features/dashboard/hooks/useNetWorth';
import { useBadgeSync } from '@/features/gamification/hooks/useBadgeSync';

const BADGES = [
    { id: 'first-steps', name: 'First Steps', icon: '🎯', description: 'Add your first asset' },
    { id: 'goal-setter', name: 'Goal Setter', icon: '🏆', description: 'Create a financial goal' },
    { id: 'wealth-tracker', name: 'Wealth Tracker', icon: '📊', description: 'Achieve positive net worth' },
    { id: 'debt-slayer', name: 'Debt Slayer', icon: '⚔️', description: 'Pay off a liability completely' },
    { id: 'consistency', name: 'Consistent', icon: '🔥', description: '3-day check-in streak' },
    { id: 'millionaire', name: 'Millionaire', icon: '💎', description: 'Reach $1M Net Worth' },
];

export default function AchievementBadges() {
    // 1. Get Data Context
    const { assets } = useAssetsQuery();
    const { goals } = useGoalsQuery();
    const { netWorthUSD } = useNetWorth();

    // 2. Delegate Logic to Hook (Abstraction)
    const { unlockedBadges } = useBadgeSync({
        assets,
        goals,
        netWorthUSD: netWorthUSD || 0
    });

    const isUnlocked = (id: string) => unlockedBadges.has(id);

    // 3. Render Pure UI
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
