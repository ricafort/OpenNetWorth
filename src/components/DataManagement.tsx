'use client';

import { useState, ChangeEvent, useEffect } from 'react';
import { Download, Upload, Trash2, AlertTriangle, FileJson } from 'lucide-react';
import { exportAllData, importData, clearAllData } from '@/lib/storage';

export default function DataManagement() {
    const [importStatus, setImportStatus] = useState<'idle' | 'success' | 'error'>('idle');
    const [lastExportDate, setLastExportDate] = useState<string | null>(null);

    useEffect(() => {
        if (typeof window !== 'undefined') {
            const saved = localStorage.getItem('last_export_date');
            setLastExportDate(saved);
        }
    }, []);

    const handleExport = () => {
        const data = exportAllData();
        const blob = new Blob([data], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `clearworth-backup-${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        // Save export date
        const now = new Date().toLocaleString();
        localStorage.setItem('last_export_date', now);
        setLastExportDate(now);
    };

    const handleImport = (event: ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (e) => {
            const result = e.target?.result as string;
            if (importData(result)) {
                setImportStatus('success');
                setTimeout(() => window.location.reload(), 1500);
            } else {
                setImportStatus('error');
            }
        };
        reader.readAsText(file);
    };

    const handleClear = () => {
        if (confirm('Are you absolutely sure? This will delete all your assets, liabilities, and settings. This action cannot be undone.')) {
            clearAllData();
            window.location.reload();
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
                <p className="text-sm text-rose-600 font-medium text-center">Failed to import data. Invalid file format.</p>
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
                                const { generateMockData } = require('@/lib/storage');
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
