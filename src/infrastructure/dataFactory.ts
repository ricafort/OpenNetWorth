/**
 * Data Service Factory
 * 
 * Returns the appropriate DataService implementation based on mode.
 */

import { DataService } from './DataService';
import { LocalStorageService } from './LocalStorageService';
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
 * @param entityType - The type of entity (assets, liabilities, etc.)
 * @param isDemoMode - Whether we're in demo mode (using Supabase template)
 * @param userId - The user/template ID (only used for Supabase)
 * @returns DataService instance
 */
export function getDataService<T extends { id: string }>(
    entityType: EntityType,
    isDemoMode: boolean,
    userId?: string | null
): DataService<T> {
    const tableName = TABLE_NAMES[entityType];

    if (isDemoMode && userId) {
        // Supabase mode - using template profile
        return new SupabaseService<T>(tableName, userId);
    } else {
        // localStorage mode - local device storage
        return new LocalStorageService<T>(entityType);
    }
}

// Re-export all services
export type { DataService } from './DataService';
export { LocalStorageService } from './LocalStorageService';
export { SupabaseService } from './SupabaseService';
