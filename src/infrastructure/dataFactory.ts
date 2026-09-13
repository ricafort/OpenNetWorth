/**
 * Data Service Factory
 * 
 * Returns the appropriate DataService implementation based on mode.
 */

import { DataService } from './DataService';
import { LocalStorageService } from './LocalStorageService';
import { SqliteDataService } from './SqliteDataService';
import { SupabaseService } from './SupabaseService';

export type EntityType = 'assets' | 'liabilities' | 'goals' | 'recurring' | 'history' | 'cashFlow';

/**
 * Table name mapping for each entity type.
 */
const TABLE_NAMES: Record<EntityType, string> = {
    assets: 'assets',
    liabilities: 'liabilities',
    goals: 'goals',
    recurring: 'recurring_transactions',
    history: 'net_worth_history',
    cashFlow: 'cash_flow_history',
};

/**
 * Get the appropriate data service based on mode.
 * 
 * In OpenNetWorth, local-first is the default architecture.
 * We prioritize local SQLite and client storage, eliminating mandatory Supabase SaaS dependencies.
 * 
 * @param entityType - The type of entity (assets, liabilities, etc.)
 * @param isDemoMode - Whether we're in demo mode (using template)
 * @param userId - The user/template ID
 * @returns DataService instance
 */
export function getDataService<T extends { id: string }>(
    entityType: EntityType,
    isDemoMode: boolean,
    userId?: string | null
): DataService<T> {
    const tableName = TABLE_NAMES[entityType];

    // If explicit Supabase credentials and remote template are specified, support fallback
    if (isDemoMode && userId && process.env.NEXT_PUBLIC_SUPABASE_URL) {
        return new SupabaseService<T>(tableName, userId);
    } else {
        // Default local-first SQLite / Local Vault mode
        return new LocalStorageService<T>(entityType);
    }
}

// Re-export all services
export type { DataService } from './DataService';
export { LocalStorageService } from './LocalStorageService';
export { SqliteDataService } from './SqliteDataService';
export { SupabaseService } from './SupabaseService';

