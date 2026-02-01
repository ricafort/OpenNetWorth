import { Asset } from '@/features/assets/types';
import { IRepository } from '@/types/repository';
import { createClient } from '@/utils/supabase/client';
import { loadAssets, saveAssets } from '@/infrastructure/local_driver';

const supabase = createClient();

/**
 * Domain-specific Asset Repository Interface.
 */
export interface IAssetRepository extends IRepository<Asset> {
    // Add specific methods here if needed, e.g.:
    // getByClass(assetClass: string): Promise<Asset[]>;
}

/**
 * PRODUCTION Implementation: Uses Supabase
 */
export class SupabaseAssetRepository implements IAssetRepository {
    constructor(private templateId?: string | null) { }

    async getAll(): Promise<Asset[]> {
        let query = supabase.from('assets').select('*');

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
        return (data || []) as Asset[];
    }

    async getById(id: string): Promise<Asset | null> {
        const { data, error } = await supabase.from('assets').select('*').eq('id', id).single();
        if (error) return null;
        return data as Asset;
    }

    async create(item: Asset): Promise<Asset> {
        // Ensure user_id is set
        let userId = item.user_id;
        if (!userId) {
            if (this.templateId) {
                userId = this.templateId;
            } else {
                const { data: { user } } = await supabase.auth.getUser();
                if (user) userId = user.id;
            }
        }

        if (!userId) throw new Error("Cannot create asset: User unsupported or not logged in");

        const payload = { ...item, user_id: userId };

        const { data, error } = await (supabase.from('assets') as any).insert([payload]).select().single();
        if (error) {
            console.error("Supabase Create Error:", error);
            throw error;
        }
        return data as Asset;
    }

    async update(item: Asset): Promise<Asset> {
        const { data, error } = await (supabase.from('assets') as any)
            .update(item)
            .eq('id', item.id)
            .select()
            .single();
        if (error) throw error;
        return data as Asset;
    }

    async delete(id: string): Promise<void> {
        const { error } = await supabase.from('assets').delete().eq('id', id);
        if (error) throw error;
    }
}

/**
 * DEMO/LOCAL Implementation: Uses LocalStorage
 */
export class LocalAssetRepository implements IAssetRepository {
    constructor(private templateId?: string | null) { }

    async getAll(): Promise<Asset[]> {
        const allAssets = loadAssets();
        // If templateId is provided (e.g. 'fam', 'grow'), filter by it.
        // If not provided (Guest), filter by 'local_user' OR null/undefined to capture manual guest entries
        // For strict isolation, we should assume Guest = 'local_user'
        const targetId = this.templateId || 'local_user';

        return allAssets.filter(a => a.user_id === targetId || (!a.user_id && targetId === 'local_user'));
    }

    async getById(id: string): Promise<Asset | null> {
        const assets = loadAssets();
        return assets.find(a => a.id === id) || null;
    }

    async create(item: Asset): Promise<Asset> {
        const assets = loadAssets();
        const newItem = { ...item };
        assets.push(newItem);
        saveAssets(assets);
        return newItem;
    }

    async update(item: Asset): Promise<Asset> {
        const assets = loadAssets();
        const index = assets.findIndex(a => a.id === item.id);
        if (index !== -1) {
            assets[index] = item;
            saveAssets(assets);
            return item;
        }
        throw new Error(`Asset with id ${item.id} not found locally`);
    }

    async delete(id: string): Promise<void> {
        const assets = loadAssets();
        const filtered = assets.filter(a => a.id !== id);
        saveAssets(filtered);
    }
}
