'use client';

import { useState } from 'react';
import { Plus } from "lucide-react";
import { LeadsTable } from "@/components/LeadsTable";
import { AddLeadModal } from "@/components/AddLeadModal";

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

export function LeadsPageClient({ initialLeads }: { initialLeads: Lead[] }) {
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);

    return (
        <div className="p-8 max-w-7xl mx-auto space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900">Leads</h1>
                    <p className="text-slate-500 text-sm mt-1">Manage all your contacts</p>
                </div>
                <button
                    onClick={() => setIsAddModalOpen(true)}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium flex items-center gap-2 transition-colors shadow-sm shadow-blue-500/20"
                >
                    <Plus className="w-4 h-4" />
                    Add Leads
                </button>
            </div>

            <LeadsTable initialLeads={initialLeads} />

            {isAddModalOpen && <AddLeadModal onClose={() => setIsAddModalOpen(false)} />}
        </div>
    );
}
