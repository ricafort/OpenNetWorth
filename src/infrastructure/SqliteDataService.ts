/**
 * SqliteDataService
 * 
 * Why this exists:
 * Authoritative DataService connecting OpenNetWorth components directly to the local SQLite database.
 * Uses scoped single-record operations (DATA-05) and enforces durable persistence acknowledgment (DATA-02, DATA-03).
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
            if (!res.ok) {
                const err = await res.json().catch(() => ({ error: 'Database read failed' }));
                throw new Error(err.error || `Failed to fetch ${this.entityName}`);
            }
            const data = await res.json();
            return (data.data || []) as T[];
        } catch (e: any) {
            console.error(`SqliteDataService getAll error for ${this.entityName}:`, e);
            return [];
        }
    }

    async getById(id: string): Promise<T | null> {
        const items = await this.getAll();
        return items.find(i => i.id === id) || null;
    }

    async create(item: T): Promise<T> {
        // Scoped atomic persistence to SQLite (DATA-02, DATA-04, DATA-05)
        const res = await fetch('/api/vault', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                action: 'scoped_save',
                entity: this.entityName,
                item
            })
        });

        if (!res.ok) {
            const err = await res.json().catch(() => ({ error: 'Durable save failed' }));
            throw new Error(err.error || `Failed to save ${this.entityName} to database`);
        }

        if (typeof window !== 'undefined') {
            window.dispatchEvent(new Event('opennetworth_data_updated'));
        }

        return item;
    }

    async update(item: T): Promise<T> {
        // Scoped atomic update to SQLite (DATA-02, DATA-05)
        const res = await fetch('/api/vault', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                action: 'scoped_save',
                entity: this.entityName,
                item
            })
        });

        if (!res.ok) {
            const err = await res.json().catch(() => ({ error: 'Durable update failed' }));
            throw new Error(err.error || `Failed to update ${this.entityName} in database`);
        }

        if (typeof window !== 'undefined') {
            window.dispatchEvent(new Event('opennetworth_data_updated'));
        }

        return item;
    }

    async delete(id: string): Promise<void> {
        // Scoped atomic delete from SQLite (DATA-05)
        const res = await fetch('/api/vault', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                action: 'scoped_delete',
                entity: this.entityName,
                id
            })
        });

        if (!res.ok) {
            const err = await res.json().catch(() => ({ error: 'Durable delete failed' }));
            throw new Error(err.error || `Failed to delete ${this.entityName} from database`);
        }

        if (typeof window !== 'undefined') {
            window.dispatchEvent(new Event('opennetworth_data_updated'));
        }
    }
}
