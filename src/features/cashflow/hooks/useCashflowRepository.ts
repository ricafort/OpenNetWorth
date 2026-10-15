'use client';

import { useProfile } from '@/contexts/ProfileContext';
import { ICashflowRepository, LocalCashflowRepository } from '../data/repository';
import { useMemo } from 'react';

/**
 * Dependency Injection Hook for Cashflow Repository.
 *
 * Why this exists:
 * The embedded SQLite vault is the single data layer, so there is exactly one
 * repository. Demo mode passes the persona id so the repository stays on
 * localStorage persona data and never touches the real vault.
 */
export function useCashflowRepository(): ICashflowRepository {
    const { isDemoMode, profile } = useProfile();
    const templateId = isDemoMode ? profile?.id : null;

    const repository = useMemo(
        () => new LocalCashflowRepository(templateId),
        [templateId]
    );

    return repository;
}
