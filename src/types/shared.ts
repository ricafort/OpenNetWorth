import { Asset } from '@/features/assets/types';
import { Liability } from '@/features/liabilities/types';

/**
 * Point-in-time snapshot of net worth.
 * Used for historical charts and Time Machine.
 */
export interface NetWorthSnapshot {
    id: string; // Added for DataService compatibility
    /** ISO date string */
    date: string;
    netWorth: number;
    totalAssets: number;
    totalLiabilities: number;
    /** Optional: detailed breakdown at this moment */
    assets?: Asset[];
    liabilities?: Liability[];
}
