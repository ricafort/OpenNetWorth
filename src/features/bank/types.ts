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
    originalItemId: string; // Provider's Item ID
    accessToken: string;    // The secret token
    provider: 'plaid' | 'basiq' | 'brankas';
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
    amount: number;         // Positive for spending? Or signed? (Usually signed: - for spending)
    // Standardization: Positive = Money IN, Negative = Money OUT? 
    // Or Convention: "Amount" of transaction. 
    // Let's stick to Plaid convention for now but mapped: Positive = Positive value in DB.
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
    createLinkToken(userId: string): Promise<string>;
    exchangePublicToken(publicToken: string): Promise<BankConnectionResult>;

    // 2. Data Fetching
    getAccounts(accessToken: string): Promise<UnifiedAccount[]>;
    getTransactions(accessToken: string, startDate: Date, endDate?: Date): Promise<UnifiedTransaction[]>;

    // 3. Maintenance
    // refreshConnection(accessToken: string): Promise<void>; // Not needed for MVP
}

// --- Database Types (Missing from Generated Types) ---
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
