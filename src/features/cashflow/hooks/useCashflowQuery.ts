import { useResourceQuery } from '@/hooks/useResourceQuery';
import { useCashflowRepository } from './useCashflowRepository';
import { RecurringTransaction } from '@/features/cashflow/types';

const QUERY_KEY = ['recurring_transactions'];

export function useCashflowQuery() {
    const repository = useCashflowRepository();

    const {
        items: recurring,
        isLoading,
        error,
        add: addRecurring,
        update: updateRecurring,
        del: deleteRecurring,
        isAdding,
        isUpdating,
        isDeleting
    } = useResourceQuery<RecurringTransaction>({
        queryKey: QUERY_KEY,
        repository
    });

    return {
        recurring,
        isLoading,
        error,
        addRecurring,
        updateRecurring,
        deleteRecurring,
        isAdding,
        isUpdating,
        isDeleting
    };
}
