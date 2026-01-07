'use client';

import { Bar, BarChart, ResponsiveContainer, XAxis, YAxis, Tooltip } from "recharts"

interface EmailVolumeChartProps {
    data: {
        date: string;
        sent: number;
    }[]
}

export function EmailVolumeChart({ data }: EmailVolumeChartProps) {
    if (!data || data.length === 0) {
        return (
            <div className="flex items-center justify-center h-full">
                <p className="text-slate-400 text-sm">No data available</p>
            </div>
        )
    }

    return (
        <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <XAxis 
                    dataKey="date" 
                    stroke="#94a3b8"
                    fontSize={12}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(value) => {
                        const date = new Date(value);
                        return `${date.getMonth() + 1}/${date.getDate()}`;
                    }}
                    dy={10}
                />
                <YAxis
                    stroke="#94a3b8"
                    fontSize={12}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(value) => `${value}`}
                />
                <Tooltip 
                    cursor={{ fill: '#f1f5f9' }}
                    content={({ active, payload, label }) => {
                        if (active && payload && payload.length) {
                            return (
                                <div className="rounded-lg border border-slate-200 bg-white p-3 shadow-lg">
                                    <div className="flex flex-col gap-1">
                                        <span className="text-xs font-medium text-slate-500">
                                            {new Date(label).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}
                                        </span>
                                        <span className="text-lg font-bold text-slate-900">
                                            {payload[0].value} <span className="text-xs font-normal text-slate-500">emails</span>
                                        </span>
                                    </div>
                                </div>
                            )
                        }
                        return null
                    }}
                />
                <Bar 
                    dataKey="sent" 
                    fill="#3b82f6" 
                    radius={[4, 4, 0, 0]}
                    maxBarSize={50}
                />
            </BarChart>
        </ResponsiveContainer>
    )
}

