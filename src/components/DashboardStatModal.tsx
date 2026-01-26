'use client';

import { X, ArrowUp, ArrowDown, BarChart3 } from 'lucide-react';
import { cn } from "@/lib/utils";
import { EmailVolumeChart } from './EmailVolumeChart';

interface StatData {
    name: string;
    value: string;
    change: string;
    trend: string;
    icon: any;
    color: string;
    bg: string;
    chartData?: { date: string; value: number }[];
}

interface DashboardStatModalProps {
    stat: StatData | null;
    onClose: () => void;
}

export function DashboardStatModal({ stat, onClose }: DashboardStatModalProps) {
    if (!stat) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={onClose}>
            <div
                className="bg-slate-900 border border-white/10 rounded-xl shadow-xl w-full max-w-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200"
                onClick={e => e.stopPropagation()}
            >
                <div className="p-6 border-b border-white/10 flex items-center justify-between bg-white/5">
                    <div className="flex items-center gap-4">
                        <div className={cn("p-3 rounded-xl", stat.bg)}>
                            <stat.icon className={cn("w-6 h-6", stat.color)} />
                        </div>
                        <div>
                            <h3 className="font-semibold text-white text-lg">{stat.name} Details</h3>
                            <p className="text-white/50 text-sm">Deep dive into your {stat.name.toLowerCase()} metrics</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="text-white/40 hover:text-white p-2 hover:bg-white/10 rounded-lg transition-colors">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <div className="p-6 space-y-8">
                    {/* Key Metrics Row */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="p-4 bg-white/5 rounded-xl border border-white/10">
                            <p className="text-sm text-white/50 font-medium">Current Value</p>
                            <p className="text-2xl font-bold text-white mt-1">{stat.value}</p>
                        </div>
                        <div className="p-4 bg-white/5 rounded-xl border border-white/10">
                            <p className="text-sm text-white/50 font-medium">Period Change</p>
                            <div className={cn("flex items-center gap-1 mt-1 font-semibold",
                                stat.trend === 'up' ? 'text-green-400' : 'text-red-400')}>
                                {stat.trend === 'up' ? <ArrowUp className="w-4 h-4" /> : <ArrowDown className="w-4 h-4" />}
                                {stat.change}
                            </div>
                        </div>
                        <div className="p-4 bg-white/5 rounded-xl border border-white/10">
                            <p className="text-sm text-white/50 font-medium">Status</p>
                            <div className="flex items-center gap-2 mt-1">
                                <span className="relative flex h-3 w-3">
                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                                    <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
                                </span>
                                <span className="text-white/90 font-semibold">Active</span>
                            </div>
                        </div>
                    </div>

                    {/* Chart Placeholder */}
                    <div className="border border-white/10 rounded-xl p-6">
                        <div className="flex items-center justify-between mb-6">
                            <h4 className="font-semibold text-white">Historical Trend</h4>
                            <select className="text-sm border-none bg-black/40 text-white rounded-lg px-3 py-1 outline-none cursor-pointer hover:bg-black/60 transition-colors">
                                <option>Last 30 Days</option>
                                <option>Last 90 Days</option>
                                <option>This Year</option>
                            </select>
                        </div>
                        <div className="h-64 w-full">
                            {stat.chartData && stat.chartData.length > 0 ? (
                                <EmailVolumeChart data={stat.chartData.map(d => ({ date: d.date, sent: d.value }))} />
                            ) : (
                                <div className="flex items-center justify-center h-full bg-white/5 rounded-lg border border-dashed border-white/10">
                                    <div className="text-center">
                                        <BarChart3 className="w-8 h-8 text-white/20 mx-auto mb-2" />
                                        <p className="text-white/40 text-sm">No data available for {stat.name}</p>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Breakdown / Table Placeholder */}
                    <div>
                        {/* Removed mock Recent Contributors table */}
                    </div>
                </div>

                <div className="p-4 border-t border-white/10 bg-white/5 flex justify-end">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 bg-white/5 border border-white/10 hover:bg-white/10 text-white font-medium rounded-lg transition-colors"
                    >
                        Close
                    </button>
                </div>
            </div>
        </div>
    );
}
