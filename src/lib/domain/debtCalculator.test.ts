
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
});

