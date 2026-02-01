import { CurrencyCode } from '@/types';

/** Available asset categories */
export type AssetType = 'cash' | 'investment' | 'crypto' | 'real_estate' | 'retirement' | 'vehicle' | 'collectible' | 'other';

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
    /** Owner ID (for isolation) */
    user_id?: string;
    type: AssetType;
    /** Current value in `currency` */
    value: number;
    /** Defaults to 'USD' if undefined */
    currency?: CurrencyCode;
    /** Only present for investment-type assets */
    investment_details?: InvestmentDetails;
    /** true = easily converted to cash (savings, stocks) */
    is_liquid: boolean;
    /** APY for interest-bearing accounts */
    interest_rate?: number;
    last_updated: string;
}
