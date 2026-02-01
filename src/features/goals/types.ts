import { CurrencyCode } from '@/types';

export type GoalCategory = 'net_worth' | 'savings' | 'debt_payoff' | 'custom';

export interface Goal {
    id: string;
    user_id?: string;
    name: string;
    target_amount: number;
    current_amount: number;
    currency?: CurrencyCode; // Default 'USD'
    start_amount?: number;  // Initial amount when goal was created (crucial for debt payoff progress)
    deadline?: string | null;     // ISO date
    category: GoalCategory;
    is_completed?: boolean; // Added for tracking status
    last_updated?: string;  // Added for sync tracking
    created_at: string;
}
