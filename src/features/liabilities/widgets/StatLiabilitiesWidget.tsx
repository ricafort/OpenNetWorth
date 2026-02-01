import WidgetWrapper from '@/features/dashboard/widgets/WidgetWrapper';
import StatCard from '@/features/dashboard/components/StatCard';
import { TrendingDown } from 'lucide-react';
import { formatCurrency } from '@/lib/utils/currencyService';
import { useDashboard } from '@/features/dashboard/context/DashboardContext';
import { useNetWorth } from '@/features/dashboard/hooks/useNetWorth';

export default function StatLiabilitiesWidget() {
    const { baseCurrency, liabilities, isLoading } = useNetWorth();
    const { isEditMode, hideWidget } = useDashboard();

    return (
        <WidgetWrapper
            id="stat-liabilities"
            isEditMode={isEditMode}
            onRemove={() => hideWidget('stat-liabilities')}
        >
            <StatCard
                title="Total Liabilities"
                value={formatCurrency(liabilities, baseCurrency)}
                change="-0.8%"
                trend="down"
                icon={<TrendingDown className="text-rose-600" size={24} />}
                privacySensitive={true}
            />
        </WidgetWrapper>
    );
}
