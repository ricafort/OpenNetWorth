'use client';

import { useState, ChangeEvent, useEffect } from 'react';
import { Download, Upload, Trash2, AlertTriangle, FileJson } from 'lucide-react';
import { exportAuthoritativeVault, importData, clearAllData } from '@/infrastructure/local_driver';

export default function DataManagement() {
    const [importStatus, setImportStatus] = useState<'idle' | 'success' | 'error'>('idle');
    const [importErrorMessage, setImportErrorMessage] = useState<string | null>(null);
    const [lastExportDate, setLastExportDate] = useState<string | null>(null);

    useEffect(() => {
        if (typeof window !== 'undefined') {
            const saved = localStorage.getItem('last_export_date');
            setLastExportDate(saved);
        }
    }, []);

    const handleExport = async () => {
        try {
            // Why: Use authoritative export from SQLite snapshot (Version 2) to ensure
            // all modern accounting and document tables are included.
            const data = await exportAuthoritativeVault();
            const blob = new Blob([data], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `opennetworth-backup-${new Date().toISOString().split('T')[0]}.json`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);

            // Save export date ONLY AFTER download trigger succeeds
            const now = new Date().toLocaleString();
            localStorage.setItem('last_export_date', now);
            setLastExportDate(now);
        } catch (e: any) {
            console.error('Export failed:', e);
            alert(`Export failed: ${e.message}`);
        }
    };

    const handleImport = (event: ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = async (e) => {
            const result = e.target?.result as string;
            const res = await importData(result);
            if (res.success) {
                setImportStatus('success');
                setImportErrorMessage(null);
                setTimeout(() => window.location.reload(), 1500);
            } else {
                setImportStatus('error');
                setImportErrorMessage(res.error || 'Failed to import data. Invalid file format.');
            }
        };
        reader.readAsText(file);
    };

    const handleClear = async () => {
        if (confirm('Are you absolutely sure? This will delete ALL your local financial data from this device. This action cannot be undone.')) {
            // Local-first wipe of SQLite database and localStorage (DATA-01, DATA-05)
            await clearAllData();

            // Short timeout to ensure storage commit before hard reload
            setTimeout(() => {
                window.location.href = '/';
            }, 100);
        }
    };

    return (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-6">
            <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
                    <FileJson size={24} />
                </div>
                <div>
                    <h3 className="text-lg font-bold text-slate-950">Data Management</h3>
                    <p className="text-sm text-slate-600">Export your data for backup or move it to another device.</p>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Export */}
                <button
                    onClick={handleExport}
                    className="flex items-center justify-center gap-2 p-4 border border-slate-200 rounded-xl hover:bg-slate-50 hover:border-blue-200 transition-all group"
                >
                    <Download size={20} className="text-slate-500 group-hover:text-blue-600" />
                    <div className="text-left">
                        <p className="font-bold text-slate-800">Export Backup</p>
                        <p className="text-xs text-slate-500">
                            {lastExportDate ? `Last: ${lastExportDate}` : 'Download .json file'}
                        </p>
                    </div>
                </button>

                {/* Import */}
                <label className="flex items-center justify-center gap-2 p-4 border border-slate-200 rounded-xl hover:bg-slate-50 hover:border-emerald-200 transition-all cursor-pointer group relative overflow-hidden">
                    <input type="file" accept=".json" onChange={handleImport} className="hidden" />

                    {importStatus === 'success' ? (
                        <div className="absolute inset-0 bg-emerald-50 flex items-center justify-center text-emerald-600 font-bold animate-in fade-in zoom-in">
                            Success! Reloading...
                        </div>
                    ) : (
                        <>
                            <Upload size={20} className="text-slate-500 group-hover:text-emerald-600" />
                            <div className="text-left">
                                <p className="font-bold text-slate-800">Import Data</p>
                                <p className="text-xs text-slate-500">Restore from .json</p>
                            </div>
                        </>
                    )}
                </label>
            </div>

            {importStatus === 'error' && (
                <div role="alert" className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-sm font-medium rounded-xl flex items-center gap-2">
                    <AlertTriangle size={16} className="shrink-0" />
                    <span>{importErrorMessage || 'Failed to import data. Invalid file format.'}</span>
                </div>
            )}

            <div className="pt-6 border-t border-slate-100 space-y-3">
                <button
                    onClick={handleClear}
                    className="w-full flex items-center justify-center gap-2 py-3 text-rose-600 hover:bg-rose-50 rounded-xl transition-colors text-sm font-bold"
                >
                    <Trash2 size={16} />
                    Erase All Data
                </button>

                <div className="text-center">
                    <button
                        onClick={() => {
                            if (confirm('This will overwrite current data. Proceed?')) {
                                const { generateMockData } = require('@/infrastructure/local_driver');
                                generateMockData();
                                window.location.reload();
                            }
                        }}
                        className="text-xs text-slate-400 hover:text-slate-600 font-medium underline"
                    >
                        Load Demo Data (For Testing)
                    </button>
                </div>
            </div>
        </div>
    );
}
