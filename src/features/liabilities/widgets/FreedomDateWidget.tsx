import WidgetWrapper from '@/features/dashboard/widgets/WidgetWrapper';
import FreedomDateCard from '@/features/liabilities/components/FreedomDateCard';
import { useDashboard } from '@/features/dashboard/context/DashboardContext';

export default function FreedomDateWidget() {
    const { isEditMode, hideWidget } = useDashboard();

    return (
        <WidgetWrapper
            id="freedom-date"
            isEditMode={isEditMode}
            onRemove={() => hideWidget('freedom-date')}
        >
            <FreedomDateCard />
        </WidgetWrapper>
    );
}
