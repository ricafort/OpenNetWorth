/**
 * Milestone 1 Deterministic Financial Calculation Service
 * 
 * Why this file exists:
 * Implements M1-CALC-01, M1-CALC-02, and M1-CALC-03.
 * Provides the shared, deterministic balance and net worth calculation engine used identically
 * by UI screens, reports, API endpoints, and future AI mentor tools.
 * 
 * Tricky logic:
 * - Calculates balance as of a date by summing all journal entries up to `asOfDate` (inclusive).
 * - Applies accounting normal balance rules:
 *   * For Assets and Expenses (Debit-normal): Balance = Sum(Debits) - Sum(Credits) = Sum(amount_cents).
 *   * For Liabilities, Equity, and Income (Credit-normal): Balance = Sum(Credits) - Sum(Debits) = -Sum(amount_cents).
 * - Multi-currency totals are grouped strictly by currency. Unlike currencies are NEVER added
 *   directly or assumed 1:1 without explicit dated exchange rates (M1-CALC-03).
 * 
 * TODO: Add dated exchange rate lookups and currency conversion in Slice 1D.
 */

import Database from 'better-sqlite3';
import { CurrencyCode, Money, formatMoney } from './types';

export interface AccountBalanceResult {
    account_id: string;
    account_name: string;
    account_type: string;
    currency: CurrencyCode;
    balance_cents: number; // Signed integer minor unit
    formatted_balance: string;
    as_of_date: string;
    calculation_version: string;
    contributor_count: number;
}

export interface EntityNetWorthResult {
    entity_id: string;
    as_of_date: string;
    net_worth_cents_by_currency: Record<CurrencyCode, number>;
    total_assets_cents_by_currency: Record<CurrencyCode, number>;
    total_liabilities_cents_by_currency: Record<CurrencyCode, number>;
    formatted_net_worth_by_currency: Record<CurrencyCode, string>;
    calculation_version: string;
    account_count: number;
}

export const CALCULATION_ENGINE_VERSION = '1.0.0';

/**
 * Calculates the exact balance of a single financial account as of an optional date.
 */
export function getAccountBalance(
    db: Database.Database,
    accountId: string,
    asOfDate?: string
): AccountBalanceResult {
    const account = db.prepare('SELECT * FROM m1_accounts WHERE id = ?').get(accountId) as any;
    if (!account) {
        throw new Error(`Account not found with ID: ${accountId}`);
    }

    const effectiveDate = asOfDate || new Date().toISOString().split('T')[0];

    // Query all journal postings up to asOfDate via join to transactions
    const rows = db.prepare(`
        SELECT j.amount_cents, j.currency, t.date
        FROM m1_journal_entries j
        JOIN m1_transactions t ON j.transaction_id = t.id
        WHERE j.account_id = ? AND t.date <= ? AND t.status = 'posted'
        ORDER BY t.date ASC
    `).all(accountId, effectiveDate) as { amount_cents: number; currency: string; date: string }[];

    let netDebitCredits = 0;
    for (const r of rows) {
        netDebitCredits += r.amount_cents;
    }

    // Normal balance rule:
    // Assets & Expenses: positive debit increases balance -> balance = netDebitCredits
    // Liabilities, Equity, Income: positive credit increases balance -> balance = -netDebitCredits
    const isDebitNormal = account.type === 'asset' || account.type === 'expense';
    const balanceCents = isDebitNormal ? netDebitCredits : -netDebitCredits;

    const money: Money = { amount_cents: balanceCents, currency: account.currency };

    return {
        account_id: account.id,
        account_name: account.name,
        account_type: account.type,
        currency: account.currency,
        balance_cents: balanceCents,
        formatted_balance: formatMoney(money),
        as_of_date: effectiveDate,
        calculation_version: CALCULATION_ENGINE_VERSION,
        contributor_count: rows.length
    };
}

/**
 * Calculates the exact net worth of an entity as of an optional date.
 * 
 * Why this exists:
 * Guarantees that personal net worth reflects the deterministic formula:
 * Net Worth = Total Assets - Total Liabilities.
 * Currencies are kept strictly distinct (no silent 1:1 conversion).
 */
export function getEntityNetWorth(
    db: Database.Database,
    entityId: string,
    asOfDate?: string
): EntityNetWorthResult {
    const effectiveDate = asOfDate || new Date().toISOString().split('T')[0];

    // Fetch all active accounts for entity
    const accounts = db.prepare(`
        SELECT id, name, type, currency
        FROM m1_accounts
        WHERE entity_id = ? AND is_active = 1
    `).all(entityId) as { id: string; name: string; type: string; currency: string }[];

    const totalAssets: Record<CurrencyCode, number> = {};
    const totalLiabilities: Record<CurrencyCode, number> = {};

    for (const acc of accounts) {
        if (acc.type !== 'asset' && acc.type !== 'liability') {
            continue; // Equity, Income, Expense accounts do not count as balance sheet balance items
        }

        const bal = getAccountBalance(db, acc.id, effectiveDate);
        const curr = acc.currency.toUpperCase();

        if (acc.type === 'asset') {
            totalAssets[curr] = (totalAssets[curr] || 0) + bal.balance_cents;
        } else if (acc.type === 'liability') {
            totalLiabilities[curr] = (totalLiabilities[curr] || 0) + bal.balance_cents;
        }
    }

    const allCurrencies = Array.from(new Set([...Object.keys(totalAssets), ...Object.keys(totalLiabilities)]));
    const netWorthCents: Record<CurrencyCode, number> = {};
    const formattedNetWorth: Record<CurrencyCode, string> = {};

    for (const curr of allCurrencies) {
        const a = totalAssets[curr] || 0;
        const l = totalLiabilities[curr] || 0;
        const nw = a - l;
        netWorthCents[curr] = nw;
        formattedNetWorth[curr] = formatMoney({ amount_cents: nw, currency: curr });
    }

    return {
        entity_id: entityId,
        as_of_date: effectiveDate,
        net_worth_cents_by_currency: netWorthCents,
        total_assets_cents_by_currency: totalAssets,
        total_liabilities_cents_by_currency: totalLiabilities,
        formatted_net_worth_by_currency: formattedNetWorth,
        calculation_version: CALCULATION_ENGINE_VERSION,
        account_count: accounts.length
    };
}
