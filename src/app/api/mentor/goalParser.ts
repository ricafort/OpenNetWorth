/**
 * Why this file exists:
 * Detects net-worth GOAL / TIMELINE questions directed at mentors
 * ("when will I achieve my first million US dollar net worth?", "how long until I hit A$2m?",
 * "when am I financially independent?") and computes a DETERMINISTIC projection from the user's
 * own recorded data, so mentors can answer with concrete dates instead of refusing.
 *
 * Tricky logic:
 * - Written-out numbers ("two million"), shorthand ("$1.5m", "1,000,000") and implied targets
 *   ("first million", "millionaire" => 1,000,000) all normalize to major currency units.
 * - Financial-independence questions without an explicit amount use the 25x annual expenses rule.
 * - Date math uses calendar components only (never Date.toISOString()) to avoid timezone shifts
 *   across midnight boundaries in non-UTC regions (such as Sydney UTC+10).
 * - Pure functions: zero database access here; the route supplies the numbers.
 */

export type GoalIntent = {
    isGoalQuery: boolean;
    targetAmount?: number;        // in targetCurrency major units
    targetCurrency?: string;      // explicit in message; undefined => use preferred currency
    isFinancialIndependence?: boolean;
};

export type GoalProjection = {
    feasible: boolean;
    alreadyAchieved: boolean;
    gap: number;                  // target - netWorth (major units, may be <= 0)
    months: number;               // whole months needed (0 when already achieved)
    projectedDate: string;        // YYYY-MM
    projectedLabel: string;       // e.g. "March 2028"
    reason?: string;              // why not feasible
};

const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

const WORD_NUMBERS: Record<string, number> = {
    a: 1, an: 1, one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7,
    eight: 8, nine: 9, ten: 10, fifteen: 15, twenty: 20, fifty: 50
};

export function parseGoalIntent(message: string, preferredCurrency?: string): GoalIntent {
    const msg = (message || '').toLowerCase();

    // 1. Detect the target amount (major units of the target currency)
    let targetAmount: number | undefined;

    // Digit + multiplier: "2 million", "$1.5m", "1,000,000", "0.5 billion"
    const digitMultiplier = msg.match(/\$?\s*(\d[\d,]*(?:\.\d+)?)\s*(million|billion|k|m)\b/);
    if (digitMultiplier) {
        const value = parseFloat(digitMultiplier[1].replace(/,/g, ''));
        const mult = digitMultiplier[2];
        if (!isNaN(value)) {
            targetAmount = value * (mult === 'billion' ? 1e9 : mult === 'million' ? 1e6 : mult === 'm' ? 1e6 : 1e3);
        }
    }

    // Written-out multiplier: "two million", "a million"
    if (targetAmount === undefined) {
        const wordMultiplier = msg.match(/\b(one|a|an|two|three|four|five|six|seven|eight|nine|ten|fifteen|twenty|fifty)\s+(million|billion)\b/);
        if (wordMultiplier) {
            const value = WORD_NUMBERS[wordMultiplier[1]] ?? 1;
            targetAmount = value * (wordMultiplier[2] === 'billion' ? 1e9 : 1e6);
        }
    }

    // Implied one million: "first million", "millionaire"
    if (targetAmount === undefined && /\b(first million|millionaire)\b/.test(msg)) {
        targetAmount = 1e6;
    }

    // Bare amount without multiplier: "$10,000 net worth"
    if (targetAmount === undefined) {
        const bareAmount = msg.match(/\$\s*(\d[\d,]*(?:\.\d+)?)\b/);
        if (bareAmount) {
            const value = parseFloat(bareAmount[1].replace(/,/g, ''));
            if (!isNaN(value)) targetAmount = value;
        }
    }

    // 2. Detect target currency (AUD markers checked before USD so "australian dollars" stays AUD)
    let targetCurrency: string | undefined;
    if (/\b(aud|a\$|australian)\b/.test(msg)) targetCurrency = 'AUD';
    else if (/\b(usd|us\$|us dollars?|american)\b/.test(msg)) targetCurrency = 'USD';

    // 3. Financial independence (explicit amount optional)
    const isFinancialIndependence = /\b(financial independence|financially independent|fire number|retire[ds]?\b|retirement)\b/.test(msg);

    // 4. Is this a goal/timeline question at all?
    const timeAsk = /\b(when|how long|how soon|how many (years|months)|what year|in how many)\b/.test(msg);
    const reachAsk = /\b(reach|hit|achieve|accumulate|grow to|build|get to|become|will i (be|have)|enough to)\b/.test(msg);
    const wealthAsk = /\b(net worth|million|billion|millionaire|financial independence|financially independent|retire|retirement|wealth)\b/.test(msg);

    const isGoalQuery =
        (timeAsk && (reachAsk || wealthAsk)) ||
        (reachAsk && wealthAsk) ||
        /\b(first million|millionaire|financial independence|financially independent|fire number)\b/.test(msg) ||
        (timeAsk && targetAmount !== undefined);

    if (!isGoalQuery) return { isGoalQuery: false };

    return {
        isGoalQuery: true,
        targetAmount,
        targetCurrency: targetCurrency || preferredCurrency,
        isFinancialIndependence: isFinancialIndependence || undefined
    };
}

/**
 * Linear projection: months of surplus needed to close the gap, plus the projected calendar month.
 * Deliberately simple and auditable — the assumptions (constant surplus, no growth, constant FX)
 * are disclosed to the user alongside the result.
 */
export function computeGoalProjection(
    netWorth: number,
    monthlySurplus: number,
    target: number,
    asOfDate: Date | string
): GoalProjection {
    const gap = target - netWorth;

    // Decompose asOfDate into local calendar components without timezone shifting
    let year: number, month: number; // month 1-12
    if (typeof asOfDate === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(asOfDate)) {
        const [y, m] = asOfDate.split('-').map(Number);
        year = y; month = m;
    } else {
        const d = asOfDate instanceof Date ? asOfDate : new Date(asOfDate);
        year = d.getFullYear(); month = d.getMonth() + 1;
    }

    const labelFor = (totalMonthsFromStart: number) => {
        const total = (month - 1) + totalMonthsFromStart;
        const y = year + Math.floor(total / 12);
        const m = ((total % 12) + 12) % 12;
        return { date: `${y}-${String(m + 1).padStart(2, '0')}`, label: `${MONTH_NAMES[m]} ${y}` };
    };

    if (gap <= 0) {
        const now = labelFor(0);
        return {
            feasible: true,
            alreadyAchieved: true,
            gap,
            months: 0,
            projectedDate: now.date,
            projectedLabel: now.label
        };
    }

    if (!(monthlySurplus > 0)) {
        return {
            feasible: false,
            alreadyAchieved: false,
            gap,
            months: 0,
            projectedDate: '',
            projectedLabel: '',
            reason: 'The current net monthly surplus is zero or negative, so the goal cannot be reached without increasing income or reducing expenses.'
        };
    }

    const months = Math.ceil(gap / monthlySurplus);
    const projected = labelFor(months);
    return {
        feasible: true,
        alreadyAchieved: false,
        gap,
        months,
        projectedDate: projected.date,
        projectedLabel: projected.label
    };
}
