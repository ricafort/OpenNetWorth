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
        // If we are simulating a profile (Demo Mode) OR authenticated (but NOT guest), we use Supabase.
        // We only use LocalStorage for unauthenticated Guest users who are NOT simulating.
        if (isDemoMode) {
            // Simulating a Supabase Template -> Use Supabase Repo pointing to Template ID
            return new SupabaseAssetRepository(templateId);
        } else if (profile?.id && profile.id !== 'local_user') {
            // Authenticated User -> Use Supabase Repo (User ID handled internally or passed)
            return new SupabaseAssetRepository(profile.id);
        } else {
            // Guest User (id='local_user') -> Use Local Storage
            return new LocalAssetRepository();
        }
    }, [isDemoMode, templateId, profile?.id]);

    return repository;
}
