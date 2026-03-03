'use client';

import { useState } from 'react';
import WidgetWrapper from './WidgetWrapper';
import NetWorthChart from '@/components/charts/NetWorthChart';
import { History as HistoryIcon, MoreHorizontal, TrendingUp } from 'lucide-react';
import Link from 'next/link';
import HistoryEditor from '@/features/dashboard/modals/HistoryEditor';
import { useDashboard } from '@/features/dashboard/context/DashboardContext';

import { useHistory } from '@/hooks/useHistory';
import { useAssetsQuery } from '@/features/assets/hooks/useAssetsQuery';

export default function NetWorthChartWidget() {
    // TUTORIAL: Separation of Concerns (SoC).
    // The widget doesn't know *how* to fetch data. It just asks the 'useHistory' hook.
    // This allows us to swap the data source (Supabase vs LocalStorage) without changing the UI.
    const { history: netWorthHistory, refreshHistory } = useHistory();
    const { assets } = useAssetsQuery();
    const { isEditMode, hideWidget } = useDashboard();
    const [timeRange, setTimeRange] = useState<'6m' | '1y' | 'all'>('6m');
    const [isHistoryOpen, setIsHistoryOpen] = useState(false);

    // Custom Header Controls
    const HeaderControls = (
        <div className="flex items-center gap-2">
            <Link
                href="/timemachine"
                className="hidden md:flex text-xs font-bold text-amber-700 bg-amber-50 hover:bg-amber-100 transition-colors px-3 py-1.5 rounded-lg border border-amber-200 items-center gap-2"
                onClick={(e) => e.stopPropagation()}
            >
                <HistoryIcon size={14} />
                Time Machine
            </Link>
            <button
                onClick={(e) => { e.stopPropagation(); setIsHistoryOpen(true); }}
                className="text-xs font-bold text-muted-foreground hover:text-primary transition-colors px-3 py-1.5 rounded-lg hover:bg-muted"
            >
                Manage
            </button>
            <select
                value={timeRange}
                onChange={(e) => setTimeRange(e.target.value as any)}
                onClick={(e) => e.stopPropagation()}
                className="bg-muted border border-border text-xs font-bold text-foreground rounded-lg p-1.5 outline-none focus:ring-2 focus:ring-primary/20 cursor-pointer"
            >
                <option value="6m">Last 6 Months</option>
                <option value="1y">Last Year</option>
                <option value="all">All Time</option>
            </select>
        </div>
    );

    return (
        // TUTORIAL: Composition Pattern.
        // We wrap the chart in a generic 'WidgetWrapper' that handles common widget behaviors
        // like drag-and-drop handles, edit mode styling, and error boundaries.
        <WidgetWrapper
            id="chart-networth"
            title="Net Worth History"
            isEditMode={isEditMode}
        // Cannot remove core chart easily, or maybe we allow it?
        // Let's make it usually required, but if registry says required=true, we don't pass onRemove
        // Checks registry... yes it's required.
        >
            <div className="absolute top-4 right-4 z-10">
                {!isEditMode && HeaderControls}
            </div>

            <div className="h-full pt-8"> {/* pt-8 to clear header controls */}
                {/* TUTORIAL: Conditional Rendering (Empty State) */}
                {/* Always provide a clear "Call to Action" (CTA) when there is no data. */}
                {(netWorthHistory.length === 0 && assets.length === 0) ? (
                    <div className="flex flex-col items-center justify-center h-full text-center p-6">
                        <div className="bg-blue-50 p-4 rounded-full mb-4">
                            <TrendingUp size={32} className="text-blue-500" />
                        </div>
                        <h3 className="text-lg font-bold text-foreground mb-1">Start your journey</h3>
                        <p className="text-muted-foreground text-sm max-w-xs mb-4">Add your first asset to track your net worth.</p>
                        <div className="flex gap-2">
                            <a href="/assets" className="px-4 py-2 bg-slate-900 text-white rounded-lg text-sm font-bold hover:bg-slate-800">Add Asset</a>
                        </div>
                    </div>
                ) : (
                    <NetWorthChart
                        data={netWorthHistory}
                        timeRange={timeRange}
                    />
                )}
            </div>

            <HistoryEditor
                isOpen={isHistoryOpen}
                onClose={() => setIsHistoryOpen(false)}
                onSave={refreshHistory}
            />
        </WidgetWrapper>
    );
}
