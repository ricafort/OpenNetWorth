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

export interface CategoryBreakdownItem {
    account_id: string;
    account_name: string;
    type: 'income' | 'expense';
    sub_type: string;
    currency: CurrencyCode;
    total_cents: number;
    formatted_total: string;
    transaction_count: number;
}

export interface PeriodIncomeExpenseResult {
    entity_id: string;
    start_date?: string;
    end_date?: string;
    total_income_cents_by_currency: Record<CurrencyCode, number>;
    total_expenses_cents_by_currency: Record<CurrencyCode, number>;
    net_savings_cents_by_currency: Record<CurrencyCode, number>;
    formatted_income_by_currency: Record<CurrencyCode, string>;
    formatted_expenses_by_currency: Record<CurrencyCode, string>;
    formatted_net_savings_by_currency: Record<CurrencyCode, string>;
    breakdown_by_category: CategoryBreakdownItem[];
    calculation_version: string;
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
    // Tricky logic: Normalize -0 to 0 in JavaScript arithmetic
    const isDebitNormal = account.type === 'asset' || account.type === 'expense';
    const rawBalance = isDebitNormal ? netDebitCredits : -netDebitCredits;
    const balanceCents = rawBalance === 0 ? 0 : rawBalance;

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

/**
 * Calculates total income, total expenses, net savings, and category breakdowns for an entity over a date range.
 * 
 * Why this exists:
 * Implements M1-FLOW-02, M1-CALC-01, and Acceptance Scenario T2.
 * Directly aggregates posted journal entries for income and expense accounts.
 * Transfers (asset-to-asset) and credit card repayments (asset-to-liability)
 * do not involve income or expense accounts, naturally yielding $0.00 in income and expenses (T3, T4).
 * 
 * Tricky logic:
 * - Income accounts are Credit-normal: postings have negative amount_cents, so total = -Sum(amount_cents).
 * - Expense accounts are Debit-normal: postings have positive amount_cents, so total = Sum(amount_cents).
 * - Net savings = total_income - total_expenses.
 * - Unlike currencies are never aggregated together; totals are keyed by CurrencyCode.
 */
export function getPeriodIncomeAndExpenses(
    db: Database.Database,
    entityId: string,
    startDate?: string,
    endDate?: string
): PeriodIncomeExpenseResult {
    let sql = `
        SELECT 
            j.amount_cents,
            j.currency,
            a.id as account_id,
            a.name as account_name,
            a.type as account_type,
            a.sub_type,
            t.id as transaction_id,
            t.date
        FROM m1_journal_entries j
        JOIN m1_accounts a ON j.account_id = a.id
        JOIN m1_transactions t ON j.transaction_id = t.id
        WHERE a.entity_id = ? AND a.type IN ('income', 'expense') AND t.status = 'posted'
    `;
    const params: any[] = [entityId];

    if (startDate) {
        sql += ' AND t.date >= ?';
        params.push(startDate);
    }
    if (endDate) {
        sql += ' AND t.date <= ?';
        params.push(endDate);
    }

    sql += ' ORDER BY t.date ASC';

    const rows = db.prepare(sql).all(...params) as Array<{
        amount_cents: number;
        currency: string;
        account_id: string;
        account_name: string;
        account_type: 'income' | 'expense';
        sub_type: string;
        transaction_id: string;
        date: string;
    }>;

    const totalIncome: Record<CurrencyCode, number> = {};
    const totalExpenses: Record<CurrencyCode, number> = {};
    const categoryMap = new Map<string, {
        account_id: string;
        account_name: string;
        type: 'income' | 'expense';
        sub_type: string;
        currency: CurrencyCode;
        total_cents: number;
        transaction_count: number;
    }>();

    for (const r of rows) {
        const curr = r.currency.toUpperCase();
        const isIncome = r.account_type === 'income';

        // Credit-normal vs Debit-normal
        // Income postings: negative cents -> positive income
        // Expense postings: positive cents -> positive expense
        const rawMag = isIncome ? -r.amount_cents : r.amount_cents;
        const magnitudeCents = rawMag === 0 ? 0 : rawMag;

        if (isIncome) {
            totalIncome[curr] = (totalIncome[curr] || 0) + magnitudeCents;
        } else {
            totalExpenses[curr] = (totalExpenses[curr] || 0) + magnitudeCents;
        }

        const catKey = `${r.account_id}`;
        if (!categoryMap.has(catKey)) {
            categoryMap.set(catKey, {
                account_id: r.account_id,
                account_name: r.account_name,
                type: r.account_type,
                sub_type: r.sub_type,
                currency: curr,
                total_cents: 0,
                transaction_count: 0
            });
        }
        const item = categoryMap.get(catKey)!;
        item.total_cents += magnitudeCents;
        item.transaction_count += 1;
    }

    const allCurrencies = Array.from(new Set([...Object.keys(totalIncome), ...Object.keys(totalExpenses)]));
    const netSavings: Record<CurrencyCode, number> = {};
    const formattedIncome: Record<CurrencyCode, string> = {};
    const formattedExpenses: Record<CurrencyCode, string> = {};
    const formattedSavings: Record<CurrencyCode, string> = {};

    for (const curr of allCurrencies) {
        const inc = totalIncome[curr] || 0;
        const exp = totalExpenses[curr] || 0;
        const rawSav = inc - exp;
        const sav = rawSav === 0 ? 0 : rawSav;
        netSavings[curr] = sav;
        formattedIncome[curr] = formatMoney({ amount_cents: inc, currency: curr });
        formattedExpenses[curr] = formatMoney({ amount_cents: exp, currency: curr });
        formattedSavings[curr] = formatMoney({ amount_cents: sav, currency: curr });
    }

    const breakdown: CategoryBreakdownItem[] = Array.from(categoryMap.values()).map(cat => ({
        account_id: cat.account_id,
        account_name: cat.account_name,
        type: cat.type,
        sub_type: cat.sub_type,
        currency: cat.currency,
        total_cents: cat.total_cents,
        formatted_total: formatMoney({ amount_cents: cat.total_cents, currency: cat.currency }),
        transaction_count: cat.transaction_count
    }));

    return {
        entity_id: entityId,
        start_date: startDate,
        end_date: endDate,
        total_income_cents_by_currency: totalIncome,
        total_expenses_cents_by_currency: totalExpenses,
        net_savings_cents_by_currency: netSavings,
        formatted_income_by_currency: formattedIncome,
        formatted_expenses_by_currency: formattedExpenses,
        formatted_net_savings_by_currency: formattedSavings,
        breakdown_by_category: breakdown,
        calculation_version: CALCULATION_ENGINE_VERSION
    };
}

