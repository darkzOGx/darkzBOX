'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ChevronRight, ChevronLeft, Upload, Clock, Save, FileText, Send, User, Plus, Trash2, FlaskConical } from 'lucide-react';
import { cn } from '@/lib/utils';
import { updateCampaign } from '@/actions';
import { RichTextEditor } from '@/components/RichTextEditor';

interface Variant {
    id: string;
    name: string;
    subject: string;
    body: string;
    weight: number;
}

interface Step {
    order: number;
    subject: string;
    body: string;
    waitDays: number;
    enableABTest: boolean;
    variants: Variant[];
}

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

    const [steps, setSteps] = useState<Step[]>(() => {
        if (campaign.steps.length > 0) {
            return campaign.steps.map((s: any) => ({
                order: s.order,
                subject: s.subject || '',
                body: s.body || '<p>Hi {firstName}, ...</p>',
                waitDays: s.waitDays || 0,
                enableABTest: s.variants && s.variants.length > 0,
                variants: s.variants || []
            }));
        }
        return [{ order: 1, subject: '', body: '<p>Hi {firstName}, ...</p>', waitDays: 0, enableABTest: false, variants: [] }];
    });

    const generateVariantId = () => `var_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    const toggleABTest = (stepIdx: number) => {
        const newSteps = [...steps];
        const step = newSteps[stepIdx];
        step.enableABTest = !step.enableABTest;

        if (step.enableABTest && step.variants.length === 0) {
            step.variants = [
                { id: generateVariantId(), name: 'A', subject: step.subject, body: step.body, weight: 50 },
                { id: generateVariantId(), name: 'B', subject: step.subject, body: step.body, weight: 50 }
            ];
        }
        setSteps(newSteps);
    };

    const addVariant = (stepIdx: number) => {
        const newSteps = [...steps];
        const step = newSteps[stepIdx];
        const nextLetter = String.fromCharCode(65 + step.variants.length);
        const newWeight = Math.floor(100 / (step.variants.length + 1));

        step.variants = step.variants.map(v => ({ ...v, weight: newWeight }));
        step.variants.push({
            id: generateVariantId(),
            name: nextLetter,
            subject: step.subject,
            body: step.body,
            weight: newWeight
        });
        setSteps(newSteps);
    };

    const removeVariant = (stepIdx: number, variantIdx: number) => {
        const newSteps = [...steps];
        const step = newSteps[stepIdx];
        if (step.variants.length <= 2) return;

        step.variants.splice(variantIdx, 1);
        const newWeight = Math.floor(100 / step.variants.length);
        step.variants = step.variants.map((v, i) => ({
            ...v,
            name: String.fromCharCode(65 + i),
            weight: i === step.variants.length - 1 ? 100 - (newWeight * (step.variants.length - 1)) : newWeight
        }));
        setSteps(newSteps);
    };

    const updateVariant = (stepIdx: number, variantIdx: number, field: keyof Variant, value: any) => {
        const newSteps = [...steps];
        (newSteps[stepIdx].variants[variantIdx] as any)[field] = value;
        setSteps(newSteps);
    };

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
                        {steps.map((s: Step, idx: number) => (
                            <div key={idx} className="border border-slate-200 rounded-lg p-6 relative group">
                                <div className="absolute -left-3 top-6 bg-slate-900 text-white text-xs font-bold w-6 h-6 flex items-center justify-center rounded-full">
                                    {idx + 1}
                                </div>

                                <div className="space-y-4">
                                    {/* A/B Test Toggle */}
                                    <div className="flex items-center justify-between mb-2">
                                        <span className="text-sm font-medium text-slate-700">
                                            {idx === 0 ? 'Initial Email' : `Follow-up ${idx}`}
                                        </span>
                                        <button
                                            onClick={() => toggleABTest(idx)}
                                            className={cn(
                                                "flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-all",
                                                s.enableABTest
                                                    ? "bg-purple-100 text-purple-700 border border-purple-200"
                                                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                                            )}
                                        >
                                            <FlaskConical className="w-4 h-4" />
                                            {s.enableABTest ? 'A/B Test Enabled' : 'Enable A/B Test'}
                                        </button>
                                    </div>

                                    {/* Non-A/B Test Content */}
                                    {!s.enableABTest && (
                                        <>
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
                                            <RichTextEditor
                                                content={s.body}
                                                onChange={(html) => {
                                                    const newSteps = [...steps];
                                                    newSteps[idx].body = html;
                                                    setSteps(newSteps);
                                                }}
                                                placeholder="Hi {firstName}, ..."
                                                minHeight="120px"
                                            />
                                        </>
                                    )}

                                    {/* A/B Test Variants */}
                                    {s.enableABTest && (
                                        <div className="space-y-4">
                                            {s.variants.map((variant, varIdx) => (
                                                <div key={variant.id} className="border border-slate-200 rounded-lg p-4 bg-slate-50">
                                                    <div className="flex items-center justify-between mb-3">
                                                        <div className="flex items-center gap-3">
                                                            <span className={cn(
                                                                "w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold",
                                                                varIdx === 0 ? "bg-blue-100 text-blue-700" :
                                                                    varIdx === 1 ? "bg-green-100 text-green-700" :
                                                                        varIdx === 2 ? "bg-orange-100 text-orange-700" :
                                                                            "bg-purple-100 text-purple-700"
                                                            )}>
                                                                {variant.name}
                                                            </span>
                                                            <span className="text-sm font-medium text-slate-700">Variant {variant.name}</span>
                                                        </div>
                                                        <div className="flex items-center gap-3">
                                                            <div className="flex items-center gap-2">
                                                                <input
                                                                    type="number"
                                                                    min="1"
                                                                    max="100"
                                                                    value={variant.weight}
                                                                    onChange={(e) => updateVariant(idx, varIdx, 'weight', parseInt(e.target.value) || 0)}
                                                                    className="w-16 px-2 py-1 text-sm border border-slate-200 rounded text-center"
                                                                />
                                                                <span className="text-xs text-slate-500">%</span>
                                                            </div>
                                                            {s.variants.length > 2 && (
                                                                <button
                                                                    onClick={() => removeVariant(idx, varIdx)}
                                                                    className="p-1 text-slate-400 hover:text-red-500"
                                                                >
                                                                    <Trash2 className="w-4 h-4" />
                                                                </button>
                                                            )}
                                                        </div>
                                                    </div>
                                                    {idx === 0 && (
                                                        <input
                                                            value={variant.subject || ''}
                                                            onChange={e => updateVariant(idx, varIdx, 'subject', e.target.value)}
                                                            placeholder="Subject Line..."
                                                            className="w-full font-medium border-b border-slate-200 focus:border-blue-500 outline-none pb-2 mb-3 bg-transparent"
                                                        />
                                                    )}
                                                    <RichTextEditor
                                                        content={variant.body}
                                                        onChange={(html) => updateVariant(idx, varIdx, 'body', html)}
                                                        placeholder="Write variant content..."
                                                        minHeight="100px"
                                                    />
                                                </div>
                                            ))}
                                            {s.variants.length < 4 && (
                                                <button
                                                    onClick={() => addVariant(idx)}
                                                    className="w-full py-2 border-2 border-dashed border-slate-200 rounded-lg text-slate-400 text-sm font-medium hover:border-purple-300 hover:text-purple-500 hover:bg-purple-50 transition-all flex items-center justify-center gap-2"
                                                >
                                                    <Plus className="w-4 h-4" />
                                                    Add Variant {String.fromCharCode(65 + s.variants.length)}
                                                </button>
                                            )}
                                        </div>
                                    )}

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
                                        <button className="hover:text-red-500 ml-auto" onClick={() => setSteps(steps.filter((_: Step, i: number) => i !== idx))}>
                                            Remove Step
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))}
                        <button
                            onClick={() => setSteps([...steps, { order: steps.length + 1, subject: '', body: '<p>Checking in...</p>', waitDays: 2, enableABTest: false, variants: [] }])}
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

