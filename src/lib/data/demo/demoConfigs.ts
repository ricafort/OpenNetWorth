import { ProfileConfig } from './demoFactory';

/*
 * 5-Profile System:
 * 1. GETTING STARTED (Student/Early Career) - Negative net worth, focus on basics
 * 2. STABILIZING (Debt Reduction) - Turning curve, emergency fund focus
 * 3. BUILDING FOUNDATIONS (First Investments) - Positive net worth, ETFs
 * 4. WORKING FAMILY (Homeowner) - Housing dominant, kids, diverse expenses
 * 5. GROWING WEALTH (Optimizer) - Complex portfolio, multiple income streams
 */

export const GETTING_STARTED_CONFIG: ProfileConfig = {
    id: 'start',
    label: 'Getting Started',
    description: 'Early career or student.',
    baseCash: 0,
    income: 3200,
    expenses: 2900,
    assets: [
        { name: 'Checking Account', type: 'cash', value: 800 },
        { name: 'Savings Stash', type: 'cash', value: 1200 },
        { name: 'Used Sedan', type: 'other', value: 5500 }
    ],
    liabilities: [
        { name: 'Student Loans', type: 'student_loan', balance: 18000, interest: 5.5, minPayment: 150 },
        { name: 'Credit Card', type: 'credit_card', balance: 2100, interest: 24.99, minPayment: 75 }
    ],
    goals: [
        { name: 'Emergency Fund $2k', target: 2000, current: 1200, category: 'savings' },
        { name: 'Pay Off Credit Card', target: 0, current: 2100, category: 'debt_payoff' }
    ]
};

export const STABILIZING_CONFIG: ProfileConfig = {
    id: 'stab',
    label: 'Stabilizing',
    description: 'Focus on debt & savings.',
    baseCash: 0,
    income: 4500,
    expenses: 3900,
    assets: [
        { name: 'High Yield Savings', type: 'cash', value: 6000 },
        { name: 'Checking', type: 'cash', value: 1500 },
        { name: 'Car', type: 'other', value: 11000 }
    ],
    liabilities: [
        { name: 'Auto Loan', type: 'auto_loan', balance: 8500, interest: 6.2, minPayment: 280 },
        { name: 'Credit Card', type: 'credit_card', balance: 800, interest: 19.9, minPayment: 40 }
    ],
    goals: [
        { name: '3-Month Emergency Fund', target: 12000, current: 6000, category: 'savings' },
        { name: 'Start Investing', target: 5000, current: 0, category: 'investment' }
    ]
};

export const BUILDING_FOUNDATIONS_CONFIG: ProfileConfig = {
    id: 'build',
    label: 'Building Foundations',
    description: 'Consistent investing.',
    baseCash: 0,
    income: 5800,
    expenses: 4200,
    assets: [
        { name: 'Emergency Fund', type: 'cash', value: 15000 },
        { name: 'Vanguard Total Market', type: 'investment', value: 16000, investmentType: 'Index Fund', ticker: 'VTI' },
        { name: 'Apple Stock', type: 'investment', value: 2000, investmentType: 'Stock', ticker: 'AAPL' },
        { name: 'Tech Growth Stock', type: 'investment', value: 5000, investmentType: 'Stock', ticker: 'QQQ' },
        { name: 'Government Bonds', type: 'investment', value: 5000, investmentType: 'Bond', ticker: 'BND' }
    ],
    liabilities: [
        { name: 'Student Loan', type: 'student_loan', balance: 6500, interest: 4.2, minPayment: 120 }
    ],
    goals: [
        { name: 'Net Worth $100k', target: 100000, current: 43000, category: 'net_worth' }
    ]
};

export const FAMILY_CONFIG: ProfileConfig = {
    id: 'fam',
    label: 'Working Family',
    description: 'Home & dependents.',
    baseCash: 0,
    income: 8500, // Combined household?
    expenses: 7200,
    assets: [
        { name: 'Primary Residence', type: 'real_estate', value: 420000 },
        { name: '401k / Retirement', type: 'retirement', value: 82000, investmentType: 'Mutual Fund' },
        { name: 'Stock Portfolio', type: 'investment', value: 3000, investmentType: 'Stock', ticker: 'AMZN' },
        { name: 'Family Savings', type: 'cash', value: 18000 },
        { name: 'Minivan', type: 'other', value: 24000 }
    ],
    liabilities: [
        { name: 'Mortgage', type: 'mortgage', balance: 340000, interest: 5.8, minPayment: 2100 },
        { name: 'Car Loan', type: 'auto_loan', balance: 14000, interest: 5.9, minPayment: 380 }
    ],
    goals: [
        { name: 'College Fund', target: 50000, current: 5000, category: 'savings' },
        { name: 'Pay Off Car', target: 0, current: 14000, category: 'debt_payoff' }
    ]
};

export const GROWING_WEALTH_CONFIG: ProfileConfig = {
    id: 'grow',
    label: 'Growing Wealth',
    description: 'Optimization & scale.',
    baseCash: 0,
    income: 14000,
    expenses: 6500,
    assets: [
        { name: 'Investment Property', type: 'real_estate', value: 580000 },
        { name: 'Global ETF Portfolio', type: 'investment', value: 200000, investmentType: 'ETF', ticker: 'VT' },
        { name: 'Dividend Stocks', type: 'investment', value: 100000, investmentType: 'Stock', ticker: 'SCHD' },
        { name: 'Microsoft', type: 'investment', value: 35000, investmentType: 'Stock', ticker: 'MSFT' },
        { name: 'Nvidia', type: 'investment', value: 25000, investmentType: 'Stock', ticker: 'NVDA' },
        { name: 'Crypto Holdings', type: 'crypto', value: 15000, investmentType: 'Stock', ticker: 'BTC' },
        { name: 'Cash Reserves', type: 'cash', value: 50000 }
    ],
    liabilities: [
        { name: 'Rental Mortgage', type: 'mortgage', balance: 320000, interest: 4.5, minPayment: 1800 },
        { name: 'Primary Mortgage', type: 'mortgage', balance: 0, interest: 0, minPayment: 0 } // Paid off example
    ],
    goals: [
        { name: 'Financial Freedom', target: 2000000, current: 1005000, category: 'net_worth' }
    ]
};
