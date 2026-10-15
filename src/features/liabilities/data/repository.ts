import { Liability, LiabilityType } from '@/features/liabilities/types';
import { IRepository } from '@/types/repository';
import { CurrencyCode } from '@/types';
import { loadLiabilities, persistScopedRecord, deleteScopedRecord } from '@/infrastructure/local_driver';
import {
    LedgerAccountRow,
    listLedgerAccounts,
    createLedgerAccount,
    updateLedgerAccount,
    archiveLedgerAccount
} from '@/lib/domain/accounting/legacyAccountBridge';

/**
 * Domain-specific Liability Repository Interface.
 */
export interface ILiabilityRepository extends IRepository<Liability> {
    // Add specific methods here if needed
}

/** Maps an m1 liability sub_type onto the legacy LiabilityType shown by the widgets. */
function subTypeToLiabilityType(subType: string): LiabilityType {
    if (subType === 'mortgage') return 'mortgage';
    if (subType === 'auto_loan') return 'auto_loan';
    if (subType === 'credit_card') return 'credit_card';
    return 'other';
}

/** Maps the legacy LiabilityType picker onto an m1 liability sub_type. */
function liabilityTypeToSubType(type?: LiabilityType): string {
    switch (type) {
        case 'mortgage': return 'mortgage';
        case 'auto_loan': return 'auto_loan';
        case 'credit_card': return 'credit_card';
        // m1 has no student_loan sub_type; personal_loan is the closest fit.
        case 'student_loan': return 'personal_loan';
        default: return 'other';
    }
}

/**
 * Maps a ledger liability account onto the legacy Liability shape.
 *
 * - Liability balances are credit-normal in the ledger: positive cents =
 *   owed, which matches the legacy `balance` semantics directly.
 * - `account_id` is set to the account id itself so the pages' "unlinked
 *   legacy" dedupe collapses ledger-backed rows out of the legacy section.
 * - Unknown balances map to 0, matching the summary's "known totals".
 * - `interest_rate`/`minimum_payment` have no `m1_accounts` columns yet;
 *   consumers already handle missing terms ("Repayment details needed").
 *   Flagged as a follow-up feature gap.
 */
function toLiability(row: LedgerAccountRow): Liability {
    return {
        id: row.id,
        user_id: 'local_user',
        name: row.name,
        type: subTypeToLiabilityType(row.sub_type),
        balance: row.is_unknown ? 0 : row.balance_cents / 100,
        // accounting/types widens CurrencyCode with `| string`; narrow back.
        currency: row.currency as CurrencyCode,
        is_good_debt: row.sub_type === 'mortgage',
        account_id: row.id,
        last_updated: row.updated_at
    } as Liability;
}

/**
 * Local Liability Repository (DATA-01, DATA-04, DATA-05).
 *
 * Why this exists:
 * The double-entry ledger is the single source of truth for real debts:
 * reads list `type='liability'` accounts from `/api/accounting`, and writes
 * create/update/archive ledger accounts through the shared bridge. The
 * retired m0 `liabilities` table is no longer read or written.
 *
 * Tricky logic:
 * - Demo mode (templateId set) still reads localStorage persona rows until
 *   the demo-vault rewrite; it must never fall through to the ledger path,
 *   which would leak real vault data into the demo view.
 * - Non-demo reads also merge leftover localStorage `local_user` rows the
 *   ledger does not contain, so nothing silently disappears before the
 *   Phase 3 backfill; the pages render those as "unlinked legacy".
 */
export class LocalLiabilityRepository implements ILiabilityRepository {
    constructor(private templateId?: string | null) { }

    async getAll(): Promise<Liability[]> {
        if (this.templateId) {
            // Demo mode: localStorage persona data (demoMode seeds user_id 'local_user').
            return loadLiabilities().filter(l =>
                l.user_id === this.templateId || l.user_id === 'local_user' || !l.user_id);
        }

        const ledgerRows = (await listLedgerAccounts('liability')).map(toLiability);
        const ledgerIds = new Set(ledgerRows.map(r => r.id));
        const localRows = loadLiabilities().filter(l =>
            (l.user_id === 'local_user' || !l.user_id) && !ledgerIds.has(l.id));
        return [...ledgerRows, ...localRows];
    }

    async getById(id: string): Promise<Liability | null> {
        const items = await this.getAll();
        return items.find(i => i.id === id) || null;
    }

    async create(item: Liability): Promise<Liability> {
        if (this.templateId) {
            return await persistScopedRecord<Liability>('liabilities', item);
        }
        await createLedgerAccount({
            id: item.id,
            name: item.name,
            type: 'liability',
            sub_type: liabilityTypeToSubType(item.type),
            currency: item.currency || 'AUD',
            balance_cents: Math.round((item.balance || 0) * 100)
        });
        return item;
    }

    async update(item: Liability): Promise<Liability> {
        if (this.templateId) {
            return await persistScopedRecord<Liability>('liabilities', item);
        }
        await updateLedgerAccount({
            id: item.id,
            type: 'liability',
            name: item.name,
            sub_type: liabilityTypeToSubType(item.type),
            balance_cents: Math.round((item.balance || 0) * 100)
        });
        return item;
    }

    async delete(id: string): Promise<void> {
        if (this.templateId) {
            await deleteScopedRecord('liabilities', id);
            return;
        }
        // Archive instead of hard delete: the ledger must keep its history.
        await archiveLedgerAccount(id);
    }
}
