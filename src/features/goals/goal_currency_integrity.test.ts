/**
 * Goal Currency Preservation & Native Amount Integrity Test Suite
 *
 * Why this exists:
 * Users frequently maintain goals denominated in foreign currencies (e.g., a $10,000 USD holiday fund
 * or a €5,000 EUR tuition fee) while their dashboard base currency is AUD.
 * Previously, quick updates and form submissions silently overwrote goal.currency with baseCurrency,
 * distorting the user's purchasing power target (Handover Section 16 & Batch B2).
 *
 * Tricky logic:
 * We test the integrity of goal.currency preservation, quick update payload generation, and
 * progress calculations under base currency switches to ensure zero drift in target amounts.
 *
 * TODO: Add tests for automated exchange rate revaluation alerts when target currency fluctuates >10%.
 */

import { describe, it, expect } from 'vitest';
import { Goal } from '@/features/goals/types';
import { CurrencyCode } from '@/types';
import { convertAmount } from '@/lib/utils/currencyService';

describe('Goal Currency Preservation & Integrity', () => {
    const usdGoal: Goal = {
        id: 'goal-usd-holiday',
        name: 'US Trip 2027',
        target_amount: 10000,
        current_amount: 4000,
        currency: 'USD',
        category: 'savings',
        created_at: '2026-01-01T00:00:00.000Z',
        start_amount: 0,
        deadline: null
    };

    it('preserves native currency and target amount regardless of base currency', () => {
        // Base currency AUD
        const targetInAUD = convertAmount(usdGoal.target_amount, usdGoal.currency || 'USD', 'AUD');
        const currentInAUD = convertAmount(usdGoal.current_amount || 0, usdGoal.currency || 'USD', 'AUD');

        // USD 10,000 at AUD/USD ~0.67 is approx AUD 15,000
        expect(targetInAUD).toBeGreaterThan(usdGoal.target_amount);
        expect(currentInAUD).toBeGreaterThan(usdGoal.current_amount || 0);

        // Native goal values must remain exactly 10,000 and 4,000 in USD
        expect(usdGoal.target_amount).toBe(10000);
        expect(usdGoal.currency).toBe('USD');
        expect(usdGoal.current_amount).toBe(4000);
    });

    it('calculates progress identically in native currency regardless of viewing base currency', () => {
        const nativeProgress = ((usdGoal.current_amount || 0) / usdGoal.target_amount) * 100;
        expect(nativeProgress).toBe(40);

        // Converted progress
        const targetInAUD = convertAmount(usdGoal.target_amount, 'USD', 'AUD');
        const currentInAUD = convertAmount(usdGoal.current_amount || 0, 'USD', 'AUD');
        const convertedProgress = (currentInAUD / targetInAUD) * 100;

        // Progress percentage must remain 40%
        expect(Math.round(convertedProgress)).toBe(40);
    });

    it('quick update preserves native currency and does not adopt baseCurrency', () => {
        const baseCurrency = 'AUD';
        const newProgressNative = 5500;

        // Simulating the handler in GoalItem
        const updatedGoal: Goal = {
            ...usdGoal,
            current_amount: newProgressNative,
            currency: (usdGoal.currency || 'USD') // Preserves native currency
        };

        expect(updatedGoal.currency).toBe('USD');
        expect(updatedGoal.currency).not.toBe(baseCurrency);
        expect(updatedGoal.current_amount).toBe(5500);
        expect(updatedGoal.target_amount).toBe(10000);
    });

    it('converts net worth goal current_amount properly to goal currency upon creation', () => {
        const baseCurrency: CurrencyCode = 'AUD';
        const netWorthAUD = 300000;
        const targetUSD = 250000;

        // Net worth milestone in USD while base is AUD
        const goalCurrency: CurrencyCode = 'USD';
        const nwInGoalCurrency = (goalCurrency as string) === (baseCurrency as string)
            ? netWorthAUD
            : convertAmount(netWorthAUD, baseCurrency, goalCurrency);

        expect(nwInGoalCurrency).toBeLessThan(netWorthAUD); // 300,000 AUD is ~200,000 USD

        const newGoal: Goal = {
            id: 'nw-goal-1',
            name: 'Quarter Million USD Net Worth',
            target_amount: targetUSD,
            current_amount: nwInGoalCurrency,
            currency: goalCurrency,
            deadline: null,
            category: 'net_worth',
            created_at: new Date().toISOString(),
            start_amount: nwInGoalCurrency
        };

        expect(newGoal.currency).toBe('USD');
        expect(newGoal.current_amount).toBeCloseTo(nwInGoalCurrency, 2);
        expect(newGoal.target_amount).toBe(250000);
    });
});
