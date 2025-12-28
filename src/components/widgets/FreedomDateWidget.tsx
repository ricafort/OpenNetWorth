import WidgetWrapper from './WidgetWrapper';
import FreedomDateCard from '@/components/FreedomDateCard';
import { useDashboard } from '@/contexts/DashboardContext';

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
