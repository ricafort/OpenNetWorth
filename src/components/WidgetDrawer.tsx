'use client';

import { useDashboard } from '@/contexts/DashboardContext';
import widgetRegistry from '@/lib/registry/widgetRegistry';
import { Plus, LayoutTemplate } from 'lucide-react';

export default function WidgetDrawer() {
    const { layout, showWidget, isEditMode } = useDashboard();

    // Only show if in edit mode
    if (!isEditMode) return null;

    const hiddenWidgets = widgetRegistry.filter(w => layout.hiddenWidgets.includes(w.id));

    // If no hidden widgets, maybe show a "All widgets visible" message or nothing
    if (hiddenWidgets.length === 0) return null;

    return (
        <div className="fixed right-6 bottom-6 z-[60] animate-in slide-in-from-bottom-6 duration-300">
            <div className="bg-slate-900 text-white p-4 rounded-2xl shadow-xl border border-slate-800 w-80">
                <div className="flex items-center gap-2 mb-3 pb-3 border-b border-slate-800">
                    <LayoutTemplate size={18} className="text-blue-400" />
                    <h4 className="font-bold text-sm">Add Widgets</h4>
                    <span className="ml-auto text-xs bg-slate-800 px-2 py-0.5 rounded-full text-slate-400">
                        {hiddenWidgets.length} available
                    </span>
                </div>

                <div className="space-y-2 max-h-60 overflow-y-auto pr-2 custom-scrollbar">
                    {hiddenWidgets.map(w => (
                        <button
                            key={w.id}
                            onClick={() => showWidget(w.id)}
                            className="w-full text-left flex items-center justify-between p-3 rounded-xl bg-slate-800/50 hover:bg-blue-600 hover:text-white transition-all group"
                        >
                            <div>
                                <p className="font-bold text-xs">{w.name}</p>
                                <p className="text-[10px] text-slate-400 group-hover:text-blue-100 line-clamp-1">{w.description}</p>
                            </div>
                            <Plus size={16} className="text-slate-500 group-hover:text-white" />
                        </button>
                    ))}
                </div>
            </div>
        </div>
    );
}
