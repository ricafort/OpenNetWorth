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

export default function StatLiabilitiesWidget() {
    const { baseCurrency, liabilities } = useNetWorth();
    const { isEditMode, hideWidget } = useDashboard();
    const { history } = useHistory();

    // Calculate truthful historical comparison only when comparative history exists
    let change: string | undefined = undefined;
    let trend: 'up' | 'down' | 'neutral' = 'neutral';

    if (history && history.length >= 2) {
        const previous = history[history.length - 2];
        const prevLiab = previous.totalLiabilities;
        if (prevLiab && prevLiab !== 0) {
            const diff = liabilities - prevLiab;
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
                title="Total Liabilities"
                value={formatCurrency(liabilities, baseCurrency)}
                change={change}
                trend={trend}
                icon={<TrendingDown className="text-rose-600" size={24} />}
                privacySensitive={true}
            />
        </WidgetWrapper>
    );
}
