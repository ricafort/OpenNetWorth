
import { Asset, Liability, Goal, AssetType, LiabilityType, GoalCategory, CurrencyCode, NetWorthSnapshot, CashFlowEntry, RecurringTransaction } from '@/types';

// --- ASSETS ---
export const SAMPLE_ASSETS: Asset[] = [
    {
        id: 'demo-asset-1',
        name: 'Chase Checking',
        type: 'cash',
        value: 8500,
        currency: 'USD',
        is_liquid: true,
        last_updated: new Date().toISOString()
    },
    {
        id: 'demo-asset-2',
        name: 'High Yield Savings',
        type: 'cash',
        value: 32000,
        currency: 'USD',
        is_liquid: true,
        last_updated: new Date().toISOString()
    },
    {
        id: 'demo-asset-3',
        name: 'Vanguard 401k',
        type: 'retirement',
        value: 142105,
        currency: 'USD',
        is_liquid: false,
        last_updated: new Date().toISOString(),
        investment: {
            ticker: 'VTI',
            shares: 485,
            costBasis: 100000,
            assetClass: 'etf',
            sector: 'Diversified',
            currentPrice: 293
        }
    },
    {
        id: 'demo-asset-4',
        name: 'Tesla Stock',
        type: 'investment',
        value: 15036,
        currency: 'USD',
        is_liquid: true,
        last_updated: new Date().toISOString(),
        investment: {
            ticker: 'TSLA',
            shares: 42,
            costBasis: 12000,
            assetClass: 'stock',
            sector: 'Technology',
            currentPrice: 358
        }
    },
    {
        id: 'demo-asset-5',
        name: 'Primary Residence',
        type: 'real_estate',
        value: 485000,
        currency: 'USD',
        is_liquid: false,
        last_updated: new Date().toISOString()
    },
    {
        id: 'demo-asset-6',
        name: 'Apple Stock',
        type: 'investment',
        value: 17955,
        currency: 'USD',
        is_liquid: true,
        last_updated: new Date().toISOString(),
        investment: {
            ticker: 'AAPL',
            shares: 95,
            costBasis: 14000,
            assetClass: 'stock',
            sector: 'Technology',
            currentPrice: 189
        }
    },
    {
        id: 'demo-asset-7',
        name: 'VOO ETF',
        type: 'investment',
        value: 25100,
        currency: 'USD',
        is_liquid: true,
        last_updated: new Date().toISOString(),
        investment: {
            ticker: 'VOO',
            shares: 50,
            costBasis: 18000,
            assetClass: 'etf',
            sector: 'Diversified',
            currentPrice: 502
        }
    },
    {
        id: 'demo-asset-8',
        name: 'Bitcoin',
        type: 'crypto',
        value: 8500,
        currency: 'USD',
        is_liquid: true,
        last_updated: new Date().toISOString(),
        investment: {
            ticker: 'BTC',
            shares: 0.2,
            costBasis: 5000,
            assetClass: 'crypto',
            sector: 'Crypto',
            currentPrice: 42500
        }
    },
    {
        id: 'demo-asset-9',
        name: 'Ethereum',
        type: 'crypto',
        value: 3525,
        currency: 'USD',
        is_liquid: true,
        last_updated: new Date().toISOString(),
        investment: {
            ticker: 'ETH',
            shares: 1.5,
            costBasis: 2000,
            assetClass: 'crypto',
            sector: 'Crypto',
            currentPrice: 2350
        }
    },
    {
        id: 'demo-asset-10',
        name: '2019 Tesla Model 3',
        type: 'other',
        value: 22000,
        currency: 'USD',
        is_liquid: false,
        last_updated: new Date().toISOString()
    }
];

// --- LIABILITIES ---
export const SAMPLE_LIABILITIES: Liability[] = [
    {
        id: 'demo-liability-1',
        user_id: 'demo_user',
        name: 'Mortgage',
        type: 'mortgage',
        balance: 315000,
        currency: 'USD',
        interest_rate: 3.25,
        minimum_payment: 1650,
        is_good_debt: true,
        last_updated: new Date().toISOString()
    },
    {
        id: 'demo-liability-2',
        user_id: 'demo_user',
        name: 'Amex Platinum',
        type: 'credit_card',
        balance: 1800,
        currency: 'USD',
        interest_rate: 24.99,
        minimum_payment: 75,
        is_good_debt: false,
        last_updated: new Date().toISOString()
    },
    {
        id: 'demo-liability-3',
        user_id: 'demo_user',
        name: 'Student Loan',
        type: 'student_loan',
        balance: 12500,
        currency: 'USD',
        interest_rate: 5.8,
        minimum_payment: 200,
        is_good_debt: false,
        last_updated: new Date().toISOString()
    },
    {
        id: 'demo-liability-4',
        user_id: 'demo_user',
        name: 'Tesla Finance',
        type: 'auto_loan',
        balance: 18000,
        currency: 'USD',
        interest_rate: 4.5,
        minimum_payment: 450,
        is_good_debt: false,
        last_updated: new Date().toISOString()
    },
    {
        id: 'demo-liability-5',
        user_id: 'demo_user',
        name: 'Medical Bill',
        type: 'other',
        balance: 2200,
        currency: 'USD',
        interest_rate: 0,
        minimum_payment: 100,
        is_good_debt: false,
        last_updated: new Date().toISOString()
    }
];

// --- GOALS ---
export const SAMPLE_GOALS: Goal[] = [
    {
        id: 'demo-goal-1',
        name: 'First Million Net Worth',
        targetAmount: 1000000,
        currentAmount: 0, // Auto-calculated in UI usually, but good to init
        category: 'net_worth' as GoalCategory,
        deadline: '2030-01-01',
        createdAt: new Date().toISOString()
    },
    {
        id: 'demo-goal-2',
        name: 'Emergency Fund',
        targetAmount: 50000,
        currentAmount: 32000, // Matches High Yield Savings
        category: 'savings' as GoalCategory,
        deadline: '2025-12-31',
        createdAt: new Date().toISOString()
    },
    {
        id: 'demo-goal-3',
        name: 'Pay Off Credit Card',
        targetAmount: 0,
        currentAmount: 1800,
        startAmount: 2500, // Started with 2.5k debt
        category: 'debt_payoff' as GoalCategory,
        deadline: '2024-03-01',
        createdAt: new Date().toISOString()
    },
    {
        id: 'demo-goal-4',
        name: 'Vacation Fund',
        targetAmount: 8000,
        currentAmount: 2500,
        category: 'custom' as GoalCategory,
        deadline: '2024-08-01',
        createdAt: new Date().toISOString()
    },
    {
        id: 'demo-goal-5',
        name: 'Debt Free',
        targetAmount: 0,
        currentAmount: 349500,
        startAmount: 360000, // Started with 360k
        category: 'debt_payoff' as GoalCategory,
        deadline: '2032-06-01',
        createdAt: new Date().toISOString()
    }
];

// --- RECURRING TRANSACTIONS ---
export const SAMPLE_RECURRING: RecurringTransaction[] = [
    {
        id: 'rec-1', name: 'Software Engineer Salary', type: 'income', amount: 9000, frequency: 'monthly',
        category: 'Salary', startDate: '2023-01-01', isActive: true
    },
    {
        id: 'rec-2', name: 'Freelance Consulting', type: 'income', amount: 1500, frequency: 'monthly',
        category: 'Business', startDate: '2023-06-01', isActive: true
    },
    {
        id: 'rec-3', name: 'Dividend Income', type: 'income', amount: 150, frequency: 'monthly',
        category: 'Investments', startDate: '2023-01-01', isActive: true
    },
    {
        id: 'rec-4', name: 'Mortgage Payment', type: 'expense', amount: 1650, frequency: 'monthly',
        category: 'Housing', startDate: '2023-01-01', isActive: true
    },
    {
        id: 'rec-5', name: 'Tesla Payment', type: 'expense', amount: 450, frequency: 'monthly',
        category: 'Transportation', startDate: '2023-01-01', isActive: true
    },
    {
        id: 'rec-6', name: 'Student Loan', type: 'expense', amount: 200, frequency: 'monthly',
        category: 'Debt', startDate: '2023-01-01', isActive: true
    },
    {
        id: 'rec-7', name: 'Utilities', type: 'expense', amount: 280, frequency: 'monthly',
        category: 'Utilities', startDate: '2023-01-01', isActive: true
    },
    {
        id: 'rec-8', name: 'Groceries', type: 'expense', amount: 650, frequency: 'monthly',
        category: 'Food', startDate: '2023-01-01', isActive: true
    },
    {
        id: 'rec-9', name: 'Digital Subscriptions', type: 'expense', amount: 120, frequency: 'monthly',
        category: 'Entertainment', startDate: '2023-01-01', isActive: true
    },
    {
        id: 'rec-10', name: 'Car Insurance', type: 'expense', amount: 180, frequency: 'monthly',
        category: 'Insurance', startDate: '2023-01-01', isActive: true
    }
];

// --- CASH FLOW HISTORY (12 Months) ---
export const SAMPLE_CASHFLOW: CashFlowEntry[] = (() => {
    const entries = [];
    const today = new Date();
    // Generate 12 months back
    for (let i = 0; i < 12; i++) {
        const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
        const monthStr = d.toISOString().slice(0, 7); // YYYY-MM

        // Base numbers
        let income = 10650; // 9000 + 1500 + 150
        let expenses = 3530 + 1500; // Base fixed + variable spending

        // Add some noise
        income += Math.floor(Math.random() * 500) - 250;
        expenses += Math.floor(Math.random() * 800) - 200;

        // Spike in December (bonus / holdiay spending)
        if (d.getMonth() === 11) { // Dec
            income += 2500;
            expenses += 1200;
        }

        entries.push({
            id: `cf-hist-${i}`,
            month: monthStr,
            income,
            expenses
        });
    }
    return entries;
})();

// --- NET WORTH HISTORY (24 Months with Embedded Detail) ---
export const SAMPLE_NET_WORTH_HISTORY: NetWorthSnapshot[] = (() => {
    const history: NetWorthSnapshot[] = [];
    const today = new Date();

    // Starting point 2 years ago
    let baseAssets = 550000;
    let baseLiabilities = 420000;

    // We will generate 24 months
    for (let i = 23; i >= 0; i--) {
        const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
        const dateStr = d.toISOString().split('T')[0];

        // Monthly changes
        // Assets grow ~0.8% + noise
        const growthRate = 0.008 + (Math.random() * 0.005 - 0.002);
        baseAssets = baseAssets * (1 + growthRate);

        // Liabilities pay down ~$1000/mo
        baseLiabilities = Math.max(0, baseLiabilities - (1000 + Math.random() * 200));

        // Market dips/corrections
        // 8 months ago (dip)
        if (i === 8) baseAssets *= 0.96;
        // 15 months ago (dip)
        if (i === 15) baseAssets *= 0.94;

        const snapshot: NetWorthSnapshot = {
            id: crypto.randomUUID(), // ensure ID
            date: dateStr,
            totalAssets: Math.round(baseAssets),
            totalLiabilities: Math.round(baseLiabilities),
            netWorth: Math.round(baseAssets - baseLiabilities)
        };

        // Embed detailed assets/liabilities for Time Machine (every 3rd month or recent)
        // This is key for the "Time Machine" feature to work fully
        if (i < 3 || i % 6 === 0) {
            // Reconstruct a plausible breakdown based on totals
            const multiplierA = baseAssets / 758500; // ratio to current
            const multiplierL = baseLiabilities / 349500;

            snapshot.assets = SAMPLE_ASSETS.map(a => ({
                ...a,
                value: Math.round(a.value * multiplierA)
            }));

            snapshot.liabilities = SAMPLE_LIABILITIES.map(l => ({
                ...l,
                balance: Math.round(l.balance * multiplierL)
            }));
        }

        history.push(snapshot);
    }
    return history;
})();

// --- EXTRAS ---
export const SAMPLE_MENTORS = [
    {
        id: 'cust_buffett',
        name: 'Warren Buffett',
        archetype: 'The Oracle',
        description: 'Value investing, moats, and long-term patience.',
        icon: null // Will be handled by UI
    },
    {
        id: 'cust_naval',
        name: 'Naval Ravikant',
        archetype: 'The Philosopher',
        description: 'Wealth creation, leverage, and specific knowledge.',
        icon: null
    },
    {
        id: 'cust_housel',
        name: 'Morgan Housel',
        archetype: 'The Behavioralist',
        description: 'The psychology of money, humility, and saving.',
        icon: null
    }
];

export const SAMPLE_QUOTES = [
    "Be fearful when others are greedy and greedy when others are fearful. - Warren Buffett",
    "Wealth is assets that earn while you sleep. - Naval Ravikant",
    "Saving is the gap between your ego and your income. - Morgan Housel",
    "The best time to plant a tree was 20 years ago. The second best time is now. - Proverbs",
    "Compound interest is the eighth wonder of the world. - Albert Einstein"
];

export const SAMPLE_FREEDOM_SETTINGS = {
    strategy: 'avalanche',
    extraMonthlyPayment: 750
};

export const SAMPLE_PRICE_CACHE = {
    'VTI': { price: 293, change: 1.2, percent: 0.45, timestamp: Date.now() },
    'TSLA': { price: 358, change: -2.5, percent: -0.65, timestamp: Date.now() },
    'AAPL': { price: 189, change: 0.8, percent: 0.42, timestamp: Date.now() },
    'VOO': { price: 502, change: 1.5, percent: 0.30, timestamp: Date.now() },
    'BTC': { price: 42500, change: 1200, percent: 2.8, timestamp: Date.now() },
    'ETH': { price: 2350, change: 45, percent: 1.9, timestamp: Date.now() }
};
