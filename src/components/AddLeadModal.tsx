'use client';

import { useState } from 'react';
import { X, Plus, Loader2 } from 'lucide-react';
import { addLead } from '@/actions';

interface AddLeadModalProps {
    onClose: () => void;
    campaignId?: string; // Optional context
}

export function AddLeadModal({ onClose, campaignId }: AddLeadModalProps) {
    const [isLoading, setIsLoading] = useState(false);
    const [formData, setFormData] = useState({
        email: '',
        firstName: '',
        lastName: '',
        companyName: ''
    });

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        try {
            await addLead({ ...formData, campaignId });
            onClose();
            // In a real app we'd trigger a router.refresh() or specialized revalidate here
            // But since this is a child of a client component receiving initialLeads as prop, 
            // we really should refresh the page or update local state.
            // For now, window reload is the simplest way to see the new data without refactoring LeadsPage to fetch on client.
            window.location.reload();
        } catch (error) {
            alert('Failed to add lead');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden">
                <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                    <h3 className="font-semibold text-slate-900">Add New Lead</h3>
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
                        <X className="w-5 h-5" />
                    </button>
                </div>
                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    <div className="space-y-2">
                        <label className="text-sm font-medium text-slate-700">Email Address <span className="text-red-500">*</span></label>
                        <input
                            type="email"
                            required
                            placeholder="john@example.com"
                            className="w-full px-3 py-2 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                            value={formData.email}
                            onChange={e => setFormData({ ...formData, email: e.target.value })}
                        />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-slate-700">First Name</label>
                            <input
                                type="text"
                                placeholder="John"
                                className="w-full px-3 py-2 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                                value={formData.firstName}
                                onChange={e => setFormData({ ...formData, firstName: e.target.value })}
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-slate-700">Last Name</label>
                            <input
                                type="text"
                                placeholder="Doe"
                                className="w-full px-3 py-2 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                                value={formData.lastName}
                                onChange={e => setFormData({ ...formData, lastName: e.target.value })}
                            />
                        </div>
                    </div>
                    <div className="space-y-2">
                        <label className="text-sm font-medium text-slate-700">Company Name</label>
                        <input
                            type="text"
                            placeholder="Acme Corp"
                            className="w-full px-3 py-2 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                            value={formData.companyName}
                            onChange={e => setFormData({ ...formData, companyName: e.target.value })}
                        />
                    </div>

                    <div className="pt-4 flex justify-end gap-3">
                        <button type="button" onClick={onClose} className="px-4 py-2 text-slate-600 hover:bg-slate-50 font-medium rounded-lg">Cancel</button>
                        <button
                            type="submit"
                            disabled={isLoading}
                            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg flex items-center gap-2 shadow-sm shadow-blue-500/20 disabled:opacity-50"
                        >
                            {isLoading && <Loader2 className="w-4 h-4 animate-spin" />}
                            Create Lead
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
