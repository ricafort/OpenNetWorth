// Why this file exists:
// Core Market Data Service for ClearWorth.
// Fetches, normalizes, and caches real-time and daily financial asset prices (Stocks, ETFs, Crypto).
// Implements multi-provider fallbacks: Finnhub (US/Global), Yahoo Finance (Australian ASX .AX), and CoinGecko (Crypto).

import { isDemoMode } from "@/features/demo/demoMode";
import { fetchViaFinnhub, fetchViaYahooFinance } from './providers';

export interface PriceData {
    ticker: string;
    price: number;
    previousClose: number;
    change: number;
    changePercent: number;
    lastUpdated: string;
    isMock?: boolean; // Track if data is real or mock
}

export interface FetchOptions {
    isDemo?: boolean;
}

// In-memory cache to avoid hitting external API limits too often during a user session
const PRICE_CACHE = new Map<string, { data: PriceData, timestamp: number }>();
const CACHE_KEY = 'clearworth_price_cache';
const CACHE_DURATION = 1000 * 60 * 15; // 15 minutes TTL for price quotes

// Persist cache to browser localStorage (if on client)
const loadCache = () => {
    if (typeof window === 'undefined') return;
    try {
        const stored = localStorage.getItem(CACHE_KEY);
        if (stored) {
            const parsed = JSON.parse(stored);
            Object.keys(parsed).forEach(key => {
                PRICE_CACHE.set(key, parsed[key]);
            });
        }
    } catch (e) {
        console.error('Failed to load price cache from localStorage', e);
    }
};

const saveCache = () => {
    if (typeof window === 'undefined') return;
    try {
        const obj = Object.fromEntries(PRICE_CACHE);
        localStorage.setItem(CACHE_KEY, JSON.stringify(obj));
    } catch (e) {
        console.error('Failed to save price cache to localStorage', e);
    }
};

// Initial load on module evaluation
loadCache();

/**
 * Helper to identify Australian Securities Exchange (ASX) tickers.
 * Tickers listed on the ASX traditionally end with the '.AX' suffix (e.g. 'CBA.AX', 'BHP.AX').
 */
export const isAustralianTicker = (ticker: string): boolean => {
    return ticker.toUpperCase().trim().endsWith('.AX');
};

/**
 * Fetches stock/ETF price using a smart routing strategy:
 * 1. Checks Demo Mode -> returns persona mock data.
 * 2. Checks 15-min cache -> returns cached price.
 * 3. Australian tickers (.AX) -> Yahoo Finance API.
 * 4. US / Global tickers -> Finnhub API (primary) with Yahoo Finance fallback.
 * 5. Complete failure -> returns consistent mock price.
 */
export const fetchStockPrice = async (ticker: string, options?: FetchOptions): Promise<PriceData> => {
    const symbol = ticker.toUpperCase().trim();

    // 0. Check Demo Mode
    const useDemo = options?.isDemo ?? isDemoMode();
    if (useDemo) {
        return getMockPrice(symbol);
    }

    // 1. Check Cache
    const cached = PRICE_CACHE.get(symbol);
    if (cached && (Date.now() - cached.timestamp < CACHE_DURATION)) {
        return cached.data;
    }

    try {
        let fetchedData: PriceData | null = null;

        // 2. Route based on ticker format
        if (isAustralianTicker(symbol)) {
            // Australian stocks (.AX) -> Yahoo Finance is primary
            fetchedData = await fetchViaYahooFinance(symbol);
            if (!fetchedData) {
                // Fallback to Finnhub if Yahoo Finance fails
                fetchedData = await fetchViaFinnhub(symbol);
            }
        } else {
            // US & Global stocks -> Finnhub is primary (60 req/min limit)
            fetchedData = await fetchViaFinnhub(symbol);
            if (!fetchedData) {
                // Fallback to Yahoo Finance
                fetchedData = await fetchViaYahooFinance(symbol);
            }
        }

        if (fetchedData) {
            PRICE_CACHE.set(symbol, { data: fetchedData, timestamp: Date.now() });
            saveCache();
            return fetchedData;
        }

        // If both providers return null, fallback to mock with warning
        console.warn(`All market data providers failed for ${symbol}. Falling back to mock price.`);
        if (cached) return { ...cached.data, isMock: true };
        return getMockPrice(symbol);

    } catch (error) {
        console.error(`Error fetching stock price for ${symbol}:`, error);
        if (cached) return cached.data;
        return getMockPrice(symbol);
    }
};

/**
 * Fetches cryptocurrency prices via CoinGecko free API (USDT / USD pairs).
 */
export const fetchCryptoPrice = async (ticker: string, options?: FetchOptions): Promise<PriceData> => {
    const symbol = ticker.toUpperCase().trim();
    const useDemo = options?.isDemo ?? isDemoMode();
    if (useDemo) return getMockPrice(symbol);

    let coinId = symbol.toLowerCase();
    const commonMappings: Record<string, string> = {
        'BTC': 'bitcoin',
        'ETH': 'ethereum',
        'SOL': 'solana',
        'DOGE': 'dogecoin',
        'XRP': 'ripple',
        'ADA': 'cardano',
        'DOT': 'polkadot',
        'LINK': 'chainlink'
    };
    if (commonMappings[symbol]) {
        coinId = commonMappings[symbol];
    }

    const cached = PRICE_CACHE.get(symbol);
    if (cached && (Date.now() - cached.timestamp < CACHE_DURATION)) {
        return cached.data;
    }

    try {
        const res = await fetch(
            `https://api.coingecko.com/api/v3/simple/price?ids=${coinId}&vs_currencies=usd&include_24hr_change=true`
        );
        const data = await res.json();

        if (!data[coinId]) {
            return getMockPrice(symbol);
        }

        const price = data[coinId].usd;
        const changePercent = data[coinId].usd_24h_change;
        const change = price * (changePercent / 100);
        const previousClose = price - change;

        const priceData: PriceData = {
            ticker: symbol,
            price,
            previousClose: parseFloat(previousClose.toFixed(2)),
            change: parseFloat(change.toFixed(2)),
            changePercent: parseFloat(changePercent.toFixed(2)),
            lastUpdated: new Date().toISOString(),
            isMock: false
        };

        PRICE_CACHE.set(symbol, { data: priceData, timestamp: Date.now() });
        saveCache();
        return priceData;

    } catch (error) {
        console.error(`Error fetching crypto price for ${symbol}:`, error);
        if (cached) return cached.data;
        return getMockPrice(symbol);
    }
};

// Consistent Mock Prices for Demo Personas
const DEMO_PRICES: Record<string, number> = {
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
    'CBA.AX': 125,
    'BHP.AX': 43
};

// Fallback Mock Generator
export const getMockPrice = (ticker: string): PriceData => {
    const symbol = ticker.toUpperCase().trim();
    if (DEMO_PRICES[symbol]) {
        return {
            ticker: symbol,
            price: DEMO_PRICES[symbol],
            previousClose: parseFloat((DEMO_PRICES[symbol] * 0.995).toFixed(2)),
            change: parseFloat((DEMO_PRICES[symbol] * 0.005).toFixed(2)),
            changePercent: 0.5,
            lastUpdated: new Date().toISOString(),
            isMock: true
        };
    }

    const seed = symbol.split('').reduce((a, b) => a + b.charCodeAt(0), 0);
    const basePrice = (seed % 500) + 50;
    const change = (Math.random() * 10) - 5;
    const price = basePrice + change;
    return {
        ticker: symbol,
        price: parseFloat(price.toFixed(2)),
        previousClose: basePrice,
        change: parseFloat(change.toFixed(2)),
        changePercent: parseFloat(((change / basePrice) * 100).toFixed(2)),
        lastUpdated: new Date().toISOString(),
        isMock: true
    };
};

/**
 * Batch price fetcher for a list of requested assets.
 * Executes stock and crypto requests concurrently since Finnhub (60 req/min) and Yahoo Finance do not require sequential 15s delays.
 */
export const fetchAllPrices = async (
    requests: { ticker: string, type: 'crypto' | 'stock' | 'other' }[],
    options?: FetchOptions
): Promise<Map<string, PriceData>> => {
    const results = new Map<string, PriceData>();

    // Deduplicate tickers
    const uniqueRequests = Array.from(new Set(requests.map(r => JSON.stringify(r)))).map(s => JSON.parse(s));

    // Parallel execution across all requested tickers
    const promises = uniqueRequests.map(async (r) => {
        let data: PriceData;
        if (r.type === 'crypto') {
            data = await fetchCryptoPrice(r.ticker, options);
        } else {
            data = await fetchStockPrice(r.ticker, options);
        }
        results.set(r.ticker.toUpperCase().trim(), data);
    });

    await Promise.all(promises);

    return results;
};
