
import React from 'react';

interface ContentCardProps {
    children: React.ReactNode;
    className?: string; // Allow custom classes like gradients or borders
    title?: string;
    icon?: React.ReactNode;
}

export const ContentCard = ({ children, className = '', title, icon }: ContentCardProps) => {
    // Base styles + allow overrides
    // animate-in fade-in slide-in-from-top-4 duration-200 -> can be added if needed, but keeping base simple
    return (
        <div className={`bg-card p-6 rounded-2xl border border-border shadow-sm ${className}`}>
            {(title || icon) && (
                <div className="flex items-center gap-3 mb-4">
                    {icon && <div className="p-2 bg-primary/10 text-primary rounded-lg">{icon}</div>}
                    {title && <h3 className="text-lg font-semibold text-foreground">{title}</h3>}
                </div>
            )}
            {children}
        </div>
    );
};
