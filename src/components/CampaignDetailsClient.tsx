'use client';

import { ArrowLeft, Clock, Mail, MoreHorizontal, Pause, Play, Users } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { useState } from "react";
import { AddLeadModal } from "@/components/AddLeadModal";
import { LeadSelectionModal } from "@/components/LeadSelectionModal";
import { toggleCampaignStatus } from "@/actions";
import { useRouter } from "next/navigation";

interface CampaignDetailsClientProps {
    campaign: any;
    sent: number;
    opened: number;
    replied: number;
}

export function CampaignDetailsClient({ campaign, sent, opened, replied }: CampaignDetailsClientProps) {
    const [isAddLeadOpen, setIsAddLeadOpen] = useState(false);
    const [isLeadSelectionOpen, setIsLeadSelectionOpen] = useState(false);
    const router = useRouter();

    const handleStatusToggle = async () => {
        try {
            await toggleCampaignStatus(campaign.id, campaign.status);
            router.refresh();
        } catch (error) {
            console.error("Failed to toggle status", error);
            alert("Failed to update status");
        }
    };

    return (
        <div className="p-8 max-w-7xl mx-auto space-y-8">
            {/* Header */}
            <div className="flex items-center gap-4">
                <Link href="/campaigns" className="p-2 hover:bg-slate-100 rounded-full text-slate-500 transition-colors">
                    <ArrowLeft className="w-5 h-5" />
                </Link>
                <div>
                    <h1 className="text-2xl font-bold text-slate-900">{campaign.name}</h1>
                    <div className="flex items-center gap-2 mt-1">
                        <span className={cn("px-2 py-0.5 text-xs font-bold rounded-full uppercase",
                            campaign.status === 'ACTIVE' ? "bg-green-100 text-green-700" : "bg-slate-100 text-slate-600")}>
                            {campaign.status}
                        </span>
                        <span className="text-sm text-slate-500">• Created {new Date(campaign.createdAt).toLocaleDateString()}</span>
                    </div>
                </div>
                <div className="ml-auto flex gap-2">
                    <Link 
                        href={`/campaigns/${campaign.id}/edit`}
                        className="bg-white border border-slate-200 text-slate-700 px-4 py-2 rounded-lg text-sm font-medium hover:bg-slate-50 transition-colors shadow-sm flex items-center justify-center"
                    >
                        Edit Sequence
                    </Link>
                    <button 
                        onClick={() => setIsLeadSelectionOpen(true)}
                        className="bg-white border border-slate-200 text-slate-700 px-4 py-2 rounded-lg text-sm font-medium hover:bg-slate-50 transition-colors shadow-sm"
                    >
                        Add Leads
                    </button>
                    <button 
                        onClick={handleStatusToggle}
                        className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors shadow-sm flex items-center gap-2"
                    >
                        {campaign.status === 'ACTIVE' ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                        {campaign.status === 'ACTIVE' ? 'Pause Campaign' : 'Resume Campaign'}
                    </button>
                </div>
            </div>

            {/* ... Stats and Steps ... */}
            <div className="grid grid-cols-4 gap-4">
                <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
                    <div className="flex items-center gap-2 text-slate-500 mb-2">
                        <Users className="w-4 h-4" />
                        <span className="text-xs font-semibold uppercase tracking-wider">Total Leads</span>
                    </div>
                    <p className="text-2xl font-bold text-slate-900">{campaign._count.leads}</p>
                </div>
                <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
                    <div className="flex items-center gap-2 text-slate-500 mb-2">
                        <Mail className="w-4 h-4" />
                        <span className="text-xs font-semibold uppercase tracking-wider">Sent</span>
                    </div>
                    <p className="text-2xl font-bold text-slate-900">{sent}</p>
                </div>
                <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
                    <div className="flex items-center gap-2 text-slate-500 mb-2">
                        <Mail className="w-4 h-4" />
                        <span className="text-xs font-semibold uppercase tracking-wider">Open Rate</span>
                    </div>
                    <p className="text-2xl font-bold text-green-600">{sent > 0 ? ((opened / sent) * 100).toFixed(1) : 0}%</p>
                </div>
                <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
                    <div className="flex items-center gap-2 text-slate-500 mb-2">
                        <Mail className="w-4 h-4" />
                        <span className="text-xs font-semibold uppercase tracking-wider">Reply Rate</span>
                    </div>
                    <p className="text-2xl font-bold text-blue-600">{sent > 0 ? ((replied / sent) * 100).toFixed(1) : 0}%</p>
                </div>
            </div>

            {/* Steps Visualizer */}
            <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
                <div className="p-4 border-b border-slate-200 bg-slate-50">
                    <h3 className="font-semibold text-slate-900">Sequence Steps</h3>
                </div>
                <div className="divide-y divide-slate-100">
                    {campaign.steps.map((step: any, idx: number) => (
                        <div key={step.id} className="p-6 flex gap-6 hover:bg-slate-50/50 transition-colors">
                            <div className="flex-shrink-0 flex flex-col items-center">
                                <div className="h-8 w-8 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center text-xs font-bold text-slate-600">
                                    {idx + 1}
                                </div>
                                {idx < campaign.steps.length - 1 && <div className="w-0.5 h-full bg-slate-100 my-2"></div>}
                            </div>
                            <div className="flex-1 space-y-2">
                                <div className="flex items-center justify-between">
                                    <h4 className="font-medium text-slate-900 text-sm">
                                        {idx === 0 ? step.subject : 'Follow-up Email'}
                                    </h4>
                                    <div className="flex items-center gap-2 text-xs text-slate-500">
                                        <Clock className="w-3 h-3" />
                                        Wait {step.waitDays} days
                                    </div>
                                </div>
                                <div className="bg-slate-50 p-4 rounded-lg border border-slate-200 text-sm text-slate-600">
                                    {step.body.substring(0, 150)}...
                                </div>
                            </div>
                        </div>
                    ))}
                    {campaign.steps.length === 0 && (
                        <div className="p-8 text-center text-slate-500 text-sm">No steps configured.</div>
                    )}
                </div>
            </div>

            {isLeadSelectionOpen && (
                <LeadSelectionModal
                    isOpen={isLeadSelectionOpen}
                    onClose={() => setIsLeadSelectionOpen(false)}
                    campaignId={campaign.id}
                />
            )}
        </div>
    );
}

