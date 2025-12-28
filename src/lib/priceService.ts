// src/lib/priceService.ts

import { isDemoMode } from "./demoMode";

export interface PriceData {
    ticker: string;
    price: number;
    previousClose: number;
    change: number;
    changePercent: number;
    lastUpdated: string;
    isMock?: boolean; // Track if data is real or mock
}

// In-memory cache to avoid hitting rate limits too often during a session
const PRICE_CACHE = new Map<string, { data: PriceData, timestamp: number }>();
const CACHE_KEY = 'clearworth_price_cache';
const CACHE_DURATION = 1000 * 60 * 15; // 15 minutes (increased for better rate limit management)

// Rate Limiter for Alpha Vantage (5 calls per minute for free tier)
const ALPHA_VANTAGE_RATE_LIMIT_DELAY = 15000; // 15 seconds (safer margin)

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// Persist cache to localStorage
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
        console.error('Failed to load price cache', e);
    }
};

const saveCache = () => {
    if (typeof window === 'undefined') return;
    try {
        const obj = Object.fromEntries(PRICE_CACHE);
        localStorage.setItem(CACHE_KEY, JSON.stringify(obj));
    } catch (e) {
        console.error('Failed to save price cache', e);
    }
};

// Initial load
loadCache();

export const fetchStockPrice = async (ticker: string): Promise<PriceData> => {
    // 0. Check Demo Mode
    if (isDemoMode()) {
        return getMockPrice(ticker);
    }

    // 1. Check Cache
    const cached = PRICE_CACHE.get(ticker);
    if (cached && (Date.now() - cached.timestamp < CACHE_DURATION)) {
        return cached.data;
    }

    const apiKey = process.env.NEXT_PUBLIC_ALPHA_VANTAGE_KEY;
    if (!apiKey) {
        // Graceful degradation if no API key
        console.warn('Missing Alpha Vantage API Key - using mock data');
        return getMockPrice(ticker);
    }

    try {
        const res = await fetch(
            `https://www.alphavantage.co/query?function=GLOBAL_QUOTE&symbol=${ticker}&apikey=${apiKey}`
        );
        const data = await res.json();

        // Handle API Rate Limits / Info messages gracefully
        if (data['Note'] || data['Information']) {
            console.warn(`Alpha Vantage Rate Limit for ${ticker}:`, data);
            // Return cached data if available (even if expired), else mock
            if (cached) return { ...cached.data, isMock: true };
            return getMockPrice(ticker);
        }

        const quote = data['Global Quote'];

        if (!quote || Object.keys(quote).length === 0) {
            console.warn(`No quote data for ${ticker}`, data);
            if (data['Error Message']) {
                // Invalid ticker?
                return getMockPrice(ticker);
            }
            if (cached) return cached.data;
            return getMockPrice(ticker);
        }

        const priceData: PriceData = {
            ticker,
            price: parseFloat(quote['05. price']) || 0,
            previousClose: parseFloat(quote['08. previous close']) || 0,
            change: parseFloat(quote['09. change']) || 0,
            changePercent: parseFloat(quote['10. change percent']?.replace('%', '') || '0'),
            lastUpdated: new Date().toISOString(),
            isMock: false
        };

        PRICE_CACHE.set(ticker, { data: priceData, timestamp: Date.now() });
        saveCache();
        return priceData;

    } catch (error) {
        console.error(`Error fetching stock price for ${ticker}:`, error);
        if (cached) return cached.data;
        return getMockPrice(ticker);
    }
};

export const fetchCryptoPrice = async (ticker: string): Promise<PriceData> => {
    if (isDemoMode()) return getMockPrice(ticker);

    let coinId = ticker.toLowerCase();
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
    if (commonMappings[ticker.toUpperCase()]) {
        coinId = commonMappings[ticker.toUpperCase()];
    }

    const cached = PRICE_CACHE.get(ticker);
    if (cached && (Date.now() - cached.timestamp < CACHE_DURATION)) {
        return cached.data;
    }

    try {
        const res = await fetch(
            `https://api.coingecko.com/api/v3/simple/price?ids=${coinId}&vs_currencies=usd&include_24hr_change=true`
        );
        const data = await res.json();

        if (!data[coinId]) {
            // Not found, return mock
            return getMockPrice(ticker);
        }

        const price = data[coinId].usd;
        const changePercent = data[coinId].usd_24h_change;
        const change = price * (changePercent / 100);
        const previousClose = price - change;

        const priceData: PriceData = {
            ticker: ticker.toUpperCase(),
            price,
            previousClose, // Calculated approximation
            change,
            changePercent,
            lastUpdated: new Date().toISOString(),
            isMock: false
        };

        PRICE_CACHE.set(ticker, { data: priceData, timestamp: Date.now() });
        saveCache();
        return priceData;

    } catch (error) {
        console.error(`Error fetching crypto price for ${ticker}:`, error);
        if (cached) return cached.data;
        return getMockPrice(ticker);
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
    'AMZN': 185
};

// Fallback Mock Generator
const getMockPrice = (ticker: string) => {
    // Check if we have a defined demo price
    if (DEMO_PRICES[ticker]) {
        return {
            ticker: ticker.toUpperCase(),
            price: DEMO_PRICES[ticker],
            previousClose: parseFloat((DEMO_PRICES[ticker] * 0.995).toFixed(2)), // Slight random movement
            change: parseFloat((DEMO_PRICES[ticker] * 0.005).toFixed(2)),
            changePercent: 0.5,
            lastUpdated: new Date().toISOString(),
            isMock: true
        };
    }

    const seed = ticker.split('').reduce((a, b) => a + b.charCodeAt(0), 0);
    const basePrice = (seed % 500) + 50;
    const change = (Math.random() * 10) - 5;
    const price = basePrice + change;
    return {
        ticker: ticker.toUpperCase(),
        price: parseFloat(price.toFixed(2)),
        previousClose: basePrice,
        change: parseFloat(change.toFixed(2)),
        changePercent: parseFloat(((change / basePrice) * 100).toFixed(2)),
        lastUpdated: new Date().toISOString(),
        isMock: true
    };
};

export const fetchAllPrices = async (requests: { ticker: string, type: 'crypto' | 'stock' | 'other' }[]): Promise<Map<string, PriceData>> => {
    const results = new Map<string, PriceData>();

    // Deduplicate tickers
    const uniqueRequests = Array.from(new Set(requests.map(r => JSON.stringify(r)))).map(s => JSON.parse(s));

    const stockTickers = uniqueRequests
        .filter(r => r.type === 'stock' || r.type === 'other')
        .map(r => r.ticker);

    const cryptoTickers = uniqueRequests
        .filter(r => r.type === 'crypto')
        .map(r => r.ticker);

    // 1. Fetch Crypto (Parallel)
    const cryptoPromises = cryptoTickers.map(async (t) => {
        const data = await fetchCryptoPrice(t);
        results.set(t, data);
    });

    // 2. Fetch Stocks (Sequential with delay)
    // If we have API key AND are not in demo mode
    const shouldFetchStocks = !!process.env.NEXT_PUBLIC_ALPHA_VANTAGE_KEY && !isDemoMode();

    if (shouldFetchStocks) {
        for (const t of stockTickers) {
            const data = await fetchStockPrice(t);
            results.set(t, data);

            // Only delay if we actually made a network request (not cached)
            // But checking cache hit inside fetchStockPrice is hard from here.
            // Safer to just delay if we have more than one and it wasn't a mock.
            // Simplified: always delay if multiple to be safe.
            if (stockTickers.indexOf(t) < stockTickers.length - 1 && !data.isMock) {
                await delay(ALPHA_VANTAGE_RATE_LIMIT_DELAY);
            }
        }
    } else {
        stockTickers.forEach(t => results.set(t, getMockPrice(t)));
    }

    await Promise.all(cryptoPromises);

    return results;
};
