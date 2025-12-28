import WidgetWrapper from './WidgetWrapper';
import StatCard from '@/components/StatCard';
import { TrendingDown } from 'lucide-react';
import { formatCurrency } from '@/lib/currencyService';
import { useDashboard } from '@/contexts/DashboardContext';

export default function StatLiabilitiesWidget() {
    const { metrics, baseCurrency, isEditMode, hideWidget } = useDashboard();

    return (
        <WidgetWrapper
            id="stat-liabilities"
            isEditMode={isEditMode}
            onRemove={() => hideWidget('stat-liabilities')}
        >
            <StatCard
                title="Total Liabilities"
                value={formatCurrency(metrics.liabilities, baseCurrency)}
                change="-0.8%"
                trend="down"
                icon={<TrendingDown className="text-rose-600" size={24} />}
                privacySensitive={true}
            />
        </WidgetWrapper>
    );
}
