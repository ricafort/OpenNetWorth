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

export default function DashboardPage() {
  const { isFirstRun, markInitialized } = useFirstRun();

  return (
    <div className="space-y-4 md:space-y-8 pb-20">
      {isFirstRun && <WelcomeScreen onStartManual={markInitialized} />}

      <DashboardHeader />

      <OnboardingProgress />

      <AchievementBadges />

      <div className="mx-auto max-w-2xl transform transition-all duration-500 ease-in-out">
        <BankStatusCard />
      </div>

      {/* Main Draggable Grid */}
      <DashboardGrid />

      {/* Components for Edit Mode */}
      <WidgetDrawer />

      {/* Modals (Settings, Check-ins, etc.) */}
      <DashboardModals />
    </div>
  );
}
