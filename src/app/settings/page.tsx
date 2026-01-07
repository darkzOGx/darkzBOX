import { Plus, Trash2, CheckCircle2, AlertCircle, Server, Mail } from "lucide-react";
import { getEmailAccounts, deleteEmailAccount } from "@/actions";
import { revalidatePath } from "next/cache";
import { EmailAccountForm } from "@/components/EmailAccountForm";

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
            <div>
                <h1 className="text-2xl font-bold text-slate-900">Email Accounts</h1>
                <p className="text-slate-500 text-sm mt-1">Connect your sending accounts (Gmail, Outlook, SMTP).</p>
            </div>

            {/* Account List */}
            <div className="grid grid-cols-1 gap-4">
                {accounts.map((account) => (
                    <div key={account.id} className="bg-white p-5 rounded-xl border border-slate-200 flex items-center justify-between shadow-sm">
                        <div className="flex items-center gap-4">
                            <div className="h-10 w-10 bg-blue-50 text-blue-600 rounded-lg flex items-center justify-center">
                                <Mail className="w-5 h-5" />
                            </div>
                            <div>
                                <h3 className="font-semibold text-slate-900">{account.name || 'Unnamed'}</h3>
                                <p className="text-sm text-slate-500">{account.email}</p>
                            </div>
                        </div>

                        <div className="flex items-center gap-6">
                            <div className="text-right">
                                <p className="text-xs font-semibold uppercase text-slate-400 tracking-wider">Provider</p>
                                <p className="text-sm font-medium text-slate-700">{account.provider}</p>
                            </div>
                            <div className="text-right">
                                <p className="text-xs font-semibold uppercase text-slate-400 tracking-wider">Daily Limit</p>
                                <p className="text-sm font-medium text-slate-700">{account.dailyLimit}</p>
                            </div>
                            <div className="px-3 py-1 bg-green-50 text-green-700 text-xs font-medium rounded-full flex items-center gap-1.5">
                                <CheckCircle2 className="w-3.5 h-3.5" />
                                Connected
                            </div>

                            <form action={deleteAccount}>
                                <input type="hidden" name="id" value={account.id} />
                                <button className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors">
                                    <Trash2 className="w-4 h-4" />
                                </button>
                            </form>
                        </div>
                    </div>
                ))}

                {accounts.length === 0 && (
                    <div className="text-center py-12 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                        <p className="text-slate-500">No email accounts connected yet.</p>
                    </div>
                )}
            </div>

            {/* Client-side Form Component */}
            <EmailAccountForm />
        </div>
    );
}
