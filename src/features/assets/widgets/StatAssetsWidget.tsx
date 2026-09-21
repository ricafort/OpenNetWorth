/**
 * StatAssetsWidget
 * 
 * Why this exists:
 * Displays total assets in the user's selected base currency.
 * 
 * Tricky logic:
 * - Compares with previous net worth snapshot ONLY if sufficient history snapshots exist.
 * - Otherwise leaves change undefined so StatCard truthfully displays "Not enough history" (TRUST-03, Finding 9).
 * - Never displays hardcoded percentage estimates.
 */

import WidgetWrapper from '@/features/dashboard/widgets/WidgetWrapper';
import StatCard from '@/features/dashboard/components/StatCard';
import { DollarSign } from 'lucide-react';
import { formatCurrency } from '@/lib/utils/currencyService';
import { useDashboard } from '@/features/dashboard/context/DashboardContext';
import { useNetWorth } from '@/features/dashboard/hooks/useNetWorth';
import { useHistory } from '@/hooks/useHistory';
import { useSharedFinancialSummary } from '@/features/sync/hooks/useSharedFinancialSummary';
import { CURRENCY_DECIMALS, CurrencyCode } from '@/lib/domain/accounting/types';

export default function StatAssetsWidget() {
    const { baseCurrency, assets } = useNetWorth();
    const { isEditMode, hideWidget } = useDashboard();
    const { history } = useHistory();
    const { summary } = useSharedFinancialSummary();

    // Check if the shared financial summary has authoritative assets for baseCurrency.
    // Why this exists:
    // Prevents contradictory zero display when user imports balance observations in non-AUD currencies (e.g. JPY).
    // Tricky logic:
    // Divisor is 10^decimals, where decimals is 0 for JPY (divisor 1) and 2 for AUD/USD (divisor 100).
    // TODO: Support automated FX conversion for consolidated multi-currency asset totals.
    const trackedCents = summary?.total_assets_cents_by_currency?.[baseCurrency];
    const decimals = (baseCurrency in CURRENCY_DECIMALS) ? CURRENCY_DECIMALS[baseCurrency as CurrencyCode] : 2;
    const divisor = Math.pow(10, decimals);
    const finalAssets = (trackedCents !== undefined && (summary?.accounts?.length || 0) > 0)
        ? (trackedCents / divisor)
        : assets;

    const currencyBuckets = summary?.net_worth_cents_by_currency ? Object.keys(summary.net_worth_cents_by_currency) : [];
    const hasMultipleCurrencies = currencyBuckets.length > 1;
    const isFxConverted = summary?.converted_net_worth?.is_complete === true;

    // Honest labeling: If there are unrecorded accounts or multiple currencies without complete FX conversion,
    // explicitly qualify this as a known/partial figure rather than presenting it as complete "Total Assets".
    // Why this exists:
    // Prevents misleading claims of "Total Assets" when asset accounts have unknown balances or missing FX conversions.
    // Tricky logic:
    // Distinguishes between currency subtotal qualification and unrecorded account qualification.
    // TODO: Display inline drawer linking to unrecorded asset accounts when clicking the widget title.
    const hasUnrecorded = (summary?.unrecorded_count || 0) > 0;
    const unrecordedText = summary?.unrecorded_count === 1
        ? '1 account needs balance'
        : `${summary?.unrecorded_count} accounts need balance`;

    let title = `Total Assets (${baseCurrency})`;
    if (hasUnrecorded && hasMultipleCurrencies && !isFxConverted) {
        title = `Known Assets (${baseCurrency} Subtotal — ${unrecordedText})`;
    } else if (hasUnrecorded) {
        title = `Known Assets (${unrecordedText})`;
    } else if (hasMultipleCurrencies && !isFxConverted) {
        title = `Total Assets (${baseCurrency} Subtotal)`;
    }

    // Calculate truthful historical comparison only when comparative history exists
    let change: string | undefined = undefined;
    let trend: 'up' | 'down' | 'neutral' = 'neutral';

    if (history && history.length >= 2) {
        const previous = history[history.length - 2];
        const prevAssets = previous.totalAssets;
        if (prevAssets && prevAssets !== 0) {
            const diff = finalAssets - prevAssets;
            const pct = ((diff / Math.abs(prevAssets)) * 100).toFixed(1);
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
                value={formatCurrency(finalAssets, baseCurrency)}
                change={change}
                trend={trend}
                icon={<DollarSign className="text-emerald-600" size={24} />}
                privacySensitive={true}
            />
        </WidgetWrapper>
    );
}
