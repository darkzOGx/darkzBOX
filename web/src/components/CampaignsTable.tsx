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
        <div className="bg-white/5 border border-white/10 rounded-xl overflow-hidden shadow-sm min-h-[400px] backdrop-blur-sm">
            <table className="w-full text-sm text-left">
                <thead className="bg-white/5 text-white/50 font-medium border-b border-white/10">
                    <tr>
                        <th className="px-6 py-4">Name</th>
                        <th className="px-6 py-4">Status</th>
                        <th className="px-6 py-4">Progress</th>
                        <th className="px-6 py-4">Stats</th>
                        <th className="px-6 py-4 text-right">Actions</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                    {campaigns.length === 0 ? (
                        <tr><td colSpan={5} className="text-center py-8 text-white/50">No campaigns found.</td></tr>
                    ) : campaigns.map((campaign) => (
                        <tr
                            key={campaign.id}
                            className="hover:bg-white/5 transition-colors cursor-pointer group"
                            onClick={() => handleRowClick(campaign.id)}
                        >
                            <td className="px-6 py-4">
                                <Link
                                    href={`/campaigns/${campaign.id}`}
                                    className="font-semibold text-white hover:text-blue-400 transition-colors block"
                                    onClick={(e) => e.stopPropagation()}
                                >
                                    {campaign.name}
                                </Link>
                                <p className="text-xs text-white/40 mt-0.5">Created {campaign.created}</p>
                            </td>
                            <td className="px-6 py-4">
                                <span className={cn("px-2.5 py-1 rounded-full text-xs font-medium border uppercase tracking-wider",
                                    campaign.status === 'ACTIVE' ? 'bg-green-500/10 text-green-400 border-green-500/20' :
                                        campaign.status === 'PAUSED' ? 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20' :
                                            campaign.status === 'COMPLETED' ? 'bg-white/10 text-white/70 border-white/10' :
                                                'bg-white/5 text-white/50 border-white/10'
                                )}>
                                    {campaign.status === 'ACTIVE' && <span className="w-1.5 h-1.5 rounded-full bg-green-400 inline-block mr-1.5 mb-0.5 animate-pulse"></span>}
                                    {campaign.status}
                                </span>
                            </td>
                            <td className="px-6 py-4">
                                <div className="flex items-center gap-2 mb-1.5">
                                    <span className="text-white/80 font-medium">{campaign.sent}</span>
                                    <span className="text-white/40">/ {campaign.leads}</span>
                                </div>
                                <div className="w-24 h-1.5 bg-white/10 rounded-full overflow-hidden">
                                    <div
                                        className="h-full bg-blue-500 rounded-full shadow-[0_0_10px_rgba(59,130,246,0.5)]"
                                        style={{ width: campaign.leads > 0 ? `${(campaign.sent / campaign.leads) * 100}%` : '0%' }}
                                    ></div>
                                </div>
                            </td>
                            <td className="px-6 py-4">
                                <div className="flex gap-4">
                                    <div>
                                        <p className="text-[10px] text-white/40 uppercase font-bold tracking-wider">Open</p>
                                        <p className="text-white/80 font-medium">{campaign.openRate}</p>
                                    </div>
                                    <div>
                                        <p className="text-[10px] text-white/40 uppercase font-bold tracking-wider">Reply</p>
                                        <p className="text-white/80 font-medium">{campaign.replyRate}</p>
                                    </div>
                                </div>
                            </td>
                            <td className="px-6 py-4 text-right relative">
                                <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <button
                                        onClick={(e) => handleStatusToggle(e, campaign.id, campaign.status)}
                                        className="p-2 text-white/40 hover:text-blue-400 hover:bg-blue-500/10 rounded-lg transition-colors"
                                        title={campaign.status === 'ACTIVE' ? "Pause" : "Resume"}
                                    >
                                        {campaign.status === 'ACTIVE' ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                                    </button>
                                    <button
                                        onClick={(e) => handleMenuToggle(e, campaign.id)}
                                        className={cn("p-2 text-white/40 hover:text-white hover:bg-white/10 rounded-lg transition-colors", openMenuId === campaign.id && "bg-white/10 text-white opacity-100")}
                                    >
                                        <MoreHorizontal className="w-4 h-4" />
                                    </button>
                                </div>
                                {openMenuId === campaign.id && (
                                    <div ref={menuRef} className="absolute right-8 top-12 z-10 w-36 bg-slate-900 rounded-lg shadow-xl border border-white/10 py-1 animate-in fade-in zoom-in-95 duration-100 origin-top-right backdrop-blur-sm">
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                router.push(`/campaigns/${campaign.id}/edit`);
                                                setOpenMenuId(null);
                                            }}
                                            className="w-full px-4 py-2 text-left text-sm text-white/70 hover:text-white hover:bg-white/5 flex items-center gap-2 transition-colors"
                                        >
                                            <Edit className="w-3.5 h-3.5" />
                                            Edit
                                        </button>
                                        <button
                                            onClick={(e) => handleDelete(e, campaign.id)}
                                            className="w-full px-4 py-2 text-left text-sm text-red-400 hover:bg-red-500/10 flex items-center gap-2 transition-colors"
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

