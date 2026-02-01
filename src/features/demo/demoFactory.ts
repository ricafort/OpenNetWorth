import { Asset, AssetType, InvestmentDetails } from '@/features/assets/types';
import { Liability, LiabilityType } from '@/features/liabilities/types';
import { RecurringTransaction } from '@/features/cashflow/types';
import { CurrencyCode } from '@/types';

export type InvestmentType = 'Stock' | 'ETF' | 'Index Fund' | 'Mutual Fund' | 'Bond' | 'Real Estate';

// Helper to map UI investment type to internal assetClass
function mapInvestmentTypeToAssetClass(type?: InvestmentType): InvestmentDetails['assetClass'] | 'other' {
    switch (type) {
        case 'Stock': return 'stock';
        case 'ETF': return 'etf';
        case 'Index Fund': return 'index_fund';
        case 'Mutual Fund': return 'mutual_fund';
        case 'Bond': return 'bond';
        case 'Real Estate': return 'real_estate';
        default: return 'other';
    }
}

/**
 * Configuration schema for defining a unique financial persona.
 * Used by the factory to generate a complete, valid user profile.
 */
export interface ProfileConfig {
    id: string;
    label: string;
    description: string;
    baseCash: number; // Split between checking/savings usually
    income: number;
    expenses: number;
    assets: {
        name: string;
        type: AssetType;
        value: number;
        investmentType?: InvestmentType;
        ticker?: string; // Optional ticker for realism
    }[];
    liabilities: {
        name: string;
        type: LiabilityType;
        balance: number;
        interest: number;
        minPayment?: number;
    }[];
    goals?: {
        name: string;
        target: number;
        current: number;
        category: 'savings' | 'debt_payoff' | 'net_worth' | 'custom' | 'investment';
        deadline?: string;
    }[];
}

export interface GeneratedProfile {
    assets: Asset[];
    liabilities: Liability[];
    recurring: RecurringTransaction[];
    goals: any[]; // Using specific type in usage
}

const MOCK_PRICES: Record<string, number> = {
    'VTI': 293,
    'TSLA': 358,
    'AAPL': 189,
    'VOO': 502,
    'BTC': 42500,
    'ETH': 2350,
    'SCHD': 78,
    'QQQ': 408,
    'BND': 72,
    'VT': 105,
    'MSFT': 420,
    'NVDA': 950,
    'AMZN': 185,
    'MOCK': 100 // Fallback
};

const MOCK_YIELDS: Record<string, number> = {
    'SCHD': 3.4,
    'VT': 2.0,
    'VTI': 1.5,
    'VOO': 1.4,
    'BND': 3.0,
    'MSFT': 0.7,
    'AAPL': 0.5,
    'NVDA': 0.05,
    'AMZN': 0,
    'BTC': 0,
    'ETH': 0
};

/**
 * Generates a full set of application data (Assets, Liabilities, Goals, Recurring)
 * based on a high-level `ProfileConfig`.
 * 
 * Auto-calculates:
 * - Share counts based on realistic stock prices.
 * - Cost basis (assuming ~20% historical gain).
 * - Dividend yields for income projection.
 * - Minimum payments for liabilities.
 */
export function generateDemoProfile(cfg: ProfileConfig): GeneratedProfile {
    const now = new Date().toISOString();

    // Generate Assets
    const assets: Asset[] = cfg.assets.map((a, i) => {
        const isLiquid = a.type === 'cash';

        let investment: InvestmentDetails | undefined = undefined;
        if (a.investmentType) {
            const ticker = a.ticker || 'MOCK';
            // Use realistic price if available, otherwise assume $100
            const price = MOCK_PRICES[ticker] || 100;
            // Calculate shares to match the total value (approx)
            const shares = a.value / price;
            // Cost basis is assumed to be lower (gains)
            const costBasisPerShare = price * 0.8; // 20% gain built in

            investment = {
                ticker: ticker,
                shares: parseFloat(shares.toFixed(4)), // Avoid floating point mess
                costBasis: parseFloat((shares * costBasisPerShare).toFixed(2)),
                assetClass: mapInvestmentTypeToAssetClass(a.investmentType),
                currentPrice: price,
                dividendYield: MOCK_YIELDS[ticker] || 0,
                sector: 'Diversified',
                lastPriceUpdate: now
            };
        }

        return {
            id: `${cfg.id}-a-${i}`,
            user_id: cfg.id, // Isolate to this profile
            name: a.name,
            type: a.type,
            value: a.value,
            currency: 'USD',
            is_liquid: isLiquid,
            last_updated: now,
            investment_details: investment
        };
    });

    // Generate Liabilities
    const liabilities: Liability[] = cfg.liabilities.map((l, i) => ({
        id: `${cfg.id}-l-${i}`,
        user_id: 'demo',
        name: l.name,
        type: l.type,
        balance: l.balance,
        interest_rate: l.interest,
        minimum_payment: l.minPayment || Math.round(l.balance * 0.03), // 3% default rule
        is_good_debt: l.type === 'mortgage' || l.type === 'student_loan',
        currency: 'USD',
        last_updated: now
    }));

    // Generate Recurring
    const recurring: RecurringTransaction[] = [
        {
            id: `${cfg.id}-r-inc`,
            name: 'Primary Income',
            type: 'income',
            amount: cfg.income,
            frequency: 'monthly',
            category: 'Salary',
            start_date: '2024-01-01',
            is_active: true
        },
        {
            id: `${cfg.id}-r-exp`,
            name: 'Living Expenses',
            type: 'expense',
            amount: cfg.expenses,
            frequency: 'monthly',
            category: 'General',
            start_date: '2024-01-01',
            is_active: true
        }
    ];

    // Generate Goals (or defaults if missing)
    const goals = (cfg.goals || []).map((g, i) => ({
        id: `${cfg.id}-g-${i}`,
        name: g.name,
        target_amount: g.target,
        current_amount: g.current,
        start_amount: g.current * 0.5, // Assume started halfway
        category: g.category,
        deadline: g.deadline || '2026-01-01',
        created_at: now
    }));

    return {
        assets,
        liabilities,
        recurring,
        goals
    };
}
