'use client';

/**
 * OpenNetWorth Local Vault Access
 * 
 * Why this exists:
 * Replaces SaaS cloud logins and Google OAuth with instant local access.
 * OpenNetWorth is 100% private and on-device: no cloud accounts, no email confirmations,
 * and zero external tracking.
 */

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ShieldCheck, Database, Cpu, ArrowRight, Lock, CheckCircle2 } from 'lucide-react';
import { useProfile } from '@/contexts/ProfileContext';

export default function LocalAccessPage() {
    const router = useRouter();
    const { profile } = useProfile();
    const [userName, setUserName] = useState('');
    const [saved, setSaved] = useState(false);

    useEffect(() => {
        if (profile?.full_name) {
            setUserName(profile.full_name);
        }
    }, [profile]);

    const handleEnterVault = () => {
        if (userName.trim() && typeof window !== 'undefined') {
            const current = localStorage.getItem('opennetworth_profile');
            const parsed = current ? JSON.parse(current) : {};
            localStorage.setItem('opennetworth_profile', JSON.stringify({
                ...parsed,
                full_name: userName.trim()
            }));
            setSaved(true);
        }
        router.push('/');
    };

    return (
        <div className="flex min-h-screen flex-col items-center justify-center p-6 bg-slate-950 text-slate-100 selection:bg-emerald-500/30">
            {/* Background glow effects */}
            <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

            <div className="relative z-10 w-full max-w-md bg-slate-900/90 border border-slate-800/80 rounded-2xl p-8 shadow-2xl backdrop-blur-xl">
                {/* Header Badge */}
                <div className="flex items-center justify-center gap-2 mb-6">
                    <div className="p-2 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-emerald-400">
                        <ShieldCheck className="w-6 h-6" />
                    </div>
                    <span className="text-xs font-semibold tracking-wider uppercase text-emerald-400 bg-emerald-500/10 px-3 py-1 rounded-full border border-emerald-500/20">
                        100% Offline & Private
                    </span>
                </div>

                <div className="text-center mb-8">
                    <h1 className="text-3xl font-extrabold tracking-tight text-white mb-2">
                        OpenNetWorth Vault
                    </h1>
                    <p className="text-sm text-slate-400">
                        No Google accounts. No cloud databases. Your personal financial ledger resides solely on your computer.
                    </p>
                </div>

                {/* Local Architecture Badges */}
                <div className="space-y-3 mb-8 bg-slate-950/60 p-4 rounded-xl border border-slate-800/50 text-xs">
                    <div className="flex items-center justify-between text-slate-300">
                        <span className="flex items-center gap-2">
                            <Database className="w-4 h-4 text-emerald-400" />
                            Database Engine
                        </span>
                        <span className="font-mono text-emerald-400 font-medium">Embedded SQLite</span>
                    </div>
                    <div className="flex items-center justify-between text-slate-300">
                        <span className="flex items-center gap-2">
                            <Cpu className="w-4 h-4 text-emerald-400" />
                            AI Mentorship
                        </span>
                        <span className="font-mono text-emerald-400 font-medium">Local LLM (Ollama/LM Studio)</span>
                    </div>
                    <div className="flex items-center justify-between text-slate-300">
                        <span className="flex items-center gap-2">
                            <Lock className="w-4 h-4 text-emerald-400" />
                            Cloud Leakage
                        </span>
                        <span className="font-mono text-emerald-400 font-medium">0% (Air-Gapped)</span>
                    </div>
                </div>

                {/* Vault Access Form */}
                <div className="space-y-4">
                    <div>
                        <label className="block text-xs font-medium text-slate-400 mb-1.5">
                            Local Vault Owner Profile
                        </label>
                        <input
                            type="text"
                            value={userName}
                            onChange={(e) => setUserName(e.target.value)}
                            placeholder="Local Vault Owner"
                            className="w-full px-4 py-3 bg-slate-800/80 border border-slate-700/70 rounded-xl text-white placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 transition-all"
                        />
                    </div>

                    <button
                        onClick={handleEnterVault}
                        className="w-full flex items-center justify-center gap-2 py-3.5 px-6 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-semibold rounded-xl shadow-lg shadow-emerald-900/30 transition-all cursor-pointer group"
                    >
                        <span>Open Local Vault</span>
                        <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                    </button>
                </div>

                {/* Footer notes */}
                <div className="mt-6 pt-6 border-t border-slate-800/60 text-center">
                    <p className="text-xs text-slate-500 flex items-center justify-center gap-1.5">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                        Persisting directly to <code className="text-slate-400 bg-slate-800 px-1.5 py-0.5 rounded text-[10px]">data/opennetworth.sqlite</code>
                    </p>
                </div>
            </div>
        </div>
    );
}
