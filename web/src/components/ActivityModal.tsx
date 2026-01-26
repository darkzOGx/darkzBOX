'use client';

import { X, Loader2 } from 'lucide-react';
import { cn } from "@/lib/utils";
import { useEffect, useState } from 'react';
import { getActivityLogs } from '@/actions/activity';
import { useRouter } from 'next/navigation';

interface ActivityItem {
    id: string;
    campaignId?: string | null;
    leadId?: string | null;
    user: string;
    action: string;
    target: string;
    time: string;
    fullTime: string;
    color: string;
}

interface ActivityModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export function ActivityModal({ isOpen, onClose }: ActivityModalProps) {
    const [logs, setLogs] = useState<ActivityItem[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const router = useRouter();

    useEffect(() => {
        if (isOpen) {
            setIsLoading(true);
            getActivityLogs(100) // Fetch top 100 logs
                .then(data => setLogs(data))
                .catch(err => console.error("Failed to fetch logs", err))
                .finally(() => setIsLoading(false));
        }
    }, [isOpen]);

    const handleItemClick = (item: ActivityItem) => {
        if (item.campaignId) {
            router.push(`/campaigns/${item.campaignId}`);
            onClose();
        } else if (item.leadId) {
            router.push('/unibox'); // Could map to specific thread in future
            onClose();
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={onClose}>
            <div
                className="bg-slate-900 border border-white/10 rounded-xl shadow-xl w-full max-w-3xl overflow-hidden animate-in fade-in zoom-in-95 duration-200 flex flex-col max-h-[80vh]"
                onClick={e => e.stopPropagation()}
            >
                <div className="p-4 border-b border-white/10 flex items-center justify-between bg-white/5">
                    <div>
                        <h3 className="font-semibold text-white">Activity Log</h3>
                        <p className="text-white/50 text-sm">Recent events from your campaigns</p>
                    </div>
                    <button onClick={onClose} className="text-white/40 hover:text-white p-2 hover:bg-white/10 rounded-lg transition-colors">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <div className="overflow-y-auto flex-1 p-6">
                    {isLoading ? (
                        <div className="flex justify-center py-12">
                            <Loader2 className="w-8 h-8 animate-spin text-white/30" />
                        </div>
                    ) : logs.length === 0 ? (
                        <p className="text-center text-white/50 py-12">No activity found.</p>
                    ) : (
                        <div className="space-y-4">
                            {logs.map((item, i) => (
                                <div
                                    key={i}
                                    onClick={() => handleItemClick(item)}
                                    className="flex gap-4 group p-3 hover:bg-white/5 rounded-lg transition-colors border border-transparent hover:border-white/10 cursor-pointer"
                                >
                                    <div className={cn("h-10 w-10 rounded-full flex-shrink-0 flex items-center justify-center text-xs font-bold uppercase", item.color)}>
                                        {item.user.slice(0, 2)}
                                    </div>
                                    <div className="min-w-0 flex-1">
                                        <div className="flex justify-between items-start">
                                            <p className="text-sm text-white">
                                                <span className="font-semibold">{item.user}</span> {item.action} <span className="text-white/60 font-medium">{item.target}</span>
                                            </p>
                                            <span className="text-xs text-white/40 whitespace-nowrap ml-2">{item.fullTime}</span>
                                        </div>
                                        <p className="text-xs text-white/50 mt-1">Campaign: {item.target}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
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
