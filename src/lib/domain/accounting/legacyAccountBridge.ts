/**
 * Legacy Asset/Liability shape <-> double-entry ledger bridge.
 *
 * Why this file exists:
 * After the single-data-layer collapse, the ledger (`accounts` rows with
 * `type IN ('asset','liability')`) is the only source of truth for real
 * holdings. The legacy asset/liability widgets still speak the flat
 * `Asset`/`Liability` shape, so both feature repositories share the HTTP
 * calls and write primitives defined here instead of duplicating them.
 *
 * Tricky logic:
 * - `update_account` uses optimistic concurrency (`expected_revision`), so
 *   every write re-reads the account from `GET /api/accounting` first.
 * - Value changes use the crudest legacy-parity primitive:
 *   `set_opening_balance` when the account has no established opening basis,
 *   otherwise a dated `record_valuation` adjustment (assets only — liquid
 *   accounts and liabilities reject valuations by design; their m1-native
 *   path is a transaction, so we surface a guidance error instead of
 *   silently corrupting the ledger). Real balance management lives in the
 *   Accounting views; this bridge only keeps legacy CRUD functional.
 * - Creating an account needs an owning entity: reuse the first `person`
 *   entity, else the first entity, else create a 'Personal' person.
 */

import { Account, Entity } from './types';

/** An account row enriched with the computed balance fields from GET /api/accounting. */
export interface LedgerAccountRow extends Account {
    balance_cents: number;
    formatted_balance: string;
    as_of_date: string;
    is_unknown: boolean;
}

export interface LedgerSnapshot {
    entities: Entity[];
    accounts: LedgerAccountRow[];
}

async function postAction(body: Record<string, unknown>): Promise<any> {
    const res = await fetch('/api/accounting', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
    });
    const json = await res.json().catch(() => null);
    if (!res.ok || !json?.success) {
        throw new Error(json?.error || `Ledger write failed: HTTP ${res.status}`);
    }
    return json;
}

export async function fetchLedgerSnapshot(): Promise<LedgerSnapshot> {
    const res = await fetch('/api/accounting');
    if (!res.ok) throw new Error(`Failed to load ledger accounts: HTTP ${res.status}`);
    const json = await res.json();
    if (!json.success) throw new Error(json.error || 'Failed to load ledger accounts');
    return { entities: json.entities ?? [], accounts: json.accounts ?? [] };
}

/** Active asset or liability accounts across all entities, with computed balances. */
export async function listLedgerAccounts(type: 'asset' | 'liability'): Promise<LedgerAccountRow[]> {
    const { accounts } = await fetchLedgerSnapshot();
    return accounts.filter(a => a.type === type && !!a.is_active);
}

async function ensureDefaultEntityId(currency: string): Promise<string> {
    const { entities } = await fetchLedgerSnapshot();
    const person = entities.find(e => e.type === 'person');
    if (person) return person.id;
    if (entities.length > 0) return entities[0].id;
    const created = await postAction({
        action: 'create_entity',
        entity: { name: 'Personal', type: 'person', currency }
    });
    return created.entity.id;
}

/** Creates a ledger account with an opening balance dated today (legacy-parity create). */
export async function createLedgerAccount(input: {
    id: string;
    name: string;
    type: 'asset' | 'liability';
    sub_type: string;
    currency: string;
    balance_cents: number;
}): Promise<void> {
    const entity_id = await ensureDefaultEntityId(input.currency);
    await postAction({
        action: 'create_account',
        account: {
            id: input.id,
            entity_id,
            name: input.name,
            type: input.type,
            sub_type: input.sub_type,
            currency: input.currency,
            opening_balance_cents: input.balance_cents,
            opening_date: new Date().toISOString().slice(0, 10)
        }
    });
}

/**
 * Renames/reclassifies a ledger account and (optionally) changes its value.
 * The value change only fires when the requested cents differ from the
 * currently computed balance, so no-op edits never post ledger noise.
 */
export async function updateLedgerAccount(input: {
    id: string;
    type: 'asset' | 'liability';
    name?: string;
    sub_type?: string;
    balance_cents?: number;
}): Promise<void> {
    const { accounts } = await fetchLedgerSnapshot();
    const account = accounts.find(a => a.id === input.id);
    if (!account) throw new Error(`Account not found in ledger: ${input.id}`);

    const updates: Record<string, unknown> = {};
    if (input.name !== undefined) updates.name = input.name;
    if (input.sub_type !== undefined) updates.sub_type = input.sub_type;
    if (Object.keys(updates).length > 0) {
        await postAction({
            action: 'update_account',
            account_id: input.id,
            expected_revision: account.revision ?? 1,
            updates
        });
    }

    if (input.balance_cents !== undefined && input.balance_cents !== account.balance_cents) {
        await changeLedgerValue(input.id, input.type, input.balance_cents);
    }
}

async function changeLedgerValue(accountId: string, type: 'asset' | 'liability', amountCents: number): Promise<void> {
    const today = new Date().toISOString().slice(0, 10);
    try {
        await postAction({ action: 'set_opening_balance', account_id: accountId, amount_cents: amountCents, date: today });
    } catch (openingErr: any) {
        if (type === 'asset') {
            // Opening basis already established: post a dated valuation adjustment instead.
            await postAction({
                action: 'record_valuation',
                payload: { asset_account_id: accountId, date: today, new_valuation_cents: amountCents }
            });
            return;
        }
        throw new Error('Balance changes for this liability must be recorded as transactions in the Accounting view.');
    }
}

/** Archives (soft-deletes) a ledger account; the ledger keeps its history. */
export async function archiveLedgerAccount(accountId: string): Promise<void> {
    const { accounts } = await fetchLedgerSnapshot();
    const account = accounts.find(a => a.id === accountId);
    if (!account) throw new Error(`Account not found in ledger: ${accountId}`);
    await postAction({
        action: 'update_account',
        account_id: accountId,
        expected_revision: account.revision ?? 1,
        updates: { is_active: false }
    });
}
