/**
 * StatLiabilitiesWidget
 * 
 * Why this exists:
 * Displays total liabilities in the user's selected base currency.
 * 
 * Tricky logic:
 * - Compares with previous net worth snapshot ONLY if sufficient history snapshots exist.
 * - Otherwise leaves change undefined so StatCard truthfully displays "Not enough history" (TRUST-03, Finding 9).
 * - Never displays hardcoded percentage estimates.
 */

import WidgetWrapper from '@/features/dashboard/widgets/WidgetWrapper';
import StatCard from '@/features/dashboard/components/StatCard';
import { TrendingDown } from 'lucide-react';
import { formatCurrency } from '@/lib/utils/currencyService';
import { useDashboard } from '@/features/dashboard/context/DashboardContext';
import { useNetWorth } from '@/features/dashboard/hooks/useNetWorth';
import { useHistory } from '@/hooks/useHistory';
import { useSharedFinancialSummary } from '@/features/sync/hooks/useSharedFinancialSummary';
import { CURRENCY_DECIMALS, CurrencyCode } from '@/lib/domain/accounting/types';

export default function StatLiabilitiesWidget() {
    const { baseCurrency, liabilities } = useNetWorth();
    const { isEditMode, hideWidget } = useDashboard();
    const { history } = useHistory();
    const { summary } = useSharedFinancialSummary();

    // Check if the shared financial summary has authoritative liabilities for baseCurrency.
    // Why this exists:
    // Prevents contradictory zero display when user imports balance observations in non-AUD currencies (e.g. JPY).
    // Tricky logic:
    // Divisor is 10^decimals, where decimals is 0 for JPY (divisor 1) and 2 for AUD/USD (divisor 100).
    // TODO: Support automated FX conversion for consolidated multi-currency liability totals.
    const trackedCents = summary?.total_liabilities_cents_by_currency?.[baseCurrency];
    const decimals = (baseCurrency in CURRENCY_DECIMALS) ? CURRENCY_DECIMALS[baseCurrency as CurrencyCode] : 2;
    const divisor = Math.pow(10, decimals);
    const finalLiabilities = (trackedCents !== undefined && (summary?.accounts?.length || 0) > 0)
        ? (trackedCents / divisor)
        : liabilities;

    const currencyBuckets = summary?.net_worth_cents_by_currency ? Object.keys(summary.net_worth_cents_by_currency) : [];
    const hasMultipleCurrencies = currencyBuckets.length > 1;
    const isFxConverted = summary?.converted_net_worth?.is_complete === true;

    const title = (hasMultipleCurrencies && !isFxConverted)
        ? `Total Liabilities (${baseCurrency} Subtotal)`
        : `Total Liabilities (${baseCurrency})`;

    // Calculate truthful historical comparison only when comparative history exists
    let change: string | undefined = undefined;
    let trend: 'up' | 'down' | 'neutral' = 'neutral';

    if (history && history.length >= 2) {
        const previous = history[history.length - 2];
        const prevLiab = previous.totalLiabilities;
        if (prevLiab && prevLiab !== 0) {
            const diff = finalLiabilities - prevLiab;
            const pct = ((diff / Math.abs(prevLiab)) * 100).toFixed(1);
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
                value={formatCurrency(finalLiabilities, baseCurrency)}
                change={change}
                trend={trend}
                icon={<TrendingDown className="text-rose-600" size={24} />}
                privacySensitive={true}
            />
        </WidgetWrapper>
    );
}
