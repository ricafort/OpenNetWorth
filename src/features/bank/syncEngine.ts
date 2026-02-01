import { createClient } from '@/utils/supabase/server';
import { getBankConnector } from './factory';
import { UnifiedAccount, UnifiedTransaction, LinkedItemRow, BankAccountRow } from './types';
import { SupabaseClient, createClient as createSupabaseClient } from '@supabase/supabase-js';
import { Database } from '@/types/supabase';

// We skip complex Database type augmentation and use explicit return typing
// which is safer when schema types are out of sync.

export async function syncAllBankConnections() {
    // In a real Cron Job, use Service Role. Here we use what we have (Admin Client).
    const adminSupabase = getAdminClient();

    // 1. Fetch all active connections
    const query = adminSupabase.from('linked_items' as any).select('*').eq('status', 'active');

    // Enforce return type
    const { data, error } = await query.returns<LinkedItemRow[]>();
    const items = data;

    if (error) {
        console.error('Failed to fetch linked items:', error);
        return { success: false, error };
    }
    if (!items) return { success: true, results: [] };

    const results = [];

    for (const item of items) {
        try {
            console.log(`Syncing item ${item.id} for user ${item.user_id}...`);
            const connector = getBankConnector(getVideoProviderFromItem(item));
            const accessToken = item.access_token;

            // 2. Fetch Data
            const accounts = await connector.getAccounts(accessToken);
            // Sync last 30 days
            const startDate = new Date();
            startDate.setDate(startDate.getDate() - 30);
            const transactions = await connector.getTransactions(accessToken, startDate);

            // 3. Save to DB
            await saveAccounts(adminSupabase, item.id, item.user_id, accounts);
            await saveTransactions(adminSupabase, item.user_id, transactions);

            results.push({ itemId: item.id, status: 'success', accounts: accounts.length, txns: transactions.length });

        } catch (err: unknown) {
            console.error(`Failed to sync item ${item.id}:`, err);
            const message = err instanceof Error ? err.message : 'Unknown error';
            results.push({ itemId: item.id, status: 'failed', error: message });
        }
    }

    return { success: true, results };
}

// --- Helpers ---

function getVideoProviderFromItem(item: LinkedItemRow): string {
    if (item.provider === 'basiq') return 'AU';
    if (item.provider === 'brankas') return 'PH';
    return 'US'; // Default Plaid
}

async function saveAccounts(supabase: SupabaseClient<Database>, linkedItemId: string, userId: string, accounts: UnifiedAccount[]) {
    for (const acc of accounts) {
        await (supabase.from('bank_accounts' as any) as any).upsert({
            linked_item_id: linkedItemId,
            user_id: userId,
            id: crypto.randomUUID(),
            name: acc.name,
            mask: acc.mask,
            type: acc.type,
            current_balance: acc.balance,
            currency: acc.currency,
            last_updated: new Date().toISOString()
        }, { onConflict: 'linked_item_id, name, mask' });
    }
}

async function saveTransactions(supabase: SupabaseClient<Database>, userId: string, transactions: UnifiedTransaction[]) {
    // Skipping transaction save pending FK mapping
    console.warn('Transaction saving skipped pending FK mapping fix.');
}

function getAdminClient(): SupabaseClient<Database> {
    return createSupabaseClient<Database>(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
}
