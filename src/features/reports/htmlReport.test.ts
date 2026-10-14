/**
 * Why this file exists:
 * The downloaded report must open in any browser, offline, forever. That only
 * holds if the generator emits a single self-contained file: correct figures,
 * inline SVG charts, no <script>, and ZERO external URLs. It must also escape
 * account/entity names — a hostile account name cannot inject markup into a
 * report the user will open and print.
 *
 * Tricky logic:
 * - The "no external references" assertions use broad regexes on the whole
 *   document, not per-element parsing, so a stray url() or @import also fails.
 * - Empty-data runs must produce readable placeholders, never NaN or divide-by-zero.
 */

import { describe, it, expect } from 'vitest';
import { buildFinancialReportHtml, formatCents, HtmlReportInput } from './htmlReport';

const baseInput: HtmlReportInput = {
    entityName: 'Rica Fort',
    currency: 'USD',
    asOfDate: '2026-10-11',
    generatedAt: '10/11/2026, 9:00:00 AM',
    periodLabel: 'Jan 2026 – Sep 2026',
    netWorthCents: 123456789,
    totalAssetsCents: 200000000,
    totalLiabilitiesCents: 76543211,
    netWorthTrend: [
        { date: '2026-01-31', netWorth: 900000 },
        { date: '2026-02-28', netWorth: 950000 },
        { date: '2026-03-31', netWorth: 1100000.5 },
        { date: '2026-04-30', netWorth: 1234567.89 }
    ],
    allocation: [
        { label: 'Investment', cents: 120000000 },
        { label: 'Real Estate', cents: 60000000 },
        { label: 'Cash', cents: 20000000 }
    ],
    cashFlow: {
        operatingNetCents: 4500000,
        investingNetCents: -1200000,
        financingNetCents: -800000,
        netChangeCents: 2500000,
        startingCents: 30000000,
        endingCents: 32500000
    },
    incomeCategories: [
        { label: 'Salary', cents: 90000000 },
        { label: 'Dividends', cents: 4000000 }
    ],
    expenseCategories: [
        { label: 'Rent', cents: 42000000 },
        { label: 'Groceries', cents: 9000000 }
    ],
    otherCurrencies: ['AUD']
};

describe('formatCents', () => {
    it('groups thousands and keeps two decimals', () => {
        expect(formatCents(123456789, 'USD')).toBe('1,234,567.89 USD');
    });

    it('renders negatives with a unicode minus and zeros cleanly', () => {
        expect(formatCents(-500, 'USD')).toBe('−5.00 USD');
        expect(formatCents(0, 'USD')).toBe('0.00 USD');
    });

    it('coerces non-finite input to zero', () => {
        expect(formatCents(Number.NaN, 'USD')).toBe('0.00 USD');
    });
});

describe('buildFinancialReportHtml', () => {
    const html = buildFinancialReportHtml(baseInput);

    it('contains the entity name, headline figures and period label', () => {
        expect(html).toContain('Rica Fort');
        expect(html).toContain('1,234,567.89 USD');
        expect(html).toContain('2,000,000.00 USD');
        expect(html).toContain('765,432.11 USD');
        expect(html).toContain('Jan 2026 – Sep 2026');
        expect(html).toContain('Oct 11, 2026');
    });

    it('renders inline SVG charts (donut arcs + trend polyline) with no scripts', () => {
        expect(html).toContain('<svg');
        expect(html).toContain('stroke-dasharray');
        expect(html).toContain('<polyline');
        expect(html).not.toContain('<script');
    });

    it('lists allocation categories, cash flow lines and income/expense bars', () => {
        expect(html).toContain('Investment');
        expect(html).toContain('Real Estate');
        expect(html).toContain('Starting cash');
        expect(html).toContain('Ending cash');
        expect(html).toContain('Salary');
        expect(html).toContain('Rent');
        expect(html).toContain('bar-fill');
    });

    it('discloses secondary currencies instead of mixing totals', () => {
        expect(html).toContain('AUD');
        expect(html).toContain('Disclosures');
    });

    it('is fully self-contained: no external URLs anywhere', () => {
        expect(html).not.toMatch(/https?:\/\//i);
        expect(html).not.toMatch(/src=["']https?:/i);
        expect(html).not.toMatch(/href=["']https?:/i);
        expect(html).not.toMatch(/@import/i);
        expect(html).not.toMatch(/url\(/i);
    });

    it('escapes hostile entity and category names', () => {
        const hostile = buildFinancialReportHtml({
            ...baseInput,
            entityName: '<script>alert(1)</script>',
            expenseCategories: [{ label: '"><img src=x onerror=alert(1)>', cents: 1000 }]
        });
        expect(hostile).not.toContain('<script>alert');
        expect(hostile).toContain('&lt;script&gt;alert(1)&lt;/script&gt;');
        expect(hostile).not.toContain('<img src=x');
    });

    it('handles empty data with readable placeholders and no NaN', () => {
        const empty = buildFinancialReportHtml({
            ...baseInput,
            netWorthCents: 0,
            totalAssetsCents: 0,
            totalLiabilitiesCents: 0,
            netWorthTrend: [],
            allocation: [],
            cashFlow: null,
            incomeCategories: [],
            expenseCategories: [],
            otherCurrencies: [],
            isPartial: true,
            unrecordedCount: 3
        });
        expect(empty).not.toContain('NaN');
        expect(empty).toContain('No asset balances recorded yet');
        expect(empty).toContain('Not enough history yet');
        expect(empty).toContain('No cash flow data');
        expect(empty).toContain('do not have a recorded balance yet');
    });

    it('marks negative net worth with the negative style', () => {
        const negative = buildFinancialReportHtml({ ...baseInput, netWorthCents: -150000 });
        expect(negative).toContain('class="big neg"');
        expect(negative).toContain('1,500.00 USD');
    });

    it('includes print page-break rules so the file doubles as a printable deck', () => {
        expect(html).toContain('@media print');
        expect(html).toContain('page-break-after: always');
    });
});
