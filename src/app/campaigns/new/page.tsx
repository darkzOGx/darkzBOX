'use client';

import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { ChevronRight, ChevronLeft, Upload, Clock, Save, FileText, Send, User, Download, FileSpreadsheet } from 'lucide-react';
import { cn } from '@/lib/utils';
import { createCampaign } from '@/actions';

export default function NewCampaignPage() {
    const router = useRouter();
    const [step, setStep] = useState(1);
    const [loading, setLoading] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Form State
    const [name, setName] = useState('');
    const [rawLeads, setRawLeads] = useState(''); // CSV text
    const [schedule, setSchedule] = useState({ days: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'], start: '09:00', end: '17:00' });
    const [steps, setSteps] = useState([
        { order: 1, subject: '', body: 'Hi {firstName}, ...', waitDays: 0 }
    ]);

    const parsedLeads = rawLeads.split('\n').filter(l => l.includes('@')).map(row => {
        const [email, firstName, lastName, companyName] = row.split(',').map(s => s.trim());
        return { email, firstName, lastName, companyName };
    });

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (event) => {
            const text = event.target?.result as string;
            // Basic CSV parsing: skip header if detected, simple line split
            const lines = text.split(/\r\n|\n/).filter(line => line.trim() !== '');
            // Check for header
            const hasHeader = lines[0].toLowerCase().includes('email');
            const dataRows = hasHeader ? lines.slice(1) : lines;

            // Append to existing rawLeads or replace? Let's append if there's content, else replace.
            const newLeads = dataRows.join('\n');
            setRawLeads(prev => prev ? `${prev}\n${newLeads}` : newLeads);
        };
        reader.readAsText(file);
    };

    const handleDownloadTemplate = () => {
        const csvContent = "email, firstName, lastName, company\njohn@example.com, John, Doe, Acme Corp\njane@test.com, Jane, Smith, Tech Inc";
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', 'leads_template.csv');
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        const file = e.dataTransfer.files[0];
        if (file && file.name.endsWith('.csv')) {
            const reader = new FileReader();
            reader.onload = (event) => {
                const text = event.target?.result as string;
                const lines = text.split(/\r\n|\n/).filter(line => line.trim() !== '');
                const hasHeader = lines[0].toLowerCase().includes('email');
                const dataRows = hasHeader ? lines.slice(1) : lines;
                const newLeads = dataRows.join('\n');
                setRawLeads(prev => prev ? `${prev}\n${newLeads}` : newLeads);
            };
            reader.readAsText(file);
        }
    };

    const handleSubmit = async () => {
        setLoading(true);
        try {
            await createCampaign({
                name,
                schedule,
                leads: parsedLeads,
                steps
            });
            router.push('/campaigns');
        } catch (err) {
            console.error(err);
            alert("Failed to create campaign");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="p-8 max-w-5xl mx-auto h-[calc(100vh-2rem)] flex flex-col">
            {/* Wizard Header */}
            <div className="mb-8 flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900">Create Campaign</h1>
                    <p className="text-slate-500 text-sm mt-1">Step {step} of 4</p>
                </div>
                <div className="flex gap-2">
                    {[1, 2, 3, 4].map(s => (
                        <div key={s} className={cn("h-1.5 w-12 rounded-full transition-colors",
                            s <= step ? "bg-blue-600" : "bg-slate-200")}
                        />
                    ))}
                </div>
            </div>

            {/* Wizard Content */}
            <div className="flex-1 bg-white border border-slate-200 rounded-xl shadow-sm p-8 overflow-y-auto">

                {/* Step 1: Basics & Leads */}
                {step === 1 && (
                    <div className="space-y-6 max-w-2xl mx-auto">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1.5">Campaign Name</label>
                            <input
                                value={name} onChange={e => setName(e.target.value)}
                                placeholder="e.g. Q4 Outreach"
                                className="w-full px-4 py-2 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1.5 flex items-center justify-between">
                                <span>Paste Leads (CSV format)</span>
                            </label>
                            <div className="relative mb-4">
                                <textarea
                                    value={rawLeads} onChange={e => setRawLeads(e.target.value)}
                                    placeholder={`elon@tesla.com, Elon, Musk, Tesla\njeff@amazon.com, Jeff, Bezos, Amazon`}
                                    className="w-full h-32 px-4 py-3 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 font-mono text-sm resize-none pr-32"
                                />
                                <div className="absolute bottom-4 right-4 text-xs text-slate-400 bg-white px-2 py-1 rounded border border-slate-100">
                                    {parsedLeads.length} leads detected
                                </div>
                            </div>

                            <label className="block text-sm font-medium text-slate-700 mb-1.5 flex items-center justify-between">
                                <span>Import Leads (CSV File)</span>
                                <div className="flex gap-2">
                                    <button
                                        onClick={handleDownloadTemplate}
                                        className="text-xs flex items-center gap-1 text-blue-600 hover:text-blue-700 font-medium"
                                    >
                                        <Download className="w-3 h-3" />
                                        Template
                                    </button>
                                    <span className="text-xs text-slate-400">Format: email, firstName, lastName, company</span>
                                </div>
                            </label>
                            <div className="relative space-y-3">
                                <div
                                    className="border-2 border-dashed border-slate-200 rounded-lg p-4 flex flex-col items-center justify-center bg-slate-50 hover:bg-blue-50 hover:border-blue-200 transition-colors cursor-pointer"
                                    onDragOver={e => e.preventDefault()}
                                    onDrop={handleDrop}
                                    onClick={() => fileInputRef.current?.click()}
                                >
                                    <FileSpreadsheet className="w-8 h-8 text-slate-400 mb-2" />
                                    <p className="text-sm text-slate-600 font-medium">Click to upload or drag & drop</p>
                                    <p className="text-xs text-slate-400">CSV files only</p>
                                    <input
                                        ref={fileInputRef}
                                        type="file"
                                        accept=".csv"
                                        className="hidden"
                                        onChange={handleFileUpload}
                                    />
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Step 2: Sequence */}
                {step === 2 && (
                    <div className="space-y-8">
                        {steps.map((s, idx) => (
                            <div key={idx} className="border border-slate-200 rounded-lg p-6 relative group">
                                <div className="absolute -left-3 top-6 bg-slate-900 text-white text-xs font-bold w-6 h-6 flex items-center justify-center rounded-full">
                                    {idx + 1}
                                </div>

                                <div className="space-y-4">
                                    {/* Subject line mainly for step 1 */}
                                    <div>
                                        <input
                                            value={s.subject || ''}
                                            onChange={e => {
                                                const newSteps = [...steps];
                                                newSteps[idx].subject = e.target.value;
                                                setSteps(newSteps);
                                            }}
                                            placeholder={idx === 0 ? "Subject Line..." : "Re: Previous subject (Automatic)"}
                                            disabled={idx > 0}
                                            className={cn("w-full font-medium text-lg border-b border-transparent focus:border-blue-500 outline-none pb-1 placeholder:text-slate-300", idx > 0 && "bg-slate-50 text-slate-400")}
                                        />
                                    </div>
                                    <textarea
                                        value={s.body}
                                        onChange={e => {
                                            const newSteps = [...steps];
                                            newSteps[idx].body = e.target.value;
                                            setSteps(newSteps);
                                        }}
                                        className="w-full h-32 resize-none outline-none text-slate-600"
                                        placeholder="Hi {firstName}, ..."
                                    />
                                    <div className="flex items-center gap-4 text-xs text-slate-400 border-t border-slate-100 pt-4">
                                        <div className="flex items-center gap-2">
                                            <Clock className="w-3 h-3" />
                                            <span>Wait</span>
                                            <input
                                                type="number"
                                                min="0"
                                                value={s.waitDays}
                                                onChange={e => {
                                                    const newSteps = [...steps];
                                                    newSteps[idx].waitDays = parseInt(e.target.value) || 0;
                                                    setSteps(newSteps);
                                                }}
                                                className="w-12 px-1 py-0.5 border border-slate-200 rounded text-center text-slate-600 outline-none focus:border-blue-500"
                                            />
                                            <span>days</span>
                                        </div>
                                        <button className="hover:text-red-500 ml-auto" onClick={() => setSteps(steps.filter((_, i) => i !== idx))}>
                                            Remove Step
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))}
                        <button
                            onClick={() => setSteps([...steps, { order: steps.length + 1, subject: '', body: 'Checking in...', waitDays: 2 }])}
                            className="w-full py-3 border-2 border-dashed border-slate-200 rounded-lg text-slate-400 font-medium hover:border-blue-300 hover:text-blue-500 hover:bg-blue-50 transition-all flex items-center justify-center gap-2"
                        >
                            <Upload className="w-4 h-4" />
                            Add Follow-up Step
                        </button>
                    </div>
                )}

                {/* Step 3: Schedule */}
                {step === 3 && (
                    <div className="max-w-xl mx-auto space-y-8">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-3">Sending Days</label>
                            <div className="flex gap-2">
                                {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(day => (
                                    <button
                                        key={day}
                                        onClick={() => setSchedule(prev => ({
                                            ...prev,
                                            days: prev.days.includes(day) ? prev.days.filter(d => d !== day) : [...prev.days, day]
                                        }))}
                                        className={cn("h-10 w-10 rounded-lg text-sm font-medium transition-colors border",
                                            schedule.days.includes(day)
                                                ? "bg-blue-600 text-white border-blue-600"
                                                : "bg-white text-slate-500 border-slate-200 hover:border-slate-300"
                                        )}
                                    >
                                        {day.charAt(0)}
                                    </button>
                                ))}
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-6">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1.5">Start Time</label>
                                <input type="time" value={schedule.start} onChange={e => setSchedule({ ...schedule, start: e.target.value })} className="w-full px-3 py-2 border border-slate-200 rounded-lg outline-none" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1.5">End Time</label>
                                <input type="time" value={schedule.end} onChange={e => setSchedule({ ...schedule, end: e.target.value })} className="w-full px-3 py-2 border border-slate-200 rounded-lg outline-none" />
                            </div>
                        </div>
                    </div>
                )}

                {/* Step 4: Review */}
                {step === 4 && (
                    <div className="max-w-2xl mx-auto text-center space-y-6">
                        <div className="h-16 w-16 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mx-auto">
                            <Send className="w-8 h-8" />
                        </div>
                        <h2 className="text-xl font-bold text-slate-900">Ready to Launch?</h2>
                        <div className="bg-slate-50 rounded-xl p-6 text-left space-y-4 border border-slate-200 text-sm">
                            <div className="flex justify-between">
                                <span className="text-slate-500">Campaign Name</span>
                                <span className="font-medium text-slate-900">{name}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-slate-500">Leads Imported</span>
                                <span className="font-medium text-slate-900">{parsedLeads.length}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-slate-500">Steps</span>
                                <span className="font-medium text-slate-900">{steps.length} emails</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-slate-500">Schedule</span>
                                <span className="font-medium text-slate-900">{schedule.start} - {schedule.end}</span>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Wizard Footer */}
            <div className="mt-6 flex justify-between">
                <button
                    onClick={() => setStep(s => Math.max(1, s - 1))}
                    disabled={step === 1}
                    className="px-6 py-2 text-slate-500 font-medium hover:text-slate-900 disabled:opacity-50"
                >
                    Back
                </button>

                {step < 4 ? (
                    <button
                        onClick={() => setStep(s => Math.min(4, s + 1))}
                        disabled={step === 1 && !name} // Simple validation
                        className="bg-slate-900 hover:bg-slate-800 text-white px-6 py-2 rounded-lg font-medium flex items-center gap-2 transition-colors disabled:opacity-50"
                    >
                        Next Step <ChevronRight className="w-4 h-4" />
                    </button>
                ) : (
                    <button
                        onClick={handleSubmit}
                        disabled={loading}
                        className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-2 rounded-lg font-medium flex items-center gap-2 transition-colors shadow-lg shadow-blue-500/30"
                    >
                        {loading ? 'Launching...' : 'Launch Campaign'}
                    </button>
                )}
            </div>
        </div >
    );
}
