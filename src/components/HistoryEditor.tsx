'use client';

import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, Plus, Trash2, Save, Wand2 } from 'lucide-react';
import { loadNetWorthHistory, saveNetWorthHistory, generateMockHistory } from '@/lib/storage';
import { NetWorthSnapshot } from '@/types';

interface HistoryEditorProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: () => void; // Trigger reload in parent
}

export default function HistoryEditor({ isOpen, onClose, onSave }: HistoryEditorProps) {
    const [history, setHistory] = useState<NetWorthSnapshot[]>([]);

    // New Entry State
    const [newDate, setNewDate] = useState('');
    const [newAssets, setNewAssets] = useState('');
    const [newLiabilities, setNewLiabilities] = useState('');

    useEffect(() => {
        if (isOpen) {
            setHistory(loadNetWorthHistory().sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()));
        }
    }, [isOpen]);

    const handleAdd = () => {
        if (!newDate || !newAssets || !newLiabilities) return;

        const assets = Number(newAssets);
        const liabilities = Number(newLiabilities);

        const newEntry: NetWorthSnapshot = {
            date: newDate,
            totalAssets: assets,
            totalLiabilities: liabilities,
            netWorth: assets - liabilities
        };

        const updated = [...history, newEntry].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        setHistory(updated);
        saveNetWorthHistory(updated);

        // Reset form
        setNewAssets('');
        setNewLiabilities('');
        // Keep date? Maybe clear it.
        setNewDate('');

        onSave();
    };

    const handleDelete = (dateToDelete: string) => {
        const updated = history.filter(h => h.date !== dateToDelete);
        setHistory(updated);
        saveNetWorthHistory(updated);
        onSave();
    };

    const handleGenerateMock = () => {
        if (confirm("This will overwrite your current history with 24 months of mock data. Continue?")) {
            generateMockHistory();
            setHistory(loadNetWorthHistory().sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()));
            onSave();
        }
    };

    if (!isOpen) return null;

    // Use a portal to render the modal at the body level to avoid z-index/stacking issues
    const modalContent = (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-md z-50 flex items-center justify-center p-4 animate-in fade-in duration-300">
            <div className="bg-card border border-border w-full max-w-2xl rounded-2xl shadow-2xl flex flex-col max-h-[85vh] overflow-hidden">

                {/* Header */}
                <div className="p-6 border-b border-border flex justify-between items-center bg-card">
                    <div>
                        <h2 className="text-xl font-black text-foreground tracking-tight">Manage History</h2>
                        <p className="text-sm text-muted-foreground">Backfill or correct your net worth snapshots.</p>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-muted rounded-xl transition-all">
                        <X size={20} className="text-muted-foreground" />
                    </button>
                </div>

                {/* Body */}
                <div className="flex-1 overflow-y-auto p-6 space-y-8">

                    {/* Add New Form */}
                    <div className="bg-muted/30 p-5 rounded-2xl border border-border">
                        <h3 className="text-sm font-black text-foreground mb-4 flex items-center gap-2 uppercase tracking-widest opacity-70">
                            <Plus size={16} /> Add Snapshot
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
                            <div>
                                <label className="block text-xs font-black text-muted-foreground mb-1.5 uppercase tracking-wider">Date</label>
                                <input
                                    type="date"
                                    value={newDate}
                                    onChange={e => setNewDate(e.target.value)}
                                    className="w-full bg-background border border-border rounded-xl px-3 py-2.5 text-sm font-bold outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-black text-muted-foreground mb-1.5 uppercase tracking-wider">Total Assets</label>
                                <input
                                    type="number"
                                    placeholder="0"
                                    value={newAssets}
                                    onChange={e => setNewAssets(e.target.value)}
                                    className="w-full bg-background border border-border rounded-xl px-3 py-2.5 text-sm font-bold outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-black text-muted-foreground mb-1.5 uppercase tracking-wider">Total Debt</label>
                                <input
                                    type="number"
                                    placeholder="0"
                                    value={newLiabilities}
                                    onChange={e => setNewLiabilities(e.target.value)}
                                    className="w-full bg-background border border-border rounded-xl px-3 py-2.5 text-sm font-bold outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                                />
                            </div>
                            <button
                                onClick={handleAdd}
                                disabled={!newDate || !newAssets}
                                className="bg-primary text-primary-foreground font-black py-2.5 px-6 rounded-xl hover:opacity-90 disabled:opacity-50 transition-all text-sm uppercase tracking-wider active:scale-95 shadow-lg shadow-black/5"
                            >
                                Add
                            </button>
                        </div>
                    </div>

                    {/* History Table */}
                    <div>
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-sm font-black text-foreground uppercase tracking-widest opacity-70">History Log</h3>
                            <button
                                onClick={handleGenerateMock}
                                className="text-[10px] font-black text-indigo-600 hover:text-indigo-700 flex items-center gap-1.5 bg-indigo-50/50 px-3 py-1.5 rounded-full hover:bg-indigo-100 transition-all border border-indigo-100 uppercase tracking-wider"
                            >
                                <Wand2 size={12} /> Generate Mock Data
                            </button>
                        </div>

                        <div className="border border-border rounded-2xl overflow-hidden shadow-sm">
                            <table className="w-full text-sm text-left">
                                <thead className="bg-muted text-[10px] uppercase text-muted-foreground font-black border-b border-border tracking-wider">
                                    <tr>
                                        <th className="px-5 py-4">Date</th>
                                        <th className="px-5 py-4 text-right">Assets</th>
                                        <th className="px-5 py-4 text-right">Liabilities</th>
                                        <th className="px-5 py-4 text-right">Net Worth</th>
                                        <th className="px-5 py-4 w-10"></th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-border bg-card">
                                    {history.map((entry) => (
                                        <tr key={entry.date} className="hover:bg-muted/50 transition-colors group">
                                            <td className="px-5 py-4 font-mono text-muted-foreground tracking-tight">
                                                {entry.date}
                                            </td>
                                            <td className="px-5 py-4 text-right font-black text-emerald-600">
                                                ${entry.totalAssets.toLocaleString()}
                                            </td>
                                            <td className="px-5 py-4 text-right font-black text-rose-500">
                                                ${entry.totalLiabilities.toLocaleString()}
                                            </td>
                                            <td className="px-5 py-4 text-right font-black text-foreground">
                                                ${entry.netWorth.toLocaleString()}
                                            </td>
                                            <td className="px-5 py-4 text-right">
                                                <button
                                                    onClick={() => handleDelete(entry.date)}
                                                    className="text-muted-foreground/30 hover:text-rose-500 transition-all p-1 hover:scale-110"
                                                >
                                                    <Trash2 size={14} />
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                    {history.length === 0 && (
                                        <tr>
                                            <td colSpan={5} className="px-4 py-8 text-center text-slate-400 italic">
                                                No history found. Add a snapshot above or generate mock data.
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>

                </div>

                {/* Footer */}
                <div className="p-5 border-t border-border flex justify-end bg-card">
                    <button
                        onClick={onClose}
                        className="px-8 py-2.5 bg-muted text-foreground font-black rounded-xl hover:bg-border transition-all text-sm uppercase tracking-wider active:scale-95"
                    >
                        Done
                    </button>
                </div>
            </div>
        </div>
    );

    if (typeof document === 'undefined') return null;
    return createPortal(modalContent, document.body);
}
