import { GripVertical, X } from 'lucide-react';
import { ReactNode } from 'react';

interface WidgetWrapperProps {
    id: string;
    title?: string;
    isEditMode: boolean;
    onRemove?: () => void;
    children: ReactNode;
}

export default function WidgetWrapper({
    id, title, isEditMode, onRemove, children
}: WidgetWrapperProps) {
    return (
        <div className="h-full bg-card rounded-2xl border border-border shadow-sm overflow-hidden flex flex-col group transition-all duration-200 hover:shadow-md">
            {/* Drag Handle + Title */}
            {(title || isEditMode) && (
                <div
                    className={`flex items-center justify-between p-4 border-b border-border transition-colors relative widget-drag-handle ${isEditMode ? 'bg-slate-50 cursor-move' : ''}`}
                >
                    <div className="flex items-center gap-2">
                        {isEditMode && <GripVertical size={16} className="text-slate-400" />}
                        {title && <h3 className="font-bold text-foreground text-sm tracking-tight">{title}</h3>}
                    </div>
                    {isEditMode && onRemove && (
                        <button
                            onClick={(e) => {
                                e.stopPropagation(); // Prevent drag start
                                onRemove();
                            }}
                            className="p-1.5 hover:bg-red-50 rounded-lg text-slate-400 hover:text-red-500 transition-colors"
                            title="Hide Widget"
                        >
                            <X size={16} />
                        </button>
                    )}
                </div>
            )}

            {/* Content */}
            <div className="flex-1 overflow-hidden relative">
                {children}

                {/* Overlay in edit mode to prevent interaction with chart/inner elements while dragging */}
                {isEditMode && (
                    <div className="absolute inset-0 z-10 bg-transparent" />
                )}
            </div>
        </div>
    );
}
