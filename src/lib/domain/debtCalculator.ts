
import { Liability } from '@/features/liabilities/types';
import { PayoffStrategy, DebtPayoffResult, PayoffScheduleEntry, FreedomDateSummary } from '@/features/liabilities/types';
import { CurrencyCode } from '@/types';

// Helper to estimate minimum payments if not provided
export const estimateMinPayment = (balance: number, annualRate: number): number => {
    // Typical minimum: 1% of balance + monthly interest, or $25, whichever is greater
    const safeRate = isNaN(annualRate) ? 0 : annualRate;
    const safeBalance = isNaN(balance) ? 0 : balance;

    const monthlyRate = safeRate / 100 / 12;
    const interestPart = safeBalance * monthlyRate;
    const principalPart = safeBalance * 0.01;

    return Math.max(25, principalPart + interestPart);
};

export const calculatePayoff = (
    liabilities: Liability[],
    extraMonthlyPayment: number,
    strategy: PayoffStrategy
): DebtPayoffResult => {
    return calculatePayoffPrecise(liabilities, extraMonthlyPayment, strategy);
};

const calculatePayoffPrecise = (
    liabilities: Liability[],
    extraMonthlyPayment: number,
    strategy: PayoffStrategy
): DebtPayoffResult => {
    const activeDebts = liabilities.filter(l => (l.balance || 0) > 0);
    if (activeDebts.length === 0) {
        return {
            strategy,
            freedomDate: new Date().toISOString(),
            daysUntilFreedom: 0,
            totalInterestPaid: 0,
            totalPayments: 0,
            monthsToPayoff: 0,
            schedule: [],
            comparisonToMinimum: { monthsSaved: 0, interestSaved: 0 },
            currency: 'USD',
            isMultiCurrencyUnsupported: false,
            isInsufficientPayment: false,
            isHorizonExceeded: false
        };
    }

    const currencies = Array.from(new Set(activeDebts.map(l => (l.currency || 'USD') as CurrencyCode)));

    // Why this check exists:
    // Implements Finding 6: Combining debts in different currencies (e.g. JPY and AUD) in a single
    // payoff schedule produces nonsensical math (rolling over JPY minimum payments to pay AUD debt).
    // Tricky logic:
    // When multiple currencies exist, we flag as unsupported rather than manufacturing fabricated totals.
    // TODO: In Milestone 2, calculate independent schedules per currency.
    if (currencies.length > 1) {
        return {
            strategy,
            freedomDate: '',
            daysUntilFreedom: 0,
            totalInterestPaid: 0,
            totalPayments: 0,
            monthsToPayoff: 0,
            schedule: [],
            comparisonToMinimum: { monthsSaved: 0, interestSaved: 0 },
            isMultiCurrencyUnsupported: true,
            unsupportedCurrencies: currencies,
            isInsufficientPayment: false,
            isHorizonExceeded: false
        };
    }

    const debtCurrency = currencies[0] || 'USD';

    // Setup and Sanitize
    let debts = activeDebts
        .map(l => {
            const balance = Number(l.balance) || 0;
            const rate = Number(l.interest_rate) || 0;
            const minPaymentRaw = Number(l.minimum_payment) || 0;

            // Calculate safe min payment
            const calculatedMin = minPaymentRaw > 0
                ? minPaymentRaw
                : estimateMinPayment(balance, rate);

            return {
                id: l.id,
                name: l.name || 'Unknown Debt',
                balance: balance,
                rate: rate / 100 / 12, // Monthly rate
                minPayment: calculatedMin,
                originalMinPayment: calculatedMin
            };
        });

    const safeExtra = Number(extraMonthlyPayment) || 0;

    // Why this check exists:
    // Resolves Handover Case 15 & Finding: Non-amortising loans receiving misleading payoff dates.
    // When a debt's monthly interest exceeds or equals its payment, the balance never amortises.
    // If the debt pool cannot amortise, we must return an explicit insufficient-payment status
    // rather than simulating until MAX_MONTHS (50 years) and fabricating a false payoff date.
    // Tricky logic:
    // - In 'minimum' strategy: if ANY debt has minPayment <= monthlyInterest, it will never amortise (no rollover helps it).
    // - In 'avalanche'/'snowball' with extra: if total monthly payment (sum(minPayment) + extra) <= total monthly interest,
    //   the total debt pool grows indefinitely.
    // TODO: In Milestone 2, suggest minimum viable payment amounts to achieve target payoff timeframes.
    const nonAmortisingDebts = debts.filter(d => d.rate > 0 && d.minPayment <= (d.balance * d.rate) + 0.001);
    const totalMonthlyInterest = debts.reduce((sum, d) => sum + (d.balance * d.rate), 0);
    const totalAvailablePayment = debts.reduce((sum, d) => sum + d.minPayment, 0) + safeExtra;

    const isMinimumStrategyStalled = strategy === 'minimum' && nonAmortisingDebts.length > 0;
    const isPoolUnderfunded = totalAvailablePayment <= totalMonthlyInterest + 0.001;

    if (isMinimumStrategyStalled || isPoolUnderfunded) {
        return {
            strategy,
            freedomDate: '',
            daysUntilFreedom: 0,
            totalInterestPaid: 0,
            totalPayments: 0,
            monthsToPayoff: 0,
            schedule: [],
            comparisonToMinimum: { monthsSaved: 0, interestSaved: 0 },
            currency: debtCurrency,
            isMultiCurrencyUnsupported: false,
            isInsufficientPayment: true,
            isHorizonExceeded: false,
            insufficientPaymentReason: isMinimumStrategyStalled
                ? 'Minimum monthly payments do not cover accrued interest charges. Loans will not amortise without higher payments.'
                : 'Total monthly payment (minimums plus extra) does not cover total accrued interest charges across your debts. Principal balance will grow over time.',
            insufficientDebts: nonAmortisingDebts.map(d => ({
                id: d.id,
                name: d.name,
                balance: d.balance,
                minimumPayment: d.minPayment,
                monthlyInterest: d.balance * d.rate
            }))
        };
    }

    // Sort
    if (strategy === 'avalanche') debts.sort((a, b) => b.rate - a.rate);
    else if (strategy === 'snowball') debts.sort((a, b) => a.balance - b.balance);

    const schedule: PayoffScheduleEntry[] = [];
    const startDate = new Date();
    let currentDate = new Date(startDate);
    currentDate.setMonth(currentDate.getMonth() + 1); // First payment next month

    let totalInterest = 0;
    let totalPayments = 0;
    let monthsElapsed = 0;
    const MAX_MONTHS = 600; // 50 years cap
    let finalPaymentDate = new Date(currentDate);

    while (debts.some(d => d.balance > 0.01) && monthsElapsed < MAX_MONTHS) {
        finalPaymentDate = new Date(currentDate);
        const monthStr = currentDate.toISOString().slice(0, 7);

        // Calculate Pot
        // Pot = UserExtra + (Sum of [OriginalMin - CurrentActiveMin])
        // This effectively rolls over payments from paid-off debts
        const originalTotalMin = debts.reduce((sum, d) => sum + d.originalMinPayment, 0);
        const currentActiveMin = debts.reduce((sum, d) => d.balance > 0.01 ? sum + d.minPayment : 0, 0);

        // Ensure strictly positive math for the pot
        const pot = strategy === 'minimum' ? 0 : (extraMonthlyPayment + Math.max(0, originalTotalMin - currentActiveMin));

        // Phase 1: Accrue Interest & Pay Minimums on all active debts
        // Why this exists:
        // Ensures contractually mandated minimum payments and interest charges are applied to each debt first.
        // Tricky logic:
        // We track initial monthly state (interest and minimum payment) before extra payments are applied,
        // allowing exact mathematical principal calculation: principal = totalMonthlyPayment - interest.
        // TODO: Support custom debt payment schedules (e.g. bi-weekly).
        const monthlyRecords = new Map<string, {
            debt: typeof debts[0];
            interest: number;
            minPayment: number;
            extraPayment: number;
        }>();

        debts.forEach(d => {
            if (d.balance <= 0.01) return;

            const interest = d.balance * d.rate;
            totalInterest += interest;
            d.balance += interest;

            const minPayment = Math.min(d.balance, d.minPayment);
            d.balance -= minPayment;
            totalPayments += minPayment;

            monthlyRecords.set(d.id, {
                debt: d,
                interest,
                minPayment,
                extraPayment: 0
            });
        });

        // Phase 2: Target Selection & Pot Application across all eligible debts
        // Why this exists:
        // Fulfills Item 1: Continue applying remaining monthly extra payment budget to the next eligible debt
        // after the first debt is cleared within the same month.
        // Tricky logic:
        // A single large extra payment can extinguish Debt 1 and still have remaining budget to pay down Debt 2.
        // We loop until remainingPot is exhausted or all debts have 0 balance.
        let remainingPot = pot;
        while (remainingPot > 0.001) {
            const target = debts.find(d => d.balance > 0.01);
            if (!target) break;

            const extraPay = Math.min(target.balance, remainingPot);
            target.balance -= extraPay;
            totalPayments += extraPay;
            remainingPot -= extraPay;

            const rec = monthlyRecords.get(target.id);
            if (rec) {
                rec.extraPayment += extraPay;
            }
        }

        // Phase 3: Record Schedule Entries with Authoritative Accounting Arithmetic
        // Why this exists:
        // Fulfills Item 2: Calculate principal strictly as (totalPayment - interest), rather than clamping
        // the minimum-payment principal to zero and then adding the entire extra payment.
        // Tricky logic:
        // If interest charges exceed the total payment for a debt in a given month, principal reduction
        // is legitimately negative (principal = payment - interest), accurately matching balance growth.
        // Invariant: closingBalance = openingBalance - principal = openingBalance + interest - totalPayment.
        monthlyRecords.forEach(rec => {
            const totalPayment = rec.minPayment + rec.extraPayment;
            const principal = Number((totalPayment - rec.interest).toFixed(2));
            const roundedPayment = Number(totalPayment.toFixed(2));
            const roundedInterest = Number(rec.interest.toFixed(2));
            const remainingBalance = Math.max(0, Number(rec.debt.balance.toFixed(2)));

            schedule.push({
                month: monthStr,
                debtId: rec.debt.id,
                debtName: rec.debt.name,
                payment: roundedPayment,
                principal,
                interest: roundedInterest,
                remainingBalance
            });
        });

        currentDate.setMonth(currentDate.getMonth() + 1);
        monthsElapsed++;
    }

    // If after 600 months debts are still not cleared:
    // Why this exists:
    // Distinguishes mathematically non-amortising loans (where interest exceeds payment) from loans
    // whose payments amortise the principal but take longer than the 50-year projection horizon (Handover Section 15 & Assessor Finding A).
    // Tricky logic:
    // If all remaining debts have minPayment > monthlyInterest, the payments DO reduce principal,
    // so we set isHorizonExceeded: true and isInsufficientPayment: false.
    // Only if payments fail to cover interest do we set isInsufficientPayment: true.
    // TODO: Allow configurable projection horizons (e.g. 30, 40, 50 years) in settings.
    if (debts.some(d => d.balance > 0.01)) {
        const hasUnpayableInterest = debts.some(d => d.balance > 0.01 && d.minPayment <= (d.balance * d.rate));
        return {
            strategy,
            freedomDate: '',
            daysUntilFreedom: 0,
            totalInterestPaid: totalInterest,
            totalPayments: totalPayments,
            monthsToPayoff: 0,
            schedule: [],
            comparisonToMinimum: { monthsSaved: 0, interestSaved: 0 },
            currency: debtCurrency,
            isMultiCurrencyUnsupported: false,
            isInsufficientPayment: hasUnpayableInterest,
            insufficientPaymentReason: hasUnpayableInterest
                ? 'Monthly payments do not cover accrued interest charges. Loans will not amortise without higher payments.'
                : undefined,
            isHorizonExceeded: !hasUnpayableInterest,
            horizonExceededReason: !hasUnpayableInterest
                ? 'Debt payoff exceeds the 50-year projection horizon with the current payment schedule.'
                : undefined,
            insufficientDebts: debts.filter(d => d.balance > 0.01).map(d => ({
                id: d.id,
                name: d.name,
                balance: d.balance,
                minimumPayment: d.minPayment,
                monthlyInterest: d.balance * d.rate
            }))
        };
    }

    // Why this exists: Return the actual month of the final payment that cleared the balance,
    // rather than overshooting into the subsequent month (Assessor Finding A).
    const freedomDate = finalPaymentDate.toISOString();
    const daysUntilFreedom = Math.ceil((finalPaymentDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24));

    let comparison = { monthsSaved: 0, interestSaved: 0 };
    if (strategy !== 'minimum') {
        const baseline = calculatePayoffPrecise(liabilities, 0, 'minimum');
        // Do not calculate savings against failed (insufficient payment) or truncated (horizon exceeded) baseline projections
        if (!baseline.isInsufficientPayment && !baseline.isHorizonExceeded && !baseline.isMultiCurrencyUnsupported && baseline.monthsToPayoff > 0) {
            comparison = {
                monthsSaved: Math.max(0, baseline.monthsToPayoff - monthsElapsed),
                interestSaved: Math.max(0, baseline.totalInterestPaid - totalInterest)
            };
        }
    }

    return {
        strategy,
        freedomDate,
        daysUntilFreedom,
        totalInterestPaid: totalInterest || 0,
        totalPayments: totalPayments || 0,
        monthsToPayoff: monthsElapsed,
        schedule,
        comparisonToMinimum: comparison,
        currency: debtCurrency,
        isMultiCurrencyUnsupported: false,
        isInsufficientPayment: false,
        isHorizonExceeded: false
    };
};
