import { Asset } from '@/features/assets/types';
import { IRepository } from '@/types/repository';
import { createClient } from '@/utils/supabase/client';
import { loadAssets, saveAssets, persistScopedRecord, deleteScopedRecord } from '@/infrastructure/local_driver';

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
 * Authoritative Local SQLite-backed Asset Repository (DATA-01, DATA-04, DATA-05).
 */
export class LocalAssetRepository implements IAssetRepository {
    constructor(private templateId?: string | null) { }

    async getAll(): Promise<Asset[]> {
        const allAssets = loadAssets();
        // If templateId is provided (e.g. 'fam', 'grow'), filter by it.
        // If not provided (Guest), filter by 'local_user' OR null/undefined to capture manual guest entries
        const targetId = this.templateId || 'local_user';

        return allAssets.filter(a => a.user_id === targetId || (!a.user_id && targetId === 'local_user'));
    }

    async getById(id: string): Promise<Asset | null> {
        const assets = loadAssets();
        return assets.find(a => a.id === id) || null;
    }

    async create(item: Asset): Promise<Asset> {
        // Enforce durable scoped SQLite persistence (DATA-01, DATA-02, DATA-04)
        return await persistScopedRecord<Asset>('assets', item);
    }

    async update(item: Asset): Promise<Asset> {
        // Enforce durable scoped SQLite persistence (DATA-01, DATA-02, DATA-04)
        return await persistScopedRecord<Asset>('assets', item);
    }

    async delete(id: string): Promise<void> {
        // Enforce durable scoped SQLite deletion (DATA-04, DATA-05)
        await deleteScopedRecord('assets', id);
    }
}
