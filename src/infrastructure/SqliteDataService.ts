/**
 * SqliteDataService
 * 
 * Why this exists:
 * DataService implementation connecting OpenNetWorth to the local SQLite database.
 * Replaces SupabaseService and provides durable on-disk persistence.
 */

import { DataService } from './DataService';

export class SqliteDataService<T extends { id: string }> implements DataService<T> {
    private entityName: string;

    constructor(entityName: string) {
        this.entityName = entityName;
    }

    async getAll(): Promise<T[]> {
        if (typeof window === 'undefined') return [];
        try {
            const res = await fetch(`/api/vault?entity=${this.entityName}`);
            if (!res.ok) return [];
            const data = await res.json();
            return (data.data || []) as T[];
        } catch (e) {
            console.error(`SqliteDataService getAll error for ${this.entityName}:`, e);
            return [];
        }
    }

    async getById(id: string): Promise<T | null> {
        const items = await this.getAll();
        return items.find(i => i.id === id) || null;
    }

    async create(item: T): Promise<T> {
        const items = await this.getAll();
        items.push(item);
        await this.syncAll(items);
        return item;
    }

    async update(item: T): Promise<T> {
        const items = await this.getAll();
        const index = items.findIndex(i => i.id === item.id);
        if (index !== -1) {
            items[index] = item;
            await this.syncAll(items);
        }
        return item;
    }

    async delete(id: string): Promise<void> {
        const items = await this.getAll();
        const filtered = items.filter(i => i.id !== id);
        await this.syncAll(filtered);
    }

    private async syncAll(items: T[]): Promise<void> {
        try {
            await fetch('/api/vault', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ [this.entityName]: items })
            });
            window.dispatchEvent(new Event('opennetworth_data_updated'));
        } catch (e) {
            console.error(`SqliteDataService sync error for ${this.entityName}:`, e);
        }
    }
}
