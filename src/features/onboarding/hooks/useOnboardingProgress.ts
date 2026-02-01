import { useAssetsQuery } from '@/features/assets/hooks/useAssetsQuery';
import { useLiabilitiesQuery } from '@/features/liabilities/hooks/useLiabilitiesQuery';
import { useGoalsQuery } from '@/features/goals/hooks/useGoalsQuery';
import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';

export function useOnboardingProgress() {
    const { assets } = useAssetsQuery();
    const { liabilities } = useLiabilitiesQuery();
    const { goals } = useGoalsQuery();
    const [hasUsedMentors, setHasUsedMentors] = useState(false);
    const pathname = usePathname();

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

    // Derived state for tasks
    const tasks = [
        {
            id: 'first-asset',
            label: 'Add your first asset',
            done: assets.length > 0,
            href: '/assets'
        },
        {
            id: 'first-liability',
            label: 'Track a liability',
            done: liabilities.length > 0,
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

    return { tasks, progress, completedCount };
}
