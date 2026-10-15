import { CurrencyCode } from './currency';

/**
 * Local vault owner profile (profiles table).
 */
export interface UserProfile {
    /** Profile id — 'local_user' for the device owner */
    id: string;
    email: string;
    full_name?: string;
    avatar_url?: string;
    /** When true, sensitive values may be hidden in UI */
    privacy_mode: boolean;
    /** If true, this is a demo/template profile (not a real user) */
    is_template: boolean;
    /** 'admin' users can manage templates */
    role: 'user' | 'admin';
    /** Display name for template profiles (e.g., "UK Starter") */
    template_name?: string;
    /** ISO 3166-1 alpha-2 (e.g., 'US', 'GB') */
    country_code?: string;
    /** Base currency for all financial displays */
    currency_code: CurrencyCode;
    /** Links to economic benchmarks (e.g., 'p50') */
    benchmark_bracket?: string;
    /** Display string like "$45k - $135k" */
    income_range_display?: string;
    created_at: string;
}

export interface UserSettings {
    baseCurrency: CurrencyCode;
    theme: 'light' | 'stealth' | 'system';
    checkInFrequency: 'weekly' | 'biweekly' | 'monthly';
    lastCheckIn?: string; // ISO Date
}
