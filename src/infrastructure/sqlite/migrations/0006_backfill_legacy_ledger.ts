/**
 * Migration 0006 — backfill the retired m0 `assets`/`liabilities` rows into the
 * double-entry ledger.
 *
 * Why this exists:
 * The m0 tables held REAL money rows. Before 0007 drops them, every row must be
 * represented in the accounting core as an account + balanced opening-balance
 * journal entry pair. The mapping lives in the shared `legacyBackfill` module so
 * bulk_restore of OLD backup archives (where the tables no longer exist) uses
 * identical semantics from JSON arrays.
 *
 * Tricky logic:
 * - No-op on fresh vaults (legacy tables absent) and on vaults whose rows were
 *   already mapped (per-row skip by mapped account id + settings-kv marker).
 * - The runner wraps `up()` in a transaction; the backfill module never opens one.
 */

import Database from 'better-sqlite3';
import { backfillLegacyLedgerFromTables } from '../../../lib/domain/accounting/legacyBackfill';

export function up(db: Database.Database): void {
    const result = backfillLegacyLedgerFromTables(db);
    if (result.skipped) {
        return; // no_legacy_tables / no_rows / all_already_mapped
    }
    console.log(
        `[sqlite] 0006 legacy backfill: ${result.assetsMapped} assets + ` +
        `${result.liabilitiesMapped} liabilities mapped → ${result.accountsInserted} accounts, ` +
        `${result.transactionsInserted} opening transactions`
    );
}
