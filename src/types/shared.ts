import { Asset } from '@/features/assets/types';
import { Liability } from '@/features/liabilities/types';
import { CurrencyCode } from '@/types';

/**
 * Point-in-time snapshot of net worth.
 * Used for historical charts and Time Machine.
 * 
 * Why currency exists:
 * Historical snapshots recorded in USD must not be masqueraded as AUD or EUR upon switching display currency.
 * Tricky logic:
 * Legacy snapshots recorded prior to multi-currency tracking lack currency metadata (currency is undefined).
 * When undefined, comparison against current display currencies must be suppressed.
 * TODO: Support automated historical revaluation against dated exchange rates in Milestone 2.
 */
export interface NetWorthSnapshot {
    id: string; // Added for DataService compatibility
    /** ISO date string */
    date: string;
    netWorth: number;
    totalAssets: number;
    totalLiabilities: number;
    currency?: CurrencyCode;
    /** Optional: detailed breakdown at this moment */
    assets?: Asset[];
    liabilities?: Liability[];
}
