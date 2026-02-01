
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
});
