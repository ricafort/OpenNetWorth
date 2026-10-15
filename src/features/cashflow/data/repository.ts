import { RecurringTransaction } from '@/features/cashflow/types';
import { IRepository } from '@/types/repository';
import { CurrencyCode } from '@/types';
import { persistScopedRecord, deleteScopedRecord } from '@/infrastructure/local_driver';

/**
 * Domain-specific Cashflow Repository Interface.
 */
export interface ICashflowRepository extends IRepository<RecurringTransaction> {
    // Add specific methods here if needed
}

/** Raw `recurring_transactions` row shape returned by the entity-scoped vault GET. */
interface RecurringRow {
    id: string;
    user_id: string;
    name: string;
    amount: number;
    type: 'income' | 'expense';
    frequency: RecurringTransaction['frequency'];
    category: string;
    start_date: string;
    end_date: string | null;
    is_active: number; // SQLite INTEGER 0/1
    currency: string;
}

/**
 * Maps a snake_case vault row onto the camelCase-ish UI schedule shape.
 *
 * Tricky logic:
 * - `is_active` is stored as INTEGER 0/1; the UI type is boolean.
 * - `end_date` is NULL in SQLite for open-ended schedules; the UI type is
 *   `string | undefined`, so null maps to undefined.
 * - `notes`/`last_applied` have no columns in the table and stay undefined.
 */
function rowToSchedule(row: RecurringRow): RecurringTransaction {
    return {
        id: row.id,
        user_id: row.user_id,
        name: row.name,
        amount: row.amount,
        type: row.type,
        frequency: row.frequency,
        category: row.category,
        start_date: row.start_date,
        end_date: row.end_date ?? undefined,
        is_active: row.is_active === 1,
        currency: row.currency as CurrencyCode
    };
}

/**
 * Authoritative Local SQLite-backed Cashflow Repository (DATA-01, DATA-04, DATA-05).
 *
 * Why this exists:
 * Recurring schedules live in the embedded SQLite vault (`recurring_transactions`,
 * renamed to `recurring_schedules` by the schema-collapse migration). Reads go
 * through `/api/vault?entity=recurring` so the Autopilot tab, the Wealth Momentum
 * widget, and the Debt Freedom Accelerator all observe the same schedules —
 * no localStorage-first reads disagreeing with SQLite writes.
 *
 * Tricky logic:
 * - Demo mode (Phase 2.7) is served by the vault API itself: the
 *   `demo_persona` cookie makes `/api/vault?entity=recurring` return the
 *   persona vault's schedules, and writes are refused with 403.
 * - Writes go to SQLite via `persistScopedRecord` — there is no browser cache
 *   behind it (the localStorage layer and `initVaultSync` were removed with the
 *   single-data-layer collapse).
 */
export class LocalCashflowRepository implements ICashflowRepository {
    async getAll(): Promise<RecurringTransaction[]> {
        const res = await fetch('/api/vault?entity=recurring');
        if (!res.ok) {
            throw new Error(`Failed to load recurring schedules: HTTP ${res.status}`);
        }
        const json = await res.json();
        return ((json.data ?? []) as RecurringRow[]).map(rowToSchedule);
    }

    async getById(id: string): Promise<RecurringTransaction | null> {
        const items = await this.getAll();
        return items.find(i => i.id === id) || null;
    }

    async create(item: RecurringTransaction): Promise<RecurringTransaction> {
        // Enforce durable scoped SQLite persistence (DATA-01, DATA-02, DATA-04)
        return await persistScopedRecord<RecurringTransaction>('recurring', item);
    }

    async update(item: RecurringTransaction): Promise<RecurringTransaction> {
        // Enforce durable scoped SQLite persistence (DATA-01, DATA-02, DATA-04)
        return await persistScopedRecord<RecurringTransaction>('recurring', item);
    }

    async delete(id: string): Promise<void> {
        // Enforce durable scoped SQLite deletion (DATA-04, DATA-05)
        await deleteScopedRecord('recurring', id);
    }
}
