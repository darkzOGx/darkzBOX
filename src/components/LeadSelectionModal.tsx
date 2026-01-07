'use client';

import { useState, useEffect } from 'react';
import { X, Search, ChevronLeft, ChevronRight, UserPlus, Loader2, Check } from 'lucide-react';
import { getUnassignedLeads, addLeadsToCampaign } from '@/actions/leads';
import { cn } from '@/lib/utils';

interface LeadSelectionModalProps {
    isOpen: boolean;
    onClose: () => void;
    campaignId: string;
}

export function LeadSelectionModal({ isOpen, onClose, campaignId }: LeadSelectionModalProps) {
    const [page, setPage] = useState(1);
    const [search, setSearch] = useState('');
    const [leads, setLeads] = useState<any[]>([]);
    const [totalPages, setTotalPages] = useState(1);
    const [loading, setLoading] = useState(true);
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        if (isOpen) {
            fetchLeads();
        }
    }, [isOpen, page, search]); // Debounce search in real app

    const fetchLeads = async () => {
        setLoading(true);
        try {
            const data = await getUnassignedLeads(page, 50, search);
            setLeads(data.leads);
            setTotalPages(data.totalPages);
        } catch (error) {
            console.error("Failed to fetch leads", error);
        } finally {
            setLoading(false);
        }
    };

    const handleToggleSelect = (id: string) => {
        const newSelected = new Set(selectedIds);
        if (newSelected.has(id)) {
            newSelected.delete(id);
        } else {
            newSelected.add(id);
        }
        setSelectedIds(newSelected);
    };

    const handleSelectAll = () => {
        if (selectedIds.size === leads.length) {
            setSelectedIds(new Set());
        } else {
            setSelectedIds(new Set(leads.map(l => l.id)));
        }
    };

    const handleAddLeads = async () => {
        if (selectedIds.size === 0) return;
        setSubmitting(true);
        try {
            await addLeadsToCampaign(campaignId, Array.from(selectedIds));
            onClose();
            window.location.reload();
        } catch (error) {
            alert('Failed to add leads to campaign');
        } finally {
            setSubmitting(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={onClose}>
            <div 
                className="bg-white rounded-xl shadow-xl w-full max-w-4xl overflow-hidden animate-in fade-in zoom-in-95 duration-200 flex flex-col max-h-[80vh]"
                onClick={e => e.stopPropagation()}
            >
                {/* Header */}
                <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                    <div>
                        <h3 className="font-semibold text-slate-900">Select Leads</h3>
                        <p className="text-slate-500 text-sm">Add existing leads to this campaign</p>
                    </div>
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-600 p-2 hover:bg-slate-100 rounded-lg transition-colors">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Search & Actions */}
                <div className="p-4 border-b border-slate-100 flex gap-4 items-center">
                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                        <input
                            type="text"
                            placeholder="Search leads..."
                            className="w-full pl-9 pr-4 py-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none"
                            value={search}
                            onChange={e => { setSearch(e.target.value); setPage(1); }}
                        />
                    </div>
                    <button 
                        onClick={handleAddLeads}
                        disabled={submitting || selectedIds.size === 0}
                        className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors shadow-sm disabled:opacity-50 flex items-center gap-2"
                    >
                        {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserPlus className="w-4 h-4" />}
                        Add {selectedIds.size} Leads
                    </button>
                </div>

                {/* List */}
                <div className="flex-1 overflow-y-auto p-0">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-slate-50 text-slate-500 font-medium sticky top-0 border-b border-slate-100">
                            <tr>
                                <th className="px-6 py-3 w-10">
                                    <input 
                                        type="checkbox" 
                                        className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                                        checked={leads.length > 0 && selectedIds.size === leads.length}
                                        onChange={handleSelectAll}
                                    />
                                </th>
                                <th className="px-6 py-3">Name</th>
                                <th className="px-6 py-3">Email</th>
                                <th className="px-6 py-3">Company</th>
                                <th className="px-6 py-3">Current Campaign</th>
                                <th className="px-6 py-3"></th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {loading ? (
                                <tr>
                                    <td colSpan={6} className="py-12 text-center">
                                        <Loader2 className="w-8 h-8 animate-spin text-slate-300 mx-auto" />
                                    </td>
                                </tr>
                            ) : leads.length === 0 ? (
                                <tr><td colSpan={6} className="py-8 text-center text-slate-500">No leads found.</td></tr>
                            ) : leads.map(lead => (
                                <tr 
                                    key={lead.id} 
                                    className={cn("hover:bg-slate-50/50 transition-colors cursor-pointer", selectedIds.has(lead.id) && "bg-blue-50/30")}
                                    onClick={() => handleToggleSelect(lead.id)}
                                >
                                    <td className="px-6 py-3">
                                        <input 
                                            type="checkbox" 
                                            className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                                            checked={selectedIds.has(lead.id)}
                                            onChange={() => {}} // Handled by row click
                                        />
                                    </td>
                                    <td className="px-6 py-3 font-medium text-slate-900">
                                        {(lead.firstName || lead.lastName) ? `${lead.firstName || ''} ${lead.lastName || ''}` : '-'}
                                    </td>
                                    <td className="px-6 py-3 text-slate-600">{lead.email}</td>
                                    <td className="px-6 py-3 text-slate-600">{lead.companyName || '-'}</td>
                                    <td className="px-6 py-3 text-slate-500 text-xs">
                                        {lead.campaign?.name || <span className="italic text-slate-400">Unassigned</span>}
                                    </td>
                                    <td className="px-6 py-3 text-right">
                                        {selectedIds.has(lead.id) && <Check className="w-4 h-4 text-blue-600 ml-auto" />}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {/* Footer Pagination */}
                <div className="p-4 border-t border-slate-100 bg-slate-50/50 flex items-center justify-between text-sm text-slate-500">
                    <span>Page {page} of {totalPages}</span>
                    <div className="flex gap-2">
                        <button 
                            onClick={() => setPage(p => Math.max(1, p - 1))}
                            disabled={page === 1}
                            className="p-1 hover:bg-slate-200 rounded disabled:opacity-30"
                        >
                            <ChevronLeft className="w-5 h-5" />
                        </button>
                        <button 
                            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                            disabled={page === totalPages}
                            className="p-1 hover:bg-slate-200 rounded disabled:opacity-30"
                        >
                            <ChevronRight className="w-5 h-5" />
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}

