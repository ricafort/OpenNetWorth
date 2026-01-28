/**
 * SupabaseService
 * 
 * DataService implementation for Supabase.
 * Used when viewing template profiles or authenticated user data.
 */

import { DataService, FieldMapping, toSnakeCase, toCamelCase } from './DataService';
import { createClient } from '@/utils/supabase/client';

/**
 * Entity-specific field mappings (beyond common ones).
 */
const ENTITY_MAPPINGS: Record<string, FieldMapping[]> = {
    assets: [
        { camelCase: 'investment', snakeCase: 'investment_details' },
    ],
    goals: [
        { camelCase: 'isCompleted', snakeCase: 'is_completed' },
    ],
    recurring_transactions: [],
    liabilities: [],
};

/**
 * Supabase-based data service.
 * @template T - The frontend entity type
 */
export class SupabaseService<T extends { id: string }> implements DataService<T> {
    private supabase: any;
    private tableName: string;
    private userId: string;
    private extraMappings: FieldMapping[];

    constructor(tableName: string, userId: string) {
        this.supabase = createClient();
        this.tableName = tableName;
        this.userId = userId;
        this.extraMappings = ENTITY_MAPPINGS[tableName] || [];
    }

    async getAll(): Promise<T[]> {
        const { data, error } = await this.supabase
            .from(this.tableName)
            .select('*')
            .eq('user_id', this.userId);

        if (error) {
            console.error(`SupabaseService.getAll(${this.tableName}):`, error);
            return [];
        }

        return (data || []).map((row: any) =>
            toCamelCase(row, this.extraMappings) as T
        );
    }

    async create(item: T): Promise<T> {
        const dbItem = {
            ...toSnakeCase(item as Record<string, any>, this.extraMappings),
            user_id: this.userId,
            last_updated: new Date().toISOString(),
        };

        const { error } = await this.supabase
            .from(this.tableName)
            .insert(dbItem);

        if (error) {
            console.error(`SupabaseService.create(${this.tableName}):`, error);
            throw new Error(error.message);
        }

        return item;
    }

    async update(item: T): Promise<T> {
        const snakeCased = toSnakeCase(item as Record<string, any>, this.extraMappings);
        const dbItem: Record<string, any> = {
            ...snakeCased,
            last_updated: new Date().toISOString(),
        };

        // Remove user_id from update payload (shouldn't change)
        delete dbItem.user_id;

        const { error } = await this.supabase
            .from(this.tableName)
            .update(dbItem)
            .eq('id', (item as any).id);

        if (error) {
            console.error(`SupabaseService.update(${this.tableName}):`, error);
            throw new Error(error.message);
        }

        return item;
    }

    async delete(id: string): Promise<void> {
        const { error } = await this.supabase
            .from(this.tableName)
            .delete()
            .eq('id', id);

        if (error) {
            console.error(`SupabaseService.delete(${this.tableName}):`, error);
            throw new Error(error.message);
        }
    }
}

