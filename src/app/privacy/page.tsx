'use client';

import { Shield, Download, Trash2, EyeOff, Lock, FileText } from 'lucide-react';
import DataManagement from '@/features/dashboard/components/DataManagement';
import WealthSnapshotGenerator from '@/features/dashboard/components/WealthSnapshotGenerator';

export default function PrivacyPage() {
    return (
        <div className="max-w-4xl mx-auto space-y-10">
            <div>
                <h2 className="text-3xl font-black text-foreground tracking-tight">Privacy & Data Sovereignty</h2>
                <p className="text-muted-foreground mt-2 font-medium">OpenNetWorth is 100% open source and local-first. You maintain absolute ownership of your financial vault and AI interactions.</p>
            </div>

            {/* Trust Framework Highlights */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="p-6 bg-card rounded-2xl border border-border shadow-sm flex gap-4">
                    <div className="p-3 bg-blue-100 dark:bg-blue-900/30 text-blue-600 rounded-xl h-fit">
                        <Lock size={20} />
                    </div>
                    <div>
                        <h4 className="font-bold text-foreground">Local Vault Isolation</h4>
                        <p className="text-sm text-muted-foreground mt-1 leading-relaxed font-medium">
                            Your financial records stay on your physical device in Local Storage. No cloud databases required. <a href="/trust" className="underline hover:text-blue-500">Read our Local Privacy Charter &rarr;</a>
                        </p>
                    </div>
                </div>
                <div className="p-6 bg-card rounded-2xl border border-border shadow-sm flex gap-4">
                    <div className="p-3 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 rounded-xl h-fit">
                        <Shield size={20} />
                    </div>
                    <div>
                        <h4 className="font-bold text-foreground">Zero Cloud Telemetry</h4>
                        <p className="text-sm text-muted-foreground mt-1 leading-relaxed">
                            No third-party trackers, no advertising beacons, and no data sales. Open-source code you can audit anytime.
                        </p>
                    </div>
                </div>
            </div>

            {/* Data Management Section */}
            <section className="space-y-6">
                <h3 className="text-xl font-bold text-foreground flex items-center gap-2">
                    <FileText size={20} className="text-muted-foreground" />
                    Data Management & Backups
                </h3>

                <div className="bg-card rounded-2xl border border-border overflow-hidden">
                    <DataManagement />
                </div>

                <div className="mt-6">
                    <WealthSnapshotGenerator />
                </div>
            </section>

            {/* AI Transparency */}
            <section className="p-6 bg-card text-card-foreground rounded-2xl border border-border shadow-sm space-y-4">
                <div className="flex items-center gap-3">
                    <Shield size={24} className="text-blue-600 dark:text-blue-400" />
                    <h3 className="text-xl font-bold">Local AI Privacy Commitment</h3>
                </div>
                <div className="space-y-4 text-muted-foreground text-sm leading-relaxed">
                    <p>
                        OpenNetWorth mentors and natural language command parsing run through <strong>Local LLMs</strong> (via LM Studio or Ollama on your computer).
                        Your financial figures and conversation prompts stay completely on your machine.
                    </p>
                    <ul className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-2 list-disc pl-5">
                        <li>100% on-device AI inference via localhost.</li>
                        <li>No prompt data transmitted to SaaS AI providers by default.</li>
                        <li>Rule-based deterministic fallbacks when offline.</li>
                        <li>Full export and erase control over all local data.</li>
                    </ul>
                </div>
            </section>
        </div>
    );
}

function ActionRow({ icon, title, description, buttonText, toggle, variant }: any) {
    return (
        <div className="p-6 flex flex-col md:flex-row md:items-center justify-between gap-4 bg-card hover:bg-muted/50 transition-colors">
            <div className="flex gap-4">
                <div className="mt-1 text-muted-foreground">{icon}</div>
                <div>
                    <h4 className="font-bold text-foreground">{title}</h4>
                    <p className="text-sm text-muted-foreground mt-1 font-medium">{description}</p>
                </div>
            </div>
            {toggle ? (
                <label className="relative inline-flex items-center cursor-pointer">
                    <input type="checkbox" className="sr-only peer" defaultChecked />
                    <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                </label>
            ) : (
                <button className={cn(
                    "px-4 py-2 rounded-xl font-bold text-sm transition-all text-center",
                    variant === 'danger' ? "bg-rose-50 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400 hover:bg-rose-600 hover:text-white" : "bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 hover:bg-slate-900 hover:text-white"
                )}>
                    {buttonText}
                </button>
            )}
        </div>
    );
}

function cn(...inputs: any[]) {
    return inputs.filter(Boolean).join(' ');
}
