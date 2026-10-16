import { IRepository } from '@/types/repository';

/**
 * Domain-specific Budget Repository Interface.
 */
export interface IBudgetRepository extends IRepository<Budget> {
    // Add specific methods here if needed
}

/**
 * Raw `budgets` row shape (migration 0010) — snake_case end to end, matching
 * the `/api/budgets` payloads (no mapping boilerplate).
 */
export interface Budget {
    id: string;
    user_id: string;
    entity_id: string;
    category: string;
    limit_cents: number;
    currency: string;
    created_at: string;
    updated_at: string;
}

/** Client mirror of the `budget_vs_actual` report from /api/accounting. */
export interface BudgetVsActualRow {
    category: string;
    currency: string;
    limit_cents: number | null;
    period_months: number;
    budgeted_cents: number | null;
    actual_cents: number;
    difference_cents: number | null;
    percent_used: number | null;
    status: 'over' | 'at_risk' | 'under' | 'unbudgeted';
    formatted_budgeted: string | null;
    formatted_actual: string;
    formatted_difference: string | null;
}

export interface BudgetVsActualReport {
    entity_id: string;
    start_date: string;
    end_date: string;
    period_months: number;
    rows: BudgetVsActualRow[];
    calculation_version: string;
}

/**
 * Authoritative Local SQLite-backed Budget Repository (DATA-01, DATA-04, DATA-05).
 *
 * Why this exists:
 * Monthly per-category spending limits live in the embedded SQLite vault
 * (`budgets`, migration 0010). Reads and writes go through `/api/budgets` so
 * the Budgets tab and the Actual-tab comparison observe the same rows —
 * no browser cache disagreeing with SQLite writes.
 *
 * Tricky logic:
 * - Budgets are ENTITY-scoped (category-accounts are per entity), so the
 *   entity id is bound into the repository; an empty id short-circuits to an
 *   empty list instead of firing a 400 request.
 * - Demo mode (Phase 2.7) needs no branch: the `demo_persona` cookie makes
 *   `/api/budgets` serve the persona vault's budgets, and writes are refused
 *   with 403.
 * - `limit_cents` is the ledger minor-unit convention; the form converts the
 *   major-unit input once here at the boundary.
 */
export class LocalBudgetRepository implements IBudgetRepository {
    constructor(private readonly entityId: string) { }

    async getAll(): Promise<Budget[]> {
        if (!this.entityId) return [];
        const res = await fetch(`/api/budgets?entity_id=${encodeURIComponent(this.entityId)}`);
        if (!res.ok) {
            throw new Error(`Failed to load budgets: HTTP ${res.status}`);
        }
        const json = await res.json();
        return (json.budgets ?? []) as Budget[];
    }

    async getById(id: string): Promise<Budget | null> {
        const items = await this.getAll();
        return items.find(i => i.id === id) || null;
    }

    async create(item: Budget): Promise<Budget> {
        return this.upsert(item);
    }

    async update(item: Budget): Promise<Budget> {
        return this.upsert(item);
    }

    async delete(id: string): Promise<void> {
        const res = await fetch(`/api/budgets?id=${encodeURIComponent(id)}`, { method: 'DELETE' });
        if (!res.ok && res.status !== 404) {
            const err = await res.json().catch(() => ({}));
            throw new Error(err.error || `Failed to delete budget: HTTP ${res.status}`);
        }
    }

    /** Upsert is keyed by (entity_id, category, currency) — re-saving updates. */
    private async upsert(item: Budget): Promise<Budget> {
        const res = await fetch('/api/budgets', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                action: 'upsert',
                payload: {
                    entity_id: item.entity_id,
                    category: item.category,
                    currency: item.currency,
                    limit_cents: item.limit_cents
                }
            })
        });
        if (!res.ok) {
            const err = await res.json().catch(() => ({}));
            throw new Error(err.error || `Failed to save budget: HTTP ${res.status}`);
        }
        const json = await res.json();
        return json.budget as Budget;
    }
}
