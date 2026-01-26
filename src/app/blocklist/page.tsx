'use client';

import { useState, useEffect, useRef } from 'react';
import { ShieldBan, Upload, Plus, Trash2, Search, ChevronLeft, ChevronRight, X, Download, Loader2 } from 'lucide-react';
import { getBlockedEmails, addToBlocklist, addBulkToBlocklist, removeFromBlocklist } from '@/actions/blocklist';
import { cn } from '@/lib/utils';

export default function BlocklistPage() {
    const [blockedEmails, setBlockedEmails] = useState<any[]>([]);
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [total, setTotal] = useState(0);
    const [search, setSearch] = useState('');
    const [loading, setLoading] = useState(true);

    // Manual entry form
    const [showAddForm, setShowAddForm] = useState(false);
    const [newEmail, setNewEmail] = useState('');
    const [newFirstName, setNewFirstName] = useState('');
    const [newLastName, setNewLastName] = useState('');
    const [addingManual, setAddingManual] = useState(false);

    // CSV upload
    const [uploading, setUploading] = useState(false);
    const [uploadResult, setUploadResult] = useState<{ added: number; skipped: number } | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        fetchBlockedEmails();
    }, [page, search]);

    const fetchBlockedEmails = async () => {
        setLoading(true);
        try {
            const data = await getBlockedEmails(page, 50, search);
            setBlockedEmails(data.blockedEmails);
            setTotalPages(data.totalPages);
            setTotal(data.total);
        } catch (error) {
            console.error('Failed to fetch blocked emails:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleAddManual = async () => {
        if (!newEmail.trim()) return;

        setAddingManual(true);
        try {
            const result = await addToBlocklist({
                email: newEmail.trim(),
                firstName: newFirstName.trim() || undefined,
                lastName: newLastName.trim() || undefined
            });

            if (result.success) {
                setNewEmail('');
                setNewFirstName('');
                setNewLastName('');
                setShowAddForm(false);
                fetchBlockedEmails();
            } else {
                alert(result.error || 'Failed to add to blocklist');
            }
        } catch (error) {
            alert('Failed to add to blocklist');
        } finally {
            setAddingManual(false);
        }
    };

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setUploading(true);
        setUploadResult(null);

        try {
            const text = await file.text();
            const lines = text.split('\n').filter(line => line.trim());

            // Parse CSV (email, firstName, lastName)
            const entries: { email: string; firstName?: string; lastName?: string }[] = [];

            for (let i = 0; i < lines.length; i++) {
                const line = lines[i].trim();
                if (!line) continue;

                // Skip header row if it looks like one
                if (i === 0 && (line.toLowerCase().includes('email') || line.toLowerCase().includes('first'))) {
                    continue;
                }

                const parts = line.split(',').map(p => p.trim().replace(/^["']|["']$/g, ''));
                if (parts.length >= 1 && parts[0].includes('@')) {
                    entries.push({
                        email: parts[0],
                        firstName: parts[1] || undefined,
                        lastName: parts[2] || undefined
                    });
                }
            }

            if (entries.length === 0) {
                alert('No valid email addresses found in CSV');
                return;
            }

            const result = await addBulkToBlocklist(entries);
            setUploadResult({ added: result.added, skipped: result.skipped });
            fetchBlockedEmails();
        } catch (error) {
            console.error('Upload error:', error);
            alert('Failed to process CSV file');
        } finally {
            setUploading(false);
            if (fileInputRef.current) {
                fileInputRef.current.value = '';
            }
        }
    };

    const handleRemove = async (id: string) => {
        if (!confirm('Remove this email from the blocklist?')) return;

        try {
            await removeFromBlocklist(id);
            fetchBlockedEmails();
        } catch (error) {
            alert('Failed to remove from blocklist');
        }
    };

    const downloadTemplate = () => {
        const template = 'email,firstName,lastName\nexample@domain.com,John,Doe\nanother@email.com,Jane,Smith';
        const blob = new Blob([template], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'blocklist-template.csv';
        a.click();
        URL.revokeObjectURL(url);
    };

    return (
        <div className="p-8 max-w-6xl mx-auto space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-red-500/10 rounded-lg border border-red-500/20">
                        <ShieldBan className="w-6 h-6 text-red-400" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold text-white">Blocklist</h1>
                        <p className="text-sm text-white/50">
                            {total} blocked email{total !== 1 ? 's' : ''} - These addresses will never receive campaign emails
                        </p>
                    </div>
                </div>
                <div className="flex gap-2">
                    <button
                        onClick={downloadTemplate}
                        className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white/60 bg-white/5 border border-white/10 rounded-lg hover:bg-white/10 transition-colors"
                    >
                        <Download className="w-4 h-4" />
                        Template
                    </button>
                    <label className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white/60 bg-white/5 border border-white/10 rounded-lg hover:bg-white/10 cursor-pointer transition-colors">
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
                    <button
                        onClick={() => setShowAddForm(true)}
                        className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-500 shadow-lg shadow-red-900/20 transition-all"
                    >
                        <Plus className="w-4 h-4" />
                        Add Email
                    </button>
                </div>
            </div>

            {/* Upload Result */}
            {uploadResult && (
                <div className="p-4 bg-green-500/10 border border-green-500/20 rounded-lg flex items-center justify-between">
                    <span className="text-green-400">
                        Added {uploadResult.added} email{uploadResult.added !== 1 ? 's' : ''} to blocklist
                        {uploadResult.skipped > 0 && ` (${uploadResult.skipped} skipped - duplicates or invalid)`}
                    </span>
                    <button onClick={() => setUploadResult(null)} className="text-green-400 hover:text-green-300">
                        <X className="w-4 h-4" />
                    </button>
                </div>
            )}

            {/* Add Form Modal */}
            {showAddForm && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm" onClick={() => setShowAddForm(false)}>
                    <div className="bg-slate-900 border border-white/10 rounded-xl shadow-xl w-full max-w-md p-6" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-lg font-semibold text-white">Add to Blocklist</h3>
                            <button onClick={() => setShowAddForm(false)} className="text-white/40 hover:text-white transition-colors">
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-white/70 mb-1">
                                    Email Address <span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="email"
                                    value={newEmail}
                                    onChange={e => setNewEmail(e.target.value)}
                                    placeholder="email@example.com"
                                    className="w-full px-3 py-2 bg-black/40 border border-white/10 rounded-lg focus:ring-2 focus:ring-red-500/20 focus:border-red-500 outline-none text-white placeholder-white/20"
                                    autoFocus
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-white/70 mb-1">First Name</label>
                                    <input
                                        type="text"
                                        value={newFirstName}
                                        onChange={e => setNewFirstName(e.target.value)}
                                        placeholder="John"
                                        className="w-full px-3 py-2 bg-black/40 border border-white/10 rounded-lg focus:ring-2 focus:ring-red-500/20 focus:border-red-500 outline-none text-white placeholder-white/20"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-white/70 mb-1">Last Name</label>
                                    <input
                                        type="text"
                                        value={newLastName}
                                        onChange={e => setNewLastName(e.target.value)}
                                        placeholder="Doe"
                                        className="w-full px-3 py-2 bg-black/40 border border-white/10 rounded-lg focus:ring-2 focus:ring-red-500/20 focus:border-red-500 outline-none text-white placeholder-white/20"
                                    />
                                </div>
                            </div>
                            <div className="flex justify-end gap-2 pt-4">
                                <button
                                    onClick={() => setShowAddForm(false)}
                                    className="px-4 py-2 text-sm font-medium text-white/60 hover:bg-white/10 rounded-lg transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleAddManual}
                                    disabled={!newEmail.trim() || addingManual}
                                    className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-500 disabled:opacity-50 flex items-center gap-2 shadow-lg shadow-red-900/20 transition-all"
                                >
                                    {addingManual && <Loader2 className="w-4 h-4 animate-spin" />}
                                    Add to Blocklist
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Search */}
            <div className="relative">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-white/40" />
                <input
                    type="text"
                    placeholder="Search blocked emails..."
                    value={search}
                    onChange={e => { setSearch(e.target.value); setPage(1); }}
                    className="w-full pl-9 pr-4 py-2 text-sm bg-black/20 border border-white/10 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none text-white placeholder-white/20"
                />
            </div>

            {/* Table */}
            <div className="bg-white/5 border border-white/10 rounded-xl overflow-hidden shadow-sm backdrop-blur-sm">
                <table className="w-full text-sm">
                    <thead className="bg-white/5 border-b border-white/5">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-semibold text-white/50 uppercase tracking-wider">Email</th>
                            <th className="px-6 py-3 text-left text-xs font-semibold text-white/50 uppercase tracking-wider">Name</th>
                            <th className="px-6 py-3 text-left text-xs font-semibold text-white/50 uppercase tracking-wider">Added</th>
                            <th className="px-6 py-3 text-right text-xs font-semibold text-white/50 uppercase tracking-wider">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                        {loading ? (
                            <tr>
                                <td colSpan={4} className="py-12 text-center">
                                    <Loader2 className="w-8 h-8 animate-spin text-white/20 mx-auto" />
                                </td>
                            </tr>
                        ) : blockedEmails.length === 0 ? (
                            <tr>
                                <td colSpan={4} className="py-12 text-center text-white/50">
                                    {search ? 'No matching emails found' : 'No blocked emails yet'}
                                </td>
                            </tr>
                        ) : blockedEmails.map(item => (
                            <tr key={item.id} className="hover:bg-white/5 transition-colors">
                                <td className="px-6 py-4">
                                    <span className="font-medium text-white">{item.email}</span>
                                </td>
                                <td className="px-6 py-4 text-white/60">
                                    {item.firstName || item.lastName
                                        ? `${item.firstName || ''} ${item.lastName || ''}`.trim()
                                        : <span className="text-white/40 italic">-</span>
                                    }
                                </td>
                                <td className="px-6 py-4 text-white/50 text-xs">
                                    {new Date(item.createdAt).toLocaleDateString()}
                                </td>
                                <td className="px-6 py-4 text-right">
                                    <button
                                        onClick={() => handleRemove(item.id)}
                                        className="p-1.5 text-white/40 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                                        title="Remove from blocklist"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>

                {/* Pagination */}
                {totalPages > 1 && (
                    <div className="px-6 py-3 border-t border-white/5 bg-transparent flex items-center justify-between">
                        <span className="text-sm text-white/50">
                            Page {page} of {totalPages}
                        </span>
                        <div className="flex gap-2">
                            <button
                                onClick={() => setPage(p => Math.max(1, p - 1))}
                                disabled={page === 1}
                                className="p-1 hover:bg-white/10 rounded disabled:opacity-30 text-white/50 hover:text-white transition-colors"
                            >
                                <ChevronLeft className="w-5 h-5" />
                            </button>
                            <button
                                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                                disabled={page === totalPages}
                                className="p-1 hover:bg-white/10 rounded disabled:opacity-30 text-white/50 hover:text-white transition-colors"
                            >
                                <ChevronRight className="w-5 h-5" />
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
