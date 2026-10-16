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
    FileText,
    Zap,
    Target
} from 'lucide-react';
import { RecurringTransaction, CashFlowEntry } from '@/features/cashflow/types';
import RecurringList from '@/features/cashflow/components/RecurringList';
import RecurringTransactionForm from '@/features/cashflow/components/RecurringTransactionForm';
import { useCashflowQuery } from '@/features/cashflow/hooks/useCashflowQuery';
import { useBudgetsQuery } from '@/features/cashflow/hooks/useBudgetsQuery';
import { BudgetVsActualReport, type Budget } from '@/features/cashflow/data/budgetRepository';
import { CashFlowForecastReport } from '@/features/cashflow/data/repository';
import ForecastChart from '@/features/cashflow/components/ForecastChart';
import { formatCurrency, convertAmount } from '@/lib/utils/currencyService';
import { useNetWorth } from '@/features/dashboard/hooks/useNetWorth';
import { PageHeader } from '@/components/common/PageHeader';
import { ContentCard } from '@/components/common/ContentCard';
import { persistScopedRecord, deleteScopedRecord } from '@/infrastructure/local_driver';
import { readDemoPersona } from '@/features/demo/demoMode';
import {
    applyRecurringToMonth,
    applyDebtPaymentsToMonth,
    AutopilotGenerationResult,
    AutopilotDebt,
    DebtAutopilotGenerationResult,
    DebtAutopilotSkipReason
} from '@/features/cashflow/data/autopilotGenerator';
import { Entity, CashFlowStatementResult, CashFlowItem, CurrencyCode, formatMoney } from '@/lib/domain/accounting/types';
import { getLocalTodayCalendarDate } from '@/lib/domain/calendarDate';
import Link from 'next/link';

/** Raw `cash_flow_summaries` row shape returned by the entity-scoped vault GET. */
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

/** Human date for forecast event lists and balance cards (calendar strings are UTC-parsed). */
const formatForecastDate = (dateStr: string) =>
    new Date(dateStr).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });

/** Canonical expense sub_types offered as budget category suggestions (free text allowed — Autopilot postings create their own). */
const CANONICAL_EXPENSE_CATEGORIES = [
    'living_expense', 'groceries', 'utilities', 'loan_interest',
    'bank_fee', 'repairs_maintenance', 'property_management'
];

/** Currency choices for the budget form — the ledger never converts between them. */
const BUDGET_CURRENCY_OPTIONS = ['USD', 'AUD', 'EUR', 'GBP', 'CAD', 'NZD', 'CHF', 'JPY', 'SGD', 'HKD'];

/** Liquid account option for the Autopilot funding-account selector. */
interface FundingAccountOption {
    id: string;
    name: string;
    currency: string;
    formatted_balance: string;
}

/** Human copy for each debt autopilot skip reason (result-card disclosure). */
const DEBT_SKIP_REASON_COPY: Record<DebtAutopilotSkipReason, string> = {
    inactive: 'The account is inactive.',
    no_explicit_minimum: 'Set a minimum payment on the account to autopay it.',
    currency_mismatch: 'Different currency than the funding account.',
    covered_by_recurring_schedule: 'A Debt Repayment schedule already covers this month.',
    nothing_owed: 'The balance is zero or paid off.',
    already_paid: 'A payment was already posted this month.'
};

export const CashflowPage = () => {
    const { baseCurrency } = useNetWorth();

    // Tab view: actual (default) | autopilot | history | budgets | forecast
    const [activeTab, setActiveTab] = useState<'actual' | 'autopilot' | 'history' | 'budgets' | 'forecast'>('actual');

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

    // --- AUTOPILOT GENERATION STATE ---
    // The generator never guesses where money moves: the panel pins an explicit
    // funding account (liquid, same currency) before schedules become real
    // ledger postings with origin='recurring'.
    const isDemoMode = Boolean(readDemoPersona());
    const [autopilotMonth, setAutopilotMonth] = useState<string>(today.slice(0, 7));
    const [fundingAccounts, setFundingAccounts] = useState<FundingAccountOption[]>([]);
    // Liability accounts for the debt autopilot — derived from the same
    // GET /api/accounting response as the funding accounts above.
    const [debtAccounts, setDebtAccounts] = useState<AutopilotDebt[]>([]);
    const [selectedBankAccountId, setSelectedBankAccountId] = useState<string>('');
    const [isGenerating, setIsGenerating] = useState<boolean>(false);
    const [generationResult, setGenerationResult] = useState<AutopilotGenerationResult | null>(null);
    const [debtGenerationResult, setDebtGenerationResult] = useState<DebtAutopilotGenerationResult | null>(null);
    const [generationError, setGenerationError] = useState<string | null>(null);

    // --- BUDGETS STATE ---
    // Monthly per-category spending limits (entity-scoped `budgets` table).
    // The Actual tab comparison card renders `budgetReport`, fetched alongside
    // the cash flow statement so both always share one explicit period.
    const {
        budgets,
        addBudget,
        updateBudget,
        deleteBudget,
    } = useBudgetsQuery(selectedEntityId);
    const [budgetReport, setBudgetReport] = useState<BudgetVsActualReport | null>(null);
    const [isAddingBudget, setIsAddingBudget] = useState(false);
    const [editingBudget, setEditingBudget] = useState<Budget | null>(null);
    const [budgetError, setBudgetError] = useState<string | null>(null);

    // --- FORECAST STATE ---
    // Forward-looking projection from today (recurring schedules + budgets).
    // The horizon is clamped server-side to [30, 180]; the selector offers the
    // three planning windows the service accepts without surprise rounding.
    const [forecastReport, setForecastReport] = useState<CashFlowForecastReport | null>(null);
    const [isForecastLoading, setIsForecastLoading] = useState<boolean>(false);
    const [forecastError, setForecastError] = useState<string | null>(null);
    const [forecastHorizonDays, setForecastHorizonDays] = useState<number>(90);

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
            setBudgetReport(null);
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

            // Budget vs actual rides the same explicit period params. It has its
            // own guard so a comparison failure never breaks the statement itself.
            try {
                const budgetParams = new URLSearchParams({
                    view: 'reports',
                    report_type: 'budget_vs_actual',
                    entity_id: selectedEntityId,
                    start_date: startDate,
                    end_date: endDate
                });
                const budgetRes = await fetch(`/api/accounting?${budgetParams.toString()}`);
                const budgetJson = budgetRes.ok ? await budgetRes.json() : null;
                setBudgetReport(budgetJson?.success && budgetJson.report ? budgetJson.report : null);
            } catch {
                setBudgetReport(null);
            }
        } catch (err: any) {
            console.error('Failed to fetch actual cash flow statement:', err);
            setReportError(err.message || 'Failed to load cash flow statement');
            setCashFlowReport(null);
            setBudgetReport(null);
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

    // Fetch the forward projection. It is always anchored at today — no period
    // params — and refetches whenever Autopilot postings or budgets change
    // (both dispatch 'opennetworth_balances_updated'), so a generated month's
    // wire disappears from the projection instead of double-counting.
    const fetchForecast = useCallback(async () => {
        if (!selectedEntityId) {
            setForecastReport(null);
            return;
        }
        setIsForecastLoading(true);
        setForecastError(null);
        try {
            const params = new URLSearchParams({
                view: 'reports',
                report_type: 'cash_flow_forecast',
                entity_id: selectedEntityId,
                horizon_days: String(forecastHorizonDays)
            });
            const res = await fetch(`/api/accounting?${params.toString()}`);
            if (!res.ok) {
                const errData = await res.json().catch(() => ({}));
                throw new Error(errData.error || `HTTP ${res.status}`);
            }
            const data = await res.json();
            setForecastReport(data.success && data.report ? data.report : null);
        } catch (err: any) {
            console.error('Failed to fetch cash flow forecast:', err);
            setForecastError(err.message || 'Failed to load cash flow forecast');
            setForecastReport(null);
        } finally {
            setIsForecastLoading(false);
        }
    }, [selectedEntityId, forecastHorizonDays]);

    useEffect(() => {
        if (selectedEntityId) {
            fetchForecast();
        }

        const handleForecastBalancesUpdated = () => {
            fetchForecast();
        };

        window.addEventListener('opennetworth_balances_updated', handleForecastBalancesUpdated);
        return () => {
            window.removeEventListener('opennetworth_balances_updated', handleForecastBalancesUpdated);
        };
    }, [selectedEntityId, forecastHorizonDays, fetchForecast]);

    // Load Manual Logs history from the SQLite vault.
    // Why this exists:
    // The monthly logs live in `cash_flow_summaries` (renamed to `cash_flow_summaries`
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

    // Load the liquid accounts that can fund Autopilot generation for the
    // selected entity. The ledger API returns every account with balances;
    // only cash/checking/savings assets can receive or pay a schedule.
    // The same response carries the liabilities for the debt autopilot — one
    // fetch feeds both selectors, so funding and debt state never disagree.
    useEffect(() => {
        if (!selectedEntityId) {
            setFundingAccounts([]);
            setDebtAccounts([]);
            setSelectedBankAccountId('');
            return;
        }
        let cancelled = false;
        const loadFundingAccounts = async () => {
            try {
                const res = await fetch(`/api/accounting?entity_id=${encodeURIComponent(selectedEntityId)}`);
                if (!res.ok) throw new Error(`HTTP ${res.status}`);
                const data = await res.json();
                const accounts = (data.accounts ?? []) as any[];
                const liquid = accounts
                    .filter(a => a.type === 'asset'
                        && ['cash', 'checking', 'savings'].includes(a.sub_type)
                        && a.is_active !== false)
                    .map(a => ({
                        id: a.id,
                        name: a.name,
                        currency: a.currency,
                        formatted_balance: a.formatted_balance
                    }));
                // is_active arrives as a boolean from the GET route; keep
                // inactive liabilities out of the attempt list entirely.
                const debts: AutopilotDebt[] = accounts
                    .filter(a => a.type === 'liability' && a.is_active !== false)
                    .map(a => ({
                        id: a.id,
                        name: a.name,
                        sub_type: a.sub_type ?? '',
                        currency: a.currency,
                        minimum_payment_cents: a.minimum_payment_cents ?? null,
                        balance_cents: a.balance_cents ?? null,
                        is_active: a.is_active !== false
                    }));
                if (!cancelled) {
                    setFundingAccounts(liquid);
                    setDebtAccounts(debts);
                    setSelectedBankAccountId(prev =>
                        liquid.some(a => a.id === prev) ? prev : (liquid[0]?.id ?? ''));
                }
            } catch (e) {
                console.error('Failed to load liquid accounts for Autopilot:', e);
                if (!cancelled) {
                    setFundingAccounts([]);
                    setDebtAccounts([]);
                    setSelectedBankAccountId('');
                }
            }
        };
        loadFundingAccounts();
        return () => { cancelled = true; };
    }, [selectedEntityId]);

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

    // Budget handlers
    const handleSaveBudget = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setBudgetError(null);
        if (!selectedEntityId) {
            setBudgetError('Select an entity before saving a budget.');
            return;
        }
        const formData = new FormData(e.currentTarget);
        const category = String(formData.get('category') ?? '').trim();
        const currency = String(formData.get('currency') ?? baseCurrency).trim().toUpperCase();
        const amount = parseFloat(String(formData.get('limit') ?? ''));
        if (!category) {
            setBudgetError('Category is required.');
            return;
        }
        if (!Number.isFinite(amount) || amount <= 0) {
            setBudgetError('Monthly limit must be a positive amount.');
            return;
        }
        // Major units → ledger minor units once, at the boundary (like the
        // Autopilot generator); the API and DB stay in cents.
        const limitCents = Math.round(amount * 100);
        if (!Number.isSafeInteger(limitCents)) {
            setBudgetError('Monthly limit is too large.');
            return;
        }
        const payload: Budget = {
            id: editingBudget?.id ?? '',
            user_id: 'local_user',
            entity_id: selectedEntityId,
            category,
            limit_cents: limitCents,
            currency,
            created_at: editingBudget?.created_at ?? '',
            updated_at: ''
        };
        try {
            // Upsert is keyed by (entity, category, currency): saving an
            // existing category updates its limit instead of duplicating it.
            if (editingBudget) {
                await updateBudget(payload);
                setEditingBudget(null);
            } else {
                await addBudget(payload);
                setIsAddingBudget(false);
            }
            // Limits feed the Actual-tab comparison card.
            window.dispatchEvent(new Event('opennetworth_balances_updated'));
        } catch (err: any) {
            setBudgetError(err?.message || 'Failed to save budget.');
        }
    };

    const handleDeleteBudget = async (id: string) => {
        if (!confirm('Delete this budget?')) return;
        try {
            // In demo mode the route refuses this with 403 → error banner below.
            await deleteBudget(id);
            if (editingBudget?.id === id) setEditingBudget(null);
            window.dispatchEvent(new Event('opennetworth_balances_updated'));
        } catch (err: any) {
            setBudgetError(err?.message || 'Failed to delete budget.');
        }
    };

    // Materialize the month's active schedules AND debt minimum payments as
    // real ledger postings.
    // Tricky logic:
    // - Re-running the same month is safe: schedule postings carry the
    //   idempotency key `recurring:<schedule id>:<month>`, debt postings carry
    //   `debt:<account id>:<month>`, and the server's already_paid guard skips
    //   any liability with a posted debit this month (manual or prior run).
    // - The funding account's currency is passed to both generators so
    //   different-currency schedules/debts are skipped, never converted at a
    //   fake 1:1. Debt amounts are derived server-side from the stored
    //   minimum_payment_cents — the client never sends an amount.
    // - Postings move cash, so the Actual tab (and every other listener) is
    //   refreshed via the shared balances-updated event.
    const handleGenerateAutopilot = async () => {
        setGenerationError(null);
        setGenerationResult(null);
        setDebtGenerationResult(null);
        const account = fundingAccounts.find(a => a.id === selectedBankAccountId);
        if (!selectedEntityId || !account) {
            setGenerationError('Select an entity and a liquid funding account before generating.');
            return;
        }
        setIsGenerating(true);
        try {
            const target = {
                entityId: selectedEntityId,
                bankAccountId: account.id,
                bankAccountCurrency: account.currency
            };
            const result = await applyRecurringToMonth(recurring, autopilotMonth, target);
            const debtResult = await applyDebtPaymentsToMonth(debtAccounts, autopilotMonth, target, recurring);
            setGenerationResult(result);
            setDebtGenerationResult(debtResult);
            window.dispatchEvent(new Event('opennetworth_balances_updated'));
        } catch (err: any) {
            console.error('Autopilot generation failed:', err);
            setGenerationError(err?.message || 'Autopilot generation failed.');
        } finally {
            setIsGenerating(false);
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
                            Autopilot Schedules
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
                        <button
                            onClick={() => setActiveTab('budgets')}
                            className={`px-4 py-2 rounded-lg transition-all flex items-center gap-2 ${
                                activeTab === 'budgets' ? 'bg-card shadow text-violet-600 font-black' : 'text-muted-foreground hover:text-foreground'
                            }`}
                        >
                            <Target size={15} />
                            Budgets
                        </button>
                        <button
                            onClick={() => setActiveTab('forecast')}
                            className={`px-4 py-2 rounded-lg transition-all flex items-center gap-2 ${
                                activeTab === 'forecast' ? 'bg-card shadow text-sky-600 font-black' : 'text-muted-foreground hover:text-foreground'
                            }`}
                        >
                            <TrendingUp size={15} />
                            Forecast
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

                                        {/* Budget vs Actual comparison — same explicit period as the statement;
                                            limits are monthly defaults prorated by the service at read time. */}
                                        {budgetReport && budgetReport.rows.some(r => r.currency === curr) && (
                                            <ContentCard className="overflow-hidden p-0 border border-border shadow-sm">
                                                <div className="px-6 py-4 bg-muted/40 border-b border-border flex flex-col sm:flex-row justify-between sm:items-center gap-2">
                                                    <div>
                                                        <h4 className="font-bold text-foreground text-xs uppercase tracking-wider">
                                                            Budget vs Actual ({curr})
                                                        </h4>
                                                        <p className="text-[11px] text-muted-foreground">
                                                            Monthly limits prorated over {budgetReport.period_months} month{budgetReport.period_months === 1 ? '' : 's'} in this period.
                                                        </p>
                                                    </div>
                                                    <button
                                                        onClick={() => setActiveTab('budgets')}
                                                        className="text-[11px] font-bold text-violet-600 hover:text-violet-700"
                                                    >
                                                        Edit budgets
                                                    </button>
                                                </div>
                                                <table className="w-full text-left text-xs">
                                                    <thead className="bg-muted/60 text-muted-foreground uppercase font-black tracking-wider border-b border-border text-[10px]">
                                                        <tr>
                                                            <th className="px-6 py-2.5">Category</th>
                                                            <th className="px-6 py-2.5 text-right">Budgeted</th>
                                                            <th className="px-6 py-2.5 text-right">Actual</th>
                                                            <th className="px-6 py-2.5">Usage</th>
                                                            <th className="px-6 py-2.5 text-right">Difference</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody className="divide-y divide-border font-medium">
                                                        {budgetReport.rows.filter(r => r.currency === curr).map(row => (
                                                            <tr key={`${row.currency}-${row.category}`} className="hover:bg-muted/30">
                                                                <td className="px-6 py-2.5 font-bold text-foreground capitalize">
                                                                    {row.category.replaceAll('_', ' ')}
                                                                </td>
                                                                <td className="px-6 py-2.5 text-right font-mono text-muted-foreground">
                                                                    {row.formatted_budgeted ?? <span className="italic">unbudgeted</span>}
                                                                </td>
                                                                <td className="px-6 py-2.5 text-right font-mono font-bold text-foreground">
                                                                    {row.formatted_actual}
                                                                </td>
                                                                <td className="px-6 py-2.5">
                                                                    {row.percent_used === null ? (
                                                                        <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                                                                            No budget
                                                                        </span>
                                                                    ) : (
                                                                        <div className="flex items-center gap-2">
                                                                            <div className="h-1.5 w-24 bg-muted rounded-full overflow-hidden">
                                                                                <div
                                                                                    className={`h-full rounded-full ${row.status === 'over' ? 'bg-rose-500' : row.status === 'at_risk' ? 'bg-amber-500' : 'bg-emerald-500'}`}
                                                                                    style={{ width: `${Math.min(100, row.percent_used)}%` }}
                                                                                />
                                                                            </div>
                                                                            <span className={`text-[10px] font-bold ${row.status === 'over' ? 'text-rose-500' : row.status === 'at_risk' ? 'text-amber-600' : 'text-emerald-600'}`}>
                                                                                {row.percent_used}%
                                                                            </span>
                                                                        </div>
                                                                    )}
                                                                </td>
                                                                <td className="px-6 py-2.5 text-right font-mono">
                                                                    {row.difference_cents === null ? (
                                                                        <span className="text-muted-foreground italic">&mdash;</span>
                                                                    ) : (
                                                                        <span className={row.difference_cents > 0 ? 'text-rose-500 font-bold' : 'text-emerald-600'}>
                                                                            {row.difference_cents > 0 ? '+' : ''}{row.formatted_difference}
                                                                        </span>
                                                                    )}
                                                                </td>
                                                            </tr>
                                                        ))}
                                                    </tbody>
                                                </table>
                                            </ContentCard>
                                        )}

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

            {/* TAB 2: AUTOPILOT SCHEDULES */}
            {activeTab === 'autopilot' && (
                <div className="space-y-6">
                    <div className="bg-blue-50 dark:bg-blue-950/40 border border-blue-100 dark:border-blue-900 p-6 rounded-2xl flex items-start gap-4">
                        <div className="p-3 bg-white dark:bg-slate-900 rounded-xl shadow-sm text-blue-600">
                            <Repeat size={24} />
                        </div>
                        <div>
                            <h3 className="font-bold text-blue-900 dark:text-blue-200 text-lg">Autopilot Scheduled Inflows & Outflows</h3>
                            <p className="text-blue-700 dark:text-blue-300 text-sm mt-1 leading-relaxed">
                                Define recurring income and expense commitments. Schedules stay separate from your actual
                                postings until you generate a month — then they become real double-entry transactions.
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

                    {/* Generate Scheduled Activity: turns active schedules into real
                        double-entry postings (origin "recurring") in the funding account. */}
                    <ContentCard className="p-5 border border-border">
                        <div className="flex flex-col lg:flex-row lg:items-end gap-4">
                            <div className="flex-1">
                                <h4 className="font-bold text-foreground text-sm flex items-center gap-2">
                                    <Zap size={16} className="text-blue-600" />
                                    Generate Scheduled Activity
                                </h4>
                                <p className="text-xs text-muted-foreground mt-1 max-w-xl leading-relaxed">
                                    Posts every active schedule for the chosen month as real double-entry
                                    transactions funded by the account below — plus the exact minimum
                                    payment for every liability that has one set. Re-running the same
                                    month is safe: posted schedules and debts are never duplicated.
                                </p>
                            </div>
                            <div className="flex flex-wrap items-end gap-3">
                                <div className="space-y-1">
                                    <label htmlFor="autopilot-month" className="text-xs font-bold text-muted-foreground">Month</label>
                                    <input
                                        id="autopilot-month"
                                        type="month"
                                        value={autopilotMonth}
                                        onChange={(e) => setAutopilotMonth(e.target.value)}
                                        className="bg-background border border-border rounded-lg px-3 py-1.5 text-xs font-mono outline-none focus:ring-2 focus:ring-blue-500/20"
                                    />
                                </div>
                                <div className="space-y-1">
                                    <label htmlFor="autopilot-account" className="text-xs font-bold text-muted-foreground">Funding account</label>
                                    <select
                                        id="autopilot-account"
                                        value={selectedBankAccountId}
                                        onChange={(e) => setSelectedBankAccountId(e.target.value)}
                                        className="bg-background border border-border rounded-lg px-3 py-1.5 text-xs font-bold outline-none focus:ring-2 focus:ring-blue-500/20 max-w-[260px]"
                                    >
                                        {fundingAccounts.map(acc => (
                                            <option key={acc.id} value={acc.id}>
                                                {acc.name} ({acc.currency}) — {acc.formatted_balance}
                                            </option>
                                        ))}
                                        {fundingAccounts.length === 0 && (
                                            <option value="">No liquid accounts found</option>
                                        )}
                                    </select>
                                </div>
                                <button
                                    onClick={handleGenerateAutopilot}
                                    disabled={isGenerating || isDemoMode || !selectedBankAccountId}
                                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl font-bold transition-colors text-xs"
                                >
                                    <Repeat size={15} className={isGenerating ? 'animate-spin' : ''} />
                                    {isGenerating ? 'Generating…' : 'Generate Month'}
                                </button>
                            </div>
                        </div>

                        {isDemoMode && (
                            <p className="mt-3 text-xs font-semibold text-blue-700 dark:text-blue-300">
                                Demo mode is read-only — generation is disabled. Schedules stay visible for planning.
                            </p>
                        )}

                        {generationError && (
                            <div role="alert" className="mt-3 p-3 bg-destructive/15 border border-destructive/30 text-destructive rounded-xl text-xs font-semibold flex items-center gap-2">
                                <AlertTriangle size={15} className="shrink-0" />
                                <span>{generationError}</span>
                            </div>
                        )}

                        {generationResult && (
                            <div className={`mt-3 p-3 rounded-xl border text-xs font-semibold space-y-1.5 ${
                                generationResult.errors.length > 0 || (debtGenerationResult?.errors.length ?? 0) > 0
                                    ? 'bg-amber-50 dark:bg-amber-950/50 border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-200'
                                    : 'bg-emerald-50 dark:bg-emerald-950/50 border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200'
                            }`}>
                                <div className="flex items-center gap-2">
                                    {generationResult.errors.length > 0 || (debtGenerationResult?.errors.length ?? 0) > 0
                                        ? <AlertTriangle size={15} className="shrink-0" />
                                        : <CheckCircle2 size={15} className="shrink-0" />}
                                    <span>
                                        {generationResult.month}: {generationResult.posted} posted, {generationResult.skipped} skipped.
                                    </span>
                                </div>
                                {debtGenerationResult && (
                                    <div className="ml-7">
                                        <span>
                                            Debts: {debtGenerationResult.posted} minimum payments posted, {debtGenerationResult.skipped} skipped.
                                        </span>
                                        {debtGenerationResult.skipped_details.length > 0 && (
                                            <details className="mt-1">
                                                <summary className="cursor-pointer font-medium">Skipped debts</summary>
                                                <ul className="mt-1 ml-5 list-disc space-y-0.5 font-medium">
                                                    {debtGenerationResult.skipped_details.map(d => (
                                                        <li key={d.id}>{d.name} — {DEBT_SKIP_REASON_COPY[d.reason] ?? d.reason}</li>
                                                    ))}
                                                </ul>
                                            </details>
                                        )}
                                    </div>
                                )}
                                {generationResult.errors.length > 0 && (
                                    <ul className="mt-1 ml-5 list-disc space-y-0.5 font-medium">
                                        {generationResult.errors.map((err, i) => (
                                            <li key={i}>{err}</li>
                                        ))}
                                    </ul>
                                )}
                                {debtGenerationResult && debtGenerationResult.errors.length > 0 && (
                                    <ul className="mt-1 ml-5 list-disc space-y-0.5 font-medium">
                                        {debtGenerationResult.errors.map((err, i) => (
                                            <li key={i}>{err}</li>
                                        ))}
                                    </ul>
                                )}
                            </div>
                        )}
                    </ContentCard>

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

            {/* TAB 4: BUDGETS (MONTHLY PER-CATEGORY LIMITS) */}
            {activeTab === 'budgets' && (
                <div className="space-y-6">
                    <div className="bg-violet-50 dark:bg-violet-950/40 border border-violet-100 dark:border-violet-900 p-6 rounded-2xl flex items-start gap-4">
                        <div className="p-3 bg-white dark:bg-slate-900 rounded-xl shadow-sm text-violet-600">
                            <Target size={24} />
                        </div>
                        <div>
                            <h3 className="font-bold text-violet-900 dark:text-violet-200 text-lg">Monthly Category Budgets</h3>
                            <p className="text-violet-700 dark:text-violet-300 text-sm mt-1 leading-relaxed">
                                Set a monthly spending limit per expense category. The Actual Cash Flow tab compares each
                                limit &mdash; prorated to the selected period &mdash; against posted ledger spending.
                            </p>
                        </div>
                        <div className="ml-auto">
                            <button
                                onClick={() => { setEditingBudget(null); setIsAddingBudget(true); }}
                                disabled={isDemoMode || !selectedEntityId}
                                className="flex items-center gap-2 px-4 py-2 bg-violet-600 hover:bg-violet-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl font-bold transition-colors shadow-sm text-sm"
                            >
                                <Plus size={18} />
                                Add Budget
                            </button>
                        </div>
                    </div>

                    {isDemoMode && (
                        <p className="text-xs font-semibold text-violet-700 dark:text-violet-300">
                            Demo mode is read-only &mdash; sample-vault budgets are shown for comparison only.
                        </p>
                    )}

                    {budgetError && (
                        <div role="alert" className="p-4 bg-destructive/15 border border-destructive/30 text-destructive rounded-xl flex items-center gap-2 text-xs font-semibold">
                            <AlertTriangle size={16} className="shrink-0" />
                            <span>{budgetError}</span>
                        </div>
                    )}

                    {/* Entity scope: budgets are entity-scoped because category-accounts are per entity */}
                    <div className="flex items-center gap-2 p-4 bg-card border border-border rounded-2xl shadow-sm">
                        <label htmlFor="budget-entity" className="text-xs font-bold text-muted-foreground whitespace-nowrap">Entity / Owner:</label>
                        <select
                            id="budget-entity"
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

                    {(isAddingBudget || editingBudget) && (
                        <ContentCard className="border-2 border-violet-100 mb-6">
                            <h3 className="text-base font-bold text-violet-900 dark:text-violet-200 mb-3">
                                {editingBudget ? 'Edit Budget' : 'Add Monthly Budget'}
                            </h3>
                            <form className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end" onSubmit={handleSaveBudget}>
                                <div className="space-y-1">
                                    <label htmlFor="budget-category" className="text-xs font-bold text-muted-foreground">Expense category</label>
                                    <input
                                        id="budget-category"
                                        name="category"
                                        list="budget-category-suggestions"
                                        defaultValue={editingBudget?.category ?? ''}
                                        placeholder="e.g. groceries"
                                        className="w-full bg-muted border border-border rounded-lg p-2 outline-none text-xs"
                                        required
                                    />
                                    <datalist id="budget-category-suggestions">
                                        {CANONICAL_EXPENSE_CATEGORIES.map(c => (
                                            <option key={c} value={c} />
                                        ))}
                                    </datalist>
                                </div>
                                <div className="space-y-1">
                                    <label htmlFor="budget-currency" className="text-xs font-bold text-muted-foreground">Currency</label>
                                    <select
                                        id="budget-currency"
                                        name="currency"
                                        defaultValue={editingBudget?.currency ?? baseCurrency}
                                        className="w-full bg-muted border border-border rounded-lg p-2 outline-none text-xs font-bold"
                                    >
                                        {(BUDGET_CURRENCY_OPTIONS.includes(baseCurrency)
                                            ? BUDGET_CURRENCY_OPTIONS
                                            : [baseCurrency, ...BUDGET_CURRENCY_OPTIONS]
                                        ).map(c => (
                                            <option key={c} value={c}>{c}</option>
                                        ))}
                                    </select>
                                </div>
                                <div className="space-y-1">
                                    <label htmlFor="budget-limit" className="text-xs font-bold text-muted-foreground">Monthly limit</label>
                                    <input
                                        id="budget-limit"
                                        name="limit"
                                        type="number"
                                        step="0.01"
                                        min="0.01"
                                        defaultValue={editingBudget ? (editingBudget.limit_cents / 100).toFixed(2) : ''}
                                        placeholder="0.00"
                                        className="w-full bg-muted border border-border rounded-lg p-2 outline-none text-xs font-mono"
                                        required
                                    />
                                </div>
                                <div className="flex gap-2">
                                    <button type="submit" className="flex-1 bg-violet-600 hover:bg-violet-700 text-white rounded-lg p-2 text-xs font-bold">Save</button>
                                    <button
                                        type="button"
                                        onClick={() => { setIsAddingBudget(false); setEditingBudget(null); setBudgetError(null); }}
                                        className="px-3 py-2 text-muted-foreground text-xs font-medium"
                                    >
                                        Cancel
                                    </button>
                                </div>
                            </form>
                        </ContentCard>
                    )}

                    <ContentCard className="overflow-hidden p-0 border border-border">
                        <table className="w-full text-left text-xs">
                            <thead className="bg-muted text-muted-foreground uppercase font-bold border-b border-border">
                                <tr>
                                    <th className="px-6 py-3">Category</th>
                                    <th className="px-6 py-3">Currency</th>
                                    <th className="px-6 py-3 text-right">Monthly Limit</th>
                                    <th className="px-6 py-3 text-center">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-border">
                                {budgets.length === 0 ? (
                                    <tr>
                                        <td colSpan={4} className="px-6 py-8 text-center text-muted-foreground italic">
                                            No budgets set for this entity yet. Add a monthly limit to see budget vs actual on the Actual tab.
                                        </td>
                                    </tr>
                                ) : (
                                    budgets.map(b => (
                                        <tr key={b.id} className="hover:bg-muted/30">
                                            <td className="px-6 py-3 font-bold text-foreground capitalize">
                                                {b.category.replaceAll('_', ' ')}
                                            </td>
                                            <td className="px-6 py-3 font-mono text-muted-foreground">{b.currency}</td>
                                            <td className="px-6 py-3 text-right font-mono font-black text-foreground">
                                                {formatMoney({ amount_cents: b.limit_cents, currency: b.currency })}
                                            </td>
                                            <td className="px-6 py-3 text-center">
                                                <div className="flex items-center justify-center gap-2">
                                                    <button
                                                        onClick={() => { setIsAddingBudget(true); setEditingBudget(b); setBudgetError(null); }}
                                                        disabled={isDemoMode}
                                                        className="text-muted-foreground hover:text-primary disabled:opacity-40"
                                                    >
                                                        Edit
                                                    </button>
                                                    <button
                                                        onClick={() => handleDeleteBudget(b.id)}
                                                        disabled={isDemoMode}
                                                        className="text-muted-foreground hover:text-destructive disabled:opacity-40"
                                                    >
                                                        Delete
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </ContentCard>
                </div>
            )}

            {/* TAB 5: FORECAST — forward projection from today (schedules + budgets + debt payments) */}
            {activeTab === 'forecast' && (
                <div className="space-y-6">
                    <div className="bg-sky-50 dark:bg-sky-950/40 border border-sky-100 dark:border-sky-900 p-6 rounded-2xl flex flex-col md:flex-row items-start md:items-center gap-4">
                        <div className="p-3 bg-white dark:bg-slate-900 rounded-xl shadow-sm text-sky-600">
                            <TrendingUp size={24} />
                        </div>
                        <div>
                            <h3 className="font-bold text-sky-900 dark:text-sky-200 text-lg">Cash Flow Forecast</h3>
                            <p className="text-sky-700 dark:text-sky-300 text-sm mt-1 leading-relaxed max-w-2xl">
                                Projects your liquid balance forward from today using Autopilot schedules, monthly
                                budgets, and debt minimum payments. It starts from your actual ledger balance, so months
                                whose schedule wires or debt payments are already posted are never counted twice.
                                Debts without explicit minimum-payment terms are estimated and flagged "est.".
                                Schedules are vault-wide; budgets and debts belong to the selected entity. Currencies
                                are never converted or combined.
                            </p>
                        </div>
                        <div className="ml-auto flex items-center gap-2 shrink-0">
                            <span className="text-xs font-bold text-sky-700 dark:text-sky-300">Horizon:</span>
                            <div className="flex bg-white dark:bg-slate-900 p-1 rounded-xl text-xs font-bold shadow-sm">
                                {[30, 60, 90].map(days => (
                                    <button
                                        key={days}
                                        onClick={() => setForecastHorizonDays(days)}
                                        className={`px-3 py-1.5 rounded-lg transition ${
                                            forecastHorizonDays === days
                                                ? 'bg-sky-600 text-white shadow'
                                                : 'text-sky-700 dark:text-sky-300 hover:bg-sky-100 dark:hover:bg-sky-900/40'
                                        }`}
                                    >
                                        {days}d
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center gap-2 p-4 bg-card border border-border rounded-2xl shadow-sm">
                        <label htmlFor="forecast-entity" className="text-xs font-bold text-muted-foreground whitespace-nowrap">Entity / Owner:</label>
                        <select
                            id="forecast-entity"
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
                        {forecastReport && (
                            <span className="ml-auto text-[11px] font-semibold text-muted-foreground font-mono">
                                {formatForecastDate(forecastReport.start_date)} &rarr; {formatForecastDate(forecastReport.end_date)}
                            </span>
                        )}
                    </div>

                    {forecastError && (
                        <div role="alert" className="p-4 bg-destructive/15 border border-destructive/30 text-destructive rounded-xl flex items-center gap-2 text-xs font-semibold">
                            <AlertTriangle size={16} className="shrink-0" />
                            <span>{forecastError}</span>
                        </div>
                    )}

                    {isForecastLoading && !forecastReport ? (
                        <div className="h-64 w-full bg-slate-50/50 rounded-2xl animate-pulse" />
                    ) : !forecastReport ? (
                        <div className="p-8 text-center text-muted-foreground border border-dashed border-border rounded-2xl">
                            <TrendingUp size={32} className="mx-auto mb-2 opacity-50" />
                            <p className="font-semibold text-sm">No forecast available</p>
                            <p className="text-xs mt-1">Select an entity with liquid accounts to project cash forward.</p>
                        </div>
                    ) : forecastReport.currencies.length === 0 ? (
                        <div className="p-8 text-center text-muted-foreground border border-dashed border-border rounded-2xl">
                            <Info size={32} className="mx-auto mb-2 opacity-50" />
                            <p className="font-semibold text-sm">No liquid accounts for this entity</p>
                            <p className="text-xs mt-1">
                                The forecast projects cash, checking, and savings balances. Add one to see where the money is heading.
                            </p>
                        </div>
                    ) : (
                        forecastReport.currencies.map(fc => (
                            <ContentCard key={fc.currency} className="p-6 space-y-5">
                                <div className="flex items-center justify-between">
                                    <h3 className="text-base font-black text-foreground flex items-center gap-2">
                                        <span className="font-mono">{fc.currency}</span>
                                        <span className="text-xs font-semibold text-muted-foreground">
                                            projected balance &middot; {forecastReport.horizon_days} days
                                        </span>
                                    </h3>
                                </div>

                                {fc.is_unknown ? (
                                    <div className="p-4 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900 rounded-xl flex items-start gap-3">
                                        <AlertTriangle size={18} className="text-amber-600 shrink-0 mt-0.5" />
                                        <p className="text-xs text-amber-800 dark:text-amber-300 font-semibold leading-relaxed">
                                            The starting balance for {fc.currency} is unknown &mdash; this entity has
                                            {fc.currency} liquid accounts but none with a recorded balance. The upcoming
                                            movements below are still listed, but no balance line can be drawn without
                                            fabricating a starting number.
                                        </p>
                                    </div>
                                ) : (
                                    <>
                                        <ForecastChart points={fc.points} currency={fc.currency} goesNegative={fc.goes_negative} />

                                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                            <div className="p-4 bg-muted/40 rounded-xl">
                                                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Projected End Balance</p>
                                                <p className="text-lg font-black font-mono text-foreground mt-1">{fc.formatted_end_balance}</p>
                                            </div>
                                            <div className="p-4 bg-muted/40 rounded-xl">
                                                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Net Change</p>
                                                <p className={`text-lg font-black font-mono mt-1 ${fc.net_change_cents >= 0 ? 'text-emerald-600' : 'text-destructive'}`}>
                                                    {formatMoney({ amount_cents: fc.net_change_cents, currency: fc.currency })}
                                                </p>
                                            </div>
                                            <div className="p-4 bg-muted/40 rounded-xl">
                                                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Lowest Point</p>
                                                <p className={`text-lg font-black font-mono mt-1 ${fc.goes_negative ? 'text-destructive' : 'text-foreground'}`}>
                                                    {fc.formatted_min_balance}
                                                </p>
                                                <p className="text-[10px] font-semibold text-muted-foreground mt-0.5">
                                                    on {fc.min_balance_date ? formatForecastDate(fc.min_balance_date) : '—'}
                                                </p>
                                            </div>
                                        </div>

                                        {fc.goes_negative && (
                                            <div role="alert" className="p-4 bg-destructive/15 border border-destructive/30 text-destructive rounded-xl flex items-start gap-2 text-xs font-semibold">
                                                <AlertTriangle size={16} className="shrink-0 mt-0.5" />
                                                <span>
                                                    Warning: the projection goes below zero. On current schedules and
                                                    budgets, cash runs out before {formatForecastDate(fc.min_balance_date || forecastReport.end_date)}
                                                    &mdash; the trough is {fc.formatted_min_balance}.
                                                </span>
                                            </div>
                                        )}
                                    </>
                                )}

                                <div>
                                    <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">
                                        Upcoming movements ({fc.events.length})
                                    </h4>
                                    {fc.events.length === 0 ? (
                                        <p className="text-xs text-muted-foreground italic">
                                            No schedules, budgets, or debt payments project into this window.
                                        </p>
                                    ) : (
                                        <ul className="divide-y divide-border border border-border rounded-xl overflow-hidden">
                                            {fc.events.map((ev, idx) => (
                                                <li key={`${ev.date}-${ev.kind}-${ev.label}-${idx}`} className="flex items-center gap-3 px-4 py-2.5 text-xs hover:bg-muted/30">
                                                    <span className="font-mono text-muted-foreground w-20 shrink-0">
                                                        {new Date(ev.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                                                    </span>
                                                    <span className={`px-2 py-0.5 rounded-md font-bold text-[10px] uppercase tracking-wide shrink-0 ${
                                                        ev.kind === 'schedule'
                                                            ? 'bg-blue-500/10 text-blue-600'
                                                            : ev.kind === 'debt_payment'
                                                                ? 'bg-amber-500/10 text-amber-600'
                                                                : 'bg-violet-500/10 text-violet-600'
                                                    }`}>
                                                        {ev.kind === 'debt_payment' ? 'debt' : ev.kind}
                                                        {ev.estimated ? ' est.' : ''}
                                                    </span>
                                                    <span className="font-bold text-foreground truncate">{ev.label}</span>
                                                    <span className={`ml-auto font-mono font-black shrink-0 ${
                                                        ev.direction === 'inflow' ? 'text-emerald-600' : 'text-destructive'
                                                    }`}>
                                                        {ev.formatted_signed_amount}
                                                    </span>
                                                </li>
                                            ))}
                                        </ul>
                                    )}
                                </div>
                            </ContentCard>
                        ))
                    )}

                    {/* Debt payoff projection — mirrors forecastService's debt_projections.
                        Projection-only: the interest shown here is never posted to the
                        ledger. Same gates and month skips as the debt payment events,
                        so this table and the movements list can never disagree. */}
                    {forecastReport && forecastReport.debt_projections.length > 0 && (
                        <ContentCard className="overflow-hidden p-0 border border-border shadow-sm">
                            <div className="px-6 py-4 bg-muted/40 border-b border-border">
                                <h4 className="font-bold text-foreground text-xs uppercase tracking-wider">
                                    Debt payoff projection
                                </h4>
                                <p className="text-[11px] text-muted-foreground">
                                    Projection only &mdash; the ledger never accrues this interest. Each projected
                                    month: interest at the stored APR &divide; 12, then the minimum payment. Months
                                    already paid are skipped.
                                </p>
                            </div>

                            <table className="w-full text-left text-xs">
                                <thead className="bg-muted/60 text-muted-foreground uppercase font-black tracking-wider border-b border-border text-[10px]">
                                    <tr>
                                        <th className="px-6 py-2.5">Debt</th>
                                        <th className="px-6 py-2.5 text-right">Balance owed</th>
                                        <th className="px-6 py-2.5 text-right">APR</th>
                                        <th className="px-6 py-2.5 text-right">Monthly payment</th>
                                        <th className="px-6 py-2.5 text-right">Balance at horizon end</th>
                                        <th className="px-6 py-2.5">Payoff</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-border font-medium">
                                    {forecastReport.debt_projections.map(d => (
                                        <tr key={d.account_id} className="hover:bg-muted/30">
                                            <td className="px-6 py-2.5">
                                                <span className="font-bold text-foreground">{d.name}</span>
                                                <span className="font-mono text-muted-foreground ml-1.5">({d.currency})</span>
                                                <span className="block text-[10px] text-muted-foreground capitalize">
                                                    {d.sub_type.replaceAll('_', ' ')}
                                                </span>
                                            </td>
                                            <td className="px-6 py-2.5 text-right font-mono font-bold">
                                                {d.is_unknown
                                                    ? <span className="italic text-muted-foreground">Unknown</span>
                                                    : d.formatted_starting_balance}
                                            </td>
                                            <td className="px-6 py-2.5 text-right font-mono text-muted-foreground">
                                                {d.interest_rate !== null && d.interest_rate > 0 ? `${d.interest_rate}%` : '—'}
                                            </td>
                                            <td className="px-6 py-2.5 text-right font-mono font-bold">
                                                {d.formatted_monthly_payment}
                                                {d.estimated_payment && (
                                                    <span className="ml-1.5 px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-600 font-bold text-[10px] uppercase tracking-wide">
                                                        est.
                                                    </span>
                                                )}
                                            </td>
                                            <td className="px-6 py-2.5 text-right font-mono font-bold">
                                                {d.is_unknown
                                                    ? <span className="italic text-muted-foreground">&mdash;</span>
                                                    : d.formatted_balance_at_horizon_end}
                                            </td>
                                            <td className="px-6 py-2.5 text-[11px]">
                                                {d.payoff_date ? (
                                                    <span className="font-bold text-emerald-600">{formatForecastDate(d.payoff_date)}</span>
                                                ) : d.non_amortising ? (
                                                    <span className="font-semibold text-amber-600">
                                                        never &mdash; payment &le; monthly interest
                                                    </span>
                                                ) : d.is_unknown ? (
                                                    <span className="text-muted-foreground">balance unknown</span>
                                                ) : (
                                                    <span className="text-muted-foreground">not paid off within horizon</span>
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>

                            {forecastReport.debt_projections.some(d => d.paid_off_within_horizon) && (
                                <div className="px-6 py-3 border-t border-border text-[11px] text-muted-foreground">
                                    Payments continue in the cash-flow list after payoff; the balance line stops at zero.
                                </div>
                            )}
                        </ContentCard>
                    )}

                    {forecastReport && (forecastReport.excluded_schedules.length > 0 || forecastReport.excluded_budget_categories.length > 0 || forecastReport.excluded_debt_accounts.length > 0) && (
                        <div className="p-4 bg-muted/40 border border-border rounded-2xl text-xs space-y-2">
                            <p className="font-bold text-foreground flex items-center gap-2">
                                <Info size={14} className="text-muted-foreground" />
                                Not counted in the projection
                            </p>
                            {forecastReport.excluded_schedules.map(s => (
                                <p key={s.id} className="text-muted-foreground">
                                    <span className="font-bold text-foreground">{s.name}</span>
                                    <span className="font-mono"> ({s.currency})</span> &mdash;{' '}
                                    {s.reason === 'no_liquid_accounts'
                                        ? 'no liquid account in this currency for the selected entity.'
                                        : 'invalid or non-positive amount.'}
                                </p>
                            ))}
                            {forecastReport.excluded_budget_categories.map(b => (
                                <p key={`${b.category}-${b.currency}`} className="text-muted-foreground">
                                    <span className="font-bold text-foreground capitalize">{b.category.replaceAll('_', ' ')}</span>
                                    <span className="font-mono"> ({b.currency})</span> budget &mdash; already covered by a
                                    recurring schedule in the same category, so it is counted once.
                                </p>
                            ))}
                            {forecastReport.excluded_debt_accounts.map(d => (
                                <p key={d.id} className="text-muted-foreground">
                                    <span className="font-bold text-foreground">{d.name}</span>
                                    <span className="font-mono"> ({d.currency})</span> debt &mdash;{' '}
                                    {d.reason === 'no_liquid_accounts'
                                        ? 'no liquid account in this currency for the selected entity.'
                                        : d.reason === 'balance_unknown'
                                            ? 'the balance owed is unknown and no minimum payment is set, so there is nothing to estimate from.'
                                            : 'a recurring schedule already covers debt repayments, so it is counted once.'}
                                </p>
                            ))}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};
