import WidgetWrapper from './WidgetWrapper';
import AssetAllocationChart from '@/features/assets/components/AssetAllocationChart';
import { useDashboard } from '@/features/dashboard/context/DashboardContext';

export default function AllocationChartWidget() {
    const { isEditMode, hideWidget } = useDashboard();

    return (
        <WidgetWrapper
            id="chart-allocation"
            title="Asset Allocation"
            isEditMode={isEditMode}
            onRemove={() => hideWidget('chart-allocation')}
        >
            <AssetAllocationChart />
        </WidgetWrapper>
    );
}
