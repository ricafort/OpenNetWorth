import WidgetWrapper from './WidgetWrapper';
import StatCard from '@/components/StatCard';
import { Wallet } from 'lucide-react';
import { formatCurrency } from '@/lib/currencyService';
import { useDashboard } from '@/contexts/DashboardContext';

export default function StatNetWorthWidget() {
    const { metrics, metricsUSD, baseCurrency, isEditMode, hideWidget } = useDashboard();

    // Calculate trend if history available - simplified logic for now
    const trend = metrics.netWorth >= 0 ? 'up' : 'down';

    return (
        <WidgetWrapper id="stat-networth" isEditMode={isEditMode}>
            <StatCard
                title={`Total Net Worth (${baseCurrency})`}
                value={formatCurrency(metrics.netWorth, baseCurrency)}
                change="+2.4%" // Placeholder, could be real calculation later
                trend={trend}
                icon={<Wallet className="text-blue-600" size={24} />}
                privacySensitive={true}
            />
        </WidgetWrapper>
    );
}
