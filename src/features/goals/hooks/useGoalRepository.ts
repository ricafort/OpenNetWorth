'use client';

import { useProfile } from '@/contexts/ProfileContext';
import { IGoalRepository, LocalGoalRepository, SupabaseGoalRepository } from '../data/repository';
import { useMemo } from 'react';

/**
 * Dependency Injection Hook for Goal Repository.
 */
export function useGoalRepository(): IGoalRepository {
    const { isDemoMode, profile } = useProfile();
    const templateId = isDemoMode ? profile?.id : null;

    const repository = useMemo(() => {
        if (isDemoMode) {
            return new SupabaseGoalRepository(templateId);
        } else if (profile?.id && profile.id !== 'local_user') {
            return new SupabaseGoalRepository(profile.id);
        } else {
            return new LocalGoalRepository(templateId);
        }
    }, [isDemoMode, templateId, profile?.id]);

    return repository;
}
