// Why this file exists:
// Provides a clean, single-responsibility integration for Finnhub's REST API.
// Replaces Alpha Vantage for US/Global stock quotes due to Finnhub's superior free rate limit (60 calls/minute vs 25 calls/day).

import { PriceData } from '../marketData';

export async function fetchViaFinnhub(ticker: string): Promise<PriceData | null> {
    // Tricky logic: FINNHUB_API_KEY can be passed via process.env.
    // Clean upper case symbol formatting for US tickers (e.g. AAPL, VTI, TSLA)
    const apiKey = process.env.FINNHUB_API_KEY;

    if (!apiKey) {
        console.warn('Finnhub API Key is missing. Falling back to next provider or mock.');
        return null;
    }

    try {
        const symbol = ticker.toUpperCase().trim();
        const res = await fetch(`https://finnhub.io/api/v1/quote?symbol=${encodeURIComponent(symbol)}&token=${apiKey}`, {
            // Revalidate / cache settings if needed, but marketData.ts handles 15-min in-memory cache
            next: { revalidate: 300 } 
        });

        if (!res.ok) {
            console.warn(`Finnhub returned HTTP ${res.status} for ${symbol}`);
            return null;
        }

        const data = await res.json();

        // Tricky logic: Finnhub returns { c: 0, d: null, dp: null, h: 0, l: 0, o: 0, pc: 0, t: 0 } when a ticker is invalid or unquoted.
        if (!data || typeof data.c !== 'number' || data.c === 0) {
            console.warn(`Finnhub returned invalid quote data for ${symbol}:`, data);
            return null;
        }

        const currentPrice = data.c;
        const previousClose = data.pc || (currentPrice - (data.d || 0));
        const change = data.d ?? (currentPrice - previousClose);
        const changePercent = data.dp ?? (previousClose !== 0 ? (change / previousClose) * 100 : 0);

        return {
            ticker: symbol,
            price: parseFloat(currentPrice.toFixed(2)),
            previousClose: parseFloat(previousClose.toFixed(2)),
            change: parseFloat(change.toFixed(2)),
            changePercent: parseFloat(changePercent.toFixed(2)),
            lastUpdated: new Date().toISOString(),
            isMock: false
        };

    } catch (error) {
        console.error(`Error fetching Finnhub quote for ${ticker}:`, error);
        // TODO: Add telemetry reporting for persistent API outages if needed
        return null;
    }
}
