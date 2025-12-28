import WidgetWrapper from './WidgetWrapper';
import StatCard from '@/components/StatCard';
import { DollarSign } from 'lucide-react';
import { formatCurrency } from '@/lib/currencyService';
import { useDashboard } from '@/contexts/DashboardContext';

export default function StatAssetsWidget() {
    const { metrics, baseCurrency, isEditMode, hideWidget } = useDashboard();

    return (
        <WidgetWrapper
            id="stat-assets"
            isEditMode={isEditMode}
            onRemove={() => hideWidget('stat-assets')}
        >
            <StatCard
                title="Total Assets"
                value={formatCurrency(metrics.assets, baseCurrency)}
                change="+1.5%"
                trend="up"
                icon={<DollarSign className="text-emerald-600" size={24} />}
                privacySensitive={true}
            />
        </WidgetWrapper>
    );
}
