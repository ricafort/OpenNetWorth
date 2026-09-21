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

import { useNetWorth } from '@/features/dashboard/hooks/useNetWorth';
import { useFinancialSourceSelection } from '@/features/dashboard/hooks/useFinancialSourceSelection';
import { Info } from 'lucide-react';

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
    const { baseCurrency } = useNetWorth();
    const sourceState = useFinancialSourceSelection(baseCurrency);

    // Why this exists:
    // Resolves Issue 3: Prominently discloses when legacy holdings coexist with modern accounts,
    // ensuring users know headline figures cover only double-entry accounting accounts.
    const hasExcludedLegacy = (sourceState.mode === 'modern_usable' || sourceState.mode === 'modern_missing_balances') && sourceState.hasExcludedLegacy;

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

            {/* Excluded Legacy Holdings Disclosure (Resolves Issue 3) */}
            {hasExcludedLegacy && (
                <div className="w-full p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-900 dark:text-amber-200 text-xs flex items-center gap-2.5">
                    <Info size={16} className="text-amber-600 dark:text-amber-400 shrink-0" />
                    <span>These figures cover your accounting accounts. Separately recorded assets and debts are not included.</span>
                </div>
            )}

            {/* Main Draggable Grid */}
            <DashboardGrid />

            <OnboardingProgress />

            <AchievementBadges />

            {/* Components for Edit Mode */}
            <WidgetDrawer />

            {/* Modals (Settings, Check-ins, etc.) */}
            <DashboardModals />
        </div>
    );
};
