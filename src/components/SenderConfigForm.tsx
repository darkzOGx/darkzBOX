'use client';

import { useState, useEffect } from 'react';
import { Server, Save, Loader2, TestTube } from 'lucide-react';
import { getSenderConfig, saveSenderConfig } from '@/actions/sender';

export function SenderConfigForm() {
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [testing, setTesting] = useState(false);
    const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);

    const [config, setConfig] = useState({
        smtpHost: '',
        smtpPort: 587,
        smtpUser: '',
        smtpPass: '',
        fromName: '',
        fromEmail: '',
        useTls: true,
        dailyLimit: 500,
        delayBetween: 5
    });

    useEffect(() => {
        loadConfig();
    }, []);

    const loadConfig = async () => {
        try {
            const data = await getSenderConfig();
            if (data) {
                setConfig({
                    smtpHost: data.smtpHost,
                    smtpPort: data.smtpPort,
                    smtpUser: data.smtpUser,
                    smtpPass: data.smtpPass,
                    fromName: data.fromName || '',
                    fromEmail: data.fromEmail,
                    useTls: data.useTls,
                    dailyLimit: data.dailyLimit,
                    delayBetween: data.delayBetween
                });
            }
        } catch (error) {
            console.error('Failed to load config:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async () => {
        setSaving(true);
        setTestResult(null);
        try {
            await saveSenderConfig(config);
            setTestResult({ success: true, message: 'Configuration saved successfully!' });
        } catch (error) {
            setTestResult({ success: false, message: 'Failed to save configuration' });
        } finally {
            setSaving(false);
        }
    };

    const handleTest = async () => {
        setTesting(true);
        setTestResult(null);
        try {
            const res = await fetch('/api/sender/test', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(config)
            });
            const data = await res.json();
            if (data.success) {
                setTestResult({ success: true, message: 'SMTP connection successful!' });
            } else {
                setTestResult({ success: false, message: data.error || 'Connection failed' });
            }
        } catch (error) {
            setTestResult({ success: false, message: 'Failed to test connection' });
        } finally {
            setTesting(false);
        }
    };

    if (loading) {
        return (
            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                <div className="flex items-center justify-center py-8">
                    <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
                </div>
            </div>
        );
    }

    return (
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-6">
            <div className="flex items-center gap-3">
                <div className="h-10 w-10 bg-purple-50 text-purple-600 rounded-lg flex items-center justify-center">
                    <Server className="w-5 h-5" />
                </div>
                <div>
                    <h2 className="text-lg font-semibold text-slate-900">Sender SMTP Configuration</h2>
                    <p className="text-sm text-slate-500">Configure SMTP settings for the standalone email sender</p>
                </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
                <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">SMTP Host</label>
                    <input
                        type="text"
                        value={config.smtpHost}
                        onChange={e => setConfig({ ...config, smtpHost: e.target.value })}
                        placeholder="smtp.example.com"
                        className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 outline-none"
                    />
                </div>
                <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">SMTP Port</label>
                    <input
                        type="number"
                        value={config.smtpPort}
                        onChange={e => setConfig({ ...config, smtpPort: parseInt(e.target.value) || 587 })}
                        className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 outline-none"
                    />
                </div>
                <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">SMTP Username</label>
                    <input
                        type="text"
                        value={config.smtpUser}
                        onChange={e => setConfig({ ...config, smtpUser: e.target.value })}
                        placeholder="user@example.com"
                        className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 outline-none"
                    />
                </div>
                <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">SMTP Password</label>
                    <input
                        type="password"
                        value={config.smtpPass}
                        onChange={e => setConfig({ ...config, smtpPass: e.target.value })}
                        placeholder="••••••••"
                        className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 outline-none"
                    />
                </div>
                <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">From Name</label>
                    <input
                        type="text"
                        value={config.fromName}
                        onChange={e => setConfig({ ...config, fromName: e.target.value })}
                        placeholder="John Doe"
                        className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 outline-none"
                    />
                </div>
                <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">From Email</label>
                    <input
                        type="email"
                        value={config.fromEmail}
                        onChange={e => setConfig({ ...config, fromEmail: e.target.value })}
                        placeholder="sender@example.com"
                        className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 outline-none"
                    />
                </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
                <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Daily Limit</label>
                    <input
                        type="number"
                        value={config.dailyLimit}
                        onChange={e => setConfig({ ...config, dailyLimit: parseInt(e.target.value) || 500 })}
                        className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 outline-none"
                    />
                    <p className="text-xs text-slate-400 mt-1">Max emails per day</p>
                </div>
                <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Delay Between Emails</label>
                    <input
                        type="number"
                        value={config.delayBetween}
                        onChange={e => setConfig({ ...config, delayBetween: parseInt(e.target.value) || 5 })}
                        className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 outline-none"
                    />
                    <p className="text-xs text-slate-400 mt-1">Seconds between sends</p>
                </div>
                <div className="flex items-center pt-6">
                    <label className="flex items-center gap-2 cursor-pointer">
                        <input
                            type="checkbox"
                            checked={config.useTls}
                            onChange={e => setConfig({ ...config, useTls: e.target.checked })}
                            className="w-4 h-4 rounded border-slate-300 text-purple-600 focus:ring-purple-500"
                        />
                        <span className="text-sm text-slate-700">Use TLS/SSL</span>
                    </label>
                </div>
            </div>

            {testResult && (
                <div className={`p-3 rounded-lg text-sm ${testResult.success ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                    {testResult.message}
                </div>
            )}

            <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                <button
                    onClick={handleTest}
                    disabled={testing || !config.smtpHost || !config.smtpUser}
                    className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-slate-600 bg-slate-100 rounded-lg hover:bg-slate-200 disabled:opacity-50"
                >
                    {testing ? <Loader2 className="w-4 h-4 animate-spin" /> : <TestTube className="w-4 h-4" />}
                    Test Connection
                </button>
                <button
                    onClick={handleSave}
                    disabled={saving || !config.smtpHost || !config.fromEmail}
                    className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-purple-600 rounded-lg hover:bg-purple-700 disabled:opacity-50"
                >
                    {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                    Save Configuration
                </button>
            </div>
        </div>
    );
}
