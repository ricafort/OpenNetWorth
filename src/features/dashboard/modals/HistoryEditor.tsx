'use client';

import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, Plus, Trash2, Save, Wand2 } from 'lucide-react';
import { loadNetWorthHistory, saveNetWorthHistory, generateMockHistory, persistScopedRecord, deleteScopedRecord } from '@/infrastructure/local_driver';
import { NetWorthSnapshot } from '@/types';
import { useNetWorth } from '@/features/dashboard/hooks/useNetWorth';
import { convertAmount, formatCurrency } from '@/lib/utils/currencyService';
import { useFocusTrap } from '@/hooks/useFocusTrap';

interface HistoryEditorProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: () => void; // Trigger reload in parent
}

export default function HistoryEditor({ isOpen, onClose, onSave }: HistoryEditorProps) {
    const { baseCurrency } = useNetWorth();
    const [history, setHistory] = useState<NetWorthSnapshot[]>([]);

    // New Entry State
    const [newDate, setNewDate] = useState('');
    const [newAssets, setNewAssets] = useState('');
    const [newLiabilities, setNewLiabilities] = useState('');

    // Error and saving state for user-facing feedback and input retention (Milestone 0)
    const [error, setError] = useState<string | null>(null);
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        if (isOpen) {
            setError(null);
            // Load and sort desc by date
            const loaded = loadNetWorthHistory();
            setHistory(loaded.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()));
        }
    }, [isOpen]);

    /**
     * Handles adding a new historical snapshot.
     * 
     * Why this exists:
     * Allows backfilling or manually recording net worth snapshots.
     * 
     * Tricky logic:
     * In accordance with honest persistence rules (Milestone 0):
     * 1. Attempt persistence to SQLite first.
     * 2. Only on HTTP 200 / success: update displayed history list, clear form fields, and notify parent via onSave().
     * 3. On failure: retain form inputs (newDate, newAssets, newLiabilities) and the existing history list,
     *    display an actionable error message, and do NOT invoke onSave().
     * 
     * TODO: Support importing CSV historical series directly from bank exports.
     */
    const handleAdd = async () => {
        if (!newDate || !newAssets || isSaving) return;

        setError(null);
        setIsSaving(true);

        const assetsBase = parseFloat(newAssets);
        const liabilitiesBase = parseFloat(newLiabilities || '0');

        // Why this exists:
        // Resolves Finding 2 & Clarification 4: Store snapshot in the exact currency entered (baseCurrency)
        // with explicit currency metadata rather than performing lossy mock USD conversion.
        // Tricky logic:
        // Snapshot retains currency: baseCurrency to prevent false currency equivalences in future views.
        // TODO: Support selecting arbitrary currency for historical backfill in Milestone 2.
        const newEntry: NetWorthSnapshot = {
            id: crypto.randomUUID(), // Ensure ID exists for compatibility
            date: newDate,
            totalAssets: Math.round(assetsBase),
            totalLiabilities: Math.round(liabilitiesBase),
            netWorth: Math.round(assetsBase - liabilitiesBase),
            currency: baseCurrency
        };

        try {
            /**
             * Why this exists:
             * Persists the history entry to SQLite via scoped save.
             * 
             * Tricky logic:
             * Capture and use the authoritative `persisted` record returned by persistScopedRecord!
             * When updating an existing history date, SQLite preserves the pre-existing row's primary key `id`.
             * If we used `newEntry.id` (a newly generated ephemeral UUID), the displayed list would hold an
             * ID that does not exist in SQLite, causing a subsequent delete on that updated item to fail with
             * "Record not found".
             * 
             * TODO: Support batch editing of multiple historical snapshots simultaneously.
             */
            const persisted = await persistScopedRecord('history', newEntry);

            // Update confirmed displayed list only after successful persistence with authoritative persisted ID
            const updated = [...history.filter(h => h.date !== persisted.date), persisted]
                .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
            setHistory(updated);

            // Reset form fields only on successful commit
            setNewAssets('');
            setNewLiabilities('');
            setNewDate('');

            onSave();
        } catch (err: any) {
            console.error('Failed to persist history snapshot to SQLite:', err);
            setError(err.message || 'Failed to save snapshot to local database. Your input has been preserved.');
        } finally {
            setIsSaving(false);
        }
    };

    /**
     * Handles deleting a historical snapshot.
     * 
     * Why this exists:
     * Allows removing erroneous or duplicate snapshots.
     * 
     * Tricky logic:
     * Delete from SQLite first. If deletion fails, keep the displayed list intact,
     * show an actionable error message, and do not call onSave().
     * 
     * TODO: Add undo toast support for deleted snapshots.
     */
    const handleDelete = async (dateToDelete: string) => {
        if (isSaving) return;
        setError(null);
        setIsSaving(true);

        const itemToDelete = history.find(h => h.date === dateToDelete);
        try {
            if (itemToDelete?.id) {
                await deleteScopedRecord('history', itemToDelete.id);
            } else {
                await deleteScopedRecord('history', dateToDelete);
            }

            // Update displayed list only after confirmed deletion
            const updated = history.filter(h => h.date !== dateToDelete);
            setHistory(updated);
            onSave();
        } catch (err: any) {
            console.error('Failed to delete history snapshot from SQLite:', err);
            setError(err.message || 'Failed to delete snapshot from local database. Record has not been removed.');
        } finally {
            setIsSaving(false);
        }
    };

    const handleGenerateMock = () => {
        if (confirm("This will overwrite your current history with 24 months of mock data. Continue?")) {
            generateMockHistory();
            setHistory(loadNetWorthHistory().sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()));
            onSave();
        }
    };

    const modalRef = useFocusTrap<HTMLDivElement>({ isOpen, onClose });

    if (!isOpen) return null;

    // Use a portal to render the modal at the body level to avoid z-index/stacking issues
    const modalContent = (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-md z-50 flex items-center justify-center p-4 animate-in fade-in duration-300">
            <div
                ref={modalRef}
                role="dialog"
                aria-modal="true"
                aria-labelledby="manage-history-title"
                tabIndex={-1}
                className="bg-card border border-border w-full max-w-2xl rounded-2xl shadow-2xl flex flex-col max-h-[85vh] overflow-hidden focus:outline-none"
            >

                {/* Header */}
                <div className="p-6 border-b border-border flex justify-between items-center bg-card">
                    <div>
                        <h2 id="manage-history-title" className="text-xl font-black text-foreground tracking-tight">Manage History</h2>
                        <p className="text-sm text-muted-foreground">Backfill or correct your net worth snapshots.</p>
                    </div>
                    <button
                        onClick={onClose}
                        aria-label="Close history editor"
                        className="p-2 hover:bg-muted rounded-xl transition-all cursor-pointer"
                    >
                        <X size={20} className="text-muted-foreground" />
                    </button>
                </div>

                {/* Body */}
                <div className="flex-1 overflow-y-auto p-6 space-y-8">
                    {/* Error Banner */}
                    {error && (
                        <div role="alert" className="p-4 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl font-medium flex items-center justify-between">
                            <span>{error}</span>
                            <button
                                onClick={() => setError(null)}
                                className="text-rose-500 hover:text-rose-700 ml-2 font-bold text-sm"
                                aria-label="Dismiss error"
                            >
                                &times;
                            </button>
                        </div>
                    )}

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
                                    className="w-full bg-background border border-border rounded-xl px-3 py-2.5 text-sm font-bold outline-none focus:ring-2 focus:ring-primary/20 transition-all cursor-pointer"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-black text-muted-foreground mb-1.5 uppercase tracking-wider">Total Assets ({baseCurrency})</label>
                                <input
                                    type="number"
                                    placeholder="0"
                                    value={newAssets}
                                    onChange={e => setNewAssets(e.target.value)}
                                    className="w-full bg-background border border-border rounded-xl px-3 py-2.5 text-sm font-bold outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-black text-muted-foreground mb-1.5 uppercase tracking-wider">Total Debt ({baseCurrency})</label>
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
                                disabled={!newDate || !newAssets || isSaving}
                                className="bg-primary text-primary-foreground font-black py-2.5 px-6 rounded-xl hover:opacity-90 disabled:opacity-50 transition-all text-sm uppercase tracking-wider active:scale-95 shadow-lg shadow-black/5"
                            >
                                {isSaving ? 'Saving...' : 'Add'}
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
                                    {history.map((entry) => {
                                        // Why this exists:
                                        // Resolves Finding 2 & Clarification 4: Truthfully formats historical amounts.
                                        // If currency is recorded, format with that currency.
                                        // If currency is undefined (legacy snapshot), display without false currency assumption.
                                        const entryCurr = entry.currency;
                                        const hasCurr = Boolean(entryCurr);
                                        const assetsFormatted = hasCurr ? formatCurrency(entry.totalAssets, entryCurr!) : `${entry.totalAssets.toLocaleString()}`;
                                        const liabFormatted = hasCurr ? formatCurrency(entry.totalLiabilities, entryCurr!) : `${entry.totalLiabilities.toLocaleString()}`;
                                        const nwFormatted = hasCurr ? formatCurrency(entry.netWorth, entryCurr!) : `${entry.netWorth.toLocaleString()}`;

                                        return (
                                            <tr key={entry.date} className="hover:bg-muted/50 transition-colors group">
                                                <td className="px-5 py-4 font-mono text-muted-foreground tracking-tight">
                                                    <div>{entry.date}</div>
                                                    {!hasCurr && (
                                                        <div className="text-[10px] text-amber-600 font-medium">Currency unrecorded</div>
                                                    )}
                                                </td>
                                                <td className="px-5 py-4 text-right font-black text-emerald-600">
                                                    {assetsFormatted}
                                                </td>
                                                <td className="px-5 py-4 text-right font-black text-rose-500">
                                                    {liabFormatted}
                                                </td>
                                                <td className="px-5 py-4 text-right font-black text-foreground">
                                                    {nwFormatted}
                                                </td>
                                                <td className="px-5 py-4 text-right">
                                                    <button
                                                        onClick={() => handleDelete(entry.date)}
                                                        disabled={isSaving}
                                                        aria-label={`Delete snapshot for ${entry.date}`}
                                                        className="text-muted-foreground/30 hover:text-rose-500 transition-all p-1 hover:scale-110 disabled:opacity-30 disabled:pointer-events-none"
                                                    >
                                                        <Trash2 size={14} />
                                                    </button>
                                                </td>
                                            </tr>
                                        );
                                    })}
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
