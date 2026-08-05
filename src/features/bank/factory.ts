// Why this file exists:
// Bank Connector Factory pattern. Routes bank linking requests to the appropriate region-specific Open Banking connector.
// Routes Australian traffic (AU) to Basiq (CDR standard) and US/EU/Global traffic to Plaid.

import { UniversalBankConnector } from './types';
import { PlaidConnector } from './plaidConnector';
import { BasiqConnector } from './basiqConnector';

export function getBankConnector(countryCode: string = 'US'): UniversalBankConnector {
    const code = countryCode.toUpperCase().trim();

    // Australian Consumer Data Right (CDR) -> Basiq API
    if (code === 'AU') {
        return new BasiqConnector();
    }

    // Philippines -> Brankas (TODO: Implement BrankasConnector when expanded to SEA)
    if (code === 'PH') {
        return new PlaidConnector(); // Fallback
    }

    // Default to Plaid (US, Canada, UK, Europe)
    return new PlaidConnector();
}
