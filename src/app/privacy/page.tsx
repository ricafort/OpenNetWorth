'use client';

import { Shield, Download, Trash2, EyeOff, Lock, FileText } from 'lucide-react';
import DataManagement from '@/features/dashboard/components/DataManagement';
import WealthSnapshotGenerator from '@/features/dashboard/components/WealthSnapshotGenerator';

export default function PrivacyPage() {
    return (
        <div className="max-w-4xl mx-auto space-y-10">
            <div>
                <h2 className="text-3xl font-black text-foreground tracking-tight">Privacy & Data Control</h2>
                <p className="text-muted-foreground mt-2 font-medium">You are in full control of your financial data and AI interactions.</p>
            </div>

            {/* Trust Framework Highlights */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="p-6 bg-card rounded-2xl border border-border shadow-sm flex gap-4">
                    <div className="p-3 bg-blue-100 dark:bg-blue-900/30 text-blue-600 rounded-xl h-fit">
                        <Lock size={20} />
                    </div>
                    <div>
                        <h4 className="font-bold text-foreground">Privacy-First Design</h4>
                        <p className="text-sm text-muted-foreground mt-1 leading-relaxed font-medium">
                            We collect only essential data. Your financial details are stored with row-level security. <a href="/trust" className="underline hover:text-blue-500">Read our Trust Promise &rarr;</a>
                        </p>
                    </div>
                </div>
                <div className="p-6 bg-card rounded-2xl border border-border shadow-sm flex gap-4">
                    <div className="p-3 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 rounded-xl h-fit">
                        <Shield size={20} />
                    </div>
                    <div>
                        <h4 className="font-bold text-foreground">No Third-Party Selling</h4>
                        <p className="text-sm text-muted-foreground mt-1 leading-relaxed">
                            We never sell your raw financial data to banks, advertisers, or analytics companies.
                        </p>
                    </div>
                </div>
            </div>

            {/* Data Management Section */}
            <section className="space-y-6">
                <h3 className="text-xl font-bold text-foreground flex items-center gap-2">
                    <FileText size={20} className="text-muted-foreground" />
                    Data Management
                </h3>

                <div className="bg-card rounded-2xl border border-border overflow-hidden">
                    <DataManagement />
                </div>

                <div className="mt-6">
                    <WealthSnapshotGenerator />
                </div>
            </section>

            {/* AI Transparency */}
            {/* AI Transparency */}
            <section className="p-6 bg-card text-card-foreground rounded-2xl border border-border shadow-sm space-y-4">
                <div className="flex items-center gap-3">
                    <Shield size={24} className="text-blue-600 dark:text-blue-400" />
                    <h3 className="text-xl font-bold">AI Transparency Commitment</h3>
                </div>
                <div className="space-y-4 text-muted-foreground text-sm leading-relaxed">
                    <p>
                        ClearWorth mentors are AI-simulated personas inspired by publicly available teachings.
                        They are designed to provide <strong>educational perspectives</strong>, not financial advice.
                    </p>
                    <ul className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-2 list-disc pl-5">
                        <li>AI does not "know" your identity.</li>
                        <li>Prompts are processed on demand.</li>
                        <li>No data used for training third-party models.</li>
                        <li>Logs are ephemeral by default.</li>
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
