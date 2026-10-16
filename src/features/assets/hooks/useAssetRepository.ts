'use client';

import { IAssetRepository, LocalAssetRepository } from '../data/repository';
import { useMemo } from 'react';

/**
 * Dependency Injection Hook for Asset Repository.
 * The embedded SQLite ledger is the single data layer, so the local
 * repository is always used; the Supabase branch was removed with the
 * data-layer collapse. Demo mode (Phase 2.7) needs no injection: the
 * `demo_persona` cookie makes the API routes serve the persona vault.
 */
export function useAssetRepository(): IAssetRepository {
    return useMemo(() => new LocalAssetRepository(), []);
}
