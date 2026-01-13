"use client";

import React, { useState, useTransition } from 'react';
import { Search, Mail, Phone, MoreHorizontal, Reply, Trash2, CheckCircle2, User, Clock, RefreshCw, Save, FileText, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { sendReply, getThreadMessages, deleteLead, updateLeadStatus, triggerSync, saveTemplate, getTemplates, markLeadAsRead, markLeadAsUnread, deleteTemplate, deleteEmailLog } from "@/actions";
import { useRouter } from 'next/navigation';
import { RichTextEditor } from '@/components/RichTextEditor';

// ... imports

interface Thread {
    id: string;
    leadName: string;
    leadEmail: string;
    leadCompany: string;
    subject: string;
    lastMessagePreview: string;
    time: string;
    read: boolean;
    status: string;
    avatarColor: string;
    stats: { opens: number; clicks: number };
}

interface Template {
    id: string;
    name: string;
    content: string;
}

export const Unibox = ({ initialThreads }: { initialThreads: Thread[] }) => {
    const [threads, setThreads] = useState<Thread[]>(initialThreads);
    const [selectedThreadId, setSelectedThreadId] = useState<string | null>(threads[0]?.id || null);

    // Reply & Template State
    const [replyBody, setReplyBody] = useState("");
    const [templates, setTemplates] = useState<Template[]>([]);
    const [isPending, startTransition] = useTransition();
    const router = useRouter();

    const selectedThread = threads.find(t => t.id === selectedThreadId);

    // Messages State
    const [messages, setMessages] = useState<{ id: string; content: string; sender: string; timestamp: string }[]>([]);
    const [isSyncing, startSync] = useTransition();

    React.useEffect(() => {
        setThreads(initialThreads);
    }, [initialThreads]);

    React.useEffect(() => {
        // Load Templates
        getTemplates().then(setTemplates);
    }, []);

    React.useEffect(() => {
        if (selectedThreadId) {
            getThreadMessages(selectedThreadId).then(msgs => {
                setMessages(msgs);
            });
        }
    }, [selectedThreadId]);

    const handleSendReply = () => {
        if (!selectedThreadId || !replyBody.trim()) return;

        startTransition(async () => {
            await sendReply(selectedThreadId, replyBody);
            setReplyBody("");

            const msgs = await getThreadMessages(selectedThreadId);
            setMessages(msgs);
        });
    };

    const handleSaveTemplate = async () => {
        if (!replyBody.trim()) return alert("Type something first!");
        const name = prompt("Template Name:");
        if (!name) return;

        try {
            const newTemplate = await saveTemplate(name, replyBody);
            setTemplates([newTemplate, ...templates]);
            alert("Template saved!");
        } catch (e) {
            alert("Failed to save template");
        }
    };

    const handleUseTemplate = (content: string) => {
        setReplyBody(content);
    };

    const handleDeleteTemplate = async (e: React.MouseEvent, id: string) => {
        e.stopPropagation();
        if (!confirm("Are you sure you want to delete this template?")) return;

        try {
            await deleteTemplate(id);
            setTemplates(templates.filter(t => t.id !== id));
        } catch (error) {
            alert("Failed to delete template");
        }
    };

    const handleMarkUnread = async () => {
        console.log('[handleMarkUnread] Called, selectedThreadId:', selectedThreadId);
        if (!selectedThreadId) return;
        try {
            await markLeadAsUnread(selectedThreadId);
            setThreads(threads.map(t => t.id === selectedThreadId ? { ...t, read: false } : t));
            setSelectedThreadId(null); // Deselect to visually confirm it's unread in list
        } catch (error) {
            alert("Failed to mark as unread");
        }
    };

    const handleDelete = async () => {
        console.log('[handleDelete] Called, selectedThreadId:', selectedThreadId);
        if (!selectedThreadId || !confirm("Are you sure you want to delete this conversation?")) return;

        try {
            await deleteLead(selectedThreadId);
            setThreads(threads.filter(t => t.id !== selectedThreadId));
            setSelectedThreadId(null);
            router.refresh();
        } catch (error) {
            alert("Failed to delete");
        }
    };

    const handleMarkStatus = async (status: string) => {
        console.log('[handleMarkStatus] Called with status:', status, 'selectedThreadId:', selectedThreadId);
        if (!selectedThreadId) return;
        try {
            await updateLeadStatus(selectedThreadId, status);
            setThreads(threads.map(t => t.id === selectedThreadId ? { ...t, status } : t));
            router.refresh();
        } catch (error) {
            alert("Failed to update status");
        }
    };

    const handleSync = () => {
        startSync(async () => {
            await triggerSync();
            router.refresh();
        });
    };

    // ... rest of component


    return (
        <div className="flex h-[calc(100vh-64px)] bg-white overflow-hidden">
            {/* Left Sidebar: Threads List */}
            <div className="w-80 border-r border-slate-200 flex flex-col bg-white">
                <div className="p-4 border-b border-slate-100">
                    <div className="flex items-center justify-between mb-4 px-1">
                        <h2 className="text-lg font-bold text-slate-900">
                            Inbox <span className="text-slate-400 font-normal text-sm ml-1">{threads.length}</span>
                        </h2>
                        <button
                            onClick={handleSync}
                            disabled={isSyncing}
                            className={cn("p-2 rounded-lg hover:bg-slate-100 text-slate-500 transition-all", isSyncing && "animate-spin text-blue-500")}
                            title="Sync Emails"
                        >
                            <RefreshCw className="w-4 h-4" />
                        </button>
                    </div>
                    <div className="relative">
                        <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                        <input
                            type="text"
                            placeholder="Search emails..."
                            className="w-full pl-9 pr-4 py-2 text-sm bg-slate-50 border-none rounded-lg focus:ring-1 focus:ring-blue-500 outline-none text-slate-900 placeholder:text-slate-400"
                        />
                    </div>
                </div>

                <div className="overflow-y-auto flex-1">
                    {threads.map(thread => (
                        <div
                            key={thread.id}
                            onClick={() => {
                                console.log('[ThreadClick] Setting selectedThreadId to:', thread.id);
                                setSelectedThreadId(thread.id);
                                // Mark as read when clicked (only if thread.id exists and unread)
                                if (thread.id && !thread.read) {
                                    markLeadAsRead(thread.id);
                                    setThreads(prev => prev.map(t =>
                                        t.id === thread.id ? { ...t, read: true } : t
                                    ));
                                }
                            }}
                            className={cn(
                                "p-4 border-b border-slate-50 cursor-pointer hover:bg-slate-50 transition-colors group",
                                selectedThreadId === thread.id ? "bg-blue-50/50 hover:bg-blue-50/60" : "",
                                !thread.read ? "bg-white" : "bg-white/50"
                            )}
                        >
                            <div className="flex justify-between items-start mb-1">
                                <div className="flex items-center gap-2">
                                    {!thread.read && <div className="w-2 h-2 rounded-full bg-blue-500"></div>}
                                    <h3 className={cn("font-medium text-sm text-slate-900", !thread.read ? "font-bold" : "")}>{thread.leadName}</h3>
                                </div>
                                <span className="text-[10px] text-slate-400 font-medium">{thread.time}</span>
                            </div>
                            <p className="text-xs text-slate-600 font-medium truncate mb-0.5">{thread.subject}</p>
                            <p className="text-xs text-slate-400 truncate">{thread.lastMessagePreview}</p>

                            <div className="flex gap-2 mt-2">
                                {thread.status === 'Interested' && <span className="px-2 py-0.5 bg-green-100 text-green-700 text-[10px] rounded-full font-medium">Interested</span>}
                                {thread.status === 'Not Interested' && <span className="px-2 py-0.5 bg-red-100 text-red-700 text-[10px] rounded-full font-medium">Not Interested</span>}
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Middle: Chat View */}
            <div className="flex-1 flex flex-col bg-slate-50/50">
                {selectedThread ? (
                    <>
                        {/* Chat Header */}
                        <div className="h-16 border-b border-slate-200 bg-white flex items-center justify-between px-6 flex-shrink-0">
                            <div className="flex items-center gap-3">
                                <div className={cn("h-8 w-8 rounded-full flex items-center justify-center text-white text-xs font-bold", selectedThread.avatarColor)}>
                                    {selectedThread.leadName.charAt(0)}
                                </div>
                                <div>
                                    <h2 className="text-sm font-bold text-slate-900">{selectedThread.subject}</h2>
                                    <p className="text-xs text-slate-500">with {selectedThread.leadName} &lt;{selectedThread.leadEmail}&gt;</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={() => handleMarkStatus('COMPLETED')}
                                    className="p-2 text-slate-400 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                                    title="Mark as Resolved"
                                >
                                    <CheckCircle2 className="w-5 h-5" />
                                </button>
                                <button
                                    onClick={handleDelete}
                                    className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                    title="Delete Conversation"
                                >
                                    <Trash2 className="w-5 h-5" />
                                </button>
                                <button className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors">
                                    <MoreHorizontal className="w-5 h-5" />
                                </button>
                            </div>
                        </div>

                        <div className="flex-1 overflow-y-auto p-6 space-y-6">
                            {messages.length === 0 ? (
                                <div className="text-center text-slate-400 text-sm mt-10">No messages yet.</div>
                            ) : (
                                messages.map((msg) => (
                                    <div key={msg.id} className={cn("flex gap-4 max-w-2xl group", msg.sender === 'us' ? "ml-auto flex-row-reverse" : "")}>
                                        <div className={cn(
                                            "h-8 w-8 rounded-full flex-shrink-0 flex items-center justify-center text-white text-xs font-bold",
                                            msg.sender === 'us' ? "bg-blue-600" : selectedThread.avatarColor
                                        )}>
                                            {msg.sender === 'us' ? "ME" : selectedThread.leadName.charAt(0)}
                                        </div>
                                        <div className={cn(msg.sender === 'us' ? "text-right" : "", "relative")}>
                                            <div className={cn("flex items-baseline gap-2 mb-1", msg.sender === 'us' ? "justify-end" : "")}>
                                                <span className={cn("font-bold text-sm text-slate-900")}>{msg.sender === 'us' ? "You" : selectedThread.leadName}</span>
                                                <span className="text-xs text-slate-400">{msg.timestamp}</span>
                                                <button
                                                    onClick={async (e) => {
                                                        e.stopPropagation();
                                                        if (confirm('Delete this message?')) {
                                                            await deleteEmailLog(msg.id);
                                                            setMessages(messages.filter(m => m.id !== msg.id));
                                                        }
                                                    }}
                                                    className="opacity-0 group-hover:opacity-100 p-1 text-slate-400 hover:text-red-500 transition-opacity"
                                                    title="Delete message"
                                                >
                                                    <Trash2 className="w-3 h-3" />
                                                </button>
                                            </div>
                                            <div className={cn(
                                                "p-4 rounded-xl shadow-sm text-sm leading-relaxed",
                                                msg.sender === 'us'
                                                    ? "bg-blue-600 text-white rounded-tr-sm text-left"
                                                    : "bg-white border border-slate-200 text-slate-700 rounded-tl-sm"
                                            )}>
                                                <p>{msg.content}</p>
                                            </div>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>

                        {/* Reply Box */}
                        <div className="p-4 bg-white border-t border-slate-200 flex-shrink-0">
                            <RichTextEditor
                                content={replyBody}
                                onChange={setReplyBody}
                                placeholder="Type your reply..."
                                minHeight="100px"
                                showVariables={false}
                            />
                            <div className="flex items-center justify-between mt-3">
                                <div className="flex gap-2">
                                    <button className="text-slate-400 hover:text-blue-500 transition-colors p-1.5 rounded hover:bg-slate-100">
                                        <PaperclipIcon className="w-4 h-4" />
                                    </button>
                                    <button className="text-slate-400 hover:text-yellow-500 transition-colors p-1.5 rounded hover:bg-slate-100">
                                        <SmileIcon className="w-4 h-4" />
                                    </button>
                                    <button
                                        onClick={handleSaveTemplate}
                                        className="text-slate-400 hover:text-emerald-600 transition-colors p-1.5 rounded hover:bg-slate-100"
                                        title="Save as Template"
                                    >
                                        <Save className="w-4 h-4" />
                                    </button>
                                    <button
                                        onClick={handleMarkUnread}
                                        className="text-slate-400 hover:text-blue-600 transition-colors p-1.5 rounded hover:bg-slate-100"
                                        title="Mark as Unread"
                                    >
                                        <Mail className="w-4 h-4" />
                                    </button>
                                </div>
                                <button
                                    onClick={handleSendReply}
                                    disabled={isPending || !replyBody.trim()}
                                    className="bg-gradient-to-r from-blue-600 to-purple-600 text-white px-4 py-1.5 rounded-lg text-sm font-medium hover:from-blue-700 hover:to-purple-700 transition-all shadow-md shadow-blue-500/20 flex items-center gap-2 disabled:opacity-50"
                                >
                                    {isPending ? 'Sending...' : 'Send Reply'} <Reply className="w-3 h-3" />
                                </button>
                            </div>
                        </div>
                    </>
                ) : (
                    <div className="flex-1 flex flex-col items-center justify-center text-slate-400">
                        <Mail className="w-12 h-12 mb-4 opacity-20" />
                        <p>Select a conversation to start chatting</p>
                    </div>
                )}
            </div>

            {/* Right Sidebar: Lead Details */}
            {selectedThread && (
                <div className="w-72 bg-white border-l border-slate-200 p-6 flex-col hidden xl:flex">
                    <div className="flex flex-col items-center text-center mb-6">
                        <div className={cn("h-20 w-20 rounded-full flex items-center justify-center text-white text-2xl font-bold mb-3 shadow-lg", selectedThread.avatarColor)}>
                            {selectedThread.leadName.charAt(0)}
                        </div>
                        <h2 className="text-lg font-bold text-slate-900">{selectedThread.leadName}</h2>
                        <p className="text-sm text-slate-500">{selectedThread.leadCompany}</p>

                        <div className="flex gap-2 mt-4">
                            <button className="p-2 border border-slate-200 rounded-lg hover:bg-slate-50 text-slate-600 transition-colors">
                                <Mail className="w-4 h-4" />
                            </button>
                            <button className="p-2 border border-slate-200 rounded-lg hover:bg-slate-50 text-slate-600 transition-colors">
                                <Phone className="w-4 h-4" />
                            </button>
                        </div>
                    </div>

                    <div className="space-y-6">
                        <div>
                            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Lead Info</h3>
                            <div className="space-y-3">
                                <div className="flex items-center gap-3 text-sm">
                                    <Mail className="w-4 h-4 text-slate-400" />
                                    <span className="text-slate-700 truncate">{selectedThread.leadEmail}</span>
                                </div>
                                <div className="flex items-center gap-3 text-sm">
                                    <Clock className="w-4 h-4 text-slate-400" />
                                    <span className="text-slate-700">{selectedThread.time} (Last Contact)</span>
                                </div>
                            </div>
                        </div>

                        <div>
                            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Campaign Metrics</h3>
                            <div className="grid grid-cols-2 gap-3">
                                <div className="p-3 bg-slate-50 rounded-lg text-center">
                                    <p className="text-xs text-slate-500">Opens</p>
                                    <p className="font-bold text-slate-900">{selectedThread.stats.opens}</p>
                                </div>
                                <div className="p-3 bg-slate-50 rounded-lg text-center">
                                    <p className="text-xs text-slate-500">Clicks</p>
                                    <p className="font-bold text-slate-900">{selectedThread.stats.clicks}</p>
                                </div>
                            </div>
                        </div>

                        <div>
                            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Templates</h3>
                            <div className="space-y-2">
                                {templates.map(t => (
                                    <div
                                        key={t.id}
                                        className="w-full text-left p-2.5 rounded-lg border border-slate-100 hover:border-slate-300 hover:bg-slate-50 transition-colors group flex items-center justify-between"
                                    >
                                        <button
                                            onClick={() => handleUseTemplate(t.content)}
                                            className="flex items-center gap-2 flex-1 overflow-hidden"
                                        >
                                            <FileText className="w-3 h-3 text-slate-400 group-hover:text-blue-500 flex-shrink-0" />
                                            <span className="text-sm text-slate-700 font-medium truncate">{t.name}</span>
                                        </button>
                                        <button
                                            onClick={(e) => handleDeleteTemplate(e, t.id)}
                                            className="text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity p-1"
                                            title="Delete Template"
                                        >
                                            <Trash2 className="w-3 h-3" />
                                        </button>
                                    </div>
                                ))}
                                {templates.length === 0 && (
                                    <div className="text-center p-4 border border-dashed border-slate-200 rounded-lg bg-slate-50">
                                        <p className="text-xs text-slate-400">No templates yet</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

function PaperclipIcon({ className }: { className?: string }) {
    return <svg className={className} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m21.44 11.05-9.19 9.19a6 6 0 0 1-8.49-8.49l8.57-8.57A4 4 0 1 1 18.1 8.84l-8.59 8.57a2 2 0 0 1-2.83-2.83l8.49-8.48" /></svg>
}

function SmileIcon({ className }: { className?: string }) {
    return <svg className={className} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><path d="M8 14s1.5 2 4 2 4-2 4-2" /><line x1="9" x2="9.01" y1="9" y2="9" /><line x1="15" x2="15.01" y1="9" y2="9" /></svg>
}
