import { Liability } from '@/features/liabilities/types';
import { IRepository } from '@/types/repository';
import { createClient } from '@/utils/supabase/client';
import { loadLiabilities, saveLiabilities } from '@/infrastructure/local_driver';

const supabase = createClient();

/**
 * Domain-specific Liability Repository Interface.
 */
export interface ILiabilityRepository extends IRepository<Liability> {
    // Add specific methods here if needed
}

/**
 * PRODUCTION Implementation: Uses Supabase
 */
export class SupabaseLiabilityRepository implements ILiabilityRepository {
    constructor(private templateId?: string | null) { }

    async getAll(): Promise<Liability[]> {
        let query = supabase.from('liabilities').select('*');
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
        return (data || []) as Liability[];
    }

    async getById(id: string): Promise<Liability | null> {
        const { data, error } = await supabase.from('liabilities').select('*').eq('id', id).single();
        if (error) return null;
        return data as Liability;
    }

    async create(item: Liability): Promise<Liability> {
        // Ensure user_id is set
        let userId = item.user_id;
        if (!userId || userId === 'local' || userId === 'local_user') {
            if (this.templateId) {
                userId = this.templateId;
            } else {
                const { data: { user } } = await supabase.auth.getUser();
                if (user) userId = user.id;
            }
        }

        if (!userId) throw new Error("Cannot create liability: User unsupported or not logged in");

        const payload = { ...item, user_id: userId };

        const { data, error } = await (supabase.from('liabilities') as any).insert([payload]).select().single();
        if (error) throw error;
        return data as Liability;
    }

    async update(item: Liability): Promise<Liability> {
        const { data, error } = await (supabase.from('liabilities') as any)
            .update(item)
            .eq('id', item.id)
            .select()
            .single();
        if (error) throw error;
        return data as Liability;
    }

    async delete(id: string): Promise<void> {
        const { error } = await supabase.from('liabilities').delete().eq('id', id);
        if (error) throw error;
    }
}

/**
 * DEMO/LOCAL Implementation: Uses LocalStorage
 */
export class LocalLiabilityRepository implements ILiabilityRepository {
    constructor(private templateId?: string | null) { }

    async getAll(): Promise<Liability[]> {
        const allItems = loadLiabilities();
        const targetId = this.templateId || 'local_user';
        return allItems.filter(l => l.user_id === targetId || (!l.user_id && targetId === 'local_user'));
    }

    async getById(id: string): Promise<Liability | null> {
        const items = loadLiabilities();
        return items.find(i => i.id === id) || null;
    }

    async create(item: Liability): Promise<Liability> {
        const items = loadLiabilities();
        const newItem = { ...item };
        items.push(newItem);
        saveLiabilities(items);
        return newItem;
    }

    async update(item: Liability): Promise<Liability> {
        const items = loadLiabilities();
        const index = items.findIndex(i => i.id === item.id);
        if (index !== -1) {
            items[index] = item;
            saveLiabilities(items);
            return item;
        }
        throw new Error(`Liability with id ${item.id} not found locally`);
    }

    async delete(id: string): Promise<void> {
        const items = loadLiabilities();
        const filtered = items.filter(i => i.id !== id);
        saveLiabilities(filtered);
    }
}
