'use client';

import { useProfile } from '@/contexts/ProfileContext';
import { ICashflowRepository, LocalCashflowRepository } from '../data/repository';
import { useMemo } from 'react';

/**
 * Dependency Injection Hook for Cashflow Repository.
 *
 * Why this exists:
 * The embedded SQLite vault is the single data layer, so there is exactly one
 * repository. Demo mode (Phase 2.7) needs no injection: the `demo_persona`
 * cookie makes the vault API serve the persona vault's schedules.
 */
export function useCashflowRepository(): ICashflowRepository {
    return useMemo(() => new LocalCashflowRepository(), []);
}
