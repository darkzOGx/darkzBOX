import { Plus, Trash2, CheckCircle2, AlertCircle, Server, Mail, Settings } from "lucide-react";
import { getEmailAccounts, deleteEmailAccount } from "@/actions";

export const dynamic = 'force-dynamic';
import { revalidatePath } from "next/cache";
import { EmailAccountForm } from "@/components/EmailAccountForm";
import { SenderConfigForm } from "@/components/SenderConfigForm";

export default async function SettingsPage() {
    const accounts = await getEmailAccounts();

    async function deleteAccount(formData: FormData) {
        "use server";
        const id = formData.get("id") as string;
        await deleteEmailAccount(id);
        revalidatePath("/settings");
    }

    return (
        <div className="p-8 max-w-5xl mx-auto space-y-8">
            {/* Page Header */}
            <div className="flex items-center gap-3">
                <div className="p-2 bg-white/5 rounded-lg border border-white/10">
                    <Settings className="w-6 h-6 text-blue-400" />
                </div>
                <div>
                    <h1 className="text-2xl font-bold text-white">Settings</h1>
                    <p className="text-white/50 text-sm">Manage your email accounts and sender configuration</p>
                </div>
            </div>

            {/* Sender SMTP Configuration */}
            <SenderConfigForm />

            {/* Email Accounts Section */}
            <div className="pt-4">
                <h2 className="text-lg font-semibold text-white mb-1">Email Accounts</h2>
                <p className="text-white/50 text-sm mb-4">Connect your sending accounts (Gmail, Outlook, SMTP) for campaigns.</p>
            </div>

            {/* Account List */}
            <div className="grid grid-cols-1 gap-4">
                {accounts.map((account) => (
                    <div key={account.id} className="bg-white/5 p-5 rounded-xl border border-white/10 flex items-center justify-between shadow-sm backdrop-blur-sm">
                        <div className="flex items-center gap-4">
                            <div className="h-10 w-10 bg-blue-500/10 text-blue-400 border border-blue-500/20 rounded-lg flex items-center justify-center">
                                <Mail className="w-5 h-5" />
                            </div>
                            <div>
                                <h3 className="font-semibold text-white">{account.name || 'Unnamed'}</h3>
                                <p className="text-sm text-white/50">{account.email}</p>
                            </div>
                        </div>

                        <div className="flex items-center gap-6">
                            <div className="text-right">
                                <p className="text-xs font-semibold uppercase text-white/40 tracking-wider">Provider</p>
                                <p className="text-sm font-medium text-white/80">{account.provider}</p>
                            </div>
                            <div className="text-right">
                                <p className="text-xs font-semibold uppercase text-white/40 tracking-wider">Daily Limit</p>
                                <p className="text-sm font-medium text-white/80">{account.dailyLimit}</p>
                            </div>
                            <div className="px-3 py-1 bg-green-500/10 border border-green-500/20 text-green-400 text-xs font-medium rounded-full flex items-center gap-1.5">
                                <CheckCircle2 className="w-3.5 h-3.5" />
                                Connected
                            </div>

                            <form action={deleteAccount}>
                                <input type="hidden" name="id" value={account.id} />
                                <button className="p-2 text-white/40 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors">
                                    <Trash2 className="w-4 h-4" />
                                </button>
                            </form>
                        </div>
                    </div>
                ))}

                {accounts.length === 0 && (
                    <div className="text-center py-12 bg-white/5 rounded-xl border border-dashed border-white/10">
                        <p className="text-white/40">No email accounts connected yet.</p>
                    </div>
                )}
            </div>

            {/* Client-side Form Component */}
            <EmailAccountForm />
        </div>
    );
}
