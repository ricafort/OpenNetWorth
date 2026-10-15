// Why this file exists:
// Nightly (cron-triggered) sync of every active bank connection. Reads linked
// items from the vault's settings kv, pulls accounts + recent transactions from
// the provider connector, and upserts account snapshots back into the kv.
// The Supabase service-role client this used to run against is gone — the
// local vault is the only store.

import { getDb } from '@/infrastructure/sqlite/db';
import { getBankConnector } from './factory';
import { UnifiedAccount, UnifiedTransaction, LinkedItemRow } from './types';
import { getLinkedItems, upsertLinkedItem, saveBankAccounts } from './bankVault';

export async function syncAllBankConnections() {
    const db = getDb();

    // 1. Fetch all active connections
    const items = getLinkedItems(db).filter(item => item.status === 'active');
    if (items.length === 0) return { success: true, results: [] };

    const results = [];

    for (const item of items) {
        try {
            console.log(`Syncing item ${item.id} for user ${item.user_id}...`);
            const connector = getBankConnector(getProviderRegionFromItem(item));
            const accessToken = item.access_token;

            // 2. Fetch Data
            const accounts = await connector.getAccounts(accessToken);
            // Sync last 30 days
            const startDate = new Date();
            startDate.setDate(startDate.getDate() - 30);
            const transactions = await connector.getTransactions(accessToken, startDate);

            // 3. Save to vault kv
            saveBankAccounts(db, item.id, item.user_id, accounts);
            saveTransactions(item.user_id, transactions);

            item.updated_at = new Date().toISOString();
            upsertLinkedItem(db, item);

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

function getProviderRegionFromItem(item: LinkedItemRow): string {
    if (item.provider === 'basiq') return 'AU';
    if (item.provider === 'brankas') return 'PH';
    return 'US'; // Default Plaid
}

function saveTransactions(userId: string, transactions: UnifiedTransaction[]) {
    // Provider transactions are not yet mapped onto m1 journal entries; the
    // accounting import path (documents/statement review) owns that mapping.
    console.warn('Transaction saving skipped pending m1 journal mapping.');
}
