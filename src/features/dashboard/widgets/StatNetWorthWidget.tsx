import WidgetWrapper from './WidgetWrapper';
import StatCard from '@/features/dashboard/components/StatCard';
import { Wallet } from 'lucide-react';
import { formatCurrency } from '@/lib/utils/currencyService';
import { useDashboard } from '@/features/dashboard/context/DashboardContext';
import { useNetWorth } from '@/features/dashboard/hooks/useNetWorth';
import { useHistory } from '@/hooks/useHistory';

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

    // Calculate historical comparison only when supporting history exists
    let change: string | undefined = undefined;
    let trend: 'up' | 'down' | 'neutral' = netWorth >= 0 ? 'up' : 'down';

    if (history && history.length >= 2) {
        const previous = history[history.length - 2];
        if (previous && previous.netWorth !== 0) {
            const diff = netWorth - previous.netWorth;
            const pct = ((diff / Math.abs(previous.netWorth)) * 100).toFixed(1);
            change = `${diff >= 0 ? '+' : ''}${pct}%`;
            trend = diff > 0 ? 'up' : diff < 0 ? 'down' : 'neutral';
        }
    }

    return (
        <WidgetWrapper id="stat-networth" isEditMode={isEditMode}>
            <StatCard
                title={`Total Net Worth (${baseCurrency})`}
                value={formatCurrency(netWorth, baseCurrency)}
                change={change}
                trend={trend}
                icon={<Wallet className="text-blue-600" size={24} />}
                privacySensitive={true}
            />
        </WidgetWrapper>
    );
}
