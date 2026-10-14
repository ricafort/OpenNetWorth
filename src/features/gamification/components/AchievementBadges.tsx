'use client';

import { useEffect, useMemo, useState } from 'react';
import { ChevronDown, ChevronUp, Lock } from 'lucide-react';
import { useAssetsQuery } from '@/features/assets/hooks/useAssetsQuery';
import { useGoalsQuery } from '@/features/goals/hooks/useGoalsQuery';
import { useNetWorth } from '@/features/dashboard/hooks/useNetWorth';
import { useHistory } from '@/hooks/useHistory';
import { useBadgeSync } from '@/features/gamification/hooks/useBadgeSync';
import { computeCheckInStreak } from '@/features/gamification/domain/achievementRules';
import { SUPPORTED_CURRENCIES } from '@/lib/utils/currencyService';

// Collapse preference for the badge grid. Hydrated on mount so SSR markup stays expanded.
const ACHIEVEMENTS_COLLAPSE_KEY = 'opennetworth:achievements-collapsed';

export default function AchievementBadges() {
    // 1. Get Data Context — authoritative accounting figures, not just legacy storage.
    //    (Legacy assets and USD-only balances previously left badges locked for users whose
    //    data lives in the modern accounting DB in a non-USD currency.)
    const { assets } = useAssetsQuery();
    const { goals } = useGoalsQuery();
    const { netWorth, baseCurrency, sourceState } = useNetWorth();
    const { history } = useHistory();

    const accounts = sourceState.mode === 'modern_usable' ? sourceState.accounts : [];
    const unrecorded = sourceState.summary?.unrecorded_accounts ?? [];

    const assetAccountCount = useMemo(() =>
        accounts.filter(a => a.account_type === 'asset').length +
        unrecorded.filter(u => u.account_type === 'asset').length,
        [accounts, unrecorded]);

    // Debt-free = no liability with a non-zero recorded balance AND none awaiting a first
    // balance (unknown debt is not proven zero). Being debt-free unlocks Debt Slayer.
    const hasAnyDebt = useMemo(() =>
        accounts.some(a => a.account_type === 'liability' && a.amount_cents !== 0) ||
        unrecorded.some(u => u.account_type === 'liability'),
        [accounts, unrecorded]);

    const checkInStreakDays = useMemo(() =>
        computeCheckInStreak(history.map(h => h.date)),
        [history]);

    // 2. Delegate Logic to Hook (Abstraction)
    const { unlockedBadges } = useBadgeSync({
        assets,
        goals,
        netWorthBase: sourceState.isLoading ? null : netWorth,
        assetAccountCount,
        hasAnyDebt,
        checkInStreakDays
    });

    const isUnlocked = (id: string) => unlockedBadges.has(id);

    // Collapse state persisted to localStorage (same pattern as AccountFreshnessCard).
    const [isCollapsed, setIsCollapsed] = useState(false);

    useEffect(() => {
        try {
            setIsCollapsed(localStorage.getItem(ACHIEVEMENTS_COLLAPSE_KEY) === 'true');
        } catch { /* storage unavailable — stay expanded */ }
    }, []);

    useEffect(() => {
        try {
            localStorage.setItem(ACHIEVEMENTS_COLLAPSE_KEY, String(isCollapsed));
        } catch { /* ignore */ }
    }, [isCollapsed]);

    // Disclose the currency the Millionaire badge is measured in — the same base currency
    // the dashboard displays its headline figures in. Uses the app's canonical symbol map
    // (locale-independent: AUD always renders "A$1M", never a bare ambiguous "$1M").
    const badges = useMemo(() => {
        const symbol = SUPPORTED_CURRENCIES.find(c => c.code === baseCurrency)?.symbol ?? baseCurrency;
        const millionLabel = `${symbol}1M`;

        return [
            { id: 'first-steps', name: 'First Steps', icon: '🎯', description: 'Add your first asset' },
            { id: 'goal-setter', name: 'Goal Setter', icon: '🏆', description: 'Create a financial goal' },
            { id: 'wealth-tracker', name: 'Wealth Tracker', icon: '📊', description: 'Achieve positive net worth' },
            { id: 'debt-slayer', name: 'Debt Slayer', icon: '⚔️', description: 'Be completely debt-free' },
            { id: 'consistency', name: 'Consistent', icon: '🔥', description: '3-day check-in streak' },
            { id: 'millionaire', name: 'Millionaire', icon: '💎', description: `Reach ${millionLabel} Net Worth` },
        ];
    }, [baseCurrency]);

    // 3. Render Pure UI
    return (
        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm mt-8">
            <div className="flex items-center justify-between gap-2 mb-4">
                <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                    <span>Achievements</span>
                    <span className="text-xs font-normal text-slate-500 bg-slate-100 px-2 py-1 rounded-full">
                        {badges.filter(b => isUnlocked(b.id)).length} / {badges.length}
                    </span>
                </h3>
                <button
                    onClick={() => setIsCollapsed(!isCollapsed)}
                    className="p-2 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition-colors border border-slate-200"
                    title={isCollapsed ? 'Expand achievements' : 'Collapse achievements'}
                    aria-label={isCollapsed ? 'Expand achievements' : 'Collapse achievements'}
                >
                    {isCollapsed ? <ChevronDown size={14} /> : <ChevronUp size={14} />}
                </button>
            </div>

            <div className={`grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 ${isCollapsed ? 'hidden' : ''}`}>
                {badges.map(badge => {
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
