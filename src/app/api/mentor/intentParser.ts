export type SpendScope = {
    isSpendingQuery: boolean;
    needsClarification?: string;
    startDate?: string;
    endDate?: string;
    periodLabel?: string;
    entityId?: string;
};

const MONTHS = ['january', 'february', 'march', 'april', 'may', 'june', 'july', 'august', 'september', 'october', 'november', 'december'];

export function parseSpendingIntent(message: string, availableEntities: any[]): SpendScope {
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
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();

    let startDate: string | undefined;
    let endDate: string | undefined;
    let periodLabel: string | undefined;

    // Check for explicit YYYY-MM-DD
    const isoDateMatch = msg.match(/\b(20\d{2})-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])\b/);
    if (isoDateMatch) {
        startDate = isoDateMatch[0];
        endDate = isoDateMatch[0];
        periodLabel = isoDateMatch[0];
    } 
    else if (msg.includes('last month')) {
        const d = new Date(currentYear, currentMonth - 1, 1);
        startDate = new Date(d.getFullYear(), d.getMonth(), 1).toISOString().split('T')[0];
        endDate = new Date(d.getFullYear(), d.getMonth() + 1, 0).toISOString().split('T')[0];
        periodLabel = `${MONTHS[d.getMonth()].charAt(0).toUpperCase() + MONTHS[d.getMonth()].slice(1)} ${d.getFullYear()}`;
    } 
    else {
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
            let year = currentYear;
            const yearMatch = msg.match(/\b(\d{4})\b/);
            if (yearMatch) {
                year = parseInt(yearMatch[1], 10);
            }
            
            if (year < 2000 || year > currentYear + 10) {
                return { isSpendingQuery: true, needsClarification: `I cannot retrieve data for the year ${year}.` };
            }

            // Check if there is a specific date number inside that month/year (e.g., "july 15")
            // Simple heuristic: look for 1-31 near the month
            const dayMatch = msg.match(new RegExp(`\\b${MONTHS[foundMonthIndex]}\\s+([1-9]|[12]\\d|3[01])\\b`));
            if (dayMatch) {
                const day = parseInt(dayMatch[1], 10);
                const dateStr = `${year}-${String(foundMonthIndex + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                startDate = dateStr;
                endDate = dateStr;
                periodLabel = `${MONTHS[foundMonthIndex].charAt(0).toUpperCase() + MONTHS[foundMonthIndex].slice(1)} ${day}, ${year}`;
            } else {
                startDate = `${year}-${String(foundMonthIndex + 1).padStart(2, '0')}-01`;
                // To get the last day of the month accurately:
                const lastDay = new Date(year, foundMonthIndex + 1, 0).getDate();
                endDate = `${year}-${String(foundMonthIndex + 1).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
                periodLabel = `${MONTHS[foundMonthIndex].charAt(0).toUpperCase() + MONTHS[foundMonthIndex].slice(1)} ${year}`;
            }
        }
    }

    if (!startDate) {
        if (msg.match(/\b(20\d{2})\b/)) {
             return { isSpendingQuery: true, needsClarification: "You mentioned a year, but please specify a month or exact date for the spending lookup." };
        }
        startDate = new Date(currentYear, currentMonth, 1).toISOString().split('T')[0];
        endDate = new Date(currentYear, currentMonth + 1, 0).toISOString().split('T')[0];
        periodLabel = `Current Month (${MONTHS[currentMonth].charAt(0).toUpperCase() + MONTHS[currentMonth].slice(1)} ${currentYear})`;
    }

    return {
        isSpendingQuery: true,
        startDate,
        endDate,
        periodLabel,
        entityId
    };
}
