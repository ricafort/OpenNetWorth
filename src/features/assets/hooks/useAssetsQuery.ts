import { useResourceQuery } from '@/hooks/useResourceQuery';
import { useAssetRepository } from './useAssetRepository';
import { Asset } from '@/features/assets/types';

const QUERY_KEY = ['assets'];

export function useAssetsQuery() {
    const repository = useAssetRepository();

    const {
        items: assets,
        isLoading,
        error,
        add: addAsset,
        update: updateAsset,
        del: deleteAsset,
        isAdding,
        isUpdating,
        isDeleting
    } = useResourceQuery<Asset>({
        queryKey: QUERY_KEY,
        repository
    });

    return {
        assets,
        isLoading,
        error,
        addAsset,
        updateAsset,
        deleteAsset,
        isAdding,
        isUpdating,
        isDeleting
    };
}
