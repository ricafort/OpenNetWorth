/**
 * useGoals Hook
 * 
 * Domain hook for goal CRUD operations.
 * Uses DataService abstraction for storage.
 */

'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { Goal } from '@/types';
import { getDataService } from '@/lib/data/services';
import { useProfile } from '@/contexts/ProfileContext';

export function useGoals() {
    const { isDemoMode, profile } = useProfile();
    const templateId = isDemoMode ? profile?.id : null;

    const [goals, setGoals] = useState<Goal[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    const service = useMemo(
        () => getDataService<Goal>('goals', isDemoMode, templateId),
        [isDemoMode, templateId]
    );

    const loadGoals = useCallback(async () => {
        setIsLoading(true);
        try {
            const data = await service.getAll();
            setGoals(data);
        } catch (error) {
            console.error('Failed to load goals:', error);
        } finally {
            setIsLoading(false);
        }
    }, [service]);

    useEffect(() => {
        loadGoals();
    }, [loadGoals]);

    const addGoal = async (item: Goal) => {
        try {
            await service.create(item);
            setGoals(prev => [...prev, item]);
        } catch (error) {
            console.error('Failed to add goal:', error);
            throw error;
        }
    };

    const updateGoal = async (item: Goal) => {
        try {
            await service.update(item);
            setGoals(prev => prev.map(g => g.id === item.id ? item : g));
        } catch (error) {
            console.error('Failed to update goal:', error);
            throw error;
        }
    };

    const deleteGoal = async (id: string) => {
        try {
            await service.delete(id);
            setGoals(prev => prev.filter(g => g.id !== id));
        } catch (error) {
            console.error('Failed to delete goal:', error);
            throw error;
        }
    };

    return {
        goals,
        isLoading,
        addGoal,
        updateGoal,
        deleteGoal,
        refreshGoals: loadGoals,
    };
}
