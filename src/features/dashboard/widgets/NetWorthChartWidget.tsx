'use client';

import { useMemo, useState } from 'react';
import WidgetWrapper from './WidgetWrapper';
import NetWorthChart from '@/components/charts/NetWorthChart';
import { History as HistoryIcon, MoreHorizontal, TrendingUp } from 'lucide-react';
import Link from 'next/link';
import HistoryEditor from '@/features/dashboard/modals/HistoryEditor';
import { useDashboard } from '@/features/dashboard/context/DashboardContext';

import { useHistory } from '@/hooks/useHistory';
import { useAssetsQuery } from '@/features/assets/hooks/useAssetsQuery';
import { useSharedFinancialSummary } from '@/features/sync/hooks/useSharedFinancialSummary';
import { useNetWorth } from '@/features/dashboard/hooks/useNetWorth';
import { formatCurrency } from '@/lib/utils/currencyService';
import { centsToMajorUnits } from '@/lib/domain/accounting/types';

export default function NetWorthChartWidget() {
    // TUTORIAL: Separation of Concerns (SoC).
    // The widget doesn't know *how* to fetch data. It just asks the 'useHistory' hook.
    // This allows us to swap the data source (Supabase vs LocalStorage) without changing the UI.
    const { history: netWorthHistory, refreshHistory, addSnapshot } = useHistory();
    const { assets } = useAssetsQuery();
    const { summary } = useSharedFinancialSummary();
    const { baseCurrency } = useNetWorth();
    const { isEditMode, hideWidget } = useDashboard();
    const [timeRange, setTimeRange] = useState<'6m' | '1y' | 'all'>('6m');
    const [isHistoryOpen, setIsHistoryOpen] = useState(false);
    const [isRecording, setIsRecording] = useState(false);

    // Why this exists:
    // Reconciles the two net-worth stories on the dashboard: the historical snapshot series
    // (what the chart plots) vs the live ledger total (what the banner shows). When the newest
    // snapshot diverges sharply from the live total, the trend line silently lies — so we surface
    // a compact callout with a one-click "Record snapshot now" that appends today's ledger total.
    // Currency honesty: comparison only runs when both sides are expressed in baseCurrency —
    // either via authoritative converted totals or a single-currency vault. Mixed unconverted
    // currencies return null and suppress the callout rather than fabricating a comparison.
    const liveParts = useMemo(() => {
        if (!summary) return null;
        const convertedNw = summary.converted_net_worth;
        if (convertedNw?.is_complete && convertedNw.currency === baseCurrency) {
            const liabilities = summary.converted_total_liabilities?.is_complete
                ? centsToMajorUnits(summary.converted_total_liabilities.amount_cents, baseCurrency)
                : null;
            const assets = summary.converted_total_assets?.is_complete
                ? centsToMajorUnits(summary.converted_total_assets.amount_cents, baseCurrency)
                : null;
            const netWorth = centsToMajorUnits(convertedNw.amount_cents, baseCurrency);
            return {
                netWorth,
                // Keep the snapshot internally consistent via the netWorth = assets - liabilities identity.
                assets: assets ?? netWorth + (liabilities ?? 0),
                liabilities: liabilities ?? (assets !== null ? assets - netWorth : 0)
            };
        }
        const currencies = Object.keys(summary.net_worth_cents_by_currency || {});
        if (currencies.length === 1 && currencies[0] === baseCurrency) {
            return {
                netWorth: centsToMajorUnits(summary.net_worth_cents_by_currency[baseCurrency], baseCurrency),
                assets: centsToMajorUnits(summary.total_assets_cents_by_currency?.[baseCurrency] ?? 0, baseCurrency),
                liabilities: centsToMajorUnits(summary.total_liabilities_cents_by_currency?.[baseCurrency] ?? 0, baseCurrency)
            };
        }
        return null;
    }, [summary, baseCurrency]);

    const latestSnapshot = useMemo(() => {
        if (netWorthHistory.length === 0) return null;
        return netWorthHistory.reduce((max, s) => (s.date > max.date ? s : max));
    }, [netWorthHistory]);

    // Divergence is only called out when material: >10% relative AND >100 base-currency units,
    // so normal month-to-month drift never nags.
    const snapshotIsStale = useMemo(() => {
        if (!latestSnapshot || !liveParts) return false;
        if (latestSnapshot.currency && latestSnapshot.currency !== baseCurrency) return false;
        const diff = Math.abs(liveParts.netWorth - latestSnapshot.netWorth);
        const rel = diff / Math.max(Math.abs(liveParts.netWorth), 1);
        return rel > 0.1 && diff > 100;
    }, [latestSnapshot, liveParts, baseCurrency]);

    const recordSnapshotNow = async () => {
        if (!liveParts || isRecording) return;
        setIsRecording(true);
        try {
            await addSnapshot({
                id: typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
                    ? crypto.randomUUID()
                    : `snap-${Date.now()}`,
                date: new Date().toISOString().slice(0, 10),
                netWorth: liveParts.netWorth,
                totalAssets: liveParts.assets,
                totalLiabilities: liveParts.liabilities,
                currency: baseCurrency
            });
            refreshHistory();
        } catch (error) {
            console.error('Failed to record snapshot from live ledger total:', error);
        } finally {
            setIsRecording(false);
        }
    };

    // Why this exists:
    // Distinguishes completely new workspaces with zero accounts from users who already have
    // active bank/ledger accounts but haven't accumulated multiple historical daily snapshots yet.
    // Tricky logic:
    // Checks both authoritative summary accounts (from double-entry engine) and legacy assets.
    // TODO: In Milestone 2, synthesize historical snapshots from ledger posting timestamps.
    const hasTrackedAccounts = (summary?.accounts && summary.accounts.length > 0) || assets.length > 0;

    // Custom Header Controls
    const HeaderControls = (
        <div className="flex items-center gap-2">
            <Link
                href="/timemachine"
                className="hidden md:flex text-xs font-bold text-amber-700 bg-amber-50 hover:bg-amber-100 transition-colors px-3 py-1.5 rounded-lg border border-amber-200 items-center gap-2"
                onClick={(e) => e.stopPropagation()}
            >
                <HistoryIcon size={14} />
                Time Machine
            </Link>
            <button
                onClick={(e) => { e.stopPropagation(); setIsHistoryOpen(true); }}
                className="text-xs font-bold text-muted-foreground hover:text-primary transition-colors px-3 py-1.5 rounded-lg hover:bg-muted"
            >
                Manage
            </button>
            <select
                value={timeRange}
                onChange={(e) => setTimeRange(e.target.value as any)}
                onClick={(e) => e.stopPropagation()}
                className="bg-muted border border-border text-xs font-bold text-foreground rounded-lg p-1.5 outline-none focus:ring-2 focus:ring-primary/20 cursor-pointer"
            >
                <option value="6m">Last 6 Months</option>
                <option value="1y">Last Year</option>
                <option value="all">All Time</option>
            </select>
        </div>
    );

    return (
        // TUTORIAL: Composition Pattern.
        // We wrap the chart in a generic 'WidgetWrapper' that handles common widget behaviors
        // like drag-and-drop handles, edit mode styling, and error boundaries.
        <WidgetWrapper
            id="chart-networth"
            title="Net Worth History"
            isEditMode={isEditMode}
        // Cannot remove core chart easily, or maybe we allow it?
        // Let's make it usually required, but if registry says required=true, we don't pass onRemove
        // Checks registry... yes it's required.
        >
            <div className="absolute top-4 right-4 z-10">
                {!isEditMode && HeaderControls}
            </div>

            <div className="h-full pt-8"> {/* pt-8 to clear header controls */}
                {netWorthHistory.length === 0 ? (
                    hasTrackedAccounts ? (
                        <div className="flex flex-col items-center justify-center h-full text-center p-6">
                            <div className="bg-blue-50 dark:bg-blue-950/40 p-4 rounded-full mb-3 text-blue-600 dark:text-blue-400">
                                <TrendingUp size={28} />
                            </div>
                            <h3 className="text-base font-bold text-foreground mb-1">Building Your Net Worth History</h3>
                            <p className="text-muted-foreground text-xs max-w-sm mb-4">
                                Your accounts and current balances are tracked. Historical trend lines will appear here over time as daily balance snapshots accumulate.
                            </p>
                            <Link
                                href="/accounting?view=accounts"
                                className="px-4 py-2 bg-slate-900 dark:bg-slate-800 text-white rounded-xl text-xs font-bold hover:bg-slate-800 dark:hover:bg-slate-700 transition"
                            >
                                View Tracked Accounts
                            </Link>
                        </div>
                    ) : (
                        <div className="flex flex-col items-center justify-center h-full text-center p-6">
                            <div className="bg-blue-50 dark:bg-blue-950/40 p-4 rounded-full mb-4 text-blue-500">
                                <TrendingUp size={32} />
                            </div>
                            <h3 className="text-lg font-bold text-foreground mb-1">Start your journey</h3>
                            <p className="text-muted-foreground text-sm max-w-xs mb-4">Add your first asset to track your net worth.</p>
                            <div className="flex gap-2">
                                <a href="/assets" className="px-4 py-2 bg-slate-900 dark:bg-slate-800 text-white rounded-lg text-sm font-bold hover:bg-slate-800 dark:hover:bg-slate-700">Add Asset</a>
                            </div>
                        </div>
                    )
                ) : (
                    <>
                        {snapshotIsStale && latestSnapshot && liveParts && (
                            <div className="mx-1 mb-2 px-3 py-2 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-800 dark:text-amber-300 text-[11px] leading-snug flex flex-wrap items-center justify-between gap-2">
                                <span>
                                    Latest snapshot ({new Date(latestSnapshot.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}) shows{' '}
                                    <span className="font-bold">{formatCurrency(latestSnapshot.netWorth, baseCurrency)}</span> but your live ledger total is{' '}
                                    <span className="font-bold">{formatCurrency(liveParts.netWorth, baseCurrency)}</span> — the trend line is out of date.
                                </span>
                                <button
                                    onClick={recordSnapshotNow}
                                    disabled={isRecording}
                                    className="px-2.5 py-1 bg-amber-600 hover:bg-amber-700 disabled:opacity-60 text-white font-bold rounded-lg text-[11px] shrink-0 transition-colors"
                                >
                                    {isRecording ? 'Recording…' : 'Record snapshot now'}
                                </button>
                            </div>
                        )}
                        <NetWorthChart
                            data={netWorthHistory}
                            timeRange={timeRange}
                        />
                    </>
                )}
            </div>

            <HistoryEditor
                isOpen={isHistoryOpen}
                onClose={() => setIsHistoryOpen(false)}
                onSave={refreshHistory}
            />
        </WidgetWrapper>
    );
}
