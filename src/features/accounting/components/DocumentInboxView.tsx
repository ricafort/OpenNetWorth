/**
 * Milestone 1 Document Inbox & Bank CSV Import View (Slice 1E)
 * 
 * Why this component exists:
 * Main entry point for the Document Inbox feature in Milestone 1.
 * Provides file retention management, proposal progress metrics, and launches the
 * interactive CSV import and proposal review workflows.
 * 
 * Tricky logic:
 * - Master-Detail navigation: Seamlessly transitions between the Document List view
 *   and the granular `ProposalReviewTable` without losing state or causing full page reloads.
 * - Live refresh: Reloads statistics after approvals so progress bars update immediately.
 * 
 * TODO: Add support for multi-statement bulk downloads and zip exports in Slice 1G.
 */

'use client';

import React, { useState, useEffect } from 'react';
import {
    Inbox,
    Upload,
    FileText,
    CheckCircle2,
    Clock,
    Layers,
    ArrowRight,
    RefreshCw,
    ShieldCheck,
    Bookmark
} from 'lucide-react';
import { CsvImportModal } from './CsvImportModal';
import { PdfImportModal } from './PdfImportModal';
import { ProposalReviewTable } from './ProposalReviewTable';
import { Account, Entity } from '@/lib/domain/accounting/types';

interface DocumentItem {
    id: string;
    filename: string;
    content_hash: string;
    byte_size: number;
    created_at: string;
    total_proposals: number;
    unreviewed_proposals: number;
    approved_proposals: number;
    linked_proposals?: number;
    rejected_proposals: number;
}

interface DocumentInboxViewProps {
    entities: Entity[];
    selectedEntityId: string;
}

export const DocumentInboxView: React.FC<DocumentInboxViewProps> = ({ entities, selectedEntityId }) => {
    const [documents, setDocuments] = useState<DocumentItem[]>([]);
    const [accounts, setAccounts] = useState<Account[]>([]);
    const [selectedDocumentId, setSelectedDocumentId] = useState<string | null>(null);
    const [isImportModalOpen, setIsImportModalOpen] = useState<boolean>(false);
    const [isPdfModalOpen, setIsPdfModalOpen] = useState<boolean>(false);
    const [isLoading, setIsLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);

    // Fetch documents, accounts, and entities
    const loadData = async () => {
        setIsLoading(true);
        setError(null);
        try {
            // 1. Fetch documents
            const docRes = await fetch('/api/documents');
            const docData = await docRes.json();
            if (docData.success && Array.isArray(docData.documents)) {
                setDocuments(docData.documents);
            }

            // 2. Fetch accounts from accounting API
            const accRes = await fetch('/api/accounting?view=overview');
            const accData = await accRes.json();
            if (accData.success) {
                if (Array.isArray(accData.accounts)) setAccounts(accData.accounts);
            }
        } catch (err: any) {
            setError(err.message || 'Failed to load inbox documents.');
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        loadData();
    }, []);

    // Summary statistics
    const totals = React.useMemo(() => {
        let totalProps = 0;
        let pendingProps = 0;
        let approvedProps = 0;
        let linkedProps = 0;

        for (const doc of documents) {
            totalProps += doc.total_proposals;
            pendingProps += doc.unreviewed_proposals;
            approvedProps += doc.approved_proposals;
            linkedProps += doc.linked_proposals || 0;
        }

        return {
            docCount: documents.length,
            totalProps,
            pendingProps,
            approvedProps,
            linkedProps
        };
    }, [documents]);

    const truncateHash = (hash: string) => {
        if (!hash) return '';
        return `${hash.substring(0, 8)}...${hash.substring(hash.length - 8)}`;
    };

    // If reviewing a specific document, render the ProposalReviewTable
    if (selectedDocumentId) {
        return (
            <ProposalReviewTable
                documentId={selectedDocumentId}
                onBack={() => {
                    setSelectedDocumentId(null);
                    loadData();
                }}
                accounts={accounts}
                entities={entities}
                onApprovalComplete={() => loadData()}
            />
        );
    }

    return (
        <div className="space-y-6">
            {/* Action & Metric Header */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-200 dark:border-slate-800 pb-5">
                    <div>
                        <div className="flex items-center gap-2">
                            <div className="p-2 bg-indigo-100 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 rounded-lg">
                                <Inbox className="w-5 h-5" />
                            </div>
                            <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">
                                Documents
                            </h2>
                        </div>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-2xl">
                            Import bank statements, receipts and invoices. Review transactions before saving them.
                        </p>
                    </div>

                    <div className="flex items-center gap-3">
                        <button
                            onClick={() => setIsPdfModalOpen(true)}
                            className="flex items-center gap-2 px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-100 border border-slate-700 rounded-xl text-xs font-bold transition shadow-sm cursor-pointer"
                        >
                            <FileText className="w-4 h-4 text-indigo-400" />
                            <span>Add receipt or invoice</span>
                        </button>
                        <button
                            onClick={() => setIsImportModalOpen(true)}
                            className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition shadow-sm cursor-pointer"
                        >
                            <Upload className="w-4 h-4" />
                            <span>Import bank statement</span>
                        </button>
                    </div>
                </div>

                {/* Metric Cards */}
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-4 mt-5">
                    <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-xl border border-slate-200 dark:border-slate-700/60">
                        <span className="text-slate-500 dark:text-slate-400 text-xs font-medium block">
                            Preserved Documents
                        </span>
                        <div className="flex items-center gap-2 mt-1">
                            <FileText className="w-4 h-4 text-slate-400" />
                            <span className="text-xl font-bold text-slate-900 dark:text-slate-100">
                                {totals.docCount}
                            </span>
                        </div>
                    </div>

                    <div className="bg-amber-50 dark:bg-amber-950/30 p-4 rounded-xl border border-amber-200 dark:border-amber-900/40">
                        <span className="text-amber-700 dark:text-amber-400 text-xs font-medium block">
                            Pending Review
                        </span>
                        <div className="flex items-center gap-2 mt-1">
                            <Clock className="w-4 h-4 text-amber-600" />
                            <span className="text-xl font-bold text-amber-700 dark:text-amber-400">
                                {totals.pendingProps} proposals
                            </span>
                        </div>
                    </div>

                    <div className="bg-emerald-50 dark:bg-emerald-950/30 p-4 rounded-xl border border-emerald-200 dark:border-emerald-900/40">
                        <span className="text-emerald-700 dark:text-emerald-400 text-xs font-medium block">
                            Posted to Ledger
                        </span>
                        <div className="flex items-center gap-2 mt-1">
                            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                            <span className="text-xl font-bold text-emerald-700 dark:text-emerald-400">
                                {totals.approvedProps} posted
                            </span>
                        </div>
                    </div>

                    <div className="bg-blue-50 dark:bg-blue-950/30 p-4 rounded-xl border border-blue-200 dark:border-blue-900/40">
                        <span className="text-blue-700 dark:text-blue-400 text-xs font-medium block">
                            Linked as Evidence
                        </span>
                        <div className="flex items-center gap-2 mt-1">
                            <Bookmark className="w-4 h-4 text-blue-600" />
                            <span className="text-xl font-bold text-blue-700 dark:text-blue-400">
                                {totals.linkedProps} linked
                            </span>
                        </div>
                    </div>

                    <div className="bg-indigo-50 dark:bg-indigo-950/30 p-4 rounded-xl border border-indigo-200 dark:border-indigo-900/40 col-span-2 sm:col-span-1">
                        <span className="text-indigo-700 dark:text-indigo-400 text-xs font-medium block">
                            Safety Guarantee
                        </span>
                        <div className="flex items-center gap-2 mt-1">
                            <ShieldCheck className="w-4 h-4 text-indigo-600" />
                            <span className="text-xs font-semibold text-indigo-700 dark:text-indigo-300">
                                $0 Double Counting
                            </span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Document List */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-sm">
                <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center">
                    <h3 className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider">
                        Imported Files
                    </h3>
                    <button
                        onClick={loadData}
                        className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                        title="Refresh"
                    >
                        <RefreshCw className="w-4 h-4" />
                    </button>
                </div>

                {isLoading ? (
                    <div className="p-12 text-center text-xs text-slate-400">
                        Loading documents...
                    </div>
                ) : documents.length === 0 ? (
                    <div className="p-16 text-center space-y-4">
                        <div className="mx-auto w-12 h-12 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400">
                            <Inbox className="w-6 h-6" />
                        </div>
                        <div className="max-w-sm mx-auto">
                            <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200">
                                No documents yet
                            </h4>
                            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                                Import a bank statement or receipt to review transactions and keep your records organized.
                            </p>
                        </div>
                        <button
                            onClick={() => setIsImportModalOpen(true)}
                            className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition shadow-sm"
                        >
                            <Upload className="w-4 h-4" />
                            <span>Import a bank statement</span>
                        </button>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs border-collapse">
                            <thead className="bg-slate-50 dark:bg-slate-800/70 text-slate-600 dark:text-slate-400 font-semibold border-b border-slate-200 dark:border-slate-800">
                                <tr>
                                    <th className="py-3 px-4">Filename</th>
                                    <th className="py-3 px-4">SHA-256 Content Hash</th>
                                    <th className="py-3 px-4">Size</th>
                                    <th className="py-3 px-4">Import Date</th>
                                    <th className="py-3 px-4">Approval Progress</th>
                                    <th className="py-3 px-4 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                                {documents.map(doc => {
                                    const settledCount = doc.approved_proposals + (doc.linked_proposals || 0);
                                    const percent = doc.total_proposals > 0
                                        ? Math.round((settledCount / doc.total_proposals) * 100)
                                        : 0;

                                    return (
                                        <tr
                                            key={doc.id}
                                            className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition"
                                        >
                                            <td className="py-3.5 px-4 font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                                                <FileText className="w-4 h-4 text-indigo-500 flex-shrink-0" />
                                                <span>{doc.filename}</span>
                                            </td>
                                            <td className="py-3.5 px-4 font-mono text-[11px] text-slate-500 dark:text-slate-400">
                                                {truncateHash(doc.content_hash)}
                                            </td>
                                            <td className="py-3.5 px-4 text-slate-600 dark:text-slate-400">
                                                {(doc.byte_size / 1024).toFixed(1)} KB
                                            </td>
                                            <td className="py-3.5 px-4 text-slate-600 dark:text-slate-400 whitespace-nowrap">
                                                {new Date(doc.created_at).toLocaleDateString()}
                                            </td>
                                            <td className="py-3.5 px-4">
                                                <div className="space-y-1.5 w-40">
                                                    <div className="flex justify-between text-[10px] text-slate-500 dark:text-slate-400 font-medium">
                                                        <span>
                                                            {settledCount} / {doc.total_proposals} settled
                                                            {Boolean(doc.linked_proposals && doc.linked_proposals > 0) && ` (${doc.linked_proposals} linked)`}
                                                        </span>
                                                        <span>{percent}%</span>
                                                    </div>
                                                    <div className="w-full h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                                                        <div
                                                            className={`h-full transition-all duration-300 ${percent === 100 ? 'bg-emerald-500' : 'bg-indigo-500'}`}
                                                            style={{ width: `${percent}%` }}
                                                        />
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="py-3.5 px-4 text-right">
                                                <button
                                                    onClick={() => setSelectedDocumentId(doc.id)}
                                                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 rounded-xl text-xs font-semibold transition"
                                                >
                                                    <span>Review transactions</span>
                                                    <ArrowRight className="w-3.5 h-3.5" />
                                                </button>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Import CSV Modal */}
            <CsvImportModal
                isOpen={isImportModalOpen}
                onClose={() => setIsImportModalOpen(false)}
                accounts={accounts}
                entities={entities}
                onImportSuccess={newDocId => {
                    loadData();
                    setSelectedDocumentId(newDocId);
                }}
            />

            {/* Import PDF Invoice Modal */}
            <PdfImportModal
                isOpen={isPdfModalOpen}
                onClose={() => setIsPdfModalOpen(false)}
                accounts={accounts}
                entities={entities}
                onImportSuccess={newDocId => {
                    loadData();
                    setSelectedDocumentId(newDocId);
                }}
            />
        </div>
    );
};
