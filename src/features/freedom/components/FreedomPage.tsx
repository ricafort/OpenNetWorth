import DebtPayoffCalculator from '@/features/liabilities/components/DebtPayoffCalculator';
import { PageHeader } from '@/components/common/PageHeader';

export const FreedomPage = () => {
    return (
        <div className="space-y-8">
            {/* Header */}
            <PageHeader
                title="Financial Freedom"
                description="Design your exit strategy from debt."
            />

            <DebtPayoffCalculator />
        </div>
    );
};
