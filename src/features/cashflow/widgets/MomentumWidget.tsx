import WidgetWrapper from '@/features/dashboard/widgets/WidgetWrapper';
import WealthMomentumGauge from '@/features/cashflow/components/WealthMomentumGauge';
import { useDashboard } from '@/features/dashboard/context/DashboardContext';
import { useWealthMomentum } from '@/features/cashflow/hooks/useWealthMomentum';

export default function MomentumWidget() {
    const { momentum, isLoading } = useWealthMomentum();
    const { isEditMode, hideWidget } = useDashboard();

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
