/**
 * Fast Balance Updates Modal
 * 
 * Why this file exists:
 * Allows users to paste spreadsheets, bank tables, or CSV summaries directly into OpenNetWorth,
 * review proposed account balances with live delta calculations, map or create accounts inline,
 * and atomically commit dated balance observations.
 * 
 * Tricky logic:
 * - Deterministic parsing: Invokes `/api/accounting/balances/parse-table` to extract rows without AI overhead.
 * - Balance kind semantic tagging: Distinguishes true valuation balances (current, statement, portfolio)
 *   from non-valuation lines (credit limits, redraw, buying power) so users clearly see which numbers
 *   affect their net worth.
 * - Atomic batch commit: Sends all confirmed observations in a single transaction via `POST /api/accounting/balances`.
 * - Event notification: Dispatches `opennetworth_balances_updated` DOM event so all dashboard widgets
 *   and freshness cards re-render with the latest figures without a full page reload.
 * 
 * TODO: Integrate Delivery 2 Local LLM fallback for freeform, unstructured web text.
 */

'use client';

import React, { useState, useEffect } from 'react';
import {
    X,
    FileSpreadsheet,
    Scale,
    Plus,
    Check,
    AlertCircle,
    Trash2,
    Building,
    Calendar,
    ArrowUpRight,
    ArrowDownRight,
    HelpCircle,
    Sparkles,
    ShieldCheck
} from 'lucide-react';
import { BalanceKind, CurrencyCode, CURRENCY_DECIMALS } from '@/lib/domain/accounting/types';

interface UpdateBalancesModalProps {
    isOpen: boolean;
    onClose: () => void;
}

interface ProposalItem {
    id: string;
    raw_account_name: string;
    account_id: string | null;
    account_name: string;
    amount_cents: number;
    currency: CurrencyCode;
    balance_kind: BalanceKind;
    effective_date: string;
    previous_amount_cents?: number | null;
    expected_balance_revision?: number;
    raw_label?: string;
    unresolved_fields?: string[];
    source_line?: string;
    confirmed_by_user?: boolean;
}

/**
 * Simple deterministic 32-bit FNV-1a string hash for client-side batch and source reference generation.
 * 
 * Why this exists:
 * Guarantees that pasting the same table produces identical `source_batch_id` and `source_reference`
 * identifiers, allowing the server-side idempotency deduplication in `recordBalanceObservation`
 * to detect repeated submissions without creating duplicate observation entries or inflating revision counts.
 */
function simpleHash(str: string): string {
    let hash = 2166136261;
    for (let i = 0; i < str.length; i++) {
        hash ^= str.charCodeAt(i);
        hash = Math.imul(hash, 16777619);
    }
    return (hash >>> 0).toString(36);
}

interface ExistingAccount {
    id: string;
    name: string;
    entity_id: string;
    type: string;
    sub_type: string;
    currency: string;
    tracking_mode: string;
    balance_cents?: number | null;
    balance_revision?: number;
    is_unknown?: boolean;
}

interface Entity {
    id: string;
    name: string;
    currency: string;
}

export default function UpdateBalancesModal({ isOpen, onClose }: UpdateBalancesModalProps) {
    const [activeTab, setActiveTab] = useState<'paste' | 'manual'>('paste');
    const [rawText, setRawText] = useState('');
    const [isParsing, setIsParsing] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [parseError, setParseError] = useState<string | null>(null);
    const [saveSuccess, setSaveSuccess] = useState(false);

    const [proposals, setProposals] = useState<ProposalItem[]>([]);
    const [accounts, setAccounts] = useState<ExistingAccount[]>([]);
    const [entities, setEntities] = useState<Entity[]>([]);

    // Manual Fast Entry State: mapping of account_id -> { amountStr, kind, date }
    const [manualEntries, setManualEntries] = useState<Record<string, { amount: string; kind: BalanceKind; date: string }>>({});

    // Inline Account Creation Modal State
    const [isCreateAccountOpen, setIsCreateAccountOpen] = useState(false);
    const [pendingProposalId, setPendingProposalId] = useState<string | null>(null);
    const [newAccountName, setNewAccountName] = useState('');
    const [newAccountEntityId, setNewAccountEntityId] = useState('');
    const [newAccountType, setNewAccountType] = useState<'asset' | 'liability'>('asset');
    const [newAccountSubType, setNewAccountSubType] = useState('superannuation');
    const [newAccountCurrency, setNewAccountCurrency] = useState<CurrencyCode>('AUD');
    const [newAccountTrackingMode, setNewAccountTrackingMode] = useState<'balance' | 'transactions'>('balance');

    // Derived state for inline account creation currency locking:
    // Why this exists:
    // If a proposal has an explicit source currency (e.g. pasted 'AUD 100') or the user has confirmed it,
    // creating an account from it MUST match that currency to prevent silent currency rewriting.
    // Tricky logic:
    // If the currency is unresolved (e.g. ambiguous '$' that defaulted to AUD), the currency selector in the
    // account creation modal must NOT be locked, allowing the user to select USD/CAD/etc. directly.
    // TODO: Remember the user's preferred reporting currency for newly created entities.
    const pendingProp = pendingProposalId ? proposals.find(p => p.id === pendingProposalId) : null;
    const isPendingCurrencyLocked = pendingProp ? (!pendingProp.unresolved_fields?.includes('currency') || pendingProp.confirmed_by_user) : false;

    // Fetch active accounts and entities on mount or open
    const loadAccountsAndEntities = async () => {
        try {
            const res = await fetch('/api/accounting');
            if (res.ok) {
                const data = await res.json();
                if (data.accounts) setAccounts(data.accounts);
                if (data.entities) {
                    setEntities(data.entities);
                    if (data.entities.length > 0 && !newAccountEntityId) {
                        setNewAccountEntityId(data.entities[0].id);
                    }
                }
            }
        } catch (err) {
            console.error('Failed to load accounts for balance update modal', err);
        }
    };

    useEffect(() => {
        if (isOpen) {
            loadAccountsAndEntities();
        }
    }, [isOpen]);

    // Parse structured table
    const handleParse = async () => {
        if (!rawText.trim()) return;
        setIsParsing(true);
        setParseError(null);

        try {
            const res = await fetch('/api/accounting/balances/parse-table', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    text: rawText,
                    defaultCurrency: 'AUD',
                    defaultDate: new Date().toISOString().split('T')[0]
                })
            });

            const data = await res.json();
            if (!res.ok) {
                throw new Error(data.error || 'Failed to parse table');
            }

            if (!data.proposals || data.proposals.length === 0) {
                setParseError('No balance rows could be parsed. Check that rows contain an account name and balance amount.');
                return;
            }

            const mappedProposals: ProposalItem[] = data.proposals.map((p: any, idx: number) => ({
                id: `prop-${Date.now()}-${idx}`,
                raw_account_name: p.account_name,
                account_id: p.matched_account_id || null,
                account_name: p.matched_account_name || p.account_name,
                amount_cents: p.amount_cents,
                currency: p.currency,
                balance_kind: p.balance_kind || 'current_balance',
                effective_date: p.effective_date,
                previous_amount_cents: p.previous_amount_cents ?? null,
                expected_balance_revision: p.expected_balance_revision || 1,
                raw_label: p.raw_label,
                unresolved_fields: p.unresolved_fields || [],
                source_line: p.source_line || '',
                confirmed_by_user: false
            }));

            setProposals(mappedProposals);
        } catch (err: any) {
            setParseError(err.message || 'Error parsing table text');
        } finally {
            setIsParsing(false);
        }
    };

    // Update proposal field
    const updateProposal = (id: string, updates: Partial<ProposalItem>) => {
        setProposals(prev => prev.map(p => p.id === id ? { ...p, ...updates } : p));
    };

    // Remove proposal row
    const removeProposal = (id: string) => {
        setProposals(prev => prev.filter(p => p.id !== id));
    };

    // Handle explicit currency correction on a proposal row
    // Why this exists:
    // When parsing pasted balances, currency symbols like '$' are ambiguous (could be AUD, USD, CAD, etc.).
    // Users must be able to correct the currency directly on the review row without having to re-edit raw text.
    // Tricky logic:
    // 1. Rescale amount_cents if switching between zero-decimal currencies (JPY) and two-decimal currencies (AUD/USD).
    // 2. If the row was previously mapped to an account with a conflicting currency, detach the account to prevent
    //    silent cross-currency contamination.
    // 3. Clear 'currency' from unresolved_fields and reset confirmed_by_user = false to require re-confirmation.
    // TODO: Support user-defined default currency preferences per institution/source.
    const handleProposalCurrencyChange = (id: string, newCurrency: CurrencyCode) => {
        setProposals(prev => prev.map(p => {
            if (p.id !== id) return p;

            const oldDec = (p.currency in CURRENCY_DECIMALS) ? CURRENCY_DECIMALS[p.currency] : 2;
            const newDec = (newCurrency in CURRENCY_DECIMALS) ? CURRENCY_DECIMALS[newCurrency] : 2;
            const rawUnits = oldDec === 0 ? p.amount_cents : p.amount_cents / Math.pow(10, oldDec);
            const newAmountCents = newDec === 0 ? Math.round(rawUnits) : Math.round(rawUnits * Math.pow(10, newDec));

            // Check if current matched account conflicts with the new currency
            const currentAccount = p.account_id ? accounts.find(a => a.id === p.account_id) : null;
            const accountStillValid = currentAccount ? currentAccount.currency === newCurrency : false;

            return {
                ...p,
                currency: newCurrency,
                amount_cents: newAmountCents,
                account_id: accountStillValid ? p.account_id : null,
                account_name: accountStillValid ? p.account_name : p.raw_account_name,
                expected_balance_revision: accountStillValid ? p.expected_balance_revision : 1,
                previous_amount_cents: accountStillValid ? p.previous_amount_cents : null,
                unresolved_fields: p.unresolved_fields?.filter(f => f !== 'currency'),
                confirmed_by_user: false
            };
        }));
    };

    // Inline Account Creation Submission
    const handleCreateAccount = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newAccountName.trim() || !newAccountEntityId) return;

        // Guard against silent currency rewriting:
        // When creating an account for a proposal, the account currency must match the observation currency,
        // UNLESS the proposal currency was an unconfirmed/ambiguous guess that the user is now explicitly resolving.
        const pendingProp = pendingProposalId ? proposals.find(p => p.id === pendingProposalId) : null;
        const isPendingCurrencyLocked = pendingProp ? (!pendingProp.unresolved_fields?.includes('currency') || pendingProp.confirmed_by_user) : false;

        if (pendingProp && newAccountCurrency !== pendingProp.currency && isPendingCurrencyLocked) {
            alert(`Cannot create account in ${newAccountCurrency} for an observation locked to ${pendingProp.currency}. Observation currency cannot be rewritten silently.`);
            return;
        }

        try {
            const res = await fetch('/api/accounting', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: 'create_account',
                    account: {
                        entity_id: newAccountEntityId,
                        name: newAccountName.trim(),
                        type: newAccountType,
                        sub_type: newAccountSubType,
                        currency: newAccountCurrency,
                        tracking_mode: newAccountTrackingMode
                    }
                })
            });

            if (res.ok) {
                const data = await res.json();
                const createdAcc = data.account;
                await loadAccountsAndEntities();

                // If created from a proposal row, assign it immediately and sync currency
                if (pendingProposalId && createdAcc) {
                    const oldProp = proposals.find(p => p.id === pendingProposalId);
                    let targetAmountCents = oldProp?.amount_cents || 0;
                    if (oldProp && oldProp.currency !== createdAcc.currency) {
                        const oldDec = (oldProp.currency in CURRENCY_DECIMALS) ? CURRENCY_DECIMALS[oldProp.currency] : 2;
                        const newDec = (createdAcc.currency in CURRENCY_DECIMALS) ? CURRENCY_DECIMALS[createdAcc.currency] : 2;
                        const rawUnits = oldDec === 0 ? oldProp.amount_cents : oldProp.amount_cents / Math.pow(10, oldDec);
                        targetAmountCents = newDec === 0 ? Math.round(rawUnits) : Math.round(rawUnits * Math.pow(10, newDec));
                    }

                    updateProposal(pendingProposalId, {
                        account_id: createdAcc.id,
                        account_name: createdAcc.name,
                        currency: createdAcc.currency,
                        amount_cents: targetAmountCents,
                        unresolved_fields: oldProp?.unresolved_fields?.filter(f => f !== 'currency'),
                        confirmed_by_user: false
                    });
                }

                setIsCreateAccountOpen(false);
                setNewAccountName('');
                setPendingProposalId(null);
            }
        } catch (err) {
            console.error('Error creating account inline:', err);
        }
    };

    // Save All Confirmed Balances
    const handleSaveBatch = async () => {
        setIsSaving(true);
        try {
            let itemsToSave = [];

            if (activeTab === 'paste') {
                // Check if any matched proposal has unconfirmed review findings
                const unconfirmedFindings = proposals.filter(
                    p => p.account_id !== null && p.unresolved_fields && p.unresolved_fields.length > 0 && !p.confirmed_by_user
                );
                if (unconfirmedFindings.length > 0) {
                    alert(
                        `Please confirm or resolve the review findings on ${unconfirmedFindings.length} account row(s) before saving (e.g. verify ambiguous currency or date). Click "Confirm Row" on flagged items to approve.`
                    );
                    setIsSaving(false);
                    return;
                }

                // Deterministic batch ID based on rawText (P09)
                const batchId = `batch-${simpleHash(rawText.trim())}`;

                // Collect confirmed proposals with stable row references
                itemsToSave = proposals
                    .filter(p => p.account_id !== null)
                    .map((p, idx) => {
                        return {
                            account_id: p.account_id!,
                            amount_cents: p.amount_cents,
                            currency: p.currency,
                            balance_kind: p.balance_kind,
                            effective_date: p.effective_date,
                            source_type: 'table_paste' as const,
                            source_batch_id: batchId,
                            source_reference: `row-${idx}-${simpleHash(p.source_line || p.raw_account_name)}`,
                            expected_balance_revision: p.expected_balance_revision,
                            raw_label: p.raw_label,
                            unresolved_fields: p.unresolved_fields,
                            confirmed_by_user: p.confirmed_by_user
                        };
                    });
            } else {
                // Manual entries
                const today = new Date().toISOString().split('T')[0];
                itemsToSave = Object.entries(manualEntries)
                    .filter(([_, entry]) => entry.amount.trim().length > 0 && !isNaN(parseFloat(entry.amount)))
                    .map(([accId, entry]) => {
                        const targetAcc = accounts.find(a => a.id === accId);
                        const curr = (targetAcc?.currency || 'AUD') as CurrencyCode;
                        const dec = (curr in CURRENCY_DECIMALS) ? CURRENCY_DECIMALS[curr] : 2;
                        const fac = Math.pow(10, dec);
                        const cents = dec === 0 ? Math.round(parseFloat(entry.amount)) : Math.round(parseFloat(entry.amount) * fac);

                        return {
                            account_id: accId,
                            amount_cents: cents,
                            currency: curr,
                            balance_kind: entry.kind || 'current_balance',
                            effective_date: entry.date || today,
                            source_type: 'manual' as const,
                            expected_balance_revision: targetAcc?.balance_revision || 1
                        };
                    });
            }

            if (itemsToSave.length === 0) {
                alert('No accounts matched or values entered to save.');
                setIsSaving(false);
                return;
            }

            const res = await fetch('/api/accounting/balances', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ items: itemsToSave })
            });

            const data = await res.json();
            if (!res.ok) {
                throw new Error(data.error || 'Failed to save balance observations');
            }

            // Broadcast refresh event for dashboard and widgets
            window.dispatchEvent(new Event('opennetworth_balances_updated'));

            setSaveSuccess(true);
            setTimeout(() => {
                setSaveSuccess(false);
                setProposals([]);
                setRawText('');
                onClose();
            }, 600);
        } catch (err: any) {
            alert(`Save error: ${err.message}`);
        } finally {
            setIsSaving(false);
        }
    };

    if (!isOpen) return null;

    // Helper to format currency display respecting scale (JPY = 0, AUD = 2)
    const formatCents = (cents: number, currency: string) => {
        const curr = (currency || 'AUD').toUpperCase() as CurrencyCode;
        const decimals = (curr in CURRENCY_DECIMALS) ? CURRENCY_DECIMALS[curr] : 2;
        const factor = Math.pow(10, decimals);
        return new Intl.NumberFormat('en-AU', {
            style: 'currency',
            currency: curr,
            minimumFractionDigits: decimals,
            maximumFractionDigits: decimals
        }).format(cents / factor);
    };

    const isValuationKind = (kind: BalanceKind) => {
        const nonVal = ['credit_limit', 'available_credit', 'available_redraw', 'buying_power', 'projected_future_value', 'unresolved'];
        return !nonVal.includes(kind);
    };

    return (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm z-[100] flex items-center justify-center p-4 animate-in fade-in duration-200">
            <div className="bg-card text-card-foreground rounded-3xl w-full max-w-4xl border border-border shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
                {/* Header */}
                <div className="p-6 border-b border-border flex items-center justify-between bg-muted/30">
                    <div className="flex items-center gap-3">
                        <div className="p-2.5 bg-blue-600/10 text-blue-600 rounded-2xl">
                            <Scale size={24} />
                        </div>
                        <div>
                            <h3 className="text-xl font-black tracking-tight text-foreground flex items-center gap-2">
                                Fast Balance Updates
                                <span className="text-[10px] font-bold bg-emerald-100 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 px-2 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-800 flex items-center gap-1">
                                    <ShieldCheck size={11} /> 100% On-Device
                                </span>
                            </h3>
                            <p className="text-xs text-muted-foreground mt-0.5">
                                Quickly refresh your Super, Trading, and Bank running totals without third-party cloud data leaks.
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Tab Switcher */}
                <div className="px-6 pt-4 border-b border-border flex gap-4 bg-muted/10">
                    <button
                        onClick={() => setActiveTab('paste')}
                        className={`pb-3 text-sm font-bold border-b-2 flex items-center gap-2 transition-colors ${
                            activeTab === 'paste'
                                ? 'border-blue-600 text-blue-600'
                                : 'border-transparent text-muted-foreground hover:text-foreground'
                        }`}
                    >
                        <FileSpreadsheet size={16} />
                        Paste Table / CSV
                    </button>
                    <button
                        onClick={() => setActiveTab('manual')}
                        className={`pb-3 text-sm font-bold border-b-2 flex items-center gap-2 transition-colors ${
                            activeTab === 'manual'
                                ? 'border-blue-600 text-blue-600'
                                : 'border-transparent text-muted-foreground hover:text-foreground'
                        }`}
                    >
                        <Scale size={16} />
                        Manual Fast Entry
                    </button>
                </div>

                {/* Modal Body */}
                <div className="p-6 overflow-y-auto flex-1 space-y-6">
                    {activeTab === 'paste' ? (
                        <>
                            {proposals.length === 0 ? (
                                <div className="space-y-4">
                                    <div>
                                        <label className="block text-sm font-bold text-foreground mb-1">
                                            Paste your account summaries or spreadsheets:
                                        </label>
                                        <p className="text-xs text-muted-foreground mb-2">
                                            Copy rows directly from online banking, spreadsheets (CSV/TSV), or PDF text:
                                        </p>
                                        <textarea
                                            value={rawText}
                                            onChange={(e) => setRawText(e.target.value)}
                                            rows={8}
                                            placeholder={`Everyday Checking, "$1,234.56", 2026-09-18, Current\nAustralianSuper, "$150,000.00", 2026-09-18, Portfolio Value\nPlatinum Credit Card, "-$450.00", 2026-09-18, Statement Balance\nHome Loan Redraw, "$25,000.00", 2026-09-18, Available Redraw`}
                                            className="w-full font-mono text-xs p-4 rounded-2xl bg-muted/40 border border-border focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-all resize-y"
                                        />
                                    </div>

                                    {parseError && (
                                        <div className="p-3 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900 rounded-xl text-xs text-red-600 dark:text-red-400 flex items-center gap-2">
                                            <AlertCircle size={16} />
                                            {parseError}
                                        </div>
                                    )}

                                    <div className="flex justify-end">
                                        <button
                                            onClick={handleParse}
                                            disabled={isParsing || !rawText.trim()}
                                            className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm rounded-xl shadow-md disabled:opacity-50 transition-all flex items-center gap-2"
                                        >
                                            {isParsing ? 'Parsing Rows...' : 'Parse & Review Balances'}
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <h4 className="text-sm font-bold text-foreground">Review & Confirm Balances</h4>
                                            <p className="text-xs text-muted-foreground">
                                                Review account matches, balance kinds, and check the delta before saving.
                                            </p>
                                        </div>
                                        <button
                                            onClick={() => setProposals([])}
                                            className="text-xs text-muted-foreground hover:text-foreground underline"
                                        >
                                            Paste Different Text
                                        </button>
                                    </div>

                                    {/* Review Table */}
                                    <div className="border border-border rounded-2xl overflow-hidden bg-muted/10">
                                        <div className="overflow-x-auto">
                                            <table className="w-full text-left text-xs">
                                                <thead className="bg-muted/40 border-b border-border text-muted-foreground uppercase font-bold">
                                                    <tr>
                                                        <th className="p-3">Source Name</th>
                                                        <th className="p-3">Target Account</th>
                                                        <th className="p-3">Balance Kind</th>
                                                        <th className="p-3">Date</th>
                                                        <th className="p-3 text-right">Amount</th>
                                                        <th className="p-3 text-right">Delta</th>
                                                        <th className="p-3 text-center">Action</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-border">
                                                    {proposals.map((prop) => {
                                                        const isVal = isValuationKind(prop.balance_kind);
                                                        const prev = prop.previous_amount_cents;
                                                        // Honest delta calculation (F1):
                                                        // Old balance and new balance must refer to the same account and same currency.
                                                        // When currency is edited or account detached/remapped, delta is null (displayed as em dash)
                                                        // until an authoritative previous balance exists in that same account and currency.
                                                        const matchedAcc = prop.account_id ? accounts.find(a => a.id === prop.account_id) : null;
                                                        const isSameAccountAndCurrency = matchedAcc ? matchedAcc.currency === prop.currency : false;
                                                        const delta = (isSameAccountAndCurrency && prev !== null && prev !== undefined) ? (prop.amount_cents - prev) : null;

                                                        return (
                                                            <tr key={prop.id} className="hover:bg-muted/20 transition-colors">
                                                                <td className="p-3">
                                                                    <div className="font-semibold text-foreground">
                                                                        {prop.raw_account_name}
                                                                    </div>
                                                                    {prop.unresolved_fields && prop.unresolved_fields.length > 0 && (
                                                                        <div className="mt-1 flex flex-wrap items-center gap-1">
                                                                            {prop.unresolved_fields.map((field) => (
                                                                                <span
                                                                                    key={field}
                                                                                    className="inline-flex items-center gap-0.5 text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-100 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border border-amber-300 dark:border-amber-700"
                                                                                    title={`Review finding: ${field}`}
                                                                                >
                                                                                    <AlertCircle size={10} />
                                                                                    {field === 'currency' && 'Ambiguous Currency ($)'}
                                                                                    {field === 'effective_date' && 'Date Missing'}
                                                                                    {field === 'amount_sign' && 'Sign Flagged (Debt/Credit)'}
                                                                                    {field === 'amount_precision' && 'Precision Flagged'}
                                                                                    {!['currency', 'effective_date', 'amount_sign', 'amount_precision'].includes(field) && field}
                                                                                </span>
                                                                            ))}
                                                                            {!prop.confirmed_by_user ? (
                                                                                <button
                                                                                    type="button"
                                                                                    onClick={() => updateProposal(prop.id, { confirmed_by_user: true })}
                                                                                    className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-blue-100 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border border-blue-300 dark:border-blue-700 hover:bg-blue-200 transition-colors"
                                                                                    title="Confirm unresolved attributes"
                                                                                >
                                                                                    {(() => {
                                                                                        const parts: string[] = [];
                                                                                        if (prop.unresolved_fields?.includes('currency')) parts.push(prop.currency);
                                                                                        if (prop.unresolved_fields?.includes('effective_date')) parts.push(prop.effective_date);
                                                                                        if (prop.unresolved_fields?.includes('amount_sign')) parts.push(prop.amount_cents >= 0 ? '+ balance' : '- debt');
                                                                                        if (parts.length === 0) {
                                                                                            parts.push(prop.currency, prop.effective_date);
                                                                                        }
                                                                                        return `Confirm (${parts.join(', ')})`;
                                                                                    })()}
                                                                                </button>
                                                                            ) : (
                                                                                <span className="inline-flex items-center gap-0.5 text-[10px] font-bold text-emerald-600 dark:text-emerald-400">
                                                                                    <Check size={10} /> Confirmed ({prop.currency}, {prop.effective_date})
                                                                                </span>
                                                                            )}
                                                                        </div>
                                                                    )}
                                                                </td>
                                                                <td className="p-3">
                                                                    <div className="flex items-center gap-1.5">
                                                                        <select
                                                                            value={prop.account_id || ''}
                                                                            onChange={(e) => {
                                                                                const val = e.target.value;
                                                                                if (val === '__CREATE_NEW__') {
                                                                                    setPendingProposalId(prop.id);
                                                                                    setNewAccountName(prop.raw_account_name);
                                                                                    setNewAccountCurrency(prop.currency);
                                                                                    setIsCreateAccountOpen(true);
                                                                                } else {
                                                                                    const matched = accounts.find(a => a.id === val);
                                                                                    if (matched && matched.currency !== prop.currency) {
                                                                                        alert(`Account "${matched.name}" is in ${matched.currency}, but this observation is in ${prop.currency}. Observation currency cannot be rewritten silently.`);
                                                                                        return;
                                                                                    }
                                                                                    updateProposal(prop.id, {
                                                                                        account_id: val || null,
                                                                                        account_name: matched?.name || prop.raw_account_name,
                                                                                        currency: (matched?.currency || prop.currency) as CurrencyCode,
                                                                                        expected_balance_revision: matched?.balance_revision || 1,
                                                                                        previous_amount_cents: (matched && matched.balance_cents !== null && matched.balance_cents !== undefined) ? matched.balance_cents : null,
                                                                                        unresolved_fields: prop.unresolved_fields?.filter(f => f !== 'currency')
                                                                                    });
                                                                                }
                                                                            }}
                                                                            className="bg-card text-foreground border border-border rounded-lg px-2 py-1 text-xs font-medium outline-none"
                                                                        >
                                                                            <option value="">-- Select Account --</option>
                                                                            {accounts.map(acc => {
                                                                                const owner = entities.find(e => e.id === acc.entity_id)?.name || 'Household';
                                                                                return (
                                                                                    <option key={acc.id} value={acc.id}>
                                                                                        {owner} — {acc.name} ({acc.currency})
                                                                                    </option>
                                                                                );
                                                                            })}
                                                                            <option value="__CREATE_NEW__">+ Create New Account...</option>
                                                                        </select>
                                                                    </div>
                                                                </td>
                                                                <td className="p-3">
                                                                    <div className="space-y-1">
                                                                        <select
                                                                            value={prop.balance_kind}
                                                                            onChange={(e) => updateProposal(prop.id, { balance_kind: e.target.value as BalanceKind })}
                                                                            className="bg-card text-foreground border border-border rounded-lg px-2 py-1 text-xs font-medium outline-none"
                                                                        >
                                                                            <option value="current_balance">Current Balance</option>
                                                                            <option value="statement_closing_balance">Statement Closing</option>
                                                                            <option value="total_portfolio_value">Total Portfolio Value</option>
                                                                            <option value="securities_market_value">Securities Market Value</option>
                                                                            <option value="brokerage_cash">Brokerage Cash</option>
                                                                            <option value="outstanding_loan_principal">Loan Principal</option>
                                                                            <option value="available_balance">Available Balance (Holds)</option>
                                                                            <option value="credit_limit">Credit Limit (Non-Valuation)</option>
                                                                            <option value="available_credit">Available Credit (Non-Valuation)</option>
                                                                            <option value="available_redraw">Available Redraw (Non-Valuation)</option>
                                                                            <option value="buying_power">Buying Power (Non-Valuation)</option>
                                                                            <option value="projected_future_value">Projected Value (Non-Valuation)</option>
                                                                        </select>
                                                                        {!isVal && (
                                                                            <span className="block text-[10px] text-amber-600 dark:text-amber-400 font-bold">
                                                                                 * Excluded from Net Worth
                                                                            </span>
                                                                        )}
                                                                    </div>
                                                                </td>
                                                                <td className="p-3">
                                                                    <input
                                                                        type="date"
                                                                        value={prop.effective_date}
                                                                        onChange={(e) => updateProposal(prop.id, {
                                                                            effective_date: e.target.value,
                                                                            unresolved_fields: prop.unresolved_fields?.filter(f => f !== 'effective_date'),
                                                                            confirmed_by_user: false
                                                                        })}
                                                                        className="bg-card text-foreground border border-border rounded-lg px-2 py-1 text-xs font-medium outline-none"
                                                                    />
                                                                </td>
                                                                <td className="p-3 text-right font-bold text-foreground">
                                                                    {(() => {
                                                                        const pDec = (prop.currency in CURRENCY_DECIMALS) ? CURRENCY_DECIMALS[prop.currency] : 2;
                                                                        const pFac = Math.pow(10, pDec);
                                                                        return (
                                                                            <div className="flex items-center justify-end gap-1.5">
                                                                                <select
                                                                                    value={prop.currency}
                                                                                    onChange={(e) => handleProposalCurrencyChange(prop.id, e.target.value as CurrencyCode)}
                                                                                    className="bg-card text-foreground border border-border rounded-lg px-1.5 py-1 text-xs font-bold outline-none cursor-pointer"
                                                                                    title="Correct proposal currency"
                                                                                >
                                                                                    <option value="AUD">AUD</option>
                                                                                    <option value="USD">USD</option>
                                                                                    <option value="EUR">EUR</option>
                                                                                    <option value="GBP">GBP</option>
                                                                                    <option value="CAD">CAD</option>
                                                                                    <option value="NZD">NZD</option>
                                                                                    <option value="JPY">JPY</option>
                                                                                    <option value="CHF">CHF</option>
                                                                                    <option value="SGD">SGD</option>
                                                                                    <option value="HKD">HKD</option>
                                                                                </select>
                                                                                <input
                                                                                    type="number"
                                                                                    step={pDec === 0 ? "1" : (1 / pFac).toString()}
                                                                                    value={pDec === 0 ? prop.amount_cents.toString() : (prop.amount_cents / pFac).toFixed(pDec)}
                                                                                    onChange={(e) => {
                                                                                        const val = parseFloat(e.target.value);
                                                                                        if (!isNaN(val)) {
                                                                                            updateProposal(prop.id, {
                                                                                                amount_cents: pDec === 0 ? Math.round(val) : Math.round(val * pFac),
                                                                                                unresolved_fields: prop.unresolved_fields?.filter(f => f !== 'amount_precision' && f !== 'amount_sign'),
                                                                                                confirmed_by_user: false
                                                                                            });
                                                                                        }
                                                                                    }}
                                                                                    className="w-24 text-right bg-card text-foreground border border-border rounded-lg px-2 py-1 text-xs font-bold outline-none"
                                                                                />
                                                                            </div>
                                                                        );
                                                                    })()}
                                                                </td>
                                                                <td className="p-3 text-right">
                                                                    {delta !== null ? (
                                                                        <span className={`text-xs font-bold px-1.5 py-0.5 rounded-full ${
                                                                            delta > 0
                                                                                ? 'bg-emerald-100 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400'
                                                                                : delta < 0
                                                                                ? 'bg-rose-100 dark:bg-rose-950/40 text-rose-700 dark:text-rose-400'
                                                                                : 'bg-muted text-muted-foreground'
                                                                        }`}>
                                                                            {delta > 0 ? '+' : ''}{formatCents(delta, prop.currency)}
                                                                        </span>
                                                                    ) : (
                                                                        <span className="text-[10px] text-muted-foreground italic">—</span>
                                                                    )}
                                                                </td>
                                                                <td className="p-3 text-center">
                                                                    <button
                                                                        onClick={() => removeProposal(prop.id)}
                                                                        className="p-1 text-muted-foreground hover:text-red-500 rounded transition-colors"
                                                                        title="Remove row"
                                                                    >
                                                                        <Trash2 size={14} />
                                                                    </button>
                                                                </td>
                                                            </tr>
                                                        );
                                                    })}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </>
                    ) : (
                        /* Manual Fast Entry Tab */
                        <div className="space-y-4">
                            <div className="flex items-center justify-between">
                                <div>
                                    <h4 className="text-sm font-bold text-foreground">Active Tracked Accounts</h4>
                                    <p className="text-xs text-muted-foreground">
                                        Enter current balances directly for your accounts. Blank fields will be left untouched.
                                    </p>
                                </div>
                                <button
                                    onClick={() => {
                                        setPendingProposalId(null);
                                        setIsCreateAccountOpen(true);
                                    }}
                                    className="px-3 py-1.5 bg-blue-50 text-blue-600 hover:bg-blue-100 rounded-xl text-xs font-bold transition-colors flex items-center gap-1"
                                >
                                    <Plus size={14} />
                                    Add Account
                                </button>
                            </div>

                            <div className="border border-border rounded-2xl overflow-hidden bg-muted/10">
                                <table className="w-full text-left text-xs">
                                    <thead className="bg-muted/40 border-b border-border text-muted-foreground uppercase font-bold">
                                        <tr>
                                            <th className="p-3">Account Name</th>
                                            <th className="p-3">Tracking</th>
                                            <th className="p-3 text-right">Last Recorded</th>
                                            <th className="p-3 text-right">New Balance</th>
                                            <th className="p-3 text-right">Delta</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-border">
                                        {accounts.filter(a => a.type === 'asset' || a.type === 'liability').map((acc) => {
                                            const entry = manualEntries[acc.id] || { amount: '', kind: 'current_balance', date: new Date().toISOString().split('T')[0] };
                                            const newAmount = parseFloat(entry.amount);
                                            const hasNewVal = !isNaN(newAmount) && entry.amount.trim().length > 0;
                                            const accCurr = (acc.currency || 'AUD') as CurrencyCode;
                                            const accDec = (accCurr in CURRENCY_DECIMALS) ? CURRENCY_DECIMALS[accCurr] : 2;
                                            const accFac = Math.pow(10, accDec);
                                            const newCents = hasNewVal ? (accDec === 0 ? Math.round(newAmount) : Math.round(newAmount * accFac)) : 0;
                                            // Truthful prior balance check (F2):
                                            // Treat both null and undefined (or is_unknown) as unknown balances requiring initial balance.
                                            // Preserve genuine recorded zero balances (acc.balance_cents === 0) as known zeros.
                                            const hasKnownPriorBalance = acc.balance_cents !== null && acc.balance_cents !== undefined && !acc.is_unknown;
                                            const deltaCents = (hasNewVal && hasKnownPriorBalance)
                                                ? newCents - acc.balance_cents!
                                                : null;

                                            return (
                                                <tr key={acc.id} className="hover:bg-muted/20 transition-colors">
                                                    <td className="p-3">
                                                        <p className="font-bold text-foreground">{acc.name}</p>
                                                        <p className="text-[10px] text-muted-foreground">{acc.sub_type} ({acc.currency})</p>
                                                    </td>
                                                    <td className="p-3">
                                                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                                                            acc.tracking_mode === 'balance'
                                                                ? 'bg-blue-100 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300'
                                                                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                                                        }`}>
                                                            {acc.tracking_mode === 'balance' ? 'Balance Only' : 'Transactions'}
                                                        </span>
                                                    </td>
                                                    <td className="p-3 text-right font-medium text-muted-foreground">
                                                        {hasKnownPriorBalance ? (
                                                            formatCents(acc.balance_cents!, acc.currency)
                                                        ) : (
                                                            <span className="text-amber-600 dark:text-amber-400 font-bold italic text-xs">
                                                                Needs balance
                                                            </span>
                                                        )}
                                                    </td>
                                                    <td className="p-3 text-right">
                                                        <input
                                                            type="number"
                                                            step={accDec === 0 ? "1" : (1 / accFac).toString()}
                                                            placeholder="Leave blank to skip"
                                                            value={entry.amount}
                                                            onChange={(e) => {
                                                                const val = e.target.value;
                                                                setManualEntries(prev => ({
                                                                    ...prev,
                                                                    [acc.id]: {
                                                                        ...entry,
                                                                        amount: val
                                                                    }
                                                                }));
                                                            }}
                                                            className="w-32 text-right bg-card text-foreground border border-border rounded-lg px-2.5 py-1 text-xs font-bold outline-none focus:border-blue-500"
                                                        />
                                                    </td>
                                                    <td className="p-3 text-right">
                                                        {deltaCents !== null ? (
                                                            <span className={`text-xs font-bold px-1.5 py-0.5 rounded-full ${
                                                                deltaCents > 0
                                                                    ? 'bg-emerald-100 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400'
                                                                    : deltaCents < 0
                                                                    ? 'bg-rose-100 dark:bg-rose-950/40 text-rose-700 dark:text-rose-400'
                                                                    : 'bg-muted text-muted-foreground'
                                                            }`}>
                                                                {deltaCents > 0 ? '+' : ''}{formatCents(deltaCents, acc.currency)}
                                                            </span>
                                                        ) : (
                                                            <span className="text-muted-foreground text-[10px]">—</span>
                                                        )}
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="p-6 border-t border-border flex items-center justify-between bg-muted/20">
                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                        <HelpCircle size={14} />
                        Balance updates create immutable, dated observations without overwriting transaction history.
                    </p>
                    <div className="flex gap-2">
                        <button
                            onClick={onClose}
                            className="px-4 py-2 border border-border rounded-xl text-sm font-bold text-foreground hover:bg-muted transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={handleSaveBatch}
                            disabled={isSaving || saveSuccess || (activeTab === 'paste' && proposals.length === 0)}
                            className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-bold shadow-md disabled:opacity-50 transition-all flex items-center gap-2"
                        >
                            {saveSuccess ? (
                                <>
                                    <Check size={16} /> Saved!
                                </>
                            ) : isSaving ? (
                                'Saving Balances...'
                            ) : (
                                'Confirm & Save Balances'
                            )}
                        </button>
                    </div>
                </div>
            </div>

            {/* Inline Account Creation Sub-Modal */}
            {isCreateAccountOpen && (
                <div className="fixed inset-0 bg-slate-950/80 z-[110] flex items-center justify-center p-4 animate-in fade-in zoom-in-95 duration-150">
                    <div className="bg-card text-card-foreground rounded-3xl w-full max-w-md border border-border p-6 shadow-2xl space-y-4">
                        <div className="flex items-center justify-between border-b border-border pb-3">
                            <h4 className="font-bold text-foreground flex items-center gap-2">
                                <Plus size={18} className="text-blue-600" />
                                Create New Account
                            </h4>
                            <button
                                onClick={() => setIsCreateAccountOpen(false)}
                                className="text-muted-foreground hover:text-foreground"
                            >
                                <X size={18} />
                            </button>
                        </div>

                        <form onSubmit={handleCreateAccount} className="space-y-3">
                            <div>
                                <label className="block text-xs font-bold text-muted-foreground mb-1">Account Name</label>
                                <input
                                    type="text"
                                    required
                                    value={newAccountName}
                                    onChange={(e) => setNewAccountName(e.target.value)}
                                    placeholder="e.g. AustralianSuper, CommBank Smart Access"
                                    className="w-full bg-muted/40 border border-border rounded-xl px-3 py-2 text-xs font-medium outline-none focus:border-blue-500"
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-muted-foreground mb-1">Owner Entity</label>
                                <select
                                    value={newAccountEntityId}
                                    onChange={(e) => setNewAccountEntityId(e.target.value)}
                                    className="w-full bg-card border border-border rounded-xl px-3 py-2 text-xs font-medium outline-none"
                                >
                                    {entities.map(ent => (
                                        <option key={ent.id} value={ent.id}>
                                            {ent.name}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div className="grid grid-cols-2 gap-2">
                                <div>
                                    <label className="block text-xs font-bold text-muted-foreground mb-1">Type</label>
                                    <select
                                        value={newAccountType}
                                        onChange={(e) => setNewAccountType(e.target.value as any)}
                                        className="w-full bg-card border border-border rounded-xl px-3 py-2 text-xs font-medium outline-none"
                                    >
                                        <option value="asset">Asset</option>
                                        <option value="liability">Liability</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-muted-foreground mb-1">Sub-Type</label>
                                    <select
                                        value={newAccountSubType}
                                        onChange={(e) => setNewAccountSubType(e.target.value)}
                                        className="w-full bg-card border border-border rounded-xl px-3 py-2 text-xs font-medium outline-none"
                                    >
                                        {newAccountType === 'asset' ? (
                                            <>
                                                <option value="superannuation">Superannuation / Pension</option>
                                                <option value="checking">Checking / Everyday</option>
                                                <option value="savings">Savings Account</option>
                                                <option value="brokerage">Trading / Brokerage</option>
                                                <option value="real_estate">Real Estate</option>
                                                <option value="crypto">Cryptocurrency</option>
                                                <option value="other">Other Asset</option>
                                            </>
                                        ) : (
                                            <>
                                                <option value="credit_card">Credit Card</option>
                                                <option value="mortgage">Mortgage / Home Loan</option>
                                                <option value="personal_loan">Personal Loan</option>
                                                <option value="other">Other Liability</option>
                                            </>
                                        )}
                                    </select>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-2">
                                <div>
                                    <label className="block text-xs font-bold text-muted-foreground mb-1">
                                        Currency {isPendingCurrencyLocked && <span className="text-[10px] text-blue-600 dark:text-blue-400 font-normal">(Locked to source)</span>}
                                    </label>
                                    <select
                                        value={newAccountCurrency}
                                        disabled={isPendingCurrencyLocked}
                                        onChange={(e) => setNewAccountCurrency(e.target.value as any)}
                                        className="w-full bg-card border border-border rounded-xl px-3 py-2 text-xs font-medium outline-none disabled:opacity-60"
                                    >
                                        <option value="AUD">AUD ($)</option>
                                        <option value="USD">USD ($)</option>
                                        <option value="EUR">EUR (€)</option>
                                        <option value="GBP">GBP (£)</option>
                                        <option value="CAD">CAD ($)</option>
                                        <option value="NZD">NZD ($)</option>
                                        <option value="JPY">JPY (¥)</option>
                                        <option value="CHF">CHF (CHF)</option>
                                        <option value="SGD">SGD ($)</option>
                                        <option value="HKD">HKD ($)</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-muted-foreground mb-1">Tracking Mode</label>
                                    <select
                                        value={newAccountTrackingMode}
                                        onChange={(e) => setNewAccountTrackingMode(e.target.value as any)}
                                        className="w-full bg-card border border-border rounded-xl px-3 py-2 text-xs font-medium outline-none"
                                    >
                                        <option value="balance">Balance Only (Fast)</option>
                                        <option value="transactions">Full Transactions</option>
                                    </select>
                                </div>
                            </div>

                            <div className="pt-3 flex justify-end gap-2">
                                <button
                                    type="button"
                                    onClick={() => setIsCreateAccountOpen(false)}
                                    className="px-3 py-1.5 text-xs font-bold border border-border rounded-xl"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow"
                                >
                                    Create Account
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
