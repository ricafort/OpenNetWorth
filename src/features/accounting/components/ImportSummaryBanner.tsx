import React from 'react';
import { CheckCircle2, ArrowRight, X } from 'lucide-react';
import Link from 'next/link';

export interface ImportSummary {
    type: 'csv' | 'pdf_statement' | 'pdf_receipt';
    approvedCount?: number;
    linkedCount?: number;
    balancesUpdated?: number;
    message: string;
    accountId?: string;
    accountIds?: string[];
    observationId?: string;
}

import { BalanceCheckModal } from './BalanceCheckModal';

interface ImportSummaryBannerProps {
    summary: ImportSummary;
    onDismiss: () => void;
}

export const ImportSummaryBanner: React.FC<ImportSummaryBannerProps> = ({ summary, onDismiss }) => {
    const [isCheckModalOpen, setIsCheckModalOpen] = React.useState(false);

    const isMultiAccount = summary.accountIds && summary.accountIds.length > 1;
    const singleAccountId = summary.accountId || (summary.accountIds && summary.accountIds.length === 1 ? summary.accountIds[0] : undefined);
    const observationId = summary.observationId;

    return (
        <div className="bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900/50 rounded-xl p-4 mb-6 relative shadow-sm">
            <button
                onClick={onDismiss}
                className="absolute top-4 right-4 text-emerald-600/70 hover:text-emerald-700 dark:text-emerald-400/70 dark:hover:text-emerald-300 transition"
            >
                <X className="w-4 h-4" />
            </button>
            <div className="flex items-start gap-3">
                <div className="p-1 bg-emerald-100 dark:bg-emerald-900/50 rounded-full shrink-0">
                    <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                </div>
                <div>
                    <h3 className="text-sm font-bold text-emerald-800 dark:text-emerald-300">
                        Import Successful
                    </h3>
                    <p className="text-sm text-emerald-700 dark:text-emerald-400/90 mt-1">
                        {summary.message}
                    </p>
                    
                    {isMultiAccount ? (
                        <div className="mt-3">
                            <Link 
                                href="/accounting?view=accounts"
                                className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-700 hover:text-emerald-800 dark:text-emerald-400 dark:hover:text-emerald-300 bg-emerald-100/50 hover:bg-emerald-200/50 dark:bg-emerald-900/30 dark:hover:bg-emerald-900/50 px-3 py-1.5 rounded-lg transition"
                            >
                                View accounts
                                <ArrowRight className="w-3.5 h-3.5" />
                            </Link>
                        </div>
                    ) : (singleAccountId && observationId) ? (
                        <div className="mt-3">
                            <button 
                                onClick={() => setIsCheckModalOpen(true)}
                                className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-700 hover:text-emerald-800 dark:text-emerald-400 dark:hover:text-emerald-300 bg-emerald-100/50 hover:bg-emerald-200/50 dark:bg-emerald-900/30 dark:hover:bg-emerald-900/50 px-3 py-1.5 rounded-lg transition"
                            >
                                Check balance
                                <ArrowRight className="w-3.5 h-3.5" />
                            </button>
                        </div>
                    ) : singleAccountId ? (
                        <div className="mt-3">
                            <Link 
                                href={`/accounting?view=accounts&accountId=${singleAccountId}`}
                                className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-700 hover:text-emerald-800 dark:text-emerald-400 dark:hover:text-emerald-300 bg-emerald-100/50 hover:bg-emerald-200/50 dark:bg-emerald-900/30 dark:hover:bg-emerald-900/50 px-3 py-1.5 rounded-lg transition"
                            >
                                View account
                                <ArrowRight className="w-3.5 h-3.5" />
                            </Link>
                        </div>
                    ) : null}
                </div>
            </div>

            {singleAccountId && (
                <BalanceCheckModal
                    isOpen={isCheckModalOpen}
                    onClose={() => setIsCheckModalOpen(false)}
                    accountId={singleAccountId}
                    observationId={observationId}
                    onActionImport={() => {
                        window.location.href = `/accounting?view=inbox&accountId=${singleAccountId}`;
                    }}
                    onActionSetup={() => {
                        window.location.href = `/accounting?view=accounts&accountId=${singleAccountId}`;
                    }}
                    onActionReview={(startDate, endDate) => {
                        let url = `/accounting?view=events&account_id=${singleAccountId}`;
                        if (startDate) url += `&start_date=${startDate}`;
                        if (endDate) url += `&end_date=${endDate}`;
                        window.location.href = url;
                    }}
                />
            )}
        </div>
    );
};
