import { useResourceQuery } from '@/hooks/useResourceQuery';
import { useGoalRepository } from './useGoalRepository';
import { Goal } from '@/features/goals/types';

const QUERY_KEY = ['goals'];

export function useGoalsQuery() {
    const repository = useGoalRepository();

    const {
        items: goals,
        isLoading,
        error,
        add: addGoal,
        update: updateGoal,
        del: deleteGoal,
        isAdding,
        isUpdating,
        isDeleting
    } = useResourceQuery<Goal>({
        queryKey: QUERY_KEY,
        repository
    });

    return {
        goals,
        isLoading,
        error,
        addGoal,
        updateGoal,
        deleteGoal,
        isAdding,
        isUpdating,
        isDeleting
    };
}
