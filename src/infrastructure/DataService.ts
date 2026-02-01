/**
 * DataService Interface
 * 
 * Abstract interface for data access operations.
 * Implementations handle localStorage or Supabase storage.
 */

/**
 * Generic CRUD operations for a data entity.
 * @template T - The entity type
 */
export interface DataService<T> {
    /** Get all items for the current user */
    getAll(): Promise<T[]>;

    /** Create a new item */
    create(item: T): Promise<T>;

    /** Update an existing item by ID */
    update(item: T): Promise<T>;

    /** Delete an item by ID */
    delete(id: string): Promise<void>;
}

/**
 * Configuration for data service instantiation.
 */
export interface DataServiceConfig {
    /** Target user ID (for Supabase operations) */
    userId: string;
    /** Entity table name */
    tableName: string;
}

/**
 * Mapping between camelCase (frontend) and snake_case (database).
 */
export interface FieldMapping {
    camelCase: string;
    snakeCase: string;
}

/**
 * Standard field mappings used across entities.
 */
export const COMMON_FIELD_MAPPINGS: FieldMapping[] = [
    { camelCase: 'lastUpdated', snakeCase: 'last_updated' },
    { camelCase: 'createdAt', snakeCase: 'created_at' },
    { camelCase: 'userId', snakeCase: 'user_id' },
    { camelCase: 'isLiquid', snakeCase: 'is_liquid' },
    { camelCase: 'interestRate', snakeCase: 'interest_rate' },
    { camelCase: 'minimumPayment', snakeCase: 'minimum_payment' },
    { camelCase: 'isGoodDebt', snakeCase: 'is_good_debt' },
    { camelCase: 'investmentDetails', snakeCase: 'investment_details' },
];

/**
 * Convert object from camelCase to snake_case for database.
 */
export function toSnakeCase<T extends Record<string, any>>(
    obj: T,
    extraMappings: FieldMapping[] = []
): Record<string, any> {
    const mappings = [...COMMON_FIELD_MAPPINGS, ...extraMappings];
    const result: Record<string, any> = {};

    for (const [key, value] of Object.entries(obj)) {
        const mapping = mappings.find(m => m.camelCase === key);
        const dbKey = mapping ? mapping.snakeCase : key;
        result[dbKey] = value;
    }

    return result;
}

/**
 * Convert object from snake_case to camelCase for frontend.
 */
export function toCamelCase<T extends Record<string, any>>(
    obj: T,
    extraMappings: FieldMapping[] = []
): Record<string, any> {
    const mappings = [...COMMON_FIELD_MAPPINGS, ...extraMappings];
    const result: Record<string, any> = {};

    for (const [key, value] of Object.entries(obj)) {
        const mapping = mappings.find(m => m.snakeCase === key);
        const camelKey = mapping ? mapping.camelCase : key;
        result[camelKey] = value;
    }

    return result;
}
