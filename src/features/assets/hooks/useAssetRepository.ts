'use client';

import { useProfile } from '@/contexts/ProfileContext';
import { IAssetRepository, LocalAssetRepository } from '../data/repository';
import { useMemo } from 'react';

/**
 * Dependency Injection Hook for Asset Repository.
 * The embedded SQLite ledger is the single data layer, so the local
 * repository is always used; the Supabase branch was removed with the
 * data-layer collapse. The templateId keeps demo mode on localStorage
 * persona data and away from the real vault.
 */
export function useAssetRepository(): IAssetRepository {
    const { isDemoMode, profile } = useProfile();
    const templateId = isDemoMode ? profile?.id : null;

    return useMemo(() => new LocalAssetRepository(templateId), [templateId]);
}
