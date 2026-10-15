/**
 * Shared legacy→ledger backfill (Phase 3 of the single-data-layer collapse).
 *
 * Why this exists:
 * The retired m0 `assets`/`liabilities` tables held REAL money rows that must survive
 * into the double-entry ledger. Two callers need identical mapping semantics:
 * - migration `0006_backfill_legacy_ledger` (rows read from the legacy tables at DB open)
 * - `POST /api/vault` bulk_restore (rows carried inside an OLD v1/v2 backup archive —
 *   the tables are gone by then, so the payload path maps straight from JSON arrays)
 *
 * Tricky logic:
 * - `mapLegacyDataToMilestone1` emits accounts with `opening_balance_cents` AND balanced
 *   opening transactions. That is exactly the shape `createAccount` produces, and
 *   `getAccountBalance` aggregates POSTINGS ONLY (opening_balance_cents is an anchor
 *   marker for `tracking_mode='transactions'`, never added to the sum) — so there is no
 *   double-count.
 * - Idempotency: rows whose mapped account id (`account-asset-<id>` / `account-liab-<id>`)
 *   already exists in accounts are skipped entirely (account + transaction + postings),
 *   and every insert is INSERT OR IGNORE. Re-running is a no-op.
 * - The caller owns the transaction (the migration runner wraps `up()`; bulk_restore has
 *   its own transaction). This module never opens one.
 */

import type Database from 'better-sqlite3';
import {
    mapLegacyDataToMilestone1,
    type LegacyAsset,
    type LegacyLiability,
    type LegacyDataPayload,
} from './migrationMapping';

/** settings-kv marker recording that the legacy backfill has run on this vault. */
export const LEGACY_BACKFILL_MARKER_KEY = 'legacy_ledger_backfill_v1';

export interface LegacyBackfillResult {
    skipped: boolean;
    reason?: 'no_legacy_tables' | 'no_rows' | 'all_already_mapped';
    assetsMapped: number;
    liabilitiesMapped: number;
    accountsInserted: number;
    transactionsInserted: number;
}

function tableExists(db: Database.Database, name: string): boolean {
    const row = db
        .prepare("SELECT COUNT(*) AS cnt FROM sqlite_master WHERE type = 'table' AND name = ?")
        .get(name) as { cnt: number } | undefined;
    return (row?.cnt ?? 0) > 0;
}

/**
 * Resolve the ledger table names at runtime. Migration 0006 can legitimately run
 * on a vault that predates the migration runner — there the ledger still carries
 * its pre-rename `m1_*` names (0008 renames it only afterwards). Every other
 * caller (bulk_restore, post-0008 vaults) gets the plain names.
 */
function ledgerTables(db: Database.Database): {
    entities: string;
    accounts: string;
    transactions: string;
    journal_entries: string;
} {
    const preRename = tableExists(db, 'm1_accounts');
    const suffix = preRename ? 'm1_' : '';
    return {
        entities: `${suffix}entities`,
        accounts: `${suffix}accounts`,
        transactions: `${suffix}transactions`,
        journal_entries: `${suffix}journal_entries`,
    };
}

function accountExists(db: Database.Database, accountId: string): boolean {
    const { accounts } = ledgerTables(db);
    return db.prepare(`SELECT 1 FROM "${accounts}" WHERE id = ?`).get(accountId) !== undefined;
}

const EMPTY_RESULT: Omit<LegacyBackfillResult, 'skipped' | 'reason'> = {
    assetsMapped: 0,
    liabilitiesMapped: 0,
    accountsInserted: 0,
    transactionsInserted: 0,
};

/**
 * Maps a legacy payload (arrays may come from JSON, not tables) into the ledger.
 * Rows already represented in accounts are skipped; everything else is inserted
 * inside the caller's transaction.
 */
export function backfillLegacyLedgerFromPayload(
    db: Database.Database,
    payload: LegacyDataPayload,
    opts: { asOfDate?: string } = {}
): LegacyBackfillResult {
    const assets = (payload.assets || []).filter(a => a?.id && !accountExists(db, `account-asset-${a.id}`));
    const liabilities = (payload.liabilities || []).filter(l => l?.id && !accountExists(db, `account-liab-${l.id}`));

    if (assets.length === 0 && liabilities.length === 0) {
        const hadRows = (payload.assets?.length ?? 0) > 0 || (payload.liabilities?.length ?? 0) > 0;
        return { skipped: true, reason: hadRows ? 'all_already_mapped' : 'no_rows', ...EMPTY_RESULT };
    }

    const mapped = mapLegacyDataToMilestone1({ ...payload, assets, liabilities }, opts.asOfDate);
    const t = ledgerTables(db);

    db.prepare(`
        INSERT OR IGNORE INTO "${t.entities}" (id, name, type, currency, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?)
    `).run(mapped.entity.id, mapped.entity.name, mapped.entity.type, mapped.entity.currency, mapped.entity.created_at, mapped.entity.updated_at);

    const insertAccount = db.prepare(`
        INSERT OR IGNORE INTO "${t.accounts}" (
            id, entity_id, name, type, sub_type, currency, is_active,
            opening_date, opening_balance_cents, tracking_mode,
            balance_revision, revision, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, 1, ?, ?, 'transactions', 1, 1, ?, ?)
    `);
    let accountsInserted = 0;
    for (const acc of mapped.accounts) {
        const res = insertAccount.run(
            acc.id, acc.entity_id, acc.name, acc.type, acc.sub_type, acc.currency,
            acc.opening_date ?? null,
            acc.opening_balance_cents ?? null,
            acc.created_at, acc.updated_at
        );
        accountsInserted += res.changes;
    }

    const insertTx = db.prepare(`
        INSERT OR IGNORE INTO "${t.transactions}" (
            id, date, description, status, origin, idempotency_key, revision, created_at, updated_at
        ) VALUES (?, ?, ?, 'posted', 'opening_balance', ?, 1, ?, ?)
    `);
    const insertPosting = db.prepare(`
        INSERT OR IGNORE INTO "${t.journal_entries}" (id, transaction_id, account_id, amount_cents, currency, memo)
        VALUES (?, ?, ?, ?, ?, ?)
    `);
    let transactionsInserted = 0;
    for (const { transaction, postings } of mapped.openingTransactions) {
        const res = insertTx.run(
            transaction.id, transaction.date, transaction.description,
            transaction.idempotency_key ?? `idemp-opening-${transaction.id}`,
            transaction.created_at, transaction.updated_at
        );
        transactionsInserted += res.changes;
        for (const p of postings) {
            insertPosting.run(p.id, p.transaction_id, p.account_id, p.amount_cents, p.currency, p.memo ?? null);
        }
    }

    db.prepare(`
        INSERT INTO settings (key, value) VALUES (?, '"1"')
        ON CONFLICT(key) DO NOTHING
    `).run(LEGACY_BACKFILL_MARKER_KEY);

    return {
        skipped: false,
        assetsMapped: assets.length,
        liabilitiesMapped: liabilities.length,
        accountsInserted,
        transactionsInserted,
    };
}

/**
 * Migration entry point: reads the legacy m0 tables (if present) plus the vault's
 * settings/profile context (base currency, owner name) and maps everything into the
 * ledger. No-op when the legacy tables do not exist (fresh vaults).
 */
export function backfillLegacyLedgerFromTables(
    db: Database.Database,
    opts: { asOfDate?: string } = {}
): LegacyBackfillResult {
    if (!tableExists(db, 'assets') && !tableExists(db, 'liabilities')) {
        return { skipped: true, reason: 'no_legacy_tables', ...EMPTY_RESULT };
    }

    const assets = tableExists(db, 'assets')
        ? (db.prepare('SELECT * FROM assets').all() as LegacyAsset[])
        : [];
    const liabilities = tableExists(db, 'liabilities')
        ? (db.prepare('SELECT * FROM liabilities').all() as LegacyLiability[])
        : [];

    let settings: Record<string, any> | undefined;
    try {
        const row = db.prepare("SELECT value FROM settings WHERE key = 'userSettings'").get() as { value: string } | undefined;
        if (row?.value) settings = JSON.parse(row.value);
    } catch {
        // Corrupt kv value — the mapper falls back to USD.
    }
    let profile: { id?: string; full_name?: string; currency_code?: string } | undefined;
    try {
        profile = db.prepare("SELECT id, full_name, currency_code FROM profiles WHERE id = 'local_user'").get() as any;
    } catch {
        // profiles table shape drift — mapper defaults apply.
    }

    return backfillLegacyLedgerFromPayload(db, { assets, liabilities, settings, profile }, opts);
}
