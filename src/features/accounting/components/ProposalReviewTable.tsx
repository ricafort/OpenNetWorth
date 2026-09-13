/**
 * Milestone 1 Proposal Review Table Component (Slice 1E)
 * 
 * Why this component exists:
 * Provides the interactive review and verification interface for extracted CSV proposals.
 * Allows users to review duplicate flags, correct counterpart categories, inspect source-row
 * evidence, and execute atomic double-entry approvals into the authoritative accounting ledger.
 * 
 * Tricky logic:
 * - Unresolved error rows cannot be selected for approval: Protects the ledger from invalid dates
 *   or missing amounts. Zero guesswork.
 * - Category override: Users can change the counterpart category per row before approving;
 *   the selected category is sent to `approveProposals`.
 * - Safe reimport: Already approved rows display an "Approved" badge and are excluded from duplicate posting.
 * 
 * TODO: Add keyboard navigation (arrow keys + spacebar to toggle approval) for high-speed power review.
 */

'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
    CheckCircle2,
    AlertTriangle,
    AlertCircle,
    ArrowLeft,
    Check,
    HelpCircle,
    FileText,
    ExternalLink,
    Filter,
    Layers,
    DollarSign,
    Edit3,
    X
} from 'lucide-react';
import {
    DocumentMetadata,
    ExtractedFinancialProposal,
    ValidationFinding
} from '@/lib/domain/document/types';
import { Account, CurrencyCode, CURRENCY_DECIMALS, formatMoney } from '@/lib/domain/accounting/types';

interface ProposalReviewTableProps {
    documentId: string;
    onBack: () => void;
    accounts: Account[];
    onApprovalComplete?: () => void;
}

export const ProposalReviewTable: React.FC<ProposalReviewTableProps> = ({
    documentId,
    onBack,
    accounts,
    onApprovalComplete
}) => {
    const [proposals, setProposals] = useState<ExtractedFinancialProposal[]>([]);
    const [document, setDocument] = useState<DocumentMetadata | null>(null);
    const [isLoading, setIsLoading] = useState<boolean>(true);
    const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);
    const [successMessage, setSuccessMessage] = useState<string | null>(null);

    // Filter status: 'all' | 'unreviewed' | 'approved' | 'issues'
    const [statusFilter, setStatusFilter] = useState<'all' | 'unreviewed' | 'approved' | 'issues'>('all');

    // Selection set for approval
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

    // Per-row category overrides: proposalId -> category
    const [categoryOverrides, setCategoryOverrides] = useState<Record<string, string>>({});

    // Payment confirmation map for invoice expense proposals (Slice 1F)
    const [paymentConfirmedMap, setPaymentConfirmedMap] = useState<Record<string, boolean>>({});

    // Target liquid account for this document
    const [targetAccountId, setTargetAccountId] = useState<string>('');

    // Edit Modal State (Slice 1F Fix 2)
    // Why this exists: Enables users to correct extracted supplier, date, amount, currency,
    // category, and payment account before committing to the double-entry ledger.
    const [editingProposal, setEditingProposal] = useState<ExtractedFinancialProposal | null>(null);
    const [editSupplier, setEditSupplier] = useState<string>('');
    const [editDate, setEditDate] = useState<string>('');
    const [editAmount, setEditAmount] = useState<string>('');
    const [editCurrency, setEditCurrency] = useState<CurrencyCode>('AUD');
    const [editCategory, setEditCategory] = useState<string>('office_supplies');
    const [editAccountId, setEditAccountId] = useState<string>('');
    const [editError, setEditError] = useState<string | null>(null);
    const [editSubmitting, setEditSubmitting] = useState<boolean>(false);

    /**
     * Initializes the edit modal with current proposal values.
     */
    const startEditing = (proposal: ExtractedFinancialProposal) => {
        setEditingProposal(proposal);
        setEditSupplier(proposal.counterparty || proposal.description || '');
        setEditDate(proposal.event_date);
        const scale = CURRENCY_DECIMALS[proposal.original_currency] ?? 2;
        const absMajor = (Math.abs(proposal.amount_cents) / Math.pow(10, scale)).toFixed(scale);
        setEditAmount(absMajor);
        setEditCurrency(proposal.original_currency || 'AUD');
        setEditCategory(proposal.suggested_category || 'office_supplies');
        setEditAccountId(proposal.account_id || targetAccountId || accounts[0]?.id || '');
        setEditError(null);
    };

    /**
     * Validates and submits edited proposal fields via PATCH /api/documents/proposals.
     * Tricky logic:
     * - Multiplies amount by 10^scale based on the selected currency so minor units are exact integers.
     * - Preserves sign (expense vs income).
     * - Ensures account currency matches proposal currency before sending to backend.
     * - Backend rejects review_status === 'approved' to protect double-entry invariants.
     * 
     * TODO: Support partial field updates with history logging in Slice 1G.
     */
    const handleSaveEdit = async () => {
        if (!editingProposal) return;
        setEditError(null);
        setEditSubmitting(true);

        try {
            // Validate date format and validity
            if (!/^\d{4}-\d{2}-\d{2}$/.test(editDate)) {
                throw new Error('Date must be in YYYY-MM-DD format.');
            }
            const parsedDate = new Date(editDate);
            if (isNaN(parsedDate.getTime()) || parsedDate.toISOString().substring(0, 10) !== editDate) {
                throw new Error('Please enter a valid calendar date.');
            }

            // Validate amount
            const parsedAmount = parseFloat(editAmount);
            if (isNaN(parsedAmount) || parsedAmount < 0) {
                throw new Error('Amount must be a positive number.');
            }
            const scale = CURRENCY_DECIMALS[editCurrency] ?? 2;
            const amountCents = Math.round(parsedAmount * Math.pow(10, scale));
            const finalSignedCents = editingProposal.event_type === 'income' ? amountCents : -amountCents;

            // Validate account currency match
            if (editAccountId) {
                const acc = accounts.find(a => a.id === editAccountId);
                if (acc && acc.currency.toUpperCase() !== editCurrency.toUpperCase()) {
                    throw new Error(`Selected payment account currency (${acc.currency}) does not match proposal currency (${editCurrency}).`);
                }
            }

            const res = await fetch('/api/documents/proposals', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    proposal_id: editingProposal.id,
                    event_date: editDate,
                    counterparty: editSupplier,
                    description: `${editSupplier} purchase`,
                    amount_cents: finalSignedCents,
                    original_currency: editCurrency,
                    account_id: editAccountId || undefined,
                    suggested_category: editCategory
                })
            });

            const data = await res.json();
            if (!res.ok || !data.success) {
                throw new Error(data.error || 'Failed to update proposal.');
            }

            // Update proposals in state
            setProposals(prev => prev.map(p => p.id === data.proposal.id ? data.proposal : p));

            // Fix 1: Synchronize the approval target with the saved account.
            // Why this exists: If the user corrects payment account from Account A to Account B,
            // the approval target must switch to Account B to avoid account-mismatch validation errors upon approval.
            if (data.proposal.account_id) {
                setTargetAccountId(data.proposal.account_id);
            }

            // Fix 2: Synchronize category overrides so approval and table use the latest saved edit.
            // Why this exists: If the user previously selected a category in the table dropdown (e.g. Groceries),
            // and subsequently edits and saves a new category (e.g. Utilities), the override map must be updated
            // to ensure approval uses the latest saved edit rather than stale table state.
            if (data.proposal.suggested_category) {
                setCategoryOverrides(prev => ({
                    ...prev,
                    [data.proposal.id]: data.proposal.suggested_category
                }));
            }

            setSuccessMessage(`Updated proposal successfully.`);
            setEditingProposal(null);
        } catch (err: any) {
            setEditError(err.message || 'An error occurred while saving corrections.');
        } finally {
            setEditSubmitting(false);
        }
    };

    // Fetch document metadata and proposals
    const loadProposals = async () => {
        setIsLoading(true);
        setError(null);
        try {
            // 1. Fetch document list to find metadata
            const docRes = await fetch('/api/documents');
            const docData = await docRes.json();
            if (docData.success && Array.isArray(docData.documents)) {
                const found = docData.documents.find((d: any) => d.id === documentId);
                if (found) setDocument(found);
            }

            // 2. Fetch proposals for document
            const propRes = await fetch(`/api/documents/proposals?document_id=${documentId}`);
            const propData = await propRes.json();
            if (propData.success && Array.isArray(propData.proposals)) {
                setProposals(propData.proposals);

                // Set initial target account from first proposal
                if (propData.proposals.length > 0 && propData.proposals[0].account_id) {
                    setTargetAccountId(propData.proposals[0].account_id);
                }

                // Initialize default selection: select all valid unreviewed proposals
                const validUnreviewed = new Set<string>();
                for (const p of propData.proposals) {
                    const hasError = p.validation_findings.some((f: ValidationFinding) => f.severity === 'error');
                    if (!hasError && p.review_status === 'unreviewed') {
                        validUnreviewed.add(p.id);
                    }
                }
                setSelectedIds(validUnreviewed);
            } else {
                throw new Error(propData.error || 'Failed to load proposals.');
            }
        } catch (err: any) {
            setError(err.message || 'Failed to fetch proposals.');
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        loadProposals();
    }, [documentId]);

    // Summary metrics
    const metrics = useMemo(() => {
        let unreviewed = 0;
        let approved = 0;
        let withIssues = 0;

        for (const p of proposals) {
            if (p.review_status === 'approved') approved++;
            else if (p.review_status === 'unreviewed') unreviewed++;

            const hasWarningOrError = p.validation_findings.length > 0;
            if (hasWarningOrError) withIssues++;
        }

        return {
            total: proposals.length,
            unreviewed,
            approved,
            withIssues
        };
    }, [proposals]);

    // Filtered proposals for display
    const filteredProposals = useMemo(() => {
        return proposals.filter(p => {
            if (statusFilter === 'unreviewed') return p.review_status === 'unreviewed';
            if (statusFilter === 'approved') return p.review_status === 'approved';
            if (statusFilter === 'issues') return p.validation_findings.length > 0;
            return true;
        });
    }, [proposals, statusFilter]);

    // Toggle single proposal selection
    const toggleSelect = (id: string, hasError: boolean, isApproved: boolean) => {
        if (hasError || isApproved) return; // Cannot select errors or already approved
        setSelectedIds(prev => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
    };

    // Toggle select all valid unreviewed
    const toggleSelectAll = () => {
        const validUnreviewed = proposals.filter(p => {
            const hasError = p.validation_findings.some(f => f.severity === 'error');
            return !hasError && p.review_status === 'unreviewed';
        });

        const allSelected = validUnreviewed.every(p => selectedIds.has(p.id));
        if (allSelected) {
            // Deselect all
            setSelectedIds(new Set());
        } else {
            // Select all valid
            setSelectedIds(new Set(validUnreviewed.map(p => p.id)));
        }
    };

    // Execute atomic batch approval
    const handleBatchApprove = async () => {
        if (selectedIds.size === 0) return;
        if (!targetAccountId) {
            setError('Please select a target bank account for posting.');
            return;
        }

        // Fix 3: Validate payment confirmation BEFORE setting isSubmitting=true.
        // Why this exists: If payment confirmation is missing for any invoice proposal,
        // returning early before setting isSubmitting ensures the approve button is not stuck
        // in "Committing Transactions...", allowing the user to check "Paid" and retry immediately without reloading.
        const isPdfDoc = document?.mime_type === 'application/pdf';
        if (isPdfDoc) {
            const unconfirmed = proposals.filter(p => selectedIds.has(p.id) && !paymentConfirmedMap[p.id]);
            if (unconfirmed.length > 0) {
                setError('Please explicitly confirm payment for all selected invoice proposals before approving.');
                return;
            }
        }

        setIsSubmitting(true);
        setError(null);
        setSuccessMessage(null);

        const itemsToApprove = proposals
            .filter(p => selectedIds.has(p.id))
            .map(p => ({
                proposal_id: p.id,
                category: categoryOverrides[p.id] || p.suggested_category || 'office_supplies',
                description: p.description,
                counterparty: p.counterparty || p.description,
                payment_confirmed: paymentConfirmedMap[p.id] ?? (!isPdfDoc)
            }));

        try {
            const res = await fetch('/api/documents/proposals', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    document_id: documentId,
                    target_account_id: targetAccountId,
                    items: itemsToApprove
                })
            });

            const data = await res.json();
            if (!res.ok || !data.success) {
                throw new Error(data.error || 'Batch approval failed.');
            }

            setSuccessMessage(`Successfully approved and posted ${data.approved_count} transaction(s) into the double-entry ledger.`);
            setSelectedIds(new Set());
            await loadProposals();

            if (onApprovalComplete) {
                onApprovalComplete();
            }
        } catch (err: any) {
            setError(err.message || 'An error occurred during batch approval.');
        } finally {
            setIsSubmitting(false);
        }
    };

    // Truncate SHA-256 for display
    const truncateHash = (hash?: string) => {
        if (!hash) return '';
        return `${hash.substring(0, 8)}...${hash.substring(hash.length - 8)}`;
    };

    return (
        <div className="space-y-6">
            {/* Top Bar Navigation & Document Metadata */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm space-y-4">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <div className="flex items-center gap-3">
                        <button
                            onClick={onBack}
                            className="p-2 text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                            title="Back to Document Inbox"
                        >
                            <ArrowLeft className="w-5 h-5" />
                        </button>
                        <div>
                            <div className="flex items-center gap-2">
                                <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">
                                    {document?.filename || 'Document Review'}
                                </h2>
                                <span className="text-[11px] font-mono px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700">
                                    SHA-256: {truncateHash(document?.content_hash)}
                                </span>
                            </div>
                            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                                Review column extractions, duplicate flags, and confirm atomic ledger entries.
                            </p>
                        </div>
                    </div>

                    {/* Target Bank Account Picker */}
                    <div className="flex items-center gap-2 text-xs">
                        <span className="font-medium text-slate-600 dark:text-slate-400">Target Bank Account:</span>
                        <select
                            value={targetAccountId}
                            onChange={e => setTargetAccountId(e.target.value)}
                            className="px-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-semibold text-slate-900 dark:text-slate-100 outline-none"
                        >
                            {accounts.filter(a => a.type === 'asset').map(acc => (
                                <option key={acc.id} value={acc.id}>
                                    {acc.name} ({acc.currency})
                                </option>
                            ))}
                        </select>
                    </div>
                </div>

                {/* Progress / Status Metrics */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-3 border-t border-slate-200 dark:border-slate-800 text-xs">
                    <div className="bg-slate-50 dark:bg-slate-800/50 p-2.5 rounded-xl border border-slate-200 dark:border-slate-700/60">
                        <span className="text-slate-500 dark:text-slate-400 block text-[11px]">Total Extracted</span>
                        <span className="text-base font-bold text-slate-900 dark:text-slate-100">{metrics.total} rows</span>
                    </div>
                    <div className="bg-amber-50 dark:bg-amber-950/30 p-2.5 rounded-xl border border-amber-200 dark:border-amber-900/40">
                        <span className="text-amber-700 dark:text-amber-400 block text-[11px]">Unreviewed</span>
                        <span className="text-base font-bold text-amber-700 dark:text-amber-400">{metrics.unreviewed} pending</span>
                    </div>
                    <div className="bg-emerald-50 dark:bg-emerald-950/30 p-2.5 rounded-xl border border-emerald-200 dark:border-emerald-900/40">
                        <span className="text-emerald-700 dark:text-emerald-400 block text-[11px]">Confirmed in Ledger</span>
                        <span className="text-base font-bold text-emerald-700 dark:text-emerald-400">{metrics.approved} approved</span>
                    </div>
                    <div className="bg-rose-50 dark:bg-rose-950/30 p-2.5 rounded-xl border border-rose-200 dark:border-rose-900/40">
                        <span className="text-rose-700 dark:text-rose-400 block text-[11px]">Issues & Duplicates</span>
                        <span className="text-base font-bold text-rose-700 dark:text-rose-400">{metrics.withIssues} flagged</span>
                    </div>
                </div>
            </div>

            {/* Error / Success Banners */}
            {error && (
                <div className="p-4 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/50 rounded-2xl flex items-start gap-3 text-rose-700 dark:text-rose-300 text-xs">
                    <AlertTriangle className="w-5 h-5 flex-shrink-0 text-rose-600" />
                    <div>
                        <span className="font-bold block">Approval Failed</span>
                        <span>{error}</span>
                    </div>
                </div>
            )}

            {successMessage && (
                <div className="p-4 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900/50 rounded-2xl flex items-start gap-3 text-emerald-700 dark:text-emerald-300 text-xs">
                    <CheckCircle2 className="w-5 h-5 flex-shrink-0 text-emerald-600" />
                    <div>
                        <span className="font-bold block">Success</span>
                        <span>{successMessage}</span>
                    </div>
                </div>
            )}

            {/* Action Bar & Filter Controls */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-3.5 rounded-2xl">
                {/* Filter Tabs */}
                <div className="flex bg-slate-100 dark:bg-slate-800/80 p-1 rounded-xl text-xs font-semibold">
                    <button
                        onClick={() => setStatusFilter('all')}
                        className={`px-3 py-1.5 rounded-lg transition ${statusFilter === 'all' ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-sm' : 'text-slate-600 dark:text-slate-400'}`}
                    >
                        All ({metrics.total})
                    </button>
                    <button
                        onClick={() => setStatusFilter('unreviewed')}
                        className={`px-3 py-1.5 rounded-lg transition ${statusFilter === 'unreviewed' ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-sm' : 'text-slate-600 dark:text-slate-400'}`}
                    >
                        Pending ({metrics.unreviewed})
                    </button>
                    <button
                        onClick={() => setStatusFilter('approved')}
                        className={`px-3 py-1.5 rounded-lg transition ${statusFilter === 'approved' ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-sm' : 'text-slate-600 dark:text-slate-400'}`}
                    >
                        Approved ({metrics.approved})
                    </button>
                    <button
                        onClick={() => setStatusFilter('issues')}
                        className={`px-3 py-1.5 rounded-lg transition ${statusFilter === 'issues' ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-sm' : 'text-slate-600 dark:text-slate-400'}`}
                    >
                        Issues ({metrics.withIssues})
                    </button>
                </div>

                {/* Batch Actions */}
                <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-end">
                    <button
                        onClick={toggleSelectAll}
                        className="text-xs font-semibold text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 px-2 py-1"
                    >
                        {proposals.filter(p => p.review_status === 'unreviewed' && !p.validation_findings.some(f => f.severity === 'error')).every(p => selectedIds.has(p.id))
                            ? 'Deselect All'
                            : 'Select All Valid'}
                    </button>

                    <button
                        onClick={handleBatchApprove}
                        disabled={selectedIds.size === 0 || isSubmitting}
                        className="flex items-center gap-2 px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold disabled:opacity-50 transition shadow-sm"
                    >
                        {isSubmitting ? (
                            <span>Committing Transactions...</span>
                        ) : (
                            <>
                                <Check className="w-4 h-4" />
                                <span>Approve Selected ({selectedIds.size})</span>
                            </>
                        )}
                    </button>
                </div>
            </div>

            {/* Review Proposals Table */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-sm">
                {isLoading ? (
                    <div className="p-12 text-center text-xs text-slate-400">
                        Loading extracted proposals...
                    </div>
                ) : filteredProposals.length === 0 ? (
                    <div className="p-12 text-center text-xs text-slate-500">
                        No proposals found matching the selected filter.
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs border-collapse">
                            <thead className="bg-slate-50 dark:bg-slate-800/70 text-slate-600 dark:text-slate-400 font-semibold border-b border-slate-200 dark:border-slate-800">
                                <tr>
                                    <th className="py-3 px-4 w-10 text-center">
                                        <input
                                            type="checkbox"
                                            onChange={toggleSelectAll}
                                            checked={
                                                filteredProposals.some(p => selectedIds.has(p.id)) &&
                                                filteredProposals.filter(p => p.review_status === 'unreviewed' && !p.validation_findings.some(f => f.severity === 'error')).every(p => selectedIds.has(p.id))
                                            }
                                            className="rounded border-slate-300 text-indigo-600"
                                        />
                                    </th>
                                    <th className="py-3 px-3">Date</th>
                                    <th className="py-3 px-3">Description / Payee</th>
                                    <th className="py-3 px-3 text-right">Inflow / Outflow</th>
                                    <th className="py-3 px-3">Counterpart Category</th>
                                    {document?.mime_type === 'application/pdf' && (
                                        <th className="py-3 px-3">Payment Confirmed</th>
                                    )}
                                    <th className="py-3 px-3">Flags & Status</th>
                                    <th className="py-3 px-3">Evidence Source</th>
                                    <th className="py-3 px-3 text-center">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                                {filteredProposals.map(proposal => {
                                    const hasError = proposal.validation_findings.some(f => f.severity === 'error');
                                    const internalDup = proposal.validation_findings.find(f => f.code === 'SUSPECTED_DUPLICATE_INTERNAL');
                                    const externalDup = proposal.validation_findings.find(f => f.code === 'POSSIBLE_DUPLICATE_EXISTING');
                                    const isApproved = proposal.review_status === 'approved';
                                    const isSelected = selectedIds.has(proposal.id);

                                    const isIncome = proposal.event_type === 'income';
                                    const currentCategory = categoryOverrides[proposal.id] || proposal.suggested_category || 'living_expense';

                                    return (
                                        <tr
                                            key={proposal.id}
                                            className={`transition ${hasError ? 'bg-rose-50/40 dark:bg-rose-950/20' : isApproved ? 'bg-slate-50/50 dark:bg-slate-800/30' : isSelected ? 'bg-indigo-50/40 dark:bg-indigo-950/20' : 'hover:bg-slate-50/60 dark:hover:bg-slate-800/40'}`}
                                        >
                                            {/* Selection Checkbox */}
                                            <td className="py-3 px-4 text-center">
                                                <input
                                                    type="checkbox"
                                                    disabled={hasError || isApproved}
                                                    checked={isSelected}
                                                    onChange={() => toggleSelect(proposal.id, hasError, isApproved)}
                                                    className="rounded border-slate-300 text-indigo-600 disabled:opacity-30 cursor-pointer disabled:cursor-not-allowed"
                                                />
                                            </td>

                                            {/* Date */}
                                            <td className="py-3 px-3 font-mono text-slate-800 dark:text-slate-200 whitespace-nowrap">
                                                {proposal.event_date}
                                            </td>

                                            {/* Description */}
                                            <td className="py-3 px-3 text-slate-900 dark:text-slate-100 font-medium max-w-[240px] truncate">
                                                {proposal.description}
                                            </td>

                                            {/* Amount */}
                                            <td className={`py-3 px-3 text-right font-mono font-bold whitespace-nowrap ${isIncome ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-900 dark:text-slate-100'}`}>
                                                {isIncome ? '+' : '-'}${Math.abs(proposal.amount_cents / 100).toFixed(2)}
                                            </td>

                                            {/* Category Selector */}
                                            <td className="py-3 px-3">
                                                {isApproved ? (
                                                    <span className="capitalize text-slate-600 dark:text-slate-400">
                                                        {currentCategory.replace(/_/g, ' ')}
                                                    </span>
                                                ) : (
                                                    <select
                                                        value={currentCategory}
                                                        onChange={e => {
                                                            const cat = e.target.value;
                                                            setCategoryOverrides(prev => ({ ...prev, [proposal.id]: cat }));
                                                        }}
                                                        disabled={hasError}
                                                        className="px-2.5 py-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs outline-none capitalize text-slate-800 dark:text-slate-200"
                                                    >
                                                        {isIncome ? (
                                                            <>
                                                                <option value="salary">Salary / Wage</option>
                                                                <option value="business_income">Business Income</option>
                                                                <option value="investment_income">Investment / Dividend</option>
                                                                <option value="other_income">Other Income</option>
                                                            </>
                                                        ) : (
                                                            <>
                                                                <option value="living_expense">Living Expense</option>
                                                                <option value="office_supplies">Office Supplies</option>
                                                                <option value="groceries">Groceries</option>
                                                                <option value="utilities">Utilities</option>
                                                                <option value="rent_expense">Rent</option>
                                                                <option value="transportation">Transportation</option>
                                                                <option value="entertainment">Entertainment</option>
                                                                <option value="healthcare">Healthcare</option>
                                                                <option value="interest_expense">Interest / Finance</option>
                                                                <option value="insurance">Insurance</option>
                                                            </>
                                                        )}
                                                    </select>
                                                )}
                                            </td>

                                            {/* Payment Confirmed (Slice 1F) */}
                                            {document?.mime_type === 'application/pdf' && (
                                                <td className="py-3 px-3">
                                                    {isApproved ? (
                                                        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
                                                            <CheckCircle2 className="w-3.5 h-3.5" />
                                                            Confirmed
                                                        </span>
                                                    ) : (
                                                        <label className="inline-flex items-center gap-1.5 cursor-pointer text-slate-700 dark:text-slate-300">
                                                            <input
                                                                type="checkbox"
                                                                checked={paymentConfirmedMap[proposal.id] ?? false}
                                                                onChange={e => {
                                                                    const checked = e.target.checked;
                                                                    setPaymentConfirmedMap(prev => ({ ...prev, [proposal.id]: checked }));
                                                                }}
                                                                className="rounded border-slate-300 text-indigo-600 cursor-pointer"
                                                            />
                                                            <span className="text-[11px]">Paid</span>
                                                        </label>
                                                    )}
                                                </td>
                                            )}

                                            {/* Flags & Status */}
                                            <td className="py-3 px-3">
                                                <div className="flex flex-wrap items-center gap-1.5">
                                                    {isApproved ? (
                                                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-400 font-semibold text-[10px]">
                                                            <CheckCircle2 className="w-3 h-3" />
                                                            Approved
                                                        </span>
                                                    ) : hasError ? (
                                                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-400 font-semibold text-[10px]">
                                                            <AlertCircle className="w-3 h-3" />
                                                            {proposal.validation_findings[0]?.message}
                                                        </span>
                                                    ) : (
                                                        <>
                                                            <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-[10px]">
                                                                Unreviewed
                                                            </span>
                                                            {internalDup && (
                                                                <span
                                                                    title={internalDup.message}
                                                                    className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 font-medium text-[10px]"
                                                                >
                                                                    <AlertTriangle className="w-2.5 h-2.5" />
                                                                    File Duplicate
                                                                </span>
                                                            )}
                                                            {externalDup && (
                                                                <span
                                                                    title={externalDup.message}
                                                                    className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full bg-purple-100 dark:bg-purple-950 text-purple-800 dark:text-purple-300 font-medium text-[10px]"
                                                                >
                                                                    <AlertTriangle className="w-2.5 h-2.5" />
                                                                    Ledger Match
                                                                </span>
                                                            )}
                                                        </>
                                                    )}
                                                </div>
                                            </td>

                                            {/* Evidence Source */}
                                            <td className="py-3 px-3 font-mono text-[11px] text-slate-500 dark:text-slate-400 whitespace-nowrap">
                                                <span
                                                    title={proposal.evidence.source_snippet || ''}
                                                    className="cursor-help hover:text-indigo-600 dark:hover:text-indigo-400"
                                                >
                                                    {proposal.evidence.cell_reference}
                                                </span>
                                            </td>

                                            {/* Actions / Edit (Slice 1F Fix 2) */}
                                            <td className="py-3 px-3 text-center whitespace-nowrap">
                                                {!isApproved ? (
                                                    <button
                                                        type="button"
                                                        onClick={() => startEditing(proposal)}
                                                        className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-indigo-600 hover:text-indigo-800 dark:text-indigo-400 dark:hover:text-indigo-200 bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/40 dark:hover:bg-indigo-900/60 rounded-lg transition"
                                                        title="Edit proposal fields"
                                                    >
                                                        <Edit3 className="w-3.5 h-3.5" />
                                                        <span>Edit</span>
                                                    </button>
                                                ) : (
                                                    <span className="text-slate-400 dark:text-slate-600 text-[11px] italic">Locked</span>
                                                )}
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Edit Proposal Modal (Slice 1F Fix 2) */}
            {editingProposal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xl w-full max-w-lg overflow-hidden">
                        <div className="flex items-center justify-between p-4 border-b border-slate-200 dark:border-slate-800">
                            <div className="flex items-center gap-2">
                                <Edit3 className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                                <h3 className="font-bold text-sm text-slate-900 dark:text-slate-100">
                                    Edit Proposal Details
                                </h3>
                            </div>
                            <button
                                onClick={() => setEditingProposal(null)}
                                className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <form onSubmit={(e) => { e.preventDefault(); handleSaveEdit(); }} className="p-5 space-y-4 text-xs">
                            {editError && (
                                <div className="p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/50 rounded-xl text-rose-700 dark:text-rose-300 flex items-start gap-2">
                                    <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                                    <span>{editError}</span>
                                </div>
                            )}

                            {/* Supplier / Counterparty */}
                            <div>
                                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                                    Supplier / Counterparty
                                </label>
                                <input
                                    type="text"
                                    value={editSupplier}
                                    onChange={e => setEditSupplier(e.target.value)}
                                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-medium text-slate-900 dark:text-slate-100 outline-none focus:border-indigo-500"
                                    placeholder="e.g. Holloway Office Equipment"
                                    required
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                {/* Date */}
                                <div>
                                    <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                                        Date (YYYY-MM-DD)
                                    </label>
                                    <input
                                        type="date"
                                        value={editDate}
                                        onChange={e => setEditDate(e.target.value)}
                                        className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-mono text-slate-900 dark:text-slate-100 outline-none focus:border-indigo-500"
                                        required
                                    />
                                </div>

                                {/* Amount */}
                                <div>
                                    <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                                        Amount
                                    </label>
                                    <input
                                        type="number"
                                        step="any"
                                        value={editAmount}
                                        onChange={e => setEditAmount(e.target.value)}
                                        className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-mono text-slate-900 dark:text-slate-100 outline-none focus:border-indigo-500"
                                        placeholder="0.00"
                                        required
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                {/* Currency */}
                                <div>
                                    <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                                        Currency
                                    </label>
                                    <select
                                        value={editCurrency}
                                        onChange={e => setEditCurrency(e.target.value as CurrencyCode)}
                                        className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-semibold text-slate-900 dark:text-slate-100 outline-none focus:border-indigo-500"
                                    >
                                        {Object.keys(CURRENCY_DECIMALS).map(curr => (
                                            <option key={curr} value={curr}>{curr}</option>
                                        ))}
                                    </select>
                                </div>

                                {/* Category */}
                                <div>
                                    <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                                        Category
                                    </label>
                                    <select
                                        value={editCategory}
                                        onChange={e => setEditCategory(e.target.value)}
                                        className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl capitalize text-slate-900 dark:text-slate-100 outline-none focus:border-indigo-500"
                                    >
                                        <option value="office_supplies">Office Supplies</option>
                                        <option value="living_expense">Living Expense</option>
                                        <option value="groceries">Groceries</option>
                                        <option value="utilities">Utilities</option>
                                        <option value="rent_expense">Rent</option>
                                        <option value="transportation">Transportation</option>
                                        <option value="entertainment">Entertainment</option>
                                        <option value="healthcare">Healthcare</option>
                                        <option value="interest_expense">Interest / Finance</option>
                                        <option value="insurance">Insurance</option>
                                        <option value="salary">Salary / Wage</option>
                                        <option value="business_income">Business Income</option>
                                        <option value="investment_income">Investment / Dividend</option>
                                        <option value="other_income">Other Income</option>
                                    </select>
                                </div>
                            </div>

                            {/* Payment Account */}
                            <div>
                                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                                    Payment Account
                                </label>
                                <select
                                    value={editAccountId}
                                    onChange={e => setEditAccountId(e.target.value)}
                                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-medium text-slate-900 dark:text-slate-100 outline-none focus:border-indigo-500"
                                >
                                    <option value="">(None / Keep Current)</option>
                                    {accounts.map(acc => (
                                        <option key={acc.id} value={acc.id}>
                                            {acc.name} ({acc.currency})
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200 dark:border-slate-800">
                                <button
                                    type="button"
                                    onClick={() => setEditingProposal(null)}
                                    className="px-4 py-2 text-slate-600 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 font-medium rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={editSubmitting}
                                    className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl disabled:opacity-50 transition shadow-sm"
                                >
                                    {editSubmitting ? 'Saving Corrections...' : 'Save Corrections'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};
