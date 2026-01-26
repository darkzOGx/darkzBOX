'use client';

import { useState, useEffect } from 'react';
import { Plus, Server, CheckCircle2, AlertCircle, Loader2 } from "lucide-react";
import { addEmailAccount } from "@/actions";
import { useRouter } from "next/navigation";

import { signIn } from "next-auth/react";

const PROVIDERS = {
    GMAIL: {
        name: "Google Workspace / Gmail",
        smtp: { host: "smtp.gmail.com", port: 587 },
        imap: { host: "imap.gmail.com", port: 993 }
    },
    OUTLOOK: {
        name: "Outlook / Office 365",
        smtp: { host: "smtp.office365.com", port: 587 },
        imap: { host: "outlook.office365.com", port: 993 }
    },
    YAHOO: {
        name: "Yahoo Mail",
        smtp: { host: "smtp.mail.yahoo.com", port: 587 },
        imap: { host: "imap.mail.yahoo.com", port: 993 }
    },
    ZOHO: {
        name: "Zoho Mail",
        smtp: { host: "smtp.zoho.com", port: 587 },
        imap: { host: "imap.zoho.com", port: 993 }
    },
    ICLOUD: {
        name: "iCloud Mail",
        smtp: { host: "smtp.mail.me.com", port: 587 },
        imap: { host: "imap.mail.me.com", port: 993 }
    }
};

export function EmailAccountForm() {
    const router = useRouter();
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [email, setEmail] = useState("");
    const [providerKey, setProviderKey] = useState<string>("SMTP");

    // Derived state for provider settings, only if a preset is selected
    const preset = PROVIDERS[providerKey as keyof typeof PROVIDERS];

    const detectProvider = (emailStr: string) => {
        const lower = emailStr.toLowerCase();
        if (lower.includes("@gmail.com") || lower.includes("@googlemail.com")) return "GMAIL";
        if (lower.includes("@outlook.com") || lower.includes("@hotmail.com") || lower.includes("@live.com")) return "OUTLOOK";
        if (lower.includes("@yahoo.com")) return "YAHOO";
        if (lower.includes("@zoho.com")) return "ZOHO";
        if (lower.includes("@icloud.com") || lower.includes("@me.com")) return "ICLOUD";
        return "SMTP"; // Default to manual
    };

    const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const val = e.target.value;
        setEmail(val);
        const detected = detectProvider(val);
        if (detected !== "SMTP" && providerKey === "SMTP") {
            setProviderKey(detected);
        }
    };

    const handleGoogleLogin = async () => {
        // We trigger the Google Sign-In flow
        // In a real app with keys, this redirects to Google
        // For this demo without keys, it will likely fail or show an error from NextAuth
        await signIn("google", { callbackUrl: "/settings" });
    };

    const handleSubmit = async (formData: FormData) => {
        setIsSubmitting(true);
        try {
            await addEmailAccount(formData);
            router.refresh();
            // Reset form (rough way, better to controle inputs fully but fine for MVP)
            const form = document.getElementById("add-account-form") as HTMLFormElement;
            form.reset();
            setEmail("");
            setProviderKey("SMTP");
            alert("Account connected successfully!");
        } catch (error) {
            alert("Failed to connect account. Please checks details.");
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm mt-8">
            <h3 className="font-semibold text-slate-900 mb-6 flex items-center gap-2">
                <Plus className="w-4 h-4" />
                Connect New Account
            </h3>

            {/* Google Login Helper */}
            <div className="mb-8 p-4 bg-blue-50 border border-blue-100 rounded-lg flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                <div>
                    <h4 className="font-semibold text-blue-900 text-sm">One-Click Connect</h4>
                    <p className="text-blue-700 text-xs mt-1">
                        Connect your Google Workspace account securely via OAuth.
                    </p>
                </div>
                <button
                    type="button"
                    onClick={handleGoogleLogin}
                    className="bg-white text-slate-700 border border-slate-200 hover:bg-slate-50 px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 shadow-sm transition-colors cursor-pointer"
                >
                    <img src="https://www.svgrepo.com/show/475656/google-color.svg" className="w-4 h-4" alt="Google" />
                    Sign in with Google
                </button>
            </div>


            <form id="add-account-form" action={handleSubmit} className="grid grid-cols-2 gap-6">
                <div className="col-span-2 md:col-span-1">
                    <label className="block text-sm font-medium text-slate-700 mb-1.5">Display Name</label>
                    <input name="name" placeholder="e.g. John Doe" className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500" required />
                </div>
                <div className="col-span-2 md:col-span-1">
                    <label className="block text-sm font-medium text-slate-700 mb-1.5">Email Address</label>
                    <input
                        name="email"
                        type="email"
                        placeholder="john@company.com"
                        className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                        onChange={handleEmailChange}
                        required
                    />
                </div>

                <div className="col-span-2 md:col-span-1">
                    <label className="block text-sm font-medium text-slate-700 mb-1.5">Provider</label>
                    <select
                        name="provider"
                        value={providerKey}
                        onChange={(e) => setProviderKey(e.target.value)}
                        className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                    >
                        <option value="SMTP">Manual Configuration (SMTP/IMAP)</option>
                        {Object.entries(PROVIDERS).map(([key, p]) => (
                            <option key={key} value={key}>{p.name}</option>
                        ))}
                    </select>
                </div>

                {/* SMTP Fields */}
                <div className="col-span-2 grid grid-cols-2 gap-6 border-t border-slate-100 pt-6">
                    <h4 className="col-span-2 text-sm font-semibold text-slate-900 flex items-center gap-2">
                        <Server className="w-4 h-4 text-slate-400" />
                        SMTP Configuration (Sending)
                    </h4>
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1.5">SMTP Host</label>
                        <input
                            name="smtpHost"
                            placeholder="smtp.example.com"
                            defaultValue={preset?.smtp.host}
                            key={`smtp-host-${providerKey}`} // Force re-render on change
                            className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 bg-slate-50"
                            required
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1.5">SMTP Port</label>
                        <input
                            name="smtpPort"
                            placeholder="587"
                            defaultValue={preset?.smtp.port}
                            key={`smtp-port-${providerKey}`}
                            className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 bg-slate-50"
                            required
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1.5">SMTP User</label>
                        <input name="smtpUser" placeholder="user@example.com" defaultValue={email} key={`smtp-user-${email}`} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500" required />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1.5">SMTP Password (App Password)</label>
                        <input name="smtpPass" type="password" placeholder="•••••••" className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500" required />
                    </div>
                </div>

                {/* IMAP Fields */}
                <div className="col-span-2 grid grid-cols-2 gap-6 border-t border-slate-100 pt-6">
                    <h4 className="col-span-2 text-sm font-semibold text-slate-900 flex items-center gap-2">
                        <Server className="w-4 h-4 text-slate-400" />
                        IMAP Configuration (Receiving)
                    </h4>
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1.5">IMAP Host</label>
                        <input
                            name="imapHost"
                            placeholder="imap.example.com"
                            defaultValue={preset?.imap.host}
                            key={`imap-host-${providerKey}`}
                            className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 bg-slate-50"
                            required
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1.5">IMAP Port</label>
                        <input
                            name="imapPort"
                            placeholder="993"
                            defaultValue={preset?.imap.port}
                            key={`imap-port-${providerKey}`}
                            className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 bg-slate-50"
                            required
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1.5">IMAP User</label>
                        <input name="imapUser" placeholder="user@example.com" defaultValue={email} key={`imap-user-${email}`} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500" required />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1.5">IMAP Password (App Password)</label>
                        <input name="imapPass" type="password" placeholder="•••••••" className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500" required />
                        <p className="text-xs text-slate-500 mt-1">Usually the same as SMTP Password</p>
                    </div>
                </div>

                <div className="col-span-2 pt-4 flex justify-end">
                    <button
                        type="submit"
                        disabled={isSubmitting}
                        className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg font-medium shadow-sm transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                    >
                        {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
                        Connect Account
                    </button>
                </div>
            </form>
        </div>
    );
}
