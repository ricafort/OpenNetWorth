'use client';

import { useDashboard } from '@/features/dashboard/context/DashboardContext';
import widgetRegistry from '@/lib/registry/widgetRegistry';
import { Responsive, useContainerWidth } from 'react-grid-layout';
import type { Layout } from 'react-grid-layout';
import 'react-grid-layout/css/styles.css';
import 'react-resizable/css/styles.css';
import { Suspense, useMemo } from 'react';
import { Loader2 } from 'lucide-react';

export default function DashboardGrid() {
    const { layout, updateLayout, isEditMode } = useDashboard();
    const { width, containerRef, mounted } = useContainerWidth();

    // Handle layout changes from the grid library
    const handleLayoutChange = (currentLayout: Layout, allLayouts: Partial<Record<string, Layout>>) => {
        // Only update if we are in edit mode to avoid cycles on initial load
        if (isEditMode) {
            updateLayout({
                ...layout,
                layouts: {
                    ...layout.layouts,
                    ...allLayouts
                }
            });
        }
    };

    // Filter visible widgets
    const visibleWidgets = useMemo(() => {
        return widgetRegistry.filter(w => !layout.hiddenWidgets.includes(w.id));
    }, [layout.hiddenWidgets]);

    // Widget Loading Shell
    const WidgetSkeleton = () => (
        <div className="h-full w-full bg-slate-50 border border-slate-100 rounded-2xl animate-pulse flex items-center justify-center">
            <Loader2 className="text-slate-200 animate-spin" size={24} />
        </div>
    );

    const ResponsiveAny = Responsive as any;

    const memoizedLayouts = useMemo(() => {
        return Object.keys(layout.layouts).reduce((acc, br) => ({
            ...acc,
            [br]: layout.layouts[br as keyof typeof layout.layouts].map((l: any) => ({
                ...l,
                static: !isEditMode,
                isDraggable: isEditMode,
                isResizable: isEditMode
            }))
        }), {});
    }, [layout.layouts, isEditMode]);

    return (
        <div ref={containerRef} className="w-full">
            {mounted && (
                <ResponsiveAny
                    className="layout"
                    layouts={memoizedLayouts}
                    breakpoints={{ lg: 1200, md: 996, sm: 768, xs: 480, xxs: 0 }}
                    cols={{ lg: 4, md: 3, sm: 2, xs: 1, xxs: 1 }}
                    rowHeight={150}
                    width={width}
                    margin={[16, 16]}
                    isDraggable={isEditMode}
                    isResizable={isEditMode}
                    draggableHandle=".widget-drag-handle"
                    onLayoutChange={handleLayoutChange}
                >
                    {visibleWidgets.map(widget => (
                        <div key={widget.id} className={isEditMode ? 'z-50' : ''}>
                            <Suspense fallback={<WidgetSkeleton />}>
                                <widget.component />
                            </Suspense>
                        </div>
                    ))}
                </ResponsiveAny>
            )}
        </div>
    );
}
