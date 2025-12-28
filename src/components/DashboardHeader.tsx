'use client';

import { useDashboard } from '@/contexts/DashboardContext';
import { useOnboarding } from '@/contexts/OnboardingContext';
import { Globe, Settings, LayoutGrid, RotateCcw, Check, Gamepad2, PlayCircle } from 'lucide-react';
import CurrencySelector from '@/components/CurrencySelector';
import { generateMockData } from '@/lib/storage';

export default function DashboardHeader() {
    const { isEditMode, setIsEditMode, openSettings, resetLayout, baseCurrency } = useDashboard();
    const { startTour } = useOnboarding();

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

                        <button
                            onClick={() => {
                                if (window.confirm('Load demo data? This will overwrite your current data.')) {
                                    generateMockData();
                                    window.location.reload();
                                }
                            }}
                            className="p-2 text-indigo-500 hover:text-indigo-700 hover:bg-indigo-50 rounded-full transition-colors"
                            title="Load Demo Data"
                            data-tour="demo-mode-button"
                        >
                            <Gamepad2 size={20} />
                        </button>

                        <div className="flex items-center gap-2 pl-2 border-l border-border ml-1">
                            {/* We need to extract the onChange but CurrencySelector inside Context? 
                                Actually CurrencySelector is a pure component, but updating currency is in Context. 
                                Wait, Context provides everything. We need to handle the change.
                                Context doesn't expose setBaseCurrency directly but exposes loadData? 
                                Ah, we missed exposing setBaseCurrency or we rely on Settings to change it?
                                Previous page.tsx allowed inline change. 
                            */}
                            <span className="text-sm font-bold text-slate-500 flex items-center gap-1 hidden sm:flex">
                                <Globe size={14} /> Currency:
                            </span>
                            {/* We need to pass a handler. Let's add updateCurrency to context later or just imply it works via settings?
                                The previous implementation updated settings immediately.
                                Let's assume for now we use the settings modal mostly, OR we fix Context to allow update.
                                Let's fix Context in next step if needed. 
                                Actually, let's keep the UI simple: Keep inline selector.
                            */}
                            <CurrencySelector
                                value={baseCurrency}
                                onChange={(code) => {
                                    // We need to implement this in Context or just save settings directly
                                    // For now, let's skip inline change or refactor Context.
                                    // Better: Add `updateBaseCurrency` to context. 
                                    const settings = JSON.parse(localStorage.getItem('clearworth_settings') || '{}');
                                    settings.baseCurrency = code;
                                    localStorage.setItem('clearworth_settings', JSON.stringify(settings));
                                    window.location.reload(); // Brute force refresh for now until Context is perfect
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
                    </>
                )}
            </div>
        </div>
    );
}
