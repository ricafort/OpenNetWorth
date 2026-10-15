'use client';

/**
 * Cash Flow Management Page
 * 
 * Why this file exists:
 * Fulfills Batch B Delivery 1 (Consistent Actual Cash Flow):
 * Connects actual cash-flow reporting directly to authoritative posted double-entry
 * accounting activity using the accepted calculation services (getActualCashFlowStatement).
 * 
 * Tricky logic:
 * - Uses an explicit reporting period consistently (bounded start and end dates).
 * - Distinguishes actual posted double-entry transactions from scheduled amounts (Autopilot)
 *   and legacy manual monthly logs.
 * - Preserves standard accounting cash-flow classifications: Operating Inflows/Outflows,
 *   Financing Inflows/Outflows (e.g. loan repayments), and Investing.
 * - Internal transfers between liquid accounts are isolated at net $0 and NEVER counted as income or spending.
 * - Strictly maintains separate native currencies; never applies fake 1:1 or mock FX conversions.
 * - Strictly excludes drafts and voided transactions.
 * - Fulfills the Balance-Only Coverage Principle: A balance observation alone does not establish
 *   income or spending. When accounts have balances but lack transaction coverage, this limitation
 *   is disclosed honestly without fabricating activity or claiming that a complete period had zero activity.
 * - Listens for 'opennetworth_balances_updated' DOM event for real-time synchronization.
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import {
    Plus,
    TrendingUp,
    TrendingDown,
    DollarSign,
    Repeat,
    History,
    Calendar,
    ArrowRightLeft,
    RefreshCw,
    AlertTriangle,
    CheckCircle2,
    Info,
    Layers,
    FileText
} from 'lucide-react';
import { RecurringTransaction, CashFlowEntry } from '@/features/cashflow/types';
import RecurringList from '@/features/cashflow/components/RecurringList';
import RecurringTransactionForm from '@/features/cashflow/components/RecurringTransactionForm';
import { useCashflowQuery } from '@/features/cashflow/hooks/useCashflowQuery';
import { formatCurrency, convertAmount } from '@/lib/utils/currencyService';
import { useNetWorth } from '@/features/dashboard/hooks/useNetWorth';
import { PageHeader } from '@/components/common/PageHeader';
import { ContentCard } from '@/components/common/ContentCard';
import { persistScopedRecord, deleteScopedRecord } from '@/infrastructure/local_driver';
import { readDemoPersona } from '@/features/demo/demoMode';
import { Entity, CashFlowStatementResult, CashFlowItem, CurrencyCode, formatMoney } from '@/lib/domain/accounting/types';
import { getLocalTodayCalendarDate } from '@/lib/domain/calendarDate';
import Link from 'next/link';

/** Raw `cash_flow_history` row shape returned by the entity-scoped vault GET. */
interface CashFlowRow {
    id: string;
    user_id: string;
    month: string;
    income: number;
    expenses: number;
    currency: string | null;
}

function rowToEntry(row: CashFlowRow): CashFlowEntry {
    return { id: row.id, month: row.month, income: row.income, expenses: row.expenses };
}

const byMonthAsc = (a: CashFlowEntry, b: CashFlowEntry) => a.month.localeCompare(b.month);

export const CashflowPage = () => {
    const { baseCurrency } = useNetWorth();

    // Tab view: actual (default) | autopilot | history
    const [activeTab, setActiveTab] = useState<'actual' | 'autopilot' | 'history'>('actual');

    // --- ACTUAL CASH FLOW STATE ---
    const [entities, setEntities] = useState<Entity[]>([]);
    const [selectedEntityId, setSelectedEntityId] = useState<string>('');
    const [isEntitiesLoading, setIsEntitiesLoading] = useState<boolean>(true);
    const [entitiesError, setEntitiesError] = useState<string | null>(null);

    // Explicit reporting period
    const today = getLocalTodayCalendarDate();
    const currentMonthStart = `${today.slice(0, 7)}-01`;
    const [startDate, setStartDate] = useState<string>(currentMonthStart);
    const [endDate, setEndDate] = useState<string>(today);
    const [periodPreset, setPeriodPreset] = useState<'this_month' | 'last_month' | 'ytd' | 'custom'>('this_month');

    const [cashFlowReport, setCashFlowReport] = useState<CashFlowStatementResult | null>(null);
    // Why isReportLoading starts false:
    // Report loading is dependent on sovereign entity selection. Starting as true
    // leaves a stale calculating spinner if entity loading fails or returns 0 entities.
    const [isReportLoading, setIsReportLoading] = useState<boolean>(false);
    const [reportError, setReportError] = useState<string | null>(null);

    // --- AUTOPILOT / SCHEDULED STATE ---
    const {
        recurring,
        addRecurring: addRecurringContext,
        updateRecurring: updateRecurringContext,
        deleteRecurring: deleteRecurringContext,
    } = useCashflowQuery();
    const [isAddingRecurring, setIsAddingRecurring] = useState(false);
    const [editingRecurring, setEditingRecurring] = useState<RecurringTransaction | null>(null);

    // --- LEGACY MANUAL LOGS STATE ---
    const [entries, setEntries] = useState<CashFlowEntry[]>([]);
    const [isAddingLegacyEntry, setIsAddingLegacyEntry] = useState(false);
    const [editingLegacyId, setEditingLegacyId] = useState<string | null>(null);
    const [legacyEntryError, setLegacyEntryError] = useState<string | null>(null);

    // Fetch sovereign entities for actual cash flow scoping
    const fetchEntities = useCallback(async () => {
        setIsEntitiesLoading(true);
        setEntitiesError(null);
        try {
            const res = await fetch('/api/accounting');
            if (res.ok) {
                const data = await res.json();
                if (data.entities && data.entities.length > 0) {
                    setEntities(data.entities);
                    // Select default if none selected or previous selection no longer exists
                    const exists = data.entities.some((e: Entity) => e.id === selectedEntityId);
                    if (!selectedEntityId || !exists) {
                        const household = data.entities.find((e: Entity) => e.type === 'household');
                        setSelectedEntityId(household ? household.id : data.entities[0].id);
                    }
                } else {
                    // Empty entity list: stop report loading and clear selected entity
                    setEntities([]);
                    setSelectedEntityId('');
                    setIsReportLoading(false);
                }
            } else {
                const errData = await res.json().catch(() => ({}));
                setEntitiesError(errData.error || `HTTP ${res.status}`);
                setIsReportLoading(false);
            }
        } catch (e: any) {
            console.error('Failed to load accounting entities:', e);
            setEntitiesError(e?.message || 'Failed to load entities');
            setIsReportLoading(false);
        } finally {
            setIsEntitiesLoading(false);
        }
    }, [selectedEntityId]);

    // Fetch actual cash flow statement
    const fetchActualCashFlow = useCallback(async () => {
        if (!selectedEntityId) {
            setIsReportLoading(false);
            return;
        }
        setIsReportLoading(true);
        setReportError(null);
        try {
            const params = new URLSearchParams({
                view: 'reports',
                report_type: 'cash_flow',
                entity_id: selectedEntityId,
                start_date: startDate,
                end_date: endDate
            });
            const res = await fetch(`/api/accounting?${params.toString()}`);
            if (!res.ok) {
                const errData = await res.json().catch(() => ({}));
                throw new Error(errData.error || `HTTP ${res.status}`);
            }
            const data = await res.json();
            if (data.success && data.report) {
                setCashFlowReport(data.report);
            } else {
                setCashFlowReport(null);
            }
        } catch (err: any) {
            console.error('Failed to fetch actual cash flow statement:', err);
            setReportError(err.message || 'Failed to load cash flow statement');
            setCashFlowReport(null);
        } finally {
            setIsReportLoading(false);
        }
    }, [selectedEntityId, startDate, endDate]);

    useEffect(() => {
        fetchEntities();
    }, [fetchEntities]);

    useEffect(() => {
        if (selectedEntityId) {
            fetchActualCashFlow();
        }

        const handleBalancesUpdated = () => {
            fetchActualCashFlow();
        };

        window.addEventListener('opennetworth_balances_updated', handleBalancesUpdated);
        return () => {
            window.removeEventListener('opennetworth_balances_updated', handleBalancesUpdated);
        };
    }, [selectedEntityId, startDate, endDate, fetchActualCashFlow]);

    // Load Manual Logs history from the SQLite vault.
    // Why this exists:
    // The monthly logs live in `cash_flow_history` (renamed to `cash_flow_summaries`
    // by the schema-collapse migration). Reads go through `/api/vault` so the list
    // always matches what saves and deletes write — no localStorage-first reads
    // disagreeing with SQLite writes.
    // Tricky logic:
    // - Demo mode (Phase 2.7) needs no branch: the `demo_persona` cookie makes
    //   `/api/vault` serve the persona vault's logs.
    // - The oldest browser-only logs (`clearworth_cashflow`, pre-vault era) are
    //   migrated into SQLite once when the vault table is empty.
    useEffect(() => {
        let cancelled = false;
        const loadEntries = async () => {
            try {
                const res = await fetch('/api/vault?entity=cashFlow');
                if (!res.ok) throw new Error(`HTTP ${res.status}`);
                const json = await res.json();
                let loaded = ((json.data ?? []) as CashFlowRow[]).map(rowToEntry);
                // The one-time browser-log migration must never run against a
                // persona vault — that would surface the user's REAL old logs
                // in a sample-data view.
                if (loaded.length === 0 && !readDemoPersona()) {
                    const legacy = localStorage.getItem('clearworth_cashflow');
                    if (legacy) {
                        const parsed = JSON.parse(legacy);
                        if (Array.isArray(parsed) && parsed.length > 0) {
                            loaded = parsed;
                            parsed.forEach(item => {
                                persistScopedRecord('cashFlow', item).catch(() => { });
                            });
                        }
                    }
                }
                if (!cancelled) setEntries(loaded.sort(byMonthAsc));
            } catch (e) {
                console.error('Failed to load cash flow logs from SQLite:', e);
                if (!cancelled) setEntries([]);
            }
        };
        loadEntries();
        return () => { cancelled = true; };
    }, []);

    // Preset Period Handlers
    const handleSetPeriod = (preset: 'this_month' | 'last_month' | 'ytd') => {
        setPeriodPreset(preset);
        const now = new Date();
        if (preset === 'this_month') {
            const start = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
            setStartDate(start);
            setEndDate(today);
        } else if (preset === 'last_month') {
            const firstOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
            const lastOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0);
            const start = `${firstOfLastMonth.getFullYear()}-${String(firstOfLastMonth.getMonth() + 1).padStart(2, '0')}-01`;
            const end = `${lastOfLastMonth.getFullYear()}-${String(lastOfLastMonth.getMonth() + 1).padStart(2, '0')}-${String(lastOfLastMonth.getDate()).padStart(2, '0')}`;
            setStartDate(start);
            setEndDate(end);
        } else if (preset === 'ytd') {
            const start = `${now.getFullYear()}-01-01`;
            setStartDate(start);
            setEndDate(today);
        }
    };

    // Legacy manual handlers
    const handleSaveLegacyEntry = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setLegacyEntryError(null);
        const formData = new FormData(e.currentTarget);
        const month = formData.get('month') as string;
        const income = parseFloat(formData.get('income') as string);
        const expenses = parseFloat(formData.get('expenses') as string);

        if (!month || !/^\d{4}-(?:0[1-9]|1[0-2])$/.test(month)) {
            setLegacyEntryError('Please specify a valid month in YYYY-MM format.');
            return;
        }

        if (isNaN(income) || income < 0 || isNaN(expenses) || expenses < 0) {
            setLegacyEntryError('Income and expenses must be non-negative numbers.');
            return;
        }

        const existingForMonth = entries.find(entry => entry.month === month);
        const entryId = editingLegacyId || existingForMonth?.id || `cf-${month}`;

        const newEntry: CashFlowEntry = {
            id: entryId,
            month,
            income,
            expenses
        };

        try {
            // Why this exists:
            // Capture the authoritative `persisted` record returned by the vault:
            // re-saving an existing month reuses that row's primary key id, so a
            // later delete on the displayed row can never target a non-existent id.
            // Tricky logic:
            // In demo mode the route refuses this write with 403, which lands in
            // the catch below as the read-only error message.
            let persisted: CashFlowEntry;
            const saved = await persistScopedRecord('cashFlow', newEntry);
            persisted = (saved as any)?.item || saved || newEntry;
            const current = entries.filter(item => item.id !== persisted.id && item.month !== persisted.month);
            setEntries([...current, persisted].sort(byMonthAsc));
            setIsAddingLegacyEntry(false);
            setEditingLegacyId(null);
        } catch (err: any) {
            setLegacyEntryError(err.message || 'Failed to save cash flow record.');
        }
    };

    const handleDeleteLegacyEntry = async (id: string) => {
        if (confirm('Delete this entry?')) {
            try {
                // In demo mode the route refuses this with 403 → alert below.
                await deleteScopedRecord('cashFlow', id);
                // Update the displayed list only after the confirmed deletion.
                setEntries(entries.filter(e => e.id !== id));
            } catch (err: any) {
                alert(err.message || 'Failed to delete cash flow record.');
            }
        }
    };

    // Autopilot handlers
    const handleSaveRecurring = async (t: RecurringTransaction) => {
        const itemToSave = {
            ...t,
            id: t.id || crypto.randomUUID(),
            currency: t.currency || baseCurrency,
            end_date: t.end_date || undefined
        };

        if (editingRecurring) {
            await updateRecurringContext(itemToSave);
            setEditingRecurring(null);
        } else {
            await addRecurringContext(itemToSave);
            setIsAddingRecurring(false);
        }
    };

    const handleDeleteRecurring = async (id: string) => {
        if (confirm('Delete this recurring item?')) {
            await deleteRecurringContext(id);
        }
    };

    const handleToggleRecurring = async (id: string) => {
        const item = recurring.find(r => r.id === id);
        if (item) {
            await updateRecurringContext({ ...item, is_active: !item.is_active });
        }
    };

    // Actual Report Currencies
    const reportCurrencies = useMemo(() => {
        if (!cashFlowReport) return [];
        const startingCurrs = Object.keys(cashFlowReport.starting_cash_cents_by_currency || {});
        const inflowCurrs = Object.keys(cashFlowReport.operating_inflows_cents_by_currency || {});
        const outflowCurrs = Object.keys(cashFlowReport.operating_outflows_cents_by_currency || {});
        const observedCurrs = Object.keys(cashFlowReport.observed_liquid_balance_cents_by_currency || {});
        const endingCurrs = Object.keys(cashFlowReport.ending_cash_cents_by_currency || {});
        const coverageCurrs = Object.keys(cashFlowReport.liquid_account_coverage_by_currency || {});
        const liquidAccCurrs = Object.keys(cashFlowReport.liquid_accounts_by_currency || {});
        const allCurrs = new Set([
            ...startingCurrs,
            ...inflowCurrs,
            ...outflowCurrs,
            ...observedCurrs,
            ...endingCurrs,
            ...coverageCurrs,
            ...liquidAccCurrs
        ]);
        return Array.from(allCurrs) as CurrencyCode[];
    }, [cashFlowReport]);

    // Check if the period is balance-only (has starting/ending balance, but 0 posted transactions)
    const isBalanceOnlyPeriod = useMemo(() => {
        if (!cashFlowReport) return false;
        const hasBalanceOnlyCoverage = Object.values(cashFlowReport.liquid_account_coverage_by_currency || {}).some(
            c => c === 'balance_only'
        );
        return ((cashFlowReport.items || []).length === 0 && reportCurrencies.length > 0) || hasBalanceOnlyCoverage;
    }, [cashFlowReport, reportCurrencies]);

    const selectedEntity = entities.find(e => e.id === selectedEntityId);

    return (
        <div className="space-y-8 max-w-6xl mx-auto pb-20">
            {/* Header & Tabs */}
            <PageHeader
                title="Cash Flow"
                description="Master your actual inflows, outflows, and liquid movements with double-entry integrity."
                action={
                    <div className="flex bg-muted p-1 rounded-xl text-xs font-bold">
                        <button
                            onClick={() => setActiveTab('actual')}
                            className={`px-4 py-2 rounded-lg transition-all flex items-center gap-2 ${
                                activeTab === 'actual' ? 'bg-card shadow text-primary font-black' : 'text-muted-foreground hover:text-foreground'
                            }`}
                        >
                            <DollarSign size={15} />
                            Actual Cash Flow
                        </button>
                        <button
                            onClick={() => setActiveTab('autopilot')}
                            className={`px-4 py-2 rounded-lg transition-all flex items-center gap-2 ${
                                activeTab === 'autopilot' ? 'bg-card shadow text-blue-600 font-black' : 'text-muted-foreground hover:text-foreground'
                            }`}
                        >
                            <Repeat size={15} />
                            Autopilot Budgets
                        </button>
                        <button
                            onClick={() => setActiveTab('history')}
                            className={`px-4 py-2 rounded-lg transition-all flex items-center gap-2 ${
                                activeTab === 'history' ? 'bg-card shadow text-foreground font-black' : 'text-muted-foreground hover:text-foreground'
                            }`}
                        >
                            <History size={15} />
                            Manual Logs
                        </button>
                    </div>
                }
            />

            {/* TAB 1: ACTUAL CASH FLOW */}
            {activeTab === 'actual' && (
                <div className="space-y-6">
                    {/* Filter & Period Controls Bar */}
                    <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4 p-4 bg-card border border-border rounded-2xl shadow-sm">
                        {/* Scope Entity Selector */}
                        <div className="flex items-center gap-2">
                            <label className="text-xs font-bold text-muted-foreground whitespace-nowrap">Entity / Owner:</label>
                            <select
                                value={selectedEntityId}
                                onChange={(e) => setSelectedEntityId(e.target.value)}
                                disabled={isEntitiesLoading}
                                className="bg-background border border-border rounded-lg px-3 py-1.5 text-xs font-bold outline-none focus:ring-2 focus:ring-primary/20"
                            >
                                {entities.map(ent => (
                                    <option key={ent.id} value={ent.id}>
                                        {ent.name} ({ent.type})
                                    </option>
                                ))}
                                {entities.length === 0 && (
                                    <option value="">No entities found</option>
                                )}
                            </select>
                        </div>

                        {/* Explicit Period Selection */}
                        <div className="flex flex-wrap items-center gap-2">
                            <div className="flex bg-muted p-0.5 rounded-lg text-xs font-semibold">
                                <button
                                    onClick={() => handleSetPeriod('this_month')}
                                    className={`px-2.5 py-1 rounded-md transition ${periodPreset === 'this_month' ? 'bg-card shadow font-bold text-foreground' : 'text-muted-foreground'}`}
                                >
                                    This Month
                                </button>
                                <button
                                    onClick={() => handleSetPeriod('last_month')}
                                    className={`px-2.5 py-1 rounded-md transition ${periodPreset === 'last_month' ? 'bg-card shadow font-bold text-foreground' : 'text-muted-foreground'}`}
                                >
                                    Last Month
                                </button>
                                <button
                                    onClick={() => handleSetPeriod('ytd')}
                                    className={`px-2.5 py-1 rounded-md transition ${periodPreset === 'ytd' ? 'bg-card shadow font-bold text-foreground' : 'text-muted-foreground'}`}
                                >
                                    YTD
                                </button>
                            </div>

                            <div className="flex items-center gap-1.5 text-xs">
                                <input
                                    type="date"
                                    value={startDate}
                                    onChange={(e) => {
                                        setStartDate(e.target.value);
                                        setPeriodPreset('custom');
                                    }}
                                    className="bg-background border border-border rounded-lg px-2 py-1 text-xs outline-none font-mono"
                                />
                                <span className="text-muted-foreground font-bold">&rarr;</span>
                                <input
                                    type="date"
                                    value={endDate}
                                    onChange={(e) => {
                                        setEndDate(e.target.value);
                                        setPeriodPreset('custom');
                                    }}
                                    className="bg-background border border-border rounded-lg px-2 py-1 text-xs outline-none font-mono"
                                />
                            </div>

                            <button
                                onClick={fetchActualCashFlow}
                                disabled={isReportLoading}
                                className="p-1.5 text-muted-foreground hover:text-foreground rounded-lg border border-border hover:bg-muted transition"
                                title="Refresh Statement"
                            >
                                <RefreshCw size={15} className={isReportLoading ? 'animate-spin' : ''} />
                            </button>
                        </div>
                    </div>

                    {/* Entities Error Banner */}
                    {entitiesError && (
                        <div role="alert" className="p-4 bg-destructive/15 border border-destructive/30 text-destructive rounded-xl flex items-center justify-between text-xs font-semibold">
                            <div className="flex items-center gap-2">
                                <AlertTriangle size={16} className="shrink-0" />
                                <span>Failed to load entities: {entitiesError}</span>
                            </div>
                            <button
                                onClick={fetchEntities}
                                className="px-3 py-1 bg-destructive text-destructive-foreground rounded-lg font-bold hover:opacity-90"
                            >
                                Retry
                            </button>
                        </div>
                    )}

                    {/* Error Banner */}
                    {reportError && (
                        <div role="alert" className="p-4 bg-destructive/15 border border-destructive/30 text-destructive rounded-xl flex items-center justify-between text-xs font-semibold">
                            <div className="flex items-center gap-2">
                                <AlertTriangle size={16} className="shrink-0" />
                                <span>{reportError}</span>
                            </div>
                            <button
                                onClick={fetchActualCashFlow}
                                className="px-3 py-1 bg-destructive text-destructive-foreground rounded-lg font-bold hover:opacity-90"
                            >
                                Retry
                            </button>
                        </div>
                    )}

                    {/* Main Content Area: Mutually Exclusive Rendering States */}
                    {entitiesError ? (
                        <ContentCard className="text-center py-16 border border-destructive/30 bg-destructive/5">
                            <AlertTriangle className="w-10 h-10 text-destructive mx-auto mb-3" />
                            <h3 className="text-base font-bold text-foreground">Failed to Load Entities</h3>
                            <p className="text-xs text-muted-foreground mt-1 max-w-md mx-auto mb-4">
                                {entitiesError}
                            </p>
                            <button
                                onClick={fetchEntities}
                                className="px-4 py-2 bg-destructive text-destructive-foreground text-xs font-bold rounded-xl hover:opacity-90 transition"
                            >
                                Retry Loading
                            </button>
                        </ContentCard>
                    ) : isEntitiesLoading ? (
                        <ContentCard className="text-center py-16 border border-border">
                            <RefreshCw className="w-8 h-8 animate-spin text-primary mx-auto mb-3" />
                            <p className="text-sm font-medium text-muted-foreground">Loading sovereign entities...</p>
                        </ContentCard>
                    ) : entities.length === 0 ? (
                        <ContentCard className="text-center py-16 border border-border">
                            <FileText className="w-10 h-10 text-muted-foreground mx-auto mb-3 opacity-60" />
                            <h3 className="text-base font-bold text-foreground">No Sovereign Entities Found</h3>
                            <p className="text-xs text-muted-foreground mt-1 max-w-md mx-auto">
                                Cash flow statements require at least one sovereign entity (household or company) to establish account ownership.
                                Create an entity in Accounts to begin tracking actual cash flow.
                            </p>
                            <Link
                                href="/accounting?view=accounts"
                                className="inline-block mt-4 px-4 py-2 bg-primary text-primary-foreground text-xs font-bold rounded-xl"
                            >
                                Set Up in Accounts
                            </Link>
                        </ContentCard>
                    ) : isReportLoading ? (
                        <ContentCard className="text-center py-16 border border-border">
                            <RefreshCw className="w-8 h-8 animate-spin text-primary mx-auto mb-3" />
                            <p className="text-sm font-medium text-muted-foreground">Calculating double-entry cash flow statement...</p>
                        </ContentCard>
                    ) : reportError ? (
                        <ContentCard className="text-center py-16 border border-destructive/30 bg-destructive/5">
                            <AlertTriangle className="w-10 h-10 text-destructive mx-auto mb-3" />
                            <h3 className="text-base font-bold text-foreground">Unable to Load Cash Flow Statement</h3>
                            <p className="text-xs text-muted-foreground mt-1 max-w-md mx-auto mb-4">
                                {reportError}
                            </p>
                            <button
                                onClick={fetchActualCashFlow}
                                className="px-4 py-2 bg-destructive text-destructive-foreground text-xs font-bold rounded-xl hover:opacity-90 transition"
                            >
                                Retry Loading
                            </button>
                        </ContentCard>
                    ) : !cashFlowReport || reportCurrencies.length === 0 ? (
                        <ContentCard className="text-center py-16 border border-border">
                            <FileText className="w-10 h-10 text-muted-foreground mx-auto mb-3 opacity-60" />
                            <h3 className="text-base font-bold text-foreground">No Liquid Accounts Recorded</h3>
                            <p className="text-xs text-muted-foreground mt-1 max-w-md mx-auto">
                                Cash flow statements report actual liquidity movements in cash, checking, and savings accounts.
                                Add a bank account in Accounts to begin tracking actual cash flow.
                            </p>
                            <Link
                                href="/accounting?view=accounts"
                                className="inline-block mt-4 px-4 py-2 bg-primary text-primary-foreground text-xs font-bold rounded-xl"
                            >
                                Open Accounts
                            </Link>
                        </ContentCard>
                    ) : (
                        <div className="space-y-8">
                            {/* Multi-Currency Cards Breakdown */}
                            {reportCurrencies.map((curr) => {
                                const startingCents = cashFlowReport.starting_cash_cents_by_currency[curr] || 0;
                                const endingCents = cashFlowReport.ending_cash_cents_by_currency[curr] || 0;
                                const inflowsCents = cashFlowReport.operating_inflows_cents_by_currency[curr] || 0;
                                const outflowsCents = cashFlowReport.operating_outflows_cents_by_currency[curr] || 0;
                                const netCents = cashFlowReport.net_cash_change_cents_by_currency[curr] || 0;
                                const isReconciled = cashFlowReport.is_reconciled_by_currency?.[curr];
                                const discrepancyCents = cashFlowReport.reconciliation_discrepancy_cents_by_currency?.[curr] || 0;
                                const coverage = cashFlowReport.liquid_account_coverage_by_currency?.[curr] || 'ledger';
                                const observedCents = cashFlowReport.observed_liquid_balance_cents_by_currency?.[curr];
                                const formattedObserved = cashFlowReport.formatted_observed_liquid_balance_by_currency?.[curr];
                                const combinedCents = cashFlowReport.combined_known_balance_cents_by_currency?.[curr];
                                const formattedCombined = cashFlowReport.formatted_combined_known_balance_by_currency?.[curr];
                                const unrecordedCount = cashFlowReport.unrecorded_account_count_by_currency?.[curr] || 0;
                                const liquidAccounts = cashFlowReport.liquid_accounts_by_currency?.[curr] || [];

                                return (
                                    <div key={curr} className="space-y-4">
                                        <div className="flex items-center justify-between">
                                            <span className="text-xs font-black uppercase tracking-wider text-muted-foreground">
                                                Currency: {curr} &middot; Period: {startDate} to {cashFlowReport.end_date || endDate}
                                            </span>
                                            {isReconciled ? (
                                                <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/50 px-2 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-800">
                                                    <CheckCircle2 size={12} />
                                                    Reconciled with Ledger
                                                </span>
                                            ) : coverage === 'balance_only' ? (
                                                <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/50 px-2 py-0.5 rounded-full border border-amber-200 dark:border-amber-800">
                                                    <Info size={12} />
                                                    Observation Basis (No Transactions)
                                                </span>
                                            ) : coverage === 'mixed' ? (
                                                <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/50 px-2 py-0.5 rounded-full border border-amber-200 dark:border-amber-800">
                                                    <Info size={12} />
                                                    Mixed Coverage (Observation & Ledger)
                                                </span>
                                            ) : coverage === 'unknown' ? (
                                                <span className="inline-flex items-center gap-1 text-[11px] font-bold text-muted-foreground bg-muted px-2 py-0.5 rounded-full border border-border">
                                                    <Info size={12} />
                                                    Balance Not Recorded
                                                </span>
                                            ) : discrepancyCents !== 0 ? (
                                                <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/50 px-2 py-0.5 rounded-full border border-amber-200 dark:border-amber-800">
                                                    <AlertTriangle size={12} />
                                                    Discrepancy: {formatMoney({ amount_cents: discrepancyCents, currency: curr })}
                                                </span>
                                            ) : null}
                                        </div>

                                        {/* Scoped Currency Notice: Balance-Only */}
                                        {coverage === 'balance_only' && (
                                            <div className="p-4 bg-blue-50/70 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 rounded-xl flex items-start gap-3 text-xs text-blue-900 dark:text-blue-200">
                                                <Info size={18} className="shrink-0 text-blue-600 mt-0.5" />
                                                <div>
                                                    <span className="font-bold">Balance-Only Period Coverage: </span>
                                                    <span>
                                                        No posted transactions are recorded for this period. A balance observation establishes account valuation, but does not establish income or spending. Transaction coverage is required to calculate actual inflows and outflows; zero activity is not assumed, and reconciliation is not applicable.
                                                    </span>
                                                </div>
                                            </div>
                                        )}

                                        {/* Scoped Currency Notice: Balance Not Recorded */}
                                        {coverage === 'unknown' && (
                                            <div className="p-4 bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl flex items-start gap-3 text-xs text-muted-foreground">
                                                <Info size={18} className="shrink-0 text-muted-foreground mt-0.5" />
                                                <div>
                                                    <span className="font-bold">Balance Not Recorded ({curr}): </span>
                                                    <span>
                                                        No accepted balance observations or ledger transactions exist for liquid accounts in this currency.
                                                        Transaction coverage is required to calculate actual inflows and outflows; zero activity is not assumed, and reconciliation is not applicable.
                                                    </span>
                                                </div>
                                            </div>
                                        )}

                                        {/* Scoped Currency Notice: Mixed Tracking */}
                                        {coverage === 'mixed' && (
                                            <div className="p-4 bg-amber-50/70 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 rounded-xl flex items-start gap-3 text-xs text-amber-900 dark:text-amber-200">
                                                <Info size={18} className="shrink-0 text-amber-600 mt-0.5" />
                                                <div>
                                                    <span className="font-bold">Mixed Tracking Coverage ({curr}): </span>
                                                    <span>
                                                        Some liquid accounts rely on balance observations while others record ledger transactions.
                                                        Cash-flow movements reflect recorded transactions only, not total currency activity. The combined known balance aggregates both sources without double counting.
                                                    </span>
                                                </div>
                                            </div>
                                        )}

                                        {/* Scoped Currency Notice: Unrecorded Accounts */}
                                        {unrecordedCount > 0 && (
                                            <div className="p-3 bg-muted/60 border border-border rounded-xl flex items-center gap-2 text-xs text-muted-foreground">
                                                <Info size={15} className="shrink-0" />
                                                <span>
                                                    {unrecordedCount} liquid account{unrecordedCount > 1 ? 's have' : ' has'} no recorded balance or observation. Reported balances represent known coverage only.
                                                </span>
                                            </div>
                                        )}

                                        {/* Financial Summary Cards */}
                                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                                            {/* Operating Inflows */}
                                            <ContentCard className="p-5 border border-border">
                                                <div className="flex items-center gap-2 mb-2 text-emerald-600">
                                                    <TrendingUp size={18} />
                                                    <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Operating Inflows</span>
                                                </div>
                                                {coverage === 'balance_only' || coverage === 'unknown' ? (
                                                    <p className="text-sm font-bold text-muted-foreground py-1">
                                                        Not enough transaction history
                                                    </p>
                                                ) : (
                                                    <p className="text-2xl font-black font-mono text-emerald-600">
                                                        +{formatMoney({ amount_cents: inflowsCents, currency: curr })}
                                                    </p>
                                                )}
                                                <span className="text-[10px] text-muted-foreground">
                                                    {coverage === 'balance_only' || coverage === 'unknown'
                                                        ? 'Observation basis; transactions unrecorded'
                                                        : coverage === 'mixed'
                                                        ? 'Recorded movements with incomplete coverage'
                                                        : 'Income & customer payments'}
                                                </span>
                                            </ContentCard>

                                            {/* Operating Outflows */}
                                            <ContentCard className="p-5 border border-border">
                                                <div className="flex items-center gap-2 mb-2 text-rose-500">
                                                    <TrendingDown size={18} />
                                                    <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Operating Outflows</span>
                                                </div>
                                                {coverage === 'balance_only' || coverage === 'unknown' ? (
                                                    <p className="text-sm font-bold text-muted-foreground py-1">
                                                        Not enough transaction history
                                                    </p>
                                                ) : (
                                                    <p className="text-2xl font-black font-mono text-rose-500">
                                                        -{formatMoney({ amount_cents: outflowsCents, currency: curr })}
                                                    </p>
                                                )}
                                                <span className="text-[10px] text-muted-foreground">
                                                    {coverage === 'balance_only' || coverage === 'unknown'
                                                        ? 'Observation basis; transactions unrecorded'
                                                        : coverage === 'mixed'
                                                        ? 'Recorded movements with incomplete coverage'
                                                        : 'Expenses & bill spending'}
                                                </span>
                                            </ContentCard>

                                            {/* Net Cash Change */}
                                            <ContentCard className="p-5 border border-border">
                                                <div className="flex items-center gap-2 mb-2 text-primary">
                                                    <DollarSign size={18} />
                                                    <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Net Cash Change</span>
                                                </div>
                                                {coverage === 'balance_only' || coverage === 'unknown' ? (
                                                    <p className="text-sm font-bold text-muted-foreground py-1">
                                                        Not enough transaction history
                                                    </p>
                                                ) : (
                                                    <p className={`text-2xl font-black font-mono ${netCents >= 0 ? 'text-emerald-600' : 'text-rose-500'}`}>
                                                        {netCents >= 0 ? '+' : '-'}{formatMoney({ amount_cents: Math.abs(netCents), currency: curr })}
                                                    </p>
                                                )}
                                                <span className="text-[10px] text-muted-foreground">
                                                    {coverage === 'balance_only' || coverage === 'unknown'
                                                        ? 'Cannot establish net movement without transactions'
                                                        : coverage === 'mixed'
                                                        ? 'Net recorded movement'
                                                        : 'Net external movement'}
                                                </span>
                                            </ContentCard>

                                            {/* Ending Cash Position / Known Observed Balance / Combined Known Balance */}
                                            <ContentCard className="p-5 border border-border bg-muted/20">
                                                <div className="flex items-center gap-2 mb-2 text-foreground">
                                                    <Layers size={18} />
                                                    <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                                                        {/* Why this code exists:
                                                            When an account has no recorded balance observations and no transactions,
                                                            we must clearly show that balance is unrecorded, rather than claiming a known liquid balance.
                                                            Tricky logic: Only when coverage is explicitly 'unknown' does headline Card 4 display
                                                            'Balance Not Recorded' with value 'Unknown'.
                                                            TODO: Support multi-currency balance not recorded summary in milestone 2. */}
                                                        {coverage === 'balance_only'
                                                            ? 'Known Observed Balance'
                                                            : coverage === 'mixed'
                                                            ? 'Combined Known Balance'
                                                            : coverage === 'unknown'
                                                            ? 'Balance Not Recorded'
                                                            : 'Liquid Cash Balance'}
                                                    </span>
                                                </div>
                                                <p className="text-2xl font-black font-mono text-foreground">
                                                    {coverage === 'balance_only'
                                                        ? (observedCents !== null && observedCents !== undefined
                                                            ? (formattedObserved || formatMoney({ amount_cents: observedCents, currency: curr }))
                                                            : 'Unknown')
                                                        : coverage === 'mixed'
                                                        ? (formattedCombined || formatMoney({ amount_cents: combinedCents ?? 0, currency: curr }))
                                                        : coverage === 'unknown'
                                                        ? 'Unknown'
                                                        : formatMoney({ amount_cents: endingCents, currency: curr })}
                                                </p>
                                                <span className="text-[10px] text-muted-foreground">
                                                    {coverage === 'balance_only'
                                                        ? 'Observation basis; movements cannot be established'
                                                        : coverage === 'mixed'
                                                        ? 'Combines observed and ledger balances without double counting'
                                                        : coverage === 'unknown'
                                                        ? 'No balance observations or transactions recorded'
                                                        : `Starting: ${formatMoney({ amount_cents: startingCents, currency: curr })}`}
                                                </span>
                                            </ContentCard>
                                        </div>

                                        {/* Liquid Accounts Balance Breakdown Table */}
                                        {liquidAccounts.length > 0 && (
                                            <ContentCard className="overflow-hidden p-0 border border-border shadow-sm">
                                                <div className="px-6 py-4 bg-muted/40 border-b border-border flex flex-col sm:flex-row justify-between sm:items-center gap-2">
                                                    <div>
                                                        <h4 className="font-bold text-foreground text-xs uppercase tracking-wider">
                                                            Liquid Accounts Balance Breakdown ({curr})
                                                        </h4>
                                                        <p className="text-[11px] text-muted-foreground">
                                                            Distinguishes recorded ledger closing balances from balances supported by observations.
                                                        </p>
                                                    </div>
                                                    <span className="text-[11px] text-muted-foreground font-semibold">
                                                        Each account contributes once without double counting
                                                    </span>
                                                </div>

                                                <table className="w-full text-left text-xs">
                                                    <thead className="bg-muted/60 text-muted-foreground uppercase font-black tracking-wider border-b border-border text-[10px]">
                                                        <tr>
                                                            <th className="px-6 py-2.5">Account</th>
                                                            <th className="px-6 py-2.5">Tracking Mode</th>
                                                            <th className="px-6 py-2.5">Evidence Basis & Date</th>
                                                            <th className="px-6 py-2.5 text-right">Balance</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody className="divide-y divide-border font-medium">
                                                        {liquidAccounts.map((acc) => (
                                                            <tr key={acc.account_id} className="hover:bg-muted/30">
                                                                <td className="px-6 py-2.5 font-bold text-foreground">
                                                                    {acc.account_name}
                                                                </td>
                                                                <td className="px-6 py-2.5 capitalize text-muted-foreground">
                                                                    <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold ${
                                                                        acc.tracking_mode === 'transactions'
                                                                            ? 'bg-blue-50 dark:bg-blue-950/60 text-blue-600'
                                                                            : 'bg-amber-50 dark:bg-amber-950/60 text-amber-600'
                                                                    }`}>
                                                                        {acc.tracking_mode === 'transactions' ? 'transactions (ledger)' : 'balance'}
                                                                    </span>
                                                                </td>
                                                                <td className="px-6 py-2.5 text-muted-foreground font-mono text-[11px]">
                                                                    {acc.basis === 'observation'
                                                                        ? `Observed on ${acc.as_of_date || 'N/A'}`
                                                                        : acc.basis === 'ledger'
                                                                        ? `Ledger closing balance (${acc.as_of_date || 'period end'})`
                                                                        : 'No observation or transactions'}
                                                                </td>
                                                                <td className="px-6 py-2.5 text-right font-mono font-bold">
                                                                    {acc.is_unknown ? (
                                                                        <span className="italic text-muted-foreground">Unknown</span>
                                                                    ) : (
                                                                        acc.formatted_balance
                                                                    )}
                                                                </td>
                                                            </tr>
                                                        ))}
                                                    </tbody>
                                                    <tfoot className="bg-muted/40 font-bold border-t border-border text-xs">
                                                        <tr>
                                                            <td colSpan={3} className="px-6 py-3 text-muted-foreground">
                                                                {/* Why this code exists:
                                                                    When coverage is unknown, footer must not display 'Ending Liquid Balance'
                                                                    or claim a zero balance. Instead it displays 'Balance Subtotal' with value 'Unknown'.
                                                                    Tricky logic: In mixed mode with unrecorded accounts, the unrecorded accounts note is shown,
                                                                    but when ALL accounts are unknown, the parent banner already discloses this.
                                                                    TODO: Add breakdown export for accountants in milestone 2. */}
                                                                {coverage === 'mixed'
                                                                    ? 'Combined Known Balance'
                                                                    : coverage === 'balance_only'
                                                                    ? 'Known Observed Balance Subtotal'
                                                                    : coverage === 'unknown'
                                                                    ? 'Balance Subtotal'
                                                                    : 'Ending Liquid Balance'}
                                                                {unrecordedCount > 0 && coverage !== 'unknown' && (
                                                                    <span className="font-normal text-[11px] text-muted-foreground ml-2">
                                                                        ({unrecordedCount} account{unrecordedCount > 1 ? 's' : ''} with unknown balance excluded)
                                                                    </span>
                                                                )}
                                                            </td>
                                                            <td className="px-6 py-3 text-right font-mono text-foreground font-black">
                                                                {coverage === 'mixed'
                                                                    ? (formattedCombined || formatMoney({ amount_cents: combinedCents ?? 0, currency: curr }))
                                                                    : coverage === 'balance_only'
                                                                    ? (formattedObserved || (observedCents !== null && observedCents !== undefined ? formatMoney({ amount_cents: observedCents, currency: curr }) : 'Unknown'))
                                                                    : coverage === 'unknown'
                                                                    ? 'Unknown'
                                                                    : formatMoney({ amount_cents: endingCents, currency: curr })}
                                                            </td>
                                                        </tr>
                                                    </tfoot>
                                                </table>
                                            </ContentCard>
                                        )}
                                    </div>
                                );
                            })}

                            {/* Itemized Cash Movements Ledger Table */}
                            <ContentCard className="overflow-hidden p-0 border border-border shadow-sm">
                                <div className="px-6 py-4 bg-muted/40 border-b border-border flex justify-between items-center">
                                    <div>
                                        <h3 className="font-bold text-foreground text-sm">
                                            Posted Cash Activity & Movements ({cashFlowReport.items.length})
                                        </h3>
                                        <p className="text-xs text-muted-foreground">
                                            Only verified posted double-entry journal postings. Internal transfers net to $0.
                                        </p>
                                    </div>
                                    <span className="text-xs text-muted-foreground font-semibold">
                                        Excludes drafts and voided transactions
                                    </span>
                                </div>

                                <table className="w-full text-left text-xs">
                                    <thead className="bg-muted text-muted-foreground uppercase font-black tracking-wider border-b border-border">
                                        <tr>
                                            <th className="px-6 py-3">Date</th>
                                            <th className="px-6 py-3">Description & Counterparty</th>
                                            <th className="px-6 py-3">Account</th>
                                            <th className="px-6 py-3">Classification</th>
                                            <th className="px-6 py-3 text-right">Amount</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-border font-medium">
                                        {cashFlowReport.items.length === 0 ? (
                                            <tr>
                                                <td colSpan={5} className="px-6 py-10 text-center text-muted-foreground italic">
                                                    No cash transactions posted during this period.
                                                </td>
                                            </tr>
                                        ) : (
                                            cashFlowReport.items.map((item, idx) => {
                                                const isTransfer = item.activity_type === 'transfer';
                                                const isOutflow = item.amount_cents < 0;

                                                return (
                                                    <tr key={`${item.transaction_id}-${idx}`} className="hover:bg-muted/40">
                                                        <td className="px-6 py-3 font-mono text-muted-foreground whitespace-nowrap">
                                                            {item.date}
                                                        </td>
                                                        <td className="px-6 py-3">
                                                            <div className="font-bold text-foreground">{item.description}</div>
                                                            {item.payee_or_payer && (
                                                                <div className="text-[11px] text-muted-foreground">
                                                                    {item.payee_or_payer}
                                                                </div>
                                                            )}
                                                        </td>
                                                        <td className="px-6 py-3 font-semibold text-muted-foreground">
                                                            {item.cash_account_name}
                                                        </td>
                                                        <td className="px-6 py-3">
                                                            <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                                                                isTransfer
                                                                    ? 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
                                                                    : item.activity_type === 'operating' && !isOutflow
                                                                    ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600'
                                                                    : item.activity_type === 'operating' && isOutflow
                                                                    ? 'bg-rose-50 dark:bg-rose-950/60 text-rose-500'
                                                                    : 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600'
                                                            }`}>
                                                                {isTransfer
                                                                    ? 'Transfer'
                                                                    : item.activity_type === 'operating'
                                                                    ? (isOutflow ? 'Operating Outflow' : 'Operating Inflow')
                                                                    : item.activity_type}
                                                            </span>
                                                        </td>
                                                        <td className={`px-6 py-3 text-right font-mono font-black ${
                                                            isTransfer
                                                                ? 'text-muted-foreground'
                                                                : isOutflow
                                                                ? 'text-rose-500'
                                                                : 'text-emerald-600'
                                                        }`}>
                                                            {isOutflow ? '-' : isTransfer ? '' : '+'}
                                                            {formatMoney({ amount_cents: Math.abs(item.amount_cents), currency: item.currency })}
                                                        </td>
                                                    </tr>
                                                );
                                            })
                                        )}
                                    </tbody>
                                </table>
                            </ContentCard>
                        </div>
                    )}
                </div>
            )}

            {/* TAB 2: AUTOPILOT BUDGETS */}
            {activeTab === 'autopilot' && (
                <div className="space-y-6">
                    <div className="bg-blue-50 dark:bg-blue-950/40 border border-blue-100 dark:border-blue-900 p-6 rounded-2xl flex items-start gap-4">
                        <div className="p-3 bg-white dark:bg-slate-900 rounded-xl shadow-sm text-blue-600">
                            <Repeat size={24} />
                        </div>
                        <div>
                            <h3 className="font-bold text-blue-900 dark:text-blue-200 text-lg">Autopilot Scheduled Inflows & Outflows</h3>
                            <p className="text-blue-700 dark:text-blue-300 text-sm mt-1 leading-relaxed">
                                Define recurring income and expense commitments. These budgets are kept strictly separate from your actual double-entry postings.
                            </p>
                        </div>
                        <div className="ml-auto">
                            <button
                                onClick={() => setIsAddingRecurring(true)}
                                className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold transition-colors shadow-sm text-sm"
                            >
                                <Plus size={18} />
                                Add Item
                            </button>
                        </div>
                    </div>

                    <RecurringList
                        transactions={recurring}
                        onEdit={setEditingRecurring}
                        onDelete={handleDeleteRecurring}
                        onToggle={handleToggleRecurring}
                        currencyCode={baseCurrency}
                    />

                    {(isAddingRecurring || editingRecurring) && (
                        <RecurringTransactionForm
                            initialData={editingRecurring}
                            onSave={handleSaveRecurring}
                            onCancel={() => {
                                setIsAddingRecurring(false);
                                setEditingRecurring(null);
                            }}
                        />
                    )}
                </div>
            )}

            {/* TAB 3: MANUAL MONTHLY LOGS (LEGACY) */}
            {activeTab === 'history' && (
                <div className="space-y-6">
                    <div className="flex justify-between items-center">
                        <p className="text-xs text-muted-foreground">
                            Legacy manual monthly cash flow estimates. These records are kept separate from double-entry accounting.
                        </p>
                        <button
                            onClick={() => setIsAddingLegacyEntry(true)}
                            className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold transition-colors text-xs"
                        >
                            <Plus size={16} />
                            Log Month
                        </button>
                    </div>

                    {isAddingLegacyEntry && (
                        <ContentCard className="border-2 border-emerald-100 mb-6">
                            <h3 className="text-base font-bold text-emerald-900 dark:text-emerald-200 mb-3">
                                {editingLegacyId ? 'Edit Manual Log' : 'Log Manual Monthly Cash Flow'}
                            </h3>
                            {legacyEntryError && (
                                <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl font-medium">
                                    {legacyEntryError}
                                </div>
                            )}
                            <form className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end" onSubmit={handleSaveLegacyEntry}>
                                <div className="space-y-1">
                                    <label htmlFor="cf-month" className="text-xs font-bold text-muted-foreground">Month</label>
                                    <input
                                        id="cf-month"
                                        name="month"
                                        type="month"
                                        defaultValue={entries.find(e => e.id === editingLegacyId)?.month || today.slice(0, 7)}
                                        className="w-full bg-muted border border-border rounded-lg p-2 outline-none text-xs"
                                        required
                                    />
                                </div>
                                <div className="space-y-1">
                                    <label htmlFor="cf-income" className="text-xs font-bold text-muted-foreground">Income ({baseCurrency})</label>
                                    <input
                                        id="cf-income"
                                        name="income"
                                        type="number"
                                        step="0.01"
                                        defaultValue={entries.find(e => e.id === editingLegacyId)?.income ?? ''}
                                        placeholder="0.00"
                                        className="w-full bg-muted border border-border rounded-lg p-2 outline-none text-xs"
                                        required
                                    />
                                </div>
                                <div className="space-y-1">
                                    <label htmlFor="cf-expenses" className="text-xs font-bold text-muted-foreground">Expenses ({baseCurrency})</label>
                                    <input
                                        id="cf-expenses"
                                        name="expenses"
                                        type="number"
                                        step="0.01"
                                        defaultValue={entries.find(e => e.id === editingLegacyId)?.expenses ?? ''}
                                        placeholder="0.00"
                                        className="w-full bg-muted border border-border rounded-lg p-2 outline-none text-xs"
                                        required
                                    />
                                </div>
                                <div className="flex gap-2">
                                    <button type="submit" className="flex-1 bg-primary text-primary-foreground rounded-lg p-2 text-xs font-bold">Save</button>
                                    <button type="button" onClick={() => { setIsAddingLegacyEntry(false); setEditingLegacyId(null); }} className="px-3 py-2 text-muted-foreground text-xs font-medium">Cancel</button>
                                </div>
                            </form>
                        </ContentCard>
                    )}

                    <ContentCard className="overflow-hidden p-0 border border-border">
                        <table className="w-full text-left text-xs">
                            <thead className="bg-muted text-muted-foreground uppercase font-bold border-b border-border">
                                <tr>
                                    <th className="px-6 py-3">Month</th>
                                    <th className="px-6 py-3 text-right">Income</th>
                                    <th className="px-6 py-3 text-right">Expenses</th>
                                    <th className="px-6 py-3 text-right">Net</th>
                                    <th className="px-6 py-3 text-center">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-border">
                                {entries.length === 0 ? (
                                    <tr>
                                        <td colSpan={5} className="px-6 py-8 text-center text-muted-foreground italic">
                                            No manual entries logged.
                                        </td>
                                    </tr>
                                ) : (
                                    entries.slice().reverse().map(entry => {
                                        const inc = convertAmount(entry.income, 'USD', baseCurrency);
                                        const exp = convertAmount(entry.expenses, 'USD', baseCurrency);
                                        const netVal = inc - exp;
                                        return (
                                            <tr key={entry.id} className="hover:bg-muted/30">
                                                <td className="px-6 py-3 font-bold text-foreground">{entry.month}</td>
                                                <td className="px-6 py-3 text-right text-emerald-600 font-mono font-bold">+{formatCurrency(inc, baseCurrency)}</td>
                                                <td className="px-6 py-3 text-right text-rose-500 font-mono font-bold">-{formatCurrency(exp, baseCurrency)}</td>
                                                <td className="px-6 py-3 text-right font-mono font-black">{formatCurrency(netVal, baseCurrency)}</td>
                                                <td className="px-6 py-3 text-center">
                                                    <div className="flex items-center justify-center gap-2">
                                                        <button
                                                            onClick={() => {
                                                                setIsAddingLegacyEntry(true);
                                                                setEditingLegacyId(entry.id);
                                                            }}
                                                            className="text-muted-foreground hover:text-primary"
                                                        >
                                                            Edit
                                                        </button>
                                                        <button
                                                            onClick={() => handleDeleteLegacyEntry(entry.id)}
                                                            className="text-muted-foreground hover:text-destructive"
                                                        >
                                                            Delete
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })
                                )}
                            </tbody>
                        </table>
                    </ContentCard>
                </div>
            )}
        </div>
    );
};
