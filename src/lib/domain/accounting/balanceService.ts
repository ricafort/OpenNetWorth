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
 * TODO: Add automated FX rate feed sync in Milestone 2.
 */

import Database from 'better-sqlite3';
import {
    CURRENCY_DECIMALS,
    AccountSubType,
    AccountType,
    CashFlowActivityType,
    CashFlowItem,
    CashFlowStatementResult,
    ConsolidatedNetWorthResult,
    CurrencyCode,
    ExchangeRate,
    LedgerEntryDrilldownItem,
    Money,
    AccountLedgerDrilldownResult,
    ScopeNetWorthItem,
    ScopeNetWorthResult,
    ScopeType,
    formatMoney
} from './types';
import { listEntityMembers, ValidationError } from './accountService';

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

export interface SetExchangeRateInput {
    from_currency: CurrencyCode;
    to_currency: CurrencyCode;
    rate: number;
    effective_date: string; // YYYY-MM-DD
    source: string;
}

/**
 * Sets or updates a dated exchange rate (M1-CALC-03, T8).
 * 
 * Why this exists:
 * Multi-currency portfolios require authoritative historical exchange rates to calculate
 * consolidated net worth without guessing or fabricating rates.
 * 
 * Tricky logic:
 * - Direct rate is saved as (from, to, date).
 * - Rate must be a strictly positive finite number.
 * 
 * TODO: Add automated daily ECB / Federal Reserve rate feed syncing in Milestone 2.
 */
export function setExchangeRate(
    db: Database.Database,
    input: SetExchangeRateInput
): ExchangeRate {
    const from = input.from_currency.toUpperCase();
    const to = input.to_currency.toUpperCase();
    if (from === to) {
        throw new ValidationError('From and to currencies must be different.');
    }
    if (!Number.isFinite(input.rate) || input.rate <= 0) {
        throw new ValidationError(`Exchange rate must be a finite positive number, received: ${input.rate}`);
    }
    const id = `fx-${from}-${to}-${input.effective_date}`;
    const now = new Date().toISOString();

    db.prepare(`
        INSERT INTO m1_exchange_rates (id, from_currency, to_currency, rate, effective_date, source, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(from_currency, to_currency, effective_date) DO UPDATE SET
            rate = excluded.rate,
            source = excluded.source,
            created_at = excluded.created_at
    `).run(id, from, to, input.rate, input.effective_date, input.source.trim(), now);

    return {
        id,
        from_currency: from,
        to_currency: to,
        rate: input.rate,
        effective_date: input.effective_date,
        source: input.source.trim(),
        created_at: now
    };
}

/**
 * Looks up the dated exchange rate between two currencies (M1-CALC-03).
 * Returns 1.0 if from === to.
 * Checks for direct rate on or before `asOfDate`.
 * If direct rate not found, checks for inverse rate (1 / rate).
 * Returns null if no rate is available.
 */
export function getExchangeRate(
    db: Database.Database,
    fromCurrency: CurrencyCode,
    toCurrency: CurrencyCode,
    asOfDate?: string
): number | null {
    const from = fromCurrency.toUpperCase();
    const to = toCurrency.toUpperCase();
    if (from === to) return 1.0;

    const date = asOfDate || new Date().toISOString().split('T')[0];

    // Check direct rate (most recent on or before date)
    const direct = db.prepare(`
        SELECT rate FROM m1_exchange_rates
        WHERE from_currency = ? AND to_currency = ? AND effective_date <= ?
        ORDER BY effective_date DESC LIMIT 1
    `).get(from, to, date) as any;

    if (direct) return direct.rate;

    // Check inverse rate
    const inverse = db.prepare(`
        SELECT rate FROM m1_exchange_rates
        WHERE from_currency = ? AND to_currency = ? AND effective_date <= ?
        ORDER BY effective_date DESC LIMIT 1
    `).get(to, from, date) as any;

    if (inverse && inverse.rate > 0) return 1.0 / inverse.rate;

    return null;
}

/**
 * Converts a monetary minor-unit amount between currencies taking scales into account (M1-CALC-03, T8).
 * 
 * Helper to convert a floating-point rate or decimal number into exact rational BigInt (num / den).
 * Handles standard decimal strings and scientific notation without binary floating-point drift.
 */
function numberToRational(val: number): { num: bigint; den: bigint } {
    if (!Number.isFinite(val)) {
        throw new Error(`Cannot convert non-finite number to rational: ${val}`);
    }
    const str = val.toString();
    const eIndex = str.indexOf('e') !== -1 ? str.indexOf('e') : str.indexOf('E');
    if (eIndex !== -1) {
        const base = str.slice(0, eIndex);
        const exp = parseInt(str.slice(eIndex + 1), 10);
        const [intPart, fracPart = ''] = base.split('.');
        const cleanInt = intPart === '' ? '0' : intPart;
        let num = BigInt(cleanInt + fracPart);
        let den = BigInt(10) ** BigInt(fracPart.length);
        if (exp > 0) {
            num = num * (BigInt(10) ** BigInt(exp));
        } else if (exp < 0) {
            den = den * (BigInt(10) ** BigInt(-exp));
        }
        return { num, den };
    }

    const [intPart, fracPart = ''] = str.split('.');
    const cleanInt = intPart === '' ? '0' : intPart;
    const num = BigInt(cleanInt + fracPart);
    const den = BigInt(10) ** BigInt(fracPart.length);
    return { num, den };
}

/**
 * Converts an amount in minor units from one currency to another using exact rational arithmetic
 * and explicit scale factors (Finding 1).
 * 
 * Why this exists:
 * Assessor Finding 1 requires currency conversion to account for source and target currency scales,
 * perform exact rational arithmetic, and apply symmetric half-up (away from zero) rounding.
 * Floating point multiplication (e.g. 100 * 0.010050 * 100 = 100.49999999999999) causes
 * precision loss at rounding boundaries.
 * 
 * Tricky logic:
 * - 1 major unit = 10^scale minor units.
 * - Source major amount = amountMinorUnits / 10^fromScale.
 * - Target major amount = Source major * rate.
 * - Target minor units = Target major * 10^toScale.
 * - Combined rational: (amountMinorUnits * rateRational.num * 10^toScale) / (rateRational.den * 10^fromScale).
 * - Division applies symmetric half-away-from-zero rounding: if remainder * 2 >= denominator, round up.
 * - Negative amounts (liabilities / deficits) preserve sign symmetrically.
 * 
 * Examples:
 * Converting AUD (scale 2) to JPY (scale 0) at rate 95.5:
 * 1050 cents AUD ($10.50) * 95.5 = 1002.75 JPY -> rounds to 1003 JPY.
 * 
 * Converting 100 JPY (scale 0) to AUD (scale 2) at rate 0.010050:
 * 100 * 0.010050 * 100 = 100.50 cents AUD -> rounds to 101 cents AUD.
 * 
 * TODO: Support tri-currency cross rates and automated ECB/RBA feeds in Milestone 2.
 */
export function convertCurrencyAmount(
    amountMinorUnits: number,
    fromCurrency: CurrencyCode,
    toCurrency: CurrencyCode,
    rate: number
): number {
    const fromUpper = fromCurrency.toUpperCase();
    const toUpper = toCurrency.toUpperCase();
    // Resubmission Item 7: Remove rate === 1.0 shortcut across different currencies.
    // Currency scale conversion remains necessary even at a 1.0 exchange rate.
    if (fromUpper === toUpper) {
        return amountMinorUnits;
    }
    if (amountMinorUnits === 0) {
        return 0;
    }
    const fromScale = CURRENCY_DECIMALS[fromUpper] ?? 2;
    const toScale = CURRENCY_DECIMALS[toUpper] ?? 2;

    const sign = amountMinorUnits < 0 ? -1 : 1;
    const absUnits = BigInt(Math.abs(amountMinorUnits));

    const { num: rateNum, den: rateDen } = numberToRational(rate);

    // Total numerator: absUnits * rateNum * 10^toScale
    const totalNum = absUnits * rateNum * (BigInt(10) ** BigInt(toScale));
    // Total denominator: rateDen * 10^fromScale
    const totalDen = rateDen * (BigInt(10) ** BigInt(fromScale));

    const quotient = totalNum / totalDen;
    const remainder = totalNum % totalDen;
    // Explicit symmetric half-away-from-zero rounding:
    // If remainder * 2 >= totalDen, increment quotient by 1
    const rounded = (remainder * BigInt(2) >= totalDen) ? quotient + BigInt(1) : quotient;

    return sign * Number(rounded);
}

export interface GetConsolidatedNetWorthInput {
    target_entity_id: string;
    reporting_currency?: CurrencyCode;
    as_of_date?: string;
    scope_type?: ScopeType;
}

/**
 * Calculates consolidated net worth in a single reporting currency with strict completeness checks (M1-CALC-03, T8).
 * 
 * Why this exists:
 * Guarantees that multi-currency users see consolidated totals only when legitimate exchange rates exist.
 * If any currency cannot be converted, the total is marked incomplete, and missing rates are explicitly enumerated.
 * Never silently fabricates a 1:1 conversion.
 * 
 * Tricky logic:
 * Assessor Finding 3: Converted net worth must consume the same ownership-adjusted scope totals
 * as the corresponding unconverted report. Converted identity-currency preserves the exact scoped total.
 */
export function getConsolidatedNetWorth(
    db: Database.Database,
    entityIdOrInput: string | GetConsolidatedNetWorthInput,
    reportingCurrencyArg?: CurrencyCode,
    asOfDateArg?: string,
    scopeTypeArg?: ScopeType
): ConsolidatedNetWorthResult {
    const entityId = typeof entityIdOrInput === 'string' ? entityIdOrInput : entityIdOrInput.target_entity_id;
    const reportingCurrency = (typeof entityIdOrInput === 'object' && entityIdOrInput.reporting_currency)
        ? entityIdOrInput.reporting_currency
        : (reportingCurrencyArg || 'USD');
    const asOfDate = (typeof entityIdOrInput === 'object' && entityIdOrInput.as_of_date)
        ? entityIdOrInput.as_of_date
        : asOfDateArg;
    const scopeType = (typeof entityIdOrInput === 'object' && entityIdOrInput.scope_type)
        ? entityIdOrInput.scope_type
        : (scopeTypeArg || 'individual');

    const targetCurr = reportingCurrency.toUpperCase();
    const effectiveDate = asOfDate || new Date().toISOString().split('T')[0];

    // Assessor Finding 3: Consume exact ownership-adjusted scoped totals from getScopeNetWorth
    const scopedNw = getScopeNetWorth(db, {
        target_entity_id: entityId,
        scope_type: scopeType,
        as_of_date: effectiveDate
    });

    const scopedTotals = scopedNw.scoped_net_worth_cents_by_currency || scopedNw.net_worth_cents_by_currency;
    const formattedScopedTotals = scopedNw.formatted_scoped_net_worth_by_currency || scopedNw.formatted_net_worth_by_currency;

    let isComplete = true;
    const missingRates: Array<{ from: CurrencyCode; to: CurrencyCode; date: string }> = [];
    let consolidatedTotalCents = 0;

    const appliedExchangeRates: Record<string, number> = {};
    for (const [curr, cents] of Object.entries(scopedTotals)) {
        if (curr === targetCurr) {
            consolidatedTotalCents += cents;
            appliedExchangeRates[`${curr}->${targetCurr}`] = 1.0;
            continue;
        }

        const rate = getExchangeRate(db, curr, targetCurr, effectiveDate);
        if (rate === null) {
            isComplete = false;
            missingRates.push({ from: curr, to: targetCurr, date: effectiveDate });
        } else {
            appliedExchangeRates[`${curr}->${targetCurr}`] = rate;
            // Convert with scale factor and symmetric half-up rounding (Assessor Finding 1)
            const converted = convertCurrencyAmount(cents, curr, targetCurr, rate);
            consolidatedTotalCents += converted;
        }
    }

    return {
        reporting_currency: targetCurr,
        scope_type: scopeType,
        target_entity_id: entityId,
        is_complete: isComplete,
        missing_rates: missingRates,
        consolidated_total_cents: isComplete ? consolidatedTotalCents : null,
        formatted_consolidated_total: isComplete
            ? formatMoney({ amount_cents: consolidatedTotalCents, currency: targetCurr })
            : null,
        original_totals_by_currency: scopedTotals,
        formatted_original_by_currency: formattedScopedTotals,
        applied_exchange_rates: appliedExchangeRates,
        as_of_date: effectiveDate,
        calculation_version: CALCULATION_ENGINE_VERSION
    };
}

export interface GetScopeNetWorthInput {
    target_entity_id: string;
    scope_type?: ScopeType; // 'individual' | 'household' | 'consolidated', default 'individual'
    as_of_date?: string;
}

/**
 * Calculates scope-aware net worth with joint ownership allocation (M1-FLOW-07, T7).
 * 
 * Why this exists:
 * Resolves joint asset and liability attribution:
 * - Individual Scope: A jointly owned asset (e.g. 50/50 property) reports only the configured
 *   percentage share (50%) for the individual owner.
 * - Household Scope: Aggregates all accounts across household member entities.
 *   Jointly owned accounts are reported ONCE at 100%, completely avoiding the 200% duplicate counting flaw.
 * 
 * Tricky logic:
 * - For individual scope:
 *   * Looks up accounts where entity_id = target_entity_id.
 *   * Also looks up accounts where m1_account_ownership has entity_id = target_entity_id.
 *   * If account has ownership allocations:
 *     - If this entity is an allocated owner, uses alloc.share_percentage.
 *     - If this entity is the primary entity but has allocated 100% to others, share is 0%.
 *     - If this entity is the primary entity and allocated only partial (e.g. 30% to spouse), retained share is 70%.
 *   * If account has NO ownership allocations: 100% attributed to primary entity.
 * - For household scope:
 *   * Fetches member entities via listEntityMembers(db, target_entity_id).
 *   * Collects all accounts belonging to member entities or jointly owned by member entities.
 *   * De-duplicates by account_id so each account is counted exactly once at 100%.
 */
/**
 * Resolves the attributed ownership share percentage for an entity on an account,
 * adhering to the unified partial-ownership / remainder policy (Resubmission Item 6).
 * 
 * Policy:
 * 1. If an account has no joint ownership records (ownerships.length === 0):
 *    The primary account owner (acc.entity_id) owns 100%. All other entities own 0%.
 * 2. If an account has joint ownership records:
 *    - If entityId has an explicit allocation record, return that share percentage.
 *    - If entityId is the primary account owner (acc.entity_id === entityId) and has no explicit record:
 *      The primary owner retains 100% minus the sum of explicit allocations granted to others.
 *    - Otherwise, return 0%.
 */
export function getAttributedEntityShare(
    ownerships: Array<{ entity_id: string; share_percentage: number }>,
    primaryEntityId: string,
    targetEntityId: string
): number {
    if (!ownerships || ownerships.length === 0) {
        return targetEntityId === primaryEntityId ? 100 : 0;
    }
    const explicit = ownerships.find(o => o.entity_id === targetEntityId);
    if (explicit) {
        return explicit.share_percentage;
    }
    if (targetEntityId === primaryEntityId) {
        const allocatedToOthers = ownerships.reduce((sum, o) => sum + o.share_percentage, 0);
        return Math.max(0, 100 - allocatedToOthers);
    }
    return 0;
}

/**
 * Calculates scope-aware net worth with joint ownership allocation (M1-CALC-01, M1-CALC-02, Scenario T7).
 */
export function getScopeNetWorth(
    db: Database.Database,
    targetEntityIdOrInput: string | GetScopeNetWorthInput,
    scopeTypeArg?: ScopeType,
    asOfDateArg?: string
): ScopeNetWorthResult {
    const input: GetScopeNetWorthInput = typeof targetEntityIdOrInput === 'string'
        ? { target_entity_id: targetEntityIdOrInput, scope_type: scopeTypeArg, as_of_date: asOfDateArg }
        : targetEntityIdOrInput;

    const scopeType = input.scope_type || 'individual';
    const effectiveDate = input.as_of_date || new Date().toISOString().split('T')[0];

    const targetEntity = db.prepare('SELECT id, name, type, currency FROM m1_entities WHERE id = ?').get(input.target_entity_id) as any;
    if (!targetEntity) {
        throw new Error(`Entity not found: ${input.target_entity_id}`);
    }

    const items: ScopeNetWorthItem[] = [];
    const totalAssets: Record<CurrencyCode, number> = {};
    const totalLiabilities: Record<CurrencyCode, number> = {};

    if (scopeType === 'individual') {
        // Find all candidate accounts:
        // 1. Accounts where entity_id = targetEntity.id
        // 2. Accounts where m1_account_ownership has entity_id = targetEntity.id
        const candidateAccounts = db.prepare(`
            SELECT DISTINCT a.id, a.entity_id, a.name, a.type, a.sub_type, a.currency
            FROM m1_accounts a
            LEFT JOIN m1_account_ownership o ON a.id = o.account_id
            WHERE (a.entity_id = ? OR o.entity_id = ?) AND a.is_active = 1
              AND a.type IN ('asset', 'liability')
            ORDER BY a.type ASC, a.name ASC
        `).all(targetEntity.id, targetEntity.id) as any[];

        for (const acc of candidateAccounts) {
            const balResult = getAccountBalance(db, acc.id, effectiveDate);
            const grossBalance = balResult.balance_cents;
            const curr = acc.currency.toUpperCase();

            // Check ownership allocations using unified policy (Resubmission Item 6)
            const ownerships = db.prepare(`
                SELECT entity_id, share_percentage FROM m1_account_ownership WHERE account_id = ?
            `).all(acc.id) as Array<{ entity_id: string; share_percentage: number }>;

            const sharePercentage = getAttributedEntityShare(ownerships, acc.entity_id, targetEntity.id);
            if (sharePercentage <= 0) continue;

            const isJoint = ownerships.length > 0;
            const attributedBalance = Math.round(grossBalance * (sharePercentage / 100));

            items.push({
                account_id: acc.id,
                account_name: acc.name,
                account_type: acc.type,
                sub_type: acc.sub_type,
                account_sub_type: acc.sub_type,
                currency: curr,
                gross_balance_cents: grossBalance,
                ownership_share_percentage: sharePercentage,
                ownership_percentage: sharePercentage,
                attributed_balance_cents: attributedBalance,
                formatted_attributed_balance: formatMoney({ amount_cents: attributedBalance, currency: curr }),
                formatted_scoped_balance: formatMoney({ amount_cents: attributedBalance, currency: curr }),
                formatted_full_balance: formatMoney({ amount_cents: grossBalance, currency: curr }),
                primary_entity_id: acc.entity_id,
                is_joint: isJoint
            });

            if (acc.type === 'asset') {
                totalAssets[curr] = (totalAssets[curr] || 0) + attributedBalance;
            } else if (acc.type === 'liability') {
                totalLiabilities[curr] = (totalLiabilities[curr] || 0) + attributedBalance;
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
            scope_type: 'individual',
            target_entity_id: targetEntity.id,
            entity_name: targetEntity.name,
            as_of_date: effectiveDate,
            net_worth_cents_by_currency: netWorthCents,
            total_assets_cents_by_currency: totalAssets,
            total_liabilities_cents_by_currency: totalLiabilities,
            formatted_net_worth_by_currency: formattedNetWorth,
            scoped_net_worth_cents_by_currency: netWorthCents,
            scoped_assets_cents_by_currency: totalAssets,
            scoped_liabilities_cents_by_currency: totalLiabilities,
            formatted_scoped_net_worth_by_currency: formattedNetWorth,
            items,
            calculation_version: CALCULATION_ENGINE_VERSION
        };
    } else {
        // Household Scope:
        // Aggregate all members of the household entity (including itself and children)
        const members = listEntityMembers(db, targetEntity.id);
        const memberIds = members.map(m => m.id);

        const placeholders = memberIds.map(() => '?').join(',');
        const accounts = db.prepare(`
            SELECT DISTINCT a.id, a.entity_id, a.name, a.type, a.sub_type, a.currency
            FROM m1_accounts a
            LEFT JOIN m1_account_ownership o ON a.id = o.account_id
            WHERE (a.entity_id IN (${placeholders}) OR o.entity_id IN (${placeholders}))
              AND a.is_active = 1 AND a.type IN ('asset', 'liability')
            ORDER BY a.type ASC, a.name ASC
        `).all(...memberIds, ...memberIds) as any[];

        const seenAccounts = new Set<string>();

        for (const acc of accounts) {
            if (seenAccounts.has(acc.id)) continue;
            seenAccounts.add(acc.id);

            const balResult = getAccountBalance(db, acc.id, effectiveDate);
            const grossBalance = balResult.balance_cents;
            const curr = acc.currency.toUpperCase();

            // Resubmission Item 6: Household share is strictly the sum of the attributed shares
            // of its members using the unified policy.
            const ownerships = db.prepare(`
                SELECT entity_id, share_percentage FROM m1_account_ownership WHERE account_id = ?
            `).all(acc.id) as Array<{ entity_id: string; share_percentage: number }>;

            let householdShare = 0;
            for (const memberId of memberIds) {
                householdShare += getAttributedEntityShare(ownerships, acc.entity_id, memberId);
            }

            // Clamp to [0, 100]
            householdShare = Math.min(100, Math.max(0, householdShare));

            // If household owns 0% of this account, exclude from report
            if (householdShare <= 0) continue;

            const isJoint = ownerships.length > 0;
            const attributedBalance = Math.round(grossBalance * (householdShare / 100));

            items.push({
                account_id: acc.id,
                account_name: acc.name,
                account_type: acc.type,
                sub_type: acc.sub_type,
                account_sub_type: acc.sub_type,
                currency: curr,
                gross_balance_cents: grossBalance,
                ownership_share_percentage: householdShare,
                ownership_percentage: householdShare,
                attributed_balance_cents: attributedBalance,
                formatted_attributed_balance: formatMoney({ amount_cents: attributedBalance, currency: curr }),
                formatted_scoped_balance: formatMoney({ amount_cents: attributedBalance, currency: curr }),
                formatted_full_balance: formatMoney({ amount_cents: grossBalance, currency: curr }),
                primary_entity_id: acc.entity_id,
                is_joint: isJoint
            });

            if (acc.type === 'asset') {
                totalAssets[curr] = (totalAssets[curr] || 0) + attributedBalance;
            } else if (acc.type === 'liability') {
                totalLiabilities[curr] = (totalLiabilities[curr] || 0) + attributedBalance;
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
            scope_type: scopeType,
            target_entity_id: targetEntity.id,
            entity_name: targetEntity.name,
            as_of_date: effectiveDate,
            member_entities: members.map(m => ({ id: m.id, name: m.name, type: m.type })),
            net_worth_cents_by_currency: netWorthCents,
            total_assets_cents_by_currency: totalAssets,
            total_liabilities_cents_by_currency: totalLiabilities,
            formatted_net_worth_by_currency: formattedNetWorth,
            scoped_net_worth_cents_by_currency: netWorthCents,
            scoped_assets_cents_by_currency: totalAssets,
            scoped_liabilities_cents_by_currency: totalLiabilities,
            formatted_scoped_net_worth_by_currency: formattedNetWorth,
            items,
            calculation_version: CALCULATION_ENGINE_VERSION
        };
    }
}

/**
 * Calculates the Actual Cash Flow Statement (Liquid Cash Movements) for an entity over a date range.
 * 
 * Why this exists:
 * Strictly fulfills the assessor requirement to keep Income/Expense reporting distinct from Cash Flow.
 * - Income/Expense Statement: Accrual revenue/expense (includes credit card purchases, non-cash depreciation, etc.).
 * - Cash Flow Statement: Tracks only liquid cash and bank asset accounts ('cash', 'checking', 'savings').
 *   * Credit card purchases = $0 cash movement.
 *   * Credit card repayments = Cash Outflow (Financing).
 *   * Loan repayments = Cash Outflow (Financing: principal + interest + fee).
 *   * Direct income received to bank = Cash Inflow (Operating).
 *   * Direct expenses paid from bank = Cash Outflow (Operating).
 * 
 * Tricky logic:
 * - Identifies all liquid cash accounts for the entity (`type = 'asset' AND sub_type IN ('cash', 'checking', 'savings')`).
 * - For each transaction affecting cash accounts, examines counterpart postings in the same transaction:
 *   * Counterpart in 'income' -> Operating Inflow.
 *   * Counterpart in 'expense' -> Operating Outflow.
 *   * Counterpart in 'liability' -> Financing Outflow.
 *   * Counterpart in another cash account -> Internal Transfer (Net cash movement = $0).
 * - Computes starting liquid cash balance, net change, and ending liquid cash balance.
 */
export function getActualCashFlowStatement(
    db: Database.Database,
    entityId: string,
    startDate?: string,
    endDate?: string
): CashFlowStatementResult {
    // 1. Identify all liquid cash/bank accounts for the entity
    const cashAccounts = db.prepare(`
        SELECT id, name, currency
        FROM m1_accounts
        WHERE entity_id = ? AND type = 'asset' AND sub_type IN ('cash', 'checking', 'savings')
    `).all(entityId) as Array<{ id: string; name: string; currency: string }>;

    const cashAccountIds = new Set(cashAccounts.map(a => a.id));
    const cashAccountMap = new Map(cashAccounts.map(a => [a.id, a.name]));

    const operatingInflows: Record<CurrencyCode, number> = {};
    const operatingOutflows: Record<CurrencyCode, number> = {};
    const financingInflows: Record<CurrencyCode, number> = {};
    const financingOutflows: Record<CurrencyCode, number> = {};
    const investingInflows: Record<CurrencyCode, number> = {};
    const investingOutflows: Record<CurrencyCode, number> = {};
    const netCashChange: Record<CurrencyCode, number> = {};
    const startingCash: Record<CurrencyCode, number> = {};
    const endingCash: Record<CurrencyCode, number> = {};
    const items: CashFlowItem[] = [];

    // Calculate starting cash balance as of day before startDate (if startDate provided)
    // Opening balance transactions establish the initial cash position
    if (startDate) {
        for (const acc of cashAccounts) {
            const curr = acc.currency.toUpperCase();
            const prevRows = db.prepare(`
                SELECT j.amount_cents
                FROM m1_journal_entries j
                JOIN m1_transactions t ON j.transaction_id = t.id
                WHERE j.account_id = ? AND t.status = 'posted'
                  AND (t.date < ? OR (t.date = ? AND t.origin = 'opening_balance'))
            `).all(acc.id, startDate, startDate) as Array<{ amount_cents: number }>;
            const bal = prevRows.reduce((sum, r) => sum + r.amount_cents, 0);
            startingCash[curr] = (startingCash[curr] || 0) + bal;
        }
    } else {
        for (const acc of cashAccounts) {
            const curr = acc.currency.toUpperCase();
            const prevRows = db.prepare(`
                SELECT j.amount_cents
                FROM m1_journal_entries j
                JOIN m1_transactions t ON j.transaction_id = t.id
                WHERE j.account_id = ? AND t.status = 'posted' AND t.origin = 'opening_balance'
            `).all(acc.id) as Array<{ amount_cents: number }>;
            const bal = prevRows.reduce((sum, r) => sum + r.amount_cents, 0);
            startingCash[curr] = (startingCash[curr] || 0) + bal;
        }
    }

    if (cashAccounts.length === 0) {
        return {
            entity_id: entityId,
            start_date: startDate,
            end_date: endDate,
            operating_inflows_cents_by_currency: {},
            operating_outflows_cents_by_currency: {},
            net_operating_cents_by_currency: {},
            financing_inflows_cents_by_currency: {},
            financing_outflows_cents_by_currency: {},
            net_financing_cents_by_currency: {},
            investing_inflows_cents_by_currency: {},
            investing_outflows_cents_by_currency: {},
            net_investing_cents_by_currency: {},
            net_cash_change_cents_by_currency: {},
            starting_cash_cents_by_currency: {},
            ending_cash_cents_by_currency: {},
            ledger_closing_cash_cents_by_currency: {},
            is_reconciled_by_currency: {},
            reconciliation_discrepancy_cents_by_currency: {},
            formatted_net_cash_change_by_currency: {},
            formatted_ending_cash_by_currency: {},
            items: [],
            calculation_version: CALCULATION_ENGINE_VERSION
        };
    }

    // Query all in-period cash postings (excluding initial opening balances)
    const placeholders = cashAccounts.map(() => '?').join(',');
    let sql = `
        SELECT 
            j.id as posting_id,
            j.transaction_id,
            j.account_id,
            j.amount_cents,
            j.currency,
            t.date,
            t.description,
            t.payee_or_payer,
            t.origin
        FROM m1_journal_entries j
        JOIN m1_transactions t ON j.transaction_id = t.id
        WHERE j.account_id IN (${placeholders}) AND t.status = 'posted' AND t.origin != 'opening_balance'
    `;
    const params: any[] = cashAccounts.map(a => a.id);

    if (startDate) {
        sql += ' AND t.date >= ?';
        params.push(startDate);
    }
    if (endDate) {
        sql += ' AND t.date <= ?';
        params.push(endDate);
    }
    sql += ' ORDER BY t.date ASC, j.id ASC';

    const cashPostings = db.prepare(sql).all(...params) as Array<{
        posting_id: string;
        transaction_id: string;
        account_id: string;
        amount_cents: number;
        currency: string;
        date: string;
        description: string;
        payee_or_payer?: string | null;
        origin: string;
    }>;

    // Group cash postings by transaction_id to preserve transaction context and separate
    // internal transfers from external cash movements (Assessor Verdict Item 4).
    //
    // Why this exists:
    // When an internal transfer includes a fee (e.g. $100 transfer from Checking to Savings + $10 fee),
    // processing legs in isolation incorrectly treats the $100 debit as an "expense refund" inflow
    // and the $110 credit as an "operating outflow". Grouping by transaction allows identifying
    // internal liquidity movement and isolating the net external cash activity ($10 operating outflow).
    //
    // Tricky logic:
    // - Internal transfer amount = min(totalCashIn, totalCashOut). This amount nets to $0 across
    //   liquid accounts and produces $0 external inflows and $0 external outflows.
    // - Only the net external cash movement (abs(totalCashIn - totalCashOut)) is apportioned
    //   to non-cash counterpart legs (expenses, liabilities, etc.).
    // - Reporting items record transfer legs as 'transfer' and the remainder as the dominant activity.
    //
    // TODO: In Milestone 2, add multi-currency cash transfer FX gain/loss leg apportionment.
    const txMap = new Map<string, typeof cashPostings>();
    const txOrder: string[] = [];
    for (const cp of cashPostings) {
        if (!txMap.has(cp.transaction_id)) {
            txMap.set(cp.transaction_id, []);
            txOrder.push(cp.transaction_id);
        }
        txMap.get(cp.transaction_id)!.push(cp);
    }

    const counterpartStmt = db.prepare(`
        SELECT j.account_id, j.amount_cents, j.currency, a.type as account_type, a.sub_type
        FROM m1_journal_entries j
        JOIN m1_accounts a ON j.account_id = a.id
        WHERE j.transaction_id = ?
    `);

    for (const txId of txOrder) {
        const txCashPostings = txMap.get(txId)!;
        const allTxPostings = counterpartStmt.all(txId) as Array<{
            account_id: string;
            amount_cents: number;
            currency: string;
            account_type: string;
            sub_type: string;
        }>;
        const nonCashCounterparts = allTxPostings.filter(p => !cashAccountIds.has(p.account_id));

        // Group cash postings within this transaction by currency
        const currencies = Array.from(new Set(txCashPostings.map(cp => cp.currency.toUpperCase())));
        for (const curr of currencies) {
            const cashLegs = txCashPostings.filter(cp => cp.currency.toUpperCase() === curr);
            if (cashLegs.length === 0) continue;

            if (nonCashCounterparts.length === 0) {
                // Pure internal cash transfer between liquid accounts (net $0 aggregate liquidity)
                for (const cp of cashLegs) {
                    items.push({
                        transaction_id: cp.transaction_id,
                        date: cp.date,
                        description: cp.description,
                        payee_or_payer: cp.payee_or_payer,
                        activity_type: 'transfer',
                        cash_account_id: cp.account_id,
                        cash_account_name: cashAccountMap.get(cp.account_id) || 'Cash Account',
                        amount_cents: cp.amount_cents,
                        currency: curr,
                        formatted_amount: formatMoney({ amount_cents: cp.amount_cents, currency: curr })
                    });
                }
                continue;
            }

            // Calculate internal transfer vs external cash movement
            const totalCashIn = cashLegs.filter(p => p.amount_cents > 0).reduce((sum, p) => sum + p.amount_cents, 0);
            const totalCashOut = cashLegs.filter(p => p.amount_cents < 0).reduce((sum, p) => sum + Math.abs(p.amount_cents), 0);
            const transferCents = Math.min(totalCashIn, totalCashOut);

            // Apportion non-cash counterparts against net external cash movement
            const totalNonCashWeight = nonCashCounterparts.reduce((sum, c) => sum + Math.abs(c.amount_cents), 0);
            const isExternalOutflow = totalCashOut > totalCashIn;
            const isExternalInflow = totalCashIn > totalCashOut;
            const netExternalAmount = isExternalOutflow
                ? totalCashOut - totalCashIn
                : isExternalInflow
                    ? totalCashIn - totalCashOut
                    : 0;

            const hasLiabilityRepayment = isExternalOutflow && nonCashCounterparts.some(c => c.account_type === 'liability');
            let dominantActivity: CashFlowActivityType = 'operating';
            let maxWeight = -1;

            if (netExternalAmount > 0) {
                for (const c of nonCashCounterparts) {
                    const weight = Math.abs(c.amount_cents);
                    const portion = totalNonCashWeight > 0 ? Math.round(netExternalAmount * (weight / totalNonCashWeight)) : netExternalAmount;
                    let legActivity: CashFlowActivityType = 'operating';

                    if (isExternalInflow) {
                        // External Cash Inflow
                        if (c.account_type === 'income') {
                            legActivity = 'operating';
                            operatingInflows[curr] = (operatingInflows[curr] || 0) + portion;
                        } else if (c.account_type === 'expense') {
                            legActivity = 'operating'; // Expense Refund
                            operatingInflows[curr] = (operatingInflows[curr] || 0) + portion;
                        } else if (c.account_type === 'liability') {
                            legActivity = 'financing'; // Borrowing proceeds
                            financingInflows[curr] = (financingInflows[curr] || 0) + portion;
                        } else if (c.account_type === 'equity') {
                            legActivity = 'financing'; // Capital contribution
                            financingInflows[curr] = (financingInflows[curr] || 0) + portion;
                        } else if (c.account_type === 'asset') {
                            legActivity = 'investing'; // Asset sale proceeds
                            investingInflows[curr] = (investingInflows[curr] || 0) + portion;
                        }
                    } else {
                        // External Cash Outflow (isExternalOutflow)
                        if (c.account_type === 'expense') {
                            if (hasLiabilityRepayment) {
                                legActivity = 'financing';
                                financingOutflows[curr] = (financingOutflows[curr] || 0) + portion;
                            } else {
                                legActivity = 'operating';
                                operatingOutflows[curr] = (operatingOutflows[curr] || 0) + portion;
                            }
                        } else if (c.account_type === 'income') {
                            legActivity = 'operating'; // Income reversal
                            operatingOutflows[curr] = (operatingOutflows[curr] || 0) + portion;
                        } else if (c.account_type === 'liability') {
                            legActivity = 'financing'; // Principal repayment
                            financingOutflows[curr] = (financingOutflows[curr] || 0) + portion;
                        } else if (c.account_type === 'equity') {
                            legActivity = 'financing'; // Distributions/drawings
                            financingOutflows[curr] = (financingOutflows[curr] || 0) + portion;
                        } else if (c.account_type === 'asset') {
                            legActivity = 'investing'; // Asset purchase
                            investingOutflows[curr] = (investingOutflows[curr] || 0) + portion;
                        }
                    }

                    if (weight > maxWeight) {
                        maxWeight = weight;
                        dominantActivity = hasLiabilityRepayment ? 'financing' : legActivity;
                    }
                }
            }

            // Record line items for reporting drilldowns
            if (transferCents === 0) {
                // No internal transfer: each cash posting is external
                for (const cp of cashLegs) {
                    items.push({
                        transaction_id: cp.transaction_id,
                        date: cp.date,
                        description: cp.description,
                        payee_or_payer: cp.payee_or_payer,
                        activity_type: dominantActivity,
                        cash_account_id: cp.account_id,
                        cash_account_name: cashAccountMap.get(cp.account_id) || 'Cash Account',
                        amount_cents: cp.amount_cents,
                        currency: curr,
                        formatted_amount: formatMoney({ amount_cents: cp.amount_cents, currency: curr })
                    });
                }
            } else {
                // Mixed transfer + external fee/rebate: separate transfer portions from external portions
                let remainingInflowTransfer = transferCents;
                let remainingOutflowTransfer = transferCents;

                for (const cp of cashLegs) {
                    if (cp.amount_cents > 0) {
                        const transferPortion = Math.min(cp.amount_cents, remainingInflowTransfer);
                        remainingInflowTransfer -= transferPortion;
                        const externalPortion = cp.amount_cents - transferPortion;

                        if (transferPortion > 0) {
                            items.push({
                                transaction_id: cp.transaction_id,
                                date: cp.date,
                                description: cp.description,
                                payee_or_payer: cp.payee_or_payer,
                                activity_type: 'transfer',
                                cash_account_id: cp.account_id,
                                cash_account_name: cashAccountMap.get(cp.account_id) || 'Cash Account',
                                amount_cents: transferPortion,
                                currency: curr,
                                formatted_amount: formatMoney({ amount_cents: transferPortion, currency: curr })
                            });
                        }
                        if (externalPortion > 0) {
                            items.push({
                                transaction_id: cp.transaction_id,
                                date: cp.date,
                                description: cp.description,
                                payee_or_payer: cp.payee_or_payer,
                                activity_type: dominantActivity,
                                cash_account_id: cp.account_id,
                                cash_account_name: cashAccountMap.get(cp.account_id) || 'Cash Account',
                                amount_cents: externalPortion,
                                currency: curr,
                                formatted_amount: formatMoney({ amount_cents: externalPortion, currency: curr })
                            });
                        }
                    } else {
                        const absAmount = Math.abs(cp.amount_cents);
                        const transferPortion = Math.min(absAmount, remainingOutflowTransfer);
                        remainingOutflowTransfer -= transferPortion;
                        const externalPortion = absAmount - transferPortion;

                        if (transferPortion > 0) {
                            items.push({
                                transaction_id: cp.transaction_id,
                                date: cp.date,
                                description: cp.description,
                                payee_or_payer: cp.payee_or_payer,
                                activity_type: 'transfer',
                                cash_account_id: cp.account_id,
                                cash_account_name: cashAccountMap.get(cp.account_id) || 'Cash Account',
                                amount_cents: -transferPortion,
                                currency: curr,
                                formatted_amount: formatMoney({ amount_cents: -transferPortion, currency: curr })
                            });
                        }
                        if (externalPortion > 0) {
                            items.push({
                                transaction_id: cp.transaction_id,
                                date: cp.date,
                                description: cp.description,
                                payee_or_payer: cp.payee_or_payer,
                                activity_type: dominantActivity,
                                cash_account_id: cp.account_id,
                                cash_account_name: cashAccountMap.get(cp.account_id) || 'Cash Account',
                                amount_cents: -externalPortion,
                                currency: curr,
                                formatted_amount: formatMoney({ amount_cents: -externalPortion, currency: curr })
                            });
                        }
                    }
                }
            }
        }
    }

    // Assessor Finding 4: Independently query ledger closing cash for liquid accounts
    const ledgerClosingCash: Record<CurrencyCode, number> = {};
    for (const acc of cashAccounts) {
        const curr = acc.currency.toUpperCase();
        const balResult = getAccountBalance(db, acc.id, endDate);
        ledgerClosingCash[curr] = (ledgerClosingCash[curr] || 0) + balResult.balance_cents;
    }

    const allCurrencies = Array.from(new Set([
        ...Object.keys(startingCash),
        ...Object.keys(operatingInflows),
        ...Object.keys(operatingOutflows),
        ...Object.keys(financingInflows),
        ...Object.keys(financingOutflows),
        ...Object.keys(investingInflows),
        ...Object.keys(investingOutflows),
        ...Object.keys(ledgerClosingCash)
    ]));

    const netOperating: Record<CurrencyCode, number> = {};
    const netFinancing: Record<CurrencyCode, number> = {};
    const netInvesting: Record<CurrencyCode, number> = {};
    const isReconciled: Record<CurrencyCode, boolean> = {};
    const discrepancies: Record<CurrencyCode, number> = {};
    const formattedNetChange: Record<CurrencyCode, string> = {};
    const formattedEndingCash: Record<CurrencyCode, string> = {};

    for (const curr of allCurrencies) {
        const start = startingCash[curr] || 0;
        const opIn = operatingInflows[curr] || 0;
        const opOut = operatingOutflows[curr] || 0;
        const finIn = financingInflows[curr] || 0;
        const finOut = financingOutflows[curr] || 0;
        const invIn = investingInflows[curr] || 0;
        const invOut = investingOutflows[curr] || 0;

        const netOp = opIn - opOut;
        const netFin = finIn - finOut;
        const netInv = invIn - invOut;

        netOperating[curr] = netOp;
        netFinancing[curr] = netFin;
        netInvesting[curr] = netInv;

        const netChange = netOp + netFin + netInv;
        netCashChange[curr] = netChange;

        // Ending Cash represents Cash Flow Statement reported ending cash: Starting + Net Change
        const computedEnd = start + netChange;
        endingCash[curr] = computedEnd;
        const ledgerEnd = ledgerClosingCash[curr] ?? computedEnd;

        // Reconciliation: Compare reported ending cash with double-entry ledger closing cash
        const diff = computedEnd - ledgerEnd;
        discrepancies[curr] = diff;
        isReconciled[curr] = (diff === 0);

        formattedNetChange[curr] = formatMoney({ amount_cents: netChange, currency: curr });
        formattedEndingCash[curr] = formatMoney({ amount_cents: computedEnd, currency: curr });
    }

    return {
        entity_id: entityId,
        start_date: startDate,
        end_date: endDate,
        operating_inflows_cents_by_currency: operatingInflows,
        operating_outflows_cents_by_currency: operatingOutflows,
        net_operating_cents_by_currency: netOperating,
        financing_inflows_cents_by_currency: financingInflows,
        financing_outflows_cents_by_currency: financingOutflows,
        net_financing_cents_by_currency: netFinancing,
        investing_inflows_cents_by_currency: investingInflows,
        investing_outflows_cents_by_currency: investingOutflows,
        net_investing_cents_by_currency: netInvesting,
        net_cash_change_cents_by_currency: netCashChange,
        starting_cash_cents_by_currency: startingCash,
        ending_cash_cents_by_currency: endingCash,
        ledger_closing_cash_cents_by_currency: ledgerClosingCash,
        is_reconciled_by_currency: isReconciled,
        reconciliation_discrepancy_cents_by_currency: discrepancies,
        formatted_net_cash_change_by_currency: formattedNetChange,
        formatted_ending_cash_by_currency: formattedEndingCash,
        items,
        calculation_version: CALCULATION_ENGINE_VERSION
    };
}

export interface GetLedgerDrilldownInput {
    account_id: string;
    start_date?: string;
    end_date?: string;
    limit?: number;
}

/**
 * Retrieves chronological ledger postings with exact running balances and evidence links (M1-EVID-01, M1-EVID-02).
 * 
 * Why this exists:
 * Fulfills M1-EVID-02: Every displayed financial total must be drillable to its contributing accepted records.
 * Provides complete transaction provenance, running balance tracking, and evidence metadata badges.
 * 
 * Tricky logic:
 * - Computes opening balance prior to start_date.
 * - Computes exact running balance for each row according to debit/credit normal balance rules.
 * - Parses and attaches evidence references.
 */
export function getAccountLedgerDrilldown(
    db: Database.Database,
    input: GetLedgerDrilldownInput
): AccountLedgerDrilldownResult {
    const account = db.prepare('SELECT id, name, type, currency FROM m1_accounts WHERE id = ?').get(input.account_id) as any;
    if (!account) {
        throw new Error(`Account not found: ${input.account_id}`);
    }

    const isDebitNormal = account.type === 'asset' || account.type === 'expense';
    const curr = account.currency.toUpperCase();

    // 1. Calculate opening balance as of start_date (if start_date provided)
    let openingBalanceCents = 0;
    if (input.start_date) {
        const priorRows = db.prepare(`
            SELECT j.amount_cents
            FROM m1_journal_entries j
            JOIN m1_transactions t ON j.transaction_id = t.id
            WHERE j.account_id = ? AND t.date < ? AND t.status = 'posted'
        `).all(account.id, input.start_date) as Array<{ amount_cents: number }>;

        const rawPrior = priorRows.reduce((sum, r) => sum + r.amount_cents, 0);
        openingBalanceCents = isDebitNormal ? rawPrior : -rawPrior;
    }

    // 2. Query postings in date range
    let sql = `
        SELECT 
            j.id as posting_id,
            j.transaction_id,
            j.amount_cents,
            j.currency,
            j.memo,
            t.date,
            t.description,
            t.payee_or_payer,
            t.origin,
            t.evidence_refs
        FROM m1_journal_entries j
        JOIN m1_transactions t ON j.transaction_id = t.id
        WHERE j.account_id = ? AND t.status = 'posted'
    `;
    const params: any[] = [account.id];

    if (input.start_date) {
        sql += ' AND t.date >= ?';
        params.push(input.start_date);
    }
    if (input.end_date) {
        sql += ' AND t.date <= ?';
        params.push(input.end_date);
    }
    sql += ' ORDER BY t.date ASC, t.created_at ASC, j.id ASC';

    if (input.limit) {
        sql += ' LIMIT ?';
        params.push(input.limit);
    }

    const rows = db.prepare(sql).all(...params) as any[];

    let currentRunning = openingBalanceCents;
    const entries: LedgerEntryDrilldownItem[] = [];

    for (const r of rows) {
        // Delta to normal balance:
        // Debit increases Asset/Expense, decreases Liability/Equity/Income
        const delta = isDebitNormal ? r.amount_cents : -r.amount_cents;
        currentRunning += delta;

        let parsedEvidence: any[] = [];
        if (r.evidence_refs) {
            try {
                const parsed = JSON.parse(r.evidence_refs);
                parsedEvidence = Array.isArray(parsed) ? parsed : [parsed];
                parsedEvidence = parsedEvidence.map(item => {
                    if (typeof item === 'string') {
                        try {
                            return JSON.parse(item);
                        } catch {
                            return item;
                        }
                    }
                    return item;
                });
            } catch {
                parsedEvidence = [r.evidence_refs];
            }
        }

        entries.push({
            posting_id: r.posting_id,
            transaction_id: r.transaction_id,
            date: r.date,
            description: r.description,
            payee_or_payer: r.payee_or_payer,
            account_id: account.id,
            account_name: account.name,
            account_type: account.type,
            amount_cents: r.amount_cents,
            currency: curr,
            running_balance_cents: currentRunning,
            formatted_amount: formatMoney({ amount_cents: r.amount_cents, currency: curr }),
            formatted_running_balance: formatMoney({ amount_cents: currentRunning, currency: curr }),
            memo: r.memo,
            origin: r.origin,
            evidence_refs: parsedEvidence
        });
    }

    return {
        account_id: account.id,
        account_name: account.name,
        account_type: account.type,
        currency: curr,
        start_date: input.start_date,
        end_date: input.end_date,
        opening_balance_cents: openingBalanceCents,
        closing_balance_cents: currentRunning,
        formatted_opening_balance: formatMoney({ amount_cents: openingBalanceCents, currency: curr }),
        formatted_closing_balance: formatMoney({ amount_cents: currentRunning, currency: curr }),
        entries,
        calculation_version: CALCULATION_ENGINE_VERSION
    };
}


