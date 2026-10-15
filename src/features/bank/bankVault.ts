// Why this file exists:
// Local-first storage for bank link metadata (Plaid / Basiq). The Supabase
// `linked_items` and `bank_accounts` tables were removed with the cloud
// adapter (Phase 3); rows now live in the SQLite vault's `settings` kv as
// JSON arrays, so linking survives browser resets and lives inside the
// vault file the user owns.
//
// Tricky logic:
// - The linked-items key deliberately contains "credential" so the settings
//   read API and the vault backup export (both reject keys matching
//   /token|secret|password|credential|apikey|api_key/i) never surface access
//   tokens across the API boundary. Tokens exist only in the live vault
//   file; restoring a backup therefore requires re-linking banks — the
//   intended privacy posture for a local-first app.
// - `bank_accounts` holds no secrets, so it is backup-safe and readable.

import type Database from 'better-sqlite3';
import { LinkedItemRow, BankAccountRow } from './types';

/** The single local identity — same id the profiles table seeds. */
export const LOCAL_USER_ID = 'local_user';

export const LINKED_ITEMS_KEY = 'bank_linked_items_credentials';
export const BANK_ACCOUNTS_KEY = 'bank_accounts';

function readKvArray<T>(db: Database.Database, key: string): T[] {
    const row = db.prepare('SELECT value FROM settings WHERE key = ?').get(key) as { value: string } | undefined;
    if (!row) return [];
    try {
        const parsed = JSON.parse(row.value);
        return Array.isArray(parsed) ? parsed as T[] : [];
    } catch {
        return [];
    }
}

function writeKvArray(db: Database.Database, key: string, rows: unknown[]): void {
    db.prepare(`
        INSERT INTO settings (key, value)
        VALUES (?, ?)
        ON CONFLICT(key) DO UPDATE SET value = excluded.value
    `).run(key, JSON.stringify(rows));
}

export function getLinkedItems(db: Database.Database): LinkedItemRow[] {
    return readKvArray<LinkedItemRow>(db, LINKED_ITEMS_KEY);
}

/** Insert or replace by provider item_id (mirrors the old unique constraint). */
export function upsertLinkedItem(db: Database.Database, item: LinkedItemRow): void {
    const items = getLinkedItems(db);
    const idx = items.findIndex(i => i.item_id === item.item_id);
    if (idx >= 0) items[idx] = item;
    else items.push(item);
    writeKvArray(db, LINKED_ITEMS_KEY, items);
}

export function getBankAccounts(db: Database.Database): BankAccountRow[] {
    return readKvArray<BankAccountRow>(db, BANK_ACCOUNTS_KEY);
}

/** Upsert by (linked_item_id, name, mask) — same conflict target as the old table. */
export function saveBankAccounts(db: Database.Database, linkedItemId: string, userId: string, accounts: { name: string; mask: string | null; type: string; balance: number; currency: string }[]): void {
    const rows = getBankAccounts(db);
    for (const acc of accounts) {
        const idx = rows.findIndex(r => r.linked_item_id === linkedItemId && r.name === acc.name && r.mask === acc.mask);
        const row: BankAccountRow = {
            id: idx >= 0 ? rows[idx].id : crypto.randomUUID(),
            linked_item_id: linkedItemId,
            user_id: userId,
            name: acc.name,
            mask: acc.mask,
            type: acc.type,
            current_balance: acc.balance,
            currency: acc.currency,
            last_updated: new Date().toISOString()
        };
        if (idx >= 0) rows[idx] = row;
        else rows.push(row);
    }
    writeKvArray(db, BANK_ACCOUNTS_KEY, rows);
}
