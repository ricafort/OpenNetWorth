import { Goal } from '@/features/goals/types';
import { IRepository } from '@/types/repository';
import { createClient } from '@/utils/supabase/client';
import { loadGoals, saveGoals } from '@/infrastructure/local_driver';

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
 * DEMO/LOCAL Implementation: Uses LocalStorage
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
        const items = loadGoals();
        const newItem = { ...item };
        items.push(newItem);
        saveGoals(items);
        return newItem;
    }

    async update(item: Goal): Promise<Goal> {
        const items = loadGoals();
        const index = items.findIndex(i => i.id === item.id);
        if (index !== -1) {
            items[index] = item;
            saveGoals(items);
            return item;
        }
        throw new Error(`Goal with id ${item.id} not found locally`);
    }

    async delete(id: string): Promise<void> {
        const items = loadGoals();
        const filtered = items.filter(i => i.id !== id);
        saveGoals(filtered);
    }
}
