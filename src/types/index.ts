export type AssetType = 'cash' | 'investment' | 'crypto' | 'real_estate' | 'retirement' | 'other';
export type LiabilityType = 'mortgage' | 'student_loan' | 'auto_loan' | 'credit_card' | 'other';
export type CurrencyCode = 'USD' | 'EUR' | 'GBP' | 'JPY' | 'CAD' | 'AUD' | 'CHF' | 'CNY' | 'INR' | 'SGD';

export interface InvestmentDetails {
    ticker: string;              // e.g., "AAPL", "VTI"
    shares: number;
    costBasis: number;           // Total cost paid
    currentPrice?: number;       // Live price (fetched)
    previousClose?: number;      // For daily change
    lastPriceUpdate?: string;    // ISO timestamp
    dividendYield?: number;      // Annual yield %
    sector?: string;             // e.g., "Technology"
    assetClass: 'stock' | 'etf' | 'crypto' | 'bond' | 'mutual_fund' | 'index_fund' | 'real_estate' | 'other';
}

export interface Asset {
    id: string;
    name: string;
    type: AssetType;
    value: number;
    currency?: CurrencyCode;     // Default to 'USD' if undefined
    investment?: InvestmentDetails; // Optional investment details
    is_liquid: boolean;
    last_updated: string;
}

export interface Liability {
    id: string;
    user_id: string;
    name: string;
    type: LiabilityType;
    balance: number;
    currency?: CurrencyCode;     // Default to 'USD' if undefined
    interest_rate: number;
    minimum_payment?: number;
    is_good_debt: boolean;
    last_updated: string;
}

export interface NetWorthSnapshot {
    date: string;
    netWorth: number;
    totalAssets: number;
    totalLiabilities: number;
    assets?: Asset[];
    liabilities?: Liability[];
}

export type GoalCategory = 'net_worth' | 'savings' | 'debt_payoff' | 'custom';

export interface Goal {
    id: string;
    name: string;
    targetAmount: number;
    currentAmount: number;
    startAmount?: number;  // Initial amount when goal was created (crucial for debt payoff progress)
    deadline?: string;     // ISO date
    category: GoalCategory;
    createdAt: string;
}

export interface CashFlowEntry {
    id: string;
    month: string;         // YYYY-MM format
    income: number;
    expenses: number;
}

export interface Mentor {
    id: string;
    name: string;
    archetype: string;
    description: string;
    avatar: string;
    quote: string;
}

export interface MentorInteraction {
    id: string;
    user_id: string;
    mentor_id: string;
    message: string;
    role: 'user' | 'mentor';
    mode: 'learn' | 'reflect';
    created_at: string;
}

export interface DashboardMetrics {
    total_assets: number;
    total_liabilities: number;
    net_worth: number;
    debt_to_asset_ratio: number;
    liquidity_ratio: number;
    savings_rate: number;
}

export interface RecurringTransaction {
    id: string;
    name: string;
    amount: number;
    type: 'income' | 'expense';
    frequency: 'weekly' | 'biweekly' | 'monthly' | 'quarterly' | 'yearly';
    category: string;
    startDate: string;
    endDate?: string;
    isActive: boolean;
    lastApplied?: string;
    notes?: string;
}

export interface WealthMomentum {
    score: number;
    monthlyRecurringIncome: number;
    monthlyRecurringExpenses: number;
    monthlySavings: number;
    savingsRate: number;
    annualProjectedSavings: number;
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

export interface UserSettings {
    baseCurrency: CurrencyCode;
    theme: 'light' | 'stealth' | 'system';
    checkInFrequency: 'weekly' | 'biweekly' | 'monthly';
    lastCheckIn?: string;
}

export interface DashboardConfig {
    layouts: any; // Using any to avoid circular dependency, cast in usage
    hiddenWidgets: string[];
    version: number;
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
