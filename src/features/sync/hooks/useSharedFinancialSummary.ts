/**
 * Hook for Shared Financial Summary
 * 
 * Why this file exists:
 * Provides dashboard widgets, freshness cards, and balance modals with real-time
 * access to the accounting domain's authoritative financial summary.
 * Strictly distinguishes valuation balances from non-valuation lines (credit limits, redraw)
 * and groups net worth by currency without inventing fake foreign exchange conversions.
 * 
 * Tricky logic:
 * - Listens for the `opennetworth_balances_updated` custom DOM event to automatically refresh
 *   without requiring a full page reload when balance observations are committed.
 * 
 * TODO: Add support for real-time WebSockets or server-sent events if multi-device sync is added.
 */

'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { SharedFinancialSummary, CurrencyCode } from '@/lib/domain/accounting/types';

export function useSharedFinancialSummary(options: {
    entityId?: string;
    asOfDate?: string;
    reportingCurrency?: CurrencyCode;
    skip?: boolean;
} = {}) {
    const [summary, setSummary] = useState<SharedFinancialSummary | null>(null);
    const [isLoading, setIsLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);

    // Monotonic request counter to prevent out-of-order stale responses from overwriting current selection
    const activeRequestIdRef = useRef<number>(0);

    const fetchSummary = useCallback(async () => {
        if (options.skip) {
            setIsLoading(false);
            return;
        }

        const requestId = ++activeRequestIdRef.current;
        const requestedEntityId = options.entityId;
        const requestedAsOfDate = options.asOfDate;
        const requestedCurrency = options.reportingCurrency;

        setIsLoading(true);
        setError(null);

        try {
            const params = new URLSearchParams();
            if (requestedEntityId) params.set('entity_id', requestedEntityId);
            if (requestedAsOfDate) params.set('as_of_date', requestedAsOfDate);
            if (requestedCurrency) params.set('reporting_currency', requestedCurrency);

            const res = await fetch(`/api/accounting/balances?${params.toString()}`);
            
            // Check if newer request was dispatched while awaiting fetch
            if (requestId !== activeRequestIdRef.current) {
                return;
            }

            if (!res.ok) {
                const errJson = await res.json().catch(() => ({}));
                throw new Error(errJson.error || `HTTP ${res.status}`);
            }

            const data = await res.json();
            
            // Re-check request ID after JSON parsing
            if (requestId !== activeRequestIdRef.current) {
                return;
            }

            if (data.success && data.summary) {
                setSummary(data.summary);
            }
        } catch (err: any) {
            if (requestId === activeRequestIdRef.current) {
                console.error('Failed to fetch shared financial summary:', err);
                setError(err.message || 'Failed to load balances');
            }
        } finally {
            if (requestId === activeRequestIdRef.current) {
                setIsLoading(false);
            }
        }
    }, [options.entityId, options.asOfDate, options.reportingCurrency, options.skip]);

    useEffect(() => {
        fetchSummary();

        const handleBalancesUpdated = () => {
            fetchSummary();
        };

        window.addEventListener('opennetworth_balances_updated', handleBalancesUpdated);
        return () => {
            window.removeEventListener('opennetworth_balances_updated', handleBalancesUpdated);
        };
    }, [fetchSummary]);

    return {
        summary,
        isLoading,
        error,
        refresh: fetchSummary
    };
}
