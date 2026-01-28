'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { ArrowLeft, Calendar, AlertTriangle } from 'lucide-react';
import { loadNetWorthHistory } from '@/lib/data/storage';
import { NetWorthSnapshot, Asset, Liability } from '@/types';
import TimeMachineControl from '@/components/TimeMachineControl';
import { formatCurrency, convertAmount } from '@/lib/utils/currencyService';
import { useDashboard } from '@/contexts/DashboardContext';

import { useTheme } from '@/contexts/ThemeContext';

export default function TimeMachinePage() {
    const { baseCurrency } = useDashboard();
    const [history, setHistory] = useState<NetWorthSnapshot[]>([]);
    const [selectedDate, setSelectedDate] = useState<string | null>(null);
    const [snapshot, setSnapshot] = useState<NetWorthSnapshot | null>(null);
    const { isPrivacyBlur } = useTheme();
    const blurClass = isPrivacyBlur ? 'privacy-value' : '';

    useEffect(() => {
        setHistory(loadNetWorthHistory());
    }, []);

    useEffect(() => {
        if (selectedDate) {
            const found = history.find(h => h.date === selectedDate);
            setSnapshot(found || null);
        } else {
            setSnapshot(null);
        }
    }, [selectedDate, history]);

    return (
        <div className={`min-h-screen transition-colors duration-700 ${selectedDate ? 'bg-[#fdf6e3]' : 'bg-slate-50'}`}>
            <div className="max-w-7xl mx-auto p-4 md:p-8 space-y-8">
                {/* Header */}
                <div className="flex items-center gap-4">
                    <Link href="/" className="p-2 hover:bg-black/5 rounded-full transition-colors">
                        <ArrowLeft size={24} className="text-slate-700" />
                    </Link>
                    <div>
                        <h1 className={`text-3xl font-black tracking-tight ${selectedDate ? 'text-[#586e75] font-serif' : 'text-foreground'}`}>
                            Time Machine
                        </h1>
                        <p className={selectedDate ? 'text-[#839496]' : 'text-slate-500'}>
                            {selectedDate ? `Traveling back to ${selectedDate}` : 'Select a date to view past financial states'}
                        </p>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
                    {/* Controls Sidebar */}
                    <div className="lg:col-span-1">
                        <div className="sticky top-8">
                            <TimeMachineControl
                                history={history}
                                currentDate={selectedDate}
                                onSelectDate={setSelectedDate}
                            />
                        </div>
                    </div>

                    {/* Main Content */}
                    <div className="lg:col-span-3 space-y-6">
                        {selectedDate && snapshot ? (
                            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                                {/* Vintage Overlay Effect */}
                                <div className="pointer-events-none fixed inset-0 z-50 bg-[url('https://www.transparenttextures.com/patterns/aged-paper.png')] opacity-20 mix-blend-multiply"></div>

                                <div className="bg-[#eee8d5] border-2 border-[#d33682] p-4 rounded-xl mb-6 shadow-xl transform -rotate-1">
                                    <div className="flex items-center gap-3 text-[#d33682] font-bold">
                                        <AlertTriangle size={24} />
                                        <span>READ ONLY MODE: You are viewing a historical snapshot.</span>
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                                    <StatCard
                                        title="Net Worth"
                                        value={convertAmount(snapshot.netWorth, 'USD', baseCurrency)}
                                        currency={baseCurrency}
                                        color="text-[#2aa198]"
                                        privacyBlur={isPrivacyBlur}
                                    />
                                    <StatCard
                                        title="Assets"
                                        value={convertAmount(snapshot.totalAssets, 'USD', baseCurrency)}
                                        currency={baseCurrency}
                                        color="text-[#859900]"
                                        privacyBlur={isPrivacyBlur}
                                    />
                                    <StatCard
                                        title="Liabilities"
                                        value={convertAmount(snapshot.totalLiabilities, 'USD', baseCurrency)}
                                        currency={baseCurrency}
                                        color="text-[#dc322f]"
                                        privacyBlur={isPrivacyBlur}
                                    />
                                </div>

                                {/* Assets Table */}
                                <div className="bg-[#fdf6e3] border border-[#93a1a1] rounded-sm shadow-sm p-6 mb-8 relative overflow-hidden">
                                    <div className="absolute top-0 left-0 w-full h-1 bg-[#b58900]"></div>
                                    <h3 className="text-xl font-serif font-bold text-[#586e75] mb-4 flex items-center gap-2">
                                        <span className="text-[#b58900]">✦</span> Assets Registry
                                    </h3>

                                    {snapshot.assets ? (
                                        <table className="w-full text-left font-serif text-[#657b83]">
                                            <thead className="border-b-2 border-[#93a1a1]">
                                                <tr>
                                                    <th className="py-2">Item</th>
                                                    <th className="py-2 text-right">Value</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-[#eee8d5]">
                                                {snapshot.assets.map((a: Asset) => (
                                                    <tr key={a.id}>
                                                        <td className="py-3">{a.name}</td>
                                                        <td className={`py-3 text-right font-mono text-[#2aa198] ${blurClass}`}>
                                                            {formatCurrency(convertAmount(a.value, a.currency || 'USD', baseCurrency), baseCurrency)}
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    ) : (
                                        <div className="text-center py-12 text-[#93a1a1] italic border-2 border-dashed border-[#eee8d5]">
                                            <p>No detailed asset records found for this date.</p>
                                            <p className="text-xs mt-1">Only total values were recorded.</p>
                                        </div>
                                    )}
                                </div>

                                {/* Liabilities Table */}
                                <div className="bg-[#fdf6e3] border border-[#93a1a1] rounded-sm shadow-sm p-6 relative overflow-hidden">
                                    <div className="absolute top-0 left-0 w-full h-1 bg-[#dc322f]"></div>
                                    <h3 className="text-xl font-serif font-bold text-[#586e75] mb-4 flex items-center gap-2">
                                        <span className="text-[#dc322f]">✦</span> Liabilities Registry
                                    </h3>

                                    {snapshot.liabilities ? (
                                        <table className="w-full text-left font-serif text-[#657b83]">
                                            <thead className="border-b-2 border-[#93a1a1]">
                                                <tr>
                                                    <th className="py-2">Item</th>
                                                    <th className="py-2 text-right">Balance</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-[#eee8d5]">
                                                {snapshot.liabilities.map((l: Liability) => (
                                                    <tr key={l.id}>
                                                        <td className="py-3">{l.name}</td>
                                                        <td className={`py-3 text-right font-mono text-[#dc322f] ${blurClass}`}>
                                                            {formatCurrency(convertAmount(l.balance, l.currency || 'USD', baseCurrency), baseCurrency)}
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    ) : (
                                        <div className="text-center py-12 text-[#93a1a1] italic border-2 border-dashed border-[#eee8d5]">
                                            <p>No detailed liability records found for this date.</p>
                                            <p className="text-xs mt-1">Only total values were recorded.</p>
                                        </div>
                                    )}
                                </div>

                            </div>
                        ) : (
                            <div className="flex flex-col items-center justify-center p-12 bg-white rounded-2xl border border-slate-200 shadow-sm text-center min-h-[400px]">
                                <div className="w-24 h-24 bg-blue-50 rounded-full flex items-center justify-center mb-6">
                                    <Calendar size={48} className="text-blue-500" />
                                </div>
                                <h2 className="text-2xl font-bold text-slate-900 mb-2">Select a Date</h2>
                                <p className="text-slate-500 max-w-sm">
                                    Choose a point in history from the sidebar to view your financial state at that moment.
                                </p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}

function StatCard({ title, value, color, currency = 'USD', privacyBlur = false }: { title: string, value: number, color: string, currency?: string, privacyBlur?: boolean }) {
    return (
        <div className="bg-[#fdf6e3] p-4 rounded-lg border border-[#93a1a1] shadow-sm">
            <p className="text-[#93a1a1] text-xs font-serif uppercase tracking-widest mb-1">{title}</p>
            <p className={`text-2xl font-mono font-bold ${color} ${privacyBlur ? 'privacy-value' : ''}`}>
                {formatCurrency(value, currency as any)}
            </p>
        </div>
    );
}
