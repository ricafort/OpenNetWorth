/**
 * Milestone 1 Non-Destructive Legacy Migration Mapping
 * 
 * Why this file exists:
 * Provides deterministic, pure mapping functions that transform legacy Milestone 0 records
 * (assets, liabilities, settings, snapshots) into Milestone 1 double-entry accounts,
 * entities, and balanced opening equity transactions.
 * 
 * Tricky logic:
 * - In accordance with M1-MIG-01 and M1-MIG-02:
 *   - Legacy asset and liability balances map to dated opening balances with an explicit
 *     `Opening Balance Equity` counterpart.
 *   - Monthly cash flow summaries and recurring commitments are preserved as metadata
 *     and MUST NOT be fabricated into artificial historical journal transactions.
 *   - All currency arithmetic uses exact integer minor units (cents).
 *   - Mapping is idempotent: Running multiple times with identical inputs produces
 *     identical account IDs and identical transaction structures.
 * 
 * TODO: Add interactive UI preview for proposed account names before committing migration in Slice 1F.
 */

import { Account, AccountSubType, Entity, Posting, Transaction, parseToCents } from './types';

export interface LegacyAsset {
    id: string;
    user_id?: string;
    name: string;
    type: string;
    value: number;
    is_liquid?: boolean;
    currency?: string;
    interest_rate?: number;
    investment_details?: string;
    last_updated?: string;
}

export interface LegacyLiability {
    id: string;
    user_id?: string;
    name: string;
    type: string;
    balance: number;
    interest_rate?: number;
    minimum_payment?: number;
    is_good_debt?: boolean;
    currency?: string;
    last_updated?: string;
}

export interface LegacyDataPayload {
    assets?: LegacyAsset[];
    liabilities?: LegacyLiability[];
    settings?: Record<string, any>;
    profile?: { id?: string; full_name?: string; currency_code?: string };
}

export interface MigrationAuditSummary {
    entity_name: string;
    base_currency: string;
    total_asset_accounts: number;
    total_liability_accounts: number;
    total_assets_cents: Record<string, number>; // Currency -> Cents
    total_liabilities_cents: Record<string, number>;
    net_worth_cents: Record<string, number>;
    unmapped_records_count: number;
}

export interface MappedAccountingState {
    entity: Entity;
    openingEquityAccount: Account;
    accounts: Account[];
    openingTransactions: {
        transaction: Transaction;
        postings: Posting[];
    }[];
    auditSummary: MigrationAuditSummary;
}

/**
 * Maps legacy asset type strings to valid AccountSubType values.
 */
function mapAssetSubType(legacyType: string): AccountSubType {
    const map: Record<string, AccountSubType> = {
        cash: 'checking',
        checking: 'checking',
        savings: 'savings',
        investment: 'brokerage',
        crypto: 'brokerage',
        property: 'property',
        vehicle: 'vehicle',
        precious_metals: 'other',
        other: 'other'
    };
    return map[legacyType.toLowerCase()] || 'other';
}

/**
 * Maps legacy liability type strings to valid AccountSubType values.
 */
function mapLiabilitySubType(legacyType: string): AccountSubType {
    const map: Record<string, AccountSubType> = {
        mortgage: 'mortgage',
        credit_card: 'credit_card',
        auto_loan: 'auto_loan',
        student_loan: 'personal_loan',
        personal_loan: 'personal_loan',
        other: 'other'
    };
    return map[legacyType.toLowerCase()] || 'other';
}

/**
 * Deterministically maps legacy data into Milestone 1 entities, accounts, and opening balance transactions.
 */
export function mapLegacyDataToMilestone1(
    legacy: LegacyDataPayload,
    asOfDate: string = new Date().toISOString().split('T')[0]
): MappedAccountingState {
    const baseCurrency = (legacy.profile?.currency_code || legacy.settings?.baseCurrency || 'USD').toUpperCase();
    const entityId = 'entity-default-vault-owner';
    const equityAccountId = 'account-opening-balance-equity';

    const entity: Entity = {
        id: entityId,
        name: legacy.profile?.full_name || 'Vault Owner',
        type: 'person',
        currency: baseCurrency,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
    };

    const openingEquityAccount: Account = {
        id: equityAccountId,
        entity_id: entityId,
        name: 'Opening Balance Equity',
        type: 'equity',
        sub_type: 'opening_balance_equity',
        currency: baseCurrency,
        is_active: true,
        revision: 1,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
    };

    const accounts: Account[] = [openingEquityAccount];
    const openingTransactions: { transaction: Transaction; postings: Posting[] }[] = [];

    const totalAssetsByCurrency: Record<string, number> = {};
    const totalLiabilitiesByCurrency: Record<string, number> = {};

    // 1. Map Assets
    const legacyAssets = legacy.assets || [];
    for (const asset of legacyAssets) {
        const currency = (asset.currency || baseCurrency).toUpperCase();
        const valueCents = parseToCents(asset.value, currency);

        const accountId = `account-asset-${asset.id}`;
        const account: Account = {
            id: accountId,
            entity_id: entityId,
            name: asset.name,
            type: 'asset',
            sub_type: mapAssetSubType(asset.type),
            currency,
            is_active: true,
            opening_date: asOfDate,
            opening_balance_cents: valueCents,
            revision: 1,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
        };
        accounts.push(account);

        totalAssetsByCurrency[currency] = (totalAssetsByCurrency[currency] || 0) + valueCents;

        // Balanced opening entry: Debit Asset (+), Credit Opening Balance Equity (-)
        if (valueCents > 0) {
            const txId = `tx-opening-asset-${asset.id}`;
            const tx: Transaction = {
                id: txId,
                date: asOfDate,
                description: `Opening Balance for ${asset.name}`,
                status: 'posted',
                origin: 'opening_balance',
                idempotency_key: `idemp-opening-${asset.id}`,
                revision: 1,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
            };

            const postings: Posting[] = [
                {
                    id: `post-asset-leg-${asset.id}`,
                    transaction_id: txId,
                    account_id: accountId,
                    amount_cents: valueCents, // Debit
                    currency
                },
                {
                    id: `post-equity-leg-${asset.id}`,
                    transaction_id: txId,
                    account_id: equityAccountId,
                    amount_cents: -valueCents, // Credit
                    currency
                }
            ];

            openingTransactions.push({ transaction: tx, postings });
        }
    }

    // 2. Map Liabilities
    const legacyLiabilities = legacy.liabilities || [];
    for (const liability of legacyLiabilities) {
        const currency = (liability.currency || baseCurrency).toUpperCase();
        const balanceCents = parseToCents(liability.balance, currency);

        const accountId = `account-liab-${liability.id}`;
        const account: Account = {
            id: accountId,
            entity_id: entityId,
            name: liability.name,
            type: 'liability',
            sub_type: mapLiabilitySubType(liability.type),
            currency,
            is_active: true,
            opening_date: asOfDate,
            opening_balance_cents: balanceCents,
            revision: 1,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
        };
        accounts.push(account);

        totalLiabilitiesByCurrency[currency] = (totalLiabilitiesByCurrency[currency] || 0) + balanceCents;

        // Balanced opening entry: Credit Liability (-), Debit Opening Balance Equity (+)
        if (balanceCents > 0) {
            const txId = `tx-opening-liab-${liability.id}`;
            const tx: Transaction = {
                id: txId,
                date: asOfDate,
                description: `Opening Balance for ${liability.name}`,
                status: 'posted',
                origin: 'opening_balance',
                idempotency_key: `idemp-opening-${liability.id}`,
                revision: 1,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
            };

            const postings: Posting[] = [
                {
                    id: `post-liab-leg-${liability.id}`,
                    transaction_id: txId,
                    account_id: accountId,
                    amount_cents: -balanceCents, // Credit (increases liability)
                    currency
                },
                {
                    id: `post-equity-leg-${liability.id}`,
                    transaction_id: txId,
                    account_id: equityAccountId,
                    amount_cents: balanceCents, // Debit (reduces equity)
                    currency
                }
            ];

            openingTransactions.push({ transaction: tx, postings });
        }
    }

    // 3. Compute Net Worth per currency
    const allCurrencies = Array.from(new Set([...Object.keys(totalAssetsByCurrency), ...Object.keys(totalLiabilitiesByCurrency)]));
    const netWorthByCurrency: Record<string, number> = {};
    for (const curr of allCurrencies) {
        const a = totalAssetsByCurrency[curr] || 0;
        const l = totalLiabilitiesByCurrency[curr] || 0;
        netWorthByCurrency[curr] = a - l;
    }

    const auditSummary: MigrationAuditSummary = {
        entity_name: entity.name,
        base_currency: baseCurrency,
        total_asset_accounts: legacyAssets.length,
        total_liability_accounts: legacyLiabilities.length,
        total_assets_cents: totalAssetsByCurrency,
        total_liabilities_cents: totalLiabilitiesByCurrency,
        net_worth_cents: netWorthByCurrency,
        unmapped_records_count: 0
    };

    return {
        entity,
        openingEquityAccount,
        accounts,
        openingTransactions,
        auditSummary
    };
}
