'use client';

import { useDashboard } from '@/features/dashboard/context/DashboardContext';
import widgetRegistry from '@/lib/registry/widgetRegistry';
import { Responsive, useContainerWidth } from 'react-grid-layout';
import type { Layout } from 'react-grid-layout';
import 'react-grid-layout/css/styles.css';
import 'react-resizable/css/styles.css';
import { Suspense, useMemo } from 'react';
import { ChevronDown, ChevronUp, Loader2 } from 'lucide-react';

export default function DashboardGrid() {
    const { layout, updateLayout, isEditMode, toggleWidgetCollapsed } = useDashboard();
    const { width, containerRef, mounted } = useContainerWidth();

    const collapsedIds = useMemo(
        () => new Set(layout.collapsedWidgets ?? []),
        [layout.collapsedWidgets]
    );

    // Handle layout changes from the grid library
    const handleLayoutChange = (currentLayout: Layout, allLayouts: Partial<Record<string, Layout>>) => {
        // Only update if we are in edit mode to avoid cycles on initial load
        if (isEditMode) {
            // Collapsed cells are rendered at h:1. Without this guard, an edit-mode
            // reflow would persist that compact height and destroy the widget's
            // expanded size — the saved h must survive while the widget is collapsed.
            const merged: Partial<Record<string, Layout>> = {};
            for (const [bp, items] of Object.entries(allLayouts)) {
                const savedForBp = layout.layouts[bp as keyof typeof layout.layouts];
                merged[bp] = (items || []).map(item => {
                    if (collapsedIds.has(item.i)) {
                        const saved = savedForBp?.find(s => s.i === item.i);
                        if (saved) return { ...item, h: saved.h };
                    }
                    return item;
                });
            }
            updateLayout({
                ...layout,
                layouts: {
                    ...layout.layouts,
                    ...merged
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
                // Collapsed widgets occupy a single compact row; the real expanded h
                // stays in the saved layout (see the handleLayoutChange guard).
                h: collapsedIds.has(l.i) ? 1 : l.h,
                static: !isEditMode,
                isDraggable: isEditMode,
                isResizable: isEditMode
            }))
        }), {});
    }, [layout.layouts, isEditMode, collapsedIds]);

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
                    {visibleWidgets.map(widget => {
                        const isCollapsed = collapsedIds.has(widget.id);
                        return (
                            <div key={widget.id} className={isEditMode ? 'z-50' : ''}>
                                {isCollapsed ? (
                                    <div className="h-full bg-card rounded-2xl border border-border shadow-sm flex items-center justify-between gap-3 px-5">
                                        <span className="text-sm font-bold text-foreground truncate">{widget.name}</span>
                                        <button
                                            onClick={() => toggleWidgetCollapsed(widget.id)}
                                            className="p-2 rounded-xl border border-border/40 text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors shrink-0"
                                            title={`Expand ${widget.name}`}
                                            aria-label={`Expand ${widget.name}`}
                                        >
                                            <ChevronDown size={14} />
                                        </button>
                                    </div>
                                ) : (
                                    <div className="relative h-full">
                                        {/* Collapse toggle sits inside the card's top-right corner.
                                            Widgets that render content in that corner (StatCard icon
                                            chip, TravelPowerCard badge) pad their header row to stay
                                            clear of it. Hidden in edit mode, where the wrapper header
                                            already offers drag/remove. */}
                                        {!isEditMode && (
                                            <button
                                                onClick={() => toggleWidgetCollapsed(widget.id)}
                                                className="absolute top-2 right-2 z-20 w-7 h-7 rounded-full bg-card border border-border shadow-sm text-muted-foreground hover:text-foreground hover:bg-muted flex items-center justify-center transition-colors"
                                                title={`Collapse ${widget.name}`}
                                                aria-label={`Collapse ${widget.name}`}
                                            >
                                                <ChevronUp size={14} />
                                            </button>
                                        )}
                                        <Suspense fallback={<WidgetSkeleton />}>
                                            <widget.component />
                                        </Suspense>
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </ResponsiveAny>
            )}
        </div>
    );
}
