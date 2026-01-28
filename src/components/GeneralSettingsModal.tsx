'use client';

import React, { useState, useEffect } from 'react';
import { X, Save, Bell, Globe, TrendingUp } from 'lucide-react';
import { loadSettings, saveSettings, loadFreedomSettings, saveFreedomSettings } from '@/lib/data/storage'; // Updated import
import { UserSettings, FreedomSettings } from '@/types'; // Updated import
import CurrencySelector from './CurrencySelector';

interface GeneralSettingsModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave?: (settings: UserSettings) => void;
}

export default function GeneralSettingsModal({ isOpen, onClose, onSave }: GeneralSettingsModalProps) {
    const [settings, setSettings] = useState<UserSettings>({
        baseCurrency: 'USD',
        theme: 'system',
        checkInFrequency: 'monthly'
    });

    // Freedom Settings State
    const [freedomSettings, setFreedomSettings] = useState<FreedomSettings>({
        strategy: 'avalanche',
        extraMonthlyPayment: 500
    });

    useEffect(() => {
        if (isOpen) {
            setSettings(loadSettings());
            setFreedomSettings(loadFreedomSettings());
        }
    }, [isOpen]);

    const handleSave = () => {
        saveSettings(settings);
        saveFreedomSettings(freedomSettings);
        if (onSave) onSave(settings);
        onClose();
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in duration-200 h-[80vh] flex flex-col">
                <div className="p-6 border-b border-slate-100 flex items-center justify-between shrink-0">
                    <h3 className="text-xl font-black text-slate-800 uppercase tracking-tighter">App Settings</h3>
                    <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
                        <X size={20} className="text-slate-500" />
                    </button>
                </div>

                <div className="p-8 space-y-8 overflow-y-auto flex-1 custom-scrollbar">
                    {/* Base Currency */}
                    <div>
                        <div className="flex justify-between items-center mb-4">
                            <label className="text-xs font-black text-slate-700 uppercase tracking-widest flex items-center gap-2">
                                <Globe size={14} /> Base Currency
                            </label>
                        </div>
                        <CurrencySelector
                            value={settings.baseCurrency}
                            onChange={(code) => setSettings({ ...settings, baseCurrency: code })}
                            className="w-full"
                        />
                        <p className="text-[10px] text-slate-500 mt-2 font-medium">All assets and liabilities will be converted to this currency for your total Net Worth view.</p>
                    </div>

                    {/* Freedom / Debt Payoff Settings */}
                    <div className="pt-4 border-t border-slate-100">
                        <div className="flex justify-between items-center mb-4">
                            <label className="text-xs font-black text-slate-700 uppercase tracking-widest flex items-center gap-2">
                                <TrendingUp size={14} /> Debt Payoff Strategy
                            </label>
                        </div>

                        <div className="grid grid-cols-2 gap-2 mb-4">
                            <button
                                onClick={() => setFreedomSettings({ ...freedomSettings, strategy: 'avalanche' })}
                                className={`p-3 rounded-xl text-left border-2 transition-all ${freedomSettings.strategy === 'avalanche'
                                    ? 'border-indigo-600 bg-indigo-50 text-indigo-700'
                                    : 'border-slate-100 bg-white text-slate-500 hover:border-slate-200'
                                    }`}
                            >
                                <div className="font-bold text-sm mb-1">Avalanche</div>
                                <div className="text-[10px] opacity-80 leading-tight">Highest interest first. Saves the most money.</div>
                            </button>

                            <button
                                onClick={() => setFreedomSettings({ ...freedomSettings, strategy: 'snowball' })}
                                className={`p-3 rounded-xl text-left border-2 transition-all ${freedomSettings.strategy === 'snowball'
                                    ? 'border-indigo-600 bg-indigo-50 text-indigo-700'
                                    : 'border-slate-100 bg-white text-slate-500 hover:border-slate-200'
                                    }`}
                            >
                                <div className="font-bold text-sm mb-1">Snowball</div>
                                <div className="text-[10px] opacity-80 leading-tight">Lowest balance first. Builds psychological momentum.</div>
                            </button>
                        </div>

                        <div className="space-y-2">
                            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                                Extra Monthly Payment
                            </label>
                            <div className="relative">
                                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground font-bold">$</span>
                                <input
                                    type="number"
                                    value={freedomSettings.extraMonthlyPayment}
                                    onChange={(e) => setFreedomSettings({ ...freedomSettings, extraMonthlyPayment: Number(e.target.value) })}
                                    className="w-full bg-card border border-border rounded-xl py-3 pl-8 pr-4 font-bold text-foreground focus:ring-2 focus:ring-blue-500 transition-all outline-none"
                                    placeholder="500"
                                />
                            </div>
                            <p className="text-[10px] text-slate-500 mt-2 font-medium">Amount you can pay ABOVE minimums to crush debt.</p>
                        </div>
                    </div>

                    {/* Check-in Frequency */}
                    <div className="pt-4 border-t border-slate-100">
                        <div className="flex justify-between items-center mb-4">
                            <label className="text-xs font-black text-slate-700 uppercase tracking-widest flex items-center gap-2">
                                <Bell size={14} /> Wealth Check-In
                            </label>
                        </div>
                        <div className="grid grid-cols-3 gap-2">
                            {(['weekly', 'biweekly', 'monthly'] as const).map((freq) => (
                                <button
                                    key={freq}
                                    onClick={() => setSettings({ ...settings, checkInFrequency: freq })}
                                    className={`px-3 py-2 rounded-xl text-sm font-bold border-2 transition-all ${settings.checkInFrequency === freq
                                        ? 'border-blue-600 bg-blue-50 text-blue-700'
                                        : 'border-slate-100 bg-white text-slate-500 hover:border-slate-200'
                                        }`}
                                >
                                    {freq.charAt(0).toUpperCase() + freq.slice(1)}
                                </button>
                            ))}
                        </div>
                        <p className="text-[10px] text-slate-500 mt-2 font-medium">How often should your mentor nudge you to update your net worth?</p>
                    </div>

                    {/* Reset App Section */}
                    <div className="pt-4 border-t border-slate-100">
                        <h4 className="text-xs font-black text-slate-700 uppercase tracking-widest mb-3 text-red-600/80">Danger Zone</h4>
                        <button
                            onClick={() => {
                                if (confirm('Are you sure? This will delete all local data and reset the app to the Welcome Screen.')) {
                                    import('@/lib/data/demo/demoMode').then(m => m.resetApp());
                                }
                            }}
                            className="w-full py-3 border-2 border-red-100 bg-red-50 text-red-600 rounded-xl text-xs font-bold uppercase hover:bg-red-100 transition-colors"
                        >
                            Reset App / Re-onboard
                        </button>
                        <p className="text-[10px] text-slate-400 mt-2 text-center">Use this to clear data and re-enable Demo Mode.</p>
                    </div>
                </div>

                <div className="p-6 bg-slate-50/50 border-t border-slate-100 flex justify-end px-8 shrink-0">
                    <button
                        onClick={handleSave}
                        className="flex items-center gap-2 px-8 py-3 bg-slate-950 text-white rounded-xl font-black uppercase text-xs hover:bg-black transition-all shadow-md active:scale-95"
                    >
                        <Save size={16} />
                        Save Changes
                    </button>
                </div>
            </div>
        </div>
    );
}
