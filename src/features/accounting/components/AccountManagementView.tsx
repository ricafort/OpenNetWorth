/**
 * Milestone 1 Account Management View
 * 
 * Why this component exists:
 * Provides the user interface for creating financial accounts and establishing dated opening
 * balances (M1-DOM-02, M1-FLOW-01). Displays active accounts grouped by Asset and Liability
 * with exact, real-time calculated balances and net worth.
 * 
 * Tricky logic:
 * - On save failure (M1-SAFE-04): The modal remains open, form inputs are strictly preserved,
 *   and an actionable error banner is rendered. The success callback is suppressed.
 * - Explains accounting categories in ordinary language (e.g. "Asset: What you own",
 *   "Liability: What you owe").
 * 
 * TODO: Add inline transaction drilldown modal for individual accounts in Slice 1D.
 */

'use client';
import React, { useState, useEffect } from 'react';
import { Plus, Wallet, CreditCard, Shield, AlertTriangle, CheckCircle2, RefreshCw, X } from 'lucide-react';
import { Account, AccountSubType, AccountType, CurrencyCode, Entity, centsToInputString, formatMoney, parseToCents } from '@/lib/domain/accounting/types';
import { BalanceCheckModal } from './BalanceCheckModal';
import { CategorizationRulesModal } from './CategorizationRulesModal';
import UpdateBalancesModal from '@/features/sync/components/UpdateBalancesModal';

/**
 * Format entity types into user-friendly labels without losing trust/household distinctions.
 * Why this exists:
 * Presents clean, human-understandable labels (Personal, Household, Business, Trust)
 * across the UI while preserving domain integrity.
 */
const getOwnerTypeLabel = (type: string) => {
    switch (type) {
        case 'person':
            return 'Personal';
        case 'household':
            return 'Household';
        case 'business':
            return 'Business';
        case 'trust':
            return 'Trust';
        default:
            return type ? type.charAt(0).toUpperCase() + type.slice(1) : 'Owner';
    }
};

interface AccountWithBalance extends Account {
    balance_cents: number;
    formatted_balance: string;
    as_of_date?: string;
}

interface NetWorthSummary {
    net_worth_cents_by_currency: Record<string, number>;
    formatted_net_worth_by_currency: Record<string, string>;
    total_assets_cents_by_currency: Record<string, number>;
    total_liabilities_cents_by_currency: Record<string, number>;
}

export const AccountManagementView: React.FC<{ entities: Entity[], selectedEntityId: string }> = ({ entities, selectedEntityId }) => {
    const [accounts, setAccounts] = useState<AccountWithBalance[]>([]);
    const [netWorth, setNetWorth] = useState<NetWorthSummary | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [checkBalanceAccountId, setCheckBalanceAccountId] = useState<string | null>(null);
    const [recordBalanceAccountId, setRecordBalanceAccountId] = useState<string | null>(null);
    const [rulesAccountId, setRulesAccountId] = useState<{ id: string, name: string } | null>(null);
    const [editingAccountId, setEditingAccountId] = useState<string | null>(null);

    // Form fields
    const [formName, setFormName] = useState('');
    const [formEntityId, setFormEntityId] = useState('');
    const [formType, setFormType] = useState<AccountType>('asset');
    const [formSubType, setFormSubType] = useState<AccountSubType>('checking');
    const [formCurrency, setFormCurrency] = useState<CurrencyCode>('USD');
    const [formOpeningAmount, setFormOpeningAmount] = useState('');
    const getLocalIsoDate = () => {
        const d = new Date();
        d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
        return d.toISOString().split('T')[0];
    };

    const [formOpeningDate, setFormOpeningDate] = useState(getLocalIsoDate);
    const [formInstitution, setFormInstitution] = useState('');
    // Liability terms (migration 0009 columns). The cash flow forecast projects
    // `minimum_payment_cents` verbatim; blank falls back to the debtCalculator estimate.
    const [formInterestRate, setFormInterestRate] = useState('');
    const [formMinimumPayment, setFormMinimumPayment] = useState('');

    // Target account highlight and scrolling from URL parameter
    const [targetAccountId, setTargetAccountId] = useState<string | null>(null);

    useEffect(() => {
        if (typeof window !== 'undefined') {
            const params = new URLSearchParams(window.location.search);
            const id = params.get('accountId');
            if (id) {
                setTargetAccountId(id);
            }
        }
    }, []);

    useEffect(() => {
        if (targetAccountId && !isLoading && accounts.length > 0) {
            const timer = setTimeout(() => {
                const el = document.getElementById(`account-row-${targetAccountId}`);
                if (el) {
                    el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                }
            }, 100);
            return () => clearTimeout(timer);
        }
    }, [targetAccountId, isLoading, accounts]);

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape' && isModalOpen) {
                setIsModalOpen(false);
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isModalOpen]);

    const handleOpenModal = () => {
        if (selectedEntityId && selectedEntityId !== 'all') {
            setFormEntityId(selectedEntityId);
            const ent = entities.find(e => e.id === selectedEntityId);
            if (ent?.currency) setFormCurrency(ent.currency as CurrencyCode);
        } else if (entities.length === 1) {
            setFormEntityId(entities[0].id);
            if (entities[0].currency) setFormCurrency(entities[0].currency as CurrencyCode);
        } else {
            setFormEntityId('');
        }
        setFormName('');
        setFormType('asset');
        setFormSubType('checking');
        setFormInstitution('');
        setFormOpeningAmount('');
        setFormInterestRate('');
        setFormMinimumPayment('');
        setEditingAccountId(null);
        setError(null);
        setIsModalOpen(true);
    };

    const handleEditAccount = (acc: AccountWithBalance) => {
        setEditingAccountId(acc.id);
        setFormName(acc.name);
        setFormEntityId(acc.entity_id);
        setFormType(acc.type);
        setFormSubType(acc.sub_type);
        setFormCurrency(acc.currency as CurrencyCode);
        setFormInstitution(acc.institution || '');
        setFormOpeningAmount('');
        // Pre-populate terms so saving without touching them keeps the stored values,
        // and clearing an input explicitly nulls the column (updateAccount: null = clear).
        setFormInterestRate(acc.interest_rate != null ? String(acc.interest_rate) : '');
        setFormMinimumPayment(centsToInputString(acc.minimum_payment_cents, acc.currency));
        setError(null);
        setIsModalOpen(true);
    };

    const fetchData = async (entityId?: string) => {
        setIsLoading(true);
        setError(null);
        try {
            const localDate = getLocalIsoDate();
            const params = new URLSearchParams({ as_of_date: localDate });
            if (entityId && entityId !== 'all') {
                params.set('entity_id', entityId);
            }
            const res = await fetch(`/api/accounting?${params.toString()}`);
            if (!res.ok) {
                const err = await res.json().catch(() => ({}));
                throw new Error(err.error || 'Failed to load accounting data');
            }
            const data = await res.json();
            if (data.accounts) {
                setAccounts(data.accounts);
            }
            // Clear stale single-entity net worth if in 'all' view or on null response (Clarification 1)
            if (entityId === 'all' || !data.net_worth) {
                setNetWorth(null);
            } else {
                setNetWorth(data.net_worth);
            }
        } catch (err: any) {
            console.error('Fetch error:', err);
            setError(err.message || 'Failed to connect to local accounting database');
            setNetWorth(null);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        if (selectedEntityId) fetchData(selectedEntityId);
    }, [selectedEntityId]);

    const handleCreateAccount = async (e: React.FormEvent) => {
        e.preventDefault();
        if (isSubmitting) return;

        setError(null);
        setIsSubmitting(true);

        try {
            const concreteEntityId = selectedEntityId === 'all' ? formEntityId : selectedEntityId;
            if (!concreteEntityId || concreteEntityId === 'all') {
                throw new Error('Please select an owner entity for this account.');
            }

            let openingCents: number | null = null;
            if (formOpeningAmount && formOpeningAmount.trim() !== '') {
                openingCents = parseToCents(formOpeningAmount, formCurrency);
            }

            // Liability terms: blank → null (no terms / clear on edit), value → validated number.
            // updateAccount treats null as "clear the column" and undefined as "don't touch";
            // we always send explicit values for liabilities so the UI is the source of truth.
            let interestRate: number | null = null;
            let minimumPaymentCents: number | null = null;
            if (formType === 'liability') {
                if (formInterestRate.trim() !== '') {
                    interestRate = Number(formInterestRate);
                    if (!Number.isFinite(interestRate) || interestRate < 0) {
                        throw new Error('Interest rate must be a non-negative number, e.g. 18.99.');
                    }
                }
                if (formMinimumPayment.trim() !== '') {
                    minimumPaymentCents = parseToCents(formMinimumPayment, formCurrency);
                }
            }

            let payload: any;
            if (editingAccountId) {
                const account = accounts.find(a => a.id === editingAccountId);
                let expectedRevision = account?.revision || 1;
                if (account && account.opening_balance_cents === null && openingCents !== null) {
                    const obRes = await fetch('/api/accounting', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            action: 'set_opening_balance',
                            account_id: editingAccountId,
                            amount_cents: openingCents,
                            date: formOpeningDate
                        })
                    });
                    if (!obRes.ok) {
                        const errData = await obRes.json().catch(() => ({}));
                        throw new Error(errData.error || 'Failed to establish missing opening balance');
                    }
                    expectedRevision += 1;
                    if (typeof window !== 'undefined') {
                        window.dispatchEvent(new Event('opennetworth_balances_updated'));
                    }
                }

                payload = {
                    action: 'update_account',
                    account_id: editingAccountId,
                    expected_revision: expectedRevision,
                    updates: {
                        name: formName,
                        sub_type: formSubType,
                        institution: formInstitution || null,
                        ...(formType === 'liability' ? {
                            interest_rate: interestRate,
                            minimum_payment_cents: minimumPaymentCents
                        } : {})
                    }
                };
            } else {
                payload = {
                    action: 'create_account',
                    account: {
                        entity_id: concreteEntityId,
                        name: formName,
                        type: formType,
                        sub_type: formSubType,
                        currency: formCurrency,
                        institution: formInstitution || null,
                        opening_date: openingCents !== null ? formOpeningDate : null,
                        opening_balance_cents: openingCents,
                        ...(formType === 'liability' ? {
                            interest_rate: interestRate,
                            minimum_payment_cents: minimumPaymentCents
                        } : {})
                    }
                };
            }

            const res = await fetch('/api/accounting', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (!res.ok) {
                const errData = await res.json().catch(() => ({}));
                throw new Error(errData.error || 'Failed to save account to local ledger');
            }

            // Success: Reset form inputs and close modal
            setFormName('');
            setFormOpeningAmount('');
            setFormInstitution('');
            setFormInterestRate('');
            setFormMinimumPayment('');
            setEditingAccountId(null);
            setIsModalOpen(false);

            // Refresh authoritative list
            await fetchData(selectedEntityId);
            if (typeof window !== 'undefined') {
                window.dispatchEvent(new Event('opennetworth_balances_updated'));
            }
        } catch (err: any) {
            console.error('Account creation error:', err);
            // M1-SAFE-04: Form inputs remain intact; modal stays open; actionable error is shown
            setError(err.message || 'Failed to create account. Your input has been preserved.');
        } finally {
            setIsSubmitting(false);
        }
    };

    const assetAccounts = accounts.filter(a => a.type === 'asset');
    const liabilityAccounts = accounts.filter(a => a.type === 'liability');

    return (
        <div className="space-y-6 max-w-6xl mx-auto p-4 md:p-6">
            {/* Header & Net Worth Banner */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-card border border-border p-6 rounded-2xl shadow-sm">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
                        <Wallet className="w-6 h-6 text-primary" />
                        Accounts
                    </h1>
                    <p className="text-sm text-muted-foreground mt-1">
                        Track everything you own and owe in one place.
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    <button
                        onClick={handleOpenModal}
                        className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-primary text-primary-foreground font-medium hover:bg-primary/90 transition shadow-sm text-sm"
                    >
                        <Plus className="w-4 h-4" />
                        Add account
                    </button>
                    <button
                        onClick={() => fetchData(selectedEntityId)}
                        disabled={isLoading}
                        className="p-2.5 rounded-xl border border-border hover:bg-muted text-muted-foreground transition"
                        title="Refresh Balances"
                    >
                        <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
                    </button>
                </div>
            </div>

            {/* Net Worth Summary Cards */}
            {netWorth && Object.keys(netWorth.formatted_net_worth_by_currency || {}).length > 0 && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {Object.keys(netWorth.formatted_net_worth_by_currency).map(currency => (
                        <div key={currency} className="bg-card border border-border p-5 rounded-xl">
                            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                                Net Worth ({currency})
                            </span>
                            <div className="text-xs text-muted-foreground mb-1">
                                What you own minus what you owe
                            </div>
                            <div className="text-2xl font-bold mt-1 text-foreground">
                                {netWorth.formatted_net_worth_by_currency[currency]}
                            </div>
                            <div className="text-xs text-muted-foreground mt-2 flex justify-between">
                                <span>Assets: {formatMoney({ amount_cents: netWorth.total_assets_cents_by_currency?.[currency] ?? 0, currency: currency as CurrencyCode })}</span>
                                <span>Debt: {formatMoney({ amount_cents: netWorth.total_liabilities_cents_by_currency?.[currency] ?? 0, currency: currency as CurrencyCode })}</span>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Error Banner */}
            {error && !isModalOpen && (
                <div className="p-4 bg-destructive/10 border border-destructive/20 text-destructive rounded-xl flex items-start gap-3 text-sm">
                    <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" />
                    <div>
                        <div className="font-semibold">Persistence Error</div>
                        <div>{error}</div>
                    </div>
                </div>
            )}

            {/* Accounts Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Assets Column */}
                <div className="space-y-4">
                    <div className="flex items-center justify-between pb-2 border-b border-border">
                        <h2 className="text-lg font-semibold flex items-center gap-2">
                            <Shield className="w-4 h-4 text-emerald-500" />
                            What you own
                        </h2>
                        <span className="text-xs text-muted-foreground font-mono">{assetAccounts.length} accounts</span>
                    </div>

                    {assetAccounts.length === 0 && !isLoading && (
                        <div className="p-8 text-center text-sm text-muted-foreground border border-dashed border-border rounded-xl">
                            No asset accounts yet. Click "Add Account" to establish an account and opening balance.
                        </div>
                    )}

                    {assetAccounts.map(acc => {
                        const owner = entities.find(e => e.id === acc.entity_id);
                        const isTarget = acc.id === targetAccountId;
                        return (
                            <div
                                id={`account-row-${acc.id}`}
                                key={acc.id}
                                className={`bg-card border p-4 rounded-xl flex items-center justify-between transition ${
                                    isTarget
                                        ? 'border-primary ring-2 ring-primary/40 bg-primary/5 shadow-md'
                                        : 'border-border hover:border-primary/50'
                                }`}
                            >
                                <div>
                                    <div className="flex items-center gap-2">
                                        <span className="font-medium text-foreground">{acc.name}</span>
                                        {owner && selectedEntityId === 'all' && (
                                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground font-semibold uppercase">
                                                {owner.name}
                                            </span>
                                        )}
                                    </div>
                                    <div className="text-xs text-muted-foreground capitalize mt-0.5">
                                        {acc.sub_type.replace('_', ' ')} {acc.institution ? `• ${acc.institution}` : ''}
                                    </div>
                                </div>
                                <div className="text-right flex flex-col items-end">
                                    <div className="font-semibold text-foreground font-mono">{acc.formatted_balance}</div>
                                    <div className="text-[10px] text-muted-foreground mb-1.5">
                                        As of {acc.as_of_date || acc.opening_date || getLocalIsoDate()}
                                    </div>
                                    <div className="flex items-center gap-2 mt-1">
                                        <button
                                            onClick={() => handleEditAccount(acc)}
                                            className="text-xs font-medium text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 transition-colors bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 px-2 py-1 rounded border border-slate-200 dark:border-slate-700"
                                        >
                                            Edit
                                        </button>
                                        <button
                                            onClick={() => setRulesAccountId({ id: acc.id, name: acc.name })}
                                            className="text-xs font-medium text-indigo-600 hover:text-indigo-700 transition-colors bg-indigo-50 hover:bg-indigo-100 px-2 py-1 rounded border border-indigo-100 dark:bg-indigo-900/30 dark:text-indigo-400 dark:hover:text-indigo-300 dark:border-indigo-800/50"
                                        >
                                            Rules
                                        </button>
                                        <button
                                            onClick={() => setCheckBalanceAccountId(acc.id)}
                                            className="text-xs font-medium text-primary hover:text-primary/80 transition-colors bg-primary/5 hover:bg-primary/10 px-2 py-1 rounded border border-primary/10"
                                        >
                                            Check balance
                                        </button>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>

                {/* Liabilities Column */}
                <div className="space-y-4">
                    <div className="flex items-center justify-between pb-2 border-b border-border">
                        <h2 className="text-lg font-semibold flex items-center gap-2">
                            <CreditCard className="w-4 h-4 text-rose-500" />
                            What you owe
                        </h2>
                        <span className="text-xs text-muted-foreground font-mono">{liabilityAccounts.length} accounts</span>
                    </div>

                    {liabilityAccounts.length === 0 && !isLoading && (
                        <div className="p-8 text-center text-sm text-muted-foreground border border-dashed border-border rounded-xl">
                            No liability accounts registered.
                        </div>
                    )}

                    {liabilityAccounts.map(acc => {
                        const owner = entities.find(e => e.id === acc.entity_id);
                        const isTarget = acc.id === targetAccountId;
                        return (
                            <div
                                id={`account-row-${acc.id}`}
                                key={acc.id}
                                className={`bg-card border p-4 rounded-xl flex items-center justify-between transition ${
                                    isTarget
                                        ? 'border-primary ring-2 ring-primary/40 bg-primary/5 shadow-md'
                                        : 'border-border hover:border-primary/50'
                                }`}
                            >
                                <div>
                                    <div className="flex items-center gap-2">
                                        <span className="font-medium text-foreground">{acc.name}</span>
                                        {owner && selectedEntityId === 'all' && (
                                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground font-semibold uppercase">
                                                {owner.name}
                                            </span>
                                        )}
                                    </div>
                                    <div className="text-xs text-muted-foreground capitalize mt-0.5">
                                        {acc.sub_type.replace('_', ' ')} {acc.institution ? `• ${acc.institution}` : ''}
                                    </div>
                                    {(acc.interest_rate != null || acc.minimum_payment_cents != null) && (
                                        <div className="text-[10px] text-muted-foreground mt-0.5" data-testid={`terms-${acc.id}`}>
                                            {acc.interest_rate != null ? `${acc.interest_rate}% p.a.` : ''}
                                            {acc.interest_rate != null && acc.minimum_payment_cents != null ? ' · ' : ''}
                                            {acc.minimum_payment_cents != null
                                                ? `min payment ${formatMoney({ amount_cents: acc.minimum_payment_cents, currency: acc.currency })}`
                                                : ''}
                                        </div>
                                    )}
                                </div>
                                <div className="text-right flex flex-col items-end">
                                    <div className="font-semibold text-rose-500 font-mono">{acc.formatted_balance}</div>
                                    <div className="text-[10px] text-muted-foreground mb-1.5">
                                        As of {acc.as_of_date || acc.opening_date || getLocalIsoDate()}
                                    </div>
                                    <div className="flex items-center gap-2 mt-1">
                                        <button
                                            onClick={() => handleEditAccount(acc)}
                                            className="text-xs font-medium text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 transition-colors bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 px-2 py-1 rounded border border-slate-200 dark:border-slate-700"
                                        >
                                            Edit
                                        </button>
                                        <button
                                            onClick={() => setRulesAccountId({ id: acc.id, name: acc.name })}
                                            className="text-xs font-medium text-indigo-600 hover:text-indigo-700 transition-colors bg-indigo-50 hover:bg-indigo-100 px-2 py-1 rounded border border-indigo-100 dark:bg-indigo-900/30 dark:text-indigo-400 dark:hover:text-indigo-300 dark:border-indigo-800/50"
                                        >
                                            Rules
                                        </button>
                                        <button
                                            onClick={() => setCheckBalanceAccountId(acc.id)}
                                            className="text-xs font-medium text-primary hover:text-primary/80 transition-colors bg-primary/5 hover:bg-primary/10 px-2 py-1 rounded border border-primary/10"
                                        >
                                            Check balance
                                        </button>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Create Account Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-card border border-border w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
                        {/* Modal Header */}
                        <div className="p-6 border-b border-border flex justify-between items-center bg-card">
                            <div>
                                <h3 className="text-lg font-bold text-foreground">
                                    {editingAccountId ? 'Edit account' : 'Add an account'}
                                </h3>
                                <p className="text-xs text-muted-foreground mt-0.5">
                                    Add a bank account, credit card, loan or investment.
                                </p>
                            </div>
                            <button
                                aria-label="Close dialog"
                                onClick={() => !isSubmitting && setIsModalOpen(false)}
                                className="text-muted-foreground hover:text-foreground transition p-1"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        {/* Modal Body & Form */}
                        <form onSubmit={handleCreateAccount} className="p-6 space-y-4 overflow-y-auto">
                            {error && (
                                <div className="p-3 bg-destructive/10 border border-destructive/20 text-destructive rounded-lg flex items-start gap-2 text-xs">
                                    <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                                    <span>{error}</span>
                                </div>
                            )}

                            {/* Account Owner Selection (Clarification 2) */}
                            <div>
                                <label className="block text-xs font-semibold text-foreground mb-1">
                                    Who owns this account? *
                                </label>
                                {((selectedEntityId && selectedEntityId !== 'all') || (entities.length === 1 && formEntityId)) ? (
                                    <div className="px-3 py-2 rounded-lg border border-border bg-muted/40 text-sm flex items-center justify-between">
                                        <span className="font-medium text-foreground">
                                            {entities.find(e => e.id === (selectedEntityId && selectedEntityId !== 'all' ? selectedEntityId : formEntityId))?.name || 'Selected Entity'}
                                        </span>
                                        <span className="text-xs text-muted-foreground uppercase font-semibold">
                                            {getOwnerTypeLabel(entities.find(e => e.id === (selectedEntityId && selectedEntityId !== 'all' ? selectedEntityId : formEntityId))?.type || 'person')} • {entities.find(e => e.id === (selectedEntityId && selectedEntityId !== 'all' ? selectedEntityId : formEntityId))?.currency}
                                        </span>
                                    </div>
                                ) : (
                                    <select
                                        required
                                        value={formEntityId}
                                        onChange={e => {
                                            setFormEntityId(e.target.value);
                                            const ent = entities.find(item => item.id === e.target.value);
                                            if (ent?.currency) setFormCurrency(ent.currency as CurrencyCode);
                                        }}
                                        className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-50"
                                        disabled={editingAccountId !== null}
                                    >
                                        <option value="">-- Select Owner (Required) --</option>
                                        {entities.map(ent => (
                                            <option key={ent.id} value={ent.id}>
                                                {ent.name} ({getOwnerTypeLabel(ent.type)} • {ent.currency})
                                            </option>
                                        ))}
                                    </select>
                                )}
                            </div>

                            {/* Account Name */}
                            <div>
                                <label className="block text-xs font-semibold text-foreground mb-1">
                                    Account Name *
                                </label>
                                <input
                                    type="text"
                                    required
                                    value={formName}
                                    onChange={e => setFormName(e.target.value)}
                                    placeholder="e.g. Chase Total Checking"
                                    className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                                />
                            </div>

                            {/* Account Type Selector (Asset vs Liability) */}
                            <div className="grid grid-cols-2 gap-3">
                                <button
                                    type="button"
                                    onClick={() => {
                                        if (editingAccountId) return;
                                        setFormType('asset');
                                        setFormSubType('checking');
                                    }}
                                    disabled={editingAccountId !== null}
                                    className={`p-3 rounded-xl border text-left transition ${
                                        formType === 'asset'
                                            ? 'border-primary bg-primary/10 text-primary font-medium'
                                            : 'border-border hover:bg-muted text-muted-foreground'
                                    } ${editingAccountId ? 'opacity-50 cursor-not-allowed' : ''}`}
                                >
                                    <div className="font-semibold text-sm">Asset</div>
                                    <div className="text-[11px] opacity-80">What you own (Cash, Property, Stock)</div>
                                </button>
                                <button
                                    type="button"
                                    onClick={() => {
                                        if (editingAccountId) return;
                                        setFormType('liability');
                                        setFormSubType('credit_card');
                                    }}
                                    disabled={editingAccountId !== null}
                                    className={`p-3 rounded-xl border text-left transition ${
                                        formType === 'liability'
                                            ? 'border-primary bg-primary/10 text-primary font-medium'
                                            : 'border-border hover:bg-muted text-muted-foreground'
                                    } ${editingAccountId ? 'opacity-50 cursor-not-allowed' : ''}`}
                                >
                                    <div className="font-semibold text-sm">Liability</div>
                                    <div className="text-[11px] opacity-80">What you owe (Credit Card, Loan)</div>
                                </button>
                            </div>

                            {/* Sub-type and Currency */}
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-xs font-semibold text-foreground mb-1">Category</label>
                                    <select
                                        value={formSubType}
                                        onChange={e => setFormSubType(e.target.value as AccountSubType)}
                                        className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm"
                                    >
                                        {formType === 'asset' ? (
                                            <>
                                                <option value="checking">Checking / Current</option>
                                                <option value="savings">Savings / High-Yield</option>
                                                <option value="brokerage">Investment / Brokerage</option>
                                                <option value="property">Real Estate Property</option>
                                                <option value="vehicle">Vehicle</option>
                                                <option value="other">Other Asset</option>
                                            </>
                                        ) : (
                                            <>
                                                <option value="credit_card">Credit Card</option>
                                                <option value="mortgage">Home Mortgage</option>
                                                <option value="auto_loan">Auto Loan</option>
                                                <option value="personal_loan">Personal / Student Loan</option>
                                                <option value="other">Other Liability</option>
                                            </>
                                        )}
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-xs font-semibold text-foreground mb-1">Currency</label>
                                    <select
                                        value={formCurrency}
                                        disabled={editingAccountId !== null}
                                        onChange={e => setFormCurrency(e.target.value as CurrencyCode)}
                                        className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm disabled:opacity-50"
                                    >
                                        <option value="USD">USD ($)</option>
                                        <option value="AUD">AUD ($)</option>
                                        <option value="EUR">EUR (€)</option>
                                        <option value="GBP">GBP (£)</option>
                                        <option value="CAD">CAD ($)</option>
                                        <option value="NZD">NZD ($)</option>
                                        <option value="JPY">JPY (¥)</option>
                                    </select>
                                </div>
                            </div>

                            {/* Debt Terms (liabilities only) — consumed by the cash flow forecast */}
                            {formType === 'liability' && (
                                <div className="p-4 bg-muted/40 border border-border rounded-xl space-y-3">
                                    <div className="text-xs font-semibold text-foreground flex items-center justify-between">
                                        <span>Debt Terms</span>
                                        <span className="text-[10px] text-muted-foreground">Optional</span>
                                    </div>
                                    <div className="grid grid-cols-2 gap-3">
                                        <div>
                                            <label className="block text-[11px] text-muted-foreground mb-1">Interest Rate (% p.a.)</label>
                                            <input
                                                type="text"
                                                inputMode="decimal"
                                                value={formInterestRate}
                                                onChange={e => setFormInterestRate(e.target.value)}
                                                placeholder="e.g. 18.99"
                                                className="w-full px-3 py-1.5 rounded-lg border border-border bg-background text-sm font-mono"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-[11px] text-muted-foreground mb-1">Minimum Payment</label>
                                            <input
                                                type="text"
                                                inputMode="decimal"
                                                value={formMinimumPayment}
                                                onChange={e => setFormMinimumPayment(e.target.value)}
                                                placeholder="e.g. 35.00"
                                                className="w-full px-3 py-1.5 rounded-lg border border-border bg-background text-sm font-mono"
                                            />
                                        </div>
                                    </div>
                                    <p className="text-[10px] text-muted-foreground">
                                        The cash flow forecast projects this minimum payment every month.
                                        Without one, it estimates 1% of balance + monthly interest (min 25) and marks it "est.".
                                    </p>
                                </div>
                            )}

                            {/* Opening Balance (Optional) */}
                            {(!editingAccountId || (editingAccountId && accounts.find(a => a.id === editingAccountId)?.opening_balance_cents === null)) && (
                                <div className="p-4 bg-muted/40 border border-border rounded-xl space-y-3">
                                <div className="text-xs font-semibold text-foreground flex items-center justify-between">
                                    <span>Dated Opening Balance</span>
                                    <span className="text-[10px] text-muted-foreground">Optional</span>
                                </div>
                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label className="block text-[11px] text-muted-foreground mb-1">Amount</label>
                                        <input
                                            type="text"
                                            value={formOpeningAmount}
                                            onChange={e => setFormOpeningAmount(e.target.value)}
                                            placeholder="e.g. 1000.00"
                                            className="w-full px-3 py-1.5 rounded-lg border border-border bg-background text-sm font-mono"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-[11px] text-muted-foreground mb-1">As-of Date</label>
                                        <input
                                            type="date"
                                            value={formOpeningDate}
                                            onChange={e => setFormOpeningDate(e.target.value)}
                                            className="w-full px-3 py-1.5 rounded-lg border border-border bg-background text-sm font-mono"
                                        />
                                    </div>
                                </div>
                                <p className="text-[10px] text-muted-foreground">
                                    Sets the balance of this account as of this date.
                                </p>
                                </div>
                            )}

                            {/* Modal Actions */}
                            <div className="flex justify-end gap-2 pt-2">
                                <button
                                    type="button"
                                    disabled={isSubmitting}
                                    onClick={() => setIsModalOpen(false)}
                                    className="px-4 py-2 rounded-lg border border-border hover:bg-muted text-sm"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={isSubmitting}
                                    className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition flex items-center gap-2"
                                >
                                    {isSubmitting && <RefreshCw className="w-4 h-4 animate-spin" />}
                                    {isSubmitting ? 'Saving...' : (editingAccountId ? 'Save changes' : 'Save account')}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            <BalanceCheckModal
                isOpen={!!checkBalanceAccountId}
                onClose={() => setCheckBalanceAccountId(null)}
                accountId={checkBalanceAccountId!}
                onActionImport={() => {
                    // Navigate to inbox with account preselected
                    window.location.href = `/accounting?view=inbox&accountId=${checkBalanceAccountId}`;
                }}
                onActionRecordBalance={() => {
                    // Why this exists:
                    // Fulfills Closing Batch Requirement 2:
                    // "Record current balance" opens the manual observation flow (UpdateBalancesModal with initialMode="manual"),
                    // preserving the selected account context and refreshing the balance check upon saving.
                    // Tricky logic:
                    // Stashes checkBalanceAccountId into recordBalanceAccountId, closes BalanceCheckModal,
                    // and opens UpdateBalancesModal in manual mode targeting this exact account.
                    // When the user finishes entering the balance observation and saving, the modal reopens BalanceCheckModal
                    // to immediately show the rechecked balance.
                    // TODO: In Milestone 2, support inline quick-edit without opening a full modal.
                    const targetId = checkBalanceAccountId;
                    setRecordBalanceAccountId(targetId);
                    setCheckBalanceAccountId(null);
                }}
                onActionSetup={() => {
                    // Why this exists:
                    // Fulfills Closing Batch Requirement 2:
                    // "Set starting balance" opens the opening-balance setup flow (Edit Account modal),
                    // pre-populating account details and focusing on the dated opening balance fields.
                    // Tricky logic:
                    // Looks up the target account from the accounts list by checkBalanceAccountId,
                    // closes BalanceCheckModal, and invokes handleEditAccount(acc) with account context.
                    // TODO: In Milestone 2, auto-focus the opening balance input when opened from here.
                    const targetId = checkBalanceAccountId;
                    const acc = accounts.find(a => a.id === targetId);
                    setCheckBalanceAccountId(null);
                    if (acc) {
                        handleEditAccount(acc);
                    }
                }}
                onActionReview={(startDate, endDate) => {
                    // Navigate to events view for this account
                    let url = `/accounting?view=events&account_id=${checkBalanceAccountId}`;
                    if (startDate) url += `&start_date=${startDate}`;
                    if (endDate) url += `&end_date=${endDate}`;
                    window.location.href = url;
                }}
            />

            {recordBalanceAccountId && (
                <UpdateBalancesModal
                    isOpen={!!recordBalanceAccountId}
                    initialMode="manual"
                    initialAccountId={recordBalanceAccountId}
                    onClose={async (summary) => {
                        const targetId = recordBalanceAccountId;
                        setRecordBalanceAccountId(null);
                        if (summary && summary.balancesUpdated > 0) {
                            await fetchData(selectedEntityId);
                            // Reopen balance check modal so user immediately sees rechecked balance!
                            setCheckBalanceAccountId(targetId);
                        }
                    }}
                />
            )}

            <CategorizationRulesModal
                isOpen={rulesAccountId !== null}
                onClose={() => setRulesAccountId(null)}
                accountId={rulesAccountId?.id || ''}
                accountName={rulesAccountId?.name || ''}
            />
        </div>
    );
};
