/**
 * useHistory Hook
 * 
 * Domain hook for net worth history.
 * Uses DataService abstraction for storage.
 */

'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { NetWorthSnapshot } from '@/types';
import { getDataService } from '@/infrastructure/dataFactory';
import { useProfile } from '@/contexts/ProfileContext';

export function useHistory() {
    const { isDemoMode, profile } = useProfile();
    const templateId = isDemoMode ? profile?.id : null;

    const [history, setHistory] = useState<NetWorthSnapshot[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    const service = useMemo(
        () => getDataService<NetWorthSnapshot>('history', isDemoMode, templateId),
        [isDemoMode, templateId]
    );

    const loadHistory = useCallback(async () => {
        setIsLoading(true);
        try {
            const data = await service.getAll();
            setHistory(data);
        } catch (error) {
            console.error('Failed to load history:', error);
        } finally {
            setIsLoading(false);
        }
    }, [service]);

    useEffect(() => {
        loadHistory();
    }, [loadHistory]);

    const addSnapshot = async (item: NetWorthSnapshot) => {
        try {
            await service.create(item);
            setHistory(prev => [...prev, item]);
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
