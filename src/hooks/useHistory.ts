/**
 * useHistory Hook
 *
 * Domain hook for the net worth snapshot series.
 *
 * Why this exists:
 * The series lives in the embedded SQLite vault (`net_worth_history`, renamed
 * to `net_worth_snapshots` by the schema-collapse migration). Reads and writes
 * go through `/api/vault` so the chart widget, the stat widgets, and the
 * HistoryEditor all observe the exact same series — no localStorage-first
 * reads disagreeing with SQLite writes.
 *
 * Tricky logic:
 * - Demo mode (templateId set) stays on localStorage persona data until the
 *   demo-vault rewrite; it must never read or write the real vault.
 * - The entity-scoped vault GET returns raw snake_case rows; we map them to
 *   the camelCase NetWorthSnapshot shape the UI consumes and sort by date.
 * - `scoped_save` upserts on (user_id, date), so the local list replaces by
 *   date instead of blindly appending (a same-date re-record must not
 *   duplicate the point on the chart).
 */

'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { NetWorthSnapshot } from '@/types';
import { useProfile } from '@/contexts/ProfileContext';
import { LocalStorageService } from '@/infrastructure/LocalStorageService';

/** Raw `net_worth_history` row shape returned by the entity-scoped vault GET. */
interface HistoryRow {
    id: string;
    date: string;
    total_assets: number;
    total_liabilities: number;
    net_worth: number;
    currency: string | null;
}

function rowToSnapshot(row: HistoryRow): NetWorthSnapshot {
    return {
        id: row.id,
        date: row.date,
        totalAssets: row.total_assets,
        totalLiabilities: row.total_liabilities,
        netWorth: row.net_worth,
        currency: (row.currency ?? undefined) as NetWorthSnapshot['currency']
    };
}

const byDateAsc = (a: NetWorthSnapshot, b: NetWorthSnapshot) => a.date.localeCompare(b.date);

export function useHistory() {
    const { isDemoMode, profile } = useProfile();
    const templateId = isDemoMode ? profile?.id : null;

    const [history, setHistory] = useState<NetWorthSnapshot[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    // Demo mode keeps the snapshot series in localStorage (persona data).
    const demoService = useMemo(
        () => (templateId ? new LocalStorageService<NetWorthSnapshot>('history') : null),
        [templateId]
    );

    const loadHistory = useCallback(async () => {
        setIsLoading(true);
        try {
            if (demoService) {
                const data = await demoService.getAll();
                setHistory([...data].sort(byDateAsc));
                return;
            }
            const res = await fetch('/api/vault?entity=history');
            if (!res.ok) {
                throw new Error(`Failed to load net worth history: HTTP ${res.status}`);
            }
            const json = await res.json();
            const rows = (json.data ?? []) as HistoryRow[];
            setHistory(rows.map(rowToSnapshot).sort(byDateAsc));
        } catch (error) {
            console.error('Failed to load history:', error);
        } finally {
            setIsLoading(false);
        }
    }, [demoService]);

    useEffect(() => {
        loadHistory();
    }, [loadHistory]);

    const addSnapshot = async (item: NetWorthSnapshot) => {
        try {
            // Why this exists:
            // Resolves Finding 2 & Clarification 4: Ensures newly added snapshots retain currency metadata.
            // Tricky logic:
            // If item lacks currency, default to profile currency to ensure currency is never silently dropped.
            // TODO: Expose explicit currency selector in snapshot creation flows.
            const snapshotWithCurrency: NetWorthSnapshot = {
                ...item,
                currency: item.currency || (profile?.currency_code as any) || 'USD'
            };
            if (demoService) {
                await demoService.create(snapshotWithCurrency);
            } else {
                const res = await fetch('/api/vault', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ action: 'scoped_save', entity: 'history', item: snapshotWithCurrency })
                });
                if (!res.ok) {
                    const err = await res.json().catch(() => ({}));
                    throw new Error(err.error || `Failed to add snapshot: HTTP ${res.status}`);
                }
            }
            setHistory(prev => [...prev.filter(h => h.date !== snapshotWithCurrency.date), snapshotWithCurrency].sort(byDateAsc));
        } catch (error) {
            console.error('Failed to add snapshot:', error);
            throw error;
        }
    };

    return {
        history,
        isLoading,
        addSnapshot,
        refreshHistory: loadHistory,
    };
}
