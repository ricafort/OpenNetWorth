import { Goal } from '@/features/goals/types';
import { IRepository } from '@/types/repository';
import { createClient } from '@/utils/supabase/client';
import { loadGoals, saveGoals, persistScopedRecord, deleteScopedRecord } from '@/infrastructure/local_driver';

const supabase = createClient();

/**
 * Domain-specific Goal Repository Interface.
 */
export interface IGoalRepository extends IRepository<Goal> {
    // Add specific methods here if needed
}

/**
 * PRODUCTION Implementation: Uses Supabase
 */
export class SupabaseGoalRepository implements IGoalRepository {
    constructor(private templateId?: string | null) { }

    async getAll(): Promise<Goal[]> {
        let query = supabase.from('goals').select('*');
        if (this.templateId) {
            query = query.eq('user_id', this.templateId);
        } else {
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
                query = query.eq('user_id', user.id);
            } else {
                return [];
            }
        }

        const { data, error } = await query;
        if (error) throw error;
        return (data || []) as Goal[];
    }

    async getById(id: string): Promise<Goal | null> {
        const { data, error } = await supabase.from('goals').select('*').eq('id', id).single();
        if (error) return null;
        return data as Goal;
    }

    async create(item: Goal): Promise<Goal> {
        let userId = item.user_id;
        if (!userId) {
            if (this.templateId) {
                userId = this.templateId;
            } else {
                const { data: { user } } = await supabase.auth.getUser();
                if (user) userId = user.id;
            }
        }

        if (!userId) throw new Error("Cannot create goal: User unsupported or not logged in");

        const payload = { ...item, user_id: userId };

        const { data, error } = await (supabase.from('goals') as any).insert([payload]).select().single();
        if (error) throw error;
        return data as Goal;
    }

    async update(item: Goal): Promise<Goal> {
        const { data, error } = await (supabase.from('goals') as any)
            .update(item)
            .eq('id', item.id)
            .select()
            .single();
        if (error) throw error;
        return data as Goal;
    }

    async delete(id: string): Promise<void> {
        const { error } = await supabase.from('goals').delete().eq('id', id);
        if (error) throw error;
    }
}

/**
 * Authoritative Local SQLite-backed Goal Repository (DATA-01, DATA-04, DATA-05).
 */
export class LocalGoalRepository implements IGoalRepository {
    constructor(private templateId?: string | null) { }

    async getAll(): Promise<Goal[]> {
        return loadGoals();
    }

    async getById(id: string): Promise<Goal | null> {
        const items = loadGoals();
        return items.find(i => i.id === id) || null;
    }

    async create(item: Goal): Promise<Goal> {
        // Enforce durable scoped SQLite persistence (DATA-01, DATA-02, DATA-04)
        return await persistScopedRecord<Goal>('goals', item);
    }

    async update(item: Goal): Promise<Goal> {
        // Enforce durable scoped SQLite persistence (DATA-01, DATA-02, DATA-04)
        return await persistScopedRecord<Goal>('goals', item);
    }

    async delete(id: string): Promise<void> {
        // Enforce durable scoped SQLite deletion (DATA-04, DATA-05)
        await deleteScopedRecord('goals', id);
    }
}
