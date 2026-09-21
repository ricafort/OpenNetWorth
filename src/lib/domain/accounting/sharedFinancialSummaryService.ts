/**
 * Shared Financial Summary Calculation Service
 * 
 * Why this file exists:
 * Implements Delivery 1 of the unified accounting engine.
 * Solves the disconnected-screen architecture problem by exposing a single, shared read service
 * consumed identically by the Dashboard, Accounts, Reports, and Assistant.
 * Unifies accounts tracking balances (via dated observations) with accounts tracking transactions
 * (via double-entry ledger calculation).
 * 
 * Tricky logic:
 * - Wealth account filtering: ONLY accounts with `type IN ('asset', 'liability')` contribute to net worth.
 *   Income, expense, equity, and suspense accounts are strictly excluded from wealth totals.
 * - Non-wealth observation filtering: Only observations with recognized valuation balance kinds
 *   (posted_balance, current_balance, portfolio_value, etc.) are included. Credit limits, available credit,
 *   and redraw capacity are NEVER added to wealth.
 * - Missing observation semantics: If a balance-tracked account has no eligible observation, it is
 *   flagged as incomplete coverage rather than fabricating zero balance.
 * - Strict multi-currency: Totals are grouped strictly by currency. Converted totals are only computed
 *   if exact dated exchange rates exist; missing rates are explicitly reported with `is_complete: false`
 *   and missing currencies disclosed, never using 1:1 guesses or mock exchange rates.
 * - Joint ownership weighting: Applies `m1_account_ownership` percentages when scoped to an entity
 *   to ensure a 50% co-owned asset only contributes 50% to that entity's net worth.
 * 
 * TODO: Integrate automated historical FX rate fetcher in Milestone 2.
 */

import Database from 'better-sqlite3';
import {
    CurrencyCode,
    SharedFinancialSummary,
    SharedFinancialSummaryAccount,
    ConvertedMonetaryAmount,
    multiplyMoneyRatio,
    CURRENCY_DECIMALS
} from './types';
import { listAccounts, getEntity } from './accountService';
import { getAccountBalance } from './balanceService';
import { getLatestValuationObservation, getReconciliationComparison, getLatestObservation } from './balanceObservationService';

export interface FinancialSummaryOptions {
    scopeEntityId?: string;
    entity_id?: string;
    asOfDate?: string;
    as_of_date?: string;
    reportingCurrency?: CurrencyCode;
    reporting_currency?: CurrencyCode;
    apply_ownership?: boolean;
}

export function getSharedFinancialSummary(
    db: Database.Database,
    options: FinancialSummaryOptions = {}
): SharedFinancialSummary {
    const asOfDate = options.asOfDate || options.as_of_date || new Date().toISOString().split('T')[0];
    const reportingCurrency = (options.reportingCurrency || options.reporting_currency || 'USD').toUpperCase();
    const scopeEntityId = options.scopeEntityId || options.entity_id;

    const coverageNotes: string[] = [];
    const accountsIncluded: SharedFinancialSummaryAccount[] = [];
    // Why this exists:
    // Tracks accounts that track balances but lack an accepted observation on or before asOfDate.
    // Allows dashboard widgets to qualify incomplete headline totals honestly without assuming zero balances.
    const unrecordedAccounts: Array<{ id: string; name: string; currency: CurrencyCode }> = [];

    const totalAssetsCentsByCurrency: Record<CurrencyCode, number> = {};
    const totalLiabilitiesCentsByCurrency: Record<CurrencyCode, number> = {};
    const netWorthCentsByCurrency: Record<CurrencyCode, number> = {};

    // Helper to safely add to currency map
    const addToMap = (map: Record<CurrencyCode, number>, curr: CurrencyCode, amount: number) => {
        map[curr] = (map[curr] || 0) + amount;
    };

    // 1. Fetch eligible accounts
    // When scoped to an entity, we query all accounts and check direct ownership or m1_account_ownership allocations
    const allAccounts = listAccounts(db);

    // Also fetch ownership mappings for the scope entity if applicable
    const ownershipMap = new Map<string, number>();
    if (scopeEntityId) {
        const ownerships = db.prepare(`
            SELECT account_id, share_percentage FROM m1_account_ownership
            WHERE entity_id = ?
        `).all(scopeEntityId) as Array<{ account_id: string; share_percentage: number }>;

        for (const o of ownerships) {
            ownershipMap.set(o.account_id, o.share_percentage);
        }
    }

    for (const account of allAccounts) {
        if (!account.is_active) continue;

        // Strict wealth filter: Only Assets and Liabilities contribute to Net Worth
        if (account.type !== 'asset' && account.type !== 'liability') {
            continue;
        }

        // Determine ownership ratio (1.0 for sole owner, or fractional for joint)
        let ownershipRatio = 1.0;
        if (scopeEntityId) {
            if (account.entity_id !== scopeEntityId) {
                const share = ownershipMap.get(account.id);
                if (share === undefined || share <= 0) {
                    continue; // Not owned by this entity
                }
                ownershipRatio = share / 100;
            } else if (ownershipMap.has(account.id)) {
                // Account belongs directly to entity but has joint ownership configured
                const share = ownershipMap.get(account.id)!;
                ownershipRatio = share / 100;
            }
        }

        const trackingMode = account.tracking_mode || 'transactions';
        let accountAmountCents = 0;
        let basis: 'observation' | 'ledger' = 'ledger';
        let effectiveDate = asOfDate;
        let isStale = false;
        let balanceKind = undefined;
        let reconciliation = undefined;

        if (trackingMode === 'balance') {
            // Mode A: Track Balances via dated observations
            basis = 'observation';
            const observation = getLatestValuationObservation(db, account.id, asOfDate);

            if (!observation) {
                // Incomplete coverage: do NOT assume zero wealth
                unrecordedAccounts.push({
                    id: account.id,
                    name: account.name,
                    currency: account.currency
                });
                coverageNotes.push(`Account "${account.name}" (${account.currency}) tracks balances but has no accepted valuation observation on or before ${asOfDate}.`);
                continue;
            }

            accountAmountCents = observation.amount_cents;
            balanceKind = observation.balance_kind;
            effectiveDate = observation.effective_date;

            // Mark stale if older than 45 days
            const obsTime = new Date(observation.effective_date).getTime();
            const asOfTime = new Date(asOfDate).getTime();
            if ((asOfTime - obsTime) > (45 * 24 * 60 * 60 * 1000)) {
                isStale = true;
            }
        } else {
            // Mode B: Track Transactions via double-entry ledger calculation
            basis = 'ledger';
            const ledgerBalance = getAccountBalance(db, account.id, asOfDate);
            accountAmountCents = ledgerBalance.balance_cents;
            effectiveDate = asOfDate;

            // Check if there is a recent observation to provide reconciliation comparison
            const latestObs = getLatestObservation(db, account.id);
            if (latestObs) {
                reconciliation = getReconciliationComparison(db, account.id, latestObs);
            }
        }

        // Apply ownership weighting to amount
        const weightedAmountCents = Math.round(accountAmountCents * ownershipRatio);

        accountsIncluded.push({
            account_id: account.id,
            account_name: account.name,
            entity_id: account.entity_id,
            account_type: account.type,
            account_sub_type: account.sub_type,
            tracking_mode: trackingMode,
            basis,
            balance_kind: balanceKind,
            amount_cents: weightedAmountCents,
            currency: account.currency,
            effective_date: effectiveDate,
            is_stale: isStale,
            reconciliation
        });

        // Add to currency-specific totals
        if (account.type === 'asset') {
            addToMap(totalAssetsCentsByCurrency, account.currency, weightedAmountCents);
            addToMap(netWorthCentsByCurrency, account.currency, weightedAmountCents);
        } else if (account.type === 'liability') {
            addToMap(totalLiabilitiesCentsByCurrency, account.currency, weightedAmountCents);
            addToMap(netWorthCentsByCurrency, account.currency, -weightedAmountCents);
        }
    }

    // 2. Converted Totals calculation (Strictly requires explicit dated exchange rates)
    // Why this exists:
    // Enables dashboard widgets (Assets, Liabilities, Net Worth, Allocation) to consume authoritatively
    // converted figures in reportingCurrency using identical dated exchange rates and minor-unit rounding rules.
    // Tricky logic:
    // A conversion is only complete if EVERY foreign currency in the set has an exchange rate on or before asOfDate.
    // If any currency rate is missing, is_complete is false, and the raw currency amounts are retained for honest native display.
    // TODO: In Milestone 2, support multi-hop triangular rate conversion (e.g. JPY -> USD -> AUD).
    const hasIncompleteCoverage = coverageNotes.length > 0;

    const convertCurrencyMap = (map: Record<CurrencyCode, number>): ConvertedMonetaryAmount => {
        const currs = Object.keys(map) as CurrencyCode[];
        if (currs.length === 0) {
            return {
                amount_cents: 0,
                currency: reportingCurrency,
                is_complete: !hasIncompleteCoverage,
                missing_rates: []
            };
        }
        if (currs.length === 1 && currs[0] === reportingCurrency) {
            return {
                amount_cents: map[reportingCurrency] || 0,
                currency: reportingCurrency,
                is_complete: !hasIncompleteCoverage,
                missing_rates: []
            };
        }

        let totalCents = 0;
        const missing: string[] = [];
        let isComplete = !hasIncompleteCoverage;

        for (const curr of currs) {
            const amountInCurr = map[curr] || 0;
            if (curr === reportingCurrency) {
                totalCents += amountInCurr;
                continue;
            }

            // Lookup latest exchange rate on or before asOfDate
            const rateRow = db.prepare(`
                SELECT rate FROM m1_exchange_rates
                WHERE from_currency = ? AND to_currency = ? AND effective_date <= ?
                ORDER BY effective_date DESC
                LIMIT 1
            `).get(curr, reportingCurrency, asOfDate) as { rate: number } | undefined;

            if (rateRow && rateRow.rate > 0) {
                const fromDecimals = CURRENCY_DECIMALS[curr] ?? 2;
                const toDecimals = CURRENCY_DECIMALS[reportingCurrency] ?? 2;
                const majorAmount = amountInCurr / Math.pow(10, fromDecimals);
                const convertedMajor = majorAmount * rateRow.rate;
                const convertedCents = Math.round(convertedMajor * Math.pow(10, toDecimals));
                totalCents += convertedCents;
            } else {
                isComplete = false;
                missing.push(`${curr} -> ${reportingCurrency}`);
            }
        }

        return {
            amount_cents: isComplete ? totalCents : 0,
            currency: reportingCurrency,
            is_complete: isComplete,
            missing_rates: missing
        };
    };

    const convertedNetWorth = convertCurrencyMap(netWorthCentsByCurrency);
    const convertedTotalAssets = convertCurrencyMap(totalAssetsCentsByCurrency);
    const convertedTotalLiabilities = convertCurrencyMap(totalLiabilitiesCentsByCurrency);

    if (!convertedNetWorth.is_complete && convertedNetWorth.missing_rates.length > 0) {
        coverageNotes.push(`Could not compute unified converted net worth in ${reportingCurrency} due to missing dated exchange rates: ${convertedNetWorth.missing_rates.join(', ')}.`);
    }

    // 3. Attach converted_amount_cents to each account if rate is available
    // Why: Allows allocation charts to render converted amounts per holding when verified rates exist.
    for (const acc of accountsIncluded) {
        if (acc.currency === reportingCurrency) {
            acc.converted_amount_cents = acc.amount_cents;
        } else {
            const rateRow = db.prepare(`
                SELECT rate FROM m1_exchange_rates
                WHERE from_currency = ? AND to_currency = ? AND effective_date <= ?
                ORDER BY effective_date DESC
                LIMIT 1
            `).get(acc.currency, reportingCurrency, asOfDate) as { rate: number } | undefined;

            if (rateRow && rateRow.rate > 0) {
                const fromDecimals = CURRENCY_DECIMALS[acc.currency] ?? 2;
                const toDecimals = CURRENCY_DECIMALS[reportingCurrency] ?? 2;
                const majorAmount = acc.amount_cents / Math.pow(10, fromDecimals);
                acc.converted_amount_cents = Math.round((majorAmount * rateRow.rate) * Math.pow(10, toDecimals));
            }
        }
    }

    // Overall completeness requires zero unrecorded balance accounts AND complete FX conversions
    const overallIsComplete = unrecordedAccounts.length === 0 && convertedNetWorth.is_complete;

    return {
        as_of_date: asOfDate,
        scope_entity_id: scopeEntityId,
        reporting_currency: reportingCurrency,
        total_assets_cents_by_currency: totalAssetsCentsByCurrency,
        total_liabilities_cents_by_currency: totalLiabilitiesCentsByCurrency,
        net_worth_cents_by_currency: netWorthCentsByCurrency,
        converted_net_worth: convertedNetWorth,
        converted_total_assets: convertedTotalAssets,
        converted_total_liabilities: convertedTotalLiabilities,
        accounts_included: accountsIncluded,
        accounts: accountsIncluded,
        coverage_notes: coverageNotes,
        unrecorded_accounts: unrecordedAccounts,
        unrecorded_count: unrecordedAccounts.length,
        is_complete: overallIsComplete
    };
}
