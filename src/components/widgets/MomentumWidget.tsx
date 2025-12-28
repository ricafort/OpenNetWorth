import WidgetWrapper from './WidgetWrapper';
import WealthMomentumGauge from '@/components/WealthMomentumGauge';
import { useDashboard } from '@/contexts/DashboardContext';

export default function MomentumWidget() {
    const { momentum, isEditMode, hideWidget } = useDashboard();

    if (!momentum && !isEditMode) return null; // Or placeholder

    return (
        <WidgetWrapper
            id="momentum"
            isEditMode={isEditMode}
            onRemove={() => hideWidget('momentum')}
        >
            {momentum ? (
                <WealthMomentumGauge momentum={momentum} />
            ) : (
                <div className="h-full flex items-center justify-center text-xs text-muted-foreground p-4 text-center">
                    Add recurring income/expenses to see Momentum.
                </div>
            )}
        </WidgetWrapper>
    );
}
