/**
 * Milestone 1 Daily Financial Events & Transaction Ledger View
 * 
 * Why this component exists:
 * Implements the user interface for recording daily financial activities:
 * income, expenses, transfers between accounts, credit card bill repayments,
 * and multi-leg loan repayments (M1-FLOW-02, M1-FLOW-03, M1-FLOW-04, M1-FLOW-05).
 * Displays real-time period cash flow metrics and an auditable double-entry journal ledger.
 * 
 * Tricky logic:
 * - On transaction submission failure (M1-SAFE-04): The entry modal remains open,
 *   user inputs are strictly preserved, and an actionable error banner is rendered.
 * - Double-entry transparency: Users can expand any transaction in the ledger
 *   to inspect balanced debit/credit journal postings.
 * - Auditable corrections (M1-DOM-05, T13): Users can void transactions with a mandatory
 *   justification, storing an immutable snapshot in m1_transaction_corrections.
 * 
 * TODO: Add CSV/OFX bulk file drop zone in Slice 1G.
 */

'use client';

import React, { useState, useEffect } from 'react';
import {
    Plus,
    ArrowDownRight,
    ArrowUpRight,
    ArrowRightLeft,
    CreditCard,
    Building2,
    Calendar,
    Tag,
    AlertTriangle,
    CheckCircle2,
    RefreshCw,
    X,
    ChevronDown,
    ChevronUp,
    Ban,
    DollarSign
} from 'lucide-react';
import { Account, AccountSubType, CurrencyCode, Entity, parseToCents, formatMoney } from '@/lib/domain/accounting/types';

interface AccountOption extends Account {
    balance_cents: number;
    formatted_balance: string;
}

interface TransactionPosting {
    id: string;
    account_id: string;
    amount_cents: number;
    currency: string;
    memo?: string | null;
}

interface TransactionItem {
    id: string;
    date: string;
    description: string;
    payee_or_payer?: string | null;
    status: string;
    origin: string;
    revision: number;
    created_at: string;
    postings: TransactionPosting[];
}

interface CashFlowSummary {
    total_income_cents_by_currency: Record<string, number>;
    total_expenses_cents_by_currency: Record<string, number>;
    net_savings_cents_by_currency: Record<string, number>;
    formatted_income_by_currency: Record<string, string>;
    formatted_expenses_by_currency: Record<string, string>;
    formatted_net_savings_by_currency: Record<string, string>;
    breakdown_by_category: Array<{
        account_id: string;
        account_name: string;
        type: 'income' | 'expense';
        sub_type: string;
        currency: string;
        total_cents: number;
        formatted_total: string;
        transaction_count: number;
    }>;
}

export const DailyEventsView: React.FC = () => {
    const [entities, setEntities] = useState<Entity[]>([]);
    const [selectedEntityId, setSelectedEntityId] = useState<string>('');
    const [accounts, setAccounts] = useState<AccountOption[]>([]);
    const [transactions, setTransactions] = useState<TransactionItem[]>([]);
    const [cashFlow, setCashFlow] = useState<CashFlowSummary | null>(null);

    const [isLoading, setIsLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [successMessage, setSuccessMessage] = useState<string | null>(null);

    // Filter dates
    const [startDate, setStartDate] = useState(() => {
        const d = new Date();
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`;
    });
    const [endDate, setEndDate] = useState(() => new Date().toISOString().split('T')[0]);

    // Modal state
    const [activeTab, setActiveTab] = useState<'expense' | 'income' | 'transfer' | 'card_repayment' | 'loan_repayment'>('expense');
    const [isRecordModalOpen, setIsRecordModalOpen] = useState(false);
    const [expandedTxId, setExpandedTxId] = useState<string | null>(null);

    // Void modal state
    const [voidTargetTx, setVoidTargetTx] = useState<TransactionItem | null>(null);
    const [voidReason, setVoidReason] = useState('');
    const [voidActor, setVoidActor] = useState('User');

    // Form inputs: Expense / Income
    const [formAccountId, setFormAccountId] = useState('');
    const [formCategory, setFormCategory] = useState<AccountSubType>('groceries');
    const [formAmount, setFormAmount] = useState('');
    const [formDate, setFormDate] = useState(() => new Date().toISOString().split('T')[0]);
    const [formPayee, setFormPayee] = useState('');
    const [formDescription, setFormDescription] = useState('');

    // Form inputs: Transfer
    const [formToAccountId, setFormToAccountId] = useState('');

    // Form inputs: Loan Split
    const [formLoanPrincipal, setFormLoanPrincipal] = useState('');
    const [formLoanInterest, setFormLoanInterest] = useState('');
    const [formLoanFee, setFormLoanFee] = useState('');

    // Stable idempotency key across submission retries (M1-SAFE-05)
    const [submissionIdempotencyKey, setSubmissionIdempotencyKey] = useState<string>(() => crypto.randomUUID());

    const fetchData = async (entityId?: string) => {
        setIsLoading(true);
        setError(null);
        try {
            const entId = entityId || selectedEntityId;
            const query = new URLSearchParams({
                include_transactions: 'true',
                start_date: startDate,
                end_date: endDate
            });
            if (entId) query.set('entity_id', entId);

            const res = await fetch(`/api/accounting?${query.toString()}`);
            if (!res.ok) {
                const err = await res.json().catch(() => ({}));
                throw new Error(err.error || 'Failed to load transaction data');
            }
            const data = await res.json();
            if (data.entities && data.entities.length > 0) {
                setEntities(data.entities);
                if (!selectedEntityId && !entityId) {
                    setSelectedEntityId(data.entities[0].id);
                }
            }
            if (data.accounts) setAccounts(data.accounts);
            if (data.period_income_expenses) setCashFlow(data.period_income_expenses);
            if (data.transactions) setTransactions(data.transactions);
        } catch (err: any) {
            console.error('Fetch error:', err);
            setError(err.message || 'Failed to fetch accounting records');
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchData(selectedEntityId || undefined);
    }, [selectedEntityId, startDate, endDate]);

    // Handle Transaction Submission
    const handleRecordSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (isSubmitting) return;

        setError(null);
        setSuccessMessage(null);
        setIsSubmitting(true);

        try {
            const selectedAccount = accounts.find(a => a.id === formAccountId);
            const selectedCurrency = (selectedAccount?.currency || 'USD') as CurrencyCode;

            let action = '';
            let payload: any = {};

            if (activeTab === 'income') {
                action = 'record_income';
                payload = {
                    entity_id: selectedEntityId,
                    bank_account_id: formAccountId,
                    category: formCategory,
                    amount_cents: parseToCents(formAmount, selectedCurrency),
                    date: formDate,
                    payer: formPayee,
                    description: formDescription.trim() || `Income - ${formPayee || formCategory}`,
                    idempotency_key: submissionIdempotencyKey
                };
            } else if (activeTab === 'expense') {
                action = 'record_expense';
                payload = {
                    entity_id: selectedEntityId,
                    payment_account_id: formAccountId,
                    category: formCategory,
                    amount_cents: parseToCents(formAmount, selectedCurrency),
                    date: formDate,
                    payee: formPayee,
                    description: formDescription.trim() || `Expense - ${formPayee || formCategory}`,
                    idempotency_key: submissionIdempotencyKey
                };
            } else if (activeTab === 'transfer') {
                action = 'record_transfer';
                payload = {
                    from_account_id: formAccountId,
                    to_account_id: formToAccountId,
                    amount_cents: parseToCents(formAmount, selectedCurrency),
                    date: formDate,
                    description: formDescription.trim() || 'Internal Account Transfer',
                    idempotency_key: submissionIdempotencyKey
                };
            } else if (activeTab === 'card_repayment') {
                action = 'record_card_repayment';
                payload = {
                    bank_account_id: formAccountId,
                    card_account_id: formToAccountId,
                    amount_cents: parseToCents(formAmount, selectedCurrency),
                    date: formDate,
                    description: formDescription.trim() || 'Credit Card Bill Repayment',
                    idempotency_key: submissionIdempotencyKey
                };
            } else if (activeTab === 'loan_repayment') {
                action = 'record_loan_repayment';
                const principal = parseToCents(formLoanPrincipal || '0', selectedCurrency);
                const interest = parseToCents(formLoanInterest || '0', selectedCurrency);
                const fee = parseToCents(formLoanFee || '0', selectedCurrency);

                payload = {
                    bank_account_id: formAccountId,
                    loan_account_id: formToAccountId,
                    principal_cents: principal,
                    interest_cents: interest,
                    fee_cents: fee,
                    date: formDate,
                    payee: formPayee,
                    description: formDescription.trim() || 'Loan Instalment Payment',
                    idempotency_key: submissionIdempotencyKey
                };
            }

            const res = await fetch('/api/accounting', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action, payload })
            });

            if (!res.ok) {
                const errData = await res.json().catch(() => ({}));
                throw new Error(errData.error || 'Failed to record transaction');
            }

            // Success - generate fresh idempotency key for next submission
            setSubmissionIdempotencyKey(crypto.randomUUID());
            setIsRecordModalOpen(false);
            // Reset form fields
            setFormAmount('');
            setFormLoanPrincipal('');
            setFormLoanInterest('');
            setFormLoanFee('');
            setFormPayee('');
            setFormDescription('');
            setSuccessMessage('Transaction recorded successfully and double-entry postings committed.');
            await fetchData(selectedEntityId);
        } catch (err: any) {
            console.error('Submit error:', err);
            // M1-SAFE-04: Modal remains open, inputs preserved, error displayed
            setError(err.message || 'Transaction could not be recorded.');
        } finally {
            setIsSubmitting(false);
        }
    };

    // Handle Auditable Void
    const handleVoidSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!voidTargetTx || isSubmitting) return;

        setError(null);
        setIsSubmitting(true);

        try {
            const res = await fetch('/api/accounting', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: 'correct_transaction',
                    correction: {
                        transaction_id: voidTargetTx.id,
                        expected_revision: voidTargetTx.revision,
                        operation: 'void',
                        reason: voidReason.trim(),
                        performed_by: voidActor.trim() || 'User'
                    }
                })
            });

            if (!res.ok) {
                const errData = await res.json().catch(() => ({}));
                throw new Error(errData.error || 'Failed to void transaction');
            }

            setVoidTargetTx(null);
            setVoidReason('');
            setSuccessMessage(`Transaction ${voidTargetTx.description} successfully voided. Correction audit trail recorded.`);
            await fetchData(selectedEntityId);
        } catch (err: any) {
            console.error('Void error:', err);
            setError(err.message || 'Failed to void transaction.');
        } finally {
            setIsSubmitting(false);
        }
    };

    const bankAccounts = accounts.filter(a => a.type === 'asset');
    const liabilityAccounts = accounts.filter(a => a.type === 'liability');
    const creditCardAccounts = accounts.filter(a => a.type === 'liability' && a.sub_type === 'credit_card');
    const loanAccounts = accounts.filter(a => a.type === 'liability' && a.sub_type !== 'credit_card');

    return (
        <div className="space-y-6">
            {/* Header / Controls */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
                <div className="flex items-center gap-3">
                    <div className="p-2.5 bg-emerald-100 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 rounded-lg">
                        <DollarSign className="w-5 h-5" />
                    </div>
                    <div>
                        <h2 className="font-semibold text-slate-900 dark:text-slate-100">Daily Financial Events</h2>
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                            Strict double-entry journal with exact cents arithmetic
                        </p>
                    </div>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                    {/* Entity selector */}
                    <div className="flex items-center gap-2">
                        <span className="text-xs text-slate-500 font-medium">Entity:</span>
                        <select
                            value={selectedEntityId}
                            onChange={(e) => setSelectedEntityId(e.target.value)}
                            className="text-xs px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-200"
                        >
                            {entities.map(e => (
                                <option key={e.id} value={e.id}>{e.name} ({e.type})</option>
                            ))}
                        </select>
                    </div>

                    {/* Date filters */}
                    <div className="flex items-center gap-2 text-xs">
                        <input
                            type="date"
                            value={startDate}
                            onChange={(e) => setStartDate(e.target.value)}
                            className="px-2 py-1 border border-slate-300 dark:border-slate-700 rounded bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300"
                        />
                        <span className="text-slate-400">to</span>
                        <input
                            type="date"
                            value={endDate}
                            onChange={(e) => setEndDate(e.target.value)}
                            className="px-2 py-1 border border-slate-300 dark:border-slate-700 rounded bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300"
                        />
                    </div>

                    <button
                        onClick={() => fetchData()}
                        className="p-1.5 text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 transition"
                        title="Refresh"
                    >
                        <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
                    </button>

                    <button
                        onClick={() => {
                            setError(null);
                            if (bankAccounts.length > 0 && !formAccountId) {
                                setFormAccountId(bankAccounts[0].id);
                            }
                            setIsRecordModalOpen(true);
                        }}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-medium rounded-lg shadow-sm transition"
                    >
                        <Plus className="w-4 h-4" />
                        <span>Record Event</span>
                    </button>
                </div>
            </div>

            {/* Banners */}
            {successMessage && (
                <div className="flex items-center gap-2 p-3 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 rounded-lg text-sm">
                    <CheckCircle2 className="w-4 h-4 shrink-0" />
                    <span>{successMessage}</span>
                    <button onClick={() => setSuccessMessage(null)} className="ml-auto text-emerald-500 hover:text-emerald-700">
                        <X className="w-4 h-4" />
                    </button>
                </div>
            )}

            {error && !isRecordModalOpen && (
                <div className="flex items-center gap-2 p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 rounded-lg text-sm">
                    <AlertTriangle className="w-4 h-4 shrink-0" />
                    <span>{error}</span>
                    <button onClick={() => setError(null)} className="ml-auto text-rose-500 hover:text-rose-700">
                        <X className="w-4 h-4" />
                    </button>
                </div>
            )}

            {/* Accrual Income & Expense Summary Cards */}
            {cashFlow && (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-sm">
                        <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 mb-1">
                            <span>Period Income</span>
                            <ArrowDownRight className="w-4 h-4 text-emerald-500" />
                        </div>
                        <div className="text-xl font-bold text-slate-900 dark:text-slate-100">
                            {Object.entries(cashFlow.formatted_income_by_currency).map(([curr, val]) => (
                                <div key={curr}>{val} <span className="text-xs font-normal text-slate-400">{curr}</span></div>
                            ))}
                            {Object.keys(cashFlow.formatted_income_by_currency).length === 0 && '$0.00'}
                        </div>
                        <div className="text-[11px] text-slate-400 mt-1">Accrual income recognized in period</div>
                    </div>

                    <div className="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-sm">
                        <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 mb-1">
                            <span>Period Expenses</span>
                            <ArrowUpRight className="w-4 h-4 text-rose-500" />
                        </div>
                        <div className="text-xl font-bold text-slate-900 dark:text-slate-100">
                            {Object.entries(cashFlow.formatted_expenses_by_currency).map(([curr, val]) => (
                                <div key={curr}>{val} <span className="text-xs font-normal text-slate-400">{curr}</span></div>
                            ))}
                            {Object.keys(cashFlow.formatted_expenses_by_currency).length === 0 && '$0.00'}
                        </div>
                        <div className="text-[11px] text-slate-400 mt-1">Accrual expenses recognized in period</div>
                    </div>

                    <div className="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-sm">
                        <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 mb-1">
                            <span>Income Minus Expenses</span>
                            <Building2 className="w-4 h-4 text-blue-500" />
                        </div>
                        <div className="text-xl font-bold text-slate-900 dark:text-slate-100">
                            {Object.entries(cashFlow.formatted_net_savings_by_currency).map(([curr, val]) => (
                                <div key={curr}>{val} <span className="text-xs font-normal text-slate-400">{curr}</span></div>
                            ))}
                            {Object.keys(cashFlow.formatted_net_savings_by_currency).length === 0 && '$0.00'}
                        </div>
                        <div className="text-[11px] text-slate-400 mt-1">Net period earnings / retained savings</div>
                    </div>
                </div>
            )}

            {/* Transaction Ledger Table */}
            <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
                <div className="px-5 py-4 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center">
                    <div>
                        <h3 className="font-semibold text-slate-900 dark:text-slate-100 text-sm">Double-Entry Journal Ledger</h3>
                        <p className="text-xs text-slate-500">Every event has balanced debit and credit legs summing to $0.00</p>
                    </div>
                    <span className="text-xs px-2.5 py-1 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 rounded-full font-medium">
                        {transactions.length} entries
                    </span>
                </div>

                {transactions.length === 0 ? (
                    <div className="p-8 text-center text-slate-500 dark:text-slate-400 text-sm">
                        No transactions recorded in this period. Click &quot;Record Event&quot; to log income, expenses, or transfers.
                    </div>
                ) : (
                    <div className="divide-y divide-slate-100 dark:divide-slate-800">
                        {transactions.map((tx) => {
                            const isExpanded = expandedTxId === tx.id;
                            const isVoid = tx.status === 'void';

                            return (
                                <div key={tx.id} className={`transition ${isVoid ? 'opacity-60 bg-slate-50/50 dark:bg-slate-950/20' : 'hover:bg-slate-50/70 dark:hover:bg-slate-800/40'}`}>
                                    <div className="p-4 flex items-center justify-between gap-4">
                                        <div className="flex items-center gap-3">
                                            <button
                                                onClick={() => setExpandedTxId(isExpanded ? null : tx.id)}
                                                className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition"
                                                title="View journal legs"
                                            >
                                                {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                                            </button>

                                            <div>
                                                <div className="flex items-center gap-2">
                                                    <span className="text-xs font-mono text-slate-500">{tx.date}</span>
                                                    <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${isVoid ? 'bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-400 line-through' : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'}`}>
                                                        {tx.status}
                                                    </span>
                                                    <span className="text-xs text-slate-400 capitalize">({tx.origin})</span>
                                                </div>
                                                <div className="text-sm font-medium text-slate-900 dark:text-slate-100 mt-0.5">
                                                    {tx.description}
                                                    {tx.payee_or_payer && (
                                                        <span className="text-xs text-slate-500 dark:text-slate-400 ml-1.5 font-normal">
                                                            — {tx.payee_or_payer}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-3">
                                            <span className="text-xs text-slate-400 font-mono">
                                                {tx.postings.length} legs
                                            </span>

                                            {!isVoid && (
                                                <button
                                                    onClick={() => setVoidTargetTx(tx)}
                                                    className="p-1.5 text-slate-400 hover:text-rose-600 transition"
                                                    title="Auditable Void"
                                                >
                                                    <Ban className="w-3.5 h-3.5" />
                                                </button>
                                            )}
                                        </div>
                                    </div>

                                    {/* Expanded Journal Postings */}
                                    {isExpanded && (
                                        <div className="px-10 pb-4 pt-1 bg-slate-50 dark:bg-slate-950/40 border-t border-slate-100 dark:border-slate-800/80">
                                            <div className="text-xs font-semibold text-slate-500 mb-2">Double-Entry Journal Postings:</div>
                                            <div className="space-y-1 font-mono text-xs">
                                                {tx.postings.map(p => {
                                                    const isDebit = p.amount_cents > 0;
                                                    const acc = accounts.find(a => a.id === p.account_id);
                                                    const accName = acc ? acc.name : p.account_id;

                                                    return (
                                                        <div key={p.id} className="flex justify-between py-1 border-b border-slate-200/50 dark:border-slate-800/50">
                                                            <span className="text-slate-700 dark:text-slate-300">
                                                                {accName} {p.memo && <span className="text-slate-400 font-sans">({p.memo})</span>}
                                                            </span>
                                                            <span className={`font-medium ${isDebit ? 'text-blue-600 dark:text-blue-400' : 'text-slate-600 dark:text-slate-400'}`}>
                                                                {isDebit ? `Debit +${formatMoney({ amount_cents: p.amount_cents, currency: p.currency })}` : `Credit -${formatMoney({ amount_cents: Math.abs(p.amount_cents), currency: p.currency })}`}
                                                            </span>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* Record Event Modal */}
            {isRecordModalOpen && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in duration-150">
                    <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-lg w-full border border-slate-200 dark:border-slate-800 shadow-xl overflow-hidden">
                        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center bg-slate-50 dark:bg-slate-800/50">
                            <h3 className="font-bold text-slate-900 dark:text-slate-100 text-base">Record Financial Event</h3>
                            <button
                                onClick={() => setIsRecordModalOpen(false)}
                                className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg transition"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        {/* Event Type Tabs */}
                        <div className="flex border-b border-slate-200 dark:border-slate-800 bg-slate-100/50 dark:bg-slate-800/30 p-1 text-xs font-medium">
                            <button
                                type="button"
                                onClick={() => setActiveTab('expense')}
                                className={`flex-1 py-1.5 rounded-md transition ${activeTab === 'expense' ? 'bg-white dark:bg-slate-800 text-rose-600 dark:text-rose-400 shadow-sm font-semibold' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'}`}
                            >
                                Expense
                            </button>
                            <button
                                type="button"
                                onClick={() => setActiveTab('income')}
                                className={`flex-1 py-1.5 rounded-md transition ${activeTab === 'income' ? 'bg-white dark:bg-slate-800 text-emerald-600 dark:text-emerald-400 shadow-sm font-semibold' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'}`}
                            >
                                Income
                            </button>
                            <button
                                type="button"
                                onClick={() => setActiveTab('transfer')}
                                className={`flex-1 py-1.5 rounded-md transition ${activeTab === 'transfer' ? 'bg-white dark:bg-slate-800 text-blue-600 dark:text-blue-400 shadow-sm font-semibold' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'}`}
                            >
                                Transfer
                            </button>
                            <button
                                type="button"
                                onClick={() => setActiveTab('card_repayment')}
                                className={`flex-1 py-1.5 rounded-md transition ${activeTab === 'card_repayment' ? 'bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 shadow-sm font-semibold' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'}`}
                            >
                                Card Bill
                            </button>
                            <button
                                type="button"
                                onClick={() => setActiveTab('loan_repayment')}
                                className={`flex-1 py-1.5 rounded-md transition ${activeTab === 'loan_repayment' ? 'bg-white dark:bg-slate-800 text-amber-600 dark:text-amber-400 shadow-sm font-semibold' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'}`}
                            >
                                Loan Split
                            </button>
                        </div>

                        <form onSubmit={handleRecordSubmit} className="p-6 space-y-4">
                            {error && (
                                <div className="p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 rounded-lg text-xs flex items-center gap-2">
                                    <AlertTriangle className="w-4 h-4 shrink-0" />
                                    <span>{error}</span>
                                </div>
                            )}

                            {/* Account Selectors */}
                            {activeTab === 'expense' && (
                                <>
                                    <div>
                                        <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                                            Paid From Account (Bank or Credit Card) *
                                        </label>
                                        <select
                                            value={formAccountId}
                                            onChange={(e) => setFormAccountId(e.target.value)}
                                            required
                                            className="w-full text-xs px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200"
                                        >
                                            <option value="">-- Select Payment Account --</option>
                                            <optgroup label="Bank Accounts (Assets)">
                                                {bankAccounts.map(a => (
                                                    <option key={a.id} value={a.id}>{a.name} ({a.formatted_balance})</option>
                                                ))}
                                            </optgroup>
                                            <optgroup label="Credit Cards (Liabilities)">
                                                {creditCardAccounts.map(a => (
                                                    <option key={a.id} value={a.id}>{a.name} ({a.formatted_balance})</option>
                                                ))}
                                            </optgroup>
                                        </select>
                                    </div>

                                    <div className="grid grid-cols-2 gap-3">
                                        <div>
                                            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                                                Category *
                                            </label>
                                            <select
                                                value={formCategory}
                                                onChange={(e) => setFormCategory(e.target.value as AccountSubType)}
                                                className="w-full text-xs px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200"
                                            >
                                                <option value="groceries">Groceries</option>
                                                <option value="utilities">Utilities</option>
                                                <option value="living_expense">Living Expense</option>
                                                <option value="repairs_maintenance">Repairs & Maintenance</option>
                                                <option value="other">Other Expense</option>
                                            </select>
                                        </div>

                                        <div>
                                            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                                                Amount ($) *
                                            </label>
                                            <input
                                                type="number"
                                                step="0.01"
                                                required
                                                placeholder="0.00"
                                                value={formAmount}
                                                onChange={(e) => setFormAmount(e.target.value)}
                                                className="w-full text-xs px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200"
                                            />
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 gap-3">
                                        <div>
                                            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                                                Payee (Merchant)
                                            </label>
                                            <input
                                                type="text"
                                                placeholder="e.g. Trader Joe's"
                                                value={formPayee}
                                                onChange={(e) => setFormPayee(e.target.value)}
                                                className="w-full text-xs px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200"
                                            />
                                        </div>

                                        <div>
                                            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                                                Date *
                                            </label>
                                            <input
                                                type="date"
                                                required
                                                value={formDate}
                                                onChange={(e) => setFormDate(e.target.value)}
                                                className="w-full text-xs px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200"
                                            />
                                        </div>
                                    </div>
                                </>
                            )}

                            {activeTab === 'income' && (
                                <>
                                    <div>
                                        <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                                            Deposit To Bank Account *
                                        </label>
                                        <select
                                            value={formAccountId}
                                            onChange={(e) => setFormAccountId(e.target.value)}
                                            required
                                            className="w-full text-xs px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200"
                                        >
                                            <option value="">-- Select Bank Account --</option>
                                            {bankAccounts.map(a => (
                                                <option key={a.id} value={a.id}>{a.name} ({a.formatted_balance})</option>
                                            ))}
                                        </select>
                                    </div>

                                    <div className="grid grid-cols-2 gap-3">
                                        <div>
                                            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                                                Income Category *
                                            </label>
                                            <select
                                                value={formCategory}
                                                onChange={(e) => setFormCategory(e.target.value as AccountSubType)}
                                                className="w-full text-xs px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200"
                                            >
                                                <option value="salary">Salary / Wages</option>
                                                <option value="freelance">Freelance / Consulting</option>
                                                <option value="rental_income">Rental Income</option>
                                                <option value="dividend">Dividends</option>
                                                <option value="interest_income">Interest Income</option>
                                                <option value="other">Other Income</option>
                                            </select>
                                        </div>

                                        <div>
                                            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                                                Amount ($) *
                                            </label>
                                            <input
                                                type="number"
                                                step="0.01"
                                                required
                                                placeholder="0.00"
                                                value={formAmount}
                                                onChange={(e) => setFormAmount(e.target.value)}
                                                className="w-full text-xs px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200"
                                            />
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 gap-3">
                                        <div>
                                            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                                                Payer (Employer / Client)
                                            </label>
                                            <input
                                                type="text"
                                                placeholder="e.g. Acme Corp"
                                                value={formPayee}
                                                onChange={(e) => setFormPayee(e.target.value)}
                                                className="w-full text-xs px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200"
                                            />
                                        </div>

                                        <div>
                                            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                                                Date *
                                            </label>
                                            <input
                                                type="date"
                                                required
                                                value={formDate}
                                                onChange={(e) => setFormDate(e.target.value)}
                                                className="w-full text-xs px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200"
                                            />
                                        </div>
                                    </div>
                                </>
                            )}

                            {activeTab === 'transfer' && (
                                <>
                                    <div className="grid grid-cols-2 gap-3">
                                        <div>
                                            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                                                From Account *
                                            </label>
                                            <select
                                                value={formAccountId}
                                                onChange={(e) => setFormAccountId(e.target.value)}
                                                required
                                                className="w-full text-xs px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200"
                                            >
                                                <option value="">-- From Account --</option>
                                                {accounts.map(a => (
                                                    <option key={a.id} value={a.id}>{a.name} ({a.formatted_balance})</option>
                                                ))}
                                            </select>
                                        </div>

                                        <div>
                                            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                                                To Account *
                                            </label>
                                            <select
                                                value={formToAccountId}
                                                onChange={(e) => setFormToAccountId(e.target.value)}
                                                required
                                                className="w-full text-xs px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200"
                                            >
                                                <option value="">-- To Account --</option>
                                                {accounts.filter(a => a.id !== formAccountId).map(a => (
                                                    <option key={a.id} value={a.id}>{a.name} ({a.formatted_balance})</option>
                                                ))}
                                            </select>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 gap-3">
                                        <div>
                                            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                                                Transfer Amount ($) *
                                            </label>
                                            <input
                                                type="number"
                                                step="0.01"
                                                required
                                                placeholder="0.00"
                                                value={formAmount}
                                                onChange={(e) => setFormAmount(e.target.value)}
                                                className="w-full text-xs px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200"
                                            />
                                        </div>

                                        <div>
                                            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                                                Date *
                                            </label>
                                            <input
                                                type="date"
                                                required
                                                value={formDate}
                                                onChange={(e) => setFormDate(e.target.value)}
                                                className="w-full text-xs px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200"
                                            />
                                        </div>
                                    </div>
                                </>
                            )}

                            {activeTab === 'card_repayment' && (
                                <>
                                    <div className="grid grid-cols-2 gap-3">
                                        <div>
                                            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                                                Source Bank Account *
                                            </label>
                                            <select
                                                value={formAccountId}
                                                onChange={(e) => setFormAccountId(e.target.value)}
                                                required
                                                className="w-full text-xs px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200"
                                            >
                                                <option value="">-- Select Bank --</option>
                                                {bankAccounts.map(a => (
                                                    <option key={a.id} value={a.id}>{a.name} ({a.formatted_balance})</option>
                                                ))}
                                            </select>
                                        </div>

                                        <div>
                                            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                                                Credit Card to Repay *
                                            </label>
                                            <select
                                                value={formToAccountId}
                                                onChange={(e) => setFormToAccountId(e.target.value)}
                                                required
                                                className="w-full text-xs px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200"
                                            >
                                                <option value="">-- Select Card --</option>
                                                {creditCardAccounts.map(a => (
                                                    <option key={a.id} value={a.id}>{a.name} ({a.formatted_balance})</option>
                                                ))}
                                            </select>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 gap-3">
                                        <div>
                                            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                                                Repayment Amount ($) *
                                            </label>
                                            <input
                                                type="number"
                                                step="0.01"
                                                required
                                                placeholder="0.00"
                                                value={formAmount}
                                                onChange={(e) => setFormAmount(e.target.value)}
                                                className="w-full text-xs px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200"
                                            />
                                        </div>

                                        <div>
                                            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                                                Date *
                                            </label>
                                            <input
                                                type="date"
                                                required
                                                value={formDate}
                                                onChange={(e) => setFormDate(e.target.value)}
                                                className="w-full text-xs px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200"
                                            />
                                        </div>
                                    </div>
                                </>
                            )}

                            {activeTab === 'loan_repayment' && (
                                <>
                                    <div className="grid grid-cols-2 gap-3">
                                        <div>
                                            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                                                Source Bank Account *
                                            </label>
                                            <select
                                                value={formAccountId}
                                                onChange={(e) => setFormAccountId(e.target.value)}
                                                required
                                                className="w-full text-xs px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200"
                                            >
                                                <option value="">-- Select Bank --</option>
                                                {bankAccounts.map(a => (
                                                    <option key={a.id} value={a.id}>{a.name} ({a.formatted_balance})</option>
                                                ))}
                                            </select>
                                        </div>

                                        <div>
                                            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                                                Loan / Mortgage Account *
                                            </label>
                                            <select
                                                value={formToAccountId}
                                                onChange={(e) => setFormToAccountId(e.target.value)}
                                                required
                                                className="w-full text-xs px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200"
                                            >
                                                <option value="">-- Select Loan --</option>
                                                {loanAccounts.map(a => (
                                                    <option key={a.id} value={a.id}>{a.name} ({a.formatted_balance})</option>
                                                ))}
                                            </select>
                                        </div>
                                    </div>

                                    {/* 3-way split inputs */}
                                    <div className="p-3 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-200/60 dark:border-slate-700/60 space-y-2">
                                        <div className="text-xs font-semibold text-slate-600 dark:text-slate-400">
                                            Split Components (Sum = Total Outflow)
                                        </div>

                                        <div className="grid grid-cols-3 gap-2">
                                            <div>
                                                <label className="block text-[11px] font-medium text-slate-600 dark:text-slate-400 mb-1">
                                                    Principal ($)
                                                </label>
                                                <input
                                                    type="number"
                                                    step="0.01"
                                                    placeholder="0.00"
                                                    value={formLoanPrincipal}
                                                    onChange={(e) => setFormLoanPrincipal(e.target.value)}
                                                    className="w-full text-xs px-2.5 py-1.5 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200"
                                                />
                                            </div>

                                            <div>
                                                <label className="block text-[11px] font-medium text-slate-600 dark:text-slate-400 mb-1">
                                                    Interest ($)
                                                </label>
                                                <input
                                                    type="number"
                                                    step="0.01"
                                                    placeholder="0.00"
                                                    value={formLoanInterest}
                                                    onChange={(e) => setFormLoanInterest(e.target.value)}
                                                    className="w-full text-xs px-2.5 py-1.5 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200"
                                                />
                                            </div>

                                            <div>
                                                <label className="block text-[11px] font-medium text-slate-600 dark:text-slate-400 mb-1">
                                                    Fee ($)
                                                </label>
                                                <input
                                                    type="number"
                                                    step="0.01"
                                                    placeholder="0.00"
                                                    value={formLoanFee}
                                                    onChange={(e) => setFormLoanFee(e.target.value)}
                                                    className="w-full text-xs px-2.5 py-1.5 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200"
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    <div>
                                        <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                                            Payment Date *
                                        </label>
                                        <input
                                            type="date"
                                            required
                                            value={formDate}
                                            onChange={(e) => setFormDate(e.target.value)}
                                            className="w-full text-xs px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200"
                                        />
                                    </div>
                                </>
                            )}

                            <div>
                                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                                    Description / Memo
                                </label>
                                <input
                                    type="text"
                                    placeholder="Optional notes or reference..."
                                    value={formDescription}
                                    onChange={(e) => setFormDescription(e.target.value)}
                                    className="w-full text-xs px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200"
                                />
                            </div>

                            <div className="pt-2 flex justify-end gap-2 border-t border-slate-100 dark:border-slate-800">
                                <button
                                    type="button"
                                    onClick={() => setIsRecordModalOpen(false)}
                                    className="px-4 py-2 text-xs font-medium text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 rounded-lg transition"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={isSubmitting}
                                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-lg shadow-sm transition disabled:opacity-50 flex items-center gap-1.5"
                                >
                                    {isSubmitting && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                                    <span>Post Double-Entry Record</span>
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Void Modal */}
            {voidTargetTx && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in duration-150">
                    <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-md w-full border border-slate-200 dark:border-slate-800 shadow-xl overflow-hidden">
                        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center bg-rose-50 dark:bg-rose-950/40">
                            <div className="flex items-center gap-2 text-rose-700 dark:text-rose-300">
                                <Ban className="w-5 h-5" />
                                <h3 className="font-bold text-base">Auditable Transaction Void</h3>
                            </div>
                            <button
                                onClick={() => setVoidTargetTx(null)}
                                className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg transition"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <form onSubmit={handleVoidSubmit} className="p-6 space-y-4">
                            <p className="text-xs text-slate-600 dark:text-slate-400">
                                In double-entry accounting, records are immutable. Voiding marks this transaction as void,
                                recalculates balances immediately, and preserves the full prior state in the audit trail.
                            </p>

                            <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-lg text-xs space-y-1">
                                <div className="font-semibold text-slate-800 dark:text-slate-200">{voidTargetTx.description}</div>
                                <div className="text-slate-500">Date: {voidTargetTx.date} · Legs: {voidTargetTx.postings.length}</div>
                            </div>

                            <div>
                                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                                    Reason for Void *
                                </label>
                                <textarea
                                    required
                                    rows={2}
                                    placeholder="Explain why this transaction is being voided..."
                                    value={voidReason}
                                    onChange={(e) => setVoidReason(e.target.value)}
                                    className="w-full text-xs px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200"
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                                    Performed By *
                                </label>
                                <input
                                    type="text"
                                    required
                                    value={voidActor}
                                    onChange={(e) => setVoidActor(e.target.value)}
                                    className="w-full text-xs px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200"
                                />
                            </div>

                            <div className="pt-2 flex justify-end gap-2 border-t border-slate-100 dark:border-slate-800">
                                <button
                                    type="button"
                                    onClick={() => setVoidTargetTx(null)}
                                    className="px-4 py-2 text-xs font-medium text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 rounded-lg transition"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={isSubmitting}
                                    className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold rounded-lg shadow-sm transition disabled:opacity-50 flex items-center gap-1.5"
                                >
                                    {isSubmitting && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                                    <span>Confirm Auditable Void</span>
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};
