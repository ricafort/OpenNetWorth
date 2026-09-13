
'use client';

import { useState, useEffect } from 'react';
import { enableDemoModeFromData } from '@/features/demo/demoMode';
import { getPublishedTemplates, getTemplateFullData } from '@/lib/domain/templateService';
import { UserProfile } from '@/types';
import { PlayCircle, PenLine, ChevronLeft, Loader2, Globe, X, Upload } from 'lucide-react';
import { SUPPORTED_CURRENCIES } from '@/lib/utils/currencyService';
import { importData } from '@/infrastructure/local_driver';

interface WelcomeScreenProps {
    onStartManual: () => void;
    onClose: () => void;
}

export default function WelcomeScreen({ onStartManual, onClose }: WelcomeScreenProps) {
    const [step, setStep] = useState<'intro' | 'demo-select'>('intro');
    const [templates, setTemplates] = useState<(UserProfile & { assets: { value: number }[], liabilities: { balance: number }[] })[]>([]);
    const [loadingTemplates, setLoadingTemplates] = useState(false);
    const [loadingSelection, setLoadingSelection] = useState<string | null>(null);
    const [selectedCurrency, setSelectedCurrency] = useState<string>('USD');
    const [restoreError, setRestoreError] = useState<string | null>(null);
    const [isRestoring, setIsRestoring] = useState(false);

    // Fetch templates on mount
    useEffect(() => {
        const fetchTemplates = async () => {
            setLoadingTemplates(true);
            const data = await getPublishedTemplates();
            setTemplates(data);
            setLoadingTemplates(false);
        };

        fetchTemplates();
    }, []);

    const handleTemplateSelect = async (templateId: string) => {
        setLoadingSelection(templateId);
        try {
            const data = await getTemplateFullData(templateId);
            if (data) {
                enableDemoModeFromData(data);
            } else {
                alert("Failed to load template data. Please try again.");
            }
        } catch (error) {
            console.error("Error loading template:", error);
            alert("An unexpected error occurred.");
        } finally {
            setLoadingSelection(null);
        }
    };

    const uniqueCurrencies = Array.from(new Set(templates.map(t => t.currency_code))).sort();

    // Default to USD if available, or first available
    useEffect(() => {
        if (uniqueCurrencies.length > 0 && !uniqueCurrencies.includes(selectedCurrency as any)) {
            setSelectedCurrency(uniqueCurrencies.includes('USD' as any) ? 'USD' : uniqueCurrencies[0]);
        }
    }, [uniqueCurrencies, selectedCurrency]);

    const getBenchmarkScore = (bracket?: string) => {
        if (!bracket) return 0;
        if (bracket === 'top_1_percent') return 100;
        const match = bracket.match(/p(\d+)/);
        return match ? parseInt(match[1]) : 50;
    };

    const filteredTemplates = templates
        .filter(t => t.currency_code === selectedCurrency)
        .sort((a, b) => getBenchmarkScore(a.benchmark_bracket) - getBenchmarkScore(b.benchmark_bracket));

    if (step === 'demo-select') {
        return (
            <div className="fixed inset-0 z-[100] bg-slate-900/95 flex items-center justify-center p-4 animate-in fade-in duration-500">
                <div className="bg-white rounded-3xl p-8 max-w-5xl w-full shadow-2xl space-y-6 text-center relative overflow-hidden max-h-[90vh] flex flex-col">
                    <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-blue-500 to-indigo-600" />

                    <div className="flex-none relative">
                        <button
                            onClick={() => setStep('intro')}
                            className="absolute left-0 top-0 p-2 rounded-full hover:bg-slate-100 text-slate-500 transition-colors"
                        >
                            <ChevronLeft size={24} />
                        </button>

                        <div className="absolute right-0 top-0">
                            <button
                                onClick={onClose}
                                className="flex items-center gap-2 text-sm text-gray-400 hover:text-gray-800 transition-colors p-2"
                            >
                                <span className="hidden sm:inline font-medium">Cancel</span>
                                <div className="p-1 hover:bg-gray-100 rounded-full bg-gray-50 text-gray-600">
                                    <X size={18} />
                                </div>
                            </button>
                        </div>

                        <h2 className="text-3xl font-bold text-slate-900 mt-2">Choose Your Starting Profile</h2>
                        <p className="text-slate-500 mt-2">Select a persona that matches your life stage. You can reset anytime.</p>
                    </div>

                    {/* Currency Tabs */}
                    <div className="flex-none flex overflow-x-auto gap-2 border-b border-slate-100 pb-1 mt-4 px-4 scrollbar-thin scrollbar-thumb-slate-200">
                        {loadingTemplates ? (
                            <div className="h-10 w-full animate-pulse bg-slate-100 rounded-lg"></div>
                        ) : uniqueCurrencies.map(c => (
                            <button
                                key={c}
                                onClick={() => setSelectedCurrency(c)}
                                className={`px-6 py-3 text-sm font-bold rounded-t-xl transition-all border-b-2 ${selectedCurrency === c
                                    ? 'text-blue-600 border-blue-600 bg-blue-50/50'
                                    : 'text-slate-400 border-transparent hover:text-slate-600 hover:bg-slate-50'
                                    }`}
                            >
                                <span className="flex items-center gap-2">
                                    {c}
                                    {SUPPORTED_CURRENCIES.find(sc => sc.code === c)?.symbol &&
                                        <span className="opacity-50 font-normal">({SUPPORTED_CURRENCIES.find(sc => sc.code === c)?.symbol})</span>
                                    }
                                </span>
                            </button>
                        ))}
                    </div>

                    {/* Template Grid - Scrollable */}
                    <div className="flex-1 overflow-y-auto min-h-[400px] p-2">
                        {loadingTemplates ? (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                {[1, 2, 3].map(i => (
                                    <div key={i} className="h-40 bg-slate-100 rounded-xl animate-pulse" />
                                ))}
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 text-left pb-10">
                                {filteredTemplates.map(t => (
                                    <button
                                        key={t.id}
                                        onClick={() => handleTemplateSelect(t.id)}
                                        disabled={!!loadingSelection}
                                        className={`group relative p-6 rounded-2xl border-2 border-slate-100 hover:border-blue-500 hover:bg-blue-50 transition-all text-left flex flex-col gap-3 ${loadingSelection === t.id ? 'opacity-75 cursor-wait' : ''}`}
                                    >
                                        <div className="flex justify-between items-start w-full">
                                            <div className="bg-blue-100 text-blue-600 p-3 rounded-xl group-hover:scale-110 transition-transform">
                                                {/* Use Avatar if available, else generic icon */}
                                                {t.avatar_url ? (
                                                    <img src={t.avatar_url} alt="avatar" className="w-6 h-6 rounded-full" />
                                                ) : (
                                                    <Globe size={24} />
                                                )}
                                            </div>
                                            {t.country_code && (
                                                <span className="text-[10px] font-bold uppercase tracking-wider bg-slate-100 text-slate-500 px-2 py-1 rounded-md">
                                                    {t.country_code}
                                                </span>
                                            )}
                                        </div>

                                        <div>
                                            <h3 className="font-bold text-slate-900 text-lg leading-tight group-hover:text-blue-700 transition-colors">
                                                {t.full_name || t.template_name}
                                            </h3>
                                            <p className="text-xs text-slate-500 mt-2 font-medium">
                                                {t.income_range_display || "Estimated Income Available"}
                                            </p>
                                        </div>

                                        {/* Net Worth Display */}
                                        <div className="pt-2 mt-auto border-t border-gray-50 flex justify-between items-center w-full">
                                            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Net Worth</span>
                                            <span className={`text-sm font-bold ${(t.assets.reduce((sum, a) => sum + (a.value || 0), 0) -
                                                t.liabilities.reduce((sum, l) => sum + (l.balance || 0), 0)) >= 0
                                                ? 'text-emerald-600'
                                                : 'text-rose-600'
                                                }`}>
                                                {formatCurrency(
                                                    t.assets.reduce((sum, a) => sum + (a.value || 0), 0) -
                                                    t.liabilities.reduce((sum, l) => sum + (l.balance || 0), 0),
                                                    t.currency_code
                                                )}
                                            </span>
                                        </div>

                                        {loadingSelection === t.id && (
                                            <div className="absolute inset-0 bg-white/50 backdrop-blur-[1px] flex items-center justify-center rounded-2xl">
                                                <Loader2 className="animate-spin text-blue-600" size={32} />
                                            </div>
                                        )}
                                    </button>
                                ))}
                            </div>
                        )}

                        {!loadingTemplates && filteredTemplates.length === 0 && (
                            <div className="flex flex-col items-center justify-center h-full text-slate-400">
                                <p>No templates found for {selectedCurrency}.</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="fixed inset-0 z-[100] bg-slate-900/95 flex items-center justify-center p-4 animate-in fade-in duration-500">
            <div className="bg-white rounded-3xl p-8 max-w-2xl w-full shadow-2xl space-y-8 text-center relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-blue-500 to-indigo-600" />

                <div className="absolute right-4 top-4">
                    <button
                        onClick={onClose}
                        className="flex items-center gap-2 p-2 hover:bg-slate-100 rounded-full text-slate-400 hover:text-slate-600 transition-colors"
                        title="Cancel and close"
                    >
                        <X size={24} />
                    </button>
                </div>

                <div className="space-y-4">
                    <h1 className="text-4xl font-black text-slate-900 tracking-tight">
                        Welcome to OpenNetWorth
                    </h1>
                    <p className="text-base text-slate-600 max-w-lg mx-auto">
                        Your private, on-device financial control room. Zero cloud telemetry, powered exclusively by Local LLMs.
                    </p>
                </div>

                <div className="grid md:grid-cols-2 gap-4 max-w-lg mx-auto">
                    <button
                        onClick={() => setStep('demo-select')}
                        className="group flex flex-col items-center gap-4 p-6 rounded-2xl border-2 border-slate-100 hover:border-blue-500 hover:bg-blue-50 transition-all text-left md:text-center"
                    >
                        <div className="p-4 bg-blue-100 text-blue-600 rounded-full group-hover:scale-110 transition-transform">
                            <PlayCircle size={32} />
                        </div>
                        <div>
                            <h3 className="font-bold text-slate-900">Explore Sample Profiles</h3>
                            <p className="text-xs text-slate-500 mt-1">Tour realistic personas across life stages. Safe to explore without touching real data.</p>
                        </div>
                    </button>

                    <button
                        onClick={onStartManual}
                        className="group flex flex-col items-center gap-4 p-6 rounded-2xl border-2 border-slate-100 hover:border-indigo-500 hover:bg-indigo-50 transition-all text-left md:text-center"
                    >
                        <div className="p-4 bg-indigo-100 text-indigo-600 rounded-full group-hover:scale-110 transition-transform">
                            <PenLine size={32} />
                        </div>
                        <div>
                            <h3 className="font-bold text-slate-900">Start Fresh Vault</h3>
                            <p className="text-xs text-slate-500 mt-1">Begin tracking your real assets, debts, and goals right now.</p>
                        </div>
                    </button>
                </div>

                <div className="pt-2 flex flex-col items-center gap-2">
                    {restoreError && (
                        <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl font-medium max-w-md text-center">
                            {restoreError}
                        </div>
                    )}
                    <label className={`cursor-pointer text-xs font-bold text-blue-600 hover:text-blue-800 flex items-center gap-1.5 p-2 rounded-xl hover:bg-blue-50 transition-colors ${isRestoring ? 'opacity-50 pointer-events-none' : ''}`}>
                        {isRestoring ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />}
                        {isRestoring ? 'Restoring Vault...' : 'Restore Existing Vault from Backup (.json)'}
                        <input
                            type="file"
                            accept=".json"
                            disabled={isRestoring}
                            className="hidden"
                            onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (!file) return;
                                setRestoreError(null);
                                setIsRestoring(true);
                                const reader = new FileReader();
                                reader.onload = async (event) => {
                                    try {
                                        const result = await importData(event.target?.result as string);
                                        if (result.success) {
                                            window.location.reload();
                                        } else {
                                            setRestoreError(result.error || 'Invalid backup file format.');
                                            setIsRestoring(false);
                                        }
                                    } catch (err: any) {
                                        setRestoreError(err.message || 'Unexpected error while restoring backup.');
                                        setIsRestoring(false);
                                    }
                                };
                                reader.readAsText(file);
                            }}
                        />
                    </label>
                    <p className="text-[11px] text-slate-400">
                        🔒 100% Private. All financial records and AI queries stay strictly on your device.
                    </p>
                </div>
            </div>
        </div>
    );
}

function formatCurrency(amount: number, currency: string = 'USD') {
    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currencyDisplay: 'narrowSymbol',
        currency: currency,
        maximumFractionDigits: 0,
    }).format(amount);
}

