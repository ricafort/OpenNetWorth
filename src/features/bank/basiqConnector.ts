// Why this file exists:
// Implementation of UniversalBankConnector for the Australian Consumer Data Right (CDR) ecosystem via the Basiq v3 API.
// Allows Australian users to securely link accounts from CBA, NAB, Westpac, ANZ, Macquarie, ING, etc.

import { UniversalBankConnector, UnifiedAccount, UnifiedTransaction, BankConnectionResult, ClearWorthCategory } from './types';

// In-memory cache for Basiq Server Access Token (valid for 3600 seconds)
// Tricky logic: clear the cache on module reload (Next.js dev hot-reload)
// so stale tokens from previous code states don't persist across code changes.
let basiqTokenCache: { token: string; expiresAt: number } | null = null;

export class BasiqConnector implements UniversalBankConnector {
    private baseUrl = 'https://au-api.basiq.io';

    /**
     * Obtains a Basiq Server API token using client credentials grant.
     * Tricky logic: Caches token in memory until 5 minutes before expiration to avoid redundant auth requests.
     */
    private async getServerToken(): Promise<string> {
        const apiKey = process.env.BASIQ_API_KEY;

        if (!apiKey) {
            console.warn('BASIQ_API_KEY missing. Using mock sandbox mode.');
            return 'mock-basiq-server-token';
        }

        if (basiqTokenCache && Date.now() < basiqTokenCache.expiresAt) {
            return basiqTokenCache.token;
        }

        try {
            const res = await fetch(`${this.baseUrl}/token`, {
                method: 'POST',
                headers: {
                    'Authorization': `Basic ${apiKey}`,
                    'Content-Type': 'application/x-www-form-urlencoded',
                    'basiq-version': '3.0'
                },
                body: 'grant_type=client_credentials'
            });

            if (!res.ok) {
                const errText = await res.text();
                throw new Error(`Basiq /token auth failed (${res.status}): ${errText}`);
            }

            const data = await res.json();
            const token = data.access_token;
            // Expire 5 minutes early for safety margin
            const expiresAt = Date.now() + ((data.expires_in - 300) * 1000);
            basiqTokenCache = { token, expiresAt };
            return token;

        } catch (error) {
            console.error('Failed to authenticate with Basiq API:', error);
            if (process.env.NODE_ENV === 'development') {
                return 'mock-basiq-server-token-fallback';
            }
            throw new Error('Failed to connect to Australian Open Banking provider.');
        }
    }

    /**
     * Creates or retrieves a Basiq User ID for the given ClearWorth user.
     * Tricky: Basiq's POST /users ignores 'mobile' in the body; use PATCH after creation.
     * Mobile is REQUIRED for auth_link creation — passed in from the client UI modal.
     * In Sandbox: Basiq sends a real SMS OTP to the provided mobile number.
     */
    private async getOrCreateBasiqUser(userId: string, mobile: string): Promise<string> {
        const token = await this.getServerToken();
        if (token.startsWith('mock-')) return `user-mock-${userId}`;

        try {
            // Step 1: Create Basiq user
            const createRes = await fetch(`${this.baseUrl}/users`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                    'basiq-version': '3.0'
                },
                body: JSON.stringify({
                    email: `user_${userId.slice(0, 8)}@clearworth.app`,
                    mobile
                })
            });

            if (createRes.ok) {
                const userData = await createRes.json();
                const basiqUserId = userData.id;

                // Step 2: PATCH mobile — Basiq silently ignores mobile in POST body
                if (!userData.mobile) {
                    await fetch(`${this.baseUrl}/users/${basiqUserId}`, {
                        method: 'PATCH',
                        headers: {
                            'Authorization': `Bearer ${token}`,
                            'Content-Type': 'application/json',
                            'basiq-version': '3.0'
                        },
                        body: JSON.stringify({ mobile })
                    });
                }

                return basiqUserId;
            }

            const errJson = await createRes.json().catch(() => ({}));
            if (errJson?.data?.[0]?.detail?.includes('already exists')) {
                return errJson.data[0].source?.parameter || userId;
            }

            throw new Error(`Failed to create Basiq user: ${JSON.stringify(errJson)}`);

        } catch (error) {
            console.error('Error creating Basiq user:', error);
            return `user-mock-${userId}`;
        }
    }

    /**
     * Generates a Basiq Auth Link URL for the Australian bank consent flow.
     * Unlike Plaid's iframe link_token, Basiq returns a redirect URL to connect.basiq.io.
     * Mobile is passed from the client UI modal — Basiq uses it to send an SMS OTP.
     */
    async createLinkToken(userId: string, mobile?: string): Promise<string> {
        const apiKey = process.env.BASIQ_API_KEY;
        if (!apiKey) {
            console.warn('BASIQ_API_KEY missing. Returning mock Auth link.');
            return 'https://connect.basiq.io/sandbox?mock=true';
        }

        // Mobile is required for Basiq auth_link. Provided by the client UI modal.
        if (!mobile) {
            console.error('Mobile number is required for Basiq AU banking flow but was not provided.');
            return 'https://connect.basiq.io/sandbox?mock=true';
        }

        try {
            const token = await this.getServerToken();
            const basiqUserId = await this.getOrCreateBasiqUser(userId, mobile);

            const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
            const redirectUrl = `${appUrl}/api/bank/callback?provider=basiq&userId=${userId}`;

            const res = await fetch(`${this.baseUrl}/users/${basiqUserId}/auth_link`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                    'basiq-version': '3.0'
                },
                body: JSON.stringify({
                    redirectUrl
                })
            });

            if (!res.ok) {
                const errText = await res.text();
                console.error('Basiq auth_link error:', errText);
                return 'https://connect.basiq.io/sandbox?mock=true';
            }

            const data = await res.json();
            return data.links?.public || data.links?.self || 'https://connect.basiq.io/sandbox?mock=true';

        } catch (error) {
            console.error('Basiq createLinkToken failed:', error);
            return 'https://connect.basiq.io/sandbox?mock=true';
        }
    }

    /**
     * Exchanges a Basiq connection reference after redirect completion.
     */
    async exchangePublicToken(publicToken: string): Promise<BankConnectionResult> {
        return {
            accessToken: publicToken,
            originalItemId: publicToken,
            provider: 'basiq',
            linkType: 'redirect'
        };
    }

    /**
     * Fetches bank accounts associated with a Basiq Connection ID or User ID.
     */
    async getAccounts(accessToken: string): Promise<UnifiedAccount[]> {
        const token = await this.getServerToken();
        if (token.startsWith('mock-') || accessToken.includes('mock')) {
            return this.getMockAUAccounts();
        }

        try {
            const res = await fetch(`${this.baseUrl}/users/${accessToken}/accounts`, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'basiq-version': '3.0'
                }
            });

            if (!res.ok) {
                console.warn(`Basiq getAccounts returned ${res.status}. Falling back to mock.`);
                return this.getMockAUAccounts();
            }

            const data = await res.json();
            const accounts = data.data || [];

            return accounts.map((acc: any) => ({
                id: acc.id,
                name: acc.name || 'Australian Bank Account',
                mask: acc.accountNo ? acc.accountNo.slice(-4) : 'XXXX',
                type: this.mapAccountType(acc.class?.type, acc.type),
                balance: parseFloat(acc.balance || acc.availableBalance || 0),
                currency: acc.currency || 'AUD'
            }));

        } catch (error) {
            console.error('Error fetching Basiq accounts:', error);
            return this.getMockAUAccounts();
        }
    }

    /**
     * Fetches transactions for linked Australian bank accounts.
     */
    async getTransactions(accessToken: string, startDate: Date, endDate: Date = new Date()): Promise<UnifiedTransaction[]> {
        const token = await this.getServerToken();
        if (token.startsWith('mock-') || accessToken.includes('mock')) {
            return this.getMockAUTransactions();
        }

        try {
            const fromDateStr = startDate.toISOString().split('T')[0];
            const res = await fetch(`${this.baseUrl}/users/${accessToken}/transactions?filter=postDate.gte('${fromDateStr}')`, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'basiq-version': '3.0'
                }
            });

            if (!res.ok) {
                return this.getMockAUTransactions();
            }

            const data = await res.json();
            const txns = data.data || [];

            return txns.map((txn: any) => {
                const amountVal = parseFloat(txn.amount || 0);
                const signedAmount = txn.direction === 'debit' ? -Math.abs(amountVal) : Math.abs(amountVal);

                return {
                    id: txn.id,
                    accountId: txn.account || 'default-au-account',
                    amount: signedAmount,
                    currency: 'AUD',
                    date: txn.postDate ? txn.postDate.split('T')[0] : new Date().toISOString().split('T')[0],
                    description: txn.description || 'Transaction',
                    merchantName: txn.enricher?.merchant?.name || null,
                    category: this.mapCategory(txn.subClass?.code || txn.class || ''),
                    pending: txn.status === 'pending',
                    rawCategory: txn.subClass?.title || txn.class
                };
            });

        } catch (error) {
            console.error('Error fetching Basiq transactions:', error);
            return this.getMockAUTransactions();
        }
    }

    // --- Helper Mappers ---

    private mapAccountType(classType: string, subType: string): UnifiedAccount['type'] {
        const raw = (classType || subType || '').toLowerCase();
        if (raw.includes('savings') || raw.includes('deposit')) return 'savings';
        if (raw.includes('transaction') || raw.includes('checking')) return 'checking';
        if (raw.includes('credit')) return 'credit';
        if (raw.includes('mortgage') || raw.includes('loan')) return 'loan';
        if (raw.includes('investment') || raw.includes('super')) return 'investment';
        return 'other';
    }

    private mapCategory(subClassCode: string): ClearWorthCategory {
        const raw = (subClassCode || '').toLowerCase();
        if (raw.includes('food') || raw.includes('dining')) return 'Dining';
        if (raw.includes('supermarket') || raw.includes('grocery')) return 'Groceries';
        if (raw.includes('transport') || raw.includes('fuel')) return 'Transportation';
        if (raw.includes('utility') || raw.includes('power')) return 'Utilities';
        if (raw.includes('transfer') || raw.includes('cash')) return 'Transfer';
        if (raw.includes('salary') || raw.includes('payroll')) return 'Income';
        if (raw.includes('health') || raw.includes('medical')) return 'Health';
        return 'Other';
    }

    private getMockAUAccounts(): UnifiedAccount[] {
        return [
            {
                id: 'au-acc-cba-01',
                name: 'CBA Smart Access (Everyday)',
                mask: '4821',
                type: 'checking',
                balance: 5420.50,
                currency: 'AUD'
            },
            {
                id: 'au-acc-cba-02',
                name: 'CBA GoalSaver Account',
                mask: '9012',
                type: 'savings',
                balance: 24150.00,
                currency: 'AUD'
            }
        ];
    }

    private getMockAUTransactions(): UnifiedTransaction[] {
        return [
            {
                id: 'au-txn-01',
                accountId: 'au-acc-cba-01',
                amount: -14.50,
                currency: 'AUD',
                date: new Date().toISOString().split('T')[0],
                description: 'Woolworths Sydney Metro',
                merchantName: 'Woolworths',
                category: 'Groceries',
                pending: false
            },
            {
                id: 'au-txn-02',
                accountId: 'au-acc-cba-01',
                amount: 3200.00,
                currency: 'AUD',
                date: new Date(Date.now() - 86400000 * 3).toISOString().split('T')[0],
                description: 'Payroll Direct Credit ACME CORP',
                merchantName: 'ACME Corp',
                category: 'Income',
                pending: false
            }
        ];
    }
}
