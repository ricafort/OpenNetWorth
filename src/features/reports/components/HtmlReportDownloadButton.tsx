'use client';

/**
 * Why this component exists:
 * One button, two placements (Data Management card on /privacy and the Reports
 * header): it gathers the authoritative double-entry reports from
 * /api/accounting?view=reports, the saved net worth history from Time Machine,
 * and feeds them to the pure buildFinancialReportHtml generator, then downloads
 * the single self-contained .html file via downloadBlob.
 *
 * Tricky logic:
 * - With no entityId prop (Data Management) it resolves the primary owner itself:
 *   the first 'person' entity, else the first entity — never entity_id='all',
 *   which the reports view rejects.
 * - Figures are per-currency records; the display currency is the one with the
 *   largest absolute net worth, and every other currency is disclosed in the
 *   report instead of being silently mixed into one total.
 * - The allocation donut comes from the scope_net_worth items themselves
 *   (account_sub_type → classifyCategory), so the report matches the on-screen
 *   AssetAllocationChart bucketing exactly.
 */

import { useState } from 'react';
import { FileDown, Loader2 } from 'lucide-react';
import { buildFinancialReportHtml, HtmlReportInput, HtmlReportSegment } from '../htmlReport';
import { classifyCategory } from '@/features/assets/utils/classifyCategory';
import { loadNetWorthHistory } from '@/infrastructure/local_driver';
import { downloadBlob } from '@/lib/utils/download';
import { getLocalTodayCalendarDate } from '@/lib/domain/calendarDate';

interface HtmlReportDownloadButtonProps {
    /** Owner to report on; when omitted the primary person entity is resolved. */
    entityId?: string;
    entityName?: string;
    /** 'card' matches the Data Management grid tiles; 'chip' matches the Reports header. */
    variant?: 'card' | 'chip';
}

interface AccountingEntity {
    id: string;
    name: string;
    type: string;
}

function pickDisplayCurrency(byCurrency: Record<string, number> | undefined): string {
    const entries = Object.entries(byCurrency || {});
    if (entries.length === 0) return 'USD';
    entries.sort((a, b) => Math.abs(b[1]) - Math.abs(a[1]));
    return entries[0][0];
}

export default function HtmlReportDownloadButton({ entityId, entityName, variant = 'chip' }: HtmlReportDownloadButtonProps) {
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleGenerate = async () => {
        setBusy(true);
        setError(null);
        try {
            let targetId = entityId;
            let targetName = entityName;

            if (!targetId || targetId === 'all') {
                const entRes = await fetch('/api/accounting');
                const entData = await entRes.json();
                const entities: AccountingEntity[] = entData.entities || [];
                const ent = entities.find(e => e.type === 'person') || entities[0];
                if (!ent) {
                    throw new Error('No financial owner found yet — add accounts before generating a report.');
                }
                targetId = ent.id;
                if (!targetName) targetName = ent.name;
            }

            const asOf = getLocalTodayCalendarDate();
            const params = new URLSearchParams({ view: 'reports', entity_id: targetId, as_of_date: asOf });
            const res = await fetch(`/api/accounting?${params.toString()}`);
            const data = await res.json();
            if (!res.ok || !data.success || !data.reports) {
                throw new Error(data.error || 'Reports are not available for this owner.');
            }

            const nw = data.reports.scope_net_worth;
            const cf = data.reports.cash_flow;
            const ie = data.reports.accrual_income_expenses;
            const currency = pickDisplayCurrency(nw?.net_worth_cents_by_currency);

            const allocationMap = new Map<string, number>();
            for (const item of (nw?.items || [])) {
                if (item.account_type !== 'asset' || item.is_unknown || item.currency !== currency) continue;
                const category = classifyCategory(item.account_sub_type || item.sub_type);
                allocationMap.set(category, (allocationMap.get(category) || 0) + (item.attributed_balance_cents || 0));
            }
            const allocation: HtmlReportSegment[] = Array.from(allocationMap.entries())
                .map(([label, cents]) => ({ label, cents }))
                .sort((a, b) => b.cents - a.cents);

            const centsFor = (record: Record<string, number> | undefined) => (record && Number.isFinite(record[currency]) ? record[currency] : 0);

            const cashFlow = cf ? {
                operatingNetCents: centsFor(cf.net_operating_cents_by_currency),
                investingNetCents: centsFor(cf.net_investing_cents_by_currency),
                financingNetCents: centsFor(cf.net_financing_cents_by_currency),
                netChangeCents: centsFor(cf.net_cash_change_cents_by_currency),
                startingCents: centsFor(cf.starting_cash_cents_by_currency),
                endingCents: centsFor(cf.ending_cash_cents_by_currency)
            } : null;

            const incomeCategories: HtmlReportSegment[] = (ie?.breakdown_by_category || [])
                .filter((b: any) => b.type === 'income' && b.currency === currency)
                .map((b: any) => ({ label: b.account_name, cents: Math.abs(b.total_cents) }))
                .sort((a: HtmlReportSegment, b: HtmlReportSegment) => b.cents - a.cents);
            const expenseCategories: HtmlReportSegment[] = (ie?.breakdown_by_category || [])
                .filter((b: any) => b.type === 'expense' && b.currency === currency)
                .map((b: any) => ({ label: b.account_name, cents: Math.abs(b.total_cents) }))
                .sort((a: HtmlReportSegment, b: HtmlReportSegment) => b.cents - a.cents);

            const history = loadNetWorthHistory()
                .slice()
                .sort((a, b) => String(a.date).localeCompare(String(b.date)))
                .slice(-24)
                .map(s => ({ date: s.date, netWorth: s.netWorth }));

            const input: HtmlReportInput = {
                entityName: targetName || 'My Finances',
                currency,
                asOfDate: asOf,
                generatedAt: new Date().toLocaleString(),
                netWorthCents: centsFor(nw?.net_worth_cents_by_currency),
                totalAssetsCents: centsFor(nw?.total_assets_cents_by_currency),
                totalLiabilitiesCents: centsFor(nw?.total_liabilities_cents_by_currency),
                netWorthTrend: history,
                allocation,
                cashFlow,
                incomeCategories,
                expenseCategories,
                isPartial: nw?.is_partial === true,
                unrecordedCount: nw?.unrecorded_count,
                otherCurrencies: Object.keys(nw?.net_worth_cents_by_currency || {}).filter(c => c !== currency)
            };

            const html = buildFinancialReportHtml(input);
            downloadBlob(html, `opennetworth-financial-report-${asOf}.html`, 'text/html');
        } catch (err: any) {
            setError(err?.message || 'Failed to generate the report.');
        } finally {
            setBusy(false);
        }
    };

    if (variant === 'card') {
        return (
            <div className="contents">
                <button
                    onClick={handleGenerate}
                    disabled={busy}
                    className="flex items-center justify-center gap-2 p-4 border border-slate-200 rounded-xl hover:bg-slate-50 hover:border-violet-200 transition-all group disabled:opacity-60"
                >
                    {busy ? <Loader2 size={20} className="animate-spin text-violet-600" /> : <FileDown size={20} className="text-slate-500 group-hover:text-violet-600" />}
                    <div className="text-left">
                        <p className="font-bold text-slate-800">HTML Financial Report</p>
                        <p className="text-xs text-slate-500">{error ? error : 'Self-contained .html deck'}</p>
                    </div>
                </button>
            </div>
        );
    }

    return (
        <div className="flex flex-col items-end gap-1">
            <button
                onClick={handleGenerate}
                disabled={busy}
                title="Download a self-contained HTML financial report"
                className="flex items-center gap-1.5 text-xs font-semibold px-3 py-2 bg-violet-50 dark:bg-violet-950/60 text-violet-700 dark:text-violet-300 border border-violet-200 dark:border-violet-800 rounded-lg hover:bg-violet-100 transition disabled:opacity-60"
            >
                {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <FileDown className="w-3.5 h-3.5" />}
                <span>{busy ? 'Building…' : 'HTML Report'}</span>
            </button>
            {error && <span className="text-[11px] text-rose-600 font-medium">{error}</span>}
        </div>
    );
}
