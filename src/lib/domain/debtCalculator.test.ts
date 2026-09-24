
import { describe, it, expect } from 'vitest';
import { calculatePayoff } from './debtCalculator';
import { Liability } from '@/features/liabilities/types';

describe('DebtCalculator', () => {
    const defaultLiability: Liability = {
        id: '1',
        user_id: 'user1',
        name: 'Credit Card',
        type: 'credit_card',
        balance: 5000,
        interest_rate: 20, // 20% APR
        minimum_payment: 100,
        is_good_debt: false,
        currency: 'USD',
        last_updated: new Date().toISOString()
    };

    it('should calculate payoff for a single debt with minimum payments', () => {
        const liabilities = [defaultLiability];
        const result = calculatePayoff(liabilities, 0, 'minimum');

        expect(result.strategy).toBe('minimum');
        expect(result.monthsToPayoff).toBeGreaterThan(0);
        expect(result.totalInterestPaid).toBeGreaterThan(0);
        expect(result.schedule.length).toBeGreaterThan(0);
        // Approx check: 5000 at 20% paying min 100 takes a long time
        // validation logic: interest/mo = 5000 * 0.2 / 12 = 83.33. Prin = 16.67.
    });

    it('should pay off faster with extra payments', () => {
        const liabilities = [defaultLiability];
        const resultMin = calculatePayoff(liabilities, 0, 'minimum');
        const resultExtra = calculatePayoff(liabilities, 500, 'avalanche');

        expect(resultExtra.monthsToPayoff).toBeLessThan(resultMin.monthsToPayoff);
        expect(resultExtra.totalInterestPaid).toBeLessThan(resultMin.totalInterestPaid);
    });

    it('should prioritize highest interest rate in avalanche strategy', () => {
        const lowRateDebt = { ...defaultLiability, id: 'low', interest_rate: 5, balance: 1000, minimum_payment: 50 };
        const highRateDebt = { ...defaultLiability, id: 'high', interest_rate: 50, balance: 1000, minimum_payment: 50 }; // Predatory loan!

        const liabilities = [lowRateDebt, highRateDebt];
        const result = calculatePayoff(liabilities, 500, 'avalanche');

        // Expect high rate debt to be paid off first or significantly reduced early
        // Logic check: first month payment. 
        // Pot = 500 + 50 + 50 = 600.
        // Mins: 50 to low, 50 to high.
        // Extra: 500. Avalanche targets HIGH first.

        const firstMonth = result.schedule.filter(s => s.month === result.schedule[0].month);
        const highPayment = firstMonth.find(s => s.debtId === 'high')?.payment || 0;
        const lowPayment = firstMonth.find(s => s.debtId === 'low')?.payment || 0;

        expect(highPayment).toBeGreaterThan(lowPayment);
    });

    it('should handle zero liabilities gracefully', () => {
        const result = calculatePayoff([], 0, 'avalanche');
        expect(result.monthsToPayoff).toBe(0);
        expect(result.totalPayments).toBe(0);
    });

    // Why this test exists:
    // Implements Finding 6: Combining debts in mixed currencies (AUD and JPY) in a single payoff calculation
    // is mathematically invalid and must be rejected with isMultiCurrencyUnsupported: true.
    // Tricky logic:
    // Debts with zero balance do not trigger multi-currency rejection; only active debts (>0 balance) are evaluated.
    // TODO: In Milestone 2, test independent per-currency payoff schedules.
    it('flags mixed-currency active debts as unsupported rather than manufacturing combined totals', () => {
        const audDebt: Liability = {
            id: 'aud-debt',
            user_id: 'user1',
            name: 'AUD Card',
            type: 'credit_card',
            balance: 5000,
            interest_rate: 18,
            minimum_payment: 100,
            is_good_debt: false,
            currency: 'AUD',
            last_updated: new Date().toISOString()
        };

        const jpyDebt: Liability = {
            id: 'jpy-debt',
            user_id: 'user1',
            name: 'JPY Loan',
            type: 'other',
            balance: 500000,
            interest_rate: 3.5,
            minimum_payment: 15000,
            is_good_debt: false,
            currency: 'JPY',
            last_updated: new Date().toISOString()
        };

        const result = calculatePayoff([audDebt, jpyDebt], 200, 'avalanche');
        expect(result.isMultiCurrencyUnsupported).toBe(true);
        expect(result.unsupportedCurrencies).toEqual(['AUD', 'JPY']);
        expect(result.schedule).toHaveLength(0);
    });

    // Case 15: Test a loan with insufficient payments (Handover Case 15 & Finding)
    it('Case 15: reports explicit insufficient-payment outcome and suppresses fabricated payoff date for non-amortising loan', () => {
        // Why this test exists:
        // Resolves Handover Case 15: A loan where minimum payment does not cover monthly interest charges
        // cannot amortise. Previous versions simulated up to 600 months (50 years) and fabricated a misleading
        // payoff date. The system must report isInsufficientPayment: true with freedomDate suppressed.
        // Tricky logic:
        // $10,000 at 24% APR accrues $200 in interest per month ($10,000 * 0.24 / 12).
        // A minimum payment of $100 covers only half the interest. The balance increases by $100 each month.
        // TODO: In Milestone 2, provide an interactive slider showing the required minimum payment to amortise within target years.
        const nonAmortisingLoan: Liability = {
            id: 'predatory-card',
            user_id: 'user1',
            name: 'High APR Card',
            type: 'credit_card',
            balance: 10000,
            interest_rate: 24, // 24% APR -> $200/mo interest
            minimum_payment: 100, // $100 payment < $200 interest
            is_good_debt: false,
            currency: 'AUD',
            last_updated: new Date().toISOString()
        };

        // 1. In minimum strategy, fails immediately
        const minResult = calculatePayoff([nonAmortisingLoan], 0, 'minimum');
        expect(minResult.isInsufficientPayment).toBe(true);
        expect(minResult.freedomDate).toBe('');
        expect(minResult.monthsToPayoff).toBe(0);
        expect(minResult.daysUntilFreedom).toBe(0);
        expect(minResult.schedule).toHaveLength(0);
        expect(minResult.insufficientDebts).toBeDefined();
        expect(minResult.insufficientDebts?.[0].name).toBe('High APR Card');
        expect(minResult.insufficientDebts?.[0].monthlyInterest).toBe(200);
        expect(minResult.insufficientDebts?.[0].minimumPayment).toBe(100);

        // 2. In avalanche strategy with underfunded extra payment ($50 extra -> $150 total < $200 interest)
        const underfundedResult = calculatePayoff([nonAmortisingLoan], 50, 'avalanche');
        expect(underfundedResult.isInsufficientPayment).toBe(true);
        expect(underfundedResult.freedomDate).toBe('');

        // 3. In avalanche strategy with sufficient extra payment ($150 extra -> $250 total > $200 interest)
        const fundedResult = calculatePayoff([nonAmortisingLoan], 150, 'avalanche');
        expect(fundedResult.isInsufficientPayment).toBe(false);
        expect(fundedResult.monthsToPayoff).toBeGreaterThan(0);
        expect(fundedResult.freedomDate).not.toBe('');
    });

    // Why this test exists:
    // Resolves Assessor Finding A: freedomDate was previously calculated from currentDate AFTER the final
    // loop iteration incremented setMonth(+1), causing payoff date to overshoot by exactly one month.
    // Tricky logic:
    // For a 1-month loan, the payoff date must match the month of the single schedule entry, not the subsequent month.
    // TODO: Support mid-month payment settlement dates in Milestone 2.
    it('records exact final payment month without +1 month overshoot', () => {
        const singleMonthLoan: Liability = {
            id: 'short-loan',
            user_id: 'user1',
            name: 'Short Loan',
            type: 'other',
            balance: 100,
            interest_rate: 0,
            minimum_payment: 100,
            is_good_debt: false,
            currency: 'USD',
            last_updated: new Date().toISOString()
        };

        const result = calculatePayoff([singleMonthLoan], 0, 'minimum');
        expect(result.monthsToPayoff).toBe(1);
        expect(result.schedule).toHaveLength(1);

        const scheduleMonth = result.schedule[0].month; // e.g. "2026-10"
        const freedomMonth = result.freedomDate.slice(0, 7);
        expect(freedomMonth).toBe(scheduleMonth);
    });

    // Why this test exists:
    // Resolves Handover Section 15 & Assessor Finding A: A loan where payment covers interest charges amortises
    // principal, but may require longer than the 50-year (600-month) projection horizon.
    // Previous code conflated this with non-amortising loans (isInsufficientPayment).
    // The system must distinguish isHorizonExceeded (payments amortise, but > 50 years) from isInsufficientPayment.
    // Tricky logic:
    // Balance: $1,000,000 at 1.2% APR -> $1,000/mo interest. Min payment: $1,010/mo.
    // Payment > interest ($10 principal reduction/mo), so loan amortises, but takes 100,000 months (> 600 months).
    // TODO: In Milestone 2, allow user-configurable projection horizon in settings.
    it('distinguishes horizon-exceeded amortising loans from non-amortising loans', () => {
        const longAmortisingLoan: Liability = {
            id: 'jumbo-mortgage',
            user_id: 'user1',
            name: 'Jumbo Mortgage',
            type: 'mortgage',
            balance: 1000000,
            interest_rate: 1.2, // 1.2% APR -> $1,000 monthly interest
            minimum_payment: 1010, // $1,010 payment > $1,000 interest (amortises by $10/mo)
            is_good_debt: true,
            currency: 'USD',
            last_updated: new Date().toISOString()
        };

        const result = calculatePayoff([longAmortisingLoan], 0, 'minimum');
        expect(result.isInsufficientPayment).toBe(false);
        expect(result.isHorizonExceeded).toBe(true);
        expect(result.horizonExceededReason).toContain('exceeds the 50-year projection horizon');
        expect(result.freedomDate).toBe('');
        expect(result.monthsToPayoff).toBe(0);
    });

    // Why this test exists:
    // Resolves Assessor Finding A: When baseline (minimum strategy) projection exceeds horizon or is non-amortising,
    // comparing an accelerated strategy to that baseline must not calculate bogus savings against a truncated baseline.
    // Tricky logic:
    // If baseline.isHorizonExceeded is true, baseline.monthsToPayoff is 0. An accelerated plan must report 0 monthsSaved
    // and 0 interestSaved instead of comparing against an incomplete 600-month snapshot.
    it('does not calculate invalid savings comparison against a horizon-exceeded baseline', () => {
        const longAmortisingLoan: Liability = {
            id: 'jumbo-mortgage',
            user_id: 'user1',
            name: 'Jumbo Mortgage',
            type: 'mortgage',
            balance: 1000000,
            interest_rate: 1.2,
            minimum_payment: 1010,
            is_good_debt: true,
            currency: 'USD',
            last_updated: new Date().toISOString()
        };

        // Extra payment of $10,000/mo makes it pay off in ~90 months
        const acceleratedResult = calculatePayoff([longAmortisingLoan], 10000, 'avalanche');
        expect(acceleratedResult.isHorizonExceeded).toBe(false);
        expect(acceleratedResult.monthsToPayoff).toBeGreaterThan(0);
        // Comparison to minimum must be guarded since minimum exceeds 50-year horizon
        expect(acceleratedResult.comparisonToMinimum.monthsSaved).toBe(0);
        expect(acceleratedResult.comparisonToMinimum.interestSaved).toBe(0);
    });

    // Why this test exists:
    // Fulfills Item 1 Acceptance: Two debts of $100 each, zero interest, $10 minimum each,
    // and $180 extra must clear in one month with $200 total paid.
    // Tricky logic:
    // After Debt 1 is cleared with $10 min + $90 extra (leaving $90 extra budget remaining),
    // the remaining budget must immediately be applied to Debt 2 in the same month.
    // TODO: In Milestone 2, allow user to prioritize extra budget by debt tag/category.
    it('Item 1: continues applying remaining monthly extra payment budget to next debt, clearing both in one month', () => {
        const debtA: Liability = {
            id: 'debt-a',
            user_id: 'user1',
            name: 'Debt A',
            type: 'other',
            balance: 100,
            interest_rate: 0,
            minimum_payment: 10,
            is_good_debt: false,
            currency: 'USD',
            last_updated: new Date().toISOString()
        };
        const debtB: Liability = {
            id: 'debt-b',
            user_id: 'user1',
            name: 'Debt B',
            type: 'other',
            balance: 100,
            interest_rate: 0,
            minimum_payment: 10,
            is_good_debt: false,
            currency: 'USD',
            last_updated: new Date().toISOString()
        };

        const result = calculatePayoff([debtA, debtB], 180, 'avalanche');

        expect(result.monthsToPayoff).toBe(1);
        expect(result.totalPayments).toBe(200);
        expect(result.totalInterestPaid).toBe(0);
        expect(result.schedule).toHaveLength(2);

        const entryA = result.schedule.find(s => s.debtId === 'debt-a');
        const entryB = result.schedule.find(s => s.debtId === 'debt-b');

        expect(entryA?.payment).toBe(100);
        expect(entryA?.principal).toBe(100);
        expect(entryA?.remainingBalance).toBe(0);

        expect(entryB?.payment).toBe(100);
        expect(entryB?.principal).toBe(100);
        expect(entryB?.remainingBalance).toBe(0);
    });

    // Why this test exists:
    // Fulfills Item 2 Acceptance:
    // $1,000 at 12% APR, minimum $1 plus extra $20: payment $21; interest $10; principal reduction $11; closing balance $989.
    // Also covers a month where interest exceeds total payment (negative principal reduction, growing balance).
    // Tricky logic:
    // When minimum-payment principal was previously clamped with Math.max(0, payment - interest),
    // adding extra payment resulted in principal = $20 instead of $11. True double-entry arithmetic
    // requires principal = totalPayment - interest.
    // TODO: In Milestone 2, add warning in UI when interest charges exceed total monthly payments.
    it('Item 2: calculates principal from actual payment minus interest, including negative amortization when interest exceeds payment', () => {
        // Part A: $1,000 at 12% APR, min $1 + extra $20
        const debt1: Liability = {
            id: 'debt-1',
            user_id: 'user1',
            name: 'Card 1',
            type: 'credit_card',
            balance: 1000,
            interest_rate: 12, // 12% APR -> 1%/mo -> $10 interest
            minimum_payment: 1,
            is_good_debt: false,
            currency: 'USD',
            last_updated: new Date().toISOString()
        };

        const resultA = calculatePayoff([debt1], 20, 'avalanche');
        expect(resultA.schedule.length).toBeGreaterThan(0);
        const firstMonthA = resultA.schedule[0];

        expect(firstMonthA.payment).toBe(21);
        expect(firstMonthA.interest).toBe(10);
        expect(firstMonthA.principal).toBe(11);
        expect(firstMonthA.remainingBalance).toBe(989);

        // Part B: Month where interest exceeds total payment
        // Debt 1: $1,000 at 24% APR (interest = $20), min $5.
        // Debt 2: $100 at 0% APR, min $10.
        // Extra payment: $10 using Snowball strategy (targets Debt 2).
        // Total payment pool = $5 + $10 + $10 = $25 > total interest ($20), so pool amortises.
        // For Debt 1: only $5 min payment is made against $20 interest.
        // Schedule entry for Debt 1 must show payment: 5, interest: 20, principal: -15, remaining balance: 1015.
        const debtHighInterest: Liability = {
            id: 'debt-high',
            user_id: 'user1',
            name: 'High APR Card',
            type: 'credit_card',
            balance: 1000,
            interest_rate: 24, // 24% APR -> 2%/mo -> $20 interest
            minimum_payment: 5,
            is_good_debt: false,
            currency: 'USD',
            last_updated: new Date().toISOString()
        };
        const debtSmall: Liability = {
            id: 'debt-small',
            user_id: 'user1',
            name: 'Small Zero APR Card',
            type: 'credit_card',
            balance: 100,
            interest_rate: 0,
            minimum_payment: 10,
            is_good_debt: false,
            currency: 'USD',
            last_updated: new Date().toISOString()
        };

        const resultB = calculatePayoff([debtHighInterest, debtSmall], 10, 'snowball');
        expect(resultB.schedule.length).toBeGreaterThan(0);
        const highDebtEntry = resultB.schedule.find(s => s.debtId === 'debt-high' && s.month === resultB.schedule[0].month);

        expect(highDebtEntry).toBeDefined();
        expect(highDebtEntry?.payment).toBe(5);
        expect(highDebtEntry?.interest).toBe(20);
        expect(highDebtEntry?.principal).toBe(-15);
        expect(highDebtEntry?.remainingBalance).toBe(1015);
    });
});


