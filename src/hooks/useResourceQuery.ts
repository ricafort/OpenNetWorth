'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useProfile } from '@/contexts/ProfileContext';

export interface ResourceRepository<T> {
    getAll: () => Promise<T[]>;
    create: (item: T) => Promise<T>;
    update: (item: T) => Promise<T>;
    delete: (id: string) => Promise<string | void>;
}

interface UseResourceQueryOptions<T> {
    queryKey: string[];
    repository: ResourceRepository<T>;
}

export function useResourceQuery<T>({ queryKey, repository }: UseResourceQueryOptions<T>) {
    const queryClient = useQueryClient();
    const { isDemoMode, demoPersona, isLoading: profileLoading } = useProfile();

    // Fetch — the persona is part of the key so switching personas (the
    // `demo_persona` cookie changes what the API routes serve) never reuses
    // another persona's cached rows.
    const { data = [], isLoading, error } = useQuery<T[]>({
        queryKey: [...queryKey, isDemoMode, demoPersona],
        queryFn: async () => {
            return await repository.getAll();
        },
        enabled: !profileLoading,
    });

    // Create
    const addMutation = useMutation({
        mutationFn: async (newItem: T) => {
            // @ts-ignore - Supabase might return null on error, but repo handles throws
            return await repository.create(newItem);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey });
        }
    });

    // Update
    const updateMutation = useMutation({
        mutationFn: async (updatedItem: T) => {
            return await repository.update(updatedItem);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey });
        }
    });

    // Delete
    const deleteMutation = useMutation({
        mutationFn: async (id: string) => {
            await repository.delete(id);
            return id;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey });
        }
    });

    return {
        items: data,
        isLoading,
        error,
        add: addMutation.mutateAsync,
        update: updateMutation.mutateAsync,
        del: deleteMutation.mutateAsync, // 'delete' is a keyword, using 'del' or 'remove'
        isAdding: addMutation.isPending,
        isUpdating: updateMutation.isPending,
        isDeleting: deleteMutation.isPending
    };
}
