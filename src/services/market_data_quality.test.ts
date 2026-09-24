/**
 * Market Data Quality & Currency Correctness Test Suite
 *
 * Why this exists:
 * Previously, all market prices were assumed to be in USD. When an Australian stock (e.g. CBA.AX)
 * was priced in AUD, it was mistakenly converted from USD to AUD, bloating the value by ~50%.
 * Furthermore, when market providers failed in production mode, synthetic mock prices were
 * fabricated, confusing users with bogus gains or losses (Handover Section 16 & Batch B3).
 *
 * Tricky logic:
 * We test currency tagging, non-distortion in portfolio normalization, and production mock suppression.
 *
 * TODO: Add real-time mock provider tests for London Stock Exchange pence-to-pound conversions.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { isAustralianTicker, getMockPrice, fetchStockPrice, clearPriceCache, setPriceCacheEntry, getPriceCacheEntry } from './marketData';
import { normalizeYahooQuote } from './providers/yahooFinanceProvider';
import { convertAmount } from '@/lib/utils/currencyService';

describe('Market Data Quality & Currency Correctness', () => {
    beforeEach(() => {
        clearPriceCache();
    });

    it('correctly identifies Australian tickers ending with .AX', () => {
        expect(isAustralianTicker('CBA.AX')).toBe(true);
        expect(isAustralianTicker('bhp.ax')).toBe(true);
        expect(isAustralianTicker('VAS.AX')).toBe(true);
        expect(isAustralianTicker('AAPL')).toBe(false);
        expect(isAustralianTicker('BTC')).toBe(false);
    });

    it('getMockPrice tags Australian tickers as AUD and US tickers as USD', () => {
        const cbaMock = getMockPrice('CBA.AX');
        expect(cbaMock.currency).toBe('AUD');
        expect(cbaMock.ticker).toBe('CBA.AX');

        const aaplMock = getMockPrice('AAPL');
        expect(aaplMock.currency).toBe('USD');
        expect(aaplMock.ticker).toBe('AAPL');
    });

    it('does not double-convert ASX stocks when base currency is AUD', () => {
        const asxPriceAUD = 125.00;
        const quoteCurrency = 'AUD';
        const baseCurrency = 'AUD';

        // Conversion using quote's native currency
        const converted = convertAmount(asxPriceAUD, quoteCurrency, baseCurrency);
        expect(converted).toBe(125.00);

        // Previous bug would convert from USD to AUD, yielding ~186.25 AUD
        const buggyConversion = convertAmount(asxPriceAUD, 'USD', baseCurrency);
        expect(buggyConversion).toBeGreaterThan(180);
    });

    it('correctly converts ASX stocks to USD when base currency is USD', () => {
        const asxPriceAUD = 125.00;
        const quoteCurrency = 'AUD';
        const baseCurrency = 'USD';

        const converted = convertAmount(asxPriceAUD, quoteCurrency, baseCurrency);
        // 125 AUD should convert to less than 125 USD (approx 83.75 USD at 0.67 rate)
        expect(converted).toBeLessThan(125.00);
        expect(converted).toBeGreaterThan(75.00);
    });

    it('suppresses synthetic mock prices on provider failure in production mode (non-demo)', async () => {
        // Ticker not in cache and not in demo mode
        const unquotedTicker = 'UNKNOWN_NONEXISTENT_TICKER_12345';
        const result = await fetchStockPrice(unquotedTicker, { isDemo: false });

        // In production mode, complete failure must return null rather than fabricating fake prices
        expect(result).toBeNull();
    });

    it('returns mock prices when demo mode is explicitly enabled', async () => {
        const result = await fetchStockPrice('VTI', { isDemo: true });
        expect(result).not.toBeNull();
        expect(result?.isMock).toBe(true);
        expect(result?.currency).toBe('USD');
        expect(result?.price).toBe(293);
    });

    // Why this test exists:
    // Resolves Assessor Finding C: London Stock Exchange quotes (e.g. .L) on Yahoo Finance are denominated
    // in pence sterling ('GBp' or 'GBX'). If returned as-is with currency 'GBP', assets are overvalued by 100x.
    // Tricky logic:
    // 11,500 GBp is £115.00. Divisor 100 must divide price, previousClose, and change, but NOT changePercent.
    // TODO: In Milestone 2, verify real LSE tickers (.L) against Yahoo Finance mock fixtures.
    it('divides Yahoo Finance GBp (pence) quotes by 100 and normalizes currency to GBP', () => {
        const mockRawQuoteGBp = {
            regularMarketPrice: 11550, // 11,550 GBp = £115.50
            regularMarketPreviousClose: 11400, // 11,400 GBp = £114.00
            regularMarketChange: 150, // 150 GBp = £1.50
            regularMarketChangePercent: 1.316, // +1.32%
            currency: 'GBp'
        };

        const result = normalizeYahooQuote(mockRawQuoteGBp, 'AZN.L');
        expect(result).not.toBeNull();
        expect(result?.currency).toBe('GBP');
        expect(result?.price).toBe(115.50);
        expect(result?.previousClose).toBe(114.00);
        expect(result?.change).toBe(1.50);
        expect(result?.changePercent).toBe(1.32);
        expect(result?.isMock).toBe(false);
    });

    it('handles GBX pence quotes identically to GBp by dividing by 100', () => {
        const mockRawQuoteGBX = {
            regularMarketPrice: 2450, // 2,450 GBX = £24.50
            regularMarketPreviousClose: 2500,
            regularMarketChange: -50,
            regularMarketChangePercent: -2.0,
            currency: 'GBX'
        };

        const result = normalizeYahooQuote(mockRawQuoteGBX, 'SHEL.L');
        expect(result).not.toBeNull();
        expect(result?.currency).toBe('GBP');
        expect(result?.price).toBe(24.50);
        expect(result?.previousClose).toBe(25.00);
        expect(result?.change).toBe(-0.50);
        expect(result?.changePercent).toBe(-2.0);
    });

    it('leaves standard USD and foreign non-pence quotes undivided', () => {
        const mockRawQuoteUSD = {
            regularMarketPrice: 185.50,
            regularMarketPreviousClose: 184.00,
            regularMarketChange: 1.50,
            regularMarketChangePercent: 0.815,
            currency: 'USD'
        };

        const result = normalizeYahooQuote(mockRawQuoteUSD, 'AAPL');
        expect(result).not.toBeNull();
        expect(result?.currency).toBe('USD');
        expect(result?.price).toBe(185.50);
        expect(result?.previousClose).toBe(184.00);
        expect(result?.change).toBe(1.50);
    });

    // Why this test exists:
    // Resolves Assessor Finding C: Demo mode writes mock data to the price cache.
    // When returning to production (non-demo) mode, any cached entry with isMock: true must be purged
    // and must not poison the production portfolio.
    // Tricky logic:
    // If a mock quote exists in cache, non-demo mode must evict it and refuse to return it as a real price.
    it('evicts mock quotes from cache in non-demo mode and prevents cache poisoning', async () => {
        const mockQuote = {
            data: {
                ticker: 'POISON_TEST',
                price: 9999,
                currency: 'USD',
                previousClose: 9900,
                change: 99,
                changePercent: 1.0,
                lastUpdated: new Date().toISOString(),
                isMock: true
            },
            timestamp: Date.now()
        };

        setPriceCacheEntry('POISON_TEST', mockQuote);
        expect(getPriceCacheEntry('POISON_TEST')).toBeDefined();

        // In production mode, fetching POISON_TEST should evict the mock entry and return null (since provider will fail)
        const result = await fetchStockPrice('POISON_TEST', { isDemo: false });
        expect(result).toBeNull();

        // Verify it was evicted from cache
        expect(getPriceCacheEntry('POISON_TEST')).toBeUndefined();
    });

    it('preserves genuine non-mock quotes in cache in non-demo mode', async () => {
        const genuineQuote = {
            data: {
                ticker: 'REAL_QUOTE',
                price: 150.25,
                currency: 'USD',
                previousClose: 148.00,
                change: 2.25,
                changePercent: 1.52,
                lastUpdated: new Date().toISOString(),
                isMock: false
            },
            timestamp: Date.now()
        };

        setPriceCacheEntry('REAL_QUOTE', genuineQuote);

        // Fetching in non-demo mode should return cached genuine quote without calling network
        const result = await fetchStockPrice('REAL_QUOTE', { isDemo: false });
        expect(result).not.toBeNull();
        expect(result?.price).toBe(150.25);
        expect(result?.isMock).toBe(false);
    });
});
