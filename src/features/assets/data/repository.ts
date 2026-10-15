import { Asset, AssetType } from '@/features/assets/types';
import { IRepository } from '@/types/repository';
import { CurrencyCode } from '@/types';
import {
    LedgerAccountRow,
    listLedgerAccounts,
    createLedgerAccount,
    updateLedgerAccount,
    archiveLedgerAccount
} from '@/lib/domain/accounting/legacyAccountBridge';

/**
 * Domain-specific Asset Repository Interface.
 */
export interface IAssetRepository extends IRepository<Asset> {
    // Add specific methods here if needed, e.g.:
    // getByClass(assetClass: string): Promise<Asset[]>;
}

const LIQUID_SUB_TYPES = ['cash', 'checking', 'savings'];

/** Maps an m1 asset sub_type onto the legacy AssetType shown by the widgets. */
function subTypeToAssetType(subType: string): AssetType {
    if (LIQUID_SUB_TYPES.includes(subType)) return 'cash';
    if (subType === 'brokerage' || subType === 'investment') return 'investment';
    if (subType === 'crypto') return 'crypto';
    if (subType === 'property' || subType === 'real_estate' || subType === 'land') return 'real_estate';
    if (subType === 'retirement' || subType === 'superannuation' || subType === 'pension') return 'retirement';
    if (subType === 'vehicle') return 'vehicle';
    return 'other';
}

/** Maps the legacy AssetType picker onto an m1 asset sub_type. */
function assetTypeToSubType(type?: AssetType): string {
    switch (type) {
        case 'cash': return 'cash';
        case 'investment': return 'investment';
        case 'crypto': return 'crypto';
        case 'real_estate': return 'property';
        case 'retirement': return 'retirement';
        case 'vehicle': return 'vehicle';
        default: return 'other';
    }
}

/**
 * Maps a ledger asset account onto the legacy Asset shape.
 *
 * - `account_id` is set to the account id itself: the pages dedupe their
 *   "unlinked legacy" section by `account_id ∈ authoritativeAccountIds`, so
 *   ledger-backed rows never double-display.
 * - Unknown balances map to 0, matching the summary's "known totals"
 *   semantics; unrecorded accounts are surfaced separately by
 *   `useSharedFinancialSummary`.
 * - `investment_details` has no `accounts` column yet; consumers already
 *   handle its absence (flagged as a follow-up feature gap).
 */
function toAsset(row: LedgerAccountRow): Asset {
    return {
        id: row.id,
        user_id: 'local_user',
        name: row.name,
        type: subTypeToAssetType(row.sub_type),
        value: row.is_unknown ? 0 : row.balance_cents / 100,
        // accounting/types widens CurrencyCode with `| string`; narrow back.
        currency: row.currency as CurrencyCode,
        is_liquid: LIQUID_SUB_TYPES.includes(row.sub_type),
        account_id: row.id,
        last_updated: row.updated_at
    };
}

/**
 * Local Asset Repository (DATA-01, DATA-04, DATA-05).
 *
 * Why this exists:
 * The double-entry ledger is the single source of truth for real holdings:
 * reads list `type='asset'` accounts from `/api/accounting`, and writes
 * create/update/archive ledger accounts through the shared bridge. The
 * retired m0 `assets` table is no longer read or written.
 *
 * Tricky logic:
 * - Demo mode (Phase 2.7) is served by the API routes themselves: the
 *   `demo_persona` cookie makes `/api/accounting` return the persona vault's
 *   ledger.
 * - The old localStorage merge is gone: migration 0006 copied every legacy
 *   row into the ledger, so the ledger list is complete on its own.
 */
export class LocalAssetRepository implements IAssetRepository {
    async getAll(): Promise<Asset[]> {
        return (await listLedgerAccounts('asset')).map(toAsset);
    }

    async getById(id: string): Promise<Asset | null> {
        const items = await this.getAll();
        return items.find(i => i.id === id) || null;
    }

    async create(item: Asset): Promise<Asset> {
        await createLedgerAccount({
            id: item.id,
            name: item.name,
            type: 'asset',
            sub_type: assetTypeToSubType(item.type),
            currency: item.currency || 'AUD',
            balance_cents: Math.round((item.value || 0) * 100)
        });
        return item;
    }

    async update(item: Asset): Promise<Asset> {
        await updateLedgerAccount({
            id: item.id,
            type: 'asset',
            name: item.name,
            sub_type: assetTypeToSubType(item.type),
            balance_cents: Math.round((item.value || 0) * 100)
        });
        return item;
    }

    async delete(id: string): Promise<void> {
        // Archive instead of hard delete: the ledger must keep its history.
        // In demo mode the route refuses this with 403 (read-only personas).
        await archiveLedgerAccount(id);
    }
}
