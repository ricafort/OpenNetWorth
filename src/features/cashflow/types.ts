import { CurrencyCode } from '@/types';

export interface CashFlowEntry {
    id: string;
    month: string;         // YYYY-MM format
    income: number;
    expenses: number;
}

export interface RecurringTransaction {
    id: string;
    user_id?: string;
    name: string;
    amount: number;
    type: 'income' | 'expense';
    frequency: 'weekly' | 'biweekly' | 'monthly' | 'quarterly' | 'yearly';
    category: string;
    start_date: string;
    end_date?: string;
    is_active: boolean;
    last_applied?: string;
    notes?: string;
    currency?: CurrencyCode; // Added for God Mode
}

export interface WealthMomentum {
    score: number;
    monthlyRecurringIncome: number;
    monthlyRecurringExpenses: number;
    monthlySavings: number;
    savingsRate: number;
    annualProjectedSavings: number;
    activeRulesCount?: number;
}
