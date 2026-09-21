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

    // Honest labeling: If there are unrecorded accounts or multiple currencies without complete FX conversion,
    // explicitly qualify this as a known/partial figure rather than presenting it as complete "Total Net Worth".
    // Why this exists:
    // Prevents misleading claims of "Total Net Worth" when accounts have unknown balances or missing FX conversions.
    // Tricky logic:
    // Distinguishes between currency subtotal qualification and unrecorded account qualification.
    // TODO: Display inline drawer linking to unrecorded accounts when clicking the widget title.
    const hasUnrecorded = (summary?.unrecorded_count || 0) > 0;
    const unrecordedText = summary?.unrecorded_count === 1
        ? '1 account needs balance'
        : `${summary?.unrecorded_count} accounts need balance`;

    let title = `Total Net Worth (${baseCurrency})`;
    if (hasUnrecorded && hasMultipleCurrencies && !isFxConverted) {
        title = `Known Net Worth (${baseCurrency} Subtotal — ${unrecordedText})`;
    } else if (hasUnrecorded) {
        title = `Known Net Worth (${unrecordedText})`;
    } else if (hasMultipleCurrencies && !isFxConverted) {
        title = `Net Worth (${baseCurrency} Holdings Subtotal)`;
    }

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
