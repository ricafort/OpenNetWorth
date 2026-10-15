import { Goal } from '@/features/goals/types';
import { IRepository } from '@/types/repository';
import { persistScopedRecord, deleteScopedRecord } from '@/infrastructure/local_driver';

/**
 * Domain-specific Goal Repository Interface.
 */
export interface IGoalRepository extends IRepository<Goal> {
    // Add specific methods here if needed
}

/**
 * Authoritative Local SQLite-backed Goal Repository (DATA-01, DATA-04, DATA-05).
 *
 * Reads go through the vault API (`GET /api/vault?entity=goals`), which serves
 * the SQLite `goals` table directly — the Goal type is already snake_case, so
 * rows need no mapping. Writes go through `scoped_save`/`scoped_delete`, which
 * treat SQLite as authoritative.
 */
export class LocalGoalRepository implements IGoalRepository {
    constructor(private templateId?: string | null) { }

    async getAll(): Promise<Goal[]> {
        const res = await fetch('/api/vault?entity=goals');
        if (!res.ok) throw new Error(`Failed to load goals: HTTP ${res.status}`);
        const json = await res.json();
        return (json.data ?? []) as Goal[];
    }

    async getById(id: string): Promise<Goal | null> {
        const items = await this.getAll();
        return items.find(i => i.id === id) || null;
    }

    async create(item: Goal): Promise<Goal> {
        // Enforce durable scoped SQLite persistence (DATA-01, DATA-02, DATA-04)
        return await persistScopedRecord<Goal>('goals', item);
    }

    async update(item: Goal): Promise<Goal> {
        // Enforce durable scoped SQLite persistence (DATA-01, DATA-02, DATA-04)
        return await persistScopedRecord<Goal>('goals', item);
    }

    async delete(id: string): Promise<void> {
        // Enforce durable scoped SQLite deletion (DATA-04, DATA-05)
        await deleteScopedRecord('goals', id);
    }
}
