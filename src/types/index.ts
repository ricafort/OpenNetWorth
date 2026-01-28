/**
 * @fileoverview Core TypeScript definitions for ClearWorth.
 * These types are used throughout the application for assets, liabilities, and financial tracking.
 */

/** Available asset categories */
export type AssetType = 'cash' | 'investment' | 'crypto' | 'real_estate' | 'retirement' | 'other';

/** Available liability categories */
export type LiabilityType = 'mortgage' | 'student_loan' | 'auto_loan' | 'credit_card' | 'other';

/** Supported currencies (ISO 4217 codes) */
export type CurrencyCode = 'USD' | 'EUR' | 'GBP' | 'JPY' | 'CAD' | 'AUD' | 'CHF' | 'CNY' | 'INR' | 'SGD' | 'PHP' | 'KRW';

/**
 * User profile from Supabase auth.
 * Links to auth.users table via `id`.
 */
export interface UserProfile {
    /** UUID from Supabase auth.users */
    id: string;
    email: string;
    full_name?: string;
    avatar_url?: string;
    /** When true, sensitive values may be hidden in UI */
    privacy_mode: boolean;
    /** If true, this is a demo/template profile (not a real user) */
    is_template: boolean;
    /** 'admin' users can manage templates */
    role: 'user' | 'admin';
    /** Display name for template profiles (e.g., "UK Starter") */
    template_name?: string;
    /** ISO 3166-1 alpha-2 (e.g., 'US', 'GB') */
    country_code?: string;
    /** Base currency for all financial displays */
    currency_code: CurrencyCode;
    /** Links to economic benchmarks (e.g., 'p50') */
    benchmark_bracket?: string;
    /** Display string like "$45k - $135k" */
    income_range_display?: string;
    created_at: string;
}

/**
 * Details for investment-type assets.
 * Stores ticker, shares, and live price data.
 */
export interface InvestmentDetails {
    /** Stock/ETF ticker symbol (e.g., "AAPL", "VTI") */
    ticker: string;
    /** Number of shares owned */
    shares: number;
    /** Total cost paid (for gain/loss calc) */
    costBasis: number;
    /** Live price from Alpha Vantage (fetched) */
    currentPrice?: number;
    /** Previous day's close for daily change */
    previousClose?: number;
    /** ISO timestamp of last price fetch */
    lastPriceUpdate?: string;
    /** Annual dividend yield as decimal (e.g., 0.02 = 2%) */
    dividendYield?: number;
    /** Sector classification (e.g., "Technology") */
    sector?: string;
    assetClass: 'stock' | 'etf' | 'crypto' | 'bond' | 'mutual_fund' | 'index_fund' | 'real_estate' | 'other';
}

/**
 * A single asset owned by the user.
 * Value is stored in the specified currency.
 */
export interface Asset {
    id: string;
    name: string;
    type: AssetType;
    /** Current value in `currency` */
    value: number;
    /** Defaults to 'USD' if undefined */
    currency?: CurrencyCode;
    /** Only present for investment-type assets */
    investment?: InvestmentDetails;
    /** true = easily converted to cash (savings, stocks) */
    is_liquid: boolean;
    /** APY for interest-bearing accounts */
    interest_rate?: number;
    last_updated: string;
}

/**
 * A single liability (debt) owed by the user.
 * Balance is stored in the specified currency.
 */
export interface Liability {
    id: string;
    user_id: string;
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

/**
 * Point-in-time snapshot of net worth.
 * Used for historical charts and Time Machine.
 */
export interface NetWorthSnapshot {
    id: string; // Added for DataService compatibility
    /** ISO date string */
    date: string;
    netWorth: number;
    totalAssets: number;
    totalLiabilities: number;
    /** Optional: detailed breakdown at this moment */
    assets?: Asset[];
    liabilities?: Liability[];
}

export type GoalCategory = 'net_worth' | 'savings' | 'debt_payoff' | 'custom';

export interface Goal {
    id: string;
    name: string;
    targetAmount: number;
    currentAmount: number;
    currency?: CurrencyCode; // Default 'USD'
    startAmount?: number;  // Initial amount when goal was created (crucial for debt payoff progress)
    deadline?: string;     // ISO date
    category: GoalCategory;
    isCompleted?: boolean; // Added for tracking status
    lastUpdated?: string;  // Added for sync tracking
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
    currency?: CurrencyCode; // Added for God Mode
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
