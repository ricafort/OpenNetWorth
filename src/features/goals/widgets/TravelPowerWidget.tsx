import WidgetWrapper from '@/features/dashboard/widgets/WidgetWrapper';
import TravelPowerCard from '@/features/goals/components/TravelPowerCard';
import { useDashboard } from '@/features/dashboard/context/DashboardContext';
import { useNetWorth } from '@/features/dashboard/hooks/useNetWorth';

export default function TravelPowerWidget() {
    const { netWorthUSD, isLoading } = useNetWorth();
    const { isEditMode, hideWidget } = useDashboard();

    return (
        <WidgetWrapper
            id="travel-power"
            isEditMode={isEditMode}
            onRemove={() => hideWidget('travel-power')}
        >
            <TravelPowerCard netWorthUSD={netWorthUSD} />
        </WidgetWrapper>
    );
}
