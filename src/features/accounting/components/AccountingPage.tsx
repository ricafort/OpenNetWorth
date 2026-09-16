/**
 * Milestone 1 Accounting Page Shell
 * 
 * Why this component exists:
 * Top-level view for Milestone 1 sovereign double-entry accounting engine.
 * Provides intuitive tab navigation between:
 * - Daily Financial Events (Slice 1C)
 * - Reports, Ownership & Traceability (Slice 1D)
 * - Accounts & Opening Balances (Slice 1B)
 * 
 * Tricky logic:
 * - Maintains active subtab in local state or URL query param to support deep-linking.
 * - Explains double-entry invariants in plain language.
 */

'use client';

import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { ShieldCheck, BookOpen, Layers, DollarSign, PieChart, Inbox, User, Building2, Plus, AlertTriangle, CheckCircle2, ChevronDown } from 'lucide-react';
import { AccountManagementView } from './AccountManagementView';
import { DailyEventsView } from './DailyEventsView';
import { ReportsTraceabilityView } from './ReportsTraceabilityView';
import { DocumentInboxView } from './DocumentInboxView';
import { Entity } from '@/lib/domain/accounting/types';

/**
 * Format entity types into user-friendly labels without losing trust/household distinctions.
 * Why this exists:
 * Presents clean, human-understandable labels (Personal, Household, Business, Trust)
 * in the owner selector dropdown.
 */
const getOwnerTypeLabel = (type: string) => {
    switch (type) {
        case 'person':
            return 'Personal';
        case 'household':
            return 'Household';
        case 'business':
            return 'Business';
        case 'trust':
            return 'Trust';
        default:
            return type ? type.charAt(0).toUpperCase() + type.slice(1) : 'Owner';
    }
};

export const AccountingPage: React.FC = () => {
    const searchParams = useSearchParams();
    const [activeTab, setActiveTab] = useState<'events' | 'accounts' | 'reports' | 'inbox'>(() => {
        const view = searchParams.get('view');
        if (view === 'reports' || view === 'accounts' || view === 'inbox' || view === 'events') {
            return view;
        }
        return 'events';
    });
    const [entities, setEntities] = useState<Entity[]>([]);
    const [selectedEntityId, setSelectedEntityId] = useState<string>('');
    const [isLoading, setIsLoading] = useState(true);

    // Onboarding form state
    const [isCreatingEntity, setIsCreatingEntity] = useState(false);
    const [onboardingName, setOnboardingName] = useState('');
    const [setupOptions, setSetupOptions] = useState({
        personal: true,
        business: false,
        property: false,
        investments: false
    });
    const [onboardingError, setOnboardingError] = useState<string | null>(null);

    const fetchEntities = async () => {
        try {
            setIsLoading(true);
            const res = await fetch('/api/accounting');
            if (res.ok) {
                const data = await res.json();
                if (data.entities) {
                    setEntities(data.entities);
                    if (data.entities.length > 0 && !selectedEntityId) {
                        setSelectedEntityId('all'); // Default to Everything
                    }
                }
            }
        } catch (err) {
            console.error(err);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchEntities();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const handleCreateEntity = async (e: React.FormEvent) => {
        e.preventDefault();
        setOnboardingError(null);
        setIsCreatingEntity(true);
        try {
            // Create Personal/Household entity if checked
            let createdEntityId = null;
            if (setupOptions.personal) {
                const res = await fetch('/api/accounting', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        action: 'create_entity',
                        entity: { name: onboardingName || 'Household', type: 'person' }
                    })
                });
                const data = await res.json();
                if (!res.ok) throw new Error(data.error || 'Failed to create household');
                createdEntityId = data.entity.id;
            }
            
            // Create Business entity if checked
            if (setupOptions.business) {
                const res2 = await fetch('/api/accounting', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        action: 'create_entity',
                        entity: { name: `${onboardingName || 'My'} Business`, type: 'business' }
                    })
                });
                const data2 = await res2.json();
                if (!res2.ok) throw new Error(data2.error || 'Failed to create business');
                if (!createdEntityId) createdEntityId = data2.entity.id;
            }

            /**
             * Why this exists:
             * Assessor finding: Property-only and investment-only onboarding must not hang or fail to progress.
             * Real estate and investment portfolios require a legal sovereign person or entity to hold titles.
             * If neither personal nor business was selected, automatically create a personal owner from the entered name.
             * 
             * Tricky logic:
             * We check if personal and business are unchecked while property or investments is checked.
             * We guarantee createdEntityId is set so the UI transitions out of onboarding into the workspace.
             */
            if (!setupOptions.personal && !setupOptions.business && (setupOptions.property || setupOptions.investments)) {
                const resPropertyOwner = await fetch('/api/accounting', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        action: 'create_entity',
                        entity: { name: onboardingName.trim() || 'Personal Owner', type: 'person' }
                    })
                });
                const dataProp = await resPropertyOwner.json();
                if (!resPropertyOwner.ok) throw new Error(dataProp.error || 'Failed to create personal entity for property/investments');
                if (!createdEntityId) createdEntityId = dataProp.entity.id;
            }

            await fetchEntities();
            setSelectedEntityId('all');
        } catch (err: any) {
            setOnboardingError(err.message);
        } finally {
            setIsCreatingEntity(false);
        }
    };

    if (isLoading) {
        return (
            <div className="max-w-7xl mx-auto px-4 py-12 flex justify-center items-center">
                <div className="text-slate-500 animate-pulse">Loading finances...</div>
            </div>
        );
    }

    // Unblock Setup: F1
    if (entities.length === 0) {
        return (
            <div className="max-w-2xl mx-auto px-4 py-16">
                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-8 shadow-sm text-center">
                    <div className="w-16 h-16 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-full flex items-center justify-center mx-auto mb-4">
                        <BookOpen className="w-8 h-8" />
                    </div>
                    <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">Let's set up your finances</h2>
                    <p className="text-slate-600 dark:text-slate-400 mb-8 max-w-md mx-auto">
                        To get started, add yourself, your household, or your business to track balances and transactions.
                    </p>

                    <form onSubmit={handleCreateEntity} className="max-w-sm mx-auto text-left space-y-5">
                        {onboardingError && (
                            <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-sm text-red-600 dark:text-red-400 flex items-start gap-2">
                                <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
                                <span>{onboardingError}</span>
                            </div>
                        )}
                        <div>
                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">What would you like to manage? Select everything that applies.</label>
                            <div className="space-y-2">
                                <label className="flex items-center gap-3 p-3 border rounded-xl bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 cursor-pointer hover:border-indigo-300 transition">
                                    <input type="checkbox" checked={setupOptions.personal} onChange={(e) => setSetupOptions(s => ({ ...s, personal: e.target.checked }))} className="w-5 h-5 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500" />
                                    <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Personal and household finances</span>
                                </label>
                                <label className="flex items-center gap-3 p-3 border rounded-xl bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 cursor-pointer hover:border-indigo-300 transition">
                                    <input type="checkbox" checked={setupOptions.business} onChange={(e) => setSetupOptions(s => ({ ...s, business: e.target.checked }))} className="w-5 h-5 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500" />
                                    <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Business or self-employment</span>
                                </label>
                                <label className="flex items-center gap-3 p-3 border rounded-xl bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 cursor-pointer hover:border-indigo-300 transition">
                                    <input type="checkbox" checked={setupOptions.property} onChange={(e) => setSetupOptions(s => ({ ...s, property: e.target.checked }))} className="w-5 h-5 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500" />
                                    <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Property and mortgages</span>
                                </label>
                                <label className="flex items-center gap-3 p-3 border rounded-xl bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 cursor-pointer hover:border-indigo-300 transition">
                                    <input type="checkbox" checked={setupOptions.investments} onChange={(e) => setSetupOptions(s => ({ ...s, investments: e.target.checked }))} className="w-5 h-5 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500" />
                                    <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Investments</span>
                                </label>
                            </div>
                        </div>

                        {/* Explain legal ownership requirement when only property or investments is selected */}
                        {!setupOptions.personal && !setupOptions.business && (setupOptions.property || setupOptions.investments) && (
                            <div className="p-3 bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800 rounded-xl text-xs text-indigo-700 dark:text-indigo-300 leading-relaxed">
                                Properties and investment accounts require a legal owner. We'll set up a personal entity for <strong>{onboardingName.trim() || 'your name'}</strong> to own them.
                            </div>
                        )}

                        <div>
                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Your Name or Primary Identity</label>
                            <input
                                type="text"
                                required
                                value={onboardingName}
                                onChange={e => setOnboardingName(e.target.value)}
                                placeholder="e.g. John Doe or The Smiths"
                                className="w-full px-3 py-2 bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none text-slate-900 dark:text-white"
                            />
                        </div>
                        <button
                            type="submit"
                            disabled={isCreatingEntity || !onboardingName.trim() || (!setupOptions.personal && !setupOptions.business && !setupOptions.property && !setupOptions.investments)}
                            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-lg transition disabled:opacity-50"
                        >
                            {isCreatingEntity ? 'Setting up...' : 'Continue'}
                        </button>
                    </form>
                </div>
            </div>
        );
    }

    const selectedEntity = entities.find(e => e.id === selectedEntityId);

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
                            Your finances
                        </h1>
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1.5 max-w-2xl">
                        See your personal and business finances together.
                    </p>
                </div>

                <div className="flex flex-wrap items-center gap-4">
                    {/* F4: Global Owner Context */}
                    <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 hidden sm:inline">Viewing:</span>
                        <div className="relative">
                            <select
                                value={selectedEntityId}
                                onChange={e => setSelectedEntityId(e.target.value)}
                                className="appearance-none pl-9 pr-10 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-sm font-medium text-slate-900 dark:text-white shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                            >
                                <option value="all">All my finances</option>
                                <optgroup label="Filtered Views">
                                    {entities.map(e => (
                                        <option key={e.id} value={e.id}>{e.name} ({getOwnerTypeLabel(e.type)})</option>
                                    ))}
                                </optgroup>
                            </select>
                            <div className="absolute left-3 top-2.5 text-slate-400 pointer-events-none">
                                {selectedEntityId === 'all' ? <Layers className="w-4 h-4 text-indigo-500" /> : selectedEntity?.type === 'business' ? <Building2 className="w-4 h-4" /> : <User className="w-4 h-4" />}
                            </div>
                            <ChevronDown className="absolute right-3 top-2.5 w-4 h-4 text-slate-400 pointer-events-none" />
                        </div>
                    </div>

                    {/* Sub-tab Switcher */}
                    <div className="flex bg-slate-100 dark:bg-slate-800/70 p-1 rounded-xl border border-slate-200 dark:border-slate-700/60 text-xs font-semibold">
                        <button
                            onClick={() => setActiveTab('events')}
                            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg transition ${activeTab === 'events' ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-sm' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'}`}
                        >
                            <DollarSign className="w-4 h-4" />
                            <span>Transactions</span>
                        </button>
                        <button
                            onClick={() => setActiveTab('accounts')}
                            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg transition ${activeTab === 'accounts' ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-sm' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'}`}
                        >
                            <Layers className="w-4 h-4" />
                            <span>Accounts</span>
                        </button>
                        <button
                            onClick={() => setActiveTab('reports')}
                            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg transition ${activeTab === 'reports' ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-sm' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'}`}
                        >
                            <PieChart className="w-4 h-4" />
                            <span>Reports</span>
                        </button>
                        <button
                            onClick={() => setActiveTab('inbox')}
                            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg transition ${activeTab === 'inbox' ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-sm' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'}`}
                        >
                            <Inbox className="w-4 h-4" />
                            <span>Documents</span>
                        </button>
                    </div>
                </div>
            </div>

            {/* Subtab Content */}
            {activeTab === 'events' && (
                <DailyEventsView
                    entities={entities}
                    selectedEntityId={selectedEntityId}
                    onNavigateToDocuments={() => setActiveTab('inbox')}
                />
            )}
            {activeTab === 'accounts' && <AccountManagementView entities={entities} selectedEntityId={selectedEntityId} />}
            {activeTab === 'reports' && (
                <ReportsTraceabilityView
                    entities={entities}
                    selectedEntityId={selectedEntityId}
                    onNavigateToAccounts={() => setActiveTab('accounts')}
                    onSelectEntity={(id) => setSelectedEntityId(id)}
                />
            )}
            {activeTab === 'inbox' && <DocumentInboxView entities={entities} selectedEntityId={selectedEntityId} />}
        </div>
    );
};
