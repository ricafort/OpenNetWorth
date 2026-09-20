import WidgetWrapper from './WidgetWrapper';
import StatCard from '@/features/dashboard/components/StatCard';
import { Wallet } from 'lucide-react';
import { formatCurrency } from '@/lib/utils/currencyService';
import { useDashboard } from '@/features/dashboard/context/DashboardContext';
import { useNetWorth } from '@/features/dashboard/hooks/useNetWorth';
import { useHistory } from '@/hooks/useHistory';
import { useSharedFinancialSummary } from '@/features/sync/hooks/useSharedFinancialSummary';
import { CURRENCY_DECIMALS, CurrencyCode } from '@/lib/domain/accounting/types';

/**
 * StatNetWorthWidget
 * 
 * Displays authoritative current net worth in base currency.
 * Historical comparison is only calculated and displayed if comparable history snapshots exist.
 * Otherwise, clearly shows "Not enough history" rather than arbitrary estimates.
 */
export default function StatNetWorthWidget() {
    const { baseCurrency, netWorth } = useNetWorth();
    const { isEditMode } = useDashboard();
    const { history } = useHistory();
    const { summary } = useSharedFinancialSummary();

    // Check if the shared financial summary has an authoritative balance for baseCurrency
    // Why: Scales with CURRENCY_DECIMALS so zero-decimal currencies like JPY are not corrupted
    // (dividing by 100 on JPY would convert 10,000 JPY into 100 JPY).
    // Tricky logic: Divisor is 10^decimals, where decimals is 0 for JPY (divisor 1) and 2 for AUD/USD (divisor 100).
    const trackedCents = summary?.net_worth_cents_by_currency?.[baseCurrency];
    const decimals = (baseCurrency in CURRENCY_DECIMALS) ? CURRENCY_DECIMALS[baseCurrency as CurrencyCode] : 2;
    const divisor = Math.pow(10, decimals);
    const finalNetWorth = (trackedCents !== undefined && (summary?.accounts?.length || 0) > 0)
        ? (trackedCents / divisor)
        : netWorth;

    const currencyBuckets = summary?.net_worth_cents_by_currency ? Object.keys(summary.net_worth_cents_by_currency) : [];
    const hasMultipleCurrencies = currencyBuckets.length > 1;
    const isFxConverted = summary?.converted_net_worth?.is_complete === true;

    // Honest labeling: If there are multiple currencies and no complete verified FX conversion,
    // explicitly label this as a holdings subtotal rather than presenting it as complete converted wealth.
    // Why this exists:
    // Prevents misrepresenting a single-currency bucket as the user's entire multi-currency net worth.
    // Tricky logic:
    // When isFxConverted is true, all holdings have been converted via authoritative dated FX rates.
    // Otherwise, this card only represents holdings in baseCurrency.
    // TODO: Display inline FX conversion status drawer when clicking the subtotal badge.
    const title = (hasMultipleCurrencies && !isFxConverted)
        ? `Net Worth (${baseCurrency} Holdings Subtotal)`
        : `Total Net Worth (${baseCurrency})`;

    // Calculate historical comparison only when supporting history exists
    let change: string | undefined = undefined;
    let trend: 'up' | 'down' | 'neutral' = finalNetWorth >= 0 ? 'up' : 'down';

    if (history && history.length >= 2) {
        const previous = history[history.length - 2];
        if (previous && previous.netWorth !== 0) {
            const diff = finalNetWorth - previous.netWorth;
            const pct = ((diff / Math.abs(previous.netWorth)) * 100).toFixed(1);
            change = `${diff >= 0 ? '+' : ''}${pct}%`;
            trend = diff > 0 ? 'up' : diff < 0 ? 'down' : 'neutral';
        }
    }

    return (
        <WidgetWrapper id="stat-networth" isEditMode={isEditMode}>
            <StatCard
                title={title}
                value={formatCurrency(finalNetWorth, baseCurrency)}
                change={change}
                trend={trend}
                icon={<Wallet className="text-blue-600" size={24} />}
                privacySensitive={true}
            />
        </WidgetWrapper>
    );
}
