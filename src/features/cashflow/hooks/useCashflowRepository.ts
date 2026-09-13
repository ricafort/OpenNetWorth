'use client';

import { useProfile } from '@/contexts/ProfileContext';
import { ICashflowRepository, LocalCashflowRepository, SupabaseCashflowRepository } from '../data/repository';
import { useMemo } from 'react';

/**
 * Dependency Injection Hook for Cashflow Repository.
 */
export function useCashflowRepository(): ICashflowRepository {
    const { isDemoMode, profile } = useProfile();
    const templateId = isDemoMode ? profile?.id : null;

    const repository = useMemo(() => {
        if (process.env.NEXT_PUBLIC_SUPABASE_URL) {
            if (isDemoMode) {
                return new SupabaseCashflowRepository(templateId);
            } else if (profile?.id && profile.id !== 'local_user') {
                return new SupabaseCashflowRepository(profile.id);
            }
        }
        return new LocalCashflowRepository(templateId);
    }, [isDemoMode, templateId, profile?.id]);

    return repository;
}
