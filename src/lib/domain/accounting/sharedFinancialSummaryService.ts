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
 * - Joint ownership weighting: Applies `account_ownership` percentages when scoped to an entity
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
import { listAccounts, getEntity, listEntities } from './accountService';
import { getAccountBalance } from './balanceService';
import { getLatestValuationObservation, getReconciliationComparison, getLatestObservation } from './balanceObservationService';
import { getLocalTodayCalendarDate } from '../calendarDate';

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
    const asOfDate = options.asOfDate || options.as_of_date || getLocalTodayCalendarDate();
    const reportingCurrency = (options.reportingCurrency || options.reporting_currency || 'USD').toUpperCase();
    const scopeEntityId = options.scopeEntityId || options.entity_id;

    const coverageNotes: string[] = [];
    const accountsIncluded: SharedFinancialSummaryAccount[] = [];
    // Why this exists:
    // Tracks accounts that track balances but lack an accepted observation on or before asOfDate,
    // or accounts tracking transactions that have no established opening basis or observation.
    // Allows dashboard widgets, assets, and liabilities views to qualify incomplete headline totals honestly
    // without assuming zero balances or commingling assets with debts.
    const unrecordedAccounts: Array<{
        id: string;
        name: string;
        currency: CurrencyCode;
        entity_id?: string;
        entity_name?: string;
        account_type?: import('./types').AccountType;
        account_sub_type?: import('./types').AccountSubType;
        reason?: string;
    }> = [];

    const totalAssetsCentsByCurrency: Record<CurrencyCode, number> = {};
    const totalLiabilitiesCentsByCurrency: Record<CurrencyCode, number> = {};
    const netWorthCentsByCurrency: Record<CurrencyCode, number> = {};

    // Helper to safely add to currency map
    const addToMap = (map: Record<CurrencyCode, number>, curr: CurrencyCode, amount: number) => {
        map[curr] = (map[curr] || 0) + amount;
    };

    // 1. Fetch eligible accounts and entity dictionary for owner disambiguation
    const allAccounts = listAccounts(db);
    const entities = listEntities(db);
    const entityMap = new Map<string, string>();
    for (const e of entities) {
        entityMap.set(e.id, e.name);
    }

    // Also fetch ownership mappings for the scope entity if applicable
    const ownershipMap = new Map<string, number>();
    if (scopeEntityId) {
        const ownerships = db.prepare(`
            SELECT account_id, share_percentage FROM account_ownership
            WHERE entity_id = ?
        `).all(scopeEntityId) as Array<{ account_id: string; share_percentage: number }>;

        for (const o of ownerships) {
            ownershipMap.set(o.account_id, o.share_percentage);
        }
    }

    // Collect clearing account IDs (inter-entity receivables/payables) which start at zero
    const clearingAccountIds = new Set<string>();
    try {
        const clearingRows = db.prepare(`SELECT due_from_account_id, due_to_account_id FROM reimbursement_workflows`).all() as any[];
        for (const r of clearingRows) {
            if (r.due_from_account_id) clearingAccountIds.add(r.due_from_account_id);
            if (r.due_to_account_id) clearingAccountIds.add(r.due_to_account_id);
        }
    } catch {
        // Workflow table may not exist in minimal test fixtures
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

        let sourceType: 'manual' | 'table_paste' | 'document' | 'api' | undefined = undefined;
        let documentId: string | null | undefined = undefined;
        let observationDate: string | null = null;

        if (trackingMode === 'balance') {
            // Mode A: Track Balances via dated observations
            basis = 'observation';
            const observation = getLatestValuationObservation(db, account.id, asOfDate);

            if (!observation) {
                // Incomplete coverage: do NOT assume zero wealth
                unrecordedAccounts.push({
                    id: account.id,
                    name: account.name,
                    currency: account.currency,
                    entity_id: account.entity_id,
                    entity_name: entityMap.get(account.entity_id) || 'Household',
                    account_type: account.type,
                    account_sub_type: account.sub_type,
                    reason: 'missing_observation'
                });
                coverageNotes.push(`Account "${account.name}" (${account.currency}) tracks balances but has no accepted valuation observation on or before ${asOfDate}.`);
                continue;
            }

            accountAmountCents = observation.amount_cents;
            balanceKind = observation.balance_kind;
            effectiveDate = observation.effective_date;
            observationDate = observation.effective_date;
            sourceType = observation.source_type;
            documentId = observation.document_id;

            // Mark stale if older than 45 days
            const obsTime = new Date(observation.effective_date).getTime();
            const asOfTime = new Date(asOfDate).getTime();
            if ((asOfTime - obsTime) > (45 * 24 * 60 * 60 * 1000)) {
                isStale = true;
            }
        } else {
            // Mode B: Track Transactions via double-entry ledger calculation
            // Why this exists:
            // Distinguishes recorded transaction movement from a supported account balance.
            // An account with no opening balance basis and no accepted balance observation has an unknown
            // starting position. Merely aggregating subsequent transactions cannot establish an authoritative
            // account balance.
            // Tricky logic:
            // 1. Explicit zero (opening_balance_cents === 0) or clearing accounts start at known $0.00.
            // 2. Unknown opening (opening_balance_cents === null) + no transactions MUST remain unknown.
            // 3. Opening history is never inferred from arbitrary transaction descriptions.
            // 4. A statement observation anchors the balance at its effective date; subsequent transactions
            //    add to that anchor. The summary must NEVER return an unanchored transaction sum.
            // 5. Future observations (> asOfDate) and non-valuation kinds (e.g. available_balance) CANNOT
            //    establish an earlier ledger starting basis.
            // 6. Observation dates are preserved separately from calculation dates.
            // TODO: In Milestone 2, provide one-click prompt on unrecorded accounts to record initial statement.
            const isClearingAccount = clearingAccountIds.has(account.id);
            const hasExplicitOpeningBasis = isClearingAccount || (account.opening_balance_cents !== null && account.opening_balance_cents !== undefined);
            
            let hasOpeningTx = false;
            if (!hasExplicitOpeningBasis) {
                const txRows = db.prepare(`
                    SELECT t.origin,
                           EXISTS (
                               SELECT 1 FROM journal_entries je2
                               JOIN accounts a2 ON je2.account_id = a2.id
                               WHERE je2.transaction_id = t.id AND a2.type = 'equity'
                           ) as has_equity
                    FROM journal_entries je
                    JOIN transactions t ON je.transaction_id = t.id
                    WHERE je.account_id = ? AND t.status = 'posted'
                `).all(account.id) as Array<{ origin: string; has_equity: number }>;

                // Do not infer opening history from transaction descriptions; only explicit origin or equity
                hasOpeningTx = txRows.some(r =>
                    r.origin === 'opening_balance' ||
                    Boolean(r.has_equity)
                );
            }

            const hasEstablishedLedgerBasis = hasExplicitOpeningBasis || hasOpeningTx;

            if (hasEstablishedLedgerBasis) {
                basis = 'ledger';
                const ledgerBalance = getAccountBalance(db, account.id, asOfDate);
                accountAmountCents = ledgerBalance.balance_cents;
                effectiveDate = asOfDate;

                // Check for accepted valuation observation on or before asOfDate for reconciliation
                const latestObs = getLatestValuationObservation(db, account.id, asOfDate);
                if (latestObs) {
                    reconciliation = getReconciliationComparison(db, account.id, latestObs);
                    sourceType = latestObs.source_type;
                    documentId = latestObs.document_id;
                    observationDate = latestObs.effective_date;
                    const obsTime = new Date(latestObs.effective_date).getTime();
                    const asOfTime = new Date(asOfDate).getTime();
                    if ((asOfTime - obsTime) > (45 * 24 * 60 * 60 * 1000)) {
                        isStale = true;
                    }
                }
            } else {
                // No ledger opening basis: check if an accepted valuation/statement observation on or before asOfDate anchors it
                const latestValuationObs = getLatestValuationObservation(db, account.id, asOfDate);

                if (!latestValuationObs) {
                    // Unknown opening + no observation on or before asOfDate => unrecorded (unknown)
                    unrecordedAccounts.push({
                        id: account.id,
                        name: account.name,
                        currency: account.currency,
                        entity_id: account.entity_id,
                        entity_name: entityMap.get(account.entity_id) || 'Household',
                        account_type: account.type,
                        account_sub_type: account.sub_type,
                        reason: 'missing_opening_balance'
                    });
                    coverageNotes.push(`Account "${account.name}" (${account.currency}) tracks transactions but has no opening balance or statement observation on or before ${asOfDate}. Starting balance needed.`);
                    continue;
                }

                // Sourced from statement observation: anchor at observation date and add subsequent postings up to asOfDate
                const obsDate = latestValuationObs.effective_date;
                const obsCents = latestValuationObs.amount_cents;
                sourceType = latestValuationObs.source_type;
                documentId = latestValuationObs.document_id;
                balanceKind = latestValuationObs.balance_kind;
                observationDate = obsDate;

                const obsTime = new Date(obsDate).getTime();
                const asOfTime = new Date(asOfDate).getTime();
                if ((asOfTime - obsTime) > (45 * 24 * 60 * 60 * 1000)) {
                    isStale = true;
                }

                const subsequentRows = db.prepare(`
                    SELECT j.amount_cents
                    FROM journal_entries j
                    JOIN transactions t ON j.transaction_id = t.id
                    WHERE j.account_id = ? AND t.date > ? AND t.date <= ? AND t.status = 'posted'
                    ORDER BY t.date ASC
                `).all(account.id, obsDate, asOfDate) as Array<{ amount_cents: number }>;

                let subsequentNet = 0;
                for (const r of subsequentRows) {
                    subsequentNet += r.amount_cents;
                }
                const isDebitNormal = account.type === 'asset';
                const subsequentChange = isDebitNormal ? subsequentNet : -subsequentNet;

                accountAmountCents = obsCents + subsequentChange;
                basis = subsequentRows.length > 0 ? 'ledger' : 'observation';
                effectiveDate = asOfDate;
            }
        }

        // Apply ownership weighting to amount
        const weightedAmountCents = Math.round(accountAmountCents * ownershipRatio);

        accountsIncluded.push({
            account_id: account.id,
            account_name: account.name,
            entity_id: account.entity_id,
            entity_name: entityMap.get(account.entity_id) || 'Household',
            account_type: account.type,
            account_sub_type: account.sub_type,
            tracking_mode: trackingMode,
            basis,
            balance_kind: balanceKind,
            amount_cents: weightedAmountCents,
            currency: account.currency,
            effective_date: effectiveDate,
            observation_date: observationDate,
            as_of_date: asOfDate,
            is_stale: isStale,
            reconciliation,
            source_type: sourceType,
            document_id: documentId
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

    // 1.5 Eliminate internal balances for the full combined view (Batch D1)
    if (!scopeEntityId) {
        const workflows = db.prepare(`
            SELECT 
                w.due_from_account_id, 
                w.due_to_account_id, 
                w.amount_cents, 
                w.currency,
                pt.date as purchase_date,
                prt.date as personal_reimb_date,
                brt.date as business_reimb_date
            FROM reimbursement_workflows w
            JOIN transactions pt ON w.personal_transaction_id = pt.id
            LEFT JOIN transactions prt ON w.personal_reimbursement_tx_id = prt.id
            LEFT JOIN transactions brt ON w.business_reimbursement_tx_id = brt.id
            WHERE w.status != 'cancelled'
        `).all() as any[];

        for (const wf of workflows) {
            // Did the purchase exist on or before asOfDate?
            if (wf.purchase_date > asOfDate) {
                continue;
            }

            // Calculate how much is still outstanding for each side
            const personalReimbursed = (wf.personal_reimb_date && wf.personal_reimb_date <= asOfDate);
            const businessReimbursed = (wf.business_reimb_date && wf.business_reimb_date <= asOfDate);

            // We only eliminate matched balances.
            // If neither side has been reimbursed, the outstanding internal balance is full.
            // If one side has been reimbursed, that side's clearing account is already 0. We can't eliminate more than what's in both.
            // Wait, the prompt says "Derive outstanding internal balances as of the requested date from the linked posted purchase and settlement records."
            const dueFromOutstanding = personalReimbursed ? 0 : wf.amount_cents;
            const dueToOutstanding = businessReimbursed ? 0 : wf.amount_cents;

            const eliminationAmount = Math.min(dueFromOutstanding, dueToOutstanding);

            if (eliminationAmount <= 0) {
                continue;
            }

            const dueFromAcc = accountsIncluded.find(a => a.account_id === wf.due_from_account_id);
            const dueToAcc = accountsIncluded.find(a => a.account_id === wf.due_to_account_id);

            if (dueFromAcc && dueToAcc) {
                dueFromAcc.amount_cents -= eliminationAmount;
                dueToAcc.amount_cents -= eliminationAmount;

                // Adjust totals
                addToMap(totalAssetsCentsByCurrency, wf.currency, -eliminationAmount);
                addToMap(totalLiabilitiesCentsByCurrency, wf.currency, -eliminationAmount);
            }
        }
    }

    // 2. Converted Totals calculation (Strictly requires explicit dated exchange rates)
    // Why this exists:
    // Implements a single bottom-up rounding policy (Resolves Issue 4):
    // Individual account balances are converted and rounded to minor units first.
    // Converted total assets, total liabilities, and converted net worth are then computed as direct
    // sums and differences of the converted account amounts. This guarantees 100% exact mathematical
    // reconciliation between account breakdowns, headline totals, and net worth down to the single cent.
    // Tricky logic:
    // A conversion is only complete if:
    // 1. Zero unrecorded accounts exist (unrecordedAccounts.length === 0).
    // 2. Every included account in a foreign currency has an explicit dated exchange rate on or before asOfDate.
    // If any rate is missing, converted totals have is_complete = false and amount_cents = 0.
    // TODO: In Milestone 2, support multi-hop triangular rate conversion (e.g. JPY -> USD -> AUD).
    const missingRatesSet = new Set<string>();

    for (const acc of accountsIncluded) {
        if (acc.currency === reportingCurrency) {
            acc.converted_amount_cents = acc.amount_cents;
        } else {
            const rateRow = db.prepare(`
                SELECT rate FROM exchange_rates
                WHERE from_currency = ? AND to_currency = ? AND effective_date <= ?
                ORDER BY effective_date DESC
                LIMIT 1
            `).get(acc.currency, reportingCurrency, asOfDate) as { rate: number } | undefined;

            if (rateRow && rateRow.rate > 0) {
                const fromDecimals = CURRENCY_DECIMALS[acc.currency] ?? 2;
                const toDecimals = CURRENCY_DECIMALS[reportingCurrency] ?? 2;
                const majorAmount = acc.amount_cents / Math.pow(10, fromDecimals);
                acc.converted_amount_cents = Math.round((majorAmount * rateRow.rate) * Math.pow(10, toDecimals));
            } else {
                missingRatesSet.add(`${acc.currency} -> ${reportingCurrency}`);
            }
        }
    }

    const missingRates = Array.from(missingRatesSet);
    const hasMissingRates = missingRates.length > 0;
    const isConversionComplete = unrecordedAccounts.length === 0 && !hasMissingRates;

    let convertedAssetsCents = 0;
    let convertedLiabilitiesCents = 0;

    if (isConversionComplete) {
        for (const acc of accountsIncluded) {
            const val = acc.converted_amount_cents ?? 0;
            if (acc.account_type === 'asset') {
                convertedAssetsCents += val;
            } else if (acc.account_type === 'liability') {
                convertedLiabilitiesCents += val;
            }
        }
    }

    const convertedTotalAssets: ConvertedMonetaryAmount = {
        amount_cents: isConversionComplete ? convertedAssetsCents : 0,
        currency: reportingCurrency,
        is_complete: isConversionComplete,
        missing_rates: missingRates
    };

    const convertedTotalLiabilities: ConvertedMonetaryAmount = {
        amount_cents: isConversionComplete ? convertedLiabilitiesCents : 0,
        currency: reportingCurrency,
        is_complete: isConversionComplete,
        missing_rates: missingRates
    };

    const convertedNetWorth: ConvertedMonetaryAmount = {
        amount_cents: isConversionComplete ? (convertedAssetsCents - convertedLiabilitiesCents) : 0,
        currency: reportingCurrency,
        is_complete: isConversionComplete,
        missing_rates: missingRates
    };

    if (hasMissingRates) {
        coverageNotes.push(`Could not compute unified converted net worth in ${reportingCurrency} due to missing dated exchange rates: ${missingRates.join(', ')}.`);
    }

    // Overall completeness requires zero unrecorded balance accounts AND complete FX conversions
    const overallIsComplete = isConversionComplete;

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
