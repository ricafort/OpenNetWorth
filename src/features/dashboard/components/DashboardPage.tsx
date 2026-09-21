'use client';

import dynamic from 'next/dynamic';
import DashboardHeader from '@/features/dashboard/components/DashboardHeader';
import OnboardingProgress from '@/features/onboarding/components/OnboardingProgress';
import DashboardModals from '@/features/dashboard/modals/DashboardModals';
import WidgetDrawer from '@/features/dashboard/components/WidgetDrawer';
import AchievementBadges from '@/features/gamification/components/AchievementBadges';
import AccountFreshnessCard from '@/features/sync/components/AccountFreshnessCard';
import WelcomeScreen from '@/features/dashboard/components/WelcomeScreen';
import { useFirstRun } from '@/hooks/useFirstRun';
import { useProfile } from '@/contexts/ProfileContext';

// Dynamic import for the heavy grid component
const DashboardGrid = dynamic(() => import('@/features/dashboard/components/DashboardGrid'), {
    ssr: false,
    loading: () => <div className="h-96 w-full bg-slate-50/50 rounded-3xl animate-pulse" />
});

/**
 * Main Dashboard Feature Component
 * Contains all the logic and layout for the user dashboard.
 */
export const DashboardPage = () => {
    const { isFirstRun, markInitialized } = useFirstRun();
    const { profile, isDemoMode } = useProfile();

    // Don't show welcome screen if:
    // 1. We are in God Mode / Demo Mode (isDemoMode = true)
    // 2. We are logged in as Admin (profile.role = 'admin')
    const showWelcome = isFirstRun && !isDemoMode && profile?.role !== 'admin';

    return (
        <div className="space-y-4 md:space-y-8 pb-20">
            {showWelcome && <WelcomeScreen onStartManual={markInitialized} onClose={markInitialized} />}

            <DashboardHeader />

            {/* 
              * Account Freshness & Coverage Disclosure
              * Why this exists:
              * Positions data completeness and missing-balance disclosures prominently at the top,
              * ensuring users understand whether totals are complete before interpreting widget figures.
              * Tricky logic:
              * AccountFreshnessCard automatically hides itself when zero accounts exist, keeping clean onboarding.
              * TODO: Add 1-click filter to view only unobserved accounts in the accounts table.
              */}
            <div className="w-full transform transition-all duration-300 ease-in-out">
                <AccountFreshnessCard />
            </div>

            <OnboardingProgress />

            <AchievementBadges />

            {/* Main Draggable Grid */}
            <DashboardGrid />

            {/* Components for Edit Mode */}
            <WidgetDrawer />

            {/* Modals (Settings, Check-ins, etc.) */}
            <DashboardModals />
        </div>
    );
};
