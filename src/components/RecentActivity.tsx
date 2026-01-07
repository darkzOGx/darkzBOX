'use client';

import { useState } from 'react';
import { cn } from "@/lib/utils";
import { ActivityModal } from './ActivityModal';
import { useRouter } from 'next/navigation';

interface ActivityItem {
    id: string;
    campaignId?: string | null;
    leadId?: string | null;
    user: string;
    action: string;
    target: string;
    time: string;
    color: string;
}

interface RecentActivityProps {
    initialData: ActivityItem[];
}

export function RecentActivity({ initialData }: RecentActivityProps) {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const router = useRouter();

    const handleItemClick = (item: ActivityItem) => {
        if (item.campaignId) {
            router.push(`/campaigns/${item.campaignId}`);
        } else if (item.leadId) {
            // If no campaign, maybe unibox? Or just fallback to campaigns or leads page
            // Ideally we'd go to /leads/[id] or /unibox?thread=[leadId]
            // For now, let's assume Unibox if it's a reply, or campaign if it has one.
            router.push('/unibox');
        }
    };

    return (
        <>
            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col h-full">
                <h3 className="font-semibold text-slate-900 text-lg mb-6">Live Activity</h3>
                <div className="space-y-6 overflow-y-auto flex-1 pr-2 min-h-[300px]">
                    {initialData.length === 0 ? (
                        <p className="text-slate-500 text-sm">No recent activity.</p>
                    ) : (
                        initialData.map((item, i) => (
                            <div 
                                key={i} 
                                onClick={() => handleItemClick(item)}
                                className="flex gap-3 group cursor-pointer hover:bg-slate-50 p-2 -mx-2 rounded-lg transition-colors"
                            >
                                <div className={cn("h-8 w-8 rounded-full flex-shrink-0 flex items-center justify-center text-[10px] font-bold uppercase", item.color)}>
                                    {item.user.slice(0, 2)}
                                </div>
                                <div className="min-w-0">
                                    <p className="text-sm text-slate-900 truncate">
                                        <span className="font-medium">{item.user}</span> {item.action} <span className="text-slate-600">{item.target}</span>
                                    </p>
                                    <p className="text-xs text-slate-400 mt-0.5">{item.time}</p>
                                </div>
                            </div>
                        ))
                    )}
                </div>
                <button 
                    onClick={() => setIsModalOpen(true)}
                    className="mt-6 w-full py-2 text-sm text-center text-slate-500 hover:text-slate-900 font-medium border-t border-slate-100 transition-colors"
                >
                    View All Activity
                </button>
            </div>

            <ActivityModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
        </>
    );
}
