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
    referenceDate?: Date | string,
    pendingContext?: any,
    resolvedEntityId?: string
): SpendScope {
    const msg = message.toLowerCase();
    
    // 1. Is it a spending query?
    const spendingKeywords = ['spend', 'spent', 'expense', 'cost', 'paid'];
    const isSpendingQuery = spendingKeywords.some(kw => msg.includes(kw)) || pendingContext?.type === 'spending_clarification';
    
    if (!isSpendingQuery) return { isSpendingQuery: false };

    // 3. Determine Date Scope
    let startDate: string | undefined = pendingContext?.startDate;
    let endDate: string | undefined = pendingContext?.endDate;
    let periodLabel: string | undefined = pendingContext?.periodLabel;

    // Helper to safely extract local calendar date components from referenceDate
    // Why this exists:
    // Prevents timezone shifting when extracting year/month/day from reference dates.
    // Tricky logic:
    // If referenceDate is a YYYY-MM-DD string, splitting by hyphen prevents Date constructor
    // from parsing it as UTC midnight which would shift backwards in UTC+ timezones like Sydney.
    const getRefDateComponents = () => {
        if (!referenceDate) {
            const now = new Date();
            return { year: now.getFullYear(), month: now.getMonth() + 1, day: now.getDate() };
        }
        if (typeof referenceDate === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(referenceDate)) {
            const [y, m, d] = referenceDate.split('-').map(Number);
            return { year: y, month: m, day: d };
        }
        const d = referenceDate instanceof Date ? referenceDate : new Date(referenceDate);
        return { year: d.getFullYear(), month: d.getMonth() + 1, day: d.getDate() };
    };

    if (!startDate) {
        // A. Check for explicit date ranges first (e.g. "from 2026-08-01 to 2026-08-15" or natural ranges like "between July 1 and July 31")
        const explicitRange = parseExplicitDateRange(message, referenceDate);
        if (explicitRange) {
            if (!explicitRange.isValid) {
                return { isSpendingQuery: true, needsClarification: explicitRange.error };
            }
            startDate = explicitRange.startDate;
            endDate = explicitRange.endDate;
            periodLabel = `${explicitRange.startDate} to ${explicitRange.endDate}`;
        } else {
            const refComp = getRefDateComponents();

            // Relative day: "yesterday"
            if (/\b(yesterday)\b/i.test(msg)) {
                const yDate = new Date(refComp.year, refComp.month - 1, refComp.day - 1);
                const yesterdayStr = formatCalendarDate(yDate.getFullYear(), yDate.getMonth() + 1, yDate.getDate());
                startDate = yesterdayStr;
                endDate = yesterdayStr;
                periodLabel = `Yesterday (${yesterdayStr})`;
            } else if (/\b(today)\b/i.test(msg)) {
                // Relative day: "today"
                const todayStr = formatCalendarDate(refComp.year, refComp.month, refComp.day);
                startDate = todayStr;
                endDate = todayStr;
                periodLabel = `Today (${todayStr})`;
            } else {
                // B1. Check for single explicit ISO date YYYY-MM-DD
                const isoDateMatch = message.match(/\b(\d{4}-\d{2}-\d{2})\b/);
                // B2. Check for Australian / Commonwealth single date DD/MM/YYYY or DD-MM-YYYY
                const auDateMatch = message.match(/\b([0-3]?\d)[\/\-]([0-1]?\d)[\/\-](\d{4})\b/);

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
                } else if (auDateMatch) {
                    // Day-First calendar date format standard in Australia
                    const day = parseInt(auDateMatch[1], 10);
                    const month = parseInt(auDateMatch[2], 10);
                    const year = parseInt(auDateMatch[3], 10);
                    const formatted = formatCalendarDate(year, month, day);
                    if (!isValidCalendarDate(formatted)) {
                        return {
                            isSpendingQuery: true,
                            needsClarification: `Invalid calendar date: '${formatted}' does not exist.`
                        };
                    }
                    startDate = formatted;
                    endDate = formatted;
                    periodLabel = formatted;
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
                    // E. Month name lookup (e.g. "July", "July 2026", "July 15", "15 July", "15th of July")
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
                        let year = refComp.year;
                        const yearMatch = msg.match(/\b(\d{4})\b/);
                        if (yearMatch) {
                            year = parseInt(yearMatch[1], 10);
                        }

                        if (year < 2000 || year > refComp.year + 10) {
                            return { isSpendingQuery: true, needsClarification: `I cannot retrieve data for the year ${year}.` };
                        }

                        // Check if there is a specific day number inside that month
                        // Support both Month-First ("July 15") and Day-First ("15 July", "15th of July")
                        const monthFirstDayMatch = msg.match(new RegExp(`\\b${MONTHS[foundMonthIndex]}\\s+([1-9]|[12]\\d|3[01])(?:st|nd|rd|th)?\\b`));
                        const dayFirstMonthMatch = msg.match(new RegExp(`\\b([1-9]|[12]\\d|3[01])(?:st|nd|rd|th)?\\s+(?:of\\s+)?${MONTHS[foundMonthIndex]}\\b`));
                        const dayMatch = monthFirstDayMatch || dayFirstMonthMatch;

                        if (dayMatch) {
                            const day = parseInt(dayMatch[1], 10);
                            const dateStr = formatCalendarDate(year, foundMonthIndex + 1, day);
                            if (!isValidCalendarDate(dateStr)) {
                                return { isSpendingQuery: true, needsClarification: `Invalid calendar date: '${MONTHS[foundMonthIndex]} ${day}, ${year}' does not exist.` };
                            }
                            startDate = dateStr;
                            endDate = dateStr;
                            periodLabel = `${MONTHS[foundMonthIndex].charAt(0).toUpperCase() + MONTHS[foundMonthIndex].slice(1)} ${day}, ${year}`;
                        } else {
                            const isPastMonth = foundMonthIndex > (refComp.month - 1) && year === refComp.year;
                            if (isPastMonth && msg.includes('last')) year -= 1;
                            
                            const range = getCalendarMonthRange(year, foundMonthIndex + 1);
                            startDate = range.startDate;
                            endDate = range.endDate;
                            periodLabel = range.label;
                        }
                    } else {
                        // Check for explicit unsupported period words (e.g. "week", "quarter", "fy") FIRST
                        // Why this exists:
                        // "FY 2025" and "Q1 2025" contain four-digit year numbers like 2025, but represent
                        // financial year or quarterly scopes that must be clarified rather than collapsed to calendar-year queries.
                        // Tricky logic:
                        // Checking unsupported period keywords before full-year regex matching ensures
                        // "FY 2025", "Q1 2025", and "this week" prompt for clarification immediately.
                        // TODO: Add support for Australian tax quarters (Q1-Q4) and Australian financial years in Milestone 2.
                        const unsupportedKeywords = [
                            'last week', 'this week', 'past week', 'week',
                            'quarter', 'q1', 'q2', 'q3', 'q4',
                            'financial year', 'fy'
                        ];
                        const foundUnsupported = unsupportedKeywords.find(kw => new RegExp(`\\b${kw}\\b`, 'i').test(msg));
                        if (foundUnsupported) {
                            return {
                                isSpendingQuery: true,
                                needsClarification: `Queries for '${foundUnsupported}' are not directly supported yet. Please ask for a specific month, year, or date range.`
                            };
                        }

                        // Full year queries: e.g. "in 2025", "during 2025", "2025", or "this year"
                        const yearMatch = msg.match(/\b(20\d{2})\b/);
                        const isThisYear = /\b(this year|current year)\b/i.test(msg);
                        if (yearMatch || isThisYear) {
                            const year = yearMatch ? parseInt(yearMatch[1], 10) : refComp.year;
                            if (year < 2000 || year > refComp.year + 10) {
                                return { isSpendingQuery: true, needsClarification: `I cannot retrieve data for the year ${year}.` };
                            }
                            startDate = formatCalendarDate(year, 1, 1);
                            endDate = formatCalendarDate(year, 12, 31);
                            periodLabel = `${year}`;
                        }
                    }
                }
            }
        }
    }

    if (!startDate || !endDate) {
        // Default to current month only when NO specific period was identified
        const range = getCurrentMonthRange(referenceDate);
        startDate = range.startDate;
        endDate = range.endDate;
        periodLabel = `Current Month (${range.label})`;
    }

    // 2. Determine Entity Scope (Personal vs Business vs All)
    let entityId = undefined; 
    
    if (resolvedEntityId && (resolvedEntityId === 'all' || availableEntities.some(e => e.id === resolvedEntityId))) {
        entityId = resolvedEntityId;
    } else {
        // Why this exists:
        // Preserves explicit business or entity scope when generic aggregate phrases like "in total" or "overall" are used.
        // For example: "How much did my business spend in total?" must target the business, not collapse to 'all'.
        // Tricky logic:
        // 1. Explicit multi-entity scopes ("all entities", "across all accounts") select 'all' unless a business or specific entity was named.
        // 2. Named entity matches (e.g. "Apex Trading in total") or business indicators ("my business ... in total")
        //    take precedence over generic totals ("in total", "overall").
        // 3. Unqualified "across all accounts" or "overall" defaults to 'all'.
        // TODO: In Milestone 2, support ad-hoc entity groups like "personal + trust".
        let matchedEntities = availableEntities.filter(e => msg.includes(e.name.toLowerCase()));
        const hasBusiness = ['my business', 'business', 'company', 'corporate'].some(k => msg.includes(k));
        const hasPersonal = ['i ', 'my ', 'me', 'personal'].some(k => msg.includes(k) && !msg.includes('my business') && !msg.includes('my company') && !msg.includes('my property'));

        const hasExplicitAllEntities = /\b(all accounts and entities|across all entities|all entities|all accounts|across all accounts|across all)\b/i.test(msg) && !hasBusiness && matchedEntities.length === 0;
        const hasGenericTotal = /\b(in total|overall|everything)\b/i.test(msg);

        if (hasExplicitAllEntities) {
            entityId = 'all';
        } else if (matchedEntities.length > 1) {
            return { isSpendingQuery: true, needsClarification: "I found multiple matching accounts/entities. Which one did you mean?", startDate, endDate, periodLabel };
        } else if (matchedEntities.length === 1) {
            entityId = matchedEntities[0].id;
        } else if (hasPersonal && hasBusiness) {
            return { isSpendingQuery: true, needsClarification: "I'm not sure if you mean personal or business spending. Could you clarify whose finances you are asking about?", startDate, endDate, periodLabel };
        } else if (hasBusiness) {
            const businesses = availableEntities.filter(e => e.type === 'business');
            if (businesses.length > 1) {
                return { isSpendingQuery: true, needsClarification: "You have multiple business entities. Which business do you mean?", startDate, endDate, periodLabel };
            } else if (businesses.length === 1) {
                entityId = businesses[0].id;
            } else {
                return { isSpendingQuery: true, needsClarification: "I don't see a business profile set up. Do you mean your personal finances?", startDate, endDate, periodLabel };
            }
        } else if (hasGenericTotal) {
            // "in total" or "overall" without explicit business or entity targets all accounts
            entityId = 'all';
        } else if (hasPersonal) {
            const personalOrHousehold = availableEntities.filter(e => e.type === 'person' || e.type === 'household');
            if (personalOrHousehold.length > 1) {
                 return { isSpendingQuery: true, needsClarification: "You have multiple personal/household entities. Which one do you mean?", startDate, endDate, periodLabel };
            } else if (personalOrHousehold.length === 1) {
                 entityId = personalOrHousehold[0].id;
            } else {
                 return { isSpendingQuery: true, needsClarification: "I don't see a personal or household profile set up. Could you clarify which entity you mean?", startDate, endDate, periodLabel };
            }
        } else {
            // No explicit mention. If only one entity exists, use it safely.
            if (availableEntities.length === 1) {
                entityId = availableEntities[0].id;
            } else {
                return { isSpendingQuery: true, needsClarification: "Please specify whose finances you are asking about.", startDate, endDate, periodLabel };
            }
        }
    }

    return {
        isSpendingQuery: true,
        startDate,
        endDate,
        periodLabel,
        entityId
    };
}
