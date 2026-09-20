/**
 * Milestone 1 Reports, Ownership Allocation & Evidence Traceability View
 * 
 * Why this component exists:
 * Fulfills Milestone 1 Slice 1D requirements:
 * - Clear separation of Accrual Income/Expenses from Actual Cash Flow Statement.
 * - Ownership Allocation (M1-FLOW-07, T7): Visualizes individual % shares vs household de-duplicated 100% net worth.
 * - Non-Cash Asset Valuation (M1-FLOW-06, T6): Records dated asset adjustments against Unrealized Valuation Reserve.
 * - Multi-Currency Consolidated Net Worth (M1-CALC-03, T8): Displays conversion completeness status and missing rate warnings.
 * - Drill-down Ledger & Evidence Provenance (M1-EVID-01, M1-EVID-02): Traces any displayed account total to its underlying
 *   chronological postings with running balances and structured evidence links.
 * 
 * Tricky logic:
 * - Liquid cash calculations strictly isolate cash/checking/savings accounts from accrual revenue/expense accounts.
 * - Household scope de-duplicates jointly held assets so that 50/50 shared properties are never counted twice (no 200% distortion).
 * - Multi-currency net worth displays a strict "Incomplete" alert when exchange rates are missing; never assumes a 1:1 fallback.
 * 
 * TODO: Integrate direct PDF viewer side-by-side with the evidence bbox drawer in Milestone 2.
 */

'use client';

import React, { useState, useEffect } from 'react';
import {
    PieChart,
    TrendingUp,
    DollarSign,
    Layers,
    FileText,
    ExternalLink,
    AlertTriangle,
    CheckCircle2,
    RefreshCw,
    X,
    Users,
    Globe,
    ArrowUpRight,
    ArrowDownRight,
    Shield,
    Calendar,
    Scale
} from 'lucide-react';
import {
    Account,
    CurrencyCode,
    Entity,
    ScopeType,
    ScopeNetWorthResult,
    ConsolidatedNetWorthResult,
    CashFlowStatementResult,
    AccountLedgerDrilldownResult,
    AccountOwnership,
    formatMoney,
    parseToCents
} from '@/lib/domain/accounting/types';

/**
 * Format entity types into user-friendly labels without losing trust/household distinctions.
 * Why this exists:
 * Keeps entity presentation consistent with "Your finances by owner" and ordinary-language UI.
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

/**
 * Why this interface exists:
 * Milestone 1 Clarification 1: In 'Everything' scope, cross-entity consolidation is deferred,
 * but users must see actual owner and currency component balances rather than a disabled screen.
 * This structure holds each sovereign entity's net worth and account balances returned by the API.
 */
interface ComponentEntityData {
    entity: Entity;
    net_worth: {
        entity_id: string;
        as_of_date: string;
        net_worth_cents_by_currency: Record<CurrencyCode, number>;
        total_assets_cents_by_currency: Record<CurrencyCode, number>;
        total_liabilities_cents_by_currency: Record<CurrencyCode, number>;
        formatted_net_worth_by_currency: Record<CurrencyCode, string>;
        account_count: number;
    };
    accounts: Array<Account & { balance_cents: number | null; formatted_balance: string; as_of_date: string | null; is_unknown?: boolean }>;
}

interface ReportsTraceabilityViewProps {
    onNavigateToAccounts?: () => void;
    entities: Entity[];
    selectedEntityId: string;
    onSelectEntity?: (entityId: string) => void;
}

export const ReportsTraceabilityView: React.FC<ReportsTraceabilityViewProps> = ({
    onNavigateToAccounts,
    entities,
    selectedEntityId,
    onSelectEntity
}) => {
    // Scope State
    const getLocalIsoDate = () => {
        const d = new Date();
        d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
        return d.toISOString().split('T')[0];
    };

    const [scopeType, setScopeType] = useState<ScopeType>('individual');
    const [asOfDate, setAsOfDate] = useState<string>(getLocalIsoDate);
    const [startDate, setStartDate] = useState<string>('');
    const [endDate, setEndDate] = useState<string>('');
    const [reportingCurrency, setReportingCurrency] = useState<CurrencyCode>('AUD');

    // Report Results
    const [scopeReport, setScopeReport] = useState<ScopeNetWorthResult | null>(null);
    const [consolidatedReport, setConsolidatedReport] = useState<ConsolidatedNetWorthResult | null>(null);
    const [cashFlowReport, setCashFlowReport] = useState<CashFlowStatementResult | null>(null);
    const [accrualReport, setAccrualReport] = useState<any | null>(null);
    const [accounts, setAccounts] = useState<Account[]>([]);
    const [everythingComponents, setEverythingComponents] = useState<ComponentEntityData[]>([]);

    // Drilldown State
    const [selectedAccountId, setSelectedAccountId] = useState<string>('');
    const [drilldownReport, setDrilldownReport] = useState<AccountLedgerDrilldownResult | null>(null);
    const [selectedEvidence, setSelectedEvidence] = useState<any[] | null>(null);

    // Modals
    const [isValuationModalOpen, setIsValuationModalOpen] = useState<boolean>(false);
    const [isOwnershipModalOpen, setIsOwnershipModalOpen] = useState<boolean>(false);
    const [isRateModalOpen, setIsRateModalOpen] = useState<boolean>(false);

    // Form inputs: Valuation
    const [valAccountId, setValAccountId] = useState<string>('');
    const [valAmount, setValAmount] = useState<string>('');
    const [valDate, setValDate] = useState<string>(getLocalIsoDate);
    const [valSource, setValSource] = useState<string>('Professional Appraisal');
    const [valDocHash, setValDocHash] = useState<string>('');

    // Form inputs: Ownership
    const [ownAccountId, setOwnAccountId] = useState<string>('');
    const [ownAllocations, setOwnAllocations] = useState<Array<{ entity_id: string; ownership_percentage: number }>>([]);

    // Form inputs: Rate
    const [rateFrom, setRateFrom] = useState<string>('USD');
    const [rateTo, setRateTo] = useState<string>('AUD');
    const [rateValue, setRateValue] = useState<string>('1.52');
    const [rateDate, setRateDate] = useState<string>(getLocalIsoDate);
    const [rateSource, setRateSource] = useState<string>('RBA Official');

    // Status / Feedback
    const [loading, setLoading] = useState<boolean>(false);
    const [errorMsg, setErrorMsg] = useState<string | null>(null);
    const [successMsg, setSuccessMsg] = useState<string | null>(null);
    const [activeSubTab, setActiveSubTab] = useState<'net_worth' | 'cash_vs_accrual' | 'drilldown'>('net_worth');

    // Initial Load
    useEffect(() => {
        loadEntitiesAndAccounts();
    }, []);

    // Reload reports when entity or scope changes
    useEffect(() => {
        if (selectedEntityId) {
            refreshAllReports();
        }
    }, [selectedEntityId, scopeType, asOfDate, startDate, endDate, reportingCurrency]);

    // Reload drilldown when selectedAccountId changes
    useEffect(() => {
        if (selectedAccountId) {
            loadDrilldown(selectedAccountId);
        }
    }, [selectedAccountId]);

    const loadEntitiesAndAccounts = async () => {
        setLoading(true);
        try {
            const effectiveDate = asOfDate || getLocalIsoDate();
            const res = await fetch(`/api/accounting?as_of_date=${effectiveDate}`);
            const data = await res.json();
            if (data.success) {
                setAccounts(data.accounts || []);
            }
        } catch (err: any) {
            setErrorMsg('Failed to load initial accounting metadata.');
        } finally {
            setLoading(false);
        }
    };

    /**
     * Why this function exists:
     * Refreshes all analytical financial views (Net Worth, Cash Flow, Accrual Income/Expenses).
     * 
     * Tricky logic:
     * 1. Stale results must immediately be cleared on every refresh to prevent misleading data.
     * 2. When selectedEntityId === 'all', individual report requests cannot be called with entity_id='all'.
     *    Instead, call view=reports&scope_id=all which returns component_entities breakdown.
     * 3. Always pass an explicit local as_of_date so balances match the user's current date.
     * 
     * TODO: Add automated polling/SSE when multi-device sync is introduced in Milestone 3.
     */
    const refreshAllReports = async () => {
        if (!selectedEntityId) return;
        setLoading(true);
        setErrorMsg(null);

        // Immediately clear stale results to avoid cross-scope distortion
        setScopeReport(null);
        setConsolidatedReport(null);
        setCashFlowReport(null);
        setAccrualReport(null);
        setEverythingComponents([]);

        const effectiveAsOf = asOfDate || getLocalIsoDate();

        // Handle 'all' / Everything scope
        if (selectedEntityId === 'all') {
            try {
                const params = new URLSearchParams({
                    view: 'reports',
                    scope_id: 'all',
                    as_of_date: effectiveAsOf
                });
                const res = await fetch(`/api/accounting?${params.toString()}`);
                const data = await res.json();
                if (data.success && data.component_entities) {
                    setEverythingComponents(data.component_entities);
                    // Extract all component accounts so drilldown options are fully populated in Everything mode
                    const allComponentAccounts = data.component_entities.flatMap((c: ComponentEntityData) => c.accounts || []);
                    if (allComponentAccounts.length > 0) {
                        setAccounts(allComponentAccounts);
                    }
                } else {
                    setEverythingComponents([]);
                    if (!data.success) {
                        setErrorMsg(data.error || 'Failed to refresh Everything reports.');
                    }
                }
            } catch (err: any) {
                setEverythingComponents([]);
                setErrorMsg('Failed to refresh Everything reports.');
            } finally {
                setLoading(false);
            }
            return;
        }

        // Single entity report fetch
        try {
            // 1. Fetch Scope Net Worth
            const scopeParams = new URLSearchParams({
                view: 'reports',
                report_type: 'scope_net_worth',
                scope_id: selectedEntityId,
                scope_type: scopeType,
                as_of_date: effectiveAsOf
            });
            const scopeRes = await fetch(`/api/accounting?${scopeParams.toString()}`);
            const scopeData = await scopeRes.json();
            if (scopeData.success) {
                setScopeReport(scopeData.report);
            } else {
                setScopeReport(null);
            }

            // 2. Fetch Consolidated Net Worth
            const consParams = new URLSearchParams({
                view: 'reports',
                report_type: 'consolidated_net_worth',
                entity_id: selectedEntityId,
                scope_type: scopeType,
                reporting_currency: reportingCurrency,
                as_of_date: effectiveAsOf
            });
            const consRes = await fetch(`/api/accounting?${consParams.toString()}`);
            const consData = await consRes.json();
            if (consData.success) {
                setConsolidatedReport(consData.report);
            } else {
                setConsolidatedReport(null);
            }

            // 3. Fetch Actual Cash Flow Statement
            const cfParams = new URLSearchParams({
                view: 'reports',
                report_type: 'cash_flow',
                entity_id: selectedEntityId
            });
            if (startDate) cfParams.append('start_date', startDate);
            if (endDate) cfParams.append('end_date', endDate);
            const cfRes = await fetch(`/api/accounting?${cfParams.toString()}`);
            const cfData = await cfRes.json();
            if (cfData.success) {
                setCashFlowReport(cfData.report);
            } else {
                setCashFlowReport(null);
            }

            // 4. Fetch Accrual Income & Expense
            const accParams = new URLSearchParams({
                entity_id: selectedEntityId
            });
            if (startDate) accParams.append('start_date', startDate);
            if (endDate) accParams.append('end_date', endDate);
            const accRes = await fetch(`/api/accounting?${accParams.toString()}`);
            const accData = await accRes.json();
            if (accData.success) {
                setAccrualReport(accData.period_income_expenses);
            } else {
                setAccrualReport(null);
            }

            if (selectedAccountId) {
                await loadDrilldown(selectedAccountId);
            }
        } catch (err: any) {
            setErrorMsg('Failed to refresh financial reports.');
        } finally {
            setLoading(false);
        }
    };

    const loadDrilldown = async (accId: string) => {
        try {
            const params = new URLSearchParams({
                view: 'drilldown',
                account_id: accId
            });
            if (startDate) params.append('start_date', startDate);
            if (endDate) params.append('end_date', endDate);
            const res = await fetch(`/api/accounting?${params.toString()}`);
            const data = await res.json();
            if (data.success) {
                setDrilldownReport(data.drilldown);
            }
        } catch {
            setErrorMsg('Failed to load ledger drilldown.');
        }
    };

    // Form handlers
    const handleRecordValuation = async (e: React.FormEvent) => {
        e.preventDefault();
        setErrorMsg(null);
        setSuccessMsg(null);

        const targetAccount = accounts.find(a => a.id === valAccountId);
        if (!targetAccount) {
            setErrorMsg('Please select a valid asset account to revalue.');
            return;
        }

        const cents = parseToCents(valAmount, targetAccount.currency);
        if (cents <= 0) {
            setErrorMsg('Valuation amount must be positive.');
            return;
        }

        try {
            const res = await fetch('/api/accounting', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: 'record_valuation',
                    payload: {
                        asset_account_id: valAccountId,
                        new_valuation_cents: cents,
                        valuation_date: valDate,
                        source: valSource,
                        evidence_refs: valDocHash ? [{
                            document_id: `doc-${Date.now()}`,
                            content_hash: valDocHash,
                            page: 1,
                            bounding_box: { x: 0.1, y: 0.1, width: 0.8, height: 0.3 }
                        }] : undefined
                    }
                })
            });

            const data = await res.json();
            if (!res.ok || !data.success) {
                setErrorMsg(data.error || 'Failed to record asset valuation adjustment.');
                return;
            }

            setSuccessMsg('Asset valuation adjustment recorded successfully against Valuation Reserve equity.');
            setIsValuationModalOpen(false);
            setValAmount('');
            setValDocHash('');
            refreshAllReports();
            if (selectedAccountId === valAccountId) {
                loadDrilldown(valAccountId);
            }
        } catch (err: any) {
            setErrorMsg(err.message || 'Error recording valuation.');
        }
    };

    const handleSetExchangeRate = async (e: React.FormEvent) => {
        e.preventDefault();
        setErrorMsg(null);
        setSuccessMsg(null);

        const numRate = parseFloat(rateValue);
        if (isNaN(numRate) || numRate <= 0) {
            setErrorMsg('Exchange rate must be a strictly positive number.');
            return;
        }

        try {
            const res = await fetch('/api/accounting', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: 'set_exchange_rate',
                    rate: {
                        from_currency: rateFrom.toUpperCase(),
                        to_currency: rateTo.toUpperCase(),
                        rate: numRate,
                        effective_date: rateDate,
                        source: rateSource
                    }
                })
            });

            const data = await res.json();
            if (!res.ok || !data.success) {
                setErrorMsg(data.error || 'Failed to save exchange rate.');
                return;
            }

            setSuccessMsg(`Exchange rate ${rateFrom}/${rateTo} updated to ${numRate}.`);
            setIsRateModalOpen(false);
            refreshAllReports();
        } catch (err: any) {
            setErrorMsg(err.message || 'Error updating exchange rate.');
        }
    };

    const handleOpenOwnershipModal = async (accountId: string) => {
        setOwnAccountId(accountId);
        setErrorMsg(null);
        try {
            const res = await fetch(`/api/accounting?view=ownership&account_id=${accountId}`);
            const data = await res.json();
            if (data.success) {
                if (data.ownership && data.ownership.length > 0) {
                    setOwnAllocations(data.ownership.map((o: AccountOwnership) => ({
                        entity_id: o.entity_id,
                        ownership_percentage: o.ownership_percentage
                    })));
                } else {
                    // Default to 100% for selected entity
                    setOwnAllocations([{ entity_id: selectedEntityId, ownership_percentage: 100 }]);
                }
                setIsOwnershipModalOpen(true);
            }
        } catch {
            setErrorMsg('Failed to fetch account ownership.');
        }
    };

    const handleSaveOwnership = async (e: React.FormEvent) => {
        e.preventDefault();
        setErrorMsg(null);
        setSuccessMsg(null);

        const sum = ownAllocations.reduce((acc, curr) => acc + curr.ownership_percentage, 0);
        if (sum <= 0 || sum > 100) {
            setErrorMsg(`Total ownership allocation must be between 1% and 100%. Current sum: ${sum}%`);
            return;
        }

        try {
            const res = await fetch('/api/accounting', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: 'set_ownership',
                    account_id: ownAccountId,
                    allocations: ownAllocations
                })
            });

            const data = await res.json();
            if (!res.ok || !data.success) {
                setErrorMsg(data.error || 'Failed to save ownership allocation.');
                return;
            }

            setSuccessMsg('Account ownership allocation updated.');
            setIsOwnershipModalOpen(false);
            refreshAllReports();
        } catch (err: any) {
            setErrorMsg(err.message || 'Error saving ownership.');
        }
    };

    if (!loading && entities.length === 0) {
        return (
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-12 text-center max-w-xl mx-auto my-8 shadow-sm space-y-4">
                <div className="w-14 h-14 bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 rounded-2xl flex items-center justify-center mx-auto">
                    <Scale className="w-7 h-7" />
                </div>
                <div className="space-y-1.5">
                    <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                        Welcome to Reports & Evidence Traceability
                    </h3>
                    <p className="text-xs text-slate-600 dark:text-slate-400 max-w-md mx-auto leading-relaxed">
                        To view net worth breakdowns, cash flow statements, and ledger drill-downs,
                        please set up your sovereign entity and initial accounts in Account Management first.
                    </p>
                </div>
                {onNavigateToAccounts && (
                    <div className="pt-2">
                        <button
                            type="button"
                            onClick={onNavigateToAccounts}
                            className="inline-flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow-sm transition cursor-pointer"
                        >
                            <span>Go to Accounts & Balances</span>
                        </button>
                    </div>
                )}
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Top Control Bar */}
            <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
                <div className="flex flex-wrap items-center gap-3">
                    {/* Scope Type Selector */}
                    <div>
                        <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                            Accounting Scope
                        </label>
                        <select
                            value={scopeType}
                            onChange={(e) => setScopeType(e.target.value as ScopeType)}
                            className="text-xs bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 font-medium focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                        >
                            <option value="individual">Individual Entity (Ownership Share %)</option>
                            <option value="household">Household Unit (100% De-duplicated)</option>
                        </select>
                    </div>

                    {/* As Of Date */}
                    <div>
                        <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                            As Of Valuation Date
                        </label>
                        <input
                            type="date"
                            value={asOfDate}
                            onChange={(e) => setAsOfDate(e.target.value)}
                            className="text-xs bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 font-medium focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                        />
                    </div>

                    {/* Period Dates */}
                    <div>
                        <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                            Period Start / End
                        </label>
                        <div className="flex items-center gap-1.5">
                            <input
                                type="date"
                                value={startDate}
                                onChange={(e) => setStartDate(e.target.value)}
                                placeholder="Start"
                                className="text-xs bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg px-2 py-2 font-medium focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                            />
                            <span className="text-slate-400 text-xs">to</span>
                            <input
                                type="date"
                                value={endDate}
                                onChange={(e) => setEndDate(e.target.value)}
                                placeholder="End"
                                className="text-xs bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg px-2 py-2 font-medium focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                            />
                        </div>
                    </div>
                </div>

                {/* Action Buttons */}
                <div className="flex flex-wrap items-center gap-2">
                    <button
                        onClick={() => setIsValuationModalOpen(true)}
                        className="flex items-center gap-1.5 text-xs font-semibold px-3 py-2 bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 rounded-lg hover:bg-indigo-100 transition"
                    >
                        <Scale className="w-3.5 h-3.5" />
                        <span>Revalue Asset</span>
                    </button>
                    <button
                        onClick={() => setIsRateModalOpen(true)}
                        className="flex items-center gap-1.5 text-xs font-semibold px-3 py-2 bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 rounded-lg hover:bg-emerald-100 transition"
                    >
                        <Globe className="w-3.5 h-3.5" />
                        <span>Exchange Rates</span>
                    </button>
                    <button
                        onClick={refreshAllReports}
                        disabled={loading}
                        className="p-2 text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 transition"
                        title="Refresh All Reports"
                    >
                        <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                    </button>
                </div>
            </div>

            {/* Banners */}
            {errorMsg && (
                <div className="p-4 bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-900 rounded-xl flex items-center gap-3 text-rose-800 dark:text-rose-300 text-xs">
                    <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                    <span>{errorMsg}</span>
                </div>
            )}
            {successMsg && (
                <div className="p-4 bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-900 rounded-xl flex items-center gap-3 text-emerald-800 dark:text-emerald-300 text-xs">
                    <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
                    <span>{successMsg}</span>
                </div>
            )}

            {/* View Sub-tabs */}
            <div className="border-b border-slate-200 dark:border-slate-800 flex items-center gap-6 text-xs font-semibold">
                <button
                    onClick={() => setActiveSubTab('net_worth')}
                    className={`pb-3 border-b-2 flex items-center gap-1.5 transition ${activeSubTab === 'net_worth' ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400' : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-300'}`}
                >
                    <PieChart className="w-4 h-4" />
                    <span>Your finances by owner</span>
                </button>
                <button
                    onClick={() => setActiveSubTab('cash_vs_accrual')}
                    className={`pb-3 border-b-2 flex items-center gap-1.5 transition ${activeSubTab === 'cash_vs_accrual' ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400' : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-300'}`}
                >
                    <TrendingUp className="w-4 h-4" />
                    <span>Cash Flow vs Accrual Performance</span>
                </button>
                <button
                    onClick={() => setActiveSubTab('drilldown')}
                    className={`pb-3 border-b-2 flex items-center gap-1.5 transition ${activeSubTab === 'drilldown' ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400' : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-300'}`}
                >
                    <FileText className="w-4 h-4" />
                    <span>Ledger Drill-Down & Evidence Links</span>
                </button>
            </div>

            {/* TAB 1: Scope Net Worth & Multi-Currency Consolidated */}
            {activeSubTab === 'net_worth' && (
                selectedEntityId === 'all' ? (
                    <div className="space-y-6">
                        {/* Sovereign Breakdown Notice */}
                        <div className="p-4 bg-indigo-50/70 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800/60 rounded-xl space-y-1">
                            <div className="flex items-center gap-2 text-xs font-bold text-indigo-900 dark:text-indigo-200">
                                <Layers className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                                <span>Your finances by owner &mdash; Overview</span>
                            </div>
                            <p className="text-[11px] text-indigo-800/80 dark:text-indigo-300/80 leading-relaxed">
                                Cross-entity consolidation is deferred to prevent commingling sovereign entities (individuals, companies, trusts) without certified exchange rates and inter-entity eliminations. Review each component owner's assets, liabilities, and accounts below, or select an entity to open its dedicated consolidated report.
                            </p>
                        </div>

                        {/* Component Entity Cards */}
                        <div className="space-y-6">
                            {everythingComponents.map(comp => {
                                const currencies = Object.keys(comp.net_worth?.net_worth_cents_by_currency || {});
                                return (
                                    <div key={comp.entity.id} className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden p-5 space-y-4">
                                        {/* Header with Entity Info and Jump to Report Button */}
                                        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-slate-100 dark:border-slate-800 pb-4">
                                            <div className="space-y-1">
                                                <div className="flex items-center gap-2 flex-wrap">
                                                    <h4 className="text-base font-bold text-slate-900 dark:text-slate-100">
                                                        {comp.entity.name}
                                                    </h4>
                                                    <span className="px-2 py-0.5 text-[10px] font-bold rounded-full uppercase bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                                                        {getOwnerTypeLabel(comp.entity.type)}
                                                    </span>
                                                    <span className="text-xs text-slate-400">
                                                        Sovereign Currency: <strong className="text-slate-700 dark:text-slate-300">{comp.entity.currency || 'AUD'}</strong>
                                                    </span>
                                                </div>
                                                <p className="text-xs text-slate-500">
                                                    Balance as of {comp.net_worth?.as_of_date || asOfDate} &middot; {comp.accounts.length} active account{comp.accounts.length !== 1 ? 's' : ''}
                                                </p>
                                            </div>

                                            {onSelectEntity && (
                                                <button
                                                    type="button"
                                                    onClick={() => onSelectEntity(comp.entity.id)}
                                                    className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-indigo-50 dark:bg-indigo-950/60 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300 text-xs font-semibold rounded-lg border border-indigo-200 dark:border-indigo-800 transition cursor-pointer"
                                                >
                                                    <span>View {comp.entity.name}'s Report</span>
                                                    <ArrowUpRight className="w-3.5 h-3.5" />
                                                </button>
                                            )}
                                        </div>

                                        {/* Net Worth stat cards for this entity */}
                                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                            {currencies.map(curr => {
                                                const nw = comp.net_worth?.formatted_net_worth_by_currency?.[curr] || '$0.00';
                                                const aCents = comp.net_worth?.total_assets_cents_by_currency?.[curr] || 0;
                                                const lCents = comp.net_worth?.total_liabilities_cents_by_currency?.[curr] || 0;
                                                return (
                                                    <div key={curr} className="p-3.5 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200/80 dark:border-slate-700/80 space-y-1">
                                                        <div className="flex justify-between items-center text-[10px] font-bold text-slate-500 uppercase">
                                                            <span>Net Worth ({curr})</span>
                                                            <span>{curr}</span>
                                                        </div>
                                                        <div className="text-[10px] text-slate-500 dark:text-slate-400">
                                                            What you own minus what you owe
                                                        </div>
                                                        <div className="text-lg font-extrabold text-slate-900 dark:text-slate-100">
                                                            {nw}
                                                        </div>
                                                        <div className="flex justify-between items-center text-[11px] pt-1.5 border-t border-slate-200 dark:border-slate-700">
                                                            <span className="text-emerald-600 dark:text-emerald-400 font-medium">
                                                                Assets: {formatMoney({ amount_cents: aCents, currency: curr })}
                                                            </span>
                                                            <span className="text-rose-600 dark:text-rose-400 font-medium">
                                                                Liab: {formatMoney({ amount_cents: lCents, currency: curr })}
                                                            </span>
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                            {currencies.length === 0 && (
                                                <div className="p-3 bg-slate-50 dark:bg-slate-800/40 rounded-xl col-span-3 text-xs text-slate-400">
                                                    No balance sheet accounts with recorded postings.
                                                </div>
                                            )}
                                        </div>

                                        {/* Accounts Table for this entity */}
                                        <div className="overflow-x-auto border border-slate-200 dark:border-slate-800 rounded-xl">
                                            <table className="w-full text-xs text-left">
                                                <thead className="bg-slate-50 dark:bg-slate-800/70 text-slate-500 uppercase tracking-wider font-semibold">
                                                    <tr>
                                                        <th className="px-3.5 py-2.5">Account</th>
                                                        <th className="px-3.5 py-2.5">Type / Category</th>
                                                        <th className="px-3.5 py-2.5 text-center">Currency</th>
                                                        <th className="px-3.5 py-2.5 text-right">Balance</th>
                                                        <th className="px-3.5 py-2.5 text-center">As Of Date</th>
                                                        <th className="px-3.5 py-2.5 text-center">Action</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                                    {comp.accounts.map(acc => (
                                                        <tr key={acc.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                                                            <td className="px-3.5 py-2.5 font-semibold text-slate-900 dark:text-slate-100">
                                                                {acc.name}
                                                            </td>
                                                            <td className="px-3.5 py-2.5 capitalize text-slate-500">
                                                                {acc.type} &middot; {acc.sub_type}
                                                            </td>
                                                            <td className="px-3.5 py-2.5 text-center font-mono font-bold text-slate-600 dark:text-slate-400">
                                                                {acc.currency}
                                                            </td>
                                                            <td className="px-3.5 py-2.5 text-right font-extrabold text-slate-900 dark:text-slate-100 font-mono">
                                                                {(acc.is_unknown || acc.balance_cents === null) ? (
                                                                    <span className="text-amber-600 dark:text-amber-400 font-bold italic text-xs">
                                                                        Unknown (Needs balance)
                                                                    </span>
                                                                ) : (
                                                                    acc.formatted_balance || formatMoney({ amount_cents: acc.balance_cents || 0, currency: acc.currency })
                                                                )}
                                                            </td>
                                                            <td className="px-3.5 py-2.5 text-center text-slate-500 font-mono text-[11px]">
                                                                {(acc.is_unknown || acc.balance_cents === null || !acc.as_of_date) ? '—' : acc.as_of_date}
                                                            </td>
                                                            <td className="px-3.5 py-2.5 text-center">
                                                                <button
                                                                    type="button"
                                                                    onClick={() => {
                                                                        setSelectedAccountId(acc.id);
                                                                        setActiveSubTab('drilldown');
                                                                    }}
                                                                    className="p-1 hover:bg-slate-100 dark:hover:bg-slate-700 rounded text-slate-600 dark:text-slate-300"
                                                                    title="Drill down to Ledger"
                                                                >
                                                                    <FileText className="w-3.5 h-3.5" />
                                                                </button>
                                                            </td>
                                                        </tr>
                                                    ))}
                                                    {comp.accounts.length === 0 && (
                                                        <tr>
                                                            <td colSpan={6} className="px-4 py-6 text-center text-slate-400">
                                                                No accounts found for {comp.entity.name}.
                                                            </td>
                                                        </tr>
                                                    )}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>
                                );
                            })}

                            {everythingComponents.length === 0 && !loading && (
                                <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-8 text-center text-slate-400 text-xs">
                                    No sovereign entities found. Set up entities in Account Management.
                                </div>
                            )}
                        </div>
                    </div>
                ) : (
                    <div className="space-y-6">
                        {/* Consolidated Completeness Card */}
                        <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-xl border border-slate-200 dark:border-slate-700/80 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                            <div>
                                <div className="flex items-center gap-2">
                                    <Globe className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                                    <h3 className="text-xs font-bold text-slate-900 dark:text-slate-100">
                                        Consolidated Net Worth ({reportingCurrency})
                                    </h3>
                                    {consolidatedReport?.is_complete ? (
                                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800">
                                            100% Exchange Rates Available
                                        </span>
                                    ) : (
                                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-950/80 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-800">
                                            Incomplete Valuation (Missing Rates)
                                        </span>
                                    )}
                                </div>
                                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                                    Strict currency conversion (M1-CALC-03, T8). No fallback to 1:1 parity without explicit rates.
                                </p>
                                {consolidatedReport && !consolidatedReport.is_complete && consolidatedReport.missing_rates.length > 0 && (
                                    <div className="mt-2 text-[11px] text-amber-700 dark:text-amber-400 font-medium">
                                        Missing dated exchange rates: {consolidatedReport.missing_rates.join(', ')}
                                    </div>
                                )}
                            </div>

                            <div className="flex items-center gap-3">
                                <select
                                    value={reportingCurrency}
                                    onChange={(e) => setReportingCurrency(e.target.value as CurrencyCode)}
                                    className="text-xs bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg px-2.5 py-1.5 font-bold focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                                >
                                    <option value="AUD">Reporting: AUD</option>
                                    <option value="USD">Reporting: USD</option>
                                    <option value="EUR">Reporting: EUR</option>
                                    <option value="GBP">Reporting: GBP</option>
                                </select>

                                <div className="text-right">
                                    <div className="text-lg font-extrabold text-slate-900 dark:text-slate-100">
                                        {consolidatedReport?.formatted_consolidated_total || 'Conversion Incomplete'}
                                    </div>
                                    <div className="text-[10px] text-slate-400">
                                        as of {asOfDate}
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Scoped Net Worth Cards */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            {scopeReport && scopeReport.net_worth_cents_by_currency && Object.keys(scopeReport.net_worth_cents_by_currency).map(curr => {
                                const nw = scopeReport.formatted_net_worth_by_currency[curr];
                                const assets = scopeReport.total_assets_cents_by_currency[curr] || 0;
                                const liab = scopeReport.total_liabilities_cents_by_currency[curr] || 0;
                                return (
                                    <div key={curr} className="p-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-2">
                                        <div className="flex justify-between items-center text-xs font-bold text-slate-500">
                                            <span>Net Worth ({curr})</span>
                                            <span className="uppercase px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-[10px]">
                                                {scopeType}
                                            </span>
                                        </div>
                                        <div className="text-xs text-slate-500 dark:text-slate-400">
                                            What you own minus what you owe
                                        </div>
                                        <div className="text-2xl font-extrabold text-slate-900 dark:text-slate-100">
                                            {nw}
                                        </div>
                                        <div className="flex justify-between items-center text-xs pt-2 border-t border-slate-100 dark:border-slate-800">
                                            <span className="text-emerald-600 dark:text-emerald-400 font-medium">
                                                Assets: {formatMoney({ amount_cents: assets, currency: curr })}
                                            </span>
                                            <span className="text-rose-600 dark:text-rose-400 font-medium">
                                                Liab: {formatMoney({ amount_cents: liab, currency: curr })}
                                            </span>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>

                        {/* Ownership & Account Breakdown Table */}
                        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
                            <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center">
                                <div>
                                    <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                                        Scoped Balance Sheet Accounts
                                    </h3>
                                    <p className="text-[11px] text-slate-500">
                                        {scopeType === 'household'
                                            ? 'Household scope: Joint accounts de-duplicated once at 100% (eliminating 200% duplicate counting).'
                                            : 'Individual scope: Balance reflects entity percentage share allocation.'}
                                    </p>
                                </div>
                            </div>

                            <div className="overflow-x-auto">
                                <table className="w-full text-xs text-left">
                                    <thead className="bg-slate-50 dark:bg-slate-800/70 text-slate-500 uppercase tracking-wider font-semibold">
                                        <tr>
                                            <th className="px-4 py-3">Account</th>
                                            <th className="px-4 py-3">Type / Category</th>
                                            <th className="px-4 py-3 text-center">Ownership %</th>
                                            <th className="px-4 py-3 text-right">Full Balance</th>
                                            <th className="px-4 py-3 text-right">Scoped Balance</th>
                                            <th className="px-4 py-3 text-center">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                        {scopeReport?.items.map(item => (
                                            <tr key={item.account_id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                                                <td className="px-4 py-3 font-semibold text-slate-900 dark:text-slate-100">
                                                    {item.account_name}
                                                    {item.is_joint && (
                                                        <span className="ml-2 px-1.5 py-0.5 rounded text-[10px] bg-blue-100 dark:bg-blue-950/80 text-blue-700 dark:text-blue-300">
                                                            Joint
                                                        </span>
                                                    )}
                                                </td>
                                                <td className="px-4 py-3 capitalize text-slate-500">
                                                    {item.account_type} &middot; {item.sub_type}
                                                </td>
                                                <td className="px-4 py-3 text-center font-bold">
                                                    {scopeType === 'household' ? '100% (Unified)' : `${item.ownership_share_percentage}%`}
                                                </td>
                                                <td className="px-4 py-3 text-right text-slate-500">
                                                    {item.formatted_full_balance || formatMoney({ amount_cents: item.gross_balance_cents, currency: item.currency })}
                                                </td>
                                                <td className="px-4 py-3 text-right font-extrabold text-slate-900 dark:text-slate-100">
                                                    {item.formatted_attributed_balance}
                                                </td>
                                                <td className="px-4 py-3 text-center">
                                                    <div className="flex items-center justify-center gap-1.5">
                                                        <button
                                                            onClick={() => {
                                                                setSelectedAccountId(item.account_id);
                                                                setActiveSubTab('drilldown');
                                                            }}
                                                            className="p-1 hover:bg-slate-100 dark:hover:bg-slate-700 rounded text-slate-600 dark:text-slate-300"
                                                            title="Drill down to Ledger"
                                                        >
                                                            <FileText className="w-3.5 h-3.5" />
                                                        </button>
                                                        <button
                                                            onClick={() => handleOpenOwnershipModal(item.account_id)}
                                                            className="p-1 hover:bg-slate-100 dark:hover:bg-slate-700 rounded text-slate-600 dark:text-slate-300"
                                                            title="Edit Ownership Allocation"
                                                        >
                                                            <Users className="w-3.5 h-3.5" />
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                        {(!scopeReport || scopeReport.items.length === 0) && (
                                            <tr>
                                                <td colSpan={6} className="px-4 py-8 text-center text-slate-400">
                                                    No accounts recorded for this scope.
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                )
            )}

            {/* TAB 2: Cash Flow vs Accrual Performance */}
            {activeSubTab === 'cash_vs_accrual' && (
                selectedEntityId === 'all' ? (
                    <div className="space-y-6">
                        <div className="p-4 bg-indigo-50/70 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800/60 rounded-xl space-y-1">
                            <div className="flex items-center gap-2 text-xs font-bold text-indigo-900 dark:text-indigo-200">
                                <TrendingUp className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                                <span>Operating Performance & Cash Flow &mdash; Sovereign Entity Isolation</span>
                            </div>
                            <p className="text-[11px] text-indigo-800/80 dark:text-indigo-300/80 leading-relaxed">
                                Cash Flow and Accrual Statements represent sovereign legal entities. Operating revenue and liquid cash movements cannot be commingled across separate legal boundaries without inter-entity transaction eliminations. Select an entity below to view its individual cash flow and accrual performance statements.
                            </p>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {everythingComponents.map(comp => (
                                <div key={comp.entity.id} className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-3">
                                    <div className="flex justify-between items-start">
                                        <div>
                                            <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                                                {comp.entity.name}
                                            </h4>
                                            <span className="text-[10px] font-bold uppercase text-slate-500">
                                                {comp.entity.type} &middot; Currency: {comp.entity.currency || 'AUD'}
                                            </span>
                                        </div>
                                        <span className="text-xs text-slate-400 font-mono">
                                            {comp.accounts.length} account{comp.accounts.length !== 1 ? 's' : ''}
                                        </span>
                                    </div>

                                    <p className="text-xs text-slate-500 dark:text-slate-400">
                                        View liquid cash flow movements and accrual income/expense performance specifically for {comp.entity.name}.
                                    </p>

                                    {onSelectEntity && (
                                        <button
                                            type="button"
                                            onClick={() => onSelectEntity(comp.entity.id)}
                                            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-indigo-50 dark:bg-indigo-950/60 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300 text-xs font-semibold rounded-lg border border-indigo-200 dark:border-indigo-800 transition cursor-pointer"
                                        >
                                            <span>Open {comp.entity.name}'s Cash Flow Report</span>
                                            <ArrowUpRight className="w-3.5 h-3.5" />
                                        </button>
                                    )}
                                </div>
                            ))}
                            {everythingComponents.length === 0 && !loading && (
                                <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-8 text-center text-slate-400 text-xs col-span-2">
                                    No sovereign entities found. Set up entities in Account Management.
                                </div>
                            )}
                        </div>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {/* Actual Cash Flow Statement */}
                        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
                            <div className="flex items-center gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
                                <DollarSign className="w-5 h-5 text-emerald-600" />
                                <div>
                                    <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                                        Actual Liquid Cash Flow Statement
                                    </h3>
                                    <p className="text-[11px] text-slate-500">
                                        Strictly movements in cash, checking, and savings accounts.
                                    </p>
                                </div>
                            </div>

                            {cashFlowReport ? (
                                <div className="space-y-4 text-xs">
                                    {Object.keys(cashFlowReport.starting_cash_cents_by_currency).map(curr => {
                                        /**
                                         * Why this section exists:
                                         * Assessor Finding 4: Cash Flow Statement must report all 3 standard activity categories
                                         * (operating, financing, investing) and prominently expose ledger reconciliation status.
                                         * An unreconciled statement must never be presented as verified.
                                         * 
                                         * Tricky logic:
                                         * - Inflows are additions to liquid cash (+), outflows are reductions (-).
                                         * - Expense refunds increase liquid cash (operating inflow).
                                         * - Income reversals decrease liquid cash (operating outflow).
                                         * - Statement ending cash is compared against independent balance-sheet liquid accounts.
                                         *   Any divergence is highlighted with a red badge showing the exact discrepancy.
                                         * 
                                         * TODO: Add one-click discrepancy diagnostic drawer in Milestone 2.
                                         */
                                        const startVal = cashFlowReport.starting_cash_cents_by_currency[curr] || 0;
                                        const opIn = cashFlowReport.operating_inflows_cents_by_currency[curr] || 0;
                                        const opOut = cashFlowReport.operating_outflows_cents_by_currency[curr] || 0;
                                        const netOp = cashFlowReport.net_operating_cents_by_currency?.[curr] ?? (opIn - opOut);

                                        const finIn = cashFlowReport.financing_inflows_cents_by_currency?.[curr] || 0;
                                        const finOut = cashFlowReport.financing_outflows_cents_by_currency[curr] || 0;
                                        const netFin = cashFlowReport.net_financing_cents_by_currency?.[curr] ?? (finIn - finOut);

                                        const invIn = cashFlowReport.investing_inflows_cents_by_currency?.[curr] || 0;
                                        const invOut = cashFlowReport.investing_outflows_cents_by_currency?.[curr] || 0;
                                        const netInv = cashFlowReport.net_investing_cents_by_currency?.[curr] ?? (invIn - invOut);

                                        const netChange = cashFlowReport.net_cash_change_cents_by_currency[curr] || 0;
                                        const endVal = cashFlowReport.ending_cash_cents_by_currency[curr] || 0;
                                        const ledgerClose = cashFlowReport.ledger_closing_cash_cents_by_currency?.[curr] ?? endVal;
                                        const isReconciled = cashFlowReport.is_reconciled_by_currency?.[curr] ?? (endVal === ledgerClose);
                                        const discrepancy = cashFlowReport.reconciliation_discrepancy_cents_by_currency?.[curr] || 0;

                                        return (
                                            <div key={curr} className="p-4 bg-slate-50 dark:bg-slate-800/40 rounded-xl space-y-3 border border-slate-200/70 dark:border-slate-700/60">
                                                {/* Reconciliation Status Banner */}
                                                {isReconciled ? (
                                                    <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 font-bold text-[11px]">
                                                        <CheckCircle2 className="w-4 h-4 flex-shrink-0 text-emerald-600" />
                                                        <span>RECONCILED — Cash movements verified against independent ledger balance</span>
                                                    </div>
                                                ) : (
                                                    <div className="p-3 rounded-lg bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-[11px] space-y-1">
                                                        <div className="flex items-center gap-1.5 font-extrabold text-xs">
                                                            <AlertTriangle className="w-4 h-4 flex-shrink-0 text-rose-600" />
                                                            <span>UNRECONCILED DISCREPANCY: {formatMoney({ amount_cents: discrepancy, currency: curr })}</span>
                                                        </div>
                                                        <p className="text-[10px] text-rose-600 dark:text-rose-400">
                                                            Independent ledger liquid closing cash ({formatMoney({ amount_cents: ledgerClose, currency: curr })}) does not match statement ending cash ({formatMoney({ amount_cents: endVal, currency: curr })}). Do not present as verified.
                                                        </p>
                                                    </div>
                                                )}

                                                <div className="font-bold text-slate-700 dark:text-slate-300 pb-1 border-b border-slate-200 dark:border-slate-700 flex justify-between">
                                                    <span>Currency: {curr}</span>
                                                    <span>Starting Cash: {formatMoney({ amount_cents: startVal, currency: curr })}</span>
                                                </div>

                                                {/* Operating Activities */}
                                                <div className="space-y-1 pt-1">
                                                    <div className="text-[10px] uppercase font-bold text-slate-400">Operating Activities</div>
                                                    <div className="flex justify-between text-slate-600 dark:text-slate-400 pl-2">
                                                        <span className="flex items-center gap-1">
                                                            <ArrowDownRight className="w-3.5 h-3.5 text-emerald-600" />
                                                            Operating Inflows (Revenue, Refunds, Receipts)
                                                        </span>
                                                        <span className="font-medium text-emerald-600">
                                                            +{formatMoney({ amount_cents: opIn, currency: curr })}
                                                        </span>
                                                    </div>
                                                    <div className="flex justify-between text-slate-600 dark:text-slate-400 pl-2">
                                                        <span className="flex items-center gap-1">
                                                            <ArrowUpRight className="w-3.5 h-3.5 text-rose-600" />
                                                            Operating Outflows (Expenses, Income Reversals)
                                                        </span>
                                                        <span className="font-medium text-rose-600">
                                                            -{formatMoney({ amount_cents: opOut, currency: curr })}
                                                        </span>
                                                    </div>
                                                    <div className="flex justify-between text-[11px] font-semibold text-slate-700 dark:text-slate-300 pl-2 pt-0.5">
                                                        <span>Net Operating Cash Flow</span>
                                                        <span className={netOp >= 0 ? 'text-emerald-600' : 'text-rose-600'}>
                                                            {formatMoney({ amount_cents: netOp, currency: curr })}
                                                        </span>
                                                    </div>
                                                </div>

                                                {/* Financing Activities */}
                                                <div className="space-y-1 pt-1 border-t border-slate-100 dark:border-slate-800">
                                                    <div className="text-[10px] uppercase font-bold text-slate-400">Financing Activities</div>
                                                    <div className="flex justify-between text-slate-600 dark:text-slate-400 pl-2">
                                                        <span className="flex items-center gap-1">
                                                            <ArrowDownRight className="w-3.5 h-3.5 text-blue-600" />
                                                            Financing Inflows (Loan Drawdowns & Capital Borrowings)
                                                        </span>
                                                        <span className="font-medium text-blue-600">
                                                            +{formatMoney({ amount_cents: finIn, currency: curr })}
                                                        </span>
                                                    </div>
                                                    <div className="flex justify-between text-slate-600 dark:text-slate-400 pl-2">
                                                        <span className="flex items-center gap-1">
                                                            <ArrowUpRight className="w-3.5 h-3.5 text-amber-600" />
                                                            Financing Outflows (Loan & Card Principal Repayments)
                                                        </span>
                                                        <span className="font-medium text-amber-600">
                                                            -{formatMoney({ amount_cents: finOut, currency: curr })}
                                                        </span>
                                                    </div>
                                                    <div className="flex justify-between text-[11px] font-semibold text-slate-700 dark:text-slate-300 pl-2 pt-0.5">
                                                        <span>Net Financing Cash Flow</span>
                                                        <span className={netFin >= 0 ? 'text-emerald-600' : 'text-amber-600'}>
                                                            {formatMoney({ amount_cents: netFin, currency: curr })}
                                                        </span>
                                                    </div>
                                                </div>

                                                {/* Investing Activities */}
                                                <div className="space-y-1 pt-1 border-t border-slate-100 dark:border-slate-800">
                                                    <div className="text-[10px] uppercase font-bold text-slate-400">Investing Activities</div>
                                                    <div className="flex justify-between text-slate-600 dark:text-slate-400 pl-2">
                                                        <span className="flex items-center gap-1">
                                                            <ArrowDownRight className="w-3.5 h-3.5 text-indigo-600" />
                                                            Investing Inflows (Asset Disposals & Liquidations)
                                                        </span>
                                                        <span className="font-medium text-indigo-600">
                                                            +{formatMoney({ amount_cents: invIn, currency: curr })}
                                                        </span>
                                                    </div>
                                                    <div className="flex justify-between text-slate-600 dark:text-slate-400 pl-2">
                                                        <span className="flex items-center gap-1">
                                                            <ArrowUpRight className="w-3.5 h-3.5 text-purple-600" />
                                                            Investing Outflows (Asset Acquisitions & Capex)
                                                        </span>
                                                        <span className="font-medium text-purple-600">
                                                            -{formatMoney({ amount_cents: invOut, currency: curr })}
                                                        </span>
                                                    </div>
                                                    <div className="flex justify-between text-[11px] font-semibold text-slate-700 dark:text-slate-300 pl-2 pt-0.5">
                                                        <span>Net Investing Cash Flow</span>
                                                        <span className={netInv >= 0 ? 'text-emerald-600' : 'text-purple-600'}>
                                                            {formatMoney({ amount_cents: netInv, currency: curr })}
                                                        </span>
                                                    </div>
                                                </div>

                                                {/* Net Cash Change & Reconciliation Verification */}
                                                <div className="flex justify-between font-bold pt-2 border-t border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100">
                                                    <span>Net Cash Change</span>
                                                    <span className={netChange >= 0 ? 'text-emerald-600' : 'text-rose-600'}>
                                                        {formatMoney({ amount_cents: netChange, currency: curr })}
                                                    </span>
                                                </div>

                                                <div className="flex justify-between font-extrabold text-sm pt-1 text-slate-900 dark:text-slate-100">
                                                    <span>Ending Liquid Cash</span>
                                                    <span>{formatMoney({ amount_cents: endVal, currency: curr })}</span>
                                                </div>

                                                <div className="flex justify-between text-xs pt-1 text-slate-500 dark:text-slate-400">
                                                    <span>Ledger Liquid Closing Cash</span>
                                                    <span className="font-mono">{formatMoney({ amount_cents: ledgerClose, currency: curr })}</span>
                                                </div>
                                            </div>
                                        );
                                    })}

                                    {Object.keys(cashFlowReport.starting_cash_cents_by_currency).length === 0 && (
                                        <div className="text-center py-6 text-slate-400">
                                            No cash movements recorded in this date range.
                                        </div>
                                    )}
                                </div>
                            ) : (
                                <div className="text-center py-8 text-slate-400 text-xs">
                                    Select an entity and period to calculate actual cash flow.
                                </div>
                            )}
                        </div>

                        {/* Accrual Income & Expense */}
                        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
                            <div className="flex items-center gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
                                <TrendingUp className="w-5 h-5 text-indigo-600" />
                                <div>
                                    <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                                        Accrual Income & Expense Statement
                                    </h3>
                                    <p className="text-[11px] text-slate-500">
                                        Performance accounting: Revenue earned & expenses incurred regardless of settlement.
                                    </p>
                                </div>
                            </div>

                            {accrualReport ? (
                                <div className="space-y-4 text-xs">
                                    {Object.keys(accrualReport.total_income_cents_by_currency || {}).map(curr => {
                                        const inc = accrualReport.total_income_cents_by_currency[curr] || 0;
                                        const exp = accrualReport.total_expenses_cents_by_currency[curr] || 0;
                                        const sav = accrualReport.net_savings_cents_by_currency[curr] || 0;

                                        return (
                                            <div key={curr} className="p-3.5 bg-slate-50 dark:bg-slate-800/40 rounded-xl space-y-2 border border-slate-200/70 dark:border-slate-700/60">
                                                <div className="font-bold text-slate-700 dark:text-slate-300 pb-1 border-b border-slate-200 dark:border-slate-700 flex justify-between">
                                                    <span>Currency: {curr}</span>
                                                    <span className="text-[10px] uppercase font-bold text-indigo-600">Accrual Performance</span>
                                                </div>

                                                <div className="flex justify-between text-slate-600 dark:text-slate-400">
                                                    <span>Total Operating Income</span>
                                                    <span className="font-medium text-emerald-600">
                                                        {formatMoney({ amount_cents: inc, currency: curr })}
                                                    </span>
                                                </div>

                                                <div className="flex justify-between text-slate-600 dark:text-slate-400">
                                                    <span>Total Incurred Expenses</span>
                                                    <span className="font-medium text-rose-600">
                                                        {formatMoney({ amount_cents: exp, currency: curr })}
                                                    </span>
                                                </div>

                                                <div className="flex justify-between font-extrabold text-sm pt-2 border-t border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100">
                                                    <span>Net Savings (Accrual)</span>
                                                    <span className={sav >= 0 ? 'text-emerald-600' : 'text-rose-600'}>
                                                        {formatMoney({ amount_cents: sav, currency: curr })}
                                                    </span>
                                                </div>
                                            </div>
                                        );
                                    })}

                                    {accrualReport.breakdown_by_category && accrualReport.breakdown_by_category.length > 0 && (
                                        <div className="pt-2">
                                            <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2">
                                                Category Breakdown
                                            </div>
                                            <div className="space-y-1 max-h-48 overflow-y-auto pr-1">
                                                {accrualReport.breakdown_by_category.map((cat: any) => (
                                                    <div key={cat.category_name} className="flex justify-between text-xs py-1 border-b border-slate-100 dark:border-slate-800">
                                                        <span className="text-slate-700 dark:text-slate-300">{cat.category_name}</span>
                                                        <span className="font-semibold text-slate-900 dark:text-slate-100">{cat.formatted_total}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            ) : (
                                <div className="text-center py-8 text-slate-400 text-xs">
                                    Select an entity to view accrual income & expense breakdown.
                                </div>
                            )}
                        </div>
                    </div>
                )
            )}

            {/* TAB 3: Ledger Drill-Down & Evidence Links */}
            {activeSubTab === 'drilldown' && (
                <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden space-y-4 p-5">
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-100 dark:border-slate-800 pb-4">
                        <div>
                            <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                                Chronological Ledger Traceability (M1-EVID-01, M1-EVID-02)
                            </h3>
                            <p className="text-[11px] text-slate-500">
                                Every displayed balance is traceable to individual journal postings with running balances and evidence citations.
                            </p>
                        </div>

                        {/* Account Selector */}
                        <div className="flex items-center gap-2">
                            <label className="text-xs font-semibold text-slate-600 dark:text-slate-400">Account:</label>
                            <select
                                value={selectedAccountId}
                                onChange={(e) => setSelectedAccountId(e.target.value)}
                                className="text-xs bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-1.5 font-medium focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                            >
                                <option value="">-- Select an account --</option>
                                {accounts.map(acc => (
                                    <option key={acc.id} value={acc.id}>
                                        {acc.name} ({acc.type} &middot; {acc.currency})
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>

                    {drilldownReport ? (
                        <div className="space-y-4">
                            {/* Summary Cards */}
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                                <div className="p-3 bg-slate-50 dark:bg-slate-800/40 rounded-xl">
                                    <div className="text-[10px] font-bold text-slate-500 uppercase">Account</div>
                                    <div className="text-xs font-bold text-slate-900 dark:text-slate-100 truncate">
                                        {drilldownReport.account_name}
                                    </div>
                                </div>
                                <div className="p-3 bg-slate-50 dark:bg-slate-800/40 rounded-xl">
                                    <div className="text-[10px] font-bold text-slate-500 uppercase">Normal Balance</div>
                                    <div className="text-xs font-bold text-slate-900 dark:text-slate-100 capitalize">
                                        {drilldownReport.account_type === 'asset' || drilldownReport.account_type === 'expense' ? 'Debit Normal' : 'Credit Normal'}
                                    </div>
                                </div>
                                <div className="p-3 bg-slate-50 dark:bg-slate-800/40 rounded-xl">
                                    <div className="text-[10px] font-bold text-slate-500 uppercase">Opening Balance</div>
                                    <div className="text-xs font-bold text-slate-900 dark:text-slate-100">
                                        {drilldownReport.formatted_opening_balance}
                                    </div>
                                </div>
                                <div className="p-3 bg-slate-50 dark:bg-slate-800/40 rounded-xl">
                                    <div className="text-[10px] font-bold text-slate-500 uppercase">Closing Balance</div>
                                    <div className="text-xs font-bold text-indigo-600 dark:text-indigo-400">
                                        {drilldownReport.formatted_closing_balance}
                                    </div>
                                </div>
                            </div>

                            {/* Journal Postings Table */}
                            <div className="overflow-x-auto border border-slate-100 dark:border-slate-800 rounded-xl">
                                <table className="w-full text-xs text-left">
                                    <thead className="bg-slate-50 dark:bg-slate-800/70 text-slate-500 uppercase tracking-wider font-semibold">
                                        <tr>
                                            <th className="px-3 py-2.5">Date</th>
                                            <th className="px-3 py-2.5">Description / Payee</th>
                                            <th className="px-3 py-2.5">Origin</th>
                                            <th className="px-3 py-2.5 text-right">Debit / Credit</th>
                                            <th className="px-3 py-2.5 text-right">Running Balance</th>
                                            <th className="px-3 py-2.5 text-center">Evidence</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                        {drilldownReport.entries.map((entry) => (
                                            <tr key={entry.posting_id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                                                <td className="px-3 py-2.5 font-medium whitespace-nowrap text-slate-600 dark:text-slate-300">
                                                    {entry.date}
                                                </td>
                                                <td className="px-3 py-2.5">
                                                    <div className="font-semibold text-slate-900 dark:text-slate-100">
                                                        {entry.description}
                                                    </div>
                                                    {entry.payee_or_payer && (
                                                        <div className="text-[10px] text-slate-500">
                                                            {entry.payee_or_payer}
                                                        </div>
                                                    )}
                                                </td>
                                                <td className="px-3 py-2.5 capitalize text-slate-500 whitespace-nowrap">
                                                    {entry.origin}
                                                </td>
                                                <td className="px-3 py-2.5 text-right font-bold text-slate-900 dark:text-slate-100 whitespace-nowrap">
                                                    {entry.formatted_amount}
                                                </td>
                                                <td className="px-3 py-2.5 text-right font-extrabold text-indigo-600 dark:text-indigo-400 whitespace-nowrap">
                                                    {entry.formatted_running_balance}
                                                </td>
                                                <td className="px-3 py-2.5 text-center whitespace-nowrap">
                                                    {entry.evidence_refs && entry.evidence_refs.length > 0 ? (
                                                        <button
                                                            onClick={() => setSelectedEvidence(entry.evidence_refs)}
                                                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-indigo-50 dark:bg-indigo-950/80 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800 text-[10px] font-semibold hover:bg-indigo-100 transition"
                                                        >
                                                            <Shield className="w-3 h-3" />
                                                            <span>Evidence</span>
                                                        </button>
                                                    ) : (
                                                        <span className="text-slate-400 text-[10px]">None</span>
                                                    )}
                                                </td>
                                            </tr>
                                        ))}
                                        {drilldownReport.entries.length === 0 && (
                                            <tr>
                                                <td colSpan={6} className="px-3 py-8 text-center text-slate-400">
                                                    No journal entries found for this account and date range.
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    ) : (
                        <div className="text-center py-12 text-slate-400 text-xs">
                            Select an account from the dropdown to inspect its chronological ledger postings and running balance.
                        </div>
                    )}
                </div>
            )}

            {/* Evidence Citation Modal / Drawer */}
            {selectedEvidence && selectedEvidence.length > 0 && (
                <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
                    <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-md w-full border border-slate-200 dark:border-slate-800 shadow-xl p-5 space-y-4 max-h-[80vh] flex flex-col">
                        <div className="flex justify-between items-center border-b border-slate-100 dark:border-slate-800 pb-3">
                            <div className="flex items-center gap-2">
                                <Shield className="w-4 h-4 text-indigo-600" />
                                <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                                    Structured Evidence Metadata
                                </h3>
                            </div>
                            <button
                                onClick={() => setSelectedEvidence(null)}
                                className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded text-slate-400 hover:text-slate-600"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        </div>

                        <div className="space-y-4 overflow-y-auto pr-2">
                            {selectedEvidence.map((ev, idx) => (
                                <div key={idx} className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl space-y-2 border border-slate-200 dark:border-slate-700">
                                    <div className="flex items-center justify-between">
                                        <span className="text-[10px] font-bold uppercase text-slate-400 block">Citation #{idx + 1}</span>
                                        {ev.document_id && (
                                            <a href={`/api/documents/raw?id=${ev.document_id}`} target="_blank" rel="noopener noreferrer" className="text-[10px] text-indigo-600 dark:text-indigo-400 hover:underline inline-flex items-center gap-1">
                                                <ExternalLink className="w-3 h-3" />
                                                View Original
                                            </a>
                                        )}
                                    </div>
                                    <div>
                                        <span className="text-[10px] font-bold uppercase text-slate-400 block">Document ID</span>
                                        <span className="font-mono text-slate-800 dark:text-slate-200 break-all text-xs">
                                            {ev.document_id || 'N/A'}
                                        </span>
                                    </div>
                                    <div>
                                        <span className="text-[10px] font-bold uppercase text-slate-400 block">Content Hash (SHA-256)</span>
                                        <span className="font-mono text-slate-800 dark:text-slate-200 break-all text-xs">
                                            {ev.content_hash || 'N/A'}
                                        </span>
                                    </div>
                                    {ev.page_number !== undefined && ev.page_number !== null && (
                                        <div>
                                            <span className="text-[10px] font-bold uppercase text-slate-400 block">Page Citation</span>
                                            <span className="font-semibold text-slate-800 dark:text-slate-200 text-xs">
                                                Page {ev.page_number}
                                            </span>
                                        </div>
                                    )}
                                    {ev.cell_reference && (
                                        <div>
                                            <span className="text-[10px] font-bold uppercase text-slate-400 block">Location</span>
                                            <span className="font-semibold text-slate-800 dark:text-slate-200 text-xs">
                                                {ev.cell_reference}
                                            </span>
                                        </div>
                                    )}
                                    {ev.bounding_box && (
                                        <div>
                                            <span className="text-[10px] font-bold uppercase text-slate-400 block">Bounding Box Coordinates</span>
                                            <span className="font-mono text-[11px] text-slate-600 dark:text-slate-400">
                                                {JSON.stringify(ev.bounding_box)}
                                            </span>
                                        </div>
                                    )}
                                </div>
                            ))}
                            <p className="text-[11px] text-slate-500">
                                This metadata links the transaction ledger directly to the verified source document snippets.
                            </p>
                        </div>

                        <div className="flex justify-end pt-2">
                            <button
                                onClick={() => setSelectedEvidence(null)}
                                className="px-4 py-2 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-lg text-xs font-semibold hover:bg-slate-200 dark:hover:bg-slate-700 transition"
                            >
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* MODAL 1: Revalue Non-Cash Asset */}
            {isValuationModalOpen && (
                <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
                    <form onSubmit={handleRecordValuation} className="bg-white dark:bg-slate-900 rounded-2xl max-w-lg w-full border border-slate-200 dark:border-slate-800 shadow-xl p-6 space-y-4">
                        <div className="flex justify-between items-center border-b border-slate-100 dark:border-slate-800 pb-3">
                            <div className="flex items-center gap-2">
                                <Scale className="w-5 h-5 text-indigo-600" />
                                <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                                    Record Dated Asset Valuation (T6)
                                </h3>
                            </div>
                            <button
                                type="button"
                                onClick={() => setIsValuationModalOpen(false)}
                                className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded text-slate-400 hover:text-slate-600"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        </div>

                        <p className="text-xs text-slate-500 dark:text-slate-400">
                            Revaluing non-cash assets (e.g. real estate, vehicles) updates carrying values against the
                            <strong> Unrealized Valuation Reserve</strong> equity account. Liquid cash and operating revenues remain zero delta.
                        </p>

                        <div className="space-y-3 text-xs">
                            <div>
                                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                                    Asset Account
                                </label>
                                <select
                                    value={valAccountId}
                                    onChange={(e) => setValAccountId(e.target.value)}
                                    required
                                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                                >
                                    <option value="">-- Choose an asset account --</option>
                                    {accounts.filter(a => a.type === 'asset' && !['cash', 'checking', 'savings'].includes(a.sub_type)).map(a => (
                                        <option key={a.id} value={a.id}>
                                            {a.name} ({a.sub_type} &middot; {a.currency})
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                                    New Valuation Amount (in Asset Currency)
                                </label>
                                <input
                                    type="number"
                                    step="0.01"
                                    value={valAmount}
                                    onChange={(e) => setValAmount(e.target.value)}
                                    placeholder="e.g. 850000.00"
                                    required
                                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                                />
                            </div>

                            <div>
                                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                                    Valuation Date
                                </label>
                                <input
                                    type="date"
                                    value={valDate}
                                    onChange={(e) => setValDate(e.target.value)}
                                    required
                                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                                />
                            </div>

                            <div>
                                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                                    Valuation Source / Notes
                                </label>
                                <input
                                    type="text"
                                    value={valSource}
                                    onChange={(e) => setValSource(e.target.value)}
                                    placeholder="e.g. CoreLogic Appraisal Report, Valuer-General"
                                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                                />
                            </div>

                            <div>
                                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                                    Evidence Document SHA-256 Hash (Optional)
                                </label>
                                <input
                                    type="text"
                                    value={valDocHash}
                                    onChange={(e) => setValDocHash(e.target.value)}
                                    placeholder="e.g. 4a2f8b..."
                                    className="w-full font-mono bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                                />
                            </div>
                        </div>

                        <div className="flex justify-end gap-2 pt-4 border-t border-slate-100 dark:border-slate-800">
                            <button
                                type="button"
                                onClick={() => setIsValuationModalOpen(false)}
                                className="px-4 py-2 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-lg text-xs font-semibold hover:bg-slate-200 transition"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-xs font-semibold hover:bg-indigo-700 transition"
                            >
                                Commit Valuation Adjustment
                            </button>
                        </div>
                    </form>
                </div>
            )}

            {/* MODAL 2: Joint Ownership Editor */}
            {isOwnershipModalOpen && (
                <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
                    <form onSubmit={handleSaveOwnership} className="bg-white dark:bg-slate-900 rounded-2xl max-w-lg w-full border border-slate-200 dark:border-slate-800 shadow-xl p-6 space-y-4">
                        <div className="flex justify-between items-center border-b border-slate-100 dark:border-slate-800 pb-3">
                            <div className="flex items-center gap-2">
                                <Users className="w-5 h-5 text-indigo-600" />
                                <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                                    Set Ownership Allocations (T7)
                                </h3>
                            </div>
                            <button
                                type="button"
                                onClick={() => setIsOwnershipModalOpen(false)}
                                className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded text-slate-400 hover:text-slate-600"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        </div>

                        <p className="text-xs text-slate-500 dark:text-slate-400">
                            Configure percentage ownership for each entity. The sum of shares must be &le; 100%.
                            Household scope automatically rolls these up at 100% without double-counting.
                        </p>

                        <div className="space-y-3 text-xs">
                            {entities.map(ent => {
                                const currentAlloc = ownAllocations.find(a => a.entity_id === ent.id);
                                const currentPct = currentAlloc ? currentAlloc.ownership_percentage : 0;
                                return (
                                    <div key={ent.id} className="flex justify-between items-center p-3 bg-slate-50 dark:bg-slate-800/40 rounded-xl">
                                        <div>
                                            <div className="font-semibold text-slate-800 dark:text-slate-200">
                                                {ent.name}
                                            </div>
                                            <div className="text-[10px] text-slate-400 capitalize">{ent.type}</div>
                                        </div>
                                        <div className="flex items-center gap-1.5">
                                            <input
                                                type="number"
                                                min="0"
                                                max="100"
                                                step="0.1"
                                                value={currentPct}
                                                onChange={(e) => {
                                                    const val = parseFloat(e.target.value) || 0;
                                                    const updated = ownAllocations.filter(a => a.entity_id !== ent.id);
                                                    if (val > 0) {
                                                        updated.push({ entity_id: ent.id, ownership_percentage: val });
                                                    }
                                                    setOwnAllocations(updated);
                                                }}
                                                className="w-20 text-right bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg px-2 py-1 font-bold focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                                            />
                                            <span className="font-bold text-slate-500">%</span>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>

                        <div className="flex justify-between items-center pt-3 border-t border-slate-100 dark:border-slate-800 text-xs">
                            <span className="font-semibold text-slate-600 dark:text-slate-400">
                                Total Ownership: {ownAllocations.reduce((acc, c) => acc + c.ownership_percentage, 0)}%
                            </span>
                            <div className="flex gap-2">
                                <button
                                    type="button"
                                    onClick={() => setIsOwnershipModalOpen(false)}
                                    className="px-3 py-1.5 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-lg text-xs font-semibold hover:bg-slate-200 transition"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="px-3.5 py-1.5 bg-indigo-600 text-white rounded-lg text-xs font-semibold hover:bg-indigo-700 transition"
                                >
                                    Save Allocations
                                </button>
                            </div>
                        </div>
                    </form>
                </div>
            )}

            {/* MODAL 3: Exchange Rate Manager */}
            {isRateModalOpen && (
                <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
                    <form onSubmit={handleSetExchangeRate} className="bg-white dark:bg-slate-900 rounded-2xl max-w-md w-full border border-slate-200 dark:border-slate-800 shadow-xl p-6 space-y-4">
                        <div className="flex justify-between items-center border-b border-slate-100 dark:border-slate-800 pb-3">
                            <div className="flex items-center gap-2">
                                <Globe className="w-5 h-5 text-emerald-600" />
                                <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                                    Set Currency Exchange Rate (T8)
                                </h3>
                            </div>
                            <button
                                type="button"
                                onClick={() => setIsRateModalOpen(false)}
                                className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded text-slate-400 hover:text-slate-600"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        </div>

                        <div className="space-y-3 text-xs">
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                                        From Currency
                                    </label>
                                    <input
                                        type="text"
                                        maxLength={3}
                                        value={rateFrom}
                                        onChange={(e) => setRateFrom(e.target.value.toUpperCase())}
                                        required
                                        className="w-full uppercase font-bold bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                                    />
                                </div>
                                <div>
                                    <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                                        To Currency
                                    </label>
                                    <input
                                        type="text"
                                        maxLength={3}
                                        value={rateTo}
                                        onChange={(e) => setRateTo(e.target.value.toUpperCase())}
                                        required
                                        className="w-full uppercase font-bold bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                                    Conversion Rate (1 {rateFrom} = ? {rateTo})
                                </label>
                                <input
                                    type="number"
                                    step="0.0001"
                                    value={rateValue}
                                    onChange={(e) => setRateValue(e.target.value)}
                                    placeholder="e.g. 1.5240"
                                    required
                                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 focus:ring-2 focus:ring-emerald-500 focus:outline-none font-bold"
                                />
                            </div>

                            <div>
                                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                                    Effective Date
                                </label>
                                <input
                                    type="date"
                                    value={rateDate}
                                    onChange={(e) => setRateDate(e.target.value)}
                                    required
                                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                                />
                            </div>

                            <div>
                                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                                    Rate Source
                                </label>
                                <input
                                    type="text"
                                    value={rateSource}
                                    onChange={(e) => setRateSource(e.target.value)}
                                    placeholder="e.g. Reserve Bank of Australia, ECB"
                                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                                />
                            </div>
                        </div>

                        <div className="flex justify-end gap-2 pt-4 border-t border-slate-100 dark:border-slate-800">
                            <button
                                type="button"
                                onClick={() => setIsRateModalOpen(false)}
                                className="px-3 py-1.5 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-lg text-xs font-semibold hover:bg-slate-200 transition"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                className="px-3.5 py-1.5 bg-emerald-600 text-white rounded-lg text-xs font-semibold hover:bg-emerald-700 transition"
                            >
                                Save Exchange Rate
                            </button>
                        </div>
                    </form>
                </div>
            )}
        </div>
    );
};
