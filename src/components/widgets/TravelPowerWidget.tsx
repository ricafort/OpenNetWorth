import WidgetWrapper from './WidgetWrapper';
import TravelPowerCard from '@/components/TravelPowerCard';
import { useDashboard } from '@/contexts/DashboardContext';

export default function TravelPowerWidget() {
    const { metricsUSD, isEditMode, hideWidget } = useDashboard();

    return (
        <WidgetWrapper
            id="travel-power"
            isEditMode={isEditMode}
            onRemove={() => hideWidget('travel-power')}
        >
            <TravelPowerCard netWorthUSD={metricsUSD.netWorth} />
        </WidgetWrapper>
    );
}
