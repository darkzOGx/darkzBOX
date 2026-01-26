import { BarChart3 } from "lucide-react";
import { cn } from "@/lib/utils";
import { getDashboardStats } from "@/actions";
import { DashboardStats } from "@/components/DashboardStats";
import { EmailVolumeChart } from "@/components/EmailVolumeChart";
import { RecentActivity } from "@/components/RecentActivity";

export const dynamic = 'force-dynamic';

export default async function Home() {
    const data = await getDashboardStats();

    return (
        <div className="p-8 space-y-8 max-w-7xl mx-auto">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-white">Dashboard</h1>
                    <p className="text-white/50 text-sm mt-1">Overview of your campaign performance</p>
                </div>
                <div className="flex gap-2">
                    <select className="bg-black/40 text-white border border-white/10 rounded-lg text-sm px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500/50 shadow-sm appearance-none cursor-pointer hover:bg-black/60 transition-colors">
                        <option>Last 7 days</option>
                        <option>Last 30 days</option>
                        <option>All time</option>
                    </select>
                </div>
            </div>

            {/* Stats Grid */}
            <DashboardStats data={data} />

            {/* Charts & Activity */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Main Chart */}
                <div className="lg:col-span-2 bg-white/5 p-6 rounded-xl border border-white/10 shadow-sm backdrop-blur-sm min-h-[400px]">
                    <div className="flex items-center justify-between mb-8">
                        <div>
                            <h3 className="font-semibold text-white text-lg">Email Volume</h3>
                            <p className="text-white/50 text-xs">Daily sent emails over time</p>
                        </div>
                        <div className="p-2 bg-white/5 rounded-lg">
                            <BarChart3 className="w-5 h-5 text-white/40" />
                        </div>
                    </div>
                    <div className="h-80 w-full">
                        <EmailVolumeChart data={data.dailyStats} />
                    </div>
                </div>

                {/* Live Activity Feed */}
                <RecentActivity initialData={data.activityFeed} />
            </div>
        </div>
    );
}
