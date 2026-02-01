import { UniversalBankConnector } from './types';
import { PlaidConnector } from './plaidConnector';
// import { BasiqConnector } from './basiqConnector'; // Future
// import { BrankasConnector } from './brankasConnector'; // Future

export function getBankConnector(countryCode: string = 'US'): UniversalBankConnector {
    // Basic routing logic
    const code = countryCode.toUpperCase();

    if (code === 'AU') {
        // return new BasiqConnector();
        // Fallback for now until implemented
        console.warn('Basiq Connector not yet implemented, falling back to Plaid (or throwing error)');
        return new PlaidConnector();
    }

    if (code === 'PH') {
        // return new BrankasConnector();
        return new PlaidConnector(); // Fallback
    }

    // Default to Plaid (US/EU/Global)
    return new PlaidConnector();
}
