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

import { useState, useEffect, useCallback } from 'react';
import { SharedFinancialSummary, CurrencyCode } from '@/lib/domain/accounting/types';

export function useSharedFinancialSummary(options: {
    entityId?: string;
    asOfDate?: string;
    reportingCurrency?: CurrencyCode;
} = {}) {
    const [summary, setSummary] = useState<SharedFinancialSummary | null>(null);
    const [isLoading, setIsLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);

    const fetchSummary = useCallback(async () => {
        setIsLoading(true);
        setError(null);
        try {
            const params = new URLSearchParams();
            if (options.entityId) params.set('entity_id', options.entityId);
            if (options.asOfDate) params.set('as_of_date', options.asOfDate);
            if (options.reportingCurrency) params.set('reporting_currency', options.reportingCurrency);

            const res = await fetch(`/api/accounting/balances?${params.toString()}`);
            if (!res.ok) {
                const errJson = await res.json().catch(() => ({}));
                throw new Error(errJson.error || `HTTP ${res.status}`);
            }

            const data = await res.json();
            if (data.success && data.summary) {
                setSummary(data.summary);
            }
        } catch (err: any) {
            console.error('Failed to fetch shared financial summary:', err);
            setError(err.message || 'Failed to load balances');
        } finally {
            setIsLoading(false);
        }
    }, [options.entityId, options.asOfDate, options.reportingCurrency]);

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
