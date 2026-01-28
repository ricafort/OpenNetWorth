/**
 * useAssets Hook
 * 
 * Domain hook for asset CRUD operations.
 * Uses DataService abstraction for storage.
 * 
 * NOTE: This is a hybrid hook that works alongside ProfileContext.
 * For new components, use this hook. Existing components can
 * continue using useProfile() until migrated.
 */

'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { Asset } from '@/types';
import { getDataService } from '@/lib/data/services';
import { useProfile } from '@/contexts/ProfileContext';

export function useAssets() {
    // Get data mode from existing ProfileContext
    const { isDemoMode, profile } = useProfile();
    const templateId = isDemoMode ? profile?.id : null;

    const [assets, setAssets] = useState<Asset[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    // Memoize service to prevent recreation on every render
    const service = useMemo(
        () => getDataService<Asset>('assets', isDemoMode, templateId),
        [isDemoMode, templateId]
    );

    const loadAssets = useCallback(async () => {
        setIsLoading(true);
        try {
            const data = await service.getAll();
            setAssets(data);
        } catch (error) {
            console.error('Failed to load assets:', error);
        } finally {
            setIsLoading(false);
        }
    }, [service]);

    useEffect(() => {
        loadAssets();
    }, [loadAssets]);

    const addAsset = async (asset: Asset) => {
        try {
            await service.create(asset);
            setAssets(prev => [...prev, asset]);
        } catch (error) {
            console.error('Failed to add asset:', error);
            throw error;
        }
    };

    const updateAsset = async (asset: Asset) => {
        try {
            await service.update(asset);
            setAssets(prev => prev.map(a => a.id === asset.id ? asset : a));
        } catch (error) {
            console.error('Failed to update asset:', error);
            throw error;
        }
    };

    const deleteAsset = async (id: string) => {
        try {
            await service.delete(id);
            setAssets(prev => prev.filter(a => a.id !== id));
        } catch (error) {
            console.error('Failed to delete asset:', error);
            throw error;
        }
    };

    return {
        assets,
        isLoading,
        addAsset,
        updateAsset,
        deleteAsset,
        refreshAssets: loadAssets,
    };
}
