/**
 * Why this file exists:
 * Single source of truth for turning a recurring schedule's per-occurrence
 * amount into a monthly amount. The same factors drive Autopilot postings
 * (autopilotGenerator.ts), the Wealth Momentum projection, and the cash-flow
 * forecast — they must agree, or the forecast would predict cash movements
 * the ledger never books.
 *
 * It lives in the domain layer because `local_driver.ts` (its former home) is
 * browser-only and cannot be imported by server-side domain services;
 * `local_driver.ts` now re-exports this function so existing importers are
 * unchanged.
 *
 * Semantics (do not "fix" the factors — they are the app's convention):
 * weekly ×4.33, biweekly ×2.17, monthly ×1, quarterly ÷3, yearly ÷12;
 * an unknown frequency falls back to ×1 (treated as monthly).
 */

export const FREQUENCY_MONTHLY_FACTORS: Readonly<Record<string, number>> = {
    weekly: 4.33,
    biweekly: 2.17,
    monthly: 1,
    quarterly: 1 / 3,
    yearly: 1 / 12
};

export function toMonthlyAmount(amount: number, frequency: string): number {
    switch (frequency) {
        case 'weekly': return amount * 4.33;
        case 'biweekly': return amount * 2.17;
        case 'monthly': return amount;
        case 'quarterly': return amount / 3;
        case 'yearly': return amount / 12;
        default: return amount;
    }
}

/**
 * Autopilot snake_cases schedule categories; budgets are free text — compare normalized.
 * Shared by the cash-flow forecast (debt-vs-schedule coverage check) and the debt
 * autopilot client generator; both must normalize identically or 'Debt Repayment'
 * schedules would fail to match the 'debt_repayment' convention.
 */
export function normalizeCategory(value: string | null | undefined): string {
    return (value || '').trim().toLowerCase().replace(/\s+/g, '_');
}
