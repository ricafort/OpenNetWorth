'use client';

import { PieChart, Pie, Cell, Tooltip, Legend } from 'recharts';

interface AllocationPieChartProps {
    data: { name: string; value: number }[];
    title: string;
    colors?: string[];
}

const DEFAULT_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#64748b', '#ef4444', '#06b6d4'];

export default function AllocationPieChart({ data, title, colors = DEFAULT_COLORS }: AllocationPieChartProps) {
    const chartData = data
        .filter(item => item.value > 0)
        .sort((a, b) => b.value - a.value);

    if (chartData.length === 0) {
        return (
            <div className="bg-card p-6 rounded-2xl border border-border shadow-sm h-[320px] flex flex-col items-center justify-center text-muted-foreground">
                <p>No data available for {title}.</p>
            </div>
        );
    }

    return (
        <div className="bg-card p-6 rounded-2xl border border-border shadow-sm h-[320px]">
            <h3 className="font-bold text-foreground mb-2">{title}</h3>
            <div className="w-full flex items-center justify-center">
                <PieChart width={400} height={240}>
                    <Pie
                        data={chartData}
                        cx="50%"
                        cy="50%"
                        innerRadius={50}
                        outerRadius={80}
                        paddingAngle={5}
                        dataKey="value"
                    >
                        {chartData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={colors[index % colors.length]} strokeWidth={2} stroke="transparent" />
                        ))}
                    </Pie>
                    <Tooltip
                        formatter={(value: number | string | undefined) => [`${Number(value || 0).toFixed(1)}%`, 'Weight']}
                        contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                    />
                    <Legend
                        verticalAlign="middle"
                        align="right"
                        layout="vertical"
                        wrapperStyle={{ fontSize: '12px' }}
                    />
                </PieChart>
            </div>
        </div>
    );
}
