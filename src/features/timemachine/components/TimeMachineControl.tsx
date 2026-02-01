'use client';

import React from 'react';
import { NetWorthSnapshot } from '@/types';
import { History, Calendar } from 'lucide-react';
import { useNetWorth } from '@/features/dashboard/hooks/useNetWorth';
import { formatCurrency, convertAmount } from '@/lib/utils/currencyService';

interface TimeMachineControlProps {
    history: NetWorthSnapshot[];
    currentDate: string | null;
    onSelectDate: (date: string | null) => void;
}

export default function TimeMachineControl({ history, currentDate, onSelectDate }: TimeMachineControlProps) {
    const { baseCurrency } = useNetWorth();

    if (history.length === 0) return null;

    // Filter to only snapshots that might have data (or all, if we want to show everything)
    // For now, show all history points.
    const sortedHistory = [...history].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    return (
        <div className={`p-4 rounded-2xl border transition-colors duration-500 ${currentDate ? 'bg-amber-50 border-amber-200' : 'bg-white border-slate-200 shadow-sm'}`}>
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                    <div className={`p-2 rounded-lg transition-colors duration-500 ${currentDate ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-600'}`}>
                        <History size={20} />
                    </div>
                    <div>
                        <h3 className={`font-bold transition-colors duration-500 ${currentDate ? 'text-amber-900' : 'text-slate-900'}`}>
                            {currentDate ? 'Time Machine Active' : 'History'}
                        </h3>
                        <p className={`text-xs transition-colors duration-500 ${currentDate ? 'text-amber-700' : 'text-slate-500'}`}>
                            {currentDate ? `Viewing snapshot from ${currentDate}` : 'View past states'}
                        </p>
                    </div>
                </div>

                {currentDate && (
                    <button
                        onClick={() => onSelectDate(null)}
                        className="text-xs font-bold bg-amber-200 hover:bg-amber-300 text-amber-900 px-3 py-1.5 rounded-lg transition-colors"
                    >
                        Return to Present
                    </button>
                )}
            </div>

            <div className="space-y-2 max-h-48 overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-slate-200 scrollbar-track-transparent">
                <button
                    onClick={() => onSelectDate(null)}
                    className={`w-full text-left px-3 py-2 rounded-lg text-sm font-medium flex items-center justify-between transition-all ${!currentDate
                        ? 'bg-slate-900 text-white shadow-md'
                        : 'hover:bg-slate-50 text-slate-600'
                        }`}
                >
                    <span className="flex items-center gap-2">
                        <Calendar size={14} />
                        Present Day
                    </span>
                    <span className="opacity-70 text-xs">Live</span>
                </button>

                {sortedHistory.map((snap) => (
                    <button
                        key={snap.date}
                        onClick={() => onSelectDate(snap.date)}
                        className={`w-full text-left px-3 py-2 rounded-lg text-sm font-medium flex items-center justify-between transition-all ${currentDate === snap.date
                            ? 'bg-amber-500 text-white shadow-md'
                            : 'hover:bg-amber-100/50 text-slate-600'
                            }`}
                    >
                        <span className="flex items-center gap-2">
                            <span className="w-1.5 h-1.5 rounded-full bg-current opacity-40"></span>
                            {snap.date}
                        </span>
                        <div className="flex items-center gap-2">
                            {/* Icon to indicate full snapshot availability */}
                            {(snap.assets || snap.liabilities) ? (
                                <span title="Full Snapshot Available">💾</span>
                            ) : (
                                <span className="opacity-30" title="Net Worth Only">📉</span>
                            )}
                            <span className="opacity-70 text-xs font-mono">
                                {formatCurrency(convertAmount(snap.netWorth, 'USD', baseCurrency), baseCurrency)}
                            </span>
                        </div>
                    </button>
                ))}
            </div>

            {!currentDate && (
                <p className="text-[10px] text-slate-400 mt-3 text-center">
                    💾 = Full snapshot available • 📉 = Net Worth only
                </p>
            )}
        </div>
    );
}
