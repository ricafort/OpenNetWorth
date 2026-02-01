
import React from 'react';
import { useTheme } from '@/contexts/ThemeContext';

interface PageHeaderProps {
    title: string;
    description: string;
    action?: React.ReactNode;
}

export const PageHeader = ({ title, description, action }: PageHeaderProps) => {
    const { isPrivacyBlur } = useTheme();
    const blurClass = isPrivacyBlur
        ? 'opacity-20 blur-[2px] pointer-events-none transition-all duration-500'
        : 'transition-all duration-500';

    return (
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8">
            <div className={blurClass}>
                <h2 className="text-3xl font-black text-foreground tracking-tight">{title}</h2>
                <p className="text-muted-foreground mt-2 font-medium">{description}</p>
            </div>
            {action && <div>{action}</div>}
        </div>
    );
};
