/**
 * useLiabilities Hook
 * 
 * Domain hook for liability CRUD operations.
 * Uses DataService abstraction for storage.
 */

'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { Liability } from '@/types';
import { getDataService } from '@/lib/data/services';
import { useProfile } from '@/contexts/ProfileContext';

export function useLiabilities() {
    const { isDemoMode, profile } = useProfile();
    const templateId = isDemoMode ? profile?.id : null;

    const [liabilities, setLiabilities] = useState<Liability[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    const service = useMemo(
        () => getDataService<Liability>('liabilities', isDemoMode, templateId),
        [isDemoMode, templateId]
    );

    const loadLiabilities = useCallback(async () => {
        setIsLoading(true);
        try {
            const data = await service.getAll();
            setLiabilities(data);
        } catch (error) {
            console.error('Failed to load liabilities:', error);
        } finally {
            setIsLoading(false);
        }
    }, [service]);

    useEffect(() => {
        loadLiabilities();
    }, [loadLiabilities]);

    const addLiability = async (item: Liability) => {
        try {
            await service.create(item);
            setLiabilities(prev => [...prev, item]);
        } catch (error) {
            console.error('Failed to add liability:', error);
            throw error;
        }
    };

    const updateLiability = async (item: Liability) => {
        try {
            await service.update(item);
            setLiabilities(prev => prev.map(l => l.id === item.id ? item : l));
        } catch (error) {
            console.error('Failed to update liability:', error);
            throw error;
        }
    };

    const deleteLiability = async (id: string) => {
        try {
            await service.delete(id);
            setLiabilities(prev => prev.filter(l => l.id !== id));
        } catch (error) {
            console.error('Failed to delete liability:', error);
            throw error;
        }
    };

    return {
        liabilities,
        isLoading,
        addLiability,
        updateLiability,
        deleteLiability,
        refreshLiabilities: loadLiabilities,
    };
}
