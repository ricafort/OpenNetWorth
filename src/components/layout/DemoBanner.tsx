/**
 * Why this file exists:
 * Displays a non-intrusive status banner when the user is previewing a sample profile
 * or benchmark data in OpenNetWorth, providing one-click options to reset or keep.
 *
 * Tricky logic:
 * - In local-first mode, "Keep Data" simply converts the sample profile into the user's
 *   active on-device vault without prompting for remote SaaS account creation.
 *
 * TODO items:
 * - Support saving multiple local profiles/vaults with a fast local switcher.
 */

'use client';

import { isDemoMode, exitDemoMode } from '@/features/demo/demoMode';
import { AlertCircle, X, Sparkles, RotateCcw } from 'lucide-react';
import { useEffect, useState } from 'react';

export default function DemoBanner() {
    const [visible, setVisible] = useState(false);
    const [label, setLabel] = useState<string>('');

    useEffect(() => {
        setVisible(isDemoMode());
        const savedLabel = localStorage.getItem('opennetworth_demo_profile_label') ||
            localStorage.getItem('clearworth_demo_profile_label') ||
            'Sample Data';
        setLabel(savedLabel);
    }, []);

    if (!visible) return null;

    return (
        <div className="bg-amber-50 dark:bg-amber-950/40 border-b border-amber-200 dark:border-amber-800/60 px-4 py-2.5">
            <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
                <div className="flex items-center gap-2 text-amber-900 dark:text-amber-200 text-xs font-semibold">
                    <Sparkles size={15} className="text-amber-600 dark:text-amber-400 shrink-0" />
                    <span>Sample Data Mode: Viewing <strong>{label}</strong>.</span>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                    <button
                        onClick={() => {
                            if (confirm('Adopt this sample data as your permanent local vault?')) {
                                import('@/features/demo/demoMode').then(m => m.convertDemoToReal(true));
                            }
                        }}
                        className="text-xs font-bold bg-white dark:bg-slate-900 text-amber-900 dark:text-amber-200 border border-amber-200 dark:border-amber-700 hover:bg-amber-100 dark:hover:bg-slate-800 px-3 py-1 rounded-full transition-colors shadow-sm"
                    >
                        Keep as My Vault
                    </button>
                    <button
                        onClick={exitDemoMode}
                        className="text-xs font-bold bg-amber-200 dark:bg-amber-900/60 hover:bg-amber-300 dark:hover:bg-amber-800 text-amber-900 dark:text-amber-200 px-3 py-1 rounded-full transition-colors flex items-center gap-1"
                    >
                        <RotateCcw size={12} />
                        Exit Sample Data
                    </button>
                </div>
            </div>
        </div>
    );
}
