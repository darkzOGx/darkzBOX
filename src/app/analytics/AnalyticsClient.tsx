"use client";

import { useState } from "react";
import {
    AreaChart,
    Area,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    BarChart,
    Bar,
    Legend
} from "recharts";
import { ArrowUpRight, ArrowDownRight, Mail, BookOpen, MessageSquare, AlertOctagon } from "lucide-react";
import { DashboardStatModal } from "@/components/DashboardStatModal";
import { cn } from "@/lib/utils";

interface AnalyticsClientProps {
    globalStats: {
        sent: number;
        opened: number;
        replied: number;
        bounced: number;
        sentChange?: string;
        openedChange?: string;
        repliedChange?: string;
        bouncedChange?: string;
    };
    dailyStats: Array<{
        date: string;
        sent: number;
        opened: number;
        replied: number;
    }>;
    campaignStats: Array<{
        id: string;
        name: string;
        sent: number;
        opened: number;
        replied: number;
        status: string;
    }>;
}

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

export function AnalyticsClient({ globalStats, dailyStats, campaignStats }: AnalyticsClientProps) {
    const [selectedStat, setSelectedStat] = useState<StatData | null>(null);

    const getTrend = (changeStr: string = "+0%") => changeStr.startsWith('-') ? 'down' : 'up';

    const StatCard = ({ title, value, icon: Icon, color, subValue, change, onClick }: any) => (
        <div
            onClick={onClick}
            className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-all duration-200 cursor-pointer active:scale-[0.98]"
        >
            <div className="flex items-center justify-between mb-4">
                <div className={`p-2 rounded-lg ${color}`}>
                    <Icon className="w-5 h-5 text-white" />
                </div>
                {change && (
                    <span className={cn("text-xs font-medium px-2 py-1 rounded-full flex items-center gap-1",
                        change.startsWith('-') ? 'bg-red-50 text-red-600' : 'bg-emerald-50 text-emerald-600')}>
                        {change.startsWith('-') ? <ArrowDownRight className="w-3 h-3" /> : <ArrowUpRight className="w-3 h-3" />}
                        {change}
                    </span>
                )}
            </div>
            <h3 className="text-slate-500 text-sm font-medium">{title}</h3>
            <p className="text-2xl font-bold text-slate-900 mt-1">{value.toLocaleString()}</p>
            {subValue && <p className="text-xs text-slate-400 mt-1">{subValue}</p>}
        </div>
    );

    return (
        <div className="p-8 max-w-7xl mx-auto space-y-8">
            <div>
                <h1 className="text-2xl font-bold text-slate-900">Analytics</h1>
                <p className="text-slate-500 text-sm mt-1">Overview of your email campaign performance</p>
            </div>

            {/* KPI Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <StatCard
                    title="Total Sent"
                    value={globalStats.sent}
                    icon={Mail}
                    color="bg-blue-500"
                    change={globalStats.sentChange || '+0%'}
                    onClick={() => setSelectedStat({
                        name: 'Total Sent',
                        value: globalStats.sent.toLocaleString(),
                        change: globalStats.sentChange || '+0%',
                        trend: getTrend(globalStats.sentChange),
                        icon: Mail,
                        color: 'text-blue-600',
                        bg: 'bg-blue-50',
                        chartData: dailyStats.map(d => ({ date: d.date, value: d.sent }))
                    })}
                />
                <StatCard
                    title="Opened"
                    value={globalStats.opened}
                    icon={BookOpen}
                    color="bg-purple-500"
                    change={globalStats.openedChange || '+0%'}
                    subValue={globalStats.sent > 0 ? `${Math.round((globalStats.opened / globalStats.sent) * 100)}% Rate` : '0% Rate'}
                    onClick={() => setSelectedStat({
                        name: 'Opened',
                        value: globalStats.opened.toLocaleString(),
                        change: globalStats.openedChange || '+0%',
                        trend: getTrend(globalStats.openedChange),
                        icon: BookOpen,
                        color: 'text-purple-600',
                        bg: 'bg-purple-50',
                        chartData: dailyStats.map(d => ({ date: d.date, value: d.opened }))
                    })}
                />
                <StatCard
                    title="Replied"
                    value={globalStats.replied}
                    icon={MessageSquare}
                    color="bg-emerald-500"
                    change={globalStats.repliedChange || '+0%'}
                    subValue={globalStats.sent > 0 ? `${Math.round((globalStats.replied / globalStats.sent) * 100)}% Rate` : '0% Rate'}
                    onClick={() => setSelectedStat({
                        name: 'Replied',
                        value: globalStats.replied.toLocaleString(),
                        change: globalStats.repliedChange || '+0%',
                        trend: getTrend(globalStats.repliedChange),
                        icon: MessageSquare,
                        color: 'text-emerald-600',
                        bg: 'bg-emerald-50',
                        chartData: dailyStats.map(d => ({ date: d.date, value: d.replied }))
                    })}
                />
                <StatCard
                    title="Bounced"
                    value={globalStats.bounced}
                    icon={AlertOctagon}
                    color="bg-rose-500"
                    change={globalStats.bouncedChange || '+0%'}
                    subValue={globalStats.sent > 0 ? `${Math.round((globalStats.bounced / globalStats.sent) * 100)}% Rate` : '0% Rate'}
                    onClick={() => setSelectedStat({
                        name: 'Bounced',
                        value: globalStats.bounced.toLocaleString(),
                        change: globalStats.bouncedChange || '+0%',
                        trend: getTrend(globalStats.bouncedChange),
                        icon: AlertOctagon,
                        color: 'text-rose-600',
                        bg: 'bg-rose-50',
                        chartData: dailyStats.map(d => ({ date: d.date, value: 0 }))
                    })}
                />
            </div>

            <DashboardStatModal
                stat={selectedStat}
                onClose={() => setSelectedStat(null)}
            />

            {/* Charts Section */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Main Trend Chart */}
                <div className="lg:col-span-2 bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                    <h3 className="text-lg font-semibold text-slate-900 mb-6">Engagement Trends (Last 30 Days)</h3>
                    <div className="h-[350px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={dailyStats}>
                                <defs>
                                    <linearGradient id="colorSent" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.1} />
                                        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                                    </linearGradient>
                                    <linearGradient id="colorOpened" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#a855f7" stopOpacity={0.1} />
                                        <stop offset="95%" stopColor="#a855f7" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                                <XAxis
                                    dataKey="date"
                                    axisLine={false}
                                    tickLine={false}
                                    tick={{ fill: '#64748B', fontSize: 12 }}
                                    dy={10}
                                />
                                <YAxis
                                    axisLine={false}
                                    tickLine={false}
                                    tick={{ fill: '#64748B', fontSize: 12 }}
                                />
                                <Tooltip
                                    contentStyle={{ backgroundColor: '#fff', borderRadius: '8px', border: '1px solid #E2E8F0', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                                    itemStyle={{ fontSize: '13px', fontWeight: 500 }}
                                />
                                <Legend />
                                <Area
                                    type="monotone"
                                    dataKey="sent"
                                    name="Emails Sent"
                                    stroke="#3b82f6"
                                    strokeWidth={2}
                                    fillOpacity={1}
                                    fill="url(#colorSent)"
                                />
                                <Area
                                    type="monotone"
                                    dataKey="opened"
                                    name="Opened"
                                    stroke="#a855f7"
                                    strokeWidth={2}
                                    fillOpacity={1}
                                    fill="url(#colorOpened)"
                                />
                                <Area
                                    type="monotone"
                                    dataKey="replied"
                                    name="Replied"
                                    stroke="#10b981"
                                    strokeWidth={2}
                                    fillOpacity={0}
                                    fill="transparent"
                                />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Campaign Performance Table (Mini) */}
                <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
                    <h3 className="text-lg font-semibold text-slate-900 mb-4">Top Campaigns</h3>
                    <div className="overflow-y-auto flex-1">
                        <table className="w-full text-sm text-left">
                            <thead className="text-xs text-slate-500 uppercase bg-slate-50 sticky top-0">
                                <tr>
                                    <th className="px-3 py-3 rounded-l-lg">Name</th>
                                    <th className="px-3 py-3 text-right">Sent</th>
                                    <th className="px-3 py-3 text-right rounded-r-lg">Reply%</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {campaignStats.map((camp) => (
                                    <tr key={camp.id} className="hover:bg-slate-50/50 transition-colors">
                                        <td className="px-3 py-3 font-medium text-slate-900 truncate max-w-[120px]" title={camp.name}>
                                            {camp.name}
                                        </td>
                                        <td className="px-3 py-3 text-right text-slate-600">
                                            {camp.sent}
                                        </td>
                                        <td className="px-3 py-3 text-right">
                                            <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${(camp.replied / (camp.sent || 1)) > 0.1
                                                ? 'bg-emerald-100 text-emerald-800'
                                                : 'bg-slate-100 text-slate-600'
                                                }`}>
                                                {Math.round((camp.replied / (camp.sent || 1)) * 100)}%
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                                {campaignStats.length === 0 && (
                                    <tr>
                                        <td colSpan={3} className="px-3 py-8 text-center text-slate-400">
                                            No campaigns found
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    );
}
