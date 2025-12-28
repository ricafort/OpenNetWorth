import { ReactNode } from 'react';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

interface StatCardProps {
    title: string;
    value: string;
    change?: string;
    trend?: 'up' | 'down' | 'neutral';
    icon: ReactNode;
    privacySensitive?: boolean;
}

export default function StatCard({ title, value, change, trend, icon, privacySensitive }: StatCardProps) {
    return (
        <div className="flex flex-col h-full justify-between">
            <div className="flex justify-between items-start mb-2">
                <span className="text-sm font-medium text-muted-foreground">{title}</span>
                <div className="p-2 bg-muted rounded-xl">
                    {icon}
                </div>
            </div>

            <div>
                <h3 className={`text-2xl font-black text-foreground tracking-tight mb-1 ${privacySensitive ? 'privacy-value' : ''}`}>{value}</h3>

                {change && (
                    <div className={`flex items-center text-xs font-bold gap-1 
                        ${trend === 'up' ? 'text-emerald-600' :
                            trend === 'down' ? 'text-rose-600' : 'text-slate-500'}`}
                    >
                        {trend === 'up' && <TrendingUp size={14} />}
                        {trend === 'down' && <TrendingDown size={14} />}
                        {trend === 'neutral' && <Minus size={14} />}
                        <span>{change}</span>
                        <span className="text-muted-foreground ml-1 font-medium">vs last month</span>
                    </div>
                )}
            </div>
        </div>
    );
}
