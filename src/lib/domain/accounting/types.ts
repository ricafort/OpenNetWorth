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
    | 'brokerage'
    | 'retirement'
    | 'property'
    | 'vehicle'
    | 'opening_balance_equity'
    | 'retained_earnings'
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
    operation: 'edit' | 'void' | 'reversal';
    reason: string;
    previous_state: string; // JSON snapshot of transaction + postings
    corrected_state: string; // JSON snapshot of new transaction + postings
    performed_by: string;
    timestamp: string;
}
