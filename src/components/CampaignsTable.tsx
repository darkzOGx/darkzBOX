'use client';

import { Play, Pause, MoreHorizontal, Trash2, Edit } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { useRouter } from "next/navigation";
import { toggleCampaignStatus, deleteCampaign } from "@/actions";
import { useState, useRef, useEffect } from "react";

interface Campaign {
    id: string;
    name: string;
    status: string;
    sent: number;
    leads: number;
    openRate: string;
    replyRate: string;
    created: string;
}

export function CampaignsTable({ campaigns }: { campaigns: Campaign[] }) {
    const router = useRouter();
    const [openMenuId, setOpenMenuId] = useState<string | null>(null);
    const menuRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
                setOpenMenuId(null);
            }
        };

        document.addEventListener("mousedown", handleClickOutside);
        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, []);

    const handleRowClick = (id: string) => {
        router.push(`/campaigns/${id}`);
    };

    const handleStatusToggle = async (e: React.MouseEvent, id: string, currentStatus: string) => {
        e.stopPropagation();
        try {
            await toggleCampaignStatus(id, currentStatus);
            router.refresh();
        } catch (error) {
            console.error("Failed to toggle status", error);
            alert("Failed to update status");
        }
    };

    const handleMenuToggle = (e: React.MouseEvent, id: string) => {
        e.stopPropagation();
        setOpenMenuId(openMenuId === id ? null : id);
    };

    const handleDelete = async (e: React.MouseEvent, id: string) => {
        e.stopPropagation();
        if (confirm("Are you sure you want to delete this campaign? This cannot be undone.")) {
            try {
                await deleteCampaign(id);
                setOpenMenuId(null);
                router.refresh();
            } catch (error) {
                alert("Failed to delete campaign");
            }
        }
    };

    return (
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm min-h-[400px]">
            <table className="w-full text-sm text-left">
                <thead className="bg-slate-50 text-slate-500 font-medium border-b border-slate-200">
                    <tr>
                        <th className="px-6 py-4">Name</th>
                        <th className="px-6 py-4">Status</th>
                        <th className="px-6 py-4">Progress</th>
                        <th className="px-6 py-4">Stats</th>
                        <th className="px-6 py-4 text-right">Actions</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                    {campaigns.length === 0 ? (
                        <tr><td colSpan={5} className="text-center py-8 text-slate-500">No campaigns found.</td></tr>
                    ) : campaigns.map((campaign) => (
                        <tr 
                            key={campaign.id} 
                            className="hover:bg-slate-50/50 transition-colors cursor-pointer group"
                            onClick={() => handleRowClick(campaign.id)}
                        >
                            <td className="px-6 py-4">
                                <Link 
                                    href={`/campaigns/${campaign.id}`} 
                                    className="font-semibold text-slate-900 hover:text-blue-600 transition-colors block"
                                    onClick={(e) => e.stopPropagation()}
                                >
                                    {campaign.name}
                                </Link>
                                <p className="text-xs text-slate-400 mt-0.5">Created {campaign.created}</p>
                            </td>
                            <td className="px-6 py-4">
                                <span className={cn("px-2.5 py-1 rounded-full text-xs font-medium border uppercase tracking-wider",
                                    campaign.status === 'ACTIVE' ? 'bg-green-50 text-green-700 border-green-200' :
                                        campaign.status === 'PAUSED' ? 'bg-yellow-50 text-yellow-700 border-yellow-200' :
                                            campaign.status === 'COMPLETED' ? 'bg-slate-100 text-slate-700 border-slate-200' :
                                                'bg-slate-50 text-slate-500 border-slate-200'
                                )}>
                                    {campaign.status === 'ACTIVE' && <span className="w-1.5 h-1.5 rounded-full bg-green-500 inline-block mr-1.5 mb-0.5 animate-pulse"></span>}
                                    {campaign.status}
                                </span>
                            </td>
                            <td className="px-6 py-4">
                                <div className="flex items-center gap-2 mb-1.5">
                                    <span className="text-slate-600 font-medium">{campaign.sent}</span>
                                    <span className="text-slate-400">/ {campaign.leads}</span>
                                </div>
                                <div className="w-24 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                    <div
                                        className="h-full bg-blue-500 rounded-full"
                                        style={{ width: campaign.leads > 0 ? `${(campaign.sent / campaign.leads) * 100}%` : '0%' }}
                                    ></div>
                                </div>
                            </td>
                            <td className="px-6 py-4">
                                <div className="flex gap-4">
                                    <div>
                                        <p className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Open</p>
                                        <p className="text-slate-700 font-medium">{campaign.openRate}</p>
                                    </div>
                                    <div>
                                        <p className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Reply</p>
                                        <p className="text-slate-700 font-medium">{campaign.replyRate}</p>
                                    </div>
                                </div>
                            </td>
                            <td className="px-6 py-4 text-right relative">
                                <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <button 
                                        onClick={(e) => handleStatusToggle(e, campaign.id, campaign.status)}
                                        className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                        title={campaign.status === 'ACTIVE' ? "Pause" : "Resume"}
                                    >
                                        {campaign.status === 'ACTIVE' ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                                    </button>
                                    <button 
                                        onClick={(e) => handleMenuToggle(e, campaign.id)}
                                        className={cn("p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors", openMenuId === campaign.id && "bg-slate-100 text-slate-600 opacity-100")}
                                    >
                                        <MoreHorizontal className="w-4 h-4" />
                                    </button>
                                </div>
                                {openMenuId === campaign.id && (
                                    <div ref={menuRef} className="absolute right-8 top-12 z-10 w-36 bg-white rounded-lg shadow-lg border border-slate-100 py-1 animate-in fade-in zoom-in-95 duration-100 origin-top-right">
                                        <button 
                                            onClick={(e) => { 
                                                e.stopPropagation(); 
                                                router.push(`/campaigns/${campaign.id}/edit`);
                                                setOpenMenuId(null);
                                            }}
                                            className="w-full px-4 py-2 text-left text-sm text-slate-600 hover:bg-slate-50 flex items-center gap-2"
                                        >
                                            <Edit className="w-3.5 h-3.5" />
                                            Edit
                                        </button>
                                        <button 
                                            onClick={(e) => handleDelete(e, campaign.id)}
                                            className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"
                                        >
                                            <Trash2 className="w-3.5 h-3.5" />
                                            Delete
                                        </button>
                                    </div>
                                )}
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}

