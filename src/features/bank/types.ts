// Why this file exists:
// Universal interface definitions for multi-provider bank integration in ClearWorth.
// Standardizes bank accounts, transactions, and authentication flows across Plaid (US/Global) and Basiq (Australia).

export type ClearWorthCategory =
    | 'Income'
    | 'Transfer'
    | 'Groceries'
    | 'Transportation'
    | 'Housing'
    | 'Utilities'
    | 'Dining'
    | 'Shopping'
    | 'Entertainment'
    | 'Health'
    | 'Education'
    | 'Investments'
    | 'Debt'
    | 'Other';

export interface BankConnectionResult {
    originalItemId: string; // Provider's Item ID or Connection ID
    accessToken: string;    // The secret access token or connection ID
    provider: 'plaid' | 'basiq' | 'brankas';
    /** 'widget' = open Plaid-style iframe modal. 'redirect' = redirect user to external Auth URL (Basiq) */
    linkType?: 'widget' | 'redirect';
}

/** Returned by createLinkToken — context tells the client UI how to handle the connection flow */
export interface LinkTokenResult {
    link_token: string;
    /** If 'redirect', the link_token IS the URL to redirect the user to */
    mode: 'plaid_link' | 'redirect';
}

export interface UnifiedAccount {
    id: string;             // Provider Account ID
    name: string;
    mask: string | null;
    type: 'checking' | 'savings' | 'credit' | 'loan' | 'investment' | 'other';
    balance: number;
    currency: string;
}

export interface UnifiedTransaction {
    id: string;             // Provider Transaction ID
    accountId: string;
    amount: number;         // Signed: Positive = Income/Refund, Negative = Expense/Spending
    currency: string;
    date: string;           // ISO 8601 YYYY-MM-DD
    description: string;
    merchantName?: string | null;
    category: ClearWorthCategory;
    rawCategory?: string;   // For debugging
    pending: boolean;
}

export interface UniversalBankConnector {
    // 1. Auth Flow
    // Why mobile is optional: Plaid doesn't need it. Basiq requires it for SMS OTP — collected via UI modal.
    createLinkToken(userId: string, mobile?: string): Promise<string>;
    exchangePublicToken(publicToken: string): Promise<BankConnectionResult>;

    // 2. Data Fetching
    getAccounts(accessToken: string): Promise<UnifiedAccount[]>;
    getTransactions(accessToken: string, startDate: Date, endDate?: Date): Promise<UnifiedTransaction[]>;
}

// --- Database Types (Linked items & Bank accounts in Supabase) ---
export interface LinkedItemRow {
    id: string;
    user_id: string;
    access_token: string;
    item_id: string;
    provider: string;
    status: string;
    institution_id?: string;
    institution_name?: string;
    created_at: string;
    updated_at: string;
}

export interface BankAccountRow {
    id: string;
    linked_item_id: string;
    user_id: string;
    name: string;
    mask: string | null;
    type: string;
    current_balance: number;
    currency: string;
    last_updated: string;
}
