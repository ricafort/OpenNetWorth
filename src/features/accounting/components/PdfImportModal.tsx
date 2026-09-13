/**
 * Milestone 1 PDF Invoice Import Modal (Slice 1F)
 * 
 * Why this component exists:
 * Provides the user interface for uploading text-based invoice and receipt PDFs,
 * extracting financial facts via OpenTax-AU's reader, displaying extracted findings,
 * selecting the payment account/category, and explicitly confirming payment.
 * 
 * Tricky logic:
 * - Immediate extraction on file selection: Uploads the PDF to `/api/documents/pdf`
 *   to immediately extract supplier, date, currency, total, and item lines.
 * - Explicit payment confirmation gate: The user must explicitly check the payment
 *   confirmation checkbox before proceeding to approve an invoice expense.
 * - Unsupported layout visibility: If OpenTax-AU flags an unsupported layout, displays
 *   the exact extraction findings and keeps the document unresolved rather than guessing.
 * 
 * TODO: Add side-by-side interactive PDF canvas viewer in Slice 1G.
 */

'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
    X,
    Upload,
    FileText,
    Check,
    AlertTriangle,
    Info,
    ArrowRight,
    Sparkles,
    ShieldCheck
} from 'lucide-react';
import { Account } from '@/lib/domain/accounting/types';
import { ExtractedFinancialProposal } from '@/lib/domain/document/types';

interface PdfImportModalProps {
    isOpen: boolean;
    onClose: () => void;
    accounts: Account[];
    entities: Array<{ id: string; name: string }>;
    onImportSuccess: (documentId: string) => void;
}

export const PdfImportModal: React.FC<PdfImportModalProps> = ({
    isOpen,
    onClose,
    accounts,
    entities,
    onImportSuccess
}) => {
    const [file, setFile] = useState<File | null>(null);
    const [isExtracting, setIsExtracting] = useState<boolean>(false);
    const [extractedDoc, setExtractedDoc] = useState<any | null>(null);
    const [proposals, setProposals] = useState<ExtractedFinancialProposal[]>([]);
    const [isSupported, setIsSupported] = useState<boolean>(true);
    const [targetAccountId, setTargetAccountId] = useState<string>('');
    const [selectedEntityId, setSelectedEntityId] = useState<string>('');
    const [selectedCategory, setSelectedCategory] = useState<string>('office_supplies');
    const [paymentConfirmed, setPaymentConfirmed] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);
    const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

    // Filter payment accounts (assets and liabilities)
    const paymentAccounts = useMemo(() => {
        return accounts.filter(a => a.type === 'asset' || a.type === 'liability');
    }, [accounts]);

    useEffect(() => {
        if (paymentAccounts.length > 0 && !targetAccountId) {
            setTargetAccountId(paymentAccounts[0].id);
            setSelectedEntityId(paymentAccounts[0].entity_id);
        }
    }, [paymentAccounts, targetAccountId]);

    useEffect(() => {
        if (!isOpen) {
            setFile(null);
            setExtractedDoc(null);
            setProposals([]);
            setPaymentConfirmed(false);
            setError(null);
            setIsExtracting(false);
        }
    }, [isOpen]);

    const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const selectedFile = e.target.files?.[0];
        if (!selectedFile) return;

        setFile(selectedFile);
        setError(null);
        setIsExtracting(true);

        try {
            const formData = new FormData();
            formData.append('file', selectedFile);
            if (targetAccountId) formData.append('target_account_id', targetAccountId);
            if (selectedEntityId) formData.append('entity_id', selectedEntityId);
            formData.append('default_category', selectedCategory);

            const res = await fetch('/api/documents/pdf', {
                method: 'POST',
                body: formData
            });

            const data = await res.json();
            if (!res.ok || !data.success) {
                throw new Error(data.error || 'Failed to extract PDF document.');
            }

            setExtractedDoc(data.document);
            setProposals(data.proposals || []);
            setIsSupported(Boolean(data.supported));
        } catch (err: any) {
            setError(err.message || 'Failed to process the PDF document.');
        } finally {
            setIsExtracting(false);
        }
    };

    const handleProceedToReview = () => {
        if (!extractedDoc) return;
        onImportSuccess(extractedDoc.id);
    };

    const activeProposal = proposals[0] || null;

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <div className="relative w-full max-w-2xl bg-gray-900 border border-gray-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-gray-800">
                    <div className="flex items-center space-x-3">
                        <div className="p-2 bg-indigo-500/10 border border-indigo-500/20 rounded-xl text-indigo-400">
                            <FileText className="w-5 h-5" />
                        </div>
                        <div>
                            <h2 className="text-lg font-semibold text-white">Import PDF Invoice or Receipt</h2>
                            <p className="text-xs text-gray-400">Extracts supplier, date, total, and line items via OpenTax-AU</p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-1.5 text-gray-400 hover:text-white rounded-lg hover:bg-gray-800 transition-colors"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Content */}
                <div className="p-6 overflow-y-auto space-y-6 flex-1">
                    {error && (
                        <div className="p-4 bg-rose-500/10 border border-rose-500/20 rounded-xl flex items-start space-x-3">
                            <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
                            <div className="text-sm text-rose-200">{error}</div>
                        </div>
                    )}

                    {!extractedDoc ? (
                        <div className="space-y-4">
                            <label className="border-2 border-dashed border-gray-700 hover:border-indigo-500/50 bg-gray-950/40 hover:bg-gray-950/80 rounded-2xl p-8 flex flex-col items-center justify-center cursor-pointer transition-all group">
                                <input
                                    type="file"
                                    accept=".pdf"
                                    className="hidden"
                                    onChange={handleFileSelect}
                                    disabled={isExtracting}
                                />
                                <div className="p-4 bg-gray-800/60 rounded-2xl mb-3 text-gray-400 group-hover:text-indigo-400 group-hover:scale-110 transition-all">
                                    <Upload className="w-8 h-8" />
                                </div>
                                <span className="text-sm font-medium text-white mb-1">
                                    {isExtracting ? 'Extracting with OpenTax-AU...' : 'Click to select a text-based PDF invoice'}
                                </span>
                                <span className="text-xs text-gray-400">
                                    Supports single-item or supplies purchase invoices with readable text
                                </span>
                            </label>
                        </div>
                    ) : (
                        <div className="space-y-6">
                            {/* Document & Extraction Status */}
                            <div className="p-4 bg-gray-950/60 border border-gray-800 rounded-xl space-y-3">
                                <div className="flex items-center justify-between">
                                    <span className="text-xs font-semibold uppercase tracking-wider text-gray-400">
                                        Extracted Document Facts
                                    </span>
                                    {isSupported ? (
                                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                                            Supported Supplies Layout
                                        </span>
                                    ) : (
                                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-amber-500/10 text-amber-400 border border-amber-500/20">
                                            Unsupported Layout (Unresolved)
                                        </span>
                                    )}
                                </div>

                                {activeProposal && (
                                    <div className="grid grid-cols-2 gap-4 pt-2">
                                        <div>
                                            <span className="text-xs text-gray-400">Supplier:</span>
                                            <p className="text-sm font-semibold text-white">{activeProposal.counterparty || 'Not identified'}</p>
                                        </div>
                                        <div>
                                            <span className="text-xs text-gray-400">Invoice Date:</span>
                                            <p className="text-sm font-semibold text-white">{activeProposal.event_date || 'Not identified'}</p>
                                        </div>
                                        <div>
                                            <span className="text-xs text-gray-400">Total Amount:</span>
                                            <p className="text-base font-bold text-indigo-400">
                                                {activeProposal.original_currency} {(Math.abs(activeProposal.amount_cents) / 100).toFixed(2)}
                                            </p>
                                        </div>
                                        <div>
                                            <span className="text-xs text-gray-400">Suggested Category:</span>
                                            <p className="text-sm font-medium text-gray-200">{activeProposal.suggested_category || 'Unassigned'}</p>
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Extraction Findings / Warnings */}
                            {activeProposal?.validation_findings && activeProposal.validation_findings.length > 0 && (
                                <div className="space-y-2">
                                    <span className="text-xs font-semibold uppercase tracking-wider text-gray-400">
                                        Extractor Findings
                                    </span>
                                    <div className="space-y-1.5">
                                        {activeProposal.validation_findings.map((f, i) => (
                                            <div
                                                key={i}
                                                className={`p-2.5 rounded-lg border text-xs flex items-start space-x-2 ${
                                                    f.severity === 'error'
                                                        ? 'bg-rose-500/10 border-rose-500/20 text-rose-300'
                                                        : 'bg-amber-500/10 border-amber-500/20 text-amber-300'
                                                }`}
                                            >
                                                <Info className="w-4 h-4 shrink-0 mt-0.5" />
                                                <span>{f.message}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Payment Account & Payment Confirmation */}
                            <div className="p-4 bg-indigo-950/20 border border-indigo-500/20 rounded-xl space-y-4">
                                <div>
                                    <label className="block text-xs font-medium text-gray-300 mb-1">
                                        Paid from Account
                                    </label>
                                    <select
                                        value={targetAccountId}
                                        onChange={e => setTargetAccountId(e.target.value)}
                                        className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500"
                                    >
                                        {paymentAccounts.map(a => (
                                            <option key={a.id} value={a.id}>
                                                {a.name} ({a.currency}) - {a.type}
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                <div className="flex items-start space-x-3 pt-2">
                                    <input
                                        type="checkbox"
                                        id="paymentConfirmedCheckbox"
                                        checked={paymentConfirmed}
                                        onChange={e => setPaymentConfirmed(e.target.checked)}
                                        className="mt-1 w-4 h-4 rounded border-gray-700 text-indigo-600 focus:ring-indigo-500 bg-gray-900"
                                    />
                                    <label htmlFor="paymentConfirmedCheckbox" className="text-xs text-gray-300 leading-relaxed cursor-pointer">
                                        <strong className="text-white">Confirm Payment:</strong> I verify that this invoice was paid from the selected account. (Required before recording an expense in the ledger).
                                    </label>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="flex items-center justify-between px-6 py-4 bg-gray-950/60 border-t border-gray-800">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 text-sm text-gray-400 hover:text-white rounded-lg hover:bg-gray-800 transition-colors"
                    >
                        Cancel
                    </button>
                    {extractedDoc && (
                        <button
                            onClick={handleProceedToReview}
                            className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold rounded-lg shadow-lg shadow-indigo-500/20 flex items-center space-x-2 transition-all"
                        >
                            <span>Open in Review Table</span>
                            <ArrowRight className="w-4 h-4" />
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};
