/**
 * Link Receipt Proposal to Bank Transaction Modal (Slice 1G)
 * 
 * Why this component exists:
 * Fulfills Slice 1G: Lets a user select an existing bank transaction for a PDF receipt
 * proposal, shows candidate transactions matching account, currency, amount, and nearby date,
 * and requires explicit confirmation to link as supporting evidence without creating
 * another expense or altering account balances.
 * 
 * Tricky logic:
 * - Automatically queries candidate transactions on open using `proposal_id`.
 * - Shows date delta ("Same day", "2 days prior", etc.) and match score to help users
 *   distinguish between candidate transactions.
 * - Highlights candidates that already have existing evidence attachments.
 * - Reassures the user with plain language that linking will NOT create a duplicate posting.
 * 
 * TODO: Add manual transaction search bar if candidate list is empty in Milestone 2.
 */

'use client';

import React, { useState, useEffect } from 'react';
import {
    Link2,
    X,
    Calendar,
    DollarSign,
    CheckCircle2,
    AlertCircle,
    Building2,
    Clock,
    FileText,
    ShieldCheck,
    RefreshCw
} from 'lucide-react';
import { ExtractedFinancialProposal, TransactionCandidate } from '@/lib/domain/document/types';

interface LinkTransactionModalProps {
    isOpen: boolean;
    onClose: () => void;
    proposal: ExtractedFinancialProposal | null;
    onLinked: () => void;
}

export const LinkTransactionModal: React.FC<LinkTransactionModalProps> = ({
    isOpen,
    onClose,
    proposal,
    onLinked
}) => {
    const [candidates, setCandidates] = useState<TransactionCandidate[]>([]);
    const [selectedCandidateId, setSelectedCandidateId] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (isOpen && proposal) {
            loadCandidates();
            setSelectedCandidateId(null);
            setError(null);
        }
    }, [isOpen, proposal]);

    const loadCandidates = async () => {
        if (!proposal) return;
        setIsLoading(true);
        setError(null);
        try {
            const res = await fetch(`/api/documents/proposals/candidates?proposal_id=${proposal.id}`);
            const data = await res.json();
            if (data.success && Array.isArray(data.candidates)) {
                setCandidates(data.candidates);
                // Auto-select the top candidate if available
                if (data.candidates.length > 0) {
                    setSelectedCandidateId(data.candidates[0].id);
                }
            } else {
                setError(data.error || 'Failed to load matching transactions.');
            }
        } catch (err: any) {
            setError(err.message || 'Error fetching candidates.');
        } finally {
            setIsLoading(false);
        }
    };

    const handleConfirmLink = async () => {
        if (!proposal || !selectedCandidateId) return;
        setIsSubmitting(true);
        setError(null);
        try {
            const res = await fetch('/api/documents/proposals/link', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    proposal_id: proposal.id,
                    transaction_id: selectedCandidateId
                })
            });
            const data = await res.json();
            if (data.success) {
                onLinked();
                onClose();
            } else {
                setError(data.error || 'Failed to link document to transaction.');
            }
        } catch (err: any) {
            setError(err.message || 'Error executing link.');
        } finally {
            setIsSubmitting(false);
        }
    };

    if (!isOpen || !proposal) return null;

    const formattedAmount = `${proposal.original_currency || 'AUD'} $${Math.abs(proposal.amount_cents / 100).toFixed(2)}`;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs">
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-2xl shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
                {/* Modal Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800">
                    <div className="flex items-center gap-2.5">
                        <div className="p-2 bg-blue-100 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 rounded-xl">
                            <Link2 className="w-5 h-5" />
                        </div>
                        <div>
                            <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                                Link Receipt to Existing Bank Transaction
                            </h3>
                            <p className="text-xs text-slate-500 dark:text-slate-400">
                                Attach this receipt as supporting evidence without creating a duplicate expense.
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition p-1 rounded-lg"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <div className="p-6 space-y-5">
                    {/* Proposal Summary Card */}
                    <div className="bg-slate-50 dark:bg-slate-800/60 p-4 rounded-xl border border-slate-200 dark:border-slate-700/80">
                        <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block mb-2">
                            Receipt Document Details
                        </span>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                            <div>
                                <span className="text-slate-400 block text-[11px]">Supplier / Payee</span>
                                <span className="font-semibold text-slate-800 dark:text-slate-200">
                                    {proposal.counterparty || proposal.description}
                                </span>
                            </div>
                            <div>
                                <span className="text-slate-400 block text-[11px]">Document Date</span>
                                <span className="font-mono font-semibold text-slate-800 dark:text-slate-200">
                                    {proposal.event_date}
                                </span>
                            </div>
                            <div>
                                <span className="text-slate-400 block text-[11px]">Amount</span>
                                <span className="font-mono font-bold text-rose-600 dark:text-rose-400">
                                    {formattedAmount}
                                </span>
                            </div>
                            <div>
                                <span className="text-slate-400 block text-[11px]">Category</span>
                                <span className="capitalize font-semibold text-slate-800 dark:text-slate-200">
                                    {proposal.suggested_category?.replace(/_/g, ' ') || 'Expense'}
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Zero Double Counting Assurance Banner */}
                    <div className="flex items-start gap-2.5 p-3 rounded-xl bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900/40 text-emerald-800 dark:text-emerald-300 text-xs">
                        <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400 flex-shrink-0 mt-0.5" />
                        <div>
                            <span className="font-bold block">Zero Financial Impact Guarantee</span>
                            <span>Linking attaches this document as verifiable proof to the selected bank transaction. Your account balances and reports will not be altered.</span>
                        </div>
                    </div>

                    {/* Error Banner */}
                    {error && (
                        <div className="flex items-center gap-2 p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-400 text-xs rounded-xl">
                            <AlertCircle className="w-4 h-4 flex-shrink-0" />
                            <span>{error}</span>
                        </div>
                    )}

                    {/* Candidate Transactions List */}
                    <div>
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                                Suggested Bank Transactions ({candidates.length})
                            </span>
                            <button
                                onClick={loadCandidates}
                                disabled={isLoading}
                                className="text-[11px] text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1 cursor-pointer"
                            >
                                <RefreshCw className={`w-3 h-3 ${isLoading ? 'animate-spin' : ''}`} />
                                Refresh Candidates
                            </button>
                        </div>

                        {isLoading ? (
                            <div className="py-8 text-center text-xs text-slate-400">
                                Searching ledger for matching transactions...
                            </div>
                        ) : candidates.length === 0 ? (
                            <div className="py-8 text-center bg-slate-50 dark:bg-slate-800/30 border border-dashed border-slate-200 dark:border-slate-800 rounded-xl space-y-2">
                                <p className="text-xs text-slate-600 dark:text-slate-400 font-medium">
                                    No matching bank transactions found.
                                </p>
                                <p className="text-[11px] text-slate-500 max-w-sm mx-auto">
                                    Make sure the bank statement covering this transaction is imported and approved before linking, or approve this receipt as a standalone expense.
                                </p>
                            </div>
                        ) : (
                            <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                                {candidates.map((c) => {
                                    const isSelected = selectedCandidateId === c.id;
                                    const dateDeltaText = c.date_difference_days === 0
                                        ? 'Same day'
                                        : `${c.date_difference_days} day${c.date_difference_days > 1 ? 's' : ''} difference`;

                                    return (
                                        <div
                                            key={c.id}
                                            onClick={() => setSelectedCandidateId(c.id)}
                                            className={`p-3.5 rounded-xl border transition cursor-pointer flex items-center justify-between gap-3 ${
                                                isSelected
                                                    ? 'bg-blue-50/70 dark:bg-blue-950/40 border-blue-300 dark:border-blue-700 ring-2 ring-blue-500/20'
                                                    : 'bg-white dark:bg-slate-850 border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800'
                                            }`}
                                        >
                                            <div className="flex items-start gap-3 min-w-0">
                                                <input
                                                    type="radio"
                                                    name="candidate_selection"
                                                    checked={isSelected}
                                                    onChange={() => setSelectedCandidateId(c.id)}
                                                    className="mt-1 text-blue-600 cursor-pointer"
                                                />
                                                <div className="min-w-0">
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-xs font-bold text-slate-900 dark:text-slate-100 truncate">
                                                            {c.description}
                                                        </span>
                                                        {c.payee_or_payer && c.payee_or_payer !== c.description && (
                                                            <span className="text-[11px] text-slate-500 truncate">
                                                                ({c.payee_or_payer})
                                                            </span>
                                                        )}
                                                    </div>
                                                    <div className="flex flex-wrap items-center gap-3 text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                                                        <span className="flex items-center gap-1 font-mono">
                                                            <Calendar className="w-3 h-3 text-slate-400" />
                                                            {c.date}
                                                        </span>
                                                        <span className="flex items-center gap-1">
                                                            <Building2 className="w-3 h-3 text-slate-400" />
                                                            {c.account_name}
                                                        </span>
                                                        <span className={`px-1.5 py-0.2 rounded text-[10px] font-semibold ${
                                                            c.date_difference_days === 0
                                                                ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400'
                                                                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                                                        }`}>
                                                            {dateDeltaText}
                                                        </span>
                                                        {c.has_existing_evidence && (
                                                            <span className="px-1.5 py-0.2 rounded text-[10px] bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-300 font-medium">
                                                                Has proof
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="text-right flex-shrink-0">
                                                <span className="font-mono font-bold text-xs text-slate-900 dark:text-slate-100 block">
                                                    {c.currency} ${Math.abs(c.amount_cents / 100).toFixed(2)}
                                                </span>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                </div>

                {/* Modal Footer */}
                <div className="flex items-center justify-end gap-3 px-6 py-4 bg-slate-50 dark:bg-slate-800/40 border-t border-slate-200 dark:border-slate-800">
                    <button
                        type="button"
                        onClick={onClose}
                        disabled={isSubmitting}
                        className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-slate-100 transition cursor-pointer"
                    >
                        Cancel
                    </button>
                    <button
                        type="button"
                        onClick={handleConfirmLink}
                        disabled={!selectedCandidateId || isSubmitting}
                        className="flex items-center gap-2 px-5 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-xl text-xs font-bold transition shadow-sm cursor-pointer"
                    >
                        {isSubmitting ? (
                            <>
                                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                                <span>Linking...</span>
                            </>
                        ) : (
                            <>
                                <Link2 className="w-3.5 h-3.5" />
                                <span>Confirm Link as Supporting Evidence</span>
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
};
