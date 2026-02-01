/**
 * LocalStorageService
 * 
 * DataService implementation for localStorage.
 * Used in Demo Mode (local device storage).
 */

import { DataService } from './DataService';

const STORAGE_KEYS = {
    assets: 'clearworth_assets',
    liabilities: 'clearworth_liabilities',
    goals: 'clearworth_goals',
    recurring: 'clearworth_recurring',
    history: 'clearworth_nw_history',
    cashFlow: 'clearworth_cash_flow',
} as const;

type EntityType = keyof typeof STORAGE_KEYS;

/**
 * Generic localStorage-based data service.
 */
export class LocalStorageService<T extends { id: string }> implements DataService<T> {
    private storageKey: string;

    constructor(entityType: EntityType) {
        this.storageKey = STORAGE_KEYS[entityType];
    }

    async getAll(): Promise<T[]> {
        if (typeof window === 'undefined') return [];
        const item = localStorage.getItem(this.storageKey);
        if (!item) return [];
        try {
            return JSON.parse(item) as T[];
        } catch {
            return [];
        }
    }

    async create(item: T): Promise<T> {
        const items = await this.getAll();
        items.push(item);
        this.save(items);
        return item;
    }

    async update(item: T): Promise<T> {
        const items = await this.getAll();
        const index = items.findIndex(i => i.id === item.id);
        if (index !== -1) {
            items[index] = item;
            this.save(items);
        }
        return item;
    }

    async delete(id: string): Promise<void> {
        const items = await this.getAll();
        const filtered = items.filter(i => i.id !== id);
        this.save(filtered);
    }

    private save(items: T[]): void {
        if (typeof window === 'undefined') return;
        localStorage.setItem(this.storageKey, JSON.stringify(items));
        window.dispatchEvent(new Event('clearworth_data_updated'));
    }
}
