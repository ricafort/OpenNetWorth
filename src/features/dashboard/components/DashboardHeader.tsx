'use client';

import { useDashboard } from '@/features/dashboard/context/DashboardContext';
import { useNetWorth } from '@/features/dashboard/hooks/useNetWorth';
import { useOnboarding } from '@/features/onboarding/context/OnboardingContext';
import { useProfile } from '@/contexts/ProfileContext';
import { useState, useRef, useEffect } from 'react';
import { LogOut, User, Moon, Sun, ChevronDown, RotateCcw, Check, PlayCircle, Settings, Gamepad2, LayoutGrid, Globe } from 'lucide-react';
import Link from 'next/link';
import ThemeToggle from '@/components/ui/ThemeToggle';
import CurrencySelector from '@/components/ui/CurrencySelector';
import { createClient } from '@/utils/supabase/client';

export default function DashboardHeader() {
    const { isEditMode, setIsEditMode, openSettings, resetLayout } = useDashboard();
    const { baseCurrency } = useNetWorth();
    const { startTour } = useOnboarding();
    const { updateCurrency, profile } = useProfile();
    const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
    const menuRef = useRef<HTMLDivElement>(null);

    // Close menu when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
                setIsUserMenuOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    return (
        <div className="flex flex-col md:flex-row md:justify-between md:items-end gap-4 px-1">
            <div>
                <h2 className="text-3xl font-black text-foreground tracking-tight">Financial Overview</h2>
                <p className="text-muted-foreground mt-2 font-medium">
                    {isEditMode
                        ? "Customizing your dashboard layout..."
                        : "Welcome back. Here's your net worth today."}
                </p>
            </div>

            <div className="flex items-center gap-2">
                {isEditMode ? (
                    <div className="flex items-center gap-2 animate-in fade-in slide-in-from-right-4 duration-300">
                        <button
                            onClick={resetLayout}
                            className="flex items-center gap-2 px-4 py-2 text-sm font-bold text-red-600 bg-red-50 hover:bg-red-100 rounded-xl transition-colors"
                        >
                            <RotateCcw size={16} />
                            Reset Layout
                        </button>
                        <button
                            onClick={() => setIsEditMode(false)}
                            className="flex items-center gap-2 px-6 py-2 text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-sm transition-all active:scale-95"
                        >
                            <Check size={16} />
                            Done Editing
                        </button>
                    </div>
                ) : (
                    <>
                        <button
                            onClick={startTour}
                            className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-full transition-colors"
                            title="Restart Tour"
                        >
                            <PlayCircle size={20} />
                        </button>

                        <button
                            onClick={openSettings}
                            className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors"
                            title="App Settings"
                        >
                            <Settings size={20} />
                        </button>

                        {!updateCurrency && ( // updateCurrency is just a proxy for checking if we have a profile context loaded properly? No.
                            // Actually useProfile returns { profile }. If profile is null/undefined = Guest.
                            false // placeholder
                        )}


                        <button
                            onClick={async () => {
                                if (window.confirm('Reset and choose a new profile? This will clear your current local data and log you out.')) {
                                    // 1. Explicitly sign out of Supabase to ensure we fallback to Guest Mode (LocalStorage)
                                    // This is critical because "Demo Mode" data is written to LocalStorage.
                                    const supabase = createClient();
                                    await supabase.auth.signOut();

                                    // 2. Clear all local data to trigger "First Run" / "Welcome Screen" again
                                    localStorage.clear();
                                    window.location.href = '/'; // Redirect to root to clear URL params
                                }
                            }}
                            className="p-2 text-indigo-500 hover:text-indigo-700 hover:bg-indigo-50 rounded-full transition-colors"
                            title="Reset / Choose Demo Profile"
                            data-tour="demo-mode-button"
                        >
                            <Gamepad2 size={20} />
                        </button>

                        {/* Currency Selector */}
                        <div className="flex items-center gap-2 pl-2 border-l border-border ml-1">
                            <span className="text-sm font-bold text-slate-500 flex items-center gap-1 hidden sm:flex">
                                <Globe size={14} /> Currency:
                            </span>
                            <CurrencySelector
                                value={baseCurrency}
                                onChange={(code) => {
                                    // Use Context Action
                                    updateCurrency(code);
                                    // No reload needed! React state will propagate.
                                }}
                            />
                        </div>

                        <button
                            onClick={() => setIsEditMode(true)}
                            className="ml-2 flex items-center gap-2 px-4 py-2 text-sm font-bold text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 hover:border-slate-300 rounded-xl transition-all shadow-sm"
                            title="Customize Dashboard Layout"
                        >
                            <LayoutGrid size={16} />
                            <span className="hidden sm:inline">Customize</span>
                        </button>

                        {/* User Profile Menu */}
                        <div className="relative ml-2" ref={menuRef}>
                            <button
                                onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                                className="flex items-center gap-2 p-1 pr-3 rounded-full bg-white border border-slate-200 shadow-sm hover:shadow-md transition-all group"
                            >
                                <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white font-bold text-xs ring-2 ring-white group-hover:ring-blue-100 transition-all">
                                    {profile?.email?.substring(0, 2).toUpperCase() || 'GU'}
                                </div>
                                <div className="hidden md:block text-left text-xs mr-1">
                                    <p className="font-bold text-slate-700 leading-none max-w-[80px] truncate">{profile?.full_name || profile?.email || 'Guest'}</p>
                                </div>
                                <ChevronDown size={14} className="text-slate-400 group-hover:text-slate-600" />
                            </button>

                            {isUserMenuOpen && (
                                <div className="absolute right-0 top-full mt-2 w-64 bg-white rounded-2xl shadow-xl border border-slate-100 p-2 z-50 animate-in fade-in zoom-in-95 duration-200">
                                    <div className="p-3 border-b border-slate-50 mb-2">
                                        <p className="font-bold text-slate-900">{profile?.full_name || profile?.email || 'Guest User'}</p>
                                        <p className="text-xs text-slate-500 truncate">{profile?.email || 'Not signed in'}</p>
                                        <div className="mt-2 flex items-center gap-2">
                                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${profile?.id === 'local_user' ? 'bg-orange-100 text-orange-700' : 'bg-emerald-100 text-emerald-700'}`}>
                                                {profile?.id === 'local_user' ? 'Guest Mode' : 'Pro Plan'}
                                            </span>
                                        </div>
                                    </div>

                                    {profile?.id && profile.id !== 'local_user' ? (
                                        <button
                                            onClick={async () => {
                                                const { createClient } = await import('@/utils/supabase/client');
                                                const supabase = createClient();
                                                await supabase.auth.signOut();
                                                window.location.href = '/';
                                            }}
                                            className="w-full flex items-center gap-3 px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-50 rounded-xl transition-colors"
                                        >
                                            <LogOut size={16} />
                                            Log Out
                                        </button>
                                    ) : (
                                        <Link
                                            href="/login"
                                            className="w-full flex items-center gap-3 px-3 py-2 text-sm font-bold text-blue-600 hover:bg-blue-50 rounded-xl transition-colors"
                                        >
                                            <User size={16} />
                                            Sign In / Sync
                                        </Link>
                                    )}
                                </div>
                            )}
                        </div>
                    </>
                )}
            </div>
        </div >
    );
}
