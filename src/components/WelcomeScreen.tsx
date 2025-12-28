'use client';

import { useState } from 'react';
import { enableDemoMode, ProfileType } from '@/lib/demoMode';
import { PlayCircle, PenLine, User, Users, Briefcase, ShieldCheck, TrendingUp } from 'lucide-react';

interface WelcomeScreenProps {
    onStartManual: () => void;
}

export default function WelcomeScreen({ onStartManual }: WelcomeScreenProps) {
    const [step, setStep] = useState<'intro' | 'demo-select'>('intro');

    const handleDemoStart = (profile: ProfileType, currency: string) => {
        enableDemoMode(profile, currency);
    };

    if (step === 'demo-select') {
        return (
            <div className="fixed inset-0 z-[100] bg-slate-900/95 flex items-center justify-center p-4 animate-in fade-in duration-500">
                <div className="bg-white rounded-3xl p-8 max-w-4xl w-full shadow-2xl space-y-6 text-center relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-blue-500 to-indigo-600" />

                    <div>
                        <h2 className="text-3xl font-bold text-slate-900">Choose Your Starting Profile</h2>
                        <p className="text-slate-500 mt-2">Select a persona that matches your life stage. You can reset anytime.</p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pt-4 text-left">
                        {/* 1. Getting Started */}
                        <button onClick={() => handleDemoStart('getting_started', 'USD')} className="group p-5 rounded-xl border border-slate-200 hover:border-blue-500 hover:bg-blue-50 transition-all">
                            <div className="flex items-center gap-3 mb-2">
                                <div className="bg-blue-100 text-blue-600 p-2 rounded-lg group-hover:scale-105 transition-transform"><User size={20} /></div>
                                <h3 className="font-bold text-slate-900">Getting Started</h3>
                            </div>
                            <p className="text-xs text-slate-500">Student / Early Career<br />Savings & Debt Focus</p>
                        </button>

                        {/* 2. Stabilizing */}
                        <button onClick={() => handleDemoStart('stabilizing', 'USD')} className="group p-5 rounded-xl border border-slate-200 hover:border-emerald-500 hover:bg-emerald-50 transition-all">
                            <div className="flex items-center gap-3 mb-2">
                                <div className="bg-emerald-100 text-emerald-600 p-2 rounded-lg group-hover:scale-105 transition-transform"><ShieldCheck size={20} /></div>
                                <h3 className="font-bold text-slate-900">Stabilizing</h3>
                            </div>
                            <p className="text-xs text-slate-500">Debt Reduction<br />Emergency Fund</p>
                        </button>

                        {/* 3. Building */}
                        <button onClick={() => handleDemoStart('building', 'USD')} className="group p-5 rounded-xl border border-slate-200 hover:border-indigo-500 hover:bg-indigo-50 transition-all">
                            <div className="flex items-center gap-3 mb-2">
                                <div className="bg-indigo-100 text-indigo-600 p-2 rounded-lg group-hover:scale-105 transition-transform"><TrendingUp size={20} /></div>
                                <h3 className="font-bold text-slate-900">Building</h3>
                            </div>
                            <p className="text-xs text-slate-500">First Investments<br />Positive Net Worth</p>
                        </button>

                        {/* 4. Family */}
                        <button onClick={() => handleDemoStart('family', 'USD')} className="group p-5 rounded-xl border border-slate-200 hover:border-amber-500 hover:bg-amber-50 transition-all">
                            <div className="flex items-center gap-3 mb-2">
                                <div className="bg-amber-100 text-amber-600 p-2 rounded-lg group-hover:scale-105 transition-transform"><Users size={20} /></div>
                                <h3 className="font-bold text-slate-900">Working Family</h3>
                            </div>
                            <p className="text-xs text-slate-500">Homeowner & Kids<br />Mortgage Planning</p>
                        </button>

                        {/* 5. Growing Wealth */}
                        <button onClick={() => handleDemoStart('growing', 'USD')} className="group p-5 rounded-xl border border-slate-200 hover:border-purple-500 hover:bg-purple-50 transition-all">
                            <div className="flex items-center gap-3 mb-2">
                                <div className="bg-purple-100 text-purple-600 p-2 rounded-lg group-hover:scale-105 transition-transform"><Briefcase size={20} /></div>
                                <h3 className="font-bold text-slate-900">Growing Wealth</h3>
                            </div>
                            <p className="text-xs text-slate-500">Optimizer<br />Complex Portfolio</p>
                        </button>
                    </div>

                    <div className="flex justify-center pt-4">
                        <button onClick={() => setStep('intro')} className="text-slate-400 hover:text-slate-600 text-sm font-medium">
                            Back to options
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="fixed inset-0 z-[100] bg-slate-900/95 flex items-center justify-center p-4 animate-in fade-in duration-500">
            <div className="bg-white rounded-3xl p-8 max-w-2xl w-full shadow-2xl space-y-8 text-center relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-blue-500 to-indigo-600" />

                <div className="space-y-4">
                    <h1 className="text-4xl font-bold text-slate-900 tracking-tight">
                        Welcome to ClearWorth
                    </h1>
                    <p className="text-lg text-slate-500 max-w-lg mx-auto">
                        Your journey to financial clarity starts here. How would you like to begin?
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
                            <h3 className="font-bold text-slate-900">Try Demo Mode</h3>
                            <p className="text-xs text-slate-500 mt-1">Explore with realistic sample data. Select a profile that fits you.</p>
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
                            <h3 className="font-bold text-slate-900">Manual Entry</h3>
                            <p className="text-xs text-slate-500 mt-1">Start fresh and add your assets manually.</p>
                        </div>
                    </button>

                    {/* Connect Bank removed for simpler layout, or keep as disabled if desired */}
                </div>

                <p className="text-xs text-slate-400 pt-4">
                    Data is stored locally on your device. We respect your privacy.
                </p>
            </div>
        </div>
    );
}
