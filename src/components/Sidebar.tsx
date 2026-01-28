'use client';

import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import { LayoutDashboard, Wallet, CreditCard, Users, Shield, Target, Menu, X, DollarSign, Calendar, TrendingUp } from 'lucide-react';
import { useState } from 'react';
import ThemeToggle from './ThemeToggle';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

const navigation = [
    { name: 'Dashboard', href: '/', icon: LayoutDashboard },
    { name: 'Assets', href: '/assets', icon: Wallet },
    { name: 'Liabilities', href: '/liabilities', icon: CreditCard },
    { name: 'Goals', href: '/goals', icon: Target },
    { name: 'Cash Flow', href: '/cashflow', icon: DollarSign },
    { name: 'Growth Engine', href: '/portfolio', icon: TrendingUp },
    { name: 'Freedom', href: '/freedom', icon: Calendar },
    { name: 'Mentors', href: '/mentors', icon: Users },
    { name: 'Privacy', href: '/privacy', icon: Shield },
];

import { useProfile } from '@/contexts/ProfileContext';

export default function Sidebar() {
    const pathname = usePathname();
    const searchParams = useSearchParams();
    const [isMobileOpen, setIsMobileOpen] = useState(false);
    const { isDemoMode, profile } = useProfile();

    // Fallback for "God Mode" badge if URL param is present even if context hasn't loaded yet
    const simulatedProfileId = searchParams.get('simulatedProfileId');
    const showGodMode = isDemoMode || !!simulatedProfileId;
    const templateName = profile?.template_name || profile?.full_name || 'Template';

    return (
        <>
            {/* Mobile Trigger */}
            <button
                onClick={() => setIsMobileOpen(!isMobileOpen)}
                className="md:hidden fixed top-4 right-4 z-50 p-2 bg-white rounded-lg shadow-sm border border-slate-200 text-slate-600"
            >
                {isMobileOpen ? <X size={20} /> : <Menu size={20} />}
            </button>

            {/* Sidebar Container */}
            <div className={cn(
                "fixed inset-y-0 left-0 z-40 w-64 bg-card border-r border-border transform transition-transform duration-200 ease-in-out md:translate-x-0",
                isMobileOpen ? "translate-x-0" : "-translate-x-full"
            )}>
                <div className="flex flex-col h-full">
                    {/* Logo */}
                    <div className="h-16 flex items-center px-6 border-b border-border">
                        <span className="text-xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                            ClearWorth
                        </span>
                        {showGodMode && (
                            <div className="ml-2 flex flex-col items-start leading-none">
                                <span className="px-1.5 py-0.5 bg-red-100 text-red-600 text-[10px] font-bold rounded uppercase border border-red-200">
                                    GOD
                                </span>
                                <span className="text-[10px] text-muted-foreground font-medium mt-0.5 max-w-[80px] truncate">
                                    {templateName}
                                </span>
                            </div>
                        )}
                    </div>

                    {/* Navigation */}
                    <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
                        {navigation.map((item) => {
                            const isActive = pathname === item.href;

                            // Append query param if in God Mode
                            let finalHref = item.href;
                            if (simulatedProfileId) {
                                finalHref += `?simulatedProfileId=${simulatedProfileId}`;
                            }

                            return (
                                <Link
                                    key={item.href}
                                    href={finalHref}
                                    onClick={() => setIsMobileOpen(false)}
                                    className={cn(
                                        "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200",
                                        isActive
                                            ? "bg-blue-50 text-blue-700 shadow-sm"
                                            : "text-muted-foreground hover:bg-muted hover:text-foreground"
                                    )}
                                    data-tour={`sidebar-${item.name.toLowerCase().replace(' ', '')}`}
                                >
                                    <item.icon size={20} className={cn(isActive ? "text-blue-600" : "text-slate-400 group-hover:text-muted-foreground")} />
                                    {item.name}
                                </Link>
                            );
                        })}
                    </nav>

                    {/* User Profile / Footer */}
                    <div className="p-4 border-t border-border flex flex-col gap-4">
                        <ThemeToggle />

                        <div className="flex items-center gap-3 p-2 rounded-lg bg-muted border border-border">
                            <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-blue-500 to-indigo-500 flex items-center justify-center text-white font-bold text-xs ring-2 ring-white">
                                {profile?.email?.substring(0, 2).toUpperCase() || 'JD'}
                            </div>
                            <div className="overflow-hidden flex-1">
                                <p className="text-sm font-bold text-foreground truncate">
                                    {profile?.full_name || 'Guest User'}
                                </p>
                                <p className="text-xs text-muted-foreground truncate">
                                    {profile?.email}
                                </p>
                            </div>
                        </div>

                        {/* Auth Buttons */}
                        {profile?.id && profile.id !== 'local_user' ? (
                            <button
                                onClick={async () => {
                                    const { createClient } = await import('@/utils/supabase/client');
                                    const supabase = createClient();
                                    await supabase.auth.signOut();
                                    window.location.href = '/';
                                }}
                                className="w-full flex items-center justify-center gap-2 px-3 py-2 text-xs font-bold text-red-600 bg-red-50 hover:bg-red-100 rounded-lg transition-colors"
                            >
                                <span className="opacity-90">Log Out</span>
                            </button>
                        ) : (
                            <Link
                                href="/login"
                                className="w-full flex items-center justify-center gap-2 px-3 py-2 text-xs font-bold text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors"
                            >
                                Sign In / Sync Cloud
                            </Link>
                        )}
                    </div>
                </div>
            </div>

            {/* Overlay for mobile */}
            {isMobileOpen && (
                <div
                    className="fixed inset-0 bg-black/20 z-30 md:hidden backdrop-blur-sm"
                    onClick={() => setIsMobileOpen(false)}
                />
            )}
        </>
    );
}
