// Why this file exists:
// Finnhub's free tier lacks coverage for Australian (ASX) stock exchange tickers (e.g., CBA.AX, BHP.AX).
// Yahoo Finance (via yahoo-finance2 npm package) provides 100% free, real-time/delayed quotes for international tickers without requiring an API key.

import yahooFinance from 'yahoo-finance2';
import { PriceData } from '../marketData';

export async function fetchViaYahooFinance(ticker: string): Promise<PriceData | null> {
    try {
        const symbol = ticker.toUpperCase().trim();

        // Tricky logic: yahoo-finance2 v2 return type for quote() can be a discriminated union or generic Quote object.
        // Typing as any guarantees safe property access across package versions.
        const quote: any = await yahooFinance.quote(symbol);

        if (!quote || typeof quote.regularMarketPrice !== 'number') {
            console.warn(`Yahoo Finance returned no price for ${symbol}`);
            return null;
        }

        const price: number = quote.regularMarketPrice;
        const previousClose: number = quote.regularMarketPreviousClose || (price - (quote.regularMarketChange || 0));
        const change: number = quote.regularMarketChange ?? (price - previousClose);
        const changePercent: number = quote.regularMarketChangePercent ?? (previousClose !== 0 ? (change / previousClose) * 100 : 0);

        return {
            ticker: symbol,
            price: parseFloat(price.toFixed(2)),
            previousClose: parseFloat(previousClose.toFixed(2)),
            change: parseFloat(change.toFixed(2)),
            changePercent: parseFloat(changePercent.toFixed(2)),
            lastUpdated: new Date().toISOString(),
            isMock: false
        };

    } catch (error) {
        console.error(`Error fetching Yahoo Finance quote for ${ticker}:`, error);
        // TODO: Fallback to alternative ASX provider if yahoo-finance2 encounters DOM scraping changes
        return null;
    }
}
