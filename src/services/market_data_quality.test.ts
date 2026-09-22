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

import { describe, it, expect, vi } from 'vitest';
import { isAustralianTicker, getMockPrice, fetchStockPrice } from './marketData';
import { convertAmount } from '@/lib/utils/currencyService';

describe('Market Data Quality & Currency Correctness', () => {
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
});
