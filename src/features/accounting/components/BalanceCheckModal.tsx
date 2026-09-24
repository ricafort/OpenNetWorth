'use client';

import React, { useState, useEffect, useRef } from 'react';
import { X, CheckCircle2, AlertTriangle, AlertCircle, FileText, ArrowRight, Wallet, History, Plus } from 'lucide-react';
import { ReconciliationComparison, CurrencyCode, formatMoney } from '@/lib/domain/accounting/types';

interface BalanceCheckModalProps {
    isOpen: boolean;
    onClose: () => void;
    accountId: string;
    observationId?: string; // If provided, fetches this specific observation. Otherwise fetches the latest.
    documentId?: string | null;
    onActionImport: () => void; // Passed from parent to open import workflow
    onActionSetup: () => void; // Passed from parent to review account setup
    onActionReview: (startDate?: string, endDate?: string) => void; // Passed from parent to review transactions
}

export const BalanceCheckModal: React.FC<BalanceCheckModalProps> = ({
    isOpen,
    onClose,
    accountId,
    observationId,
    documentId,
    onActionImport,
    onActionSetup,
    onActionReview
}) => {
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [reconciliation, setReconciliation] = useState<ReconciliationComparison | null>(null);
    const activeRequestId = useRef<number>(0);

    useEffect(() => {
        if (isOpen) {
            fetchReconciliation();
        } else {
            // Cancel pending request on unmount/close
            activeRequestId.current += 1;
        }
    }, [isOpen, accountId, observationId]);

    const fetchReconciliation = async () => {
        const requestId = ++activeRequestId.current;
        setIsLoading(true);
        setError(null);
        setReconciliation(null);

        try {
            const body: any = { account_id: accountId };
            if (observationId) {
                body.observation_id = observationId;
            } else {
                body.latest = true;
            }

            const res = await fetch('/api/accounting/balances/reconcile', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body)
            });

            const data = await res.json();
            if (activeRequestId.current !== requestId) return; // Stale response

            if (!res.ok) {
                throw new Error(data.error || 'Failed to check balance');
            }

            if (data.reconciliation) {
                setReconciliation(data.reconciliation);
            } else {
                throw new Error('No reconciliation data returned');
            }
        } catch (err: any) {
            if (activeRequestId.current !== requestId) return; // Stale error
            setError(err.message);
        } finally {
            if (activeRequestId.current === requestId) {
                setIsLoading(false);
            }
        }
    };

    if (!isOpen) return null;

    // Determine the icon and color based on status
    const renderOutcomeIcon = () => {
        if (!reconciliation) return <AlertCircle className="w-8 h-8 text-slate-400" />;
        switch (reconciliation.status) {
            case 'matched':
                return <CheckCircle2 className="w-8 h-8 text-emerald-500" />;
            case 'discrepancy':
                return <AlertTriangle className="w-8 h-8 text-amber-500" />;
            case 'insufficient_history':
                return <History className="w-8 h-8 text-amber-500" />;
            case 'balance_only':
            case 'not_directly_comparable':
                return <Wallet className="w-8 h-8 text-slate-400" />;
            default:
                return <AlertCircle className="w-8 h-8 text-slate-400" />;
        }
    };

    const formatDiff = (diffCents: number, currency: string) => {
        const amt = Math.abs(diffCents);
        return formatMoney({ amount_cents: amt, currency: currency as CurrencyCode });
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4">
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xl w-full max-w-md overflow-hidden flex flex-col">
                <div className="flex justify-between items-center p-4 border-b border-slate-100 dark:border-slate-800">
                    <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">Balance check</h2>
                    <button onClick={onClose} className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 rounded-lg">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <div className="p-5 flex-1 min-h-[250px] flex flex-col">
                    {isLoading && (
                        <div className="flex-1 flex flex-col items-center justify-center space-y-3">
                            <div className="w-8 h-8 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin"></div>
                            <p className="text-sm font-medium text-slate-500">Checking ledger...</p>
                        </div>
                    )}

                    {error && !isLoading && (
                        <div className="flex-1 flex flex-col items-center justify-center text-center space-y-3">
                            <AlertCircle className="w-10 h-10 text-rose-500" />
                            <p className="text-sm font-medium text-rose-700 dark:text-rose-400">{error}</p>
                            <button onClick={fetchReconciliation} className="text-xs font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1">
                                Try again <ArrowRight size={14} />
                            </button>
                        </div>
                    )}

                    {!isLoading && !error && reconciliation && (
                        <div className="space-y-6">
                            {/* Outcome Header */}
                            <div className="flex items-start gap-4">
                                <div className="shrink-0 p-2 bg-slate-50 dark:bg-slate-800 rounded-xl">
                                    {renderOutcomeIcon()}
                                </div>
                                <div>
                                    {reconciliation.status === 'matched' && (
                                        <>
                                            <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                                                Balances match as of {reconciliation.effective_date}
                                            </h3>
                                            <p className="text-sm text-slate-500 mt-1">Based on your recorded transactions.</p>
                                        </>
                                    )}
                                    {reconciliation.status === 'discrepancy' && (
                                        <>
                                            <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                                                There is a difference of {formatDiff(Math.abs(reconciliation.diff_cents), reconciliation.currency)}
                                            </h3>
                                            <p className="text-sm text-slate-500 mt-1">
                                                The reported statement balance is {reconciliation.diff_cents > 0 ? 'higher' : 'lower'} than your recorded ledger balance.
                                            </p>
                                        </>
                                    )}
                                    {reconciliation.status === 'insufficient_history' && (
                                        <>
                                            <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                                                More information is needed to compare this balance
                                            </h3>
                                            <p className="text-sm text-slate-500 mt-1">
                                                An opening balance or transaction history is required.
                                            </p>
                                        </>
                                    )}
                                    {reconciliation.status === 'balance_only' && (
                                        <>
                                            <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                                                Balance recorded as of {reconciliation.effective_date}
                                            </h3>
                                            <p className="text-sm text-slate-500 mt-1">
                                                {formatMoney({ amount_cents: reconciliation.reported_amount_cents, currency: reconciliation.currency as CurrencyCode })}
                                            </p>
                                        </>
                                    )}
                                    {reconciliation.status === 'not_directly_comparable' && (
                                        <>
                                            <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                                                Balance recorded as of {reconciliation.effective_date}
                                            </h3>
                                            <p className="text-sm text-slate-500 mt-1">
                                                {reconciliation.notes}
                                            </p>
                                        </>
                                    )}
                                </div>
                            </div>

                            {/* Details Panel */}
                            <div className="bg-slate-50 dark:bg-slate-800/50 rounded-xl p-4 space-y-3 text-sm">
                                <div className="flex justify-between items-center">
                                    <span className="text-slate-500">Account</span>
                                    <span className="font-semibold text-slate-900 dark:text-slate-100">{reconciliation.account_name}</span>
                                </div>
                                {reconciliation.owner_name && (
                                    <div className="flex justify-between items-center">
                                        <span className="text-slate-500">Owner</span>
                                        <span className="font-semibold text-slate-900 dark:text-slate-100">{reconciliation.owner_name}</span>
                                    </div>
                                )}
                                <div className="flex justify-between items-center">
                                    <span className="text-slate-500">Statement Date</span>
                                    <span className="font-semibold text-slate-900 dark:text-slate-100">{reconciliation.effective_date}</span>
                                </div>
                                {reconciliation.source_document_name && (
                                    <div className="flex justify-between items-center">
                                        <span className="text-slate-500">Source</span>
                                        <span className="font-semibold text-slate-900 dark:text-slate-100 truncate max-w-[200px]" title={reconciliation.source_document_name}>
                                            {reconciliation.source_document_name}
                                        </span>
                                    </div>
                                )}
                                {reconciliation.status === 'discrepancy' && (
                                    <>
                                        <div className="pt-2 border-t border-slate-200 dark:border-slate-700 flex justify-between items-center">
                                            <span className="text-slate-500">Statement closing balance</span>
                                            <span className="font-semibold text-slate-900 dark:text-slate-100">
                                                {formatMoney({ amount_cents: reconciliation.reported_amount_cents, currency: reconciliation.currency as CurrencyCode })}
                                            </span>
                                        </div>
                                        <div className="flex justify-between items-center">
                                            <span className="text-slate-500">Balance from recorded transactions</span>
                                            <span className="font-semibold text-slate-900 dark:text-slate-100">
                                                {formatMoney({ amount_cents: reconciliation.recorded_ledger_cents, currency: reconciliation.currency as CurrencyCode })}
                                            </span>
                                        </div>
                                        <div className="pt-2 border-t border-slate-200 dark:border-slate-700 flex justify-between items-center font-bold">
                                            <span className="text-slate-700 dark:text-slate-300">Difference</span>
                                            <span className={reconciliation.diff_cents > 0 ? "text-amber-600 dark:text-amber-400" : "text-amber-600 dark:text-amber-400"}>
                                                {formatDiff(reconciliation.diff_cents, reconciliation.currency)}
                                            </span>
                                        </div>
                                    </>
                                )}
                            </div>

                            {/* Next Actions */}
                            <div className="space-y-2 mt-4 pt-4 border-t border-slate-100 dark:border-slate-800">
                                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">Suggested Actions</h4>
                                
                                {(documentId || reconciliation.document_id) && (
                                    <button 
                                        onClick={() => { onClose(); window.open(`/api/documents/raw?id=${documentId || reconciliation.document_id}`, '_blank'); }}
                                        className="w-full flex items-center justify-between p-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 hover:border-indigo-300 rounded-xl text-left transition"
                                    >
                                        <div className="flex items-center gap-3">
                                            <FileText className="w-5 h-5 text-indigo-500" />
                                            <div>
                                                <div className="text-sm font-semibold text-slate-900 dark:text-slate-100">View statement</div>
                                                <div className="text-xs text-slate-500">Open the source document.</div>
                                            </div>
                                        </div>
                                        <ArrowRight className="w-4 h-4 text-slate-400" />
                                    </button>
                                )}

                                {reconciliation.status === 'insufficient_history' && (
                                    <button 
                                        onClick={() => { onClose(); onActionSetup(); }}
                                        className="w-full flex items-center justify-between p-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 hover:border-indigo-300 rounded-xl text-left transition"
                                    >
                                        <div className="flex items-center gap-3">
                                            <Wallet className="w-5 h-5 text-indigo-500" />
                                            <div>
                                                <div className="text-sm font-semibold text-slate-900 dark:text-slate-100">Review account setup</div>
                                                <div className="text-xs text-slate-500">Set an opening balance to establish history.</div>
                                            </div>
                                        </div>
                                        <ArrowRight className="w-4 h-4 text-slate-400" />
                                    </button>
                                )}

                                {(reconciliation.status === 'discrepancy' || reconciliation.status === 'matched') && (
                                    <button 
                                        onClick={() => { onClose(); onActionReview(reconciliation.account_opening_date || undefined, reconciliation.effective_date); }}
                                        className="w-full flex items-center justify-between p-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 hover:border-indigo-300 rounded-xl text-left transition"
                                    >
                                        <div className="flex items-center gap-3">
                                            <History className="w-5 h-5 text-indigo-500" />
                                            <div>
                                                <div className="text-sm font-semibold text-slate-900 dark:text-slate-100">Review transactions</div>
                                                <div className="text-xs text-slate-500">View your recorded transactions up to {reconciliation.effective_date}.</div>
                                            </div>
                                        </div>
                                        <ArrowRight className="w-4 h-4 text-slate-400" />
                                    </button>
                                )}

                                {(reconciliation.status === 'discrepancy') && (
                                    <button 
                                        onClick={() => { onClose(); onActionImport(); }}
                                        className="w-full flex items-center justify-between p-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 hover:border-indigo-300 rounded-xl text-left transition"
                                    >
                                        <div className="flex items-center gap-3">
                                            <Plus className="w-5 h-5 text-indigo-500" />
                                            <div>
                                                <div className="text-sm font-semibold text-slate-900 dark:text-slate-100">Import missing transactions</div>
                                                <div className="text-xs text-slate-500">Add transactions from your statement to fix the difference.</div>
                                            </div>
                                        </div>
                                        <ArrowRight className="w-4 h-4 text-slate-400" />
                                    </button>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
