import { describe, it, expect } from 'vitest';
import {
    isLeapYear,
    getDaysInMonth,
    isValidCalendarDate,
    formatCalendarDate,
    getLastMonthRange,
    getCurrentMonthRange,
    parseExplicitDateRange
} from './calendarDate';

/**
 * Calendar Date Domain Service Tests
 * 
 * Why this file exists:
 * Verifies timezone-immune date formatting, leap-year calculations,
 * rejection of impossible calendar dates (Handover Case 13),
 * and preservation of explicit date ranges (Handover Case 14).
 */
describe('Calendar Date Domain Service', () => {
    describe('isLeapYear & getDaysInMonth', () => {
        it('accurately identifies Gregorian leap years', () => {
            expect(isLeapYear(2024)).toBe(true);
            expect(isLeapYear(2026)).toBe(false);
            expect(isLeapYear(2000)).toBe(true);
            expect(isLeapYear(1900)).toBe(false);
        });

        it('returns correct days per month', () => {
            expect(getDaysInMonth(2026, 1)).toBe(31); // Jan
            expect(getDaysInMonth(2026, 2)).toBe(28); // Feb non-leap
            expect(getDaysInMonth(2024, 2)).toBe(29); // Feb leap
            expect(getDaysInMonth(2026, 4)).toBe(30); // Apr
            expect(getDaysInMonth(2026, 8)).toBe(31); // Aug
            expect(getDaysInMonth(2026, 9)).toBe(30); // Sep
        });
    });

    describe('isValidCalendarDate', () => {
        it('validates real calendar dates', () => {
            expect(isValidCalendarDate('2026-08-01')).toBe(true);
            expect(isValidCalendarDate('2026-02-28')).toBe(true);
            expect(isValidCalendarDate('2024-02-29')).toBe(true);
            expect(isValidCalendarDate('2026-09-30')).toBe(true);
        });

        it('rejects impossible dates (Handover Case 13)', () => {
            expect(isValidCalendarDate('2026-02-31')).toBe(false);
            expect(isValidCalendarDate('2026-02-29')).toBe(false); // 2026 not leap
            expect(isValidCalendarDate('2026-04-31')).toBe(false); // April has 30 days
            expect(isValidCalendarDate('2026-09-31')).toBe(false); // Sept has 30 days
            expect(isValidCalendarDate('2026-13-01')).toBe(false); // Month 13
            expect(isValidCalendarDate('2026-00-10')).toBe(false); // Month 0
            expect(isValidCalendarDate('not-a-date')).toBe(false);
        });
    });

    describe('formatCalendarDate & timezone boundary safety', () => {
        it('formats zero-padded dates without UTC timestamp drift', () => {
            expect(formatCalendarDate(2026, 8, 1)).toBe('2026-08-01');
            expect(formatCalendarDate(2026, 12, 31)).toBe('2026-12-31');
        });
    });

    describe('getLastMonthRange & getCurrentMonthRange', () => {
        it('resolves "last month" for 2026-09-22 reference date (Handover Case 11)', () => {
            const range = getLastMonthRange('2026-09-22');
            expect(range.startDate).toBe('2026-08-01');
            expect(range.endDate).toBe('2026-08-31');
            expect(range.label).toBe('August 2026');
            expect(range.year).toBe(2026);
            expect(range.month).toBe(8);
        });

        it('handles year boundary when previous month is December', () => {
            const range = getLastMonthRange('2026-01-15');
            expect(range.startDate).toBe('2025-12-01');
            expect(range.endDate).toBe('2025-12-31');
            expect(range.label).toBe('December 2025');
            expect(range.year).toBe(2025);
            expect(range.month).toBe(12);
        });

        it('resolves "this month" for 2026-09-22 reference date (Handover Case 12)', () => {
            const range = getCurrentMonthRange('2026-09-22');
            expect(range.startDate).toBe('2026-09-01');
            expect(range.endDate).toBe('2026-09-30');
            expect(range.label).toBe('September 2026');
            expect(range.year).toBe(2026);
            expect(range.month).toBe(9);
        });
    });

    describe('parseExplicitDateRange (Handover Case 14)', () => {
        it('parses "from ... to ..." date ranges accurately', () => {
            const result = parseExplicitDateRange('What did I spend from 2026-08-01 to 2026-08-15?');
            expect(result).not.toBeNull();
            expect(result?.isValid).toBe(true);
            expect(result?.startDate).toBe('2026-08-01');
            expect(result?.endDate).toBe('2026-08-15');
        });

        it('parses hyphenated "YYYY-MM-DD - YYYY-MM-DD" date ranges', () => {
            const result = parseExplicitDateRange('expenses for 2026-08-01 - 2026-08-31');
            expect(result).not.toBeNull();
            expect(result?.isValid).toBe(true);
            expect(result?.startDate).toBe('2026-08-01');
            expect(result?.endDate).toBe('2026-08-31');
        });

        it('flags invalid dates inside date ranges', () => {
            const result = parseExplicitDateRange('from 2026-02-31 to 2026-03-10');
            expect(result).not.toBeNull();
            expect(result?.isValid).toBe(false);
            expect(result?.error).toContain("Invalid calendar date: '2026-02-31' does not exist.");
        });

        it('flags reversed date ranges where start > end', () => {
            const result = parseExplicitDateRange('from 2026-08-20 to 2026-08-10');
            expect(result).not.toBeNull();
            expect(result?.isValid).toBe(false);
            expect(result?.error).toContain('cannot be after end date');
        });
    });
});
