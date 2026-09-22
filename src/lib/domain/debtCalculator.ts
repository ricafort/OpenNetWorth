
import { Liability } from '@/features/liabilities/types';
import { PayoffStrategy, DebtPayoffResult, PayoffScheduleEntry, FreedomDateSummary } from '@/features/liabilities/types';
import { CurrencyCode } from '@/types';

// Helper to estimate minimum payments if not provided
const estimateMinPayment = (balance: number, annualRate: number): number => {
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
            isInsufficientPayment: false
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
            isInsufficientPayment: false
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

    while (debts.some(d => d.balance > 0.01) && monthsElapsed < MAX_MONTHS) {
        const monthStr = currentDate.toISOString().slice(0, 7);

        // Calculate Pot
        // Pot = UserExtra + (Sum of [OriginalMin - CurrentActiveMin])
        // This effectively rolls over payments from paid-off debts
        const originalTotalMin = debts.reduce((sum, d) => sum + d.originalMinPayment, 0);
        const currentActiveMin = debts.reduce((sum, d) => d.balance > 0.01 ? sum + d.minPayment : 0, 0);

        // Ensure strictly positive math for the pot
        let turboAmount = safeExtra + Math.max(0, originalTotalMin - currentActiveMin);

        // If strategy is minimum only, turbo is 0
        if (strategy === 'minimum') turboAmount = 0;

        // 1. Process each debt for Minimum Payment
        debts.forEach(debt => {
            if (debt.balance <= 0.01) return;

            const interest = debt.balance * debt.rate;
            let payment = Math.min(debt.minPayment, debt.balance + interest);

            // Prevent floating point floating away
            if (payment > debt.balance + interest) payment = debt.balance + interest;

            const principal = payment - interest;
            debt.balance -= principal;

            totalInterest += interest;
            totalPayments += payment;

            schedule.push({
                month: monthStr,
                debtId: debt.id,
                debtName: debt.name,
                payment,
                principal,
                interest,
                remainingBalance: Math.max(0, debt.balance)
            });
        });

        // 2. Process Turbo Amount (Iteratively apply to top priority debts)
        // Only if we have extra AND there are debts left
        while (turboAmount > 0.01 && debts.some(d => d.balance > 0.01)) {
            const target = debts.find(d => d.balance > 0.01); // First active based on sort
            if (!target) break;

            const payment = Math.min(turboAmount, target.balance);
            target.balance -= payment;
            turboAmount -= payment;

            totalPayments += payment;

            // Update Schedule
            const entry = schedule.find(s => s.month === monthStr && s.debtId === target.id);
            if (entry) {
                entry.payment += payment;
                entry.principal += payment;
                entry.remainingBalance = Math.max(0, target.balance);
            }
        }

        currentDate.setMonth(currentDate.getMonth() + 1);
        monthsElapsed++;
    }

    // If after 600 months debts are still not cleared, report insufficient payment
    if (debts.some(d => d.balance > 0.01)) {
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
            isInsufficientPayment: true,
            insufficientPaymentReason: 'Debts could not be paid off within 50 years with the current payment schedule. Payments are insufficient to amortise the balance.',
            insufficientDebts: debts.filter(d => d.balance > 0.01).map(d => ({
                id: d.id,
                name: d.name,
                balance: d.balance,
                minimumPayment: d.minPayment,
                monthlyInterest: d.balance * d.rate
            }))
        };
    }

    const freedomDate = currentDate.toISOString();
    const daysUntilFreedom = Math.ceil((currentDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24));

    let comparison = { monthsSaved: 0, interestSaved: 0 };
    if (strategy !== 'minimum') {
        const baseline = calculatePayoffPrecise(liabilities, 0, 'minimum');
        if (!baseline.isInsufficientPayment && !baseline.isMultiCurrencyUnsupported && baseline.monthsToPayoff > 0) {
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
        isInsufficientPayment: false
    };
};
