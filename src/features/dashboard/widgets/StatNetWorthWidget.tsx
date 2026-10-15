import WidgetWrapper from './WidgetWrapper';
import StatCard from '@/features/dashboard/components/StatCard';
import { Wallet } from 'lucide-react';
import { formatCurrency } from '@/lib/utils/currencyService';
import { useDashboard } from '@/features/dashboard/context/DashboardContext';
import { useNetWorth } from '@/features/dashboard/hooks/useNetWorth';
import { useFinancialSourceSelection } from '@/features/dashboard/hooks/useFinancialSourceSelection';
import { CURRENCY_DECIMALS, CurrencyCode } from '@/lib/domain/accounting/types';

/**
 * StatNetWorthWidget
 * 
 * Displays authoritative current net worth in base currency.
 * Consumes the unified financial source selection rule to maintain parity with Assets, Liabilities, and Allocation.
 * Historical comparison is only calculated and displayed if comparable history snapshots exist with matching currency.
 */
export default function StatNetWorthWidget() {
    const { baseCurrency } = useNetWorth();
    const { isEditMode } = useDashboard();
    const sourceState = useFinancialSourceSelection(baseCurrency);

    // Why this exists:
    // Resolves Issues 1, 2 & 3:
    // 1. Groups net worth by native currency without fabricating $0 AUD when holdings are in USD.
    // 2. Suppresses historical comparison if displayed currency does not match snapshot currency or coverage is incomplete.
    // 3. Discloses when legacy holdings are excluded from accounting figures.
    let title = `Total Net Worth (${baseCurrency})`;
    let displayValue = '...';
    let numericValue = 0;
    let displayedCurrency: CurrencyCode | null = baseCurrency;
    let isMissingBalances = false;

    if (sourceState.mode === 'loading') {
        displayValue = '...';
    } else if (sourceState.mode === 'error') {
        title = `Net Worth (${baseCurrency})`;
        displayValue = 'Error loading';
    } else if (sourceState.mode === 'modern_missing_balances') {
        isMissingBalances = true;
        displayedCurrency = null;
        const unrecordedText = sourceState.unrecordedCount === 1 ? '1 account needs balance' : `${sourceState.unrecordedCount} accounts need balance`;
        title = sourceState.hasExcludedLegacy
            ? `Known Net Worth (Accounting Accounts Only — ${unrecordedText})`
            : `Known Net Worth (${unrecordedText})`;
        displayValue = 'Needs Balance';
    } else if (sourceState.mode === 'modern_usable') {
        const { summary, unrecordedCount, hasExcludedLegacy } = sourceState;
        const decimals = (baseCurrency in CURRENCY_DECIMALS) ? CURRENCY_DECIMALS[baseCurrency as CurrencyCode] : 2;
        const divisor = Math.pow(10, decimals);
        const hasUnrecorded = unrecordedCount > 0;
        const unrecordedText = unrecordedCount === 1 ? '1 account needs balance' : `${unrecordedCount} accounts need balance`;

        if (summary.converted_net_worth?.is_complete) {
            numericValue = summary.converted_net_worth.amount_cents / divisor;
            displayedCurrency = baseCurrency;
            displayValue = formatCurrency(numericValue, baseCurrency);
            if (hasExcludedLegacy) {
                title = hasUnrecorded
                    ? `Known Net Worth (Accounting Accounts Only — ${unrecordedText})`
                    : `Total Net Worth (${baseCurrency} — Accounting Only)`;
            } else {
                title = hasUnrecorded ? `Known Net Worth (${unrecordedText})` : `Total Net Worth (${baseCurrency})`;
            }
        } else {
            // Unconverted multi-currency holdings
            const baseCents = summary.net_worth_cents_by_currency?.[baseCurrency];
            const otherCurrencies = Object.keys(summary.net_worth_cents_by_currency || {}).filter(c => c !== baseCurrency) as CurrencyCode[];

            if (baseCents !== undefined) {
                numericValue = baseCents / divisor;
                displayedCurrency = baseCurrency;
                displayValue = formatCurrency(numericValue, baseCurrency);
                if (hasExcludedLegacy) {
                    title = `Net Worth (${baseCurrency} Subtotal — Accounting Only)`;
                } else {
                    title = hasUnrecorded
                        ? `Known Net Worth (${baseCurrency} Subtotal — ${unrecordedText})`
                        : (otherCurrencies.length > 0 ? `Net Worth (${baseCurrency} Holdings Subtotal)` : `Total Net Worth (${baseCurrency})`);
                }
            } else if (otherCurrencies.length === 1) {
                // Acceptance Case: USD holding, AUD display, no dated rate -> Explicit USD amount; no fabricated AUD amount
                const foreignCurr = otherCurrencies[0];
                const foreignDecimals = (foreignCurr in CURRENCY_DECIMALS) ? CURRENCY_DECIMALS[foreignCurr] : 2;
                const foreignVal = (summary.net_worth_cents_by_currency[foreignCurr] || 0) / Math.pow(10, foreignDecimals);
                numericValue = foreignVal;
                displayedCurrency = foreignCurr;
                displayValue = formatCurrency(foreignVal, foreignCurr);
                title = hasExcludedLegacy
                    ? `Net Worth (${foreignCurr} Holding — Accounting Only)`
                    : `Net Worth (${foreignCurr} Holding — Unconverted)`;
            } else {
                displayedCurrency = null;
                title = hasExcludedLegacy ? `Net Worth (Multi-Currency — Accounting Only)` : `Net Worth (Multi-Currency Holdings)`;
                displayValue = otherCurrencies.map(c => `${c} ${(summary.net_worth_cents_by_currency[c] / Math.pow(10, CURRENCY_DECIMALS[c] ?? 2)).toLocaleString()}`).join(' + ');
            }
        }
    }
    // The mode union is exhaustive (loading | error | modern_missing_balances | modern_usable):
    // the old browser-storage "legacy" totals branch was deleted with the single-data-layer
    // collapse, so no fallback is needed here.

    // Historical comparison: Suppress whenever historical account coverage cannot be verified
    // Why this exists:
    // Resolves Assessor Finding: Historical snapshots in SQLite do not record account coverage metadata.
    // Matching currency alone cannot establish comparable account coverage across reporting periods.
    // We suppress headline percentage comparisons so StatCard displays "Not enough comparable history".
    // Tricky logic:
    // Percentage comparisons without verified identical account sets fabricate misleading growth/decay figures.
    // TODO: In Milestone 2, store snapshot account IDs for automated coverage equivalence verification.
    const change: string | undefined = undefined;
    const trend: 'up' | 'down' | 'neutral' = numericValue >= 0 ? 'up' : 'down';

    return (
        <WidgetWrapper id="stat-networth" isEditMode={isEditMode}>
            <StatCard
                title={title}
                value={displayValue}
                change={change}
                trend={trend}
                icon={<Wallet className="text-blue-600" size={24} />}
                privacySensitive={true}
            />
        </WidgetWrapper>
    );
}
