'use client';

import { useState } from 'react';
import { Search, Filter, MoreHorizontal, Mail, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import Link from 'next/link';
import { deleteLead } from '@/actions';
import { useRouter } from 'next/navigation';

interface Lead {
    id: string;
    email: string;
    firstName: string | null;
    lastName: string | null;
    companyName: string | null;
    status: string;
    campaign?: {
        id: string;
        name: string;
    } | null;
}

export function LeadsTable({ initialLeads }: { initialLeads: Lead[] }) {
    const [searchTerm, setSearchTerm] = useState('');
    const router = useRouter();

    const filteredLeads = initialLeads.filter(lead =>
        lead.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        lead.firstName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        lead.lastName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        lead.companyName?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const handleDelete = async (id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        if (confirm('Are you sure you want to delete this lead?')) {
            try {
                await deleteLead(id);
                window.location.reload(); // Simple refresh for now
            } catch (error) {
                alert('Failed to delete lead');
            }
        }
    };

    const handleSendEmail = (leadId: string, e: React.MouseEvent) => {
        e.stopPropagation();
        // Redirect to unibox with specific lead/thread context
        router.push(`/unibox?leadId=${leadId}`);
    };

    const handleRowClick = (leadId: string) => {
        // Navigate to lead details page
        // Since we don't have a lead detail page yet, let's go to unibox filtered by this lead if possible,
        // or just stay here. 
        // Based on user intent "none of these work", let's fix the action buttons first.
        // The row click itself might be intended to open a detail modal or page.
        // For now, let's keep row click effectively no-op or maybe just select?
        // Let's implement a lead detail drawer/modal in the future.
        // For now, let's prioritize making the action buttons work.
        console.log("Row clicked", leadId);
    };

    return (
        <div className="space-y-4">
            {/* Filters */}
            <div className="flex gap-4">
                <div className="relative flex-1 max-w-md">
                    <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                    <input
                        type="text"
                        placeholder="Search leads by name, email, or company..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-9 pr-4 py-2 text-sm bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all shadow-sm"
                    />
                </div>
                <button className="px-4 py-2 bg-white border border-slate-200 rounded-lg text-slate-600 text-sm font-medium hover:bg-slate-50 flex items-center gap-2 shadow-sm">
                    <Filter className="w-4 h-4" />
                    Filter
                </button>
            </div>

            <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
                <table className="w-full text-sm text-left">
                    <thead className="bg-slate-50 text-slate-500 font-medium border-b border-slate-200">
                        <tr>
                            <th className="px-6 py-4">Name</th>
                            <th className="px-6 py-4">Email</th>
                            <th className="px-6 py-4">Company</th>
                            <th className="px-6 py-4">Campaign</th>
                            <th className="px-6 py-4">Status</th>
                            <th className="px-6 py-4 text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {filteredLeads.length === 0 ? (
                            <tr><td colSpan={6} className="text-center py-8 text-slate-500">No leads found.</td></tr>
                        ) : filteredLeads.map((lead) => (
                            <tr 
                                key={lead.id} 
                                className="hover:bg-slate-50/50 transition-colors group cursor-default"
                                onClick={() => handleRowClick(lead.id)}
                            >
                                <td className="px-6 py-4 font-medium text-slate-900">
                                    {(lead.firstName || lead.lastName) ? `${lead.firstName || ''} ${lead.lastName || ''}`.trim() : '-'}
                                </td>
                                <td className="px-6 py-4 text-slate-600">{lead.email}</td>
                                <td className="px-6 py-4 text-slate-600">{lead.companyName || '-'}</td>
                                <td className="px-6 py-4">
                                    {lead.campaign ? (
                                        <Link 
                                            href={`/campaigns/${lead.campaign.id}`} 
                                            className="text-blue-600 hover:underline"
                                            onClick={(e) => e.stopPropagation()}
                                        >
                                            {lead.campaign.name}
                                        </Link>
                                    ) : (
                                        <span className="text-slate-400 italic">Unassigned</span>
                                    )}
                                </td>
                                <td className="px-6 py-4">
                                    <span className={cn("px-2.5 py-1 rounded-full text-xs font-medium border uppercase tracking-wider",
                                        lead.status === 'REPLIED' ? 'bg-green-50 text-green-700 border-green-200' :
                                            lead.status === 'CONTACTED' ? 'bg-blue-50 text-blue-700 border-blue-200' :
                                                lead.status === 'BOUNCED' ? 'bg-red-50 text-red-700 border-red-200' :
                                                    'bg-slate-50 text-slate-500 border-slate-200'
                                    )}>
                                        {lead.status}
                                    </span>
                                </td>
                                <td className="px-6 py-4 text-right">
                                    <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <button 
                                            onClick={(e) => handleSendEmail(lead.id, e)}
                                            className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors" 
                                            title="Send Email"
                                        >
                                            <Mail className="w-4 h-4" />
                                        </button>
                                        <button
                                            onClick={(e) => handleDelete(lead.id, e)}
                                            className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                            title="Delete"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
            <div className="text-xs text-slate-400 text-center">
                Showing {filteredLeads.length} of {initialLeads.length} leads
            </div>
        </div>
    );
}
