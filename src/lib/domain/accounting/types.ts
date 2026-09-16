/**
 * Milestone 1 Accounting Domain Models & Exact Monetary Representation
 * 
 * Why this file exists:
 * Provides the foundational domain models and mathematical invariants for OpenNetWorth's
 * double-entry accounting engine. Establishes exact integer minor-unit (cents) arithmetic
 * to eliminate binary floating-point errors (IEEE 754) and defines entities, accounts,
 * balanced transactions, postings, and correction trails.
 * 
 * Tricky logic:
 * - Monetary amounts are strictly safe integers representing minor currency units (cents).
 *   For example, USD 12.50 is stored as 1250 cents. JPY has scale 0 (100 JPY is 100).
 * - Multi-currency support enforces that unlike currencies cannot be added directly.
 * - Transactions must balance: Sum(Debits) - Sum(Credits) = 0. We represent Debits as positive
 *   and Credits as negative, so Sum(amount_cents) === 0.
 * 
 * TODO: Add support for multi-currency automated revaluation journals in future milestones.
 */

// Supported ISO 4217 Currency Codes with their minor unit scale (decimals)
export const CURRENCY_DECIMALS: Record<string, number> = {
    USD: 2,
    AUD: 2,
    EUR: 2,
    GBP: 2,
    CAD: 2,
    NZD: 2,
    CHF: 2,
    JPY: 0,
    SGD: 2,
    HKD: 2
};

export type CurrencyCode = 'USD' | 'AUD' | 'EUR' | 'GBP' | 'CAD' | 'NZD' | 'CHF' | 'JPY' | 'SGD' | 'HKD' | string;

/**
 * Exact monetary value representation.
 */
export interface Money {
    amount_cents: number; // Signed integer: positive for debit, negative for credit
    currency: CurrencyCode;
}

/**
 * Validates that an amount is a safe, finite integer.
 */
export function assertValidMoneyCents(cents: number, context = 'Amount'): void {
    if (!Number.isFinite(cents) || !Number.isInteger(cents) || !Number.isSafeInteger(cents)) {
        throw new Error(`${context} must be a safe, finite integer representing minor currency units (cents), received: ${cents}`);
    }
}

/**
 * Adds two Money instances.
 * Tricky logic: Throws error if currencies do not match to prevent accidental cross-currency addition.
 */
export function addMoney(a: Money, b: Money): Money {
    if (a.currency !== b.currency) {
        throw new Error(`Cannot add unlike currencies: ${a.currency} and ${b.currency}. Explicit currency conversion is required.`);
    }
    const sum = a.amount_cents + b.amount_cents;
    assertValidMoneyCents(sum, 'Sum of money');
    return { amount_cents: sum, currency: a.currency };
}

/**
 * Subtracts Money b from Money a.
 */
export function subtractMoney(a: Money, b: Money): Money {
    if (a.currency !== b.currency) {
        throw new Error(`Cannot subtract unlike currencies: ${a.currency} and ${b.currency}. Explicit currency conversion is required.`);
    }
    const diff = a.amount_cents - b.amount_cents;
    assertValidMoneyCents(diff, 'Difference of money');
    return { amount_cents: diff, currency: a.currency };
}

/**
 * Multiplies Money by a ratio or percentage with explicit deterministic rounding.
 * 
 * Why this exists:
 * Ownership shares (e.g. 50% of an asset) or fee splits require fractional calculations.
 * We multiply first and use Math.round to return an exact integer cent.
 */
export function multiplyMoneyRatio(m: Money, ratio: number): Money {
    if (!Number.isFinite(ratio)) {
        throw new Error(`Multiplication ratio must be a finite number, received: ${ratio}`);
    }
    const result = Math.round(m.amount_cents * ratio);
    assertValidMoneyCents(result, 'Multiplied money');
    return { amount_cents: result, currency: m.currency };
}

/**
 * Parses a decimal number or string into exact minor-unit integer cents.
 * Rejects non-numeric, NaN, or non-finite inputs without defaulting to zero.
 */
export function parseToCents(val: number | string, currency: CurrencyCode = 'USD'): number {
    if (val === null || val === undefined || val === '') {
        throw new Error('Monetary value cannot be null, undefined, or empty.');
    }
    const num = typeof val === 'string' ? parseFloat(val.replace(/[$, ]/g, '')) : val;
    if (!Number.isFinite(num)) {
        throw new Error(`Invalid monetary value: "${val}". Value must be a finite number.`);
    }
    const decimals = CURRENCY_DECIMALS[currency] ?? 2;
    const factor = Math.pow(10, decimals);
    const cents = Math.round(num * factor);
    assertValidMoneyCents(cents, `Parsed cents for ${val}`);
    return cents;
}

/**
 * Formats integer cents into a human-readable decimal string with currency symbol.
 */
export function formatMoney(money: Money): string {
    const decimals = CURRENCY_DECIMALS[money.currency] ?? 2;
    const divisor = Math.pow(10, decimals);
    const major = money.amount_cents / divisor;
    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: money.currency,
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals
    }).format(major);
}

/**
 * Converts integer minor-unit cents into a raw numerical string suitable for HTML form inputs.
 * 
 * Why this exists:
 * Form inputs for transaction amounts must display exact values without currency symbols or locale commas.
 * Unconditionally dividing by 100 corrupts zero-decimal currencies like JPY (e.g. 500 JPY divided by 100 becomes 5.00,
 * which when re-parsed becomes 5 JPY!). This function respects CURRENCY_DECIMALS so 500 JPY produces "500" and
 * 1234 AUD produces "12.34".
 * 
 * Tricky logic:
 * - If cents is null or undefined, returns empty string so form inputs stay blank rather than showing "NaN" or "0.00".
 * - If currency is null or undefined, defaults to 2 decimals or integer representation based on value.
 * - For zero-decimal currencies (JPY, decimals === 0), divisor is 10^0 = 1, avoiding fractional decimals.
 * 
 * TODO: Support 3-decimal currencies (BHD, KWD) if international expansions require it.
 */
export function centsToInputString(cents: number | null | undefined, currency?: CurrencyCode | null): string {
    if (cents === null || cents === undefined) {
        return '';
    }
    const decimals = (currency && currency in CURRENCY_DECIMALS) ? CURRENCY_DECIMALS[currency] : 2;
    const divisor = Math.pow(10, decimals);
    const major = cents / divisor;
    return decimals === 0 ? Math.round(major).toString() : major.toFixed(decimals);
}

// --- ENTITIES & OWNERSHIP ---

export type EntityType = 'person' | 'household' | 'business' | 'trust';

export interface Entity {
    id: string;
    name: string;
    type: EntityType;
    currency: CurrencyCode;
    parent_entity_id?: string | null;
    created_at: string;
    updated_at: string;
}

export interface AccountOwnership {
    id: string;
    account_id: string;
    entity_id: string;
    share_percentage: number; // 0 < share_percentage <= 100
    ownership_percentage?: number; // Alias for share_percentage
    created_at: string;
}

// --- ACCOUNTS ---

export type AccountType = 'asset' | 'liability' | 'equity' | 'income' | 'expense' | 'suspense';

export type AccountSubType =
    | 'cash'
    | 'checking'
    | 'savings'
    | 'credit_card'
    | 'mortgage'
    | 'personal_loan'
    | 'auto_loan'
    | 'loan'
    | 'brokerage'
    | 'investment'
    | 'retirement'
    | 'property'
    | 'real_estate'
    | 'land'
    | 'vehicle'
    | 'opening_balance_equity'
    | 'retained_earnings'
    | 'valuation_reserve'
    | 'salary'
    | 'freelance'
    | 'rental_income'
    | 'dividend'
    | 'interest_income'
    | 'living_expense'
    | 'groceries'
    | 'utilities'
    | 'loan_interest'
    | 'bank_fee'
    | 'repairs_maintenance'
    | 'property_management'
    | 'suspense_unreviewed'
    | 'other';

export interface Account {
    id: string;
    entity_id: string;
    name: string;
    type: AccountType;
    sub_type: AccountSubType;
    currency: CurrencyCode;
    is_active: boolean;
    institution?: string | null;
    account_number_mask?: string | null;
    opening_date?: string | null; // YYYY-MM-DD
    opening_balance_cents?: number | null;
    revision: number; // Optimistic concurrency tracking
    created_at: string;
    updated_at: string;
}

// --- TRANSACTIONS & POSTINGS (DOUBLE-ENTRY) ---

export type TransactionStatus = 'draft' | 'posted' | 'void';
export type TransactionOrigin = 'manual' | 'document_extraction' | 'opening_balance' | 'migration' | 'recurring';

export interface Transaction {
    id: string;
    date: string; // YYYY-MM-DD
    description: string;
    payee_or_payer?: string | null;
    status: TransactionStatus;
    origin: TransactionOrigin;
    idempotency_key?: string | null;
    evidence_refs?: string[] | null;
    revision: number;
    created_at: string;
    updated_at: string;
}

/**
 * Record representing an absolute valuation target for an asset account at a specific date.
 * 
 * Why this exists:
 * Assessor Finding 5: When non-cash asset valuations are recorded, users provide the absolute value
 * of the asset as of that date. Storing this target valuation allows the system to recalculate
 * intermediate journal entry deltas when earlier valuations or transactions are inserted,
 * preventing historical regression where later valuations get artificially inflated.
 * 
 * Tricky logic:
 * - When backdated valuations are inserted, subsequent valuation transactions are cascaded
 *   so their journal entries are updated to `target_valuation_cents - priorBalance`, strictly
 *   preserving the recorded target.
 * 
 * TODO: Support automated index / market price valuations in Milestone 2.
 */
export interface AssetValuationRecord {
    id: string;
    transaction_id: string;
    account_id: string;
    valuation_date: string;
    target_valuation_cents: number;
    source?: string | null;
    created_at: string;
}

export interface Posting {
    id: string;
    transaction_id: string;
    account_id: string;
    amount_cents: number; // Signed: positive for Debit, negative for Credit
    currency: CurrencyCode;
    exchange_rate?: number | null;
    rate_unresolved?: boolean;
    memo?: string | null;
}

/**
 * Validates the fundamental double-entry invariant: Sum of postings must equal zero.
 * 
 * Why this exists:
 * Prevents corrupted or lopsided transactions from being committed to the database.
 * Every financial movement must account for where funds originated and where they were applied.
 */
export function validateTransactionBalance(postings: Posting[]): { isValid: boolean; delta_cents: number; currency: CurrencyCode } {
    if (!postings || postings.length < 2) {
        throw new Error('Transaction must contain at least two postings to satisfy double-entry accounting.');
    }

    const primaryCurrency = postings[0].currency;
    let sumCents = 0;

    for (const p of postings) {
        if (p.currency !== primaryCurrency) {
            throw new Error(`Cross-currency postings within a single un-hedged transaction are not supported in Milestone 1: encountered ${p.currency} vs ${primaryCurrency}.`);
        }
        assertValidMoneyCents(p.amount_cents, 'Posting amount');
        sumCents += p.amount_cents;
    }

    return {
        isValid: sumCents === 0,
        delta_cents: sumCents,
        currency: primaryCurrency
    };
}

// --- AUDITABLE CORRECTION TRAILS ---

export interface TransactionCorrection {
    id: string;
    transaction_id: string;
    operation: 'edit' | 'void' | 'reversal' | 'revaluation_cascade';
    reason: string;
    previous_state: string; // JSON snapshot of transaction + postings
    corrected_state: string; // JSON snapshot of new transaction + postings
    performed_by: string;
    timestamp: string;
}

// --- SLICE 1D: REPORTS, OWNERSHIP, CASH FLOW, AND EVIDENCE CONTRACTS ---

/**
 * Structured Evidence Reference (M1-EVID-01)
 * 
 * Why this exists:
 * Provides permanent, auditable provenance links connecting double-entry financial postings
 * back to source documents, page numbers, extracted cells, and bounding boxes.
 * 
 * Tricky logic:
 * Accommodates both raw string references (e.g. "receipt_001.pdf") and full structured metadata objects.
 * 
 * TODO: Integrate direct PDF viewport jump links in Slice 1G document viewer.
 */
export interface StructuredEvidenceRef {
    document_id: string;
    content_hash: string;
    page?: number | null;
    table_or_cell_ref?: string | null;
    bbox?: [number, number, number, number] | null; // [x0, y0, x1, y1]
    extraction_version?: string | null;
    source_url_or_path?: string | null;
    label?: string | null;
}

/**
 * Dated Exchange Rate Representation (M1-CALC-03, T8)
 */
export interface ExchangeRate {
    id: string;
    from_currency: CurrencyCode;
    to_currency: CurrencyCode;
    rate: number;
    effective_date: string; // YYYY-MM-DD
    source: string;
    created_at: string;
}

export type ScopeType = 'individual' | 'household' | 'consolidated';

/**
 * Scope-Aware Balance Item with Joint Ownership Allocation (M1-FLOW-07, T7)
 */
export interface ScopeNetWorthItem {
    account_id: string;
    account_name: string;
    account_type: 'asset' | 'liability';
    sub_type: AccountSubType;
    account_sub_type?: AccountSubType;
    currency: CurrencyCode;
    gross_balance_cents: number;
    ownership_share_percentage: number;
    ownership_percentage?: number;
    attributed_balance_cents: number;
    formatted_attributed_balance: string;
    formatted_scoped_balance?: string;
    formatted_full_balance?: string;
    primary_entity_id: string;
    is_joint: boolean;
}

/**
 * Scope-Aware Net Worth Report Result (M1-CALC-01, M1-CALC-02, T7)
 */
export interface ScopeNetWorthResult {
    scope_type: ScopeType;
    target_entity_id: string;
    entity_name: string;
    as_of_date: string;
    member_entities?: Array<{ id: string; name: string; type: string }>;
    net_worth_cents_by_currency: Record<CurrencyCode, number>;
    total_assets_cents_by_currency: Record<CurrencyCode, number>;
    total_liabilities_cents_by_currency: Record<CurrencyCode, number>;
    formatted_net_worth_by_currency: Record<CurrencyCode, string>;
    scoped_net_worth_cents_by_currency?: Record<CurrencyCode, number>;
    scoped_assets_cents_by_currency?: Record<CurrencyCode, number>;
    scoped_liabilities_cents_by_currency?: Record<CurrencyCode, number>;
    formatted_scoped_net_worth_by_currency?: Record<CurrencyCode, string>;
    items: ScopeNetWorthItem[];
    calculation_version: string;
}

/**
 * Multi-Currency Consolidated Net Worth with Completeness Verification (M1-CALC-03, T8)
 * 
 * Why this exists:
 * Reports personal net worth consolidated into a target reporting currency.
 * Consumes the exact ownership-scoped totals from getScopeNetWorth to guarantee consistency.
 */
export interface ConsolidatedNetWorthResult {
    reporting_currency: CurrencyCode;
    scope_type?: ScopeType;
    target_entity_id?: string;
    is_complete: boolean;
    missing_rates: Array<{ from: CurrencyCode; to: CurrencyCode; date: string }>;
    consolidated_total_cents?: number | null;
    formatted_consolidated_total?: string | null;
    original_totals_by_currency: Record<CurrencyCode, number>;
    formatted_original_by_currency: Record<CurrencyCode, string>;
    applied_exchange_rates?: Record<string, number>;
    as_of_date: string;
    calculation_version: string;
}

export type CashFlowActivityType = 'operating' | 'financing' | 'investing' | 'transfer';

/**
 * Cash Flow Item (Liquid Cash Movements Only)
 */
export interface CashFlowItem {
    transaction_id: string;
    date: string;
    description: string;
    payee_or_payer?: string | null;
    activity_type: CashFlowActivityType;
    cash_account_id: string;
    cash_account_name: string;
    amount_cents: number; // Signed integer: positive = Inflow, negative = Outflow
    currency: CurrencyCode;
    formatted_amount: string;
}

/**
 * Actual Cash Flow Statement (M1-FLOW-02, M1-FLOW-04, M1-FLOW-05)
 * 
 * Why this exists:
 * Strictly separates liquid cash asset movements from accrual revenue and cost recognition.
 * Credit card purchases are not cash flows; debt repayments and cash settlements are.
 * Independently reconciles reported closing cash with double-entry ledger closing cash.
 */
export interface CashFlowStatementResult {
    entity_id: string;
    start_date?: string;
    end_date?: string;
    operating_inflows_cents_by_currency: Record<CurrencyCode, number>;
    operating_outflows_cents_by_currency: Record<CurrencyCode, number>;
    net_operating_cents_by_currency: Record<CurrencyCode, number>;
    financing_inflows_cents_by_currency?: Record<CurrencyCode, number>;
    financing_outflows_cents_by_currency: Record<CurrencyCode, number>;
    net_financing_cents_by_currency?: Record<CurrencyCode, number>;
    investing_inflows_cents_by_currency?: Record<CurrencyCode, number>;
    investing_outflows_cents_by_currency?: Record<CurrencyCode, number>;
    net_investing_cents_by_currency?: Record<CurrencyCode, number>;
    net_cash_change_cents_by_currency: Record<CurrencyCode, number>;
    starting_cash_cents_by_currency: Record<CurrencyCode, number>;
    ending_cash_cents_by_currency: Record<CurrencyCode, number>;
    ledger_closing_cash_cents_by_currency?: Record<CurrencyCode, number>;
    is_reconciled_by_currency?: Record<CurrencyCode, boolean>;
    reconciliation_discrepancy_cents_by_currency?: Record<CurrencyCode, number>;
    formatted_net_cash_change_by_currency: Record<CurrencyCode, string>;
    formatted_ending_cash_by_currency: Record<CurrencyCode, string>;
    items: CashFlowItem[];
    calculation_version: string;
}


/**
 * Chronological Ledger Drill-Down with Running Balance & Evidence Provenance (M1-EVID-01, M1-EVID-02)
 */
export interface LedgerEntryDrilldownItem {
    posting_id: string;
    transaction_id: string;
    date: string;
    description: string;
    payee_or_payer?: string | null;
    account_id: string;
    account_name: string;
    account_type: AccountType;
    amount_cents: number; // Signed: positive debit, negative credit
    currency: CurrencyCode;
    running_balance_cents: number;
    formatted_amount: string;
    formatted_running_balance: string;
    memo?: string | null;
    origin: TransactionOrigin;
    evidence_refs: any[];
}

export interface AccountLedgerDrilldownResult {
    account_id: string;
    account_name: string;
    account_type: AccountType;
    currency: CurrencyCode;
    start_date?: string;
    end_date?: string;
    opening_balance_cents: number;
    closing_balance_cents: number;
    formatted_opening_balance: string;
    formatted_closing_balance: string;
    entries: LedgerEntryDrilldownItem[];
    calculation_version: string;
}

/**
 * Authoritative Draft Record for Unresolved Financial Activity (e.g. Personally Paid Business Expense).
 * 
 * Why this exists:
 * Financial drafts must not live solely in browser localStorage or overload payer concepts into a single ID.
 * Unambiguously differentiates between the payer entity (person) and the payment account.
 * Allows missing facts (currency, amount, date) to remain explicitly unresolved without fabricating zeroes.
 * Completely excluded from posted double-entry ledgers and balances until finalized.
 * 
 * Tricky logic:
 * - `payer_entity_id` references the person/entity who incurred the cost.
 * - `payment_account_id` references the specific bank/card account if chosen, or null if unknown.
 * - `amount_cents` is stored in exact minor units (integer cents), or null if unresolved.
 * 
 * TODO: Support multi-leg draft splits across multiple business cost centres in Milestone 2.
 */
export interface DraftItem {
    id: string;
    entity_id?: string | null; // Business entity
    payer_entity_id?: string | null; // Person who paid
    payment_account_id?: string | null; // Specific payment account if known
    currency?: CurrencyCode | null;
    amount_cents?: number | null; // Minor units integer
    date?: string | null; // YYYY-MM-DD
    merchant?: string | null;
    description?: string | null;
    reimbursement_intent?: 'yes' | 'no' | 'not_sure' | null;
    source_document_id?: string | null;
    source_transaction_id?: string | null;
    status: 'draft' | 'posted' | 'void' | 'archived';
    created_at: string;
    updated_at: string;
}

