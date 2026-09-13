'use client';

import { useState, useEffect } from 'react';
import Joyride, { CallBackProps, STATUS, Step } from 'react-joyride';
import { usePathname } from 'next/navigation';
import { useProfile } from '@/contexts/ProfileContext';
import { useOnboarding } from '@/features/onboarding/context/OnboardingContext';

export default function OnboardingTour() {
    const { run, startTour, stopTour } = useOnboarding();
    const { profile, isLoading } = useProfile();
    const pathname = usePathname();

    const steps: Step[] = [
        {
            target: 'body',
            content: (
                <div className="text-left">
                    <h3 className="font-bold text-lg mb-2">Welcome to OpenNetWorth! 🚀</h3>
                    <p>Your 100% private, on-device financial command center powered by local AI.</p>
                </div>
            ),
            placement: 'center',
            disableBeacon: true,
        },
        {
            target: '[data-tour="sidebar-dashboard"]',
            content: 'This is your Command Center. See your Net Worth, Cash Flow, and key metrics at a glance.',
        },
        {
            target: '[data-tour="sidebar-assets"]',
            content: 'Start here! Add your bank accounts, investments, and property to track what you own.',
        },
        {
            target: '[data-tour="sidebar-liabilities"]',
            content: 'Track your debts here. We\'ll help you create a payoff strategy to become debt-free faster.',
        },
        {
            target: '[data-tour="sidebar-goals"]',
            content: 'Set meaningful financial targets. Tracking progress makes you 42% more likely to achieve them!',
        },
        {
            target: '[data-tour="demo-mode-button"]',
            content: (
                <div>
                    <h4 className="font-bold mb-1">Want to explore first?</h4>
                    <p>Click this controller icon to load realistic sample data and see the app in action instantly!</p>
                </div>
            ),
        }
    ];

    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
        // Only run on dashboard and if not completed before
        const hasCompletedTour = localStorage.getItem('clearworth_tour_completed');
        const isDemo = localStorage.getItem('clearworth_demo_mode') === 'true';
        const isInitialized = localStorage.getItem('clearworth_initialized') === 'true';

        // Wait for profile to load before making decisions
        if (isLoading) return;

        // Check if user is "old" (created > 1 hour ago) to avoid pestering existing users
        // This handles cross-device cases where localStorage might be empty
        const isExistingUser = profile?.created_at && (Date.now() - new Date(profile.created_at).getTime() > 1000 * 60 * 60);

        // Conditions:
        // 1. Not completed tour (locally)
        // 2. On dashboard
        // 3. User passed welcome screen (isInitialized)
        // 4. NOT in demo mode (user asked not to show it there)
        // 5. NOT an existing user (prevent spamming old accounts)
        if (!hasCompletedTour && pathname === '/' && isInitialized && !isDemo && !isExistingUser) {
            // Small delay to ensure layout is ready
            setTimeout(() => startTour(), 1000);
        }
    }, [pathname, startTour, profile, isLoading]);

    const handleJoyrideCallback = (data: CallBackProps) => {
        const { status } = data;

        if (status === STATUS.FINISHED || status === STATUS.SKIPPED) {
            stopTour();
            localStorage.setItem('clearworth_tour_completed', 'true');
        }
    };

    if (!mounted) return null;

    return (
        <Joyride
            steps={steps}
            run={run}
            continuous
            showProgress
            showSkipButton
            callback={handleJoyrideCallback}
            styles={{
                options: {
                    primaryColor: '#2563eb', // blue-600
                    zIndex: 1000,
                    textColor: '#0f172a',
                    backgroundColor: '#ffffff',
                },
                tooltipContainer: {
                    textAlign: 'left'
                },
                buttonNext: {
                    backgroundColor: '#2563eb',
                }
            }}
        />
    );
}
