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
    const { baseCurrency, assetsByCurrency, assetCurrencies } = useNetWorth();
    const { isEditMode, hideWidget } = useDashboard();
    const { history } = useHistory();
    const sourceState = useFinancialSourceSelection(baseCurrency);

    // Why this exists:
    // Resolves Issues 1, 2 & 3:
    // 1. Groups legacy assets by native currency without fabricating $0 AUD when assets are in USD.
    // 2. Suppresses historical comparison if displayed currency does not match snapshot currency or coverage is incomplete.
    // 3. Discloses when legacy holdings are excluded from modern accounting figures.
    let title = `Total Assets (${baseCurrency})`;
    let displayValue = '...';
    let numericValue = 0;
    let displayedCurrency: CurrencyCode | null = baseCurrency;
    let isMissingBalances = false;

    if (sourceState.mode === 'loading') {
        displayValue = '...';
    } else if (sourceState.mode === 'error') {
        title = `Total Assets (${baseCurrency})`;
        displayValue = 'Error loading';
    } else if (sourceState.mode === 'modern_missing_balances') {
        isMissingBalances = true;
        displayedCurrency = null;
        const unrecordedText = sourceState.unrecordedCount === 1 ? '1 account needs balance' : `${sourceState.unrecordedCount} accounts need balance`;
        title = sourceState.hasExcludedLegacy
            ? `Known Assets (Accounting Accounts Only — ${unrecordedText})`
            : `Known Assets (${unrecordedText})`;
        displayValue = 'Needs Balance';
    } else if (sourceState.mode === 'modern_usable') {
        const { summary, unrecordedCount, hasExcludedLegacy } = sourceState;
        const decimals = (baseCurrency in CURRENCY_DECIMALS) ? CURRENCY_DECIMALS[baseCurrency as CurrencyCode] : 2;
        const divisor = Math.pow(10, decimals);
        const hasUnrecorded = unrecordedCount > 0;
        const unrecordedText = unrecordedCount === 1 ? '1 account needs balance' : `${unrecordedCount} accounts need balance`;

        if (summary.converted_total_assets?.is_complete) {
            numericValue = summary.converted_total_assets.amount_cents / divisor;
            displayedCurrency = baseCurrency;
            displayValue = formatCurrency(numericValue, baseCurrency);
            if (hasExcludedLegacy) {
                title = hasUnrecorded
                    ? `Known Assets (Accounting Accounts Only — ${unrecordedText})`
                    : `Total Assets (${baseCurrency} — Accounting Only)`;
            } else {
                title = hasUnrecorded ? `Known Assets (${unrecordedText})` : `Total Assets (${baseCurrency})`;
            }
        } else {
            const baseCents = summary.total_assets_cents_by_currency?.[baseCurrency];
            const otherCurrencies = Object.keys(summary.total_assets_cents_by_currency || {}).filter(c => c !== baseCurrency) as CurrencyCode[];

            if (baseCents !== undefined) {
                numericValue = baseCents / divisor;
                displayedCurrency = baseCurrency;
                displayValue = formatCurrency(numericValue, baseCurrency);
                if (hasExcludedLegacy) {
                    title = `Assets (${baseCurrency} Subtotal — Accounting Only)`;
                } else {
                    title = hasUnrecorded
                        ? `Known Assets (${baseCurrency} Subtotal — ${unrecordedText})`
                        : (otherCurrencies.length > 0 ? `Assets (${baseCurrency} Holdings Subtotal)` : `Total Assets (${baseCurrency})`);
                }
            } else if (otherCurrencies.length === 1) {
                const foreignCurr = otherCurrencies[0];
                const foreignDecimals = (foreignCurr in CURRENCY_DECIMALS) ? CURRENCY_DECIMALS[foreignCurr] : 2;
                const foreignVal = (summary.total_assets_cents_by_currency[foreignCurr] || 0) / Math.pow(10, foreignDecimals);
                numericValue = foreignVal;
                displayedCurrency = foreignCurr;
                displayValue = formatCurrency(foreignVal, foreignCurr);
                title = hasExcludedLegacy
                    ? `Assets (${foreignCurr} Holding — Accounting Only)`
                    : `Assets (${foreignCurr} Holding — Unconverted)`;
            } else {
                displayedCurrency = null;
                title = hasExcludedLegacy ? `Assets (Multi-Currency — Accounting Only)` : `Assets (Multi-Currency Holdings)`;
                displayValue = otherCurrencies.map(c => `${c} ${(summary.total_assets_cents_by_currency[c] / Math.pow(10, CURRENCY_DECIMALS[c] ?? 2)).toLocaleString()}`).join(' + ');
            }
        }
    } else {
        // Legacy mode: group by native currency (Resolves Issue 1)
        const assetsBase = assetsByCurrency?.[baseCurrency];
        const otherAssetCurrs = (assetCurrencies || []).filter(c => c !== baseCurrency);

        if (assetsBase !== undefined && (assetsBase > 0 || otherAssetCurrs.length === 0)) {
            numericValue = assetsBase;
            displayedCurrency = baseCurrency;
            displayValue = formatCurrency(assetsBase, baseCurrency);
            title = otherAssetCurrs.length > 0
                ? `Assets (${baseCurrency} Holdings Subtotal)`
                : `Total Assets (${baseCurrency})`;
        } else if (otherAssetCurrs.length === 1) {
            const foreignCurr = otherAssetCurrs[0];
            const foreignVal = assetsByCurrency?.[foreignCurr] || 0;
            numericValue = foreignVal;
            displayedCurrency = foreignCurr;
            displayValue = formatCurrency(foreignVal, foreignCurr);
            title = `Assets (${foreignCurr} Holding — Unconverted)`;
        } else if (otherAssetCurrs.length > 1) {
            displayedCurrency = null;
            title = `Assets (Multi-Currency Holdings — Unconverted)`;
            displayValue = otherAssetCurrs.map(c => `${c} ${(assetsByCurrency?.[c] || 0).toLocaleString()}`).join(' + ');
        } else {
            numericValue = 0;
            displayedCurrency = baseCurrency;
            displayValue = formatCurrency(0, baseCurrency);
            title = `Total Assets (${baseCurrency})`;
        }
    }

    // Truthful historical comparison: Suppress if currency or coverage is non-comparable (Resolves Issue 2)
    let change: string | undefined = undefined;
    let trend: 'up' | 'down' | 'neutral' = 'neutral';

    const hasCompleteCoverage = !isMissingBalances &&
        sourceState.mode !== 'error' &&
        sourceState.mode !== 'loading' &&
        (sourceState.mode === 'legacy' || (sourceState.unrecordedCount === 0 && !sourceState.hasExcludedLegacy));

    if (hasCompleteCoverage && displayedCurrency && history && history.length >= 2) {
        const sortedHistory = history.slice().sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
        const previous = sortedHistory[sortedHistory.length - 2];
        if (previous && previous.currency === displayedCurrency && previous.totalAssets && previous.totalAssets !== 0) {
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
