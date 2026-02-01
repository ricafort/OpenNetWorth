'use client';

import { useMemo } from 'react';
import { useCashflowQuery } from '@/features/cashflow/hooks/useCashflowQuery';
import { useProfile } from '@/contexts/ProfileContext';
import { loadSettings, toMonthlyAmount } from '@/infrastructure/local_driver';
import { convertAmount } from '@/lib/utils/currencyService';
import { RecurringTransaction, WealthMomentum } from '@/features/cashflow/types';
import { CurrencyCode } from '@/types';

/**
 * Hook to calculate Wealth Momentum Score.
 * Decoupled from DashboardContext.
 */
export function useWealthMomentum() {
    const { recurring, isLoading } = useCashflowQuery();
    const { profile } = useProfile();

    const baseCurrency = useMemo(() => {
        if (profile?.currency_code) {
            return profile.currency_code as CurrencyCode;
        }
        if (typeof window !== 'undefined') {
            const settings = loadSettings();
            return settings.baseCurrency;
        }
        return 'USD';
    }, [profile]);

    const momentum: WealthMomentum = useMemo(() => {
        const activeRecurring = recurring.filter(t => t.is_active);

        const monthlyIncome = activeRecurring
            .filter(t => t.type === 'income')
            .reduce((sum: number, t: RecurringTransaction) => {
                const monthly = toMonthlyAmount(t.amount, t.frequency);
                return sum + convertAmount(monthly, t.currency || 'USD', baseCurrency);
            }, 0);

        const monthlyExpenses = activeRecurring
            .filter(t => t.type === 'expense')
            .reduce((sum: number, t: RecurringTransaction) => {
                const monthly = toMonthlyAmount(t.amount, t.frequency);
                return sum + convertAmount(monthly, t.currency || 'USD', baseCurrency);
            }, 0);

        const monthlySavings = monthlyIncome - monthlyExpenses;
        const savingsRate = monthlyIncome > 0 ? (monthlySavings / monthlyIncome) * 100 : 0;

        let score = savingsRate;
        if (savingsRate > 50) score += 10;
        else if (savingsRate > 30) score += 5;
        else if (savingsRate > 20) score += 5;
        if (savingsRate < 0) score -= 10;
        score = Math.max(0, Math.min(100, score));

        return {
            score: Math.round(score),
            monthlyRecurringIncome: monthlyIncome,
            monthlyRecurringExpenses: monthlyExpenses,
            monthlySavings,
            savingsRate,
            annualProjectedSavings: monthlySavings * 12
        };
    }, [recurring, baseCurrency]);

    return {
        momentum,
        isLoading
    };
}
