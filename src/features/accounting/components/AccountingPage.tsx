/**
 * Milestone 1 Accounting Page Shell
 * 
 * Why this component exists:
 * Top-level view for Milestone 1 sovereign double-entry accounting engine.
 * Provides intuitive tab navigation between Daily Financial Events (Slice 1C)
 * and Accounts & Opening Balances (Slice 1B).
 * 
 * Tricky logic:
 * - Maintains active subtab in local state or URL query param to support deep-linking.
 * - Explains double-entry invariants in plain language.
 */

'use client';

import React, { useState } from 'react';
import { ShieldCheck, BookOpen, Layers, DollarSign } from 'lucide-react';
import { AccountManagementView } from './AccountManagementView';
import { DailyEventsView } from './DailyEventsView';

export const AccountingPage: React.FC = () => {
    const [activeTab, setActiveTab] = useState<'events' | 'accounts'>('events');

    return (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
            {/* Page Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-200 dark:border-slate-800 pb-5">
                <div>
                    <div className="flex items-center gap-2.5">
                        <div className="p-2 bg-indigo-100 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 rounded-lg">
                            <BookOpen className="w-6 h-6" />
                        </div>
                        <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                            Sovereign Accounting Engine
                        </h1>
                        <span className="text-[11px] font-semibold tracking-wide uppercase px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 border border-emerald-300 dark:border-emerald-800">
                            Milestone 1 Active
                        </span>
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1.5 max-w-2xl">
                        Local-first, double-entry financial ledger with exact minor-unit integer cents arithmetic.
                        No floating-point rounding errors, no untraced balances.
                    </p>
                </div>

                {/* Sub-tab Switcher */}
                <div className="flex bg-slate-100 dark:bg-slate-800/70 p-1 rounded-xl border border-slate-200 dark:border-slate-700/60 text-xs font-semibold">
                    <button
                        onClick={() => setActiveTab('events')}
                        className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg transition ${activeTab === 'events' ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-sm' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'}`}
                    >
                        <DollarSign className="w-4 h-4" />
                        <span>Daily Events & Ledger</span>
                    </button>
                    <button
                        onClick={() => setActiveTab('accounts')}
                        className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg transition ${activeTab === 'accounts' ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-sm' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'}`}
                    >
                        <Layers className="w-4 h-4" />
                        <span>Accounts & Balances</span>
                    </button>
                </div>
            </div>

            {/* Subtab Content */}
            {activeTab === 'events' ? (
                <DailyEventsView />
            ) : (
                <AccountManagementView />
            )}
        </div>
    );
};
