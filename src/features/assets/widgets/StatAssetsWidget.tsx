import WidgetWrapper from '@/features/dashboard/widgets/WidgetWrapper';
import StatCard from '@/features/dashboard/components/StatCard';
import { DollarSign } from 'lucide-react';
import { formatCurrency } from '@/lib/utils/currencyService';
import { useDashboard } from '@/features/dashboard/context/DashboardContext';
import { useNetWorth } from '@/features/dashboard/hooks/useNetWorth';
import { useHistory } from '@/hooks/useHistory';
import { useFinancialSourceSelection } from '@/features/dashboard/hooks/useFinancialSourceSelection';
import { CURRENCY_DECIMALS, CurrencyCode } from '@/lib/domain/accounting/types';

/**
 * StatAssetsWidget
 * 
 * Displays total assets in the user's selected base currency.
 * Consumes the unified financial source selection rule to maintain parity with Net Worth and Allocation.
 * Historical comparison is only calculated and displayed if comparable history snapshots exist with matching currency.
 */
export default function StatAssetsWidget() {
    const { baseCurrency, assets: legacyAssets } = useNetWorth();
    const { isEditMode, hideWidget } = useDashboard();
    const { history } = useHistory();
    const sourceState = useFinancialSourceSelection(baseCurrency);

    // Why this exists:
    // Resolves Finding 1 & Clarification 2: Consumes unified source selection rule.
    // Tricky logic:
    // 1. If converted_total_assets is complete, displays the authoritatively converted asset total.
    // 2. If unconverted and baseCurrency has assets, displays the native baseCurrency subtotal.
    // 3. If unconverted and assets are in a single foreign currency (e.g. USD 25,000 with AUD display),
    //    displays the explicit native amount (USD 25,000) rather than fabricating $0 AUD.
    // TODO: In Milestone 2, provide 1-click rate insertion for unconverted foreign assets.
    let title = `Total Assets (${baseCurrency})`;
    let displayValue = '...';
    let numericValue = 0;
    let isMissingBalances = false;

    if (sourceState.mode === 'loading') {
        displayValue = '...';
    } else if (sourceState.mode === 'error') {
        title = `Total Assets (${baseCurrency})`;
        displayValue = 'Error loading';
    } else if (sourceState.mode === 'modern_missing_balances') {
        isMissingBalances = true;
        title = `Known Assets (${sourceState.unrecordedCount} ${sourceState.unrecordedCount === 1 ? 'account needs balance' : 'accounts need balance'})`;
        displayValue = 'Needs Balance';
    } else if (sourceState.mode === 'modern_usable') {
        const { summary, unrecordedCount } = sourceState;
        const decimals = (baseCurrency in CURRENCY_DECIMALS) ? CURRENCY_DECIMALS[baseCurrency as CurrencyCode] : 2;
        const divisor = Math.pow(10, decimals);
        const hasUnrecorded = unrecordedCount > 0;
        const unrecordedText = unrecordedCount === 1 ? '1 account needs balance' : `${unrecordedCount} accounts need balance`;

        if (summary.converted_total_assets?.is_complete) {
            numericValue = summary.converted_total_assets.amount_cents / divisor;
            displayValue = formatCurrency(numericValue, baseCurrency);
            title = hasUnrecorded ? `Known Assets (${unrecordedText})` : `Total Assets (${baseCurrency})`;
        } else {
            const baseCents = summary.total_assets_cents_by_currency?.[baseCurrency];
            const otherCurrencies = Object.keys(summary.total_assets_cents_by_currency || {}).filter(c => c !== baseCurrency) as CurrencyCode[];

            if (baseCents !== undefined) {
                numericValue = baseCents / divisor;
                displayValue = formatCurrency(numericValue, baseCurrency);
                title = hasUnrecorded
                    ? `Known Assets (${baseCurrency} Subtotal — ${unrecordedText})`
                    : (otherCurrencies.length > 0 ? `Assets (${baseCurrency} Holdings Subtotal)` : `Total Assets (${baseCurrency})`);
            } else if (otherCurrencies.length === 1) {
                const foreignCurr = otherCurrencies[0];
                const foreignDecimals = (foreignCurr in CURRENCY_DECIMALS) ? CURRENCY_DECIMALS[foreignCurr] : 2;
                const foreignVal = (summary.total_assets_cents_by_currency[foreignCurr] || 0) / Math.pow(10, foreignDecimals);
                numericValue = foreignVal;
                displayValue = formatCurrency(foreignVal, foreignCurr);
                title = `Assets (${foreignCurr} Holding — Unconverted)`;
            } else {
                title = `Assets (Multi-Currency Holdings)`;
                displayValue = otherCurrencies.map(c => `${c} ${(summary.total_assets_cents_by_currency[c] / Math.pow(10, CURRENCY_DECIMALS[c] ?? 2)).toLocaleString()}`).join(' + ');
            }
        }
    } else {
        // Legacy mode
        numericValue = legacyAssets;
        displayValue = formatCurrency(legacyAssets, baseCurrency);
        title = `Total Assets (${baseCurrency})`;
    }

    // Truthful historical comparison: Suppress if currency or coverage is non-comparable
    let change: string | undefined = undefined;
    let trend: 'up' | 'down' | 'neutral' = 'neutral';

    if (!isMissingBalances && sourceState.mode !== 'error' && history && history.length >= 2) {
        const previous = history[history.length - 2];
        if (previous && previous.currency === baseCurrency && previous.totalAssets && previous.totalAssets !== 0) {
            const diff = numericValue - previous.totalAssets;
            const pct = ((diff / Math.abs(previous.totalAssets)) * 100).toFixed(1);
            change = `${diff >= 0 ? '+' : ''}${pct}%`;
            trend = diff > 0 ? 'up' : diff < 0 ? 'down' : 'neutral';
        }
    }

    return (
        <WidgetWrapper
            id="stat-assets"
            isEditMode={isEditMode}
            onRemove={() => hideWidget('stat-assets')}
        >
            <StatCard
                title={title}
                value={displayValue}
                change={change}
                trend={trend}
                icon={<DollarSign className="text-emerald-600" size={24} />}
                privacySensitive={true}
            />
        </WidgetWrapper>
    );
}
