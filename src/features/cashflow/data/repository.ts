import { RecurringTransaction } from '@/features/cashflow/types';
import { IRepository } from '@/types/repository';
import { createClient } from '@/utils/supabase/client';
import { loadRecurringTransactions, saveRecurringTransactions } from '@/infrastructure/local_driver';

const supabase = createClient();

/**
 * Domain-specific Cashflow Repository Interface.
 */
export interface ICashflowRepository extends IRepository<RecurringTransaction> {
    // Add specific methods here if needed
}

/**
 * PRODUCTION Implementation: Uses Supabase
 */
export class SupabaseCashflowRepository implements ICashflowRepository {
    constructor(private templateId?: string | null) { }

    async getAll(): Promise<RecurringTransaction[]> {
        let query = supabase.from('recurring_transactions').select('*');
        if (this.templateId) {
            query = query.eq('user_id', this.templateId);
        } else {
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
                query = query.eq('user_id', user.id);
            } else {
                return [];
            }
        }

        const { data, error } = await query;
        if (error) throw error;
        return (data || []) as RecurringTransaction[];
    }

    async getById(id: string): Promise<RecurringTransaction | null> {
        const { data, error } = await supabase.from('recurring_transactions').select('*').eq('id', id).single();
        if (error) return null;
        return data as RecurringTransaction;
    }

    async create(item: RecurringTransaction): Promise<RecurringTransaction> {
        let userId = item.user_id;
        if (!userId) {
            if (this.templateId) {
                userId = this.templateId;
            } else {
                const { data: { user } } = await supabase.auth.getUser();
                if (user) userId = user.id;
            }
        }

        if (!userId) throw new Error("Cannot create recurring transaction: User unsupported or not logged in");

        // Ensure optional fields are null if undefined to satisfy Postgres
        // STRICTLY limit payload to columns that exist in DB (remove notes/last_applied if they don't exist in schema provided)
        const payload = {
            id: item.id,
            user_id: userId,
            name: item.name,
            amount: item.amount,
            type: item.type,
            frequency: item.frequency,
            category: item.category,
            start_date: item.start_date,
            end_date: item.end_date || null,
            is_active: item.is_active,
            currency: item.currency
            // notes: item.notes - Column does not exist in schema
            // last_applied: item.last_applied - Column does not exist in schema
        };

        // Force cast to bypass strict Supabase typing issues
        const { data, error } = await (supabase.from('recurring_transactions') as any).insert([payload]).select().single();
        if (error) throw error;
        return data as RecurringTransaction;
    }

    async update(item: RecurringTransaction): Promise<RecurringTransaction> {
        // Construct clean payload matching DB schema
        const payload = {
            name: item.name,
            amount: item.amount,
            type: item.type,
            frequency: item.frequency,
            category: item.category,
            start_date: item.start_date,
            end_date: item.end_date || null,
            is_active: item.is_active,
            currency: item.currency
            // notes/last_applied excluded
        };

        const { data, error } = await (supabase.from('recurring_transactions') as any)
            .update(payload)
            .eq('id', item.id)
            .select()
            .single();
        if (error) throw error;
        return data as RecurringTransaction;
    }

    async delete(id: string): Promise<void> {
        const { error } = await supabase.from('recurring_transactions').delete().eq('id', id);
        if (error) throw error;
    }
}

/**
 * DEMO/LOCAL Implementation: Uses LocalStorage
 */
export class LocalCashflowRepository implements ICashflowRepository {
    constructor(private templateId?: string | null) { }

    async getAll(): Promise<RecurringTransaction[]> {
        return loadRecurringTransactions();
    }

    async getById(id: string): Promise<RecurringTransaction | null> {
        const items = loadRecurringTransactions();
        return items.find(i => i.id === id) || null;
    }

    async create(item: RecurringTransaction): Promise<RecurringTransaction> {
        const items = loadRecurringTransactions();
        const newItem = { ...item };
        items.push(newItem);
        saveRecurringTransactions(items);
        return newItem;
    }

    async update(item: RecurringTransaction): Promise<RecurringTransaction> {
        const items = loadRecurringTransactions();
        const index = items.findIndex(i => i.id === item.id);
        if (index !== -1) {
            items[index] = item;
            saveRecurringTransactions(items);
            return item;
        }
        throw new Error(`Recurring Transaction with id ${item.id} not found locally`);
    }

    async delete(id: string): Promise<void> {
        const items = loadRecurringTransactions();
        const filtered = items.filter(i => i.id !== id);
        saveRecurringTransactions(filtered);
    }
}
