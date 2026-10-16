'use client';

import { useMemo } from 'react';
import { useResourceQuery } from '@/hooks/useResourceQuery';
import { LocalBudgetRepository, type Budget } from '../data/budgetRepository';

/**
 * Dependency Injection + Query Hook for Budgets.
 *
 * Why this exists:
 * Mirrors useCashflowQuery for the `budgets` table. The entity id is part of
 * the query key so switching entities never reuses another entity's cached
 * limits (budgets are entity-scoped — see migration 0010).
 */
export function useBudgetsQuery(entityId: string) {
    const repository = useMemo(() => new LocalBudgetRepository(entityId), [entityId]);

    const {
        items: budgets,
        isLoading,
        error,
        add: addBudget,
        update: updateBudget,
        del: deleteBudget,
        isAdding,
        isUpdating,
        isDeleting
    } = useResourceQuery<Budget>({
        queryKey: ['budgets', entityId],
        repository
    });

    return {
        budgets,
        isLoading,
        error,
        addBudget,
        updateBudget,
        deleteBudget,
        isAdding,
        isUpdating,
        isDeleting
    };
}
