/**
 * Calendar Date Domain Service
 * 
 * Why this file exists:
 * Provides a timezone-immune, leap-year-aware calendar date service.
 * In financial workspaces, dates represent calendar periods (e.g. 2026-08-01 through 2026-08-31)
 * rather than instantaneous UTC timestamps. Converting calendar dates via Date.toISOString()
 * shifts dates across month/day boundaries when evaluated in non-UTC timezones (e.g. Australia/Sydney UTC+10).
 * Additionally, regexes like \d{4}-\d{2}-\d{2} accept impossible dates (such as 2026-02-31),
 * which must be explicitly rejected as invalid calendar dates.
 * 
 * Tricky logic:
 * - Direct zero-padded string construction avoids local-to-UTC boundary drift.
 * - Gregorian leap year rule: divisible by 4, except century years unless divisible by 400.
 * - Date range parsing preserves explicit user ranges without collapsing into single days.
 * 
 * TODO: In Milestone 2, add support for Australian financial year boundaries (July 1 - June 30).
 */

export const MONTH_NAMES = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
];

/**
 * Determines whether a given year is a leap year under the Gregorian calendar.
 */
export function isLeapYear(year: number): boolean {
    if (year % 4 !== 0) return false;
    if (year % 100 !== 0) return true;
    return year % 400 === 0;
}

/**
 * Returns the exact number of days in a given calendar month (1-indexed: 1 = Jan, 12 = Dec).
 */
export function getDaysInMonth(year: number, month: number): number {
    if (month < 1 || month > 12) return 0;
    switch (month) {
        case 1: // January
        case 3: // March
        case 5: // May
        case 7: // July
        case 8: // August
        case 10: // October
        case 12: // December
            return 31;
        case 4: // April
        case 6: // June
        case 9: // September
        case 11: // November
            return 30;
        case 2: // February
            return isLeapYear(year) ? 29 : 28;
        default:
            return 0;
    }
}

/**
 * Validates whether an ISO date string (YYYY-MM-DD) represents a real calendar date.
 * Rejects impossible dates like 2026-02-31, 2026-04-31, and non-leap February 29s.
 */
export function isValidCalendarDate(dateStr: string): boolean {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
        return false;
    }

    const [yearStr, monthStr, dayStr] = dateStr.split('-');
    const year = parseInt(yearStr, 10);
    const month = parseInt(monthStr, 10);
    const day = parseInt(dayStr, 10);

    if (isNaN(year) || isNaN(month) || isNaN(day)) return false;
    if (year < 1000 || year > 9999) return false;
    if (month < 1 || month > 12) return false;

    const maxDays = getDaysInMonth(year, month);
    return day >= 1 && day <= maxDays;
}

/**
 * Formats a year, month (1-12), and day into YYYY-MM-DD without timezone conversion.
 */
export function formatCalendarDate(year: number, month: number, day: number): string {
    return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

export interface CalendarMonthRange {
    startDate: string;
    endDate: string;
    label: string;
    year: number;
    month: number;
}

/**
 * Returns the exact first and last day of a specific month.
 */
export function getCalendarMonthRange(year: number, month: number): CalendarMonthRange {
    const safeMonth = Math.max(1, Math.min(12, month));
    const daysInMonth = getDaysInMonth(year, safeMonth);
    const monthName = MONTH_NAMES[safeMonth - 1];

    return {
        startDate: formatCalendarDate(year, safeMonth, 1),
        endDate: formatCalendarDate(year, safeMonth, daysInMonth),
        label: `${monthName} ${year}`,
        year,
        month: safeMonth
    };
}

/**
 * Helper to extract year and month safely from a Date or YYYY-MM-DD string.
 */
function extractYearAndMonth(referenceDate?: Date | string): { year: number; month: number } {
    if (!referenceDate) {
        const now = new Date();
        return { year: now.getFullYear(), month: now.getMonth() + 1 };
    }
    if (typeof referenceDate === 'string' && /^\d{4}-\d{2}/.test(referenceDate)) {
        const parts = referenceDate.split('-');
        return { year: parseInt(parts[0], 10), month: parseInt(parts[1], 10) };
    }
    const d = referenceDate instanceof Date ? referenceDate : new Date(referenceDate);
    return { year: d.getFullYear(), month: d.getMonth() + 1 };
}

/**
 * Produces the complete calendar range for the previous month relative to a reference date.
 * Example: for September 2026, returns 2026-08-01 through 2026-08-31 ("August 2026").
 */
export function getLastMonthRange(referenceDate?: Date | string): CalendarMonthRange {
    const { year, month } = extractYearAndMonth(referenceDate);
    let prevYear = year;
    let prevMonth = month - 1;

    if (prevMonth < 1) {
        prevMonth = 12;
        prevYear -= 1;
    }

    return getCalendarMonthRange(prevYear, prevMonth);
}

/**
 * Produces the complete calendar range for the current month relative to a reference date.
 * Example: for September 2026, returns 2026-09-01 through 2026-09-30 ("September 2026").
 */
export function getCurrentMonthRange(referenceDate?: Date | string): CalendarMonthRange {
    const { year, month } = extractYearAndMonth(referenceDate);
    return getCalendarMonthRange(year, month);
}

export interface ParsedDateRangeResult {
    startDate: string;
    endDate: string;
    isValid: boolean;
    error?: string;
}

/**
 * Parses explicit user date range queries (e.g., "from 2026-08-01 to 2026-08-15" or "2026-08-01 - 2026-08-15").
 * Validates that both dates are genuine calendar dates and ensures startDate <= endDate.
 */
export function parseExplicitDateRange(text: string): ParsedDateRangeResult | null {
    // Look for range separators between two ISO-like dates
    // Examples: "from 2026-08-01 to 2026-08-15", "between 2026-08-01 and 2026-08-15", "2026-08-01 to 2026-08-15", "2026-08-01 - 2026-08-15"
    const rangeRegex = /(?:from\s+|between\s+)?(\d{4}-\d{2}-\d{2})\s*(?:to|through|and|-|\.\.)\s*(\d{4}-\d{2}-\d{2})/i;
    const match = text.match(rangeRegex);

    if (!match) return null;

    const first = match[1];
    const second = match[2];

    if (!isValidCalendarDate(first)) {
        return {
            startDate: first,
            endDate: second,
            isValid: false,
            error: `Invalid calendar date: '${first}' does not exist.`
        };
    }

    if (!isValidCalendarDate(second)) {
        return {
            startDate: first,
            endDate: second,
            isValid: false,
            error: `Invalid calendar date: '${second}' does not exist.`
        };
    }

    if (first > second) {
        return {
            startDate: first,
            endDate: second,
            isValid: false,
            error: `Start date (${first}) cannot be after end date (${second}).`
        };
    }

    return {
        startDate: first,
        endDate: second,
        isValid: true
    };
}
