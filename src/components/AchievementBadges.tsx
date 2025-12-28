'use client';

import { useDashboard } from '@/contexts/DashboardContext';
import { NetWorthSnapshot } from '@/types';
import { Lock } from 'lucide-react';

const BADGES = [
    { id: 'first-steps', name: 'First Steps', icon: '🎯', description: 'Add your first asset' },
    { id: 'goal-setter', name: 'Goal Setter', icon: '🏆', description: 'Create a financial goal' },
    { id: 'wealth-tracker', name: 'Wealth Tracker', icon: '📊', description: 'Achieve positive net worth' },
    { id: 'debt-slayer', name: 'Debt Slayer', icon: '⚔️', description: 'Pay off a liability completely' },
    { id: 'consistency', name: 'Consistent', icon: '🔥', description: '3-day check-in streak' },
    { id: 'millionaire', name: 'Millionaire', icon: '💎', description: 'Reach $1M Net Worth' },
];

function calculateStreak(history: NetWorthSnapshot[]): number {
    if (history.length < 2) return history.length;

    // Sort descending
    const sorted = [...history].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    let streak = 1;
    let currentDate = new Date(sorted[0].date);

    for (let i = 1; i < sorted.length; i++) {
        const prevDate = new Date(sorted[i].date);
        const diffTime = Math.abs(currentDate.getTime() - prevDate.getTime());
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        if (diffDays === 1) {
            streak++;
            currentDate = prevDate;
        } else if (diffDays === 0) {
            // Same day, continue
            continue;
        } else {
            break;
        }
    }
    return streak;
}

export default function AchievementBadges() {
    const { assets, liabilities, goals, metrics, netWorthHistory } = useDashboard();

    const streak = calculateStreak(netWorthHistory);

    const isUnlocked = (id: string) => {
        switch (id) {
            case 'first-steps': return assets.length > 0;
            case 'goal-setter': return goals.length > 0;
            case 'wealth-tracker': return metrics.netWorth > 0;
            case 'debt-slayer':
                // Either no liabilities (if they had some?) OR one exists with 0 balance
                // To avoid unlocking immediately for new users with 0 liabilities, let's say:
                // Must have at least 1 liability in history? Hard to track.
                // Simple rule: Have liabilities list, but one has balance 0.
                return liabilities.some(l => l.balance === 0);
            case 'consistency': return streak >= 3;
            case 'millionaire': return metrics.netWorth >= 1000000;
            default: return false;
        }
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
