'use client';

import { useProfile } from '@/contexts/ProfileContext';
import { IAssetRepository, LocalAssetRepository, SupabaseAssetRepository } from '../data/repository';
import { useMemo } from 'react';

/**
 * Dependency Injection Hook for Asset Repository.
 * 
 * Returns the correct repository implementation based on the current user mode (Real vs Demo).
 * This abstracts the data source decision away from the business logic hooks.
 */
export function useAssetRepository(): IAssetRepository {
    const { isDemoMode, profile } = useProfile();
    const templateId = isDemoMode ? profile?.id : null;

    const repository = useMemo(() => {
        if (process.env.NEXT_PUBLIC_SUPABASE_URL) {
            if (isDemoMode) {
                return new SupabaseAssetRepository(templateId);
            } else if (profile?.id && profile.id !== 'local_user') {
                return new SupabaseAssetRepository(profile.id);
            }
        }
        // Local Vault Mode (100% private SQLite-backed)
        return new LocalAssetRepository();
    }, [isDemoMode, templateId, profile?.id]);

    return repository;
}
