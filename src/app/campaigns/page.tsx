import { Plus, Search, Filter } from "lucide-react";

export const dynamic = 'force-dynamic';

import { getCampaigns } from "@/actions";
import Link from "next/link";
import { CampaignsTable } from "@/components/CampaignsTable";

export default async function CampaignsPage() {
    const campaigns = await getCampaigns();

    return (
        <div className="p-8 max-w-7xl mx-auto space-y-6">

            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-white">Campaigns</h1>
                    <p className="text-white/50 text-sm mt-1">Manage your outreach sequences</p>
                </div>
                <Link href="/campaigns/new" className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium flex items-center gap-2 transition-colors shadow-sm shadow-blue-900/20">
                    <Plus className="w-4 h-4" />
                    Add New
                </Link>
            </div>

            {/* Filters */}
            <div className="flex gap-4">
                <div className="relative flex-1 max-w-md">
                    <Search className="absolute left-3 top-2.5 h-4 w-4 text-white/40" />
                    <input
                        type="text"
                        placeholder="Search campaigns..."
                        className="w-full pl-9 pr-4 py-2 text-sm bg-black/40 border border-white/10 rounded-lg text-white placeholder-white/20 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500/50 outline-none transition-all shadow-sm"
                    />
                </div>
                <button className="px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white text-sm font-medium hover:bg-white/10 flex items-center gap-2 shadow-sm transition-colors">
                    <Filter className="w-4 h-4" />
                    Filter
                </button>
            </div>

            {/* Data Table */}
            <CampaignsTable campaigns={campaigns} />
        </div>
    );
}
