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

export default function StatAssetsWidget() {
    const { baseCurrency, assets } = useNetWorth();
    const { isEditMode, hideWidget } = useDashboard();
    const { history } = useHistory();

    // Calculate truthful historical comparison only when comparative history exists
    let change: string | undefined = undefined;
    let trend: 'up' | 'down' | 'neutral' = 'neutral';

    if (history && history.length >= 2) {
        const previous = history[history.length - 2];
        const prevAssets = previous.totalAssets;
        if (prevAssets && prevAssets !== 0) {
            const diff = assets - prevAssets;
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
                title="Total Assets"
                value={formatCurrency(assets, baseCurrency)}
                change={change}
                trend={trend}
                icon={<DollarSign className="text-emerald-600" size={24} />}
                privacySensitive={true}
            />
        </WidgetWrapper>
    );
}
