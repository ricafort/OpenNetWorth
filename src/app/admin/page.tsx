'use client';

import React, { useEffect, useState } from 'react';
import { createClient } from '@/utils/supabase/client';
import { UserProfile } from '@/types';
import { useRouter } from 'next/navigation';
import { SUPPORTED_CURRENCIES } from '@/lib/currencyService';
import { DemoSelector } from '@/components/admin/DemoSelector';
import { Trash2 } from 'lucide-react';

interface TemplateWithStats extends UserProfile {
    totalAssets: number;
    totalLiabilities: number;
    netWorth: number;
    monthlyIncome: number;
    monthlyExpenses: number;
    liquidNetWorth: number;
    effectiveTaxRate?: number;
    marginalTaxRate?: number;
    taxYear?: number | null;
}

export default function AdminPage() {
    const [isLoading, setIsLoading] = useState(true);
    const [isAdmin, setIsAdmin] = useState(false);
    const [templates, setTemplates] = useState<TemplateWithStats[]>([]);
    const [isCreating, setIsCreating] = useState(false);
    const [selectedCurrency, setSelectedCurrency] = useState<string>('ALL');
    const router = useRouter();
    const supabase = createClient();

    const fetchAndSetTemplates = async () => {
        // 1. Get Template Profiles
        const { data: profiles, error } = await supabase
            .from('profiles')
            .select('*')
            .eq('is_template', true)
            .returns<any[]>();

        if (error) throw error;
        if (!profiles || profiles.length === 0) {
            setTemplates([]);
            return;
        }

        // 2. Fetch Data for ALL templates in parallel
        const templateIds = profiles.map(p => p.id);

        const uniqueCountries = Array.from(new Set(profiles.map(p => p.country_code).filter(Boolean))) as string[];
        let a: any = { data: [] }, l: any = { data: [] }, r: any = { data: [] }, b: any = { data: [] };

        if (templateIds.length > 0) {
            [a, l, r, b] = await Promise.all([
                supabase.from('assets').select('user_id, value, currency, is_liquid').in('user_id', templateIds),
                supabase.from('liabilities').select('user_id, balance, currency').in('user_id', templateIds),
                supabase.from('recurring_transactions').select('user_id, amount, frequency, type, currency').in('user_id', templateIds),
                supabase.from('economic_benchmarks').select('*').in('person_country_code', uniqueCountries)
            ]);
        }

        // 3. Helper to convert any currency to USD (approx for sorting/display consistency) or keep raw if single currency
        const statsMap = new Map<string, { assets: number, liabilities: number, income: number, expenses: number, liquidAssets: number }>();

        profiles.forEach(p => {
            statsMap.set(p.id, { assets: 0, liabilities: 0, income: 0, expenses: 0, liquidAssets: 0 });
        });

        // Sum Assets & Liquid
        a.data?.forEach((row: any) => {
            const current = statsMap.get(row.user_id);
            if (current) {
                const val = Number(row.value);
                current.assets += val;
                if (row.is_liquid) current.liquidAssets += val;
            }
        });

        // Sum Liabilities
        l.data?.forEach((row: any) => {
            const current = statsMap.get(row.user_id);
            if (current) current.liabilities += Number(row.balance);
        });

        // Sum Income & Expenses (Monthly)
        r.data?.forEach((row: any) => {
            const current = statsMap.get(row.user_id);
            if (current) {
                let monthly = Number(row.amount);
                if (row.frequency === 'weekly') monthly *= 4.33;
                if (row.frequency === 'bi-weekly') monthly *= 2.16;
                if (row.frequency === 'yearly') monthly /= 12;

                if (row.type === 'income') {
                    current.income += monthly;
                } else if (row.type === 'expense') {
                    current.expenses += monthly;
                }
            }
        });

        const enriched = profiles.map(p => {
            const stats = statsMap.get(p.id) || { assets: 0, liabilities: 0, income: 0, expenses: 0, liquidAssets: 0 };

            // Find matching benchmark for Tax Info
            let taxInfo = {};
            if (p.benchmark_bracket && p.country_code && b.data) {
                const match = b.data.find((bm: any) =>
                    bm.person_country_code === p.country_code &&
                    bm.percentile_bracket === p.benchmark_bracket
                );
                if (match) {
                    taxInfo = {
                        effectiveTaxRate: match.effective_tax_rate,
                        marginalTaxRate: match.marginal_tax_rate,
                        taxYear: match.tax_year
                    };
                }
            }

            return {
                ...p,
                totalAssets: stats.assets,
                totalLiabilities: stats.liabilities,
                netWorth: stats.assets - stats.liabilities,
                monthlyIncome: stats.income,
                monthlyExpenses: stats.expenses,
                liquidNetWorth: stats.liquidAssets,
                ...taxInfo
            } as TemplateWithStats;
        });



        // Sort by Net Worth (Ascending) to ensure logical progression (Student -> Exec)
        enriched.sort((a, b) => a.netWorth - b.netWorth);

        setTemplates(enriched);
    };

    useEffect(() => {
        let mounted = true;

        const init = async () => {
            try {
                // 1. Check Auth & Admin Role
                const { data: { user } } = await supabase.auth.getUser();
                if (!user) {
                    if (mounted) router.push('/login');
                    return;
                }

                const { data: profile } = await supabase
                    .from('profiles')
                    .select('*')
                    .eq('id', user.id)
                    .single() as any;

                if (profile?.role !== 'admin') {
                    if (mounted) {
                        alert("Access Denied: You are not an admin.");
                        router.push('/');
                    }
                    return;
                }

                if (mounted) setIsAdmin(true);

                // 2. Fetch Templates
                await fetchAndSetTemplates();

            } catch (error: any) {
                console.error("Admin Load Error:", error);
                if (mounted) alert("Error loading admin dashboard: " + error.message);
            } finally {
                if (mounted) setIsLoading(false);
            }
        };

        init();

        return () => { mounted = false; };
    }, [router, supabase]);

    const handleCreateTemplateSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        const formData = new FormData(e.currentTarget);
        const name = formData.get('name') as string;
        const cur = formData.get('currency') as string;
        const country = formData.get('country') as string || undefined;

        // Create the profile row directly
        const { data, error } = await supabase
            .from('profiles')
            .insert({
                id: crypto.randomUUID(),
                email: `template_${Date.now()}@clearworth.demo`,
                is_template: true,
                role: 'user',
                template_name: name,
                currency_code: cur,
                country_code: country,
                privacy_mode: true
            } as any)
            .select()
            .single();

        if (error) {
            alert("Error creating template: " + error.message);
            console.error(error);
        } else {
            // Refresh list and close modal
            setIsCreating(false);
        }
    };

    const handleDeleteTemplate = async (id: string, name: string) => {
        if (!confirm(`Are you sure you want to PERMANENTLY DELETE "${name}"?\n\nThis cannot be undone and will delete all associated data.`)) {
            return;
        }

        const { error } = await supabase.from('profiles').delete().eq('id', id);

        if (error) {
            alert("Error deleting template: " + error.message);
            console.error(error);
        } else {
            // Remove from local state immediately for snappy feel
            setTemplates(templates.filter(t => t.id !== id));
        }
    };

    if (isLoading) return <div className="p-10 text-gray-600">Checking permissions...</div>;
    if (!isAdmin) return null;

    const uniqueCurrencies = Array.from(new Set(templates.map(t => t.currency_code))).sort();
    const filteredTemplates = selectedCurrency === 'ALL'
        ? templates
        : templates.filter(t => t.currency_code === selectedCurrency);

    return (
        <div className="min-h-screen bg-gray-50 text-gray-900 p-8">
            <h1 className="text-3xl font-bold mb-6 text-gray-900">Admin Dashboard</h1>

            <div className="mb-8 p-6 bg-white rounded-lg border border-gray-200 shadow-sm">
                <div className="flex justify-between items-start mb-6">
                    <div>
                        <h2 className="text-xl font-semibold text-gray-800">Public Demo Selector</h2>
                        <p className="text-sm text-gray-500 mt-1">Switch your view to one of the public "God Mode" templates.</p>
                    </div>
                    <DemoSelector />
                </div>
            </div>

            <div className="mb-8 p-6 bg-white rounded-lg border border-gray-200 shadow-sm">
                {/* Existing Manage Templates Section */}
                <div className="flex justify-between items-start mb-6">

                    <div>
                        <h2 className="text-xl font-semibold text-gray-800">Manage Templates</h2>
                        <p className="text-sm text-gray-500 mt-1">Create and manage public demo profiles.</p>
                    </div>
                    <button
                        onClick={() => setIsCreating(true)}
                        className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded font-medium shadow-sm transition-colors"
                    >
                        + Create New Template
                    </button>
                </div>

                {/* Currency Filter Tabs */}
                {uniqueCurrencies.length > 0 && (
                    <div className="flex gap-2 mb-6 border-b border-gray-100 pb-1">
                        <button
                            onClick={() => setSelectedCurrency('ALL')}
                            className={`px-4 py-2 text-sm font-bold rounded-t-lg transition-colors border-b-2 ${selectedCurrency === 'ALL' ? 'text-blue-600 border-blue-600 bg-blue-50/50' : 'text-gray-500 border-transparent hover:text-gray-700'}`}
                        >
                            ALL
                        </button>
                        {uniqueCurrencies.map(c => (
                            <button
                                key={c}
                                onClick={() => setSelectedCurrency(c)}
                                className={`px-4 py-2 text-sm font-bold rounded-t-lg transition-colors border-b-2 ${selectedCurrency === c ? 'text-blue-600 border-blue-600 bg-blue-50/50' : 'text-gray-500 border-transparent hover:text-gray-700'}`}
                            >
                                {c}
                            </button>
                        ))}
                    </div>
                )}

                {isCreating && (
                    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                        <div className="bg-white rounded-xl shadow-2xl w-full max-w-md p-6">
                            <h3 className="text-xl font-bold mb-4">Create New Template</h3>
                            <form onSubmit={handleCreateTemplateSubmit} className="space-y-4">
                                <div>
                                    <label className="block text-sm font-bold text-gray-700 mb-1">Template Name</label>
                                    <input name="name" required placeholder="e.g. UK Tech Worker" className="w-full border p-2 rounded" />
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-gray-700 mb-1">Default Currency</label>
                                    <select name="currency" className="w-full border p-2 rounded" defaultValue="USD">
                                        {SUPPORTED_CURRENCIES.map(c => (
                                            <option key={c.code} value={c.code}>{c.code} - {c.name}</option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-gray-700 mb-1">Country Code (Optional)</label>
                                    <input name="country" placeholder="e.g. GB" className="w-full border p-2 rounded" maxLength={2} />
                                </div>
                                <div className="flex gap-2 justify-end mt-6">
                                    <button type="button" onClick={() => setIsCreating(false)} className="px-4 py-2 text-gray-500 hover:bg-gray-100 rounded">Cancel</button>
                                    <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded font-bold hover:bg-blue-700">Create Template</button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}

                <div className="grid gap-4">
                    {filteredTemplates.length === 0 && <p className="text-gray-500 italic py-8 text-center">{templates.length === 0 ? "No templates found anywhere." : `No templates found for ${selectedCurrency}.`}</p>}
                    {filteredTemplates.map(t => (
                        <div key={t.id} className="flex justify-between items-center p-4 bg-white rounded border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
                            <div>
                                <div className="font-bold text-lg text-gray-900">{t.full_name || t.template_name}</div>
                                <div className="text-sm text-gray-500 mb-2">{t.currency_code} • {t.country_code || 'No Country'}</div>
                                <div className="flex gap-4 text-xs font-mono">
                                    <div className="flex flex-col">
                                        <span className="text-gray-400 uppercase text-[10px] font-bold">Net Worth</span>
                                        <span className={`font-bold ${t.netWorth >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                                            {new Intl.NumberFormat('en-US', { style: 'currency', currency: t.currency_code }).format(t.netWorth)}
                                        </span>
                                    </div>
                                    <div className="flex flex-col">
                                        <span className="text-gray-400 uppercase text-[10px] font-bold">Liquid NW</span>
                                        <span className={`font-bold text-teal-600`}>
                                            {new Intl.NumberFormat('en-US', { style: 'currency', currency: t.currency_code }).format(t.liquidNetWorth || 0)}
                                        </span>
                                    </div>
                                    <div className="flex flex-col">
                                        <span className="text-gray-400 uppercase text-[10px] font-bold">Income/Mo</span>
                                        <span className="text-blue-600 font-bold">
                                            {new Intl.NumberFormat('en-US', { style: 'currency', currency: t.currency_code }).format(t.monthlyIncome)}
                                        </span>
                                    </div>
                                    <div className="flex flex-col">
                                        <span className="text-gray-400 uppercase text-[10px] font-bold">Exp/Mo</span>
                                        <span className="text-orange-600 font-bold">
                                            {new Intl.NumberFormat('en-US', { style: 'currency', currency: t.currency_code }).format(t.monthlyExpenses || 0)}
                                        </span>
                                    </div>
                                    <div className="flex flex-col">
                                        <span className="text-gray-400 uppercase text-[10px] font-bold">Assets</span>
                                        <span className="text-gray-700">
                                            {new Intl.NumberFormat('en-US', { style: 'currency', currency: t.currency_code }).format(t.totalAssets)}
                                        </span>
                                    </div>
                                    <div className="flex flex-col">
                                        <span className="text-gray-400 uppercase text-[10px] font-bold">Liabilities</span>
                                        <span className="text-rose-500">
                                            {new Intl.NumberFormat('en-US', { style: 'currency', currency: t.currency_code }).format(t.totalLiabilities)}
                                        </span>
                                    </div>
                                    {t.effectiveTaxRate !== undefined && (
                                        <div className="flex flex-col border-l pl-4 ml-2 border-gray-200">
                                            <span className="text-gray-400 uppercase text-[10px] font-bold">Tax Rate</span>
                                            <div className="flex gap-2">
                                                <span title="Effective Rate" className="text-purple-600 font-bold bg-purple-50 px-1 rounded">
                                                    {(t.effectiveTaxRate * 100).toFixed(1)}%
                                                </span>
                                                <span title="Marginal Rate" className="text-gray-400 text-xs mt-0.5">
                                                    / {(t.marginalTaxRate! * 100).toFixed(0)}%
                                                </span>
                                            </div>
                                            {t.taxYear && (
                                                <span className="text-[9px] text-gray-400 mt-0.5 block">
                                                    {t.country_code === 'AU' && t.taxYear === 2024
                                                        ? "Rates: 2024-26"
                                                        : `FY${t.taxYear}`}
                                                </span>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </div>
                            <div className="flex gap-2">
                                <button className="px-3 py-1 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded text-sm font-medium border border-gray-300">
                                    Edit Metadata
                                </button>
                                <button
                                    onClick={() => router.push(`/?simulatedProfileId=${t.id}`)}
                                    className="px-3 py-1 bg-green-600 hover:bg-green-700 text-white rounded text-sm font-bold shadow-sm"
                                >
                                    Manage Data (God Mode)
                                </button>
                                <button
                                    onClick={() => handleDeleteTemplate(t.id, t.template_name || 'Template')}
                                    className="px-3 py-1 bg-red-50 hover:bg-red-100 text-red-600 rounded text-sm font-bold border border-red-200 transition-colors"
                                    title="Delete Template"
                                >
                                    <Trash2 size={16} />
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div >
    );
}
