import WidgetWrapper from './WidgetWrapper';
import StatCard from '@/features/dashboard/components/StatCard';
import { Wallet } from 'lucide-react';
import { formatCurrency } from '@/lib/utils/currencyService';
import { useDashboard } from '@/features/dashboard/context/DashboardContext';
import { useNetWorth } from '@/features/dashboard/hooks/useNetWorth';

export default function StatNetWorthWidget() {
    const { baseCurrency, netWorth, netWorthUSD, isLoading } = useNetWorth();
    const { isEditMode, hideWidget } = useDashboard();

    // Calculate trend if history available - simplified logic for now
    const trend = netWorth >= 0 ? 'up' : 'down';

    return (
        <WidgetWrapper id="stat-networth" isEditMode={isEditMode}>
            <StatCard
                title={`Total Net Worth (${baseCurrency})`}
                value={formatCurrency(netWorth, baseCurrency)}
                change="+2.4%" // Placeholder, could be real calculation later
                trend={trend}
                icon={<Wallet className="text-blue-600" size={24} />}
                privacySensitive={true}
            />
        </WidgetWrapper>
    );
}
