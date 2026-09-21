import WidgetWrapper from '@/features/dashboard/widgets/WidgetWrapper';
import StatCard from '@/features/dashboard/components/StatCard';
import { TrendingDown } from 'lucide-react';
import { formatCurrency } from '@/lib/utils/currencyService';
import { useDashboard } from '@/features/dashboard/context/DashboardContext';
import { useNetWorth } from '@/features/dashboard/hooks/useNetWorth';
import { useHistory } from '@/hooks/useHistory';
import { useFinancialSourceSelection } from '@/features/dashboard/hooks/useFinancialSourceSelection';
import { CURRENCY_DECIMALS, CurrencyCode } from '@/lib/domain/accounting/types';

/**
 * StatLiabilitiesWidget
 * 
 * Displays total liabilities in the user's selected base currency.
 * Consumes the unified financial source selection rule to maintain parity with Net Worth and Assets.
 * Historical comparison is only calculated and displayed if comparable history snapshots exist with matching currency.
 */
export default function StatLiabilitiesWidget() {
    const { baseCurrency, liabilities: legacyLiabilities } = useNetWorth();
    const { isEditMode, hideWidget } = useDashboard();
    const { history } = useHistory();
    const sourceState = useFinancialSourceSelection(baseCurrency);

    // Why this exists:
    // Resolves Finding 1 & Clarification 2: Consumes unified source selection rule.
    // Tricky logic:
    // 1. If converted_total_liabilities is complete, displays the authoritatively converted liability total.
    // 2. If unconverted and baseCurrency has debts, displays the native baseCurrency subtotal.
    // 3. If unconverted and debts are in a single foreign currency, displays the native currency total.
    // TODO: In Milestone 2, link directly to liability payoff planner.
    let title = `Total Liabilities (${baseCurrency})`;
    let displayValue = '...';
    let numericValue = 0;
    let isMissingBalances = false;

    if (sourceState.mode === 'loading') {
        displayValue = '...';
    } else if (sourceState.mode === 'error') {
        title = `Total Liabilities (${baseCurrency})`;
        displayValue = 'Error loading';
    } else if (sourceState.mode === 'modern_missing_balances') {
        isMissingBalances = true;
        title = `Known Liabilities (${sourceState.unrecordedCount} ${sourceState.unrecordedCount === 1 ? 'account needs balance' : 'accounts need balance'})`;
        displayValue = 'Needs Balance';
    } else if (sourceState.mode === 'modern_usable') {
        const { summary, unrecordedCount } = sourceState;
        const decimals = (baseCurrency in CURRENCY_DECIMALS) ? CURRENCY_DECIMALS[baseCurrency as CurrencyCode] : 2;
        const divisor = Math.pow(10, decimals);
        const hasUnrecorded = unrecordedCount > 0;
        const unrecordedText = unrecordedCount === 1 ? '1 account needs balance' : `${unrecordedCount} accounts need balance`;

        if (summary.converted_total_liabilities?.is_complete) {
            numericValue = summary.converted_total_liabilities.amount_cents / divisor;
            displayValue = formatCurrency(numericValue, baseCurrency);
            title = hasUnrecorded ? `Known Liabilities (${unrecordedText})` : `Total Liabilities (${baseCurrency})`;
        } else {
            const baseCents = summary.total_liabilities_cents_by_currency?.[baseCurrency];
            const otherCurrencies = Object.keys(summary.total_liabilities_cents_by_currency || {}).filter(c => c !== baseCurrency) as CurrencyCode[];

            if (baseCents !== undefined) {
                numericValue = baseCents / divisor;
                displayValue = formatCurrency(numericValue, baseCurrency);
                title = hasUnrecorded
                    ? `Known Liabilities (${baseCurrency} Subtotal — ${unrecordedText})`
                    : (otherCurrencies.length > 0 ? `Liabilities (${baseCurrency} Holdings Subtotal)` : `Total Liabilities (${baseCurrency})`);
            } else if (otherCurrencies.length === 1) {
                const foreignCurr = otherCurrencies[0];
                const foreignDecimals = (foreignCurr in CURRENCY_DECIMALS) ? CURRENCY_DECIMALS[foreignCurr] : 2;
                const foreignVal = (summary.total_liabilities_cents_by_currency[foreignCurr] || 0) / Math.pow(10, foreignDecimals);
                numericValue = foreignVal;
                displayValue = formatCurrency(foreignVal, foreignCurr);
                title = `Liabilities (${foreignCurr} Holding — Unconverted)`;
            } else {
                title = `Liabilities (Multi-Currency Holdings)`;
                displayValue = otherCurrencies.map(c => `${c} ${(summary.total_liabilities_cents_by_currency[c] / Math.pow(10, CURRENCY_DECIMALS[c] ?? 2)).toLocaleString()}`).join(' + ');
            }
        }
    } else {
        // Legacy mode
        numericValue = legacyLiabilities;
        displayValue = formatCurrency(legacyLiabilities, baseCurrency);
        title = `Total Liabilities (${baseCurrency})`;
    }

    // Truthful historical comparison: Suppress if currency or coverage is non-comparable
    let change: string | undefined = undefined;
    let trend: 'up' | 'down' | 'neutral' = 'neutral';

    if (!isMissingBalances && sourceState.mode !== 'error' && history && history.length >= 2) {
        const previous = history[history.length - 2];
        if (previous && previous.currency === baseCurrency && previous.totalLiabilities && previous.totalLiabilities !== 0) {
            const diff = numericValue - previous.totalLiabilities;
            const pct = ((diff / Math.abs(previous.totalLiabilities)) * 100).toFixed(1);
            change = `${diff >= 0 ? '+' : ''}${pct}%`;
            // For liabilities, a decrease in debt is positive (up), increase is negative (down)
            trend = diff < 0 ? 'up' : diff > 0 ? 'down' : 'neutral';
        }
    }

    return (
        <WidgetWrapper
            id="stat-liabilities"
            isEditMode={isEditMode}
            onRemove={() => hideWidget('stat-liabilities')}
        >
            <StatCard
                title={title}
                value={displayValue}
                change={change}
                trend={trend}
                icon={<TrendingDown className="text-rose-600" size={24} />}
                privacySensitive={true}
            />
        </WidgetWrapper>
    );
}
