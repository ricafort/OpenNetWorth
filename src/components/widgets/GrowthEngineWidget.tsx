import WidgetWrapper from './WidgetWrapper';
import PortfolioSummary from '@/components/PortfolioSummary';
import { analyzePortfolio } from '@/lib/portfolioAnalysis';
import { useDashboard } from '@/contexts/DashboardContext';
import Link from 'next/link';

import { useTheme } from '@/contexts/ThemeContext';

export default function GrowthEngineWidget() {
    const { assets, isEditMode, hideWidget } = useDashboard();
    const { isPrivacyBlur } = useTheme();

    // Logic to hide if empty, but in Widget system usually we let user decide layout.
    // But if no investments, it's empty.
    const hasInvestments = assets.some(a => a.type === 'investment' || a.type === 'crypto');

    if (!hasInvestments && !isEditMode) {
        // Option: Return null, which leaves a hole in the grid? 
        // Or render an placeholder "Add Investments to see Growth"?
        // Let's render placeholder.
        return (
            <WidgetWrapper
                id="growth-engine"
                title="Growth Engine"
                isEditMode={isEditMode}
                onRemove={() => hideWidget('growth-engine')}
            >
                <div className="h-full flex flex-col items-center justify-center text-center p-4">
                    <p className="text-sm text-muted-foreground mb-2">Add investments to unlock portfolio analysis.</p>
                    <Link href="/assets" className="text-xs font-bold text-blue-600 hover:underline">Go to Assets</Link>
                </div>
            </WidgetWrapper>
        );
    }

    return (
        <WidgetWrapper
            id="growth-engine"
            title="Growth Engine"
            isEditMode={isEditMode}
            onRemove={() => hideWidget('growth-engine')}
        >
            <PortfolioSummary analysis={analyzePortfolio(assets)} privacyBlur={isPrivacyBlur} />
            <div className="mt-4 text-center">
                <Link href="/portfolio" className="text-xs font-bold text-blue-600 hover:text-blue-700 hover:underline">
                    View Detailed Analysis &rarr;
                </Link>
            </div>
        </WidgetWrapper>
    );
}
