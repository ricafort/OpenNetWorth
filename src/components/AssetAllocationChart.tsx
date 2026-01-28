'use client';

            <h3 className="text-lg font-bold text-slate-900 mb-4">Asset Allocation</h3>
            <div className="w-full h-[320px] flex items-center justify-center">
                <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                        <Pie
                            data={data}
                            cx="50%"
                            cy="50%"
                            innerRadius={60}
                            outerRadius={80}
                            paddingAngle={5}
                            dataKey="value"
                        >
                            {data.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={COLORS[entry.name] || DEFAULT_COLOR} />
                            ))}
                        </Pie>
                        <Tooltip
                            formatter={(value: any) => [formatCurrency(Number(value), baseCurrency), 'Value']}
                            contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                        />
                        <Legend
                            layout="vertical"
                            verticalAlign="middle"
                            align="right"
                            wrapperStyle={{ fontSize: '12px', fontWeight: 500 }}
                        />
                    </PieChart>
                </ResponsiveContainer>
            </div>
        </div >
import { Asset } from '@/types';
import { useDashboard } from '@/contexts/DashboardContext';
import { convertAmount, formatCurrency } from '@/lib/utils/currencyService';

interface AssetAllocationChartProps {
    assets: Asset[];
}

export default function AssetAllocationChart({ assets }: AssetAllocationChartProps) {
    const { baseCurrency } = useDashboard();

    // 1. Group assets by type and sum values (Converted to Base Currency)
    const dataByType = assets.reduce((acc, asset) => {
        const type = asset.type;
        const val = convertAmount(asset.value, asset.currency || 'USD', baseCurrency);
        acc[type] = (acc[type] || 0) + val;
        return acc;
    }, {} as Record<string, number>);

    // 2. Format for Recharts
    const data = Object.entries(dataByType)
        .map(([name, value]) => ({
            name: name.replace('_', ' ').replace(/\b\w/g, c => c.toUpperCase()), // Title Case
            value
        }))
        .filter(item => item.value > 0) // Hide empty categories
        .sort((a, b) => b.value - a.value); // Sort biggest to smallest

    // 3. Define Colors
    const COLORS: Record<string, string> = {
        'Cash': '#3b82f6',         // blue-500
        'Investment': '#10b981',   // emerald-500
        'Real Estate': '#f59e0b',  // amber-500
        'Crypto': '#8b5cf6',       // violet-500
        'Vehicle': '#64748b',      // slate-500
        'Other': '#94a3b8'         // slate-400
    };

    const DEFAULT_COLOR = '#cbd5e1';

    if (assets.length === 0) {
        return (
            <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm h-[400px] flex flex-col items-center justify-center text-slate-400">
                <p>No assets to display.</p>
            </div>
        );
    }

    return (
        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm h-[400px]">
            <h3 className="text-lg font-bold text-slate-900 mb-4">Asset Allocation</h3>
            <div className="w-full h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                        <Pie
                            data={data}
                            cx="50%"
                            cy="50%"
                            innerRadius={60}
                            outerRadius={90}
                            paddingAngle={5}
                            dataKey="value"
                        >
                            {data.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={COLORS[entry.name] || DEFAULT_COLOR} />
                            ))}
                        </Pie>
                        <Tooltip
                            formatter={(value: any) => [formatCurrency(Number(value), baseCurrency), 'Value']}
                            contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                        />
                        <Legend
                            layout="vertical"
                            verticalAlign="middle"
                            align="right"
                            wrapperStyle={{ fontSize: '12px', fontWeight: 500 }}
                        />
                    </PieChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
}
