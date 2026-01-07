'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ChevronRight, ChevronLeft, Upload, Clock, Save, FileText, Send, User } from 'lucide-react';
import { cn } from '@/lib/utils';
import { updateCampaign } from '@/actions';

interface EditCampaignFormProps {
    campaign: any;
}

export function EditCampaignForm({ campaign }: EditCampaignFormProps) {
    const router = useRouter();
    const [step, setStep] = useState(1);
    const [loading, setLoading] = useState(false);

    // Form State
    const [name, setName] = useState(campaign.name);
    // Parse schedule if string or object
    // Parse schedule if string or object, ensuring defaults
    const [schedule, setSchedule] = useState(() => {
        let sc = campaign.schedule;
        if (typeof sc === 'string') {
            try { sc = JSON.parse(sc); } catch { sc = {}; }
        }
        sc = sc || {};
        return {
            days: Array.isArray(sc.days) ? sc.days : ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'],
            start: sc.start || '09:00',
            end: sc.end || '17:00'
        };
    });

    const [steps, setSteps] = useState(campaign.steps.length > 0 ? campaign.steps : [
        { order: 1, subject: '', body: 'Hi {firstName}, ...', waitDays: 0 }
    ]);

    const handleSubmit = async () => {
        setLoading(true);
        try {
            await updateCampaign(campaign.id, {
                name,
                schedule,
                steps
            });

            // Brief delay to ensure DB update propagates (sometimes needed in dev)
            await new Promise(resolve => setTimeout(resolve, 500));

            alert("Campaign updated successfully!");
            router.refresh();
            router.push(`/campaigns/${campaign.id}`);
        } catch (err) {
            console.error(err);
            alert("Failed to update campaign");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-8 flex-1 overflow-y-auto">
            <div className="mb-8 flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900">Edit Campaign</h1>
                    <p className="text-slate-500 text-sm mt-1">Update your outreach sequence</p>
                </div>
            </div>

            {/* Content based on simplified steps (No wizard, just sections) */}
            <div className="space-y-12 max-w-4xl mx-auto">

                {/* Basics */}
                <div className="space-y-6">
                    <h3 className="text-lg font-semibold text-slate-900 border-b border-slate-100 pb-2">General Settings</h3>
                    <div className="max-w-xl">
                        <label className="block text-sm font-medium text-slate-700 mb-1.5">Campaign Name</label>
                        <input
                            value={name} onChange={e => setName(e.target.value)}
                            className="w-full px-4 py-2 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                        />
                    </div>

                    <div className="max-w-xl">
                        <label className="block text-sm font-medium text-slate-700 mb-3">Sending Schedule</label>
                        <div className="flex gap-2 mb-4">
                            {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(day => (
                                <button
                                    key={day}
                                    onClick={() => setSchedule((prev: any) => ({
                                        ...prev,
                                        days: prev.days.includes(day) ? prev.days.filter((d: string) => d !== day) : [...prev.days, day]
                                    }))}
                                    className={cn("h-10 w-10 rounded-lg text-sm font-medium transition-colors border",
                                        schedule.days?.includes(day)
                                            ? "bg-blue-600 text-white border-blue-600"
                                            : "bg-white text-slate-500 border-slate-200 hover:border-slate-300"
                                    )}
                                >
                                    {day.charAt(0)}
                                </button>
                            ))}
                        </div>
                        <div className="grid grid-cols-2 gap-6">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1.5">Start Time</label>
                                <input type="time" value={schedule.start} onChange={(e) => setSchedule({ ...schedule, start: e.target.value })} className="w-full px-3 py-2 border border-slate-200 rounded-lg outline-none" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1.5">End Time</label>
                                <input type="time" value={schedule.end} onChange={(e) => setSchedule({ ...schedule, end: e.target.value })} className="w-full px-3 py-2 border border-slate-200 rounded-lg outline-none" />
                            </div>
                        </div>
                    </div>
                </div>

                {/* Sequence */}
                <div className="space-y-6">
                    <h3 className="text-lg font-semibold text-slate-900 border-b border-slate-100 pb-2">Sequence Steps</h3>
                    <div className="space-y-8">
                        {steps.map((s: any, idx: number) => (
                            <div key={idx} className="border border-slate-200 rounded-lg p-6 relative group">
                                <div className="absolute -left-3 top-6 bg-slate-900 text-white text-xs font-bold w-6 h-6 flex items-center justify-center rounded-full">
                                    {idx + 1}
                                </div>

                                <div className="space-y-4">
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
                                        <button className="hover:text-red-500 ml-auto" onClick={() => setSteps(steps.filter((_: any, i: number) => i !== idx))}>
                                            Remove Step
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))}
                        <button
                            onClick={() => setSteps([...steps, { order: steps.length + 1, subject: undefined, body: 'Checking in...', waitDays: 2 }])}
                            className="w-full py-3 border-2 border-dashed border-slate-200 rounded-lg text-slate-400 font-medium hover:border-blue-300 hover:text-blue-500 hover:bg-blue-50 transition-all flex items-center justify-center gap-2"
                        >
                            <Upload className="w-4 h-4" />
                            Add Follow-up Step
                        </button>
                    </div>
                </div>

                <div className="flex justify-end gap-3 pt-6 border-t border-slate-100">
                    <button
                        onClick={() => router.back()}
                        className="px-6 py-2 text-slate-500 font-medium hover:text-slate-900"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleSubmit}
                        disabled={loading}
                        className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-2 rounded-lg font-medium flex items-center gap-2 transition-colors shadow-lg shadow-blue-500/30"
                    >
                        {loading ? 'Saving...' : 'Save Changes'}
                    </button>
                </div>
            </div>
        </div>
    );
}

