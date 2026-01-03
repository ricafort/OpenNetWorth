import { CurrencyCode } from '@/types';

export const SUPPORTED_CURRENCIES: { code: CurrencyCode; symbol: string; name: string }[] = [
    { code: 'USD', symbol: '$', name: 'US Dollar' },
    { code: 'EUR', symbol: '€', name: 'Euro' },
    { code: 'GBP', symbol: '£', name: 'British Pound' },
    { code: 'JPY', symbol: '¥', name: 'Japanese Yen' },
    { code: 'CAD', symbol: 'C$', name: 'Canadian Dollar' },
    { code: 'AUD', symbol: 'A$', name: 'Australian Dollar' },
    { code: 'CHF', symbol: 'Fr', name: 'Swiss Franc' },
    { code: 'CNY', symbol: '¥', name: 'Chinese Yuan' },
    { code: 'INR', symbol: '₹', name: 'Indian Rupee' },
    { code: 'SGD', symbol: 'S$', name: 'Singapore Dollar' },
    { code: 'PHP', symbol: '₱', name: 'Philippine Peso' },
    { code: 'KRW', symbol: '₩', name: 'South Korean Won' },
];

// Mock Exchange Rates (Base: USD)
// In a real app, fetch these from an API
const EXCHANGE_RATES: Record<CurrencyCode, number> = {
    'USD': 1.00,
    'EUR': 0.92,  // 1 USD = 0.92 EUR
    'GBP': 0.79,  // 1 USD = 0.79 GBP
    'JPY': 151.5, // 1 USD = 151.5 JPY
    'CAD': 1.36,  // 1 USD = 1.36 CAD
    'AUD': 1.54,  // 1 USD = 1.54 AUD
    'CHF': 0.91,  // 1 USD = 0.91 CHF
    'CNY': 7.24,  // 1 USD = 7.24 CNY
    'INR': 83.5,  // 1 USD = 83.5 INR
    'SGD': 1.35,  // 1 USD = 1.35 SGD
    'PHP': 56.5,   // 1 USD = 56.5 PHP
    'KRW': 1380.0  // 1 USD = ~1380 KRW
};

/**
 * Calculates the exchange rate between two currencies via USD as the base.
 * Formula: Target Rate / Source Rate
 */
export const getExchangeRate = (from: CurrencyCode, to: CurrencyCode): number => {
    const fromRate = EXCHANGE_RATES[from] || 1;
    const toRate = EXCHANGE_RATES[to] || 1;

    // Convert to USD first (From / Rate), then to Target (USD * Rate)
    // Formula: (1 / fromRate) * toRate
    return toRate / fromRate;
};

/**
 * Converts an amount from one currency to another.
 * @param amount The value to convert
 * @param from Source Currency Code
 * @param to Target Currency Code
 */
export const convertAmount = (amount: number, from: CurrencyCode, to: CurrencyCode): number => {
    if (from === to) return amount;
    const rate = getExchangeRate(from, to);
    return amount * rate;
};

/**
 * Formats a number as a currency string.
 * @param amount The number to format
 * @param currency The currency code (e.g., 'USD', 'PHP')
 * @param locale The locale string (default 'en-US')
 */
export const formatCurrency = (amount: number, currency: CurrencyCode, locale: string = 'en-US'): string => {
    return new Intl.NumberFormat(locale, {
        style: 'currency',
        currency: currency,
        maximumFractionDigits: 0
    }).format(amount);
};

/**
 * Returns the currency symbol for a given currency code.
 * @param currency The currency code
 */
export const getCurrencySymbol = (currency: CurrencyCode): string => {
    return SUPPORTED_CURRENCIES.find(c => c.code === currency)?.symbol || '$';
};
