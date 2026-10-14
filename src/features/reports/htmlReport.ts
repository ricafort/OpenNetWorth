/**
 * Self-contained HTML financial report generator.
 *
 * Why this file exists:
 * The owner asked for downloadable, self-contained/runnable HTML reports and
 * presentations (like financial reports). This module turns already-computed
 * vault figures into a single .html file — a slide-style deck with the net worth
 * headline, net worth trend, asset allocation donut, cash flow statement and
 * income/expense breakdown — that opens in ANY browser, offline, forever.
 *
 * Tricky logic:
 * - ZERO external references: no <script>, no web fonts, no CDN, no http(s) URL
 *   anywhere in the output. Charts are inline SVG (donut via stroke-dasharray,
 *   trend via polyline) and CSS-width bars, so the file renders with networking
 *   disabled. Inline SVG in text/html needs no xmlns attribute.
 * - Every user-derived string (entity names, account names) is HTML-escaped;
 *   a malicious account name cannot inject markup into the report.
 * - Pure function: takes plain data (cents integers + trend snapshots in major
 *   units), returns a string. No fetch, no DOM, no DB — trivially testable.
 * - @media print rules turn each slide into a printed page, so the same file
 *   doubles as a printable deck.
 */

export interface HtmlReportTrendPoint {
    /** ISO date */
    date: string;
    /** Net worth in major units (not cents) — matches NetWorthSnapshot.netWorth */
    netWorth: number;
}

export interface HtmlReportSegment {
    label: string;
    cents: number;
}

export interface HtmlReportCashFlow {
    operatingNetCents: number;
    investingNetCents: number;
    financingNetCents: number;
    netChangeCents: number;
    startingCents: number;
    endingCents: number;
}

export interface HtmlReportInput {
    entityName: string;
    currency: string;
    /** ISO date the balances are as of */
    asOfDate: string;
    /** Human-readable generation timestamp (caller-provided to keep this pure) */
    generatedAt: string;
    /** Optional period label for the flow statements, e.g. "Jan 2026 – Sep 2026" */
    periodLabel?: string;
    netWorthCents: number;
    totalAssetsCents: number;
    totalLiabilitiesCents: number;
    netWorthTrend: HtmlReportTrendPoint[];
    allocation: HtmlReportSegment[];
    cashFlow: HtmlReportCashFlow | null;
    incomeCategories: HtmlReportSegment[];
    expenseCategories: HtmlReportSegment[];
    /** True when some accounts have unknown balances — headline figures are partial */
    isPartial?: boolean;
    unrecordedCount?: number;
    /** Currencies present in the data besides the display currency */
    otherCurrencies?: string[];
}

const PALETTE = [
    '#2563eb', '#7c3aed', '#059669', '#d97706', '#dc2626',
    '#0891b2', '#4f46e5', '#ca8a04', '#be185d', '#64748b'
];

/** Escapes every user-derived string before it enters the HTML. */
function esc(value: unknown): string {
    return String(value ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

/** Deterministic cents → "1,234,567.89 USD" (no locale APIs, stable in tests). */
export function formatCents(cents: number, currency: string): string {
    const rounded = Math.round(Number.isFinite(cents) ? cents : 0);
    const sign = rounded < 0 ? '−' : '';
    const abs = Math.abs(rounded);
    const whole = String(Math.floor(abs / 100)).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    const frac = String(abs % 100).padStart(2, '0');
    return `${sign}${whole}.${frac} ${esc(currency)}`;
}

function fmtDate(iso: string): string {
    const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(iso || ''));
    if (!m) return esc(iso);
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return `${months[Number(m[2]) - 1]} ${Number(m[3])}, ${m[1]}`;
}

/** Donut chart via stroke-dasharray arcs — no JS, no external libs. */
function donutSvg(segments: HtmlReportSegment[], currency: string): string {
    const positive = segments.filter(s => s.cents > 0);
    const total = positive.reduce((sum, s) => sum + s.cents, 0);
    if (total <= 0) {
        return '<p class="empty">No asset balances recorded yet — the allocation chart will appear once accounts have balances.</p>';
    }
    const size = 200;
    const cx = size / 2;
    const cy = size / 2;
    const r = 70;
    const circumference = 2 * Math.PI * r;
    let offset = 0;
    const arcs = positive.map((s, i) => {
        const dash = (s.cents / total) * circumference;
        const color = PALETTE[i % PALETTE.length];
        const arc = `<circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="${color}" stroke-width="30" stroke-dasharray="${dash.toFixed(2)} ${(circumference - dash).toFixed(2)}" stroke-dashoffset="${(-offset).toFixed(2)}" transform="rotate(-90 ${cx} ${cy})"><title>${esc(s.label)} — ${formatCents(s.cents, currency)}</title></circle>`;
        offset += dash;
        return arc;
    }).join('');
    const totalWhole = String(Math.floor(total / 100)).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    return `<svg viewBox="0 0 ${size} ${size}" width="200" height="200" role="img" aria-label="Asset allocation donut chart">${arcs}<text x="${cx}" y="${cy - 6}" text-anchor="middle" font-size="13" fill="#0f172a" font-weight="700">${esc(currency)}</text><text x="${cx}" y="${cy + 14}" text-anchor="middle" font-size="11" fill="#475569">${totalWhole}</text></svg>`;
}

function allocationLegend(segments: HtmlReportSegment[], currency: string): string {
    const positive = segments.filter(s => s.cents > 0);
    const total = positive.reduce((sum, s) => sum + s.cents, 0);
    if (total <= 0) return '';
    const rows = positive.map((s, i) => {
        const pct = ((s.cents / total) * 100).toFixed(1);
        return `<tr><td><span class="swatch" style="background:${PALETTE[i % PALETTE.length]}"></span>${esc(s.label)}</td><td class="num">${pct}%</td><td class="num">${formatCents(s.cents, currency)}</td></tr>`;
    }).join('');
    return `<table class="legend"><tbody>${rows}</tbody></table>`;
}

/** Net worth trend as an SVG polyline with min/max scaling. */
function trendSvg(trend: HtmlReportTrendPoint[], currency: string): string {
    const points = trend.filter(p => Number.isFinite(p.netWorth));
    if (points.length < 2) {
        return '<p class="empty">Not enough history yet for a trend line — save a few net worth snapshots in Time Machine and regenerate.</p>';
    }
    const w = 640;
    const h = 220;
    const pad = 36;
    const values = points.map(p => p.netWorth);
    let min = Math.min(...values);
    let max = Math.max(...values);
    if (min === max) { min -= 1; max += 1; }
    const x = (i: number) => points.length === 1 ? w / 2 : pad + (i * (w - 2 * pad)) / (points.length - 1);
    const y = (v: number) => h - pad - ((v - min) / (max - min)) * (h - 2 * pad);
    const line = points.map((p, i) => `${x(i).toFixed(1)},${y(p.netWorth).toFixed(1)}`).join(' ');
    const area = `${pad},${h - pad} ${line} ${x(points.length - 1).toFixed(1)},${h - pad}`;
    const dots = points.map((p, i) => `<circle cx="${x(i).toFixed(1)}" cy="${y(p.netWorth).toFixed(1)}" r="3" fill="#2563eb"><title>${esc(p.date)} — ${(p.netWorth < 0 ? '−' : '')}${Math.abs(p.netWorth).toLocaleString('en-US', { maximumFractionDigits: 0 })} ${esc(currency)}</title></circle>`).join('');
    return `<svg viewBox="0 0 ${w} ${h}" width="100%" height="220" role="img" aria-label="Net worth trend chart">
<polygon points="${area}" fill="#2563eb" opacity="0.08"/>
<line x1="${pad}" y1="${h - pad}" x2="${w - pad}" y2="${h - pad}" stroke="#cbd5e1" stroke-width="1"/>
<polyline points="${line}" fill="none" stroke="#2563eb" stroke-width="2.5" stroke-linejoin="round" stroke-linecap="round"/>
${dots}
<text x="${pad}" y="${h - 12}" font-size="11" fill="#64748b">${esc(points[0].date)}</text>
<text x="${w - pad}" y="${h - 12}" font-size="11" fill="#64748b" text-anchor="end">${esc(points[points.length - 1].date)}</text>
<text x="${pad}" y="${y(max).toFixed(1)}" dy="-8" font-size="11" fill="#64748b">${esc(currency)} ${Math.round(max).toLocaleString('en-US')}</text>
</svg>`;
}

/** Horizontal bars via CSS widths — still zero JS. */
function barsHtml(segments: HtmlReportSegment[], currency: string, color: string): string {
    const positive = segments.filter(s => Math.abs(s.cents) > 0);
    if (positive.length === 0) {
        return '<p class="empty">Nothing recorded for this period.</p>';
    }
    const maxAbs = Math.max(...positive.map(s => Math.abs(s.cents)));
    const rows = positive.map(s => {
        const width = Math.max(2, (Math.abs(s.cents) / maxAbs) * 100).toFixed(1);
        return `<div class="bar-row"><span class="bar-label" title="${esc(s.label)}">${esc(s.label)}</span><div class="bar-track"><div class="bar-fill" style="width:${width}%;background:${color}"></div></div><span class="bar-value">${formatCents(Math.abs(s.cents), currency)}</span></div>`;
    }).join('');
    return `<div class="bars">${rows}</div>`;
}

function moneyCell(cents: number, currency: string): string {
    const cls = cents < 0 ? 'num neg' : 'num';
    return `<td class="${cls}">${formatCents(cents, currency)}</td>`;
}

/**
 * Builds the complete single-file HTML report. The output is guaranteed to
 * contain no external URLs and no <script> tags — safe to open offline.
 */
export function buildFinancialReportHtml(input: HtmlReportInput): string {
    const currency = input.currency || 'USD';
    const netWorth = Number.isFinite(input.netWorthCents) ? input.netWorthCents : 0;

    const disclosures: string[] = [];
    if (input.isPartial) {
        disclosures.push(`Some accounts (${input.unrecordedCount ?? 'several'}) do not have a recorded balance yet — headline totals cover known balances only.`);
    }
    if (input.otherCurrencies && input.otherCurrencies.length > 0) {
        disclosures.push(`This report shows figures in ${esc(currency)} only. Other currencies present in your data: ${input.otherCurrencies.map(esc).join(', ')} (no exchange-rate consolidation applied).`);
    }
    const disclosureHtml = disclosures.length > 0
        ? `<div class="disclosure"><strong>Disclosures</strong><ul>${disclosures.map(d => `<li>${d}</li>`).join('')}</ul></div>`
        : '';

    const cf = input.cashFlow;
    const cashFlowTable = cf ? `
<table class="flow">
<tbody>
<tr><td>Starting cash</td>${moneyCell(cf.startingCents, currency)}</tr>
<tr><td>Operating activities (net)</td>${moneyCell(cf.operatingNetCents, currency)}</tr>
<tr><td>Investing activities (net)</td>${moneyCell(cf.investingNetCents, currency)}</tr>
<tr><td>Financing activities (net)</td>${moneyCell(cf.financingNetCents, currency)}</tr>
<tr class="total"><td>Net change in cash</td>${moneyCell(cf.netChangeCents, currency)}</tr>
<tr class="total"><td>Ending cash</td>${moneyCell(cf.endingCents, currency)}</tr>
</tbody>
</table>` : '<p class="empty">No cash flow data for this period.</p>';

    const trendStat = input.netWorthTrend.length >= 2
        ? (() => {
            const first = input.netWorthTrend[0].netWorth;
            const last = input.netWorthTrend[input.netWorthTrend.length - 1].netWorth;
            const deltaCents = Math.round((last - first) * 100);
            const sign = deltaCents >= 0 ? '+' : '−';
            return `<p class="stat-note">Change over saved history: <strong class="${deltaCents < 0 ? 'neg' : 'pos'}">${sign}${formatCents(Math.abs(deltaCents), currency).replace('−', '')}</strong></p>`;
        })()
        : '';

    return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Financial Report — ${esc(input.entityName)}</title>
<style>
:root { color-scheme: light; }
* { box-sizing: border-box; }
body { margin: 0; background: #e2e8f0; color: #0f172a; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; }
.slide { max-width: 900px; margin: 24px auto; background: #ffffff; border: 1px solid #cbd5e1; border-radius: 14px; padding: 36px 40px; box-shadow: 0 1px 3px rgba(15,23,42,.08); }
h1 { font-size: 30px; margin: 0 0 6px; }
h2 { font-size: 20px; margin: 0 0 4px; color: #1e293b; border-bottom: 2px solid #2563eb; display: inline-block; padding-bottom: 4px; }
h3 { font-size: 15px; margin: 18px 0 8px; color: #334155; }
p, td, th, li { font-size: 14px; }
.muted { color: #64748b; }
.kicker { text-transform: uppercase; letter-spacing: .08em; font-size: 11px; color: #2563eb; font-weight: 700; margin: 0 0 10px; }
.big { font-size: 34px; font-weight: 800; margin: 2px 0; }
.grid3 { display: flex; gap: 24px; flex-wrap: wrap; }
.grid3 > div { flex: 1 1 200px; }
.stat-card { border: 1px solid #e2e8f0; border-radius: 10px; padding: 14px 16px; }
.pos { color: #047857; }
.neg { color: #b91c1c; }
.stat-note { margin: 10px 0 0; color: #475569; }
.flex { display: flex; gap: 28px; align-items: flex-start; flex-wrap: wrap; }
table { border-collapse: collapse; width: 100%; }
.legend, .flow { max-width: 520px; }
.legend td, .flow td { padding: 7px 10px; border-bottom: 1px solid #e2e8f0; }
.legend td:first-child { max-width: 260px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.num { text-align: right; font-variant-numeric: tabular-nums; white-space: nowrap; }
.flow tr.total td { font-weight: 700; border-top: 2px solid #94a3b8; }
.swatch { display: inline-block; width: 11px; height: 11px; border-radius: 3px; margin-right: 7px; }
.bars { max-width: 640px; }
.bar-row { display: flex; align-items: center; gap: 10px; margin: 6px 0; }
.bar-label { flex: 0 0 170px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-size: 13px; }
.bar-track { flex: 1; background: #f1f5f9; border-radius: 5px; height: 16px; overflow: hidden; }
.bar-fill { height: 100%; border-radius: 5px; }
.bar-value { flex: 0 0 130px; text-align: right; font-size: 13px; font-variant-numeric: tabular-nums; }
.disclosure { margin-top: 18px; border: 1px solid #fcd34d; background: #fffbeb; border-radius: 8px; padding: 10px 14px; }
.disclosure ul { margin: 6px 0 0; padding-left: 18px; }
.empty { color: #64748b; font-style: italic; border: 1px dashed #cbd5e1; border-radius: 8px; padding: 14px; }
.footer { text-align: center; color: #64748b; font-size: 12px; margin: 18px auto 30px; max-width: 900px; }
@media print {
  body { background: #ffffff; }
  .slide { margin: 0; border: none; box-shadow: none; border-radius: 0; page-break-after: always; }
  .footer { page-break-before: avoid; }
}
</style>
</head>
<body>

<section class="slide">
<p class="kicker">OpenNetWorth · Financial Report</p>
<h1>${esc(input.entityName)}</h1>
<p class="muted">Net worth as of ${fmtDate(input.asOfDate)}${input.periodLabel ? ` · Period: ${esc(input.periodLabel)}` : ''}</p>
<div class="grid3" style="margin-top:26px">
<div class="stat-card"><p class="muted" style="margin:0">Net worth</p><p class="big ${netWorth < 0 ? 'neg' : 'pos'}">${formatCents(netWorth, currency)}</p></div>
<div class="stat-card"><p class="muted" style="margin:0">Total assets</p><p class="big">${formatCents(input.totalAssetsCents, currency)}</p></div>
<div class="stat-card"><p class="muted" style="margin:0">Total liabilities</p><p class="big">${formatCents(input.totalLiabilitiesCents, currency)}</p></div>
</div>
${disclosureHtml}
</section>

<section class="slide">
<h2>Net Worth Trend</h2>
${trendSvg(input.netWorthTrend, currency)}
${trendStat}
</section>

<section class="slide">
<h2>Asset Allocation</h2>
<div class="flex">
${donutSvg(input.allocation, currency)}
${allocationLegend(input.allocation, currency)}
</div>
</section>

<section class="slide">
<h2>Cash Flow${input.periodLabel ? ` — ${esc(input.periodLabel)}` : ''}</h2>
${cashFlowTable}
</section>

<section class="slide">
<h2>Income by Category${input.periodLabel ? ` — ${esc(input.periodLabel)}` : ''}</h2>
${barsHtml(input.incomeCategories, currency, '#059669')}
<h3>Expenses by Category</h3>
${barsHtml(input.expenseCategories, currency, '#dc2626')}
</section>

<p class="footer">Generated ${esc(input.generatedAt)} · Generated entirely on your device — this file loads no external resources and works offline.</p>
</body>
</html>`;
}
