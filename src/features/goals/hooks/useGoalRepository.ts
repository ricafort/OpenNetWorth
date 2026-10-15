'use client';

import { useProfile } from '@/contexts/ProfileContext';
import { IGoalRepository, LocalGoalRepository } from '../data/repository';
import { useMemo } from 'react';

/**
 * Dependency Injection Hook for Goal Repository.
 * The embedded SQLite vault is the single data layer, so the local repository
 * is always used; the Supabase branch was removed with the data-layer collapse.
 */
export function useGoalRepository(): IGoalRepository {
    const { isDemoMode, profile } = useProfile();
    const templateId = isDemoMode ? profile?.id : null;

    return useMemo(() => new LocalGoalRepository(templateId), [templateId]);
}
