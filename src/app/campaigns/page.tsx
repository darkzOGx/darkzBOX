import { Plus, Search, Filter } from "lucide-react";
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
                    <h1 className="text-2xl font-bold text-slate-900">Campaigns</h1>
                    <p className="text-slate-500 text-sm mt-1">Manage your outreach sequences</p>
                </div>
                <Link href="/campaigns/new" className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium flex items-center gap-2 transition-colors shadow-sm shadow-blue-500/20">
                    <Plus className="w-4 h-4" />
                    Add New
                </Link>
            </div>

            {/* Filters */}
            <div className="flex gap-4">
                <div className="relative flex-1 max-w-md">
                    <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                    <input
                        type="text"
                        placeholder="Search campaigns..."
                        className="w-full pl-9 pr-4 py-2 text-sm bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all shadow-sm"
                    />
                </div>
                <button className="px-4 py-2 bg-white border border-slate-200 rounded-lg text-slate-600 text-sm font-medium hover:bg-slate-50 flex items-center gap-2 shadow-sm">
                    <Filter className="w-4 h-4" />
                    Filter
                </button>
            </div>

            {/* Data Table */}
            <CampaignsTable campaigns={campaigns} />
        </div>
    );
}
