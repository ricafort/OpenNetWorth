
import { Liability } from '@/features/liabilities/types';
import { PayoffStrategy, DebtPayoffResult, PayoffScheduleEntry, FreedomDateSummary } from '@/features/liabilities/types';

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
    // Setup and Sanitize
    let debts = liabilities
        .filter(l => (l.balance || 0) > 0)
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
            } else {
                // Creating a new entry if the minimum payment didn't exist (should happen only if min payment was 0?)
                // Rarely happens unless min payment logic is zero.
            }
        }

        currentDate.setMonth(currentDate.getMonth() + 1);
        monthsElapsed++;
    }

    const freedomDate = currentDate.toISOString();
    const daysUntilFreedom = Math.ceil((currentDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24));

    // Calculate comparison logic here if needed, or rely on separate calls
    let comparison = { monthsSaved: 0, interestSaved: 0 };

    return {
        strategy,
        freedomDate,
        daysUntilFreedom,
        totalInterestPaid: totalInterest || 0, // Ensure not NaN
        totalPayments: totalPayments || 0,
        monthsToPayoff: monthsElapsed,
        schedule,
        comparisonToMinimum: comparison
    };
};
