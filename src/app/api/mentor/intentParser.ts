/**
 * Mentor Intent Parser
 * 
 * Why this file exists:
 * Analyzes natural language user inquiries directed at the AI Mentor to extract:
 * 1. Intent type (spending query vs general knowledge)
 * 2. Financial entity scope (personal household vs corporate business)
 * 3. Calendar date range (exact day, month, relative period, or explicit date range)
 * 
 * Tricky logic:
 * - Uses the timezone-immune calendarDate domain service. Converting dates via Date.toISOString()
 *   shifts dates across midnight boundaries in non-UTC regions (such as Sydney UTC+10).
 * - Rejects non-existent calendar dates (e.g. 2026-02-31) explicitly rather than silently propagating invalid strings.
 * - Explicit date ranges (e.g. 2026-08-01 to 2026-08-15) are strictly preserved and never collapsed to a single day.
 * 
 * TODO: In Milestone 2, add support for Australian tax quarter queries ("Q1", "BAS period").
 */

import {
    isValidCalendarDate,
    formatCalendarDate,
    getCalendarMonthRange,
    getLastMonthRange,
    getCurrentMonthRange,
    parseExplicitDateRange
} from '@/lib/domain/calendarDate';

export type SpendScope = {
    isSpendingQuery: boolean;
    needsClarification?: string;
    startDate?: string;
    endDate?: string;
    periodLabel?: string;
    entityId?: string;
};

const MONTHS = ['january', 'february', 'march', 'april', 'may', 'june', 'july', 'august', 'september', 'october', 'november', 'december'];

export function parseSpendingIntent(
    message: string,
    availableEntities: any[],
    referenceDate?: Date | string
): SpendScope {
    const msg = message.toLowerCase();
    
    // 1. Is it a spending query?
    const spendingKeywords = ['spend', 'spent', 'expense', 'cost', 'paid'];
    const isSpendingQuery = spendingKeywords.some(kw => msg.includes(kw));
    
    if (!isSpendingQuery) return { isSpendingQuery: false };

    // 2. Determine Entity Scope (Personal vs Business)
    let entityId = undefined; 
    
    // Match explicit entity names
    let matchedEntities = availableEntities.filter(e => msg.includes(e.name.toLowerCase()));
    
    if (matchedEntities.length > 1) {
        return { isSpendingQuery: true, needsClarification: "I found multiple matching accounts/entities. Which one did you mean?" };
    } else if (matchedEntities.length === 1) {
        entityId = matchedEntities[0].id;
    } else {
        const hasPersonal = ['i ', 'my ', 'me', 'personal'].some(k => msg.includes(k));
        const hasBusiness = ['business', 'company', 'corporate'].some(k => msg.includes(k));

        if (hasPersonal && hasBusiness) {
            return { isSpendingQuery: true, needsClarification: "I'm not sure if you mean personal or business spending. Could you clarify whose finances you are asking about?" };
        } else if (hasBusiness) {
            const businesses = availableEntities.filter(e => e.type === 'business');
            if (businesses.length > 1) {
                return { isSpendingQuery: true, needsClarification: "You have multiple business entities. Which business do you mean?" };
            } else if (businesses.length === 1) {
                entityId = businesses[0].id;
            } else {
                return { isSpendingQuery: true, needsClarification: "I don't see a business profile set up. Do you mean your personal finances?" };
            }
        } else if (hasPersonal) {
            const personalOrHousehold = availableEntities.filter(e => e.type === 'person' || e.type === 'household');
            if (personalOrHousehold.length > 1) {
                 return { isSpendingQuery: true, needsClarification: "You have multiple personal/household entities. Which one do you mean?" };
            } else if (personalOrHousehold.length === 1) {
                 entityId = personalOrHousehold[0].id;
            } else {
                 return { isSpendingQuery: true, needsClarification: "I cannot find a personal or household entity." };
            }
        } else {
            // No explicit mention. If only one entity exists, use it safely.
            if (availableEntities.length === 1) {
                entityId = availableEntities[0].id;
            } else {
                return { isSpendingQuery: true, needsClarification: "Please specify whose finances you are asking about." };
            }
        }
    }

    // 3. Determine Date Scope
    let startDate: string | undefined;
    let endDate: string | undefined;
    let periodLabel: string | undefined;

    // A. Check for explicit date ranges first (e.g. "from 2026-08-01 to 2026-08-15" or "2026-08-01 - 2026-08-15")
    const explicitRange = parseExplicitDateRange(message);
    if (explicitRange) {
        if (!explicitRange.isValid) {
            return { isSpendingQuery: true, needsClarification: explicitRange.error };
        }
        startDate = explicitRange.startDate;
        endDate = explicitRange.endDate;
        periodLabel = `${explicitRange.startDate} to ${explicitRange.endDate}`;
    } else {
        // B. Check for single explicit ISO date YYYY-MM-DD
        const isoDateMatch = message.match(/\b(\d{4}-\d{2}-\d{2})\b/);
        if (isoDateMatch) {
            const matchedDate = isoDateMatch[1];
            if (!isValidCalendarDate(matchedDate)) {
                return {
                    isSpendingQuery: true,
                    needsClarification: `Invalid calendar date: '${matchedDate}' does not exist.`
                };
            }
            startDate = matchedDate;
            endDate = matchedDate;
            periodLabel = matchedDate;
        } else if (msg.includes('last month')) {
            // C. Relative period: "last month"
            const range = getLastMonthRange(referenceDate);
            startDate = range.startDate;
            endDate = range.endDate;
            periodLabel = range.label;
        } else if (msg.includes('this month') || msg.includes('current month')) {
            // D. Relative period: "this month"
            const range = getCurrentMonthRange(referenceDate);
            startDate = range.startDate;
            endDate = range.endDate;
            periodLabel = `Current Month (${range.label})`;
        } else {
            // E. Month name lookup (e.g. "July", "July 2026", "July 15")
            let foundMonthIndex = -1;
            for (let i = 0; i < MONTHS.length; i++) {
                if (msg.includes(MONTHS[i])) {
                    if (foundMonthIndex !== -1) {
                        return { isSpendingQuery: true, needsClarification: "You mentioned multiple months. Please ask about one specific period." };
                    }
                    foundMonthIndex = i;
                }
            }

            if (foundMonthIndex !== -1) {
                const now = referenceDate ? (typeof referenceDate === 'string' ? new Date(referenceDate) : referenceDate) : new Date();
                let year = now.getFullYear();
                const yearMatch = msg.match(/\b(\d{4})\b/);
                if (yearMatch) {
                    year = parseInt(yearMatch[1], 10);
                }

                if (year < 2000 || year > now.getFullYear() + 10) {
                    return { isSpendingQuery: true, needsClarification: `I cannot retrieve data for the year ${year}.` };
                }

                // Check if there is a specific day number inside that month (e.g., "july 15")
                const dayMatch = msg.match(new RegExp(`\\b${MONTHS[foundMonthIndex]}\\s+([1-9]|[12]\\d|3[01])\\b`));
                if (dayMatch) {
                    const day = parseInt(dayMatch[1], 10);
                    const dateStr = formatCalendarDate(year, foundMonthIndex + 1, day);
                    if (!isValidCalendarDate(dateStr)) {
                        return { isSpendingQuery: true, needsClarification: `Invalid calendar date: '${dateStr}' does not exist.` };
                    }
                    startDate = dateStr;
                    endDate = dateStr;
                    periodLabel = `${MONTHS[foundMonthIndex].charAt(0).toUpperCase() + MONTHS[foundMonthIndex].slice(1)} ${day}, ${year}`;
                } else {
                    const monthRange = getCalendarMonthRange(year, foundMonthIndex + 1);
                    startDate = monthRange.startDate;
                    endDate = monthRange.endDate;
                    periodLabel = monthRange.label;
                }
            }
        }
    }

    // F. Fallback when no period specified
    if (!startDate) {
        if (msg.match(/\b(20\d{2})\b/)) {
            return { isSpendingQuery: true, needsClarification: "You mentioned a year, but please specify a month or exact date for the spending lookup." };
        }
        const currentRange = getCurrentMonthRange(referenceDate);
        startDate = currentRange.startDate;
        endDate = currentRange.endDate;
        periodLabel = `Current Month (${currentRange.label})`;
    }

    return {
        isSpendingQuery: true,
        startDate,
        endDate,
        periodLabel,
        entityId
    };
}
