import { useAssetsQuery } from '@/features/assets/hooks/useAssetsQuery';
import { useLiabilitiesQuery } from '@/features/liabilities/hooks/useLiabilitiesQuery';
import { useGoalsQuery } from '@/features/goals/hooks/useGoalsQuery';
import { useNetWorth } from '@/features/dashboard/hooks/useNetWorth';
import { useFinancialSourceSelection } from '@/features/dashboard/hooks/useFinancialSourceSelection';
import { useHistory } from '@/hooks/useHistory';
import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';

export function useOnboardingProgress() {
    const { assets } = useAssetsQuery();
    const { liabilities } = useLiabilitiesQuery();
    const { goals } = useGoalsQuery();
    const { baseCurrency } = useNetWorth();
    const sourceState = useFinancialSourceSelection(baseCurrency);
    const { history } = useHistory();
    const [hasUsedMentors, setHasUsedMentors] = useState(false);
    const pathname = usePathname();
    const isLoading = sourceState.isLoading;
    const isError = sourceState.mode === 'error';

    // Check for mentor usage flag in localStorage
    // We also re-check when pathname changes, just in case they navigated back from mentors
    useEffect(() => {
        const checkMentors = () => {
            const used = localStorage.getItem('has_used_mentors') === 'true';
            setHasUsedMentors(used);
        };

        checkMentors();
        window.addEventListener('storage', checkMentors); // Listen for cross-tab or same-tab updates
        return () => window.removeEventListener('storage', checkMentors);
    }, [pathname]);

    let hasModernAsset = false;
    let hasModernLiability = false;

    if (sourceState.mode === 'modern_usable' || sourceState.mode === 'modern_missing_balances') {
        const allAccounts = [
            ...(sourceState.summary?.accounts || []),
            ...(sourceState.summary?.unrecorded_accounts || [])
        ];
        hasModernAsset = allAccounts.some(a => a.account_type === 'asset');
        hasModernLiability = allAccounts.some(a => a.account_type === 'liability');
    }

    // Why this exists:
    // A user who already has accounts but zero debts is genuinely debt-free — showing an
    // incomplete "Track a liability" step contradicts the Debt-Free banner and the unlocked
    // Debt Slayer badge. For that case we swap the step for recording a net worth snapshot,
    // which is the actually-missing piece of their setup. Brand-new users (nothing tracked yet)
    // keep the liability step.
    const hasAnyAccounts = assets.length > 0 || hasModernAsset;
    const isDebtFree = liabilities.length === 0 && !hasModernLiability;

    // Derived state for tasks
    const tasks = [
        {
            id: 'first-asset',
            label: 'Add your first asset',
            done: assets.length > 0 || hasModernAsset,
            href: '/assets'
        },
        isDebtFree && hasAnyAccounts
            ? {
                id: 'first-snapshot',
                label: 'Record a net worth snapshot',
                done: history.length > 0,
                href: '/timemachine'
            }
            : {
                id: 'first-liability',
                label: 'Track a liability',
                done: liabilities.length > 0 || hasModernLiability,
                href: '/liabilities'
            },
        {
            id: 'first-goal',
            label: 'Set a financial goal',
            done: goals.length > 0,
            href: '/goals'
        },
        {
            id: 'explore-mentors',
            label: 'Chat with a mentor',
            done: hasUsedMentors,
            href: '/mentors'
        },
    ];

    const completedCount = tasks.filter(t => t.done).length;
    const progress = (completedCount / tasks.length) * 100;

    return { tasks, progress, completedCount, isLoading, isError };
}
