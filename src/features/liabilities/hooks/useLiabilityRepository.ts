'use client';

import { useProfile } from '@/contexts/ProfileContext';
import { ILiabilityRepository, LocalLiabilityRepository } from '../data/repository';
import { useMemo } from 'react';

/**
 * Dependency Injection Hook for Liability Repository.
 * The embedded SQLite ledger is the single data layer, so the local
 * repository is always used; the Supabase branch was removed with the
 * data-layer collapse.
 */
export function useLiabilityRepository(): ILiabilityRepository {
    const { isDemoMode, profile } = useProfile();
    const templateId = isDemoMode ? profile?.id : null;

    return useMemo(() => new LocalLiabilityRepository(templateId), [templateId]);
}
