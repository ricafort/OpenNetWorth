import { useResourceQuery } from '@/hooks/useResourceQuery';
import { useLiabilityRepository } from './useLiabilityRepository';
import { Liability } from '@/features/liabilities/types';

const QUERY_KEY = ['liabilities'];

export function useLiabilitiesQuery() {
    const repository = useLiabilityRepository();

    const {
        items: liabilities,
        isLoading,
        error,
        add: addLiability,
        update: updateLiability,
        del: deleteLiability,
        isAdding,
        isUpdating,
        isDeleting
    } = useResourceQuery<Liability>({
        queryKey: QUERY_KEY,
        repository
    });

    return {
        liabilities,
        isLoading,
        error,
        addLiability,
        updateLiability,
        deleteLiability,
        isAdding,
        isUpdating,
        isDeleting
    };
}
