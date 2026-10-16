import { Liability, LiabilityType } from '@/features/liabilities/types';
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
 * - Terms (`interest_rate`, `minimum_payment`) live on the account row
 *   (migration 0009); `minimum_payment_cents` follows the ledger cents
 *   convention and is divided back to major units here, like `balance`.
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
        last_updated: row.updated_at,
        interest_rate: row.interest_rate ?? 0,
        minimum_payment: row.minimum_payment_cents != null ? row.minimum_payment_cents / 100 : undefined
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
 * - Demo mode (Phase 2.7) is served by the API routes themselves: the
 *   `demo_persona` cookie makes `/api/accounting` return the persona vault's
 *   ledger.
 * - The old localStorage merge is gone: migration 0006 copied every legacy
 *   row into the ledger, so the ledger list is complete on its own.
 */
export class LocalLiabilityRepository implements ILiabilityRepository {
    async getAll(): Promise<Liability[]> {
        return (await listLedgerAccounts('liability')).map(toLiability);
    }

    async getById(id: string): Promise<Liability | null> {
        const items = await this.getAll();
        return items.find(i => i.id === id) || null;
    }

    async create(item: Liability): Promise<Liability> {
        await createLedgerAccount({
            id: item.id,
            name: item.name,
            type: 'liability',
            sub_type: liabilityTypeToSubType(item.type),
            currency: item.currency || 'AUD',
            balance_cents: Math.round((item.balance || 0) * 100),
            interest_rate: item.interest_rate ?? null,
            minimum_payment_cents: item.minimum_payment != null ? Math.round(item.minimum_payment * 100) : null
        });
        return item;
    }

    async update(item: Liability): Promise<Liability> {
        await updateLedgerAccount({
            id: item.id,
            type: 'liability',
            name: item.name,
            sub_type: liabilityTypeToSubType(item.type),
            balance_cents: Math.round((item.balance || 0) * 100),
            interest_rate: item.interest_rate,
            minimum_payment_cents: item.minimum_payment !== undefined
                ? (item.minimum_payment != null ? Math.round(item.minimum_payment * 100) : null)
                : undefined
        });
        return item;
    }

    async delete(id: string): Promise<void> {
        // Archive instead of hard delete: the ledger must keep its history.
        // In demo mode the route refuses this with 403 (read-only personas).
        await archiveLedgerAccount(id);
    }
}
