'use client';

import { IGoalRepository, LocalGoalRepository } from '../data/repository';
import { useMemo } from 'react';

/**
 * Dependency Injection Hook for Goal Repository.
 * The embedded SQLite vault is the single data layer, so the local repository
 * is always used; the Supabase branch was removed with the data-layer collapse.
 * Demo mode (Phase 2.7) needs no injection: the `demo_persona` cookie makes
 * the vault API serve the persona vault's goals.
 */
export function useGoalRepository(): IGoalRepository {
    return useMemo(() => new LocalGoalRepository(), []);
}
