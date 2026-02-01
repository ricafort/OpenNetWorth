'use server';

import { fetchAllPrices, PriceData } from '@/services/marketData';

/**
 * Server Action to fetch stock/crypto prices.
 * Returns a plain object (Record<string, PriceData>) to ensure safe serialization
 * across the Server/Client boundary.
 */
export async function getPricesAction(
    requests: { ticker: string, type: 'crypto' | 'stock' | 'other' }[],
    options?: { isDemo: boolean }
): Promise<Record<string, PriceData>> {
    // 1. Input Validation (DoS Protection)
    if (!Array.isArray(requests) || requests.length > 50) {
        console.warn('Blocked excessive price request count:', requests.length);
        throw new Error('Too many requests. Limit is 50.');
    }

    try {
        const pricesMap = await fetchAllPrices(requests, options);
        return Object.fromEntries(pricesMap);
    } catch (error) {
        console.error('Server Action Error (getPrices):', error);
        // return empty object or throw generic error to avoid leaking implementation details
        throw new Error('Failed to fetch prices.');
    }
}
