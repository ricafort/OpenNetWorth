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

import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import {
    Scale,
    Clock,
    CheckCircle2,
    AlertCircle,
    Info,
    ShieldCheck,
    ArrowRight,
    Sparkles,
    RefreshCw
} from 'lucide-react';
import { useSharedFinancialSummary } from '../hooks/useSharedFinancialSummary';
import { SharedFinancialSummaryAccount, formatMoney, CurrencyCode } from '@/lib/domain/accounting/types';
import UpdateBalancesModal from './UpdateBalancesModal';

export default function AccountFreshnessCard() {
    const { summary, isLoading, refresh } = useSharedFinancialSummary();
    const [isUpdateModalOpen, setIsUpdateModalOpen] = useState(false);

    const accounts = summary?.accounts || [];
    const coverageNotes = summary?.coverage_notes || [];
    const missingBalanceNotes = coverageNotes.filter(n => n.includes('tracks balances but has no accepted valuation observation'));
    const missingBalanceCount = missingBalanceNotes.length;

    // Freshness breakdown
    // Why this exists:
    // Distinguishes between accounts that are freshly updated (<30 days), stale accounts,
    // and accounts with incomplete coverage (missing balance observations).
    // Tricky logic:
    // If an account tracks balances but has no accepted observation, it is excluded from summary.accounts
    // but listed in coverage_notes. We report both numbers honestly rather than claiming 5/5 up-to-date.
    // TODO: Add one-click "Update" shortcut next to each missing account note.
    const now = Date.now();
    const staleAccounts = accounts.filter((a: SharedFinancialSummaryAccount) => {
        const obsTime = new Date(a.effective_date).getTime();
        return (now - obsTime) > (30 * 24 * 60 * 60 * 1000); // 30+ days
    });

    // Reconciliation breakdown
    const matchedRecons = accounts.filter((a: SharedFinancialSummaryAccount) => a.reconciliation?.status === 'matched');
    const holdRecons = accounts.filter((a: SharedFinancialSummaryAccount) => a.reconciliation?.status === 'not_directly_comparable');
    const discrepancyRecons = accounts.filter((a: SharedFinancialSummaryAccount) => a.reconciliation?.status === 'discrepancy');

    const currencies = summary ? Object.keys(summary.net_worth_cents_by_currency) : [];

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
                            className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 active:scale-95 text-white font-bold text-xs rounded-xl shadow-md transition-all group"
                        >
                            <RefreshCw size={13} className="group-hover:rotate-180 transition-transform duration-500" />
                            Update Balances
                        </button>
                    </div>
                </CardHeader>

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
                                                : `${accounts.length - staleAccounts.length} / ${accounts.length} up-to-date`}
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-1.5 text-[10px] font-bold">
                                        {missingBalanceCount > 0 ? (
                                            <span className="text-amber-600 dark:text-amber-400 flex items-center gap-1">
                                                <AlertCircle size={12} /> {missingBalanceCount} account awaiting initial balance
                                            </span>
                                        ) : staleAccounts.length > 0 ? (
                                            <span className="text-amber-600 dark:text-amber-400 flex items-center gap-1">
                                                <AlertCircle size={12} /> {staleAccounts.length} accounts older than 30d
                                            </span>
                                        ) : (
                                            <span className="text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                                                <CheckCircle2 size={12} /> All accounts updated recently
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

                            {/* Reconciliation & Freshness Details */}
                            <div className="pt-2 flex flex-wrap items-center gap-2 text-xs">
                                {matchedRecons.length > 0 && (
                                    <span className="px-2.5 py-1 rounded-lg bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800 text-[11px] font-bold flex items-center gap-1.5">
                                        <CheckCircle2 size={13} /> {matchedRecons.length} accounts ledger-reconciled
                                    </span>
                                )}
                                {holdRecons.length > 0 && (
                                    <span className="px-2.5 py-1 rounded-lg bg-blue-50 dark:bg-blue-950/30 text-blue-700 dark:text-blue-400 border border-blue-200 dark:border-blue-800 text-[11px] font-bold flex items-center gap-1.5">
                                        <Info size={13} /> {holdRecons.length} accounts with pending holds
                                    </span>
                                )}
                                {discrepancyRecons.length > 0 && (
                                    <span className="px-2.5 py-1 rounded-lg bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800 text-[11px] font-bold flex items-center gap-1.5">
                                        <AlertCircle size={13} /> {discrepancyRecons.length} accounts with ledger variance
                                    </span>
                                )}
                            </div>
                        </div>
                    )}
                </CardContent>
            </Card>

            <UpdateBalancesModal
                isOpen={isUpdateModalOpen}
                onClose={() => setIsUpdateModalOpen(false)}
            />
        </>
    );
}
