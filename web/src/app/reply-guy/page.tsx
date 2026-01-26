import { PrismaClient } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { Bot } from "lucide-react";

export const dynamic = 'force-dynamic';
import { ReplyGuyForm } from "./ReplyGuyForm";

const prisma = new PrismaClient();

async function updateConfig(formData: FormData) {
    "use server";

    const workspaceId = formData.get("workspaceId") as string;
    const enabled = formData.get("enabled") === "on";
    const anthropicApiKey = formData.get("anthropicApiKey") as string;
    const customPrompt = formData.get("customPrompt") as string;
    const businessContext = formData.get("businessContext") as string;

    // Upsert config
    const existing = await prisma.replyGuyConfig.findUnique({
        where: { workspaceId }
    });

    if (existing) {
        await prisma.replyGuyConfig.update({
            where: { id: existing.id },
            data: { enabled, anthropicApiKey, customPrompt, businessContext }
        });
    } else {
        await prisma.replyGuyConfig.create({
            data: { workspaceId, enabled, anthropicApiKey, customPrompt, businessContext }
        });
    }

    revalidatePath("/reply-guy");
}

export default async function ReplyGuyPage() {
    const workspace = await prisma.workspace.findFirst();

    if (!workspace) {
        return <div className="p-8">No workspace found. Please run seed.</div>;
    }

    const config = await prisma.replyGuyConfig.findUnique({
        where: { workspaceId: workspace.id }
    });

    return (
        <div className="p-8 max-w-4xl mx-auto">
            <div className="flex items-center gap-3 mb-8">
                <div className="h-12 w-12 bg-purple-500/10 border border-purple-500/20 text-purple-400 rounded-xl flex items-center justify-center">
                    <Bot className="w-6 h-6" />
                </div>
                <div>
                    <h1 className="text-2xl font-bold text-white">Reply Guy Configuration</h1>
                    <p className="text-sm text-white/50">Automate your email responses with Claude AI</p>
                </div>
            </div>

            <ReplyGuyForm
                initialConfig={config}
                workspaceId={workspace.id}
                onSave={updateConfig}
            />
        </div>
    );
}
