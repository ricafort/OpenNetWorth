'use client';

import { enableDemoMode } from '@/lib/demoMode';
import { PlayCircle, PenLine, Building2 } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface WelcomeScreenProps {
    onStartManual: () => void;
}

export default function WelcomeScreen({ onStartManual }: WelcomeScreenProps) {
    const router = useRouter();

    const handleDemo = () => {
        enableDemoMode();
        // Page reloads in enableDemoMode, but just in case
    };

    return (
        <div className="fixed inset-0 z-50 bg-slate-900/95 flex items-center justify-center p-4 animate-in fade-in duration-500">
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

                <div className="grid md:grid-cols-3 gap-4">
                    <button
                        onClick={handleDemo}
                        className="group flex flex-col items-center gap-4 p-6 rounded-2xl border-2 border-slate-100 hover:border-blue-500 hover:bg-blue-50 transition-all text-left md:text-center"
                    >
                        <div className="p-4 bg-blue-100 text-blue-600 rounded-full group-hover:scale-110 transition-transform">
                            <PlayCircle size={32} />
                        </div>
                        <div>
                            <h3 className="font-bold text-slate-900">Demo Mode</h3>
                            <p className="text-xs text-slate-500 mt-1">Explore with realistic sample data. No setup required.</p>
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

                    <button
                        disabled
                        className="group flex flex-col items-center gap-4 p-6 rounded-2xl border-2 border-slate-100 opacity-60 cursor-not-allowed justify-between"
                    >
                        <div className="flex flex-col items-center gap-4">
                            <div className="p-4 bg-slate-100 text-slate-400 rounded-full">
                                <Building2 size={32} />
                            </div>
                            <div>
                                <h3 className="font-bold text-slate-900">Connect Bank</h3>
                                <p className="text-xs text-slate-500 mt-1">Auto-import securely via Plaid.</p>
                            </div>
                        </div>
                        <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 bg-slate-100 px-2 py-1 rounded">Coming Soon</span>
                    </button>
                </div>

                <p className="text-xs text-slate-400 pt-4">
                    Data is stored locally on your device. We respect your privacy.
                </p>
            </div>
        </div>
    );
}
