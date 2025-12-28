import WidgetWrapper from './WidgetWrapper';
import AssetAllocationChart from '@/components/AssetAllocationChart';
import { useDashboard } from '@/contexts/DashboardContext';

export default function AllocationChartWidget() {
    const { assets, isEditMode, hideWidget } = useDashboard();

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
