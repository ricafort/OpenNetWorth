'use client';

import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import { LayoutDashboard, Wallet, CreditCard, Users, Shield, Target, Menu, X, DollarSign, Calendar, TrendingUp, LogOut, User, BookOpen } from 'lucide-react';
import { useState, useEffect } from 'react';
import ThemeToggle from '@/components/ui/ThemeToggle';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

/**
 * Sidebar Navigation Structure
 * Why this structure exists:
 * Keeps original feature names for continuity while providing clear,
 * layman subtitles (e.g. Accounting -> My finances, Growth Engine -> Investments)
 * to help users instantly understand the destination of each section.
 */
const navigation = [
    { name: 'Dashboard', href: '/', icon: LayoutDashboard },
    { name: 'Accounting', href: '/accounting', icon: BookOpen, subtitle: 'My finances' },
    { name: 'Assets', href: '/assets', icon: Wallet, subtitle: 'What I own' },
    { name: 'Liabilities', href: '/liabilities', icon: CreditCard, subtitle: 'What I owe' },
    { name: 'Goals', href: '/goals', icon: Target },
    { name: 'Cash Flow', href: '/cashflow', icon: DollarSign, subtitle: 'Money in & out' },
    { name: 'Growth Engine', href: '/portfolio', icon: TrendingUp, subtitle: 'Investments' },
    { name: 'Freedom', href: '/freedom', icon: Calendar, subtitle: 'Debt payoff' },
    { name: 'Mentors', href: '/mentors', icon: Users, subtitle: 'AI Assistant' },
    { name: 'Privacy', href: '/privacy', icon: Shield },
];

import { useProfile } from '@/contexts/ProfileContext';

export default function Sidebar() {
    const pathname = usePathname();
    const searchParams = useSearchParams();
    const [isMobileOpen, setIsMobileOpen] = useState(false);
    const { isDemoMode, profile } = useProfile();

    // Close mobile drawer on Escape key press (Finding 8, UX-02)
    useEffect(() => {
        if (!isMobileOpen) return;
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                setIsMobileOpen(false);
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isMobileOpen]);

    // Fallback for "God Mode" badge if URL param is present even if context hasn't loaded yet
    const simulatedProfileId = searchParams.get('simulatedProfileId');
    const showGodMode = isDemoMode || !!simulatedProfileId;
    const templateName = profile?.template_name || profile?.full_name || 'Template';

    return (
        <>
            {/* Mobile Trigger */}
            <button
                onClick={() => setIsMobileOpen(!isMobileOpen)}
                aria-label={isMobileOpen ? "Close navigation menu" : "Open navigation menu"}
                aria-expanded={isMobileOpen}
                className="md:hidden fixed top-4 right-4 z-50 p-2 bg-card rounded-lg shadow-sm border border-border text-foreground hover:bg-muted transition-colors cursor-pointer"
            >
                {isMobileOpen ? <X size={20} /> : <Menu size={20} />}
            </button>

            {/* Mobile Backdrop */}
            {isMobileOpen && (
                <div
                    className="fixed inset-0 bg-black/50 z-30 md:hidden backdrop-blur-sm transition-opacity"
                    onClick={() => setIsMobileOpen(false)}
                    aria-hidden="true"
                />
            )}

            {/* Sidebar Container */}
            <div className={cn(
                "fixed inset-y-0 left-0 z-40 w-64 bg-card border-r border-border transform transition-transform duration-200 ease-in-out md:translate-x-0 flex flex-col",
                isMobileOpen ? "translate-x-0" : "-translate-x-full"
            )}>
                {/* Logo */}
                <div className="h-16 flex items-center px-6 border-b border-border shrink-0 justify-between">
                    <div className="flex items-center gap-2">
                        <span className="text-xl font-black bg-gradient-to-r from-blue-600 via-indigo-600 to-cyan-600 bg-clip-text text-transparent">
                            OpenNetWorth
                        </span>
                    </div>
                    <span className="text-[9px] font-extrabold uppercase px-1.5 py-0.5 bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 rounded border border-blue-200 dark:border-blue-800">
                        Local
                    </span>
                </div>

                {/* Navigation */}
                <div className="flex-1 overflow-y-auto">
                    <nav className="p-4 space-y-1">
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
                                        "flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200",
                                        isActive
                                            ? "bg-blue-50 text-blue-700 shadow-sm"
                                            : "text-muted-foreground hover:bg-muted hover:text-foreground"
                                    )}
                                    data-tour={`sidebar-${item.name.toLowerCase().replace(' ', '')}`}
                                >
                                    <item.icon size={20} className={cn(isActive ? "text-blue-600" : "text-slate-400 group-hover:text-muted-foreground", "shrink-0")} />
                                    <div className="flex flex-col min-w-0">
                                        <span className="leading-snug">{item.name}</span>
                                        {item.subtitle && (
                                            <span className={cn(
                                                "text-[10px] font-normal leading-none",
                                                isActive ? "text-blue-600/80" : "text-muted-foreground/70"
                                            )}>
                                                {item.subtitle}
                                            </span>
                                        )}
                                    </div>
                                </Link>
                            );
                        })}
                    </nav>
                </div>

                {/* User Profile / Footer */}
                <div className="p-4 border-t border-border shrink-0 flex flex-col gap-3">
                    <div className="flex items-center gap-3 mb-1 px-2">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white font-bold text-xs ring-2 ring-blue-100 shrink-0">
                            ON
                        </div>
                        <div className="flex flex-col flex-1 min-w-0">
                            <p className="text-sm font-bold text-slate-700 dark:text-slate-200 truncate">{profile?.full_name || 'Local Vault'}</p>
                            <p className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold truncate">🔒 100% On-Device</p>
                        </div>
                    </div>

                    <Link
                        href="/privacy"
                        onClick={() => setIsMobileOpen(false)}
                        className="w-full flex items-center gap-3 px-3 py-2 text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-muted rounded-lg transition-colors border border-border"
                    >
                        <Shield size={16} className="text-emerald-600" />
                        Backup / Restore Vault
                    </Link>

                    <div className="h-px bg-border my-1" />

                    <ThemeToggle />
                    <div className="text-[10px] text-center text-slate-300">
                        v 1.0.0
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
