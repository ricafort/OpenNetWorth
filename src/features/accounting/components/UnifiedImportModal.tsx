'use client';

import React from 'react';
import { X, FileSpreadsheet, FileText, Receipt, ArrowRight } from 'lucide-react';

interface UnifiedImportModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSelectBankCsv: () => void;
    onSelectStatementPdf: () => void;
    onSelectReceiptPdf: () => void;
}

export const UnifiedImportModal: React.FC<UnifiedImportModalProps> = ({
    isOpen,
    onClose,
    onSelectBankCsv,
    onSelectStatementPdf,
    onSelectReceiptPdf
}) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
            <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
                <div className="flex justify-between items-center p-6 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50">
                    <div>
                        <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">Import Document</h2>
                        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Select the type of document you want to import.</p>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-full transition-colors"
                    >
                        <X className="w-5 h-5 text-slate-500" />
                    </button>
                </div>

                <div className="p-6 overflow-y-auto space-y-4">
                    <button
                        onClick={onSelectBankCsv}
                        className="w-full text-left group flex items-start gap-4 p-5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:border-indigo-500 hover:shadow-md transition-all cursor-pointer"
                    >
                        <div className="p-3 rounded-lg bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 shrink-0">
                            <FileSpreadsheet className="w-6 h-6" />
                        </div>
                        <div className="flex-1">
                            <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">Bank Transactions (CSV)</h3>
                            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Import transaction history from a bank CSV. Creates or matches spending and income.</p>
                        </div>
                        <div className="shrink-0 self-center opacity-0 group-hover:opacity-100 -translate-x-4 group-hover:translate-x-0 transition-all">
                            <ArrowRight className="w-5 h-5 text-indigo-500" />
                        </div>
                    </button>

                    <button
                        onClick={onSelectStatementPdf}
                        className="w-full text-left group flex items-start gap-4 p-5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:border-blue-500 hover:shadow-md transition-all cursor-pointer"
                    >
                        <div className="p-3 rounded-lg bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 shrink-0">
                            <FileText className="w-6 h-6" />
                        </div>
                        <div className="flex-1">
                            <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">Balance Statement (PDF)</h3>
                            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Extract an official account balance. Updates your recorded net worth without creating double-counted transactions.</p>
                        </div>
                        <div className="shrink-0 self-center opacity-0 group-hover:opacity-100 -translate-x-4 group-hover:translate-x-0 transition-all">
                            <ArrowRight className="w-5 h-5 text-blue-500" />
                        </div>
                    </button>

                    <button
                        onClick={onSelectReceiptPdf}
                        className="w-full text-left group flex items-start gap-4 p-5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:border-emerald-500 hover:shadow-md transition-all cursor-pointer"
                    >
                        <div className="p-3 rounded-lg bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 shrink-0">
                            <Receipt className="w-6 h-6" />
                        </div>
                        <div className="flex-1">
                            <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">Receipt or Invoice (PDF)</h3>
                            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Extract purchase details to create an expense or attach evidence to an existing transaction.</p>
                        </div>
                        <div className="shrink-0 self-center opacity-0 group-hover:opacity-100 -translate-x-4 group-hover:translate-x-0 transition-all">
                            <ArrowRight className="w-5 h-5 text-emerald-500" />
                        </div>
                    </button>
                </div>
            </div>
        </div>
    );
};
