import { CurrencyCode } from '@/types';

/** Available liability categories */
export type LiabilityType = 'mortgage' | 'student_loan' | 'auto_loan' | 'credit_card' | 'other';

/**
 * A single liability (debt) owed by the user.
 * Balance is stored in the specified currency.
 */
export interface Liability {
    id: string;
    user_id?: string;
    name: string;
    type: LiabilityType;
    /** Current balance owed */
    balance: number;
    /** Defaults to 'USD' if undefined */
    currency?: CurrencyCode;
    /** Annual interest rate as decimal (e.g., 0.05 = 5%) */
    interest_rate: number;
    /** Minimum monthly payment */
    minimum_payment?: number;
    /** true = mortgage, student loan (builds equity/skills) */
    is_good_debt: boolean;
    last_updated: string;
}

export type PayoffStrategy = 'minimum' | 'avalanche' | 'snowball' | 'custom';

export interface PayoffScheduleEntry {
    month: string;           // "2024-01"
    debtId: string;
    debtName: string;
    payment: number;
    principal: number;
    interest: number;
    remainingBalance: number;
}

export interface DebtPayoffResult {
    strategy: PayoffStrategy;
    freedomDate: string;           // ISO date
    daysUntilFreedom: number;
    totalInterestPaid: number;
    totalPayments: number;
    monthsToPayoff: number;
    schedule: PayoffScheduleEntry[];
    comparisonToMinimum: {
        monthsSaved: number;
        interestSaved: number;
    };
}

export interface FreedomDateSummary {
    currentStrategy: PayoffStrategy;
    freedomDate: string;
    daysRemaining: number;
    percentComplete: number;
    totalDebtStart: number;
    totalDebtNow: number;
    paidOff: number;
}

export interface FreedomSettings {
    strategy: PayoffStrategy;
    extraMonthlyPayment: number;
}
