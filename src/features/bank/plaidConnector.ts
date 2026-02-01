import { Configuration, PlaidApi, PlaidEnvironments, CountryCode, Products } from 'plaid';
import { UniversalBankConnector, UnifiedAccount, UnifiedTransaction, BankConnectionResult, ClearWorthCategory } from './types';

export class PlaidConnector implements UniversalBankConnector {
    private client: PlaidApi;

    constructor() {
        const configuration = new Configuration({
            basePath: PlaidEnvironments[process.env.PLAID_ENV || 'sandbox'],
            baseOptions: {
                headers: {
                    'PLAID-CLIENT-ID': process.env.PLAID_CLIENT_ID || '',
                    'PLAID-SECRET': process.env.PLAID_SECRET || '',
                },
            },
        });
        this.client = new PlaidApi(configuration);
    }

    async createLinkToken(userId: string): Promise<string> {
        // SAFEGUARD: Check if credentials exist
        if (!process.env.PLAID_CLIENT_ID || !process.env.PLAID_SECRET) {
            console.warn("Plaid credentials missing. Using MOCK link token.");
            return 'link-sandbox-mock-token';
        }

        try {
            const response = await this.client.linkTokenCreate({
                user: { client_user_id: userId },
                client_name: 'ClearWorth',
                products: [Products.Transactions],
                country_codes: [CountryCode.Us],
                language: 'en',
            });
            return response.data.link_token;
        } catch (error: any) {
            console.error("Plaid createLinkToken failed:", error.response?.data || error.message);
            // Fallback to mock to prevent crash in Dev
            if (process.env.NODE_ENV === 'development') {
                return 'link-sandbox-mock-token-fallback';
            }
            throw new Error("Failed to initialize bank link. Please try again later.");
        }
    }

    async exchangePublicToken(publicToken: string): Promise<BankConnectionResult> {
        const response = await this.client.itemPublicTokenExchange({
            public_token: publicToken,
        });
        return {
            accessToken: response.data.access_token,
            originalItemId: response.data.item_id,
            provider: 'plaid'
        };
    }

    async getAccounts(accessToken: string): Promise<UnifiedAccount[]> {
        const response = await this.client.accountsGet({
            access_token: accessToken,
        });

        return response.data.accounts.map(acc => ({
            id: acc.account_id,
            name: acc.name,
            mask: acc.mask || null,
            type: this.mapAccountType(acc.type, acc.subtype),
            balance: acc.balances.current || 0,
            currency: acc.balances.iso_currency_code || 'USD'
        }));
    }

    async getTransactions(accessToken: string, startDate: Date, endDate: Date = new Date()): Promise<UnifiedTransaction[]> {
        const response = await this.client.transactionsGet({
            access_token: accessToken,
            start_date: startDate.toISOString().split('T')[0],
            end_date: endDate.toISOString().split('T')[0],
        });

        return response.data.transactions.map(txn => ({
            id: txn.transaction_id,
            accountId: txn.account_id,
            amount: txn.amount, // Plaid: Positive = request for money (spending), Negative = refund/deposit.
            currency: txn.iso_currency_code || 'USD',
            date: txn.date,
            description: txn.name,
            merchantName: txn.merchant_name || null,
            category: this.mapCategory(txn.category || [], txn.personal_finance_category?.primary),
            pending: txn.pending,
            rawCategory: txn.category ? txn.category.join('/') : ''
        }));
    }

    // --- Helpers ---

    private mapAccountType(type: string, subtype: any): UnifiedAccount['type'] {
        if (type === 'depository') return 'checking'; // simplify
        if (type === 'credit') return 'credit';
        if (type === 'loan') return 'loan';
        if (type === 'investment') return 'investment';
        return 'other';
    }

    private mapCategory(categories: string[], primary?: string): ClearWorthCategory {
        // 1. Try simple mapping from our Master Guide
        const raw = (primary || categories[0] || '').toLowerCase();

        if (raw.includes('taxi') || raw.includes('uber') || raw.includes('transport')) return 'Transportation';
        if (raw.includes('food') || raw.includes('restaurant') || raw.includes('dining')) return 'Dining';
        if (raw.includes('supermarket') || raw.includes('grocery')) return 'Groceries';
        if (raw.includes('utility') || raw.includes('electric') || raw.includes('water')) return 'Utilities';
        if (raw.includes('transfer') || raw.includes('payment')) return 'Transfer';
        if (raw.includes('income') || raw.includes('payroll')) return 'Income';

        return 'Other';
    }
}
