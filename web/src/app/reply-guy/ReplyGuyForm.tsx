"use client";

import { useState } from "react";
import { Bot, Save, AlertTriangle, CheckCircle2 } from "lucide-react";
import { RichTextEditor } from "@/components/RichTextEditor";

interface ReplyGuyConfigProps {
    initialConfig: {
        enabled: boolean;
        anthropicApiKey: string | null;
        customPrompt: string | null;
        businessContext: string | null;
    } | null;
    workspaceId: string;
    onSave: (formData: FormData) => Promise<void>;
}

export function ReplyGuyForm({ initialConfig, workspaceId, onSave }: ReplyGuyConfigProps) {
    const [isSaving, setIsSaving] = useState(false);
    const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle');
    const [businessContext, setBusinessContext] = useState(initialConfig?.businessContext || '');
    const [customPrompt, setCustomPrompt] = useState(initialConfig?.customPrompt || 'You are a helpful and professional assistant.');

    async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault();
        setIsSaving(true);
        setStatus('idle');

        try {
            const formData = new FormData(e.currentTarget);
            formData.set('businessContext', businessContext);
            formData.set('customPrompt', customPrompt);

            await onSave(formData);
            setStatus('success');
            setTimeout(() => setStatus('idle'), 3000);
        } catch (error) {
            console.error(error);
            setStatus('error');
        } finally {
            setIsSaving(false);
        }
    }

    return (
        <form onSubmit={handleSubmit} className="p-8 space-y-8 bg-white/5 border border-white/10 rounded-xl backdrop-blur-sm">
            <input type="hidden" name="workspaceId" value={workspaceId} />

            {/* Enable Toggle */}
            <div className="flex items-center justify-between p-4 bg-white/5 rounded-lg border border-white/10">
                <div>
                    <h3 className="font-semibold text-white">Enable Auto-Responder</h3>
                    <p className="text-sm text-white/50">Automatically reply to new leads using AI</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                    <input type="checkbox" name="enabled" className="sr-only peer" defaultChecked={initialConfig?.enabled} />
                    <div className="w-11 h-6 bg-white/20 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-purple-500/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-600"></div>
                </label>
            </div>

            {/* API Key */}
            <div className="space-y-3">
                <label className="block text-sm font-medium text-white/70">Anthropic API Key</label>
                <div className="relative">
                    <input
                        type="password"
                        name="anthropicApiKey"
                        defaultValue={initialConfig?.anthropicApiKey || ''}
                        placeholder="sk-ant-..."
                        className="w-full pl-4 pr-4 py-3 bg-black/40 border border-white/10 rounded-lg outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 font-mono text-sm text-white placeholder-white/20"
                    />
                </div>
                {!initialConfig?.anthropicApiKey && (
                    <p className="text-xs text-amber-400 flex items-center gap-1.5">
                        <AlertTriangle className="w-3 h-3" />
                        API Key is required for Reply Guy to work.
                    </p>
                )}
            </div>

            {/* Business Context */}
            <div className="space-y-3">
                <label className="block text-sm font-medium text-white/70">Business Context</label>
                <p className="text-xs text-white/50">Describe your company, product, and value proposition. The AI uses this to generate relevant replies.</p>
                <RichTextEditor
                    content={businessContext}
                    onChange={setBusinessContext}
                    placeholder="We are Acme Corp, selling widgets..."
                    minHeight="120px"
                    showVariables={false}
                />
            </div>

            {/* Custom Prompt */}
            <div className="space-y-3">
                <label className="block text-sm font-medium text-white/70">Custom System Instructions</label>
                <p className="text-xs text-white/50">Specific instructions for tone, style, or constraints.</p>
                <RichTextEditor
                    content={customPrompt}
                    onChange={setCustomPrompt}
                    placeholder="You are a helpful and professional assistant."
                    minHeight="100px"
                    showVariables={false}
                />
            </div>

            <div className="pt-4 border-t border-white/10 flex items-center justify-end gap-4">
                {status === 'success' && (
                    <span className="text-green-400 text-sm font-medium flex items-center gap-2 animate-in fade-in slide-in-from-bottom-2">
                        <CheckCircle2 className="w-4 h-4" />
                        Saved Successfully
                    </span>
                )}
                <button
                    type="submit"
                    disabled={isSaving}
                    className="bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white px-6 py-2.5 rounded-lg font-medium shadow-lg shadow-purple-900/20 flex items-center gap-2 transition-all hover:shadow-purple-900/40"
                >
                    <Save className="w-4 h-4" />
                    {isSaving ? 'Saving...' : 'Save Configuration'}
                </button>
            </div>
        </form>
    );
}
