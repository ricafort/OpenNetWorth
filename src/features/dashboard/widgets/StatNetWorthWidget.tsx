import WidgetWrapper from './WidgetWrapper';
import StatCard from '@/features/dashboard/components/StatCard';
import { Wallet } from 'lucide-react';
import { formatCurrency } from '@/lib/utils/currencyService';
import { useDashboard } from '@/features/dashboard/context/DashboardContext';
import { useNetWorth } from '@/features/dashboard/hooks/useNetWorth';
import { useHistory } from '@/hooks/useHistory';
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
    const { baseCurrency, netWorth: legacyNetWorth } = useNetWorth();
    const { isEditMode } = useDashboard();
    const { history } = useHistory();
    const sourceState = useFinancialSourceSelection(baseCurrency);

    // Why this exists:
    // Resolves Finding 3 & Clarification 2: Uses unified source selection rule.
    // Never falls back to legacy totals if modern accounts exist or if an error occurred.
    // Tricky logic:
    // 1. If converted_net_worth is complete (valid dated exchange rates exist), we display the converted total.
    // 2. If unconverted and baseCurrency has holdings, we display the native baseCurrency subtotal.
    // 3. If unconverted and holdings are in a single foreign currency (e.g. USD holding, AUD display, no rate),
    //    we display the explicit foreign amount (e.g. USD 25,000) rather than manufacturing 0 AUD or mock FX.
    // TODO: In Milestone 2, provide quick link to add missing exchange rates.
    let title = `Total Net Worth (${baseCurrency})`;
    let displayValue = '...';
    let numericValue = 0;
    let isMissingBalances = false;

    if (sourceState.mode === 'loading') {
        displayValue = '...';
    } else if (sourceState.mode === 'error') {
        title = `Net Worth (${baseCurrency})`;
        displayValue = 'Error loading';
    } else if (sourceState.mode === 'modern_missing_balances') {
        isMissingBalances = true;
        title = `Known Net Worth (${sourceState.unrecordedCount} ${sourceState.unrecordedCount === 1 ? 'account needs balance' : 'accounts need balance'})`;
        displayValue = 'Needs Balance';
    } else if (sourceState.mode === 'modern_usable') {
        const { summary, unrecordedCount } = sourceState;
        const decimals = (baseCurrency in CURRENCY_DECIMALS) ? CURRENCY_DECIMALS[baseCurrency as CurrencyCode] : 2;
        const divisor = Math.pow(10, decimals);
        const hasUnrecorded = unrecordedCount > 0;
        const unrecordedText = unrecordedCount === 1 ? '1 account needs balance' : `${unrecordedCount} accounts need balance`;

        if (summary.converted_net_worth?.is_complete) {
            numericValue = summary.converted_net_worth.amount_cents / divisor;
            displayValue = formatCurrency(numericValue, baseCurrency);
            title = hasUnrecorded ? `Known Net Worth (${unrecordedText})` : `Total Net Worth (${baseCurrency})`;
        } else {
            // Unconverted multi-currency holdings
            const baseCents = summary.net_worth_cents_by_currency?.[baseCurrency];
            const otherCurrencies = Object.keys(summary.net_worth_cents_by_currency || {}).filter(c => c !== baseCurrency) as CurrencyCode[];

            if (baseCents !== undefined) {
                numericValue = baseCents / divisor;
                displayValue = formatCurrency(numericValue, baseCurrency);
                title = hasUnrecorded
                    ? `Known Net Worth (${baseCurrency} Subtotal — ${unrecordedText})`
                    : (otherCurrencies.length > 0 ? `Net Worth (${baseCurrency} Holdings Subtotal)` : `Total Net Worth (${baseCurrency})`);
            } else if (otherCurrencies.length === 1) {
                // Acceptance Case: USD holding, AUD display, no dated rate -> Explicit USD amount; no fabricated AUD amount
                const foreignCurr = otherCurrencies[0];
                const foreignDecimals = (foreignCurr in CURRENCY_DECIMALS) ? CURRENCY_DECIMALS[foreignCurr] : 2;
                const foreignVal = (summary.net_worth_cents_by_currency[foreignCurr] || 0) / Math.pow(10, foreignDecimals);
                numericValue = foreignVal;
                displayValue = formatCurrency(foreignVal, foreignCurr);
                title = `Net Worth (${foreignCurr} Holding — Unconverted)`;
            } else {
                title = `Net Worth (Multi-Currency Holdings)`;
                displayValue = otherCurrencies.map(c => `${c} ${(summary.net_worth_cents_by_currency[c] / Math.pow(10, CURRENCY_DECIMALS[c] ?? 2)).toLocaleString()}`).join(' + ');
            }
        }
    } else {
        // Legacy mode
        numericValue = legacyNetWorth;
        displayValue = formatCurrency(legacyNetWorth, baseCurrency);
        title = `Total Net Worth (${baseCurrency})`;
    }

    // Historical comparison:
    // Why this exists:
    // Resolves Finding 2 & Clarification 4: Suppresses historical percentage comparisons whenever
    // matching currency and account coverage cannot be verified.
    // Tricky logic:
    // If previous snapshot has no currency or currency !== baseCurrency, comparison is suppressed (undefined).
    let change: string | undefined = undefined;
    let trend: 'up' | 'down' | 'neutral' = numericValue >= 0 ? 'up' : 'down';

    if (!isMissingBalances && sourceState.mode !== 'error' && history && history.length >= 2) {
        const previous = history[history.length - 2];
        if (previous && previous.currency === baseCurrency && previous.netWorth !== 0) {
            const diff = numericValue - previous.netWorth;
            const pct = ((diff / Math.abs(previous.netWorth)) * 100).toFixed(1);
            change = `${diff >= 0 ? '+' : ''}${pct}%`;
            trend = diff > 0 ? 'up' : diff < 0 ? 'down' : 'neutral';
        }
    }

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
