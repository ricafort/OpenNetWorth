import WidgetWrapper from '@/features/dashboard/widgets/WidgetWrapper';
import StatCard from '@/features/dashboard/components/StatCard';
import { DollarSign } from 'lucide-react';
import { formatCurrency } from '@/lib/utils/currencyService';
import { useDashboard } from '@/features/dashboard/context/DashboardContext';
import { useNetWorth } from '@/features/dashboard/hooks/useNetWorth';

export default function StatAssetsWidget() {
    const { baseCurrency, assets, isLoading } = useNetWorth();
    const { isEditMode, hideWidget } = useDashboard();

    return (
        <WidgetWrapper
            id="stat-assets"
            isEditMode={isEditMode}
            onRemove={() => hideWidget('stat-assets')}
        >
            <StatCard
                title="Total Assets"
                value={formatCurrency(assets, baseCurrency)}
                change="+1.5%"
                trend="up"
                icon={<DollarSign className="text-emerald-600" size={24} />}
                privacySensitive={true}
            />
        </WidgetWrapper>
    );
}
