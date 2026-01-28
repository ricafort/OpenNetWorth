'use client';

import DashboardHeader from '@/components/DashboardHeader';
import OnboardingProgress from '@/components/OnboardingProgress';
import DashboardModals from '@/components/DashboardModals';
import WidgetDrawer from '@/components/WidgetDrawer';
import AchievementBadges from '@/components/AchievementBadges';
import BankStatusCard from '@/components/bank/BankStatusCard';
import dynamic from 'next/dynamic';

import WelcomeScreen from '@/components/WelcomeScreen';
import { useFirstRun } from '@/hooks/useFirstRun';

const DashboardGrid = dynamic(() => import('@/components/DashboardGrid'), {
  ssr: false,
  loading: () => <div className="h-96 w-full bg-slate-50/50 rounded-3xl animate-pulse" />
});

import { useProfile } from '@/contexts/ProfileContext';

export default function DashboardPage() {
  const { isFirstRun, markInitialized } = useFirstRun();
  const { profile, isDemoMode } = useProfile();

  // Don't show welcome screen if:
  // 1. We are in God Mode / Demo Mode (isDemoMode = true)
  // 2. We are logged in as Admin (profile.role = 'admin')
  const showWelcome = isFirstRun && !isDemoMode && profile?.role !== 'admin';

  return (
    <div className="space-y-4 md:space-y-8 pb-20">
      {showWelcome && <WelcomeScreen onStartManual={markInitialized} />}

      <DashboardHeader />

      <OnboardingProgress />

      <AchievementBadges />

      {/* Main Draggable Grid */}
      <DashboardGrid />

      <div className="mx-auto max-w-2xl transform transition-all duration-500 ease-in-out mt-8">
        <BankStatusCard />
      </div>

      {/* Components for Edit Mode */}
      <WidgetDrawer />

      {/* Modals (Settings, Check-ins, etc.) */}
      <DashboardModals />
    </div>
  );
}
