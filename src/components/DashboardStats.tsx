'use client';

import { useState } from 'react';
import { Mail, MousePointerClick, Reply, TrendingUp, ArrowUp, ArrowDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { DashboardStatModal } from './DashboardStatModal';

interface DashboardStatsProps {
    data: {
        totalSent: number;
        openRate: string;
        replyRate: string;
        opportunities: number;
        sentChange?: string;
        openRateChange?: string;
        replyRateChange?: string;
        opportunitiesChange?: string;
        dailyStats: {
            date: string;
            sent: number;
            opened: number;
            replied: number;
        }[];
    }
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

export function DashboardStats({ data }: DashboardStatsProps) {
    const [selectedStat, setSelectedStat] = useState<StatData | null>(null);

    const getTrend = (changeStr: string = "+0%") => changeStr.startsWith('-') ? 'down' : 'up';

    const stats: StatData[] = [
        { 
            name: 'Emails Sent', 
            value: data.totalSent.toLocaleString(), 
            change: data.sentChange || '+0%', 
            trend: getTrend(data.sentChange), 
            icon: Mail, 
            color: 'text-blue-600', 
            bg: 'bg-blue-50',
            chartData: data.dailyStats.map(d => ({ date: d.date, value: d.sent }))
        },
        { 
            name: 'Open Rate', 
            value: `${data.openRate}%`, 
            change: data.openRateChange || '+0%', 
            trend: getTrend(data.openRateChange), 
            icon: MousePointerClick, 
            color: 'text-purple-600', 
            bg: 'bg-purple-50',
            chartData: data.dailyStats.map(d => ({ date: d.date, value: d.opened }))
        },
        { 
            name: 'Reply Rate', 
            value: `${data.replyRate}%`, 
            change: data.replyRateChange || '+0%', 
            trend: getTrend(data.replyRateChange), 
            icon: Reply, 
            color: 'text-green-600', 
            bg: 'bg-green-50',
            chartData: data.dailyStats.map(d => ({ date: d.date, value: d.replied }))
        },
        { 
            name: 'Opportunities', 
            value: data.opportunities.toString(), 
            change: data.opportunitiesChange || '+0', 
            trend: getTrend(data.opportunitiesChange), 
            icon: TrendingUp, 
            color: 'text-orange-600', 
            bg: 'bg-orange-50',
            // Mock data for opportunities or use replied as proxy
            chartData: data.dailyStats.map(d => ({ date: d.date, value: Math.round(d.replied * 0.3) }))
        },
    ];

    return (
        <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {stats.map((stat) => (
                    <div 
                        key={stat.name} 
                        onClick={() => setSelectedStat(stat)}
                        className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-all duration-200 cursor-pointer active:scale-[0.98]"
                    >
                        <div className="flex items-center justify-between mb-4">
                            <div className={cn("p-2.5 rounded-lg", stat.bg)}>
                                <stat.icon className={cn("w-5 h-5", stat.color)} />
                            </div>
                            <span className={cn("text-xs font-semibold px-2 py-1 rounded-full flex items-center gap-1",
                                stat.trend === 'up' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700')}>
                                {stat.trend === 'up' ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />}
                                {stat.change}
                            </span>
                        </div>
                        <h3 className="text-slate-500 text-sm font-medium">{stat.name}</h3>
                        <p className="text-2xl font-bold text-slate-900 mt-1 tracking-tight">{stat.value}</p>
                    </div>
                ))}
            </div>

            <DashboardStatModal 
                stat={selectedStat} 
                onClose={() => setSelectedStat(null)} 
            />
        </>
    );
}
