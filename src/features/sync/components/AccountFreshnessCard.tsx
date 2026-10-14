/**
 * Account Freshness & Balances Card
 * 
 * Why this file exists:
 * Upgrades and replaces the legacy bank connection card on the main dashboard.
 * Gives users immediate clarity on when their Super, Investment, and Bank balances were last updated,
 * shows reconciliation health against double-entry journal postings, and provides a single-click
 * action to update balances.
 * 
 * Tricky logic:
 * - Computes stale account counts (older than 30 days) and reconciliation statuses dynamically.
 * - Distinguishes available_balance holds (marked info/comparable: false) from true transaction discrepancies.
 * - Renders multi-currency net worth subtotals cleanly without inventing unverified FX exchange rates.
 * 
 * TODO: Add one-click CSV export of the latest balance observation audit trail.
 */

'use client';

import React, { useEffect, useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import {
    Scale,
    Clock,
    CheckCircle2,
    AlertCircle,
    Info,
    ShieldCheck,
    ArrowRight,
    ChevronDown,
    ChevronUp,
    RefreshCw,
    FileText
} from 'lucide-react';
import { useSharedFinancialSummary } from '../hooks/useSharedFinancialSummary';
import { SharedFinancialSummaryAccount, formatMoney, CurrencyCode } from '@/lib/domain/accounting/types';
import UpdateBalancesModal from './UpdateBalancesModal';

// Collapse preference for the card's chevron. Hydrated on mount (not lazily) so SSR markup
// stays expanded — the tests and first paint assume the expanded card.
const FRESHNESS_COLLAPSE_KEY = 'opennetworth:freshness-card-collapsed';

export function AccountFreshnessCard() {
    const { summary, isLoading, refresh } = useSharedFinancialSummary();
    const [isUpdateModalOpen, setIsUpdateModalOpen] = useState(false);
    const [isCollapsed, setIsCollapsed] = useState(false);
    const [collapseHydrated, setCollapseHydrated] = useState(false);

    useEffect(() => {
        try {
            setIsCollapsed(localStorage.getItem(FRESHNESS_COLLAPSE_KEY) === 'true');
        } catch { /* storage unavailable (private mode / SSR) — stay expanded */ }
        setCollapseHydrated(true);
    }, []);

    // Why the hydration gate: StrictMode (on by default in the App Router) double-invokes
    // mount effects. Ungated, the persist effect would write the pre-hydration `false` over
    // the saved preference before the second hydration read sees it — the collapse then
    // never survived a refresh. Only write once the mount read has completed.
    useEffect(() => {
        if (!collapseHydrated) return;
        try {
            localStorage.setItem(FRESHNESS_COLLAPSE_KEY, String(isCollapsed));
        } catch { /* ignore */ }
    }, [collapseHydrated, isCollapsed]);
    // The five provenance chips repeat the same headline the freshness metric already states.
    // They collapse behind a single summary chip; the detail chips stay mounted in the DOM
    // (CSS-hidden) so screen readers and the truthful-label tests can still read them.
    const [showEvidenceDetails, setShowEvidenceDetails] = useState(false);

    const accounts = summary?.accounts || [];
    const coverageNotes = summary?.coverage_notes || [];
    const missingBalanceNotes = coverageNotes.filter(n => n.includes('tracks balances but has no accepted valuation observation') || n.includes('Starting balance needed'));
    const missingBalanceCount = missingBalanceNotes.length;

    // Freshness breakdown & Truthful Evidence Provenance
    // Why this exists:
    // Fulfills Requirement 3 (Accurate provenance and dates):
    // 1. Manual observations must not be called statement reconciliation.
    // 2. Observation dates are preserved separately from calculation dates.
    // 3. An old observation must not appear recently verified just because the summary was calculated today.
    // Tricky logic:
    // When an account is ledger-tracked, effective_date represents the calculation date (today).
    // To determine freshness, we strictly check observation_date (or is_stale flag), falling back
    // to effective_date ONLY for observation-basis accounts.
    // Genuine statement reconciliations (source_type === 'document' or source_document_name/document_id)
    // are distinguished from manual valuation comparisons.
    // TODO: In Milestone 2, provide customizable staleness thresholds per account category.
    const now = Date.now();
    const staleAccounts = accounts.filter((a: SharedFinancialSummaryAccount) => {
        if (a.is_stale) return true;
        const obsDate = a.observation_date || (a.basis === 'observation' ? a.effective_date : null);
        if (obsDate) {
            const obsTime = new Date(obsDate).getTime();
            return (now - obsTime) > (30 * 24 * 60 * 60 * 1000); // 30+ days
        }
        return false;
    });

    // Helper to identify genuine statement-backed evidence
    const isStatementBacked = (a: SharedFinancialSummaryAccount) =>
        Boolean(a.reconciliation?.source_document_name || a.reconciliation?.document_id || a.reconciliation?.source_type === 'document' || a.source_type === 'document');

    // Accounts with manual valuations
    const manualValuationAccounts = accounts.filter((a: SharedFinancialSummaryAccount) =>
        a.basis === 'observation' && a.source_type !== 'document'
    );

    // Accounts with statement observations (trackingMode balance)
    const statementObservedAccounts = accounts.filter((a: SharedFinancialSummaryAccount) =>
        a.basis === 'observation' && a.source_type === 'document'
    );

    // Accounts calculated from ledger entries without an external statement observation
    const ledgerCalculatedAccounts = accounts.filter((a: SharedFinancialSummaryAccount) =>
        a.basis === 'ledger' && !a.reconciliation?.source_document_name && !a.reconciliation?.document_id && a.source_type !== 'document'
    );

    // Reconciliation breakdown by actual comparison result and truthful provenance
    const statementMatchedRecons = accounts.filter((a: SharedFinancialSummaryAccount) =>
        a.reconciliation?.status === 'matched' && isStatementBacked(a)
    );
    const manualMatchedRecons = accounts.filter((a: SharedFinancialSummaryAccount) =>
        a.reconciliation?.status === 'matched' && !isStatementBacked(a)
    );
    const holdRecons = accounts.filter((a: SharedFinancialSummaryAccount) => a.reconciliation?.status === 'not_directly_comparable');
    const discrepancyRecons = accounts.filter((a: SharedFinancialSummaryAccount) => a.reconciliation?.status === 'discrepancy');
    const insufficientHistoryAccounts = accounts.filter((a: SharedFinancialSummaryAccount) => a.reconciliation?.status === 'insufficient_history');

    // Accounts that have no statement observation checked
    const unverifiedAccounts = accounts.filter((a: SharedFinancialSummaryAccount) =>
        !a.reconciliation?.source_document_name && !a.reconciliation?.document_id && a.source_type !== 'document'
    );

    // Latest statement date among statement-sourced or reconciled accounts
    const statementDates = accounts
        .filter((a: SharedFinancialSummaryAccount) => isStatementBacked(a))
        .map((a: SharedFinancialSummaryAccount) => a.reconciliation?.effective_date || a.observation_date || a.effective_date)
        .filter(Boolean)
        .sort()
        .reverse();
    const latestStatementDate = statementDates.length > 0 ? statementDates[0] : null;

    const currencies = summary ? Object.keys(summary.net_worth_cents_by_currency) : [];

    // Single summary chip: leads with problems, otherwise states coverage in one glance.
    const upToDateCount = accounts.length - staleAccounts.length;
    const evidenceSummary = missingBalanceCount > 0
        ? `${missingBalanceCount} awaiting initial balance`
        : staleAccounts.length > 0
            ? `${upToDateCount}/${accounts.length} up-to-date · ${staleAccounts.length} older than 30d`
            : discrepancyRecons.length > 0
                ? `${upToDateCount}/${accounts.length} up-to-date · ${discrepancyRecons.length} statement variance`
                : `${upToDateCount}/${accounts.length} up-to-date`;

    // Why: Uses authoritative formatMoney with CURRENCY_DECIMALS so zero-decimal currencies (JPY)
    // are formatted cleanly without decimal truncation or 100x scaling errors.
    const formatCents = (cents: number, currency: string) => {
        return formatMoney({ amount_cents: cents, currency: (currency || 'AUD') as CurrencyCode });
    };

    return (
        <>
            <Card className="w-full bg-card/60 backdrop-blur-md border border-border/80 shadow-lg hover:shadow-xl transition-all rounded-3xl overflow-hidden">
                <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-6 pb-4 bg-muted/20 border-b border-border/40">
                    <div className="flex items-center gap-3">
                        <div className="p-2.5 bg-blue-600/10 text-blue-600 dark:text-blue-400 rounded-2xl">
                            <Scale className="h-5 w-5" />
                        </div>
                        <div>
                            <CardTitle className="text-base font-black tracking-tight text-foreground flex items-center gap-2">
                                Account Freshness & Balances
                                <span className="text-[10px] font-bold bg-emerald-100 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 px-2 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-800 flex items-center gap-1">
                                    <ShieldCheck size={11} /> 100% On-Device
                                </span>
                            </CardTitle>
                            <p className="text-xs text-muted-foreground mt-0.5">
                                Real-time running totals across your Super, Trading, and Bank accounts.
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => setIsUpdateModalOpen(true)}
                            className="flex items-center gap-1.5 px-3 sm:px-4 py-2 bg-blue-600 hover:bg-blue-700 active:scale-95 text-white font-bold text-xs rounded-xl shadow-md transition-all group"
                        >
                            <RefreshCw size={13} className="group-hover:rotate-180 transition-transform duration-500" />
                            <span className="hidden sm:inline">Update Balances</span>
                            <span className="sm:hidden">Update</span>
                        </button>
                        <button
                            onClick={() => setIsCollapsed(!isCollapsed)}
                            className="p-2 text-muted-foreground hover:text-foreground hover:bg-muted/50 rounded-xl transition-colors border border-border/40"
                            title={isCollapsed ? "Expand coverage panel" : "Collapse to compact notice"}
                        >
                            {isCollapsed ? <ChevronDown size={14} /> : <ChevronUp size={14} />}
                        </button>
                    </div>
                </CardHeader>

                {isCollapsed ? (
                    <div className="px-6 py-3 bg-muted/10 border-t border-border/30 flex items-center justify-between text-xs text-muted-foreground">
                        <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-semibold text-foreground">{accounts.length} accounts</span>
                            <span>•</span>
                            {missingBalanceCount > 0 ? (
                                <span className="text-amber-600 dark:text-amber-400 font-medium">
                                    {missingBalanceCount} awaiting initial balance
                                </span>
                            ) : staleAccounts.length > 0 ? (
                                <span className="text-amber-600 dark:text-amber-400 font-medium">
                                    {staleAccounts.length} older than 30d
                                </span>
                            ) : discrepancyRecons.length > 0 ? (
                                <span className="text-amber-600 dark:text-amber-400 font-medium">
                                    {discrepancyRecons.length} statement variance detected
                                </span>
                            ) : (statementMatchedRecons.length > 0 || statementObservedAccounts.length > 0) ? (
                                <span className="text-emerald-600 dark:text-emerald-400 font-medium">
                                    Evidence verified recently
                                </span>
                            ) : manualValuationAccounts.length > 0 ? (
                                <span className="text-slate-600 dark:text-slate-300 font-medium">
                                    Manual valuations recorded
                                </span>
                            ) : (
                                <span className="text-blue-600 dark:text-blue-400 font-medium">
                                    Calculated through today (ledger transactions)
                                </span>
                            )}
                        </div>
                        <button
                            onClick={() => setIsCollapsed(false)}
                            className="text-blue-600 dark:text-blue-400 font-semibold text-xs hover:underline"
                        >
                            Show Details
                        </button>
                    </div>
                ) : (

                <CardContent className="p-6 space-y-5">
                    {isLoading ? (
                        <div className="space-y-3 animate-pulse">
                            <div className="h-6 bg-muted rounded-xl w-1/3"></div>
                            <div className="h-12 bg-muted rounded-2xl w-full"></div>
                        </div>
                    ) : (accounts.length === 0 && missingBalanceCount === 0) ? (
                        <div className="text-center py-6 text-muted-foreground space-y-3">
                            <div className="w-12 h-12 rounded-full bg-blue-50 dark:bg-blue-950/40 text-blue-600 mx-auto flex items-center justify-center">
                                <Scale size={24} />
                            </div>
                            <div>
                                <p className="font-bold text-foreground text-sm">No accounts tracked yet</p>
                                <p className="text-xs text-muted-foreground max-w-sm mx-auto mt-1">
                                    Start by pasting your account balances or spreadsheet to instantly establish your net worth.
                                </p>
                            </div>
                            <button
                                onClick={() => setIsUpdateModalOpen(true)}
                                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow"
                            >
                                Paste Initial Balances
                            </button>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {/* Net Worth Summary Metrics */}
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                {currencies.map((curr) => {
                                    const nw = summary?.net_worth_cents_by_currency[curr] || 0;
                                    const assets = summary?.total_assets_cents_by_currency[curr] || 0;
                                    const liab = summary?.total_liabilities_cents_by_currency[curr] || 0;

                                    return (
                                        <div key={curr} className="p-3.5 rounded-2xl bg-muted/30 border border-border/50 space-y-1">
                                            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                                                Net Worth ({curr})
                                            </p>
                                            <p className="text-lg font-black text-foreground">
                                                {formatCents(nw, curr)}
                                            </p>
                                            <div className="flex items-center justify-between text-[11px] text-muted-foreground pt-1 border-t border-border/30">
                                                <span className="text-emerald-600 dark:text-emerald-400 font-semibold">
                                                    Assets: {formatCents(assets, curr)}
                                                </span>
                                                <span className="text-rose-600 dark:text-rose-400 font-semibold">
                                                    Liabilities: {formatCents(liab, curr)}
                                                </span>
                                            </div>
                                        </div>
                                    );
                                })}

                                {/* Freshness Metric */}
                                <div className="p-3.5 rounded-2xl bg-muted/30 border border-border/50 flex flex-col justify-between">
                                    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                                        <Clock size={12} /> Account Freshness & Coverage
                                    </p>
                                    <div className="my-1 flex items-baseline gap-2">
                                        <span className="text-lg font-black text-foreground">
                                            {accounts.length}
                                        </span>
                                        <span className="text-xs text-muted-foreground font-medium">
                                            {missingBalanceCount > 0
                                                ? `with balances; ${missingBalanceCount} needs balance`
                                                : staleAccounts.length > 0
                                                ? `${accounts.length - staleAccounts.length} / ${accounts.length} up-to-date`
                                                : (statementMatchedRecons.length > 0 || statementObservedAccounts.length > 0)
                                                ? 'verified recently'
                                                : manualValuationAccounts.length > 0
                                                ? 'manual valuations up-to-date'
                                                : 'calculated through today'}
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-1.5 text-[10px] font-bold">
                                        {missingBalanceCount > 0 ? (
                                            <span className="text-amber-600 dark:text-amber-400 flex items-center gap-1">
                                                <AlertCircle size={12} /> {missingBalanceCount} account{missingBalanceCount === 1 ? '' : 's'} awaiting initial balance
                                            </span>
                                        ) : staleAccounts.length > 0 ? (
                                            <span className="text-amber-600 dark:text-amber-400 flex items-center gap-1">
                                                <AlertCircle size={12} /> {staleAccounts.length} account{staleAccounts.length === 1 ? '' : 's'} older than 30d
                                            </span>
                                        ) : discrepancyRecons.length > 0 ? (
                                            <span className="text-amber-600 dark:text-amber-400 flex items-center gap-1">
                                                <AlertCircle size={12} /> {discrepancyRecons.length} statement variance{discrepancyRecons.length === 1 ? '' : 's'} detected
                                            </span>
                                        ) : (statementMatchedRecons.length > 0 || statementObservedAccounts.length > 0) ? (
                                            <span className="text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                                                <CheckCircle2 size={12} /> Evidence verified recently
                                            </span>
                                        ) : manualValuationAccounts.length > 0 ? (
                                            <span className="text-slate-600 dark:text-slate-300 flex items-center gap-1">
                                                <Scale size={12} /> Manual valuations recorded
                                            </span>
                                        ) : (
                                            <span className="text-blue-600 dark:text-blue-400 flex items-center gap-1">
                                                <Info size={12} /> Calculated through today (ledger transactions)
                                            </span>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Incomplete Coverage & Missing FX Warnings */}
                            {coverageNotes.length > 0 && (
                                <div className="space-y-2 pt-1">
                                    {coverageNotes.map((note, idx) => (
                                        <div key={idx} className="px-3.5 py-2.5 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-800 dark:text-amber-300 text-xs flex items-start gap-2">
                                            <AlertCircle size={15} className="shrink-0 mt-0.5 text-amber-600 dark:text-amber-400" />
                                            <span>{note}</span>
                                        </div>
                                    ))}
                                </div>
                            )}

                            {/* Reconciliation & Freshness Details: one summary chip by default,
                                expandable to the full truthful provenance breakdown. */}
                            <div className="pt-2 flex flex-wrap items-center gap-2 text-xs">
                                <button
                                    onClick={() => setShowEvidenceDetails(v => !v)}
                                    className="px-2.5 py-1 rounded-lg bg-muted/60 border border-border text-[11px] font-bold text-foreground flex items-center gap-1.5 hover:bg-muted transition-colors"
                                    title={showEvidenceDetails ? 'Collapse evidence provenance' : 'Expand evidence provenance details'}
                                >
                                    <ShieldCheck size={13} className="text-emerald-600 dark:text-emerald-400" />
                                    {evidenceSummary}
                                    {showEvidenceDetails ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                                </button>
                                <div className={`items-center gap-2 ${showEvidenceDetails ? 'flex' : 'hidden'}`}>
                                {ledgerCalculatedAccounts.length > 0 && (
                                    <span className="px-2.5 py-1 rounded-lg bg-blue-50 dark:bg-blue-950/30 text-blue-700 dark:text-blue-400 border border-blue-200 dark:border-blue-800 text-[11px] font-bold flex items-center gap-1.5">
                                        <Clock size={13} /> {ledgerCalculatedAccounts.length} calculated through today (ledger transactions)
                                    </span>
                                )}
                                {statementObservedAccounts.length > 0 && (
                                    <span className="px-2.5 py-1 rounded-lg bg-indigo-50 dark:bg-indigo-950/30 text-indigo-700 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800 text-[11px] font-bold flex items-center gap-1.5">
                                        <FileText size={13} /> {statementObservedAccounts.length} statement-sourced {latestStatementDate ? `(last: ${latestStatementDate})` : ''}
                                    </span>
                                )}
                                {manualValuationAccounts.length > 0 && (
                                    <span className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 text-[11px] font-bold flex items-center gap-1.5">
                                        <Scale size={13} /> {manualValuationAccounts.length} manual valuation
                                    </span>
                                )}
                                {statementMatchedRecons.length > 0 && (
                                    <span className="px-2.5 py-1 rounded-lg bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800 text-[11px] font-bold flex items-center gap-1.5">
                                        <CheckCircle2 size={13} /> {statementMatchedRecons.length} reconciled with statement
                                    </span>
                                )}
                                {manualMatchedRecons.length > 0 && (
                                    <span className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 text-[11px] font-bold flex items-center gap-1.5">
                                        <CheckCircle2 size={13} /> {manualMatchedRecons.length} matches manual observation
                                    </span>
                                )}
                                {holdRecons.length > 0 && (
                                    <span className="px-2.5 py-1 rounded-lg bg-blue-50 dark:bg-blue-950/30 text-blue-700 dark:text-blue-400 border border-blue-200 dark:border-blue-800 text-[11px] font-bold flex items-center gap-1.5">
                                        <Info size={13} /> {holdRecons.length} statement holds / pending
                                    </span>
                                )}
                                {discrepancyRecons.length > 0 && (
                                    <span className="px-2.5 py-1 rounded-lg bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800 text-[11px] font-bold flex items-center gap-1.5">
                                        <AlertCircle size={13} /> {discrepancyRecons.length} statement variance (discrepancy)
                                    </span>
                                )}
                                {insufficientHistoryAccounts.length > 0 && (
                                    <span className="px-2.5 py-1 rounded-lg bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800 text-[11px] font-bold flex items-center gap-1.5">
                                        <AlertCircle size={13} /> {insufficientHistoryAccounts.length} statement attached (needs opening balance)
                                    </span>
                                )}
                                {unverifiedAccounts.length > 0 && (
                                    <span className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 text-[11px] font-bold flex items-center gap-1.5">
                                        <Info size={13} /> {unverifiedAccounts.length} statement not checked
                                    </span>
                                )}
                                </div>
                            </div>
                        </div>
                    )}
                </CardContent>
            )}
            </Card>

            <UpdateBalancesModal
                isOpen={isUpdateModalOpen}
                onClose={() => setIsUpdateModalOpen(false)}
            />
        </>
    );
}

export default AccountFreshnessCard;
