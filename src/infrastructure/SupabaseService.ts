/**
 * SupabaseService
 * 
 * DataService implementation for Supabase.
 * Used when viewing template profiles or authenticated user data.
 */

import { DataService, FieldMapping, toSnakeCase, toCamelCase } from './DataService';
import { createClient } from '@/utils/supabase/client';
import { SupabaseClient } from '@supabase/supabase-js';
import { Database } from '@/types/supabase';

/**
 * Entity-specific field mappings (beyond common ones).
 */
const ENTITY_MAPPINGS: Record<string, FieldMapping[]> = {
    assets: [
        { camelCase: 'investment', snakeCase: 'investment_details' },
    ],
    goals: [],
    recurring_transactions: [],
    liabilities: [],
};

/**
 * Supabase-based data service.
 * @template T - The frontend entity type
 */
export class SupabaseService<T extends { id: string }> implements DataService<T> {
    // TUTORIAL: We use a generic class <T> here so this single service can handle ANY entity type
    // (Assets, Liabilities, Goals) as long as it has an 'id'.
    // This implements the DataService interface, ensuring consistent API across the app.
    private supabase: SupabaseClient<Database>;
    private tableName: string;
    private userId: string;
    private extraMappings: FieldMapping[];

    constructor(tableName: string, userId: string) {
        // TUTORIAL: The Supabase client is initialized once per service instance.
        // We use the 'createClient' utility which handles the environment variables and singleton pattern.
        this.supabase = createClient();
        this.tableName = tableName;
        this.userId = userId;
        // TUTORIAL: We look up entity-specific field mappings (like 'investment_details' -> 'investment')
        // to handle database-to-frontend variable naming differences automatically.
        this.extraMappings = ENTITY_MAPPINGS[tableName] || [];
    }

    async getAll(): Promise<T[]> {
        // TUTORIAL: RLS (Row Level Security) on the database side ensures this query
        // only returns rows belonging to 'this.userId', providing a second layer of security
        // even if we forgot the .eq('user_id', ...) clause (though we include it for clarity).
        const { data, error } = await (this.supabase
            .from(this.tableName) as any)
            .select('*')
            .eq('user_id', this.userId);

        if (error) {
            console.error(`SupabaseService.getAll(${this.tableName}):`, error);
            return [];
        }

        // TUTORIAL: We transform snake_case database columns (e.g., 'created_at') to
        // camelCase frontend properties (e.g., 'createdAt') before returning data to the UI.
        return (data || []).map((row: unknown) =>
            toCamelCase(row as Record<string, unknown>, this.extraMappings) as T
        );
    }

    async create(item: T): Promise<T> {
        // TUTORIAL: Reverse transformation! We convert frontend camelCase back to snake_case
        // before sending to the database.
        const dbItem = {
            ...toSnakeCase(item as unknown as Record<string, unknown>, this.extraMappings),
            user_id: this.userId,
            last_updated: new Date().toISOString(),
        };

        const { error } = await (this.supabase
            .from(this.tableName) as any)
            .insert(dbItem);

        if (error) {
            console.error(`SupabaseService.create(${this.tableName}):`, error);
            throw new Error(error.message);
        }

        return item;
    }

    async update(item: T): Promise<T> {
        const snakeCased = toSnakeCase(item as unknown as Record<string, unknown>, this.extraMappings);
        const dbItem: Record<string, unknown> = {
            ...snakeCased,
            last_updated: new Date().toISOString(),
        };

        // TUTORIAL: Security best practice - never trust the client to send the correct user_id
        // for an update. We strip it out to prevent accidental (or malicious) ownership changes.
        // RLS will block updates if the record doesn't belong to the user anyway.
        delete dbItem.user_id;

        const { error } = await (this.supabase
            .from(this.tableName) as any)
            .update(dbItem)
            .eq('id', item.id);

        if (error) {
            console.error(`SupabaseService.update(${this.tableName}):`, error);
            throw new Error(error.message);
        }

        return item;
    }

    async delete(id: string): Promise<void> {
        const { error } = await (this.supabase
            .from(this.tableName) as any)
            .delete()
            .eq('id', id);

        if (error) {
            console.error(`SupabaseService.delete(${this.tableName}):`, error);
            throw new Error(error.message);
        }
    }
}

