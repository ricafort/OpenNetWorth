/**
 * useRecurring Hook
 * 
 * Domain hook for recurring transaction CRUD operations.
 * Uses DataService abstraction for storage.
 */

'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { RecurringTransaction } from '@/types';
import { getDataService } from '@/lib/data/services';
import { useProfile } from '@/contexts/ProfileContext';

export function useRecurring() {
    const { isDemoMode, profile } = useProfile();
    const templateId = isDemoMode ? profile?.id : null;

    const [recurring, setRecurring] = useState<RecurringTransaction[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    const service = useMemo(
        () => getDataService<RecurringTransaction>('recurring', isDemoMode, templateId),
        [isDemoMode, templateId]
    );

    const loadRecurring = useCallback(async () => {
        setIsLoading(true);
        try {
            const data = await service.getAll();
            setRecurring(data);
        } catch (error) {
            console.error('Failed to load recurring transactions:', error);
        } finally {
            setIsLoading(false);
        }
    }, [service]);

    useEffect(() => {
        loadRecurring();
    }, [loadRecurring]);

    const addRecurring = async (item: RecurringTransaction) => {
        try {
            await service.create(item);
            setRecurring(prev => [...prev, item]);
        } catch (error) {
            console.error('Failed to add recurring transaction:', error);
            throw error;
        }
    };

    const updateRecurring = async (item: RecurringTransaction) => {
        try {
            await service.update(item);
            setRecurring(prev => prev.map(r => r.id === item.id ? item : r));
        } catch (error) {
            console.error('Failed to update recurring transaction:', error);
            throw error;
        }
    };

    const deleteRecurring = async (id: string) => {
        try {
            await service.delete(id);
            setRecurring(prev => prev.filter(r => r.id !== id));
        } catch (error) {
            console.error('Failed to delete recurring transaction:', error);
            throw error;
        }
    };

    return {
        recurring,
        isLoading,
        addRecurring,
        updateRecurring,
        deleteRecurring,
        refreshRecurring: loadRecurring,
    };
}
