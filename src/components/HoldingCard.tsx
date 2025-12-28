
// src/components/HoldingCard.tsx
import { ArrowUpRight, ArrowDownRight, TrendingUp } from 'lucide-react';
import { clsx } from 'clsx';

interface HoldingCardProps {
    holding: {
        ticker: string;
        name: string;
        value: number;
        weight: number;
        gain: number;
        gainPercent: number;
        dayChange: number;
        dayChangePercent: number;
        shares: number;
        price: number;
        isConcentrated: boolean;
    };
    privacySensitive?: boolean;
}

export default function HoldingCard({ holding, privacySensitive = false }: HoldingCardProps) {
    const isPositive = holding.gain >= 0;
    const isDayPositive = holding.dayChange >= 0;
    const blurClass = privacySensitive ? 'privacy-value' : '';

    return (
        <div className={clsx(
            "bg-card p-4 rounded-xl border transition-all duration-200 hover:shadow-md",
            holding.isConcentrated ? "border-amber-200 dark:border-amber-900/50" : "border-border"
        )}>
            <div className="flex justify-between items-start mb-3">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-blue-600 dark:text-blue-400 font-bold text-sm">
                        {holding.ticker.slice(0, 2)}
                    </div>
                    <div>
                        <h3 className="font-bold text-foreground">{holding.ticker}</h3>
                        <p className="text-xs text-muted-foreground truncate max-w-[120px]">{holding.name}</p>
                    </div>
                </div>
                <div className="text-right">
                    <div className={clsx("text-lg font-bold text-foreground", blurClass)}>
                        ${holding.value.toLocaleString()}
                    </div>
                    <div className="text-xs font-medium text-muted-foreground">
                        {holding.weight.toFixed(1)}% of Portfolio
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-2 gap-4 pt-3 border-t border-border">
                <div>
                    <p className="text-xs text-muted-foreground mb-1">Total Return</p>
                    <div className={clsx("flex items-center gap-1 text-sm font-semibold", isPositive ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400")}>
                        {isPositive ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                        <span>{isPositive ? '+' : ''}{holding.gainPercent.toFixed(2)}%</span>
                    </div>
                    <p className={clsx("text-xs", isPositive ? "text-green-600/70" : "text-red-600/70", blurClass)}>
                        {isPositive ? '+' : ''}${holding.gain.toLocaleString()}
                    </p>
                </div>
                <div>
                    <p className="text-xs text-muted-foreground mb-1">Today</p>
                    <div className={clsx("flex items-center gap-1 text-sm font-semibold", isDayPositive ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400")}>
                        {isDayPositive ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                        <span>{isDayPositive ? '+' : ''}{holding.dayChangePercent.toFixed(2)}%</span>
                    </div>
                    <p className={clsx("text-xs", isDayPositive ? "text-green-600/70" : "text-red-600/70", blurClass)}>
                        {isDayPositive ? '+' : ''}${Math.abs(holding.dayChange).toLocaleString()}
                    </p>
                </div>
            </div>

            <div className={clsx("mt-3 flex justify-between items-center text-xs text-muted-foreground bg-secondary/50 p-2 rounded-lg", blurClass)}>
                {holding.ticker !== 'Manual' && holding.shares > 0 ? (
                    <span>{holding.shares} shares @ ${holding.price.toFixed(2)}</span>
                ) : (
                    <span>Manual Valuation</span>
                )}
            </div>
        </div>
    );
}
