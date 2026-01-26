'use client';

import { useState, useEffect, useRef } from 'react';
import {
    Radio, FileText, Users, Play, Pause, Plus, Trash2, Edit2, X, Upload,
    ChevronLeft, ChevronRight, Loader2, Send, Clock, CheckCircle, XCircle, AlertCircle, Info
} from 'lucide-react';
import {
    getSenderTemplates, createSenderTemplate, updateSenderTemplate, deleteSenderTemplate,
    getSenderLeadGroups, createSenderLeadGroup, deleteSenderLeadGroup,
    getSenderLeadGroupLeads, addLeadsToGroup, removeSenderLead,
    getSenderCampaigns, createSenderCampaign, startSenderCampaign, pauseSenderCampaign, deleteSenderCampaign,
    getSenderCampaignStatus
} from '@/actions/sender';
import { cn } from '@/lib/utils';
import { RichTextEditor } from '@/components/RichTextEditor';

type Tab = 'templates' | 'leads' | 'campaigns';

export default function SenderPage() {
    const [activeTab, setActiveTab] = useState<Tab>('templates');

    return (
        <div className="p-8 max-w-6xl mx-auto space-y-6">
            {/* Header */}
            <div className="flex items-center gap-3">
                <div className="p-2 bg-purple-500/10 rounded-lg border border-purple-500/20">
                    <Radio className="w-6 h-6 text-purple-400" />
                </div>
                <div>
                    <h1 className="text-2xl font-bold text-white">Sender</h1>
                    <p className="text-sm text-white/50">Standalone SMTP email sender with templates and lead groups</p>
                </div>
            </div>

            {/* Info Banner */}
            <div className="flex items-start gap-3 p-4 bg-blue-500/10 border border-blue-500/20 rounded-xl">
                <Info className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
                <div className="text-sm text-blue-200 space-y-1">
                    <p><strong>NOTE:</strong> This page is for sending a one-time campaign immediately and DOES NOT include follow-up sequences.</p>
                    <p>For multi-sequence campaigns, please go to <strong>&quot;Campaigns&quot;</strong> in the sidebar.</p>
                </div>
            </div>

            {/* Tabs */}
            <div className="flex gap-1 bg-slate-900/50 p-1 rounded-lg w-fit border border-white/5">
                {[
                    { key: 'templates', label: 'Templates', icon: FileText },
                    { key: 'leads', label: 'Lead Groups', icon: Users },
                    { key: 'campaigns', label: 'Campaigns', icon: Send }
                ].map(tab => (
                    <button
                        key={tab.key}
                        onClick={() => setActiveTab(tab.key as Tab)}
                        className={cn(
                            "flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-md transition-all",
                            activeTab === tab.key
                                ? "bg-blue-600 text-white shadow-lg shadow-blue-900/20"
                                : "text-white/50 hover:text-white hover:bg-white/5"
                        )}
                    >
                        <tab.icon className="w-4 h-4" />
                        {tab.label}
                    </button>
                ))}
            </div>

            {/* Tab Content */}
            {activeTab === 'templates' && <TemplatesTab />}
            {activeTab === 'leads' && <LeadGroupsTab />}
            {activeTab === 'campaigns' && <CampaignsTab />}
        </div>
    );
}

// ============================================
// TEMPLATES TAB
// ============================================
function TemplatesTab() {
    const [templates, setTemplates] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [editingTemplate, setEditingTemplate] = useState<any | null>(null);
    const [form, setForm] = useState({ name: '', subject: '', body: '' });
    const [saving, setSaving] = useState(false);

    useEffect(() => { fetchTemplates(); }, []);

    const fetchTemplates = async () => {
        setLoading(true);
        const data = await getSenderTemplates();
        setTemplates(data);
        setLoading(false);
    };

    const handleSave = async () => {
        if (!form.name || !form.subject || !form.body) return;
        setSaving(true);
        try {
            if (editingTemplate) {
                await updateSenderTemplate(editingTemplate.id, form);
            } else {
                await createSenderTemplate(form);
            }
            setShowForm(false);
            setEditingTemplate(null);
            setForm({ name: '', subject: '', body: '' });
            fetchTemplates();
        } catch (error) {
            alert('Failed to save template');
        } finally {
            setSaving(false);
        }
    };

    const handleEdit = (template: any) => {
        setEditingTemplate(template);
        setForm({ name: template.name, subject: template.subject, body: template.body });
        setShowForm(true);
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Delete this template?')) return;
        await deleteSenderTemplate(id);
        fetchTemplates();
    };

    return (
        <div className="space-y-4">
            <div className="flex justify-between items-center">
                <p className="text-sm text-white/50">{templates.length} template{templates.length !== 1 ? 's' : ''}</p>
                <button
                    onClick={() => { setShowForm(true); setEditingTemplate(null); setForm({ name: '', subject: '', body: '' }); }}
                    className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-purple-600 rounded-lg hover:bg-purple-500 shadow-lg shadow-purple-900/20 hover:shadow-purple-900/40 transition-all"
                >
                    <Plus className="w-4 h-4" />
                    New Template
                </button>
            </div>

            {/* Template Form Modal */}
            {showForm && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm" onClick={() => setShowForm(false)}>
                    <div className="bg-slate-900 border border-white/10 rounded-xl shadow-xl w-full max-w-2xl p-6 max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-lg font-semibold text-white">
                                {editingTemplate ? 'Edit Template' : 'New Template'}
                            </h3>
                            <button onClick={() => setShowForm(false)} className="text-white/40 hover:text-white transition-colors">
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-white/70 mb-1">Template Name</label>
                                <input
                                    type="text"
                                    value={form.name}
                                    onChange={e => setForm({ ...form, name: e.target.value })}
                                    placeholder="e.g., Welcome Email"
                                    className="w-full px-3 py-2 bg-black/40 border border-white/10 rounded-lg focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 outline-none text-white placeholder-white/20"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-white/70 mb-1">Subject Line</label>
                                <input
                                    type="text"
                                    value={form.subject}
                                    onChange={e => setForm({ ...form, subject: e.target.value })}
                                    placeholder="e.g., Quick question about {{company}}"
                                    className="w-full px-3 py-2 bg-black/40 border border-white/10 rounded-lg focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 outline-none text-white placeholder-white/20"
                                />
                                <p className="text-xs text-white/40 mt-1">Use {'{{firstName}}'}, {'{{lastName}}'}, {'{{company}}'} for personalization</p>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-white/70 mb-1">Email Body</label>
                                <RichTextEditor
                                    content={form.body}
                                    onChange={(html) => setForm({ ...form, body: html })}
                                    placeholder="Hi {{firstName}}, ..."
                                    minHeight="200px"
                                    variables={[
                                        { label: 'First Name', value: '{{firstName}}' },
                                        { label: 'Last Name', value: '{{lastName}}' },
                                        { label: 'Company', value: '{{company}}' },
                                    ]}
                                />
                            </div>
                            <div className="flex justify-end gap-2 pt-4">
                                <button onClick={() => setShowForm(false)} className="px-4 py-2 text-sm font-medium text-white/60 hover:bg-white/10 rounded-lg transition-colors">
                                    Cancel
                                </button>
                                <button
                                    onClick={handleSave}
                                    disabled={saving || !form.name || !form.subject || !form.body}
                                    className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-purple-600 rounded-lg hover:bg-purple-500 disabled:opacity-50 transition-colors shadow-lg shadow-purple-900/20"
                                >
                                    {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                                    Save Template
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Templates List */}
            {loading ? (
                <div className="py-12 text-center">
                    <Loader2 className="w-8 h-8 animate-spin text-white/20 mx-auto" />
                </div>
            ) : templates.length === 0 ? (
                <div className="py-12 text-center bg-white/5 rounded-xl border border-dashed border-white/10">
                    <FileText className="w-12 h-12 text-white/20 mx-auto mb-3" />
                    <p className="text-white/50">No templates yet. Create your first template to get started.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 gap-3">
                    {templates.map(template => (
                        <div key={template.id} className="bg-white/5 p-4 rounded-xl border border-white/5 hover:border-white/10 transition-colors shadow-sm flex items-center justify-between group">
                            <div>
                                <h3 className="font-semibold text-white">{template.name}</h3>
                                <p className="text-sm text-white/50 truncate max-w-md">{template.subject}</p>
                            </div>
                            <div className="flex items-center gap-2">
                                <button onClick={() => handleEdit(template)} className="p-2 text-white/40 hover:text-purple-400 hover:bg-purple-500/10 rounded-lg transition-colors">
                                    <Edit2 className="w-4 h-4" />
                                </button>
                                <button onClick={() => handleDelete(template.id)} className="p-2 text-white/40 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors">
                                    <Trash2 className="w-4 h-4" />
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

// ============================================
// LEAD GROUPS TAB
// ============================================
function LeadGroupsTab() {
    const [groups, setGroups] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [newGroupName, setNewGroupName] = useState('');
    const [creating, setCreating] = useState(false);
    const [selectedGroup, setSelectedGroup] = useState<any | null>(null);
    const [groupLeads, setGroupLeads] = useState<any[]>([]);
    const [leadsPage, setLeadsPage] = useState(1);
    const [leadsTotalPages, setLeadsTotalPages] = useState(1);
    const [loadingLeads, setLoadingLeads] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [uploadResult, setUploadResult] = useState<{ added: number; skipped: number } | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => { fetchGroups(); }, []);

    useEffect(() => {
        if (selectedGroup) {
            fetchGroupLeads(selectedGroup.id, 1);
        }
    }, [selectedGroup]);

    const fetchGroups = async () => {
        setLoading(true);
        const data = await getSenderLeadGroups();
        setGroups(data);
        setLoading(false);
    };

    const fetchGroupLeads = async (groupId: string, page: number) => {
        setLoadingLeads(true);
        const data = await getSenderLeadGroupLeads(groupId, page, 50);
        setGroupLeads(data.leads);
        setLeadsPage(page);
        setLeadsTotalPages(data.totalPages);
        setLoadingLeads(false);
    };

    const handleCreateGroup = async () => {
        if (!newGroupName.trim()) return;
        setCreating(true);
        try {
            await createSenderLeadGroup(newGroupName.trim());
            setNewGroupName('');
            fetchGroups();
        } catch (error) {
            alert('Failed to create group');
        } finally {
            setCreating(false);
        }
    };

    const handleDeleteGroup = async (id: string) => {
        if (!confirm('Delete this group and all its leads?')) return;
        await deleteSenderLeadGroup(id);
        if (selectedGroup?.id === id) setSelectedGroup(null);
        fetchGroups();
    };

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file || !selectedGroup) return;

        setUploading(true);
        setUploadResult(null);
        try {
            const text = await file.text();
            const lines = text.split('\n').filter(line => line.trim());
            const entries: { email: string; firstName?: string; lastName?: string; company?: string }[] = [];

            for (let i = 0; i < lines.length; i++) {
                const line = lines[i].trim();
                if (!line) continue;
                if (i === 0 && (line.toLowerCase().includes('email') || line.toLowerCase().includes('first'))) continue;

                const parts = line.split(',').map(p => p.trim().replace(/^["']|["']$/g, ''));
                if (parts.length >= 1 && parts[0].includes('@')) {
                    entries.push({
                        email: parts[0],
                        firstName: parts[1] || undefined,
                        lastName: parts[2] || undefined,
                        company: parts[3] || undefined
                    });
                }
            }

            if (entries.length === 0) {
                alert('No valid email addresses found in CSV');
                return;
            }

            const result = await addLeadsToGroup(selectedGroup.id, entries);
            setUploadResult({ added: result.added, skipped: result.skipped });
            fetchGroups();
            fetchGroupLeads(selectedGroup.id, 1);
        } catch (error) {
            alert('Failed to process CSV file');
        } finally {
            setUploading(false);
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    };

    const handleRemoveLead = async (id: string) => {
        await removeSenderLead(id);
        fetchGroupLeads(selectedGroup.id, leadsPage);
        fetchGroups();
    };

    return (
        <div className="space-y-4">
            {/* Create Group */}
            <div className="flex gap-2">
                <input
                    type="text"
                    value={newGroupName}
                    onChange={e => setNewGroupName(e.target.value)}
                    placeholder="New group name..."
                    className="flex-1 px-3 py-2 bg-black/40 border border-white/10 rounded-lg focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 outline-none text-white placeholder-white/20"
                    onKeyDown={e => e.key === 'Enter' && handleCreateGroup()}
                />
                <button
                    onClick={handleCreateGroup}
                    disabled={creating || !newGroupName.trim()}
                    className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-purple-600 rounded-lg hover:bg-purple-700 disabled:opacity-50 shadow-lg shadow-purple-900/20 transition-all"
                >
                    {creating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                    Create Group
                </button>
            </div>

            <div className="grid grid-cols-3 gap-4">
                {/* Groups List */}
                <div className="col-span-1 space-y-2">
                    <h3 className="text-sm font-semibold text-white/70">Groups</h3>
                    {loading ? (
                        <div className="py-8 text-center">
                            <Loader2 className="w-6 h-6 animate-spin text-white/20 mx-auto" />
                        </div>
                    ) : groups.length === 0 ? (
                        <p className="text-sm text-white/50 py-4">No groups yet</p>
                    ) : (
                        groups.map(group => (
                            <div
                                key={group.id}
                                className={cn(
                                    "p-3 rounded-lg border cursor-pointer flex items-center justify-between transition-colors",
                                    selectedGroup?.id === group.id
                                        ? "bg-purple-500/20 border-purple-500/30"
                                        : "bg-white/5 border-white/5 hover:bg-white/10"
                                )}
                                onClick={() => setSelectedGroup(group)}
                            >
                                <div>
                                    <p className="font-medium text-white">{group.name}</p>
                                    <p className="text-xs text-white/50">{group._count?.leads || 0} leads</p>
                                </div>
                                <button
                                    onClick={(e) => { e.stopPropagation(); handleDeleteGroup(group.id); }}
                                    className="p-1.5 text-white/40 hover:text-red-400 hover:bg-red-500/10 rounded transition-colors"
                                >
                                    <Trash2 className="w-4 h-4" />
                                </button>
                            </div>
                        ))
                    )}
                </div>

                {/* Leads List */}
                <div className="col-span-2 bg-slate-900/40 rounded-xl border border-white/10 p-4 backdrop-blur-sm">
                    {selectedGroup ? (
                        <div className="space-y-4">
                            <div className="flex items-center justify-between">
                                <h3 className="font-semibold text-white">{selectedGroup.name} - Leads</h3>
                                <label className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-purple-400 bg-purple-500/10 rounded-lg hover:bg-purple-500/20 cursor-pointer border border-purple-500/20 transition-colors">
                                    <Upload className="w-4 h-4" />
                                    {uploading ? 'Uploading...' : 'Upload CSV'}
                                    <input
                                        ref={fileInputRef}
                                        type="file"
                                        accept=".csv,.txt"
                                        onChange={handleFileUpload}
                                        className="hidden"
                                        disabled={uploading}
                                    />
                                </label>
                            </div>

                            {uploadResult && (
                                <div className="p-2 bg-green-500/10 border border-green-500/20 rounded text-sm text-green-400">
                                    Added {uploadResult.added} leads {uploadResult.skipped > 0 && `(${uploadResult.skipped} skipped)`}
                                </div>
                            )}

                            {loadingLeads ? (
                                <div className="py-8 text-center">
                                    <Loader2 className="w-6 h-6 animate-spin text-white/20 mx-auto" />
                                </div>
                            ) : groupLeads.length === 0 ? (
                                <p className="text-sm text-white/50 py-8 text-center">No leads in this group. Upload a CSV to add leads.</p>
                            ) : (
                                <>
                                    <div className="divide-y divide-white/5 max-h-96 overflow-y-auto">
                                        {groupLeads.map(lead => (
                                            <div key={lead.id} className="py-2 flex items-center justify-between hover:bg-white/5 px-2 rounded transition-colors">
                                                <div>
                                                    <p className="text-sm font-medium text-white">{lead.email}</p>
                                                    <p className="text-xs text-white/50">
                                                        {[lead.firstName, lead.lastName, lead.company].filter(Boolean).join(' - ') || '-'}
                                                    </p>
                                                </div>
                                                <button
                                                    onClick={() => handleRemoveLead(lead.id)}
                                                    className="p-1 text-white/40 hover:text-red-400 transition-colors"
                                                >
                                                    <X className="w-4 h-4" />
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                    {leadsTotalPages > 1 && (
                                        <div className="flex items-center justify-between pt-2 border-t border-white/5">
                                            <span className="text-xs text-white/50">Page {leadsPage} of {leadsTotalPages}</span>
                                            <div className="flex gap-1">
                                                <button
                                                    onClick={() => fetchGroupLeads(selectedGroup.id, leadsPage - 1)}
                                                    disabled={leadsPage === 1}
                                                    className="p-1 hover:bg-white/10 text-white/50 hover:text-white rounded disabled:opacity-30 transition-colors"
                                                >
                                                    <ChevronLeft className="w-4 h-4" />
                                                </button>
                                                <button
                                                    onClick={() => fetchGroupLeads(selectedGroup.id, leadsPage + 1)}
                                                    disabled={leadsPage === leadsTotalPages}
                                                    className="p-1 hover:bg-white/10 text-white/50 hover:text-white rounded disabled:opacity-30 transition-colors"
                                                >
                                                    <ChevronRight className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </div>
                                    )}
                                </>
                            )}
                        </div>
                    ) : (
                        <div className="py-12 text-center text-white/50">
                            <Users className="w-12 h-12 text-white/20 mx-auto mb-3" />
                            <p>Select a group to view leads</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

// ============================================
// CAMPAIGNS TAB
// ============================================
function CampaignsTab() {
    const [campaigns, setCampaigns] = useState<any[]>([]);
    const [templates, setTemplates] = useState<any[]>([]);
    const [groups, setGroups] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [form, setForm] = useState({ name: '', templateId: '', leadGroupId: '' });
    const [creating, setCreating] = useState(false);
    const [selectedCampaign, setSelectedCampaign] = useState<any | null>(null);
    const [campaignDetails, setCampaignDetails] = useState<any | null>(null);
    const [loadingDetails, setLoadingDetails] = useState(false);

    useEffect(() => {
        fetchData();
        // Poll for campaign status updates
        const interval = setInterval(fetchCampaigns, 5000);
        return () => clearInterval(interval);
    }, []);

    const fetchData = async () => {
        setLoading(true);
        const [campaignsData, templatesData, groupsData] = await Promise.all([
            getSenderCampaigns(),
            getSenderTemplates(),
            getSenderLeadGroups()
        ]);
        setCampaigns(campaignsData);
        setTemplates(templatesData);
        setGroups(groupsData);
        setLoading(false);
    };

    const fetchCampaigns = async () => {
        const data = await getSenderCampaigns();
        setCampaigns(data);
    };

    const handleCreate = async () => {
        if (!form.name || !form.templateId || !form.leadGroupId) return;
        setCreating(true);
        try {
            await createSenderCampaign(form);
            setShowForm(false);
            setForm({ name: '', templateId: '', leadGroupId: '' });
            fetchCampaigns();
        } catch (error) {
            alert('Failed to create campaign');
        } finally {
            setCreating(false);
        }
    };

    const handleStart = async (id: string) => {
        await startSenderCampaign(id);
        fetchCampaigns();
    };

    const handlePause = async (id: string) => {
        await pauseSenderCampaign(id);
        fetchCampaigns();
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Delete this campaign?')) return;
        await deleteSenderCampaign(id);
        if (selectedCampaign?.id === id) {
            setSelectedCampaign(null);
            setCampaignDetails(null);
        }
        fetchCampaigns();
    };

    const viewCampaignDetails = async (campaign: any) => {
        setSelectedCampaign(campaign);
        setLoadingDetails(true);
        const details = await getSenderCampaignStatus(campaign.id);
        setCampaignDetails(details);
        setLoadingDetails(false);
    };

    const getStatusBadge = (status: string) => {
        const styles: Record<string, string> = {
            PENDING: 'bg-slate-100 text-slate-600',
            RUNNING: 'bg-green-100 text-green-700',
            PAUSED: 'bg-yellow-100 text-yellow-700',
            COMPLETED: 'bg-blue-100 text-blue-700',
            FAILED: 'bg-red-100 text-red-700'
        };
        const icons: Record<string, any> = {
            PENDING: Clock,
            RUNNING: Play,
            PAUSED: Pause,
            COMPLETED: CheckCircle,
            FAILED: XCircle
        };
        const Icon = icons[status] || AlertCircle;
        return (
            <span className={cn("inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded-full", styles[status] || 'bg-slate-100 text-slate-600')}>
                <Icon className="w-3 h-3" />
                {status}
            </span>
        );
    };

    return (
        <div className="space-y-4">
            <div className="flex justify-between items-center">
                <p className="text-sm text-white/50">{campaigns.length} campaign{campaigns.length !== 1 ? 's' : ''}</p>
                <button
                    onClick={() => setShowForm(true)}
                    disabled={templates.length === 0 || groups.length === 0}
                    className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-purple-600 rounded-lg hover:bg-purple-700 disabled:opacity-50 shadow-lg shadow-purple-900/20 transition-all"
                    title={templates.length === 0 ? "Create a template first" : groups.length === 0 ? "Create a lead group first" : ""}
                >
                    <Plus className="w-4 h-4" />
                    New Campaign
                </button>
            </div>

            {/* Create Campaign Modal */}
            {showForm && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm" onClick={() => setShowForm(false)}>
                    <div className="bg-slate-900 border border-white/10 rounded-xl shadow-xl w-full max-w-md p-6" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-lg font-semibold text-white">New Campaign</h3>
                            <button onClick={() => setShowForm(false)} className="text-white/40 hover:text-white transition-colors">
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-white/70 mb-1">Campaign Name</label>
                                <input
                                    type="text"
                                    value={form.name}
                                    onChange={e => setForm({ ...form, name: e.target.value })}
                                    placeholder="e.g., Q1 Outreach"
                                    className="w-full px-3 py-2 bg-black/40 border border-white/10 rounded-lg focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 outline-none text-white placeholder-white/20"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-white/70 mb-1">Template</label>
                                <select
                                    value={form.templateId}
                                    onChange={e => setForm({ ...form, templateId: e.target.value })}
                                    className="w-full px-3 py-2 bg-black/40 border border-white/10 rounded-lg focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 outline-none text-white"
                                >
                                    <option value="">Select a template...</option>
                                    {templates.map(t => (
                                        <option key={t.id} value={t.id}>{t.name}</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-white/70 mb-1">Lead Group</label>
                                <select
                                    value={form.leadGroupId}
                                    onChange={e => setForm({ ...form, leadGroupId: e.target.value })}
                                    className="w-full px-3 py-2 bg-black/40 border border-white/10 rounded-lg focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 outline-none text-white"
                                >
                                    <option value="">Select a lead group...</option>
                                    {groups.map(g => (
                                        <option key={g.id} value={g.id}>{g.name} ({g._count?.leads || 0} leads)</option>
                                    ))}
                                </select>
                            </div>
                            <div className="flex justify-end gap-2 pt-4">
                                <button onClick={() => setShowForm(false)} className="px-4 py-2 text-sm font-medium text-white/60 hover:bg-white/10 rounded-lg transition-colors">
                                    Cancel
                                </button>
                                <button
                                    onClick={handleCreate}
                                    disabled={creating || !form.name || !form.templateId || !form.leadGroupId}
                                    className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-purple-600 rounded-lg hover:bg-purple-700 disabled:opacity-50 transition-colors shadow-lg shadow-purple-900/20"
                                >
                                    {creating && <Loader2 className="w-4 h-4 animate-spin" />}
                                    Create Campaign
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Campaign Details Modal */}
            {selectedCampaign && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm" onClick={() => { setSelectedCampaign(null); setCampaignDetails(null); }}>
                    <div className="bg-slate-900 border border-white/10 rounded-xl shadow-xl w-full max-w-2xl p-6 max-h-[80vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-lg font-semibold text-white">{selectedCampaign.name}</h3>
                            <button onClick={() => { setSelectedCampaign(null); setCampaignDetails(null); }} className="text-white/40 hover:text-white transition-colors">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        {loadingDetails ? (
                            <div className="py-8 text-center">
                                <Loader2 className="w-6 h-6 animate-spin text-white/20 mx-auto" />
                            </div>
                        ) : campaignDetails ? (
                            <div className="space-y-4">
                                <div className="grid grid-cols-4 gap-4">
                                    <div className="text-center p-3 bg-white/5 border border-white/5 rounded-lg">
                                        <p className="text-2xl font-bold text-white">{campaignDetails.totalLeads}</p>
                                        <p className="text-xs text-white/50">Total Leads</p>
                                    </div>
                                    <div className="text-center p-3 bg-green-500/10 border border-green-500/20 rounded-lg">
                                        <p className="text-2xl font-bold text-green-400">{campaignDetails.sentCount}</p>
                                        <p className="text-xs text-white/50">Sent</p>
                                    </div>
                                    <div className="text-center p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
                                        <p className="text-2xl font-bold text-red-400">{campaignDetails.failedCount}</p>
                                        <p className="text-xs text-white/50">Failed</p>
                                    </div>
                                    <div className="text-center p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg">
                                        <p className="text-2xl font-bold text-blue-400">
                                            {campaignDetails.totalLeads > 0 ? Math.round((campaignDetails.sentCount / campaignDetails.totalLeads) * 100) : 0}%
                                        </p>
                                        <p className="text-xs text-white/50">Progress</p>
                                    </div>
                                </div>

                                {campaignDetails.lastError && (
                                    <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-sm text-red-400">
                                        Last Error: {campaignDetails.lastError}
                                    </div>
                                )}

                                <div>
                                    <h4 className="text-sm font-semibold text-white/70 mb-2">Recent Logs</h4>
                                    <div className="max-h-60 overflow-y-auto border border-white/10 rounded-lg divide-y divide-white/5">
                                        {campaignDetails.logs && campaignDetails.logs.length > 0 ? (
                                            campaignDetails.logs.map((log: any) => (
                                                <div key={log.id} className="p-2 flex items-center justify-between text-sm">
                                                    <span className="text-white/60">{log.email}</span>
                                                    <div className="flex items-center gap-2">
                                                        {log.status === 'SENT' ? (
                                                            <CheckCircle className="w-4 h-4 text-green-400" />
                                                        ) : (
                                                            <XCircle className="w-4 h-4 text-red-400" />
                                                        )}
                                                        <span className="text-xs text-white/40">
                                                            {new Date(log.sentAt).toLocaleTimeString()}
                                                        </span>
                                                    </div>
                                                </div>
                                            ))
                                        ) : (
                                            <p className="p-4 text-sm text-white/50 text-center">No logs yet</p>
                                        )}
                                    </div>
                                </div>
                            </div>
                        ) : null}
                    </div>
                </div>
            )}

            {/* Campaigns List */}
            {loading ? (
                <div className="py-12 text-center">
                    <Loader2 className="w-8 h-8 animate-spin text-white/20 mx-auto" />
                </div>
            ) : campaigns.length === 0 ? (
                <div className="py-12 text-center bg-white/5 rounded-xl border border-dashed border-white/10">
                    <Send className="w-12 h-12 text-white/20 mx-auto mb-3" />
                    <p className="text-white/50">No campaigns yet. Create a template and lead group first.</p>
                </div>
            ) : (
                <div className="bg-white/5 border border-white/10 rounded-xl overflow-hidden shadow-sm backdrop-blur-sm">
                    <table className="w-full text-sm">
                        <thead className="bg-white/5 border-b border-white/5">
                            <tr>
                                <th className="px-4 py-3 text-left text-xs font-semibold text-white/50 uppercase">Campaign</th>
                                <th className="px-4 py-3 text-left text-xs font-semibold text-white/50 uppercase">Template</th>
                                <th className="px-4 py-3 text-left text-xs font-semibold text-white/50 uppercase">Leads</th>
                                <th className="px-4 py-3 text-left text-xs font-semibold text-white/50 uppercase">Progress</th>
                                <th className="px-4 py-3 text-left text-xs font-semibold text-white/50 uppercase">Status</th>
                                <th className="px-4 py-3 text-right text-xs font-semibold text-white/50 uppercase">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                            {campaigns.map(campaign => (
                                <tr key={campaign.id} className="hover:bg-white/5 transition-colors">
                                    <td className="px-4 py-3">
                                        <button
                                            onClick={() => viewCampaignDetails(campaign)}
                                            className="font-medium text-white hover:text-purple-400 transition-colors"
                                        >
                                            {campaign.name}
                                        </button>
                                    </td>
                                    <td className="px-4 py-3 text-white/60">{campaign.template?.name || '-'}</td>
                                    <td className="px-4 py-3 text-white/60">{campaign.leadGroup?.name || '-'}</td>
                                    <td className="px-4 py-3">
                                        <div className="flex items-center gap-2">
                                            <div className="flex-1 h-2 bg-white/10 rounded-full overflow-hidden">
                                                <div
                                                    className="h-full bg-purple-500 rounded-full"
                                                    style={{ width: `${campaign.totalLeads > 0 ? (campaign.sentCount / campaign.totalLeads) * 100 : 0}%` }}
                                                />
                                            </div>
                                            <span className="text-xs text-white/50">{campaign.sentCount}/{campaign.totalLeads}</span>
                                        </div>
                                    </td>
                                    <td className="px-4 py-3">{getStatusBadge(campaign.status)}</td>
                                    <td className="px-4 py-3 text-right">
                                        <div className="flex items-center justify-end gap-1">
                                            {campaign.status === 'PENDING' || campaign.status === 'PAUSED' ? (
                                                <button
                                                    onClick={() => handleStart(campaign.id)}
                                                    className="p-1.5 text-green-400 hover:bg-green-500/10 rounded transition-colors"
                                                    title="Start"
                                                >
                                                    <Play className="w-4 h-4" />
                                                </button>
                                            ) : campaign.status === 'RUNNING' ? (
                                                <button
                                                    onClick={() => handlePause(campaign.id)}
                                                    className="p-1.5 text-yellow-400 hover:bg-yellow-500/10 rounded transition-colors"
                                                    title="Pause"
                                                >
                                                    <Pause className="w-4 h-4" />
                                                </button>
                                            ) : null}
                                            <button
                                                onClick={() => handleDelete(campaign.id)}
                                                className="p-1.5 text-white/40 hover:text-red-400 hover:bg-red-500/10 rounded transition-colors"
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
            )}
        </div>
    );
}
