/**
 * Why this file exists:
 * Displays a non-intrusive status banner while the user previews a read-only
 * sample persona (Phase 2.7), with one-click exit back to the real vault.
 *
 * Tricky logic:
 * - Visibility follows ProfileContext (the URL/cookie are the source of truth),
 *   so the banner reacts to persona switches without polling.
 * - There is deliberately no "Keep as My Vault" action: persona data lives in a
 *   separate read-only SQLite file and can never be adopted into the live vault.
 */

'use client';

import { exitDemoMode, demoPersonaLabel, readDemoPersona } from '@/features/demo/demoMode';
import { Sparkles, RotateCcw } from 'lucide-react';
import { useProfile } from '@/contexts/ProfileContext';

export default function DemoBanner() {
    const { isDemoMode } = useProfile();

    if (!isDemoMode) return null;

    const label = demoPersonaLabel(readDemoPersona());

    return (
        <div className="bg-amber-50 dark:bg-amber-950/40 border-b border-amber-200 dark:border-amber-800/60 px-4 py-2.5">
            <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
                <div className="flex items-center gap-2 text-amber-900 dark:text-amber-200 text-xs font-semibold">
                    <Sparkles size={15} className="text-amber-600 dark:text-amber-400 shrink-0" />
                    <span>Sample Data Mode: viewing <strong>{label}</strong> (read-only).</span>
                </div>
                <div className="flex items-center gap-2 shrink-0">
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
