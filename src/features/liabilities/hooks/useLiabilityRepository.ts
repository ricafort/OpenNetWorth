'use client';

import { useProfile } from '@/contexts/ProfileContext';
import { ILiabilityRepository, LocalLiabilityRepository, SupabaseLiabilityRepository } from '../data/repository';
import { useMemo } from 'react';

/**
 * Dependency Injection Hook for Liability Repository.
 */
export function useLiabilityRepository(): ILiabilityRepository {
    const { isDemoMode, profile } = useProfile();
    const templateId = isDemoMode ? profile?.id : null;

    const repository = useMemo(() => {
        if (process.env.NEXT_PUBLIC_SUPABASE_URL) {
            if (isDemoMode) {
                return new SupabaseLiabilityRepository(templateId);
            } else if (profile?.id && profile.id !== 'local_user') {
                return new SupabaseLiabilityRepository(profile.id);
            }
        }
        return new LocalLiabilityRepository(templateId);
    }, [isDemoMode, templateId, profile?.id]);

    return repository;
}
