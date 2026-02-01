import WidgetWrapper from './WidgetWrapper';
import AssetAllocationChart from '@/features/assets/components/AssetAllocationChart';
import { useDashboard } from '@/features/dashboard/context/DashboardContext';

import { useAssetsQuery } from '@/features/assets/hooks/useAssetsQuery';

export default function AllocationChartWidget() {
    const { assets } = useAssetsQuery();
    const { isEditMode, hideWidget } = useDashboard();

    return (
        <WidgetWrapper
            id="chart-allocation"
            title="Asset Allocation"
            isEditMode={isEditMode}
            onRemove={() => hideWidget('chart-allocation')}
        >
            <AssetAllocationChart assets={assets} />
        </WidgetWrapper>
    );
}
