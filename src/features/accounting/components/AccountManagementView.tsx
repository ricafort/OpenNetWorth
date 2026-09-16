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
import { Account, AccountSubType, AccountType, CurrencyCode, Entity, formatMoney, parseToCents } from '@/lib/domain/accounting/types';

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
        } else {
            setFormEntityId('');
        }
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

            const payload = {
                action: 'create_account',
                account: {
                    entity_id: concreteEntityId,
                    name: formName,
                    type: formType,
                    sub_type: formSubType,
                    currency: formCurrency,
                    institution: formInstitution || null,
                    opening_date: openingCents ? formOpeningDate : null,
                    opening_balance_cents: openingCents
                }
            };

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
            setIsModalOpen(false);

            // Refresh authoritative list
            await fetchData(selectedEntityId);
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
                        return (
                            <div key={acc.id} className="bg-card border border-border p-4 rounded-xl flex items-center justify-between hover:border-primary/50 transition">
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
                                <div className="text-right">
                                    <div className="font-semibold text-foreground font-mono">{acc.formatted_balance}</div>
                                    <div className="text-[10px] text-muted-foreground">
                                        As of {acc.as_of_date || acc.opening_date || getLocalIsoDate()}
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
                        return (
                            <div key={acc.id} className="bg-card border border-border p-4 rounded-xl flex items-center justify-between hover:border-primary/50 transition">
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
                                <div className="text-right">
                                    <div className="font-semibold text-rose-500 font-mono">{acc.formatted_balance}</div>
                                    <div className="text-[10px] text-muted-foreground">
                                        As of {acc.as_of_date || acc.opening_date || getLocalIsoDate()}
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
                                <h3 className="text-lg font-bold text-foreground">Add an account</h3>
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
                                {selectedEntityId !== 'all' ? (
                                    <div className="px-3 py-2 rounded-lg border border-border bg-muted/40 text-sm flex items-center justify-between">
                                        <span className="font-medium text-foreground">
                                            {entities.find(e => e.id === selectedEntityId)?.name || 'Selected Entity'}
                                        </span>
                                        <span className="text-xs text-muted-foreground uppercase font-semibold">
                                            {getOwnerTypeLabel(entities.find(e => e.id === selectedEntityId)?.type || 'person')} • {entities.find(e => e.id === selectedEntityId)?.currency}
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
                                        className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary"
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
                                        setFormType('asset');
                                        setFormSubType('checking');
                                    }}
                                    className={`p-3 rounded-xl border text-left transition ${
                                        formType === 'asset'
                                            ? 'border-primary bg-primary/10 text-primary font-medium'
                                            : 'border-border hover:bg-muted text-muted-foreground'
                                    }`}
                                >
                                    <div className="font-semibold text-sm">Asset</div>
                                    <div className="text-[11px] opacity-80">What you own (Cash, Property, Stock)</div>
                                </button>
                                <button
                                    type="button"
                                    onClick={() => {
                                        setFormType('liability');
                                        setFormSubType('credit_card');
                                    }}
                                    className={`p-3 rounded-xl border text-left transition ${
                                        formType === 'liability'
                                            ? 'border-primary bg-primary/10 text-primary font-medium'
                                            : 'border-border hover:bg-muted text-muted-foreground'
                                    }`}
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
                                        onChange={e => setFormCurrency(e.target.value as CurrencyCode)}
                                        className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm"
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

                            {/* Opening Balance (Optional) */}
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
                                    {isSubmitting ? 'Saving...' : 'Save account'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};
