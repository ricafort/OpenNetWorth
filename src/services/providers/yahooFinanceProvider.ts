// Why this file exists:
// Finnhub's free tier lacks coverage for Australian (ASX) stock exchange tickers (e.g., CBA.AX, BHP.AX).
// Yahoo Finance (via yahoo-finance2 npm package) provides 100% free, real-time/delayed quotes for international tickers without requiring an API key.

import YahooFinance from 'yahoo-finance2';
import { PriceData } from '../marketData';

// Why this exists: Finnhub lacks coverage for ASX (.AX) stocks. Yahoo Finance covers international tickers.
// Tricky logic: yahoo-finance2 v3 requires instantiation via `new YahooFinance(...)` rather than static methods.
// We suppress the interactive survey notice to keep local and server logs clean.
// TODO: Add rate-limit retry backoff if Yahoo Finance enforces tighter IP throttling in the future.
const yahooFinance = typeof YahooFinance === 'function'
    ? new (YahooFinance as any)({ suppressNotices: ['yahooSurvey'] })
    : (YahooFinance as any);

/**
 * Normalizes raw Yahoo Finance quote object into a clean PriceData structure.
 * 
 * Why this function exists:
 * Resolves Assessor Finding C: London Stock Exchange quotes on Yahoo Finance are denominated
 * in pence sterling ('GBp' or 'GBX'). If returned as-is with currency 'GBP', assets are overvalued by 100x.
 * 
 * Tricky logic:
 * When currency is 'GBp' or 'GBX', divide price, previousClose, and change by 100, and normalize currency to 'GBP'.
 * changePercent is an invariant ratio/percentage and must NOT be divided by 100.
 * Exporting this function allows pure, deterministic unit testing without external HTTP network dependency.
 * 
 * TODO: Support sub-penny fractions (e.g. 4 decimals) for UK microcaps if requested.
 */
export function normalizeYahooQuote(quote: any, ticker: string): PriceData | null {
    if (!quote || typeof quote.regularMarketPrice !== 'number') {
        return null;
    }

    const symbol = ticker.toUpperCase().trim();
    const rawCurrency = quote.currency || (symbol.endsWith('.AX') ? 'AUD' : 'USD');
    const isPence = typeof rawCurrency === 'string' && (rawCurrency === 'GBp' || rawCurrency === 'GBX');
    const divisor = isPence ? 100 : 1;
    const currency = isPence
        ? 'GBP'
        : (typeof rawCurrency === 'string' ? rawCurrency.toUpperCase() : 'USD');

    const price: number = quote.regularMarketPrice / divisor;
    const previousClose: number = quote.regularMarketPreviousClose != null
        ? quote.regularMarketPreviousClose / divisor
        : (price - ((quote.regularMarketChange || 0) / divisor));
    const change: number = quote.regularMarketChange != null
        ? quote.regularMarketChange / divisor
        : (price - previousClose);
    const changePercent: number = quote.regularMarketChangePercent ?? (previousClose !== 0 ? (change / previousClose) * 100 : 0);

    return {
        ticker: symbol,
        price: parseFloat(price.toFixed(2)),
        currency,
        previousClose: parseFloat(previousClose.toFixed(2)),
        change: parseFloat(change.toFixed(2)),
        changePercent: parseFloat(changePercent.toFixed(2)),
        lastUpdated: new Date().toISOString(),
        isMock: false
    };
}

export async function fetchViaYahooFinance(ticker: string): Promise<PriceData | null> {
    try {
        const symbol = ticker.toUpperCase().trim();

        // Tricky logic: yahoo-finance2 v3 return type for quote() can be a discriminated union or generic Quote object.
        // Typing as any guarantees safe property access across package versions.
        const quote: any = await yahooFinance.quote(symbol);
        const normalized = normalizeYahooQuote(quote, symbol);

        if (!normalized) {
            console.warn(`Yahoo Finance returned no price for ${symbol}`);
            return null;
        }

        return normalized;
    } catch (error) {
        console.error(`Error fetching Yahoo Finance quote for ${ticker}:`, error);
        // TODO: Fallback to alternative ASX provider if yahoo-finance2 encounters DOM scraping changes
        return null;
    }
}
