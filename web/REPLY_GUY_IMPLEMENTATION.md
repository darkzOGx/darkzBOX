# Reply Guy - AI Auto-Responder Implementation Guide

A complete, plug-and-play implementation for an AI-powered email auto-responder using Anthropic's Claude API.

## Table of Contents
1. [Overview](#overview)
2. [Dependencies](#dependencies)
3. [Database Schema (Prisma)](#database-schema-prisma)
4. [Core Logic](#core-logic)
5. [Job Queue (BullMQ/Redis)](#job-queue-bullmqredis)
6. [UI Components](#ui-components)
7. [Supporting Utilities](#supporting-utilities)
8. [Integration Points](#integration-points)
9. [Setup Instructions](#setup-instructions)

---

## Overview

**Reply Guy** is an AI-powered auto-responder that:
- Automatically generates replies to incoming emails using Claude AI (Haiku model)
- Respects campaign sending windows (schedules)
- Maintains email threading for proper conversation chains
- Has a 5-minute cooldown to prevent duplicate replies
- Queues delayed replies if outside sending window
- Configurable per-workspace with custom business context and instructions

### Workflow
1. **Email Arrives** → IMAP listener syncs inbox
2. **Lead Match** → Identifies if from known campaign lead
3. **Reply Guy Trigger** → Calls `processIncomingEmailReply()` with message details
4. **Config Check** → Validates Reply Guy enabled + API key present
5. **Cooldown Check** → Prevents duplicate replies within 5 minutes
6. **AI Generation** → Claude Haiku generates response
7. **Window Check** → Validates sending time against campaign schedule
8. **Immediate/Delayed Send** → Sends or queues based on window

---

## Dependencies

### NPM Packages Required

```json
{
  "dependencies": {
    "@anthropic-ai/sdk": "^0.24.0",
    "@prisma/client": "^5.x",
    "@tiptap/extension-color": "^2.x",
    "@tiptap/extension-link": "^2.x",
    "@tiptap/extension-placeholder": "^2.x",
    "@tiptap/extension-text-align": "^2.x",
    "@tiptap/extension-text-style": "^2.x",
    "@tiptap/extension-underline": "^2.x",
    "@tiptap/react": "^2.x",
    "@tiptap/starter-kit": "^2.x",
    "bullmq": "^5.x",
    "clsx": "^2.x",
    "imap-simple": "^5.x",
    "lucide-react": "^0.x",
    "luxon": "^3.x",
    "mailparser": "^3.x",
    "nodemailer": "^6.x",
    "tailwind-merge": "^2.x"
  },
  "devDependencies": {
    "@types/imap-simple": "^4.x",
    "@types/luxon": "^3.x",
    "@types/nodemailer": "^6.x",
    "prisma": "^5.x"
  }
}
```

### External Services Required
- **Redis** (localhost:6379 by default) - for BullMQ job queue
- **PostgreSQL** - for Prisma database
- **Anthropic API Key** - for Claude AI

---

## Database Schema (Prisma)

Add these models to your `prisma/schema.prisma`:

```prisma
// Add this relation to your Workspace model
model Workspace {
  id        String   @id @default(cuid())
  name      String
  // ... other fields

  replyGuyConfig ReplyGuyConfig?  // ADD THIS LINE
}

// Reply Guy Configuration - stores per-workspace settings
model ReplyGuyConfig {
  id              String    @id @default(cuid())
  workspaceId     String    @unique
  enabled         Boolean   @default(false)
  anthropicApiKey String?
  customPrompt    String?   // "You are a helpful assistant..."
  businessContext String?   // "We sell widgets..."

  updatedAt       DateTime  @updatedAt

  workspace       Workspace @relation(fields: [workspaceId], references: [id])
}

// Ensure your EmailLog model has these fields
model EmailLog {
  id             String   @id @default(cuid())
  leadId         String?
  emailAccountId String
  campaignId     String?

  type           String   // SENT, OPENED, REPLIED, AI_REPLY  <-- Add AI_REPLY type
  messageId      String?  // Message-ID header for threading
  threadId       String?

  subject        String?
  bodySnippet    String?

  sentAt         DateTime @default(now())

  // ... relations
}

// Your Lead model should have campaign relation
model Lead {
  id          String   @id @default(cuid())
  campaignId  String
  email       String
  firstName   String?
  lastName    String?
  status      String   @default("PENDING") // PENDING, CONTACTED, REPLIED, BOUNCED

  campaign    Campaign @relation(fields: [campaignId], references: [id])
  logs        EmailLog[]
  assignedAccount EmailAccount? @relation(...)

  // ... other fields
}

// Campaign with schedule JSON
model Campaign {
  id          String    @id @default(cuid())
  workspaceId String
  name        String
  status      String    @default("DRAFT")

  // Schedule format: { "days": [1,2,3,4,5], "start": "09:00", "end": "17:00", "timezone": "America/New_York" }
  schedule    Json?

  leads       Lead[]
  // ... other fields
}
```

After adding, run:
```bash
npx prisma migrate dev --name add-reply-guy
npx prisma generate
```

---

## Core Logic

### `src/lib/reply-guy.ts`

```typescript
import Anthropic from '@anthropic-ai/sdk';
import { prisma } from './prisma';
import { sendReply } from '@/actions';
import { isInSendingWindow } from './sending-window';

const getAnthropicClient = (apiKey: string) => new Anthropic({ apiKey });

interface IncomingEmailContext {
    leadId: string;
    workspaceId: string;
    emailBody: string;
    emailSubject: string;
    senderName: string;
    inReplyToMessageId?: string; // For threading replies
}

export async function processIncomingEmailReply(context: IncomingEmailContext) {
    console.log(`[ReplyGuy] Processing incoming reply from Lead ${context.leadId}`);

    // 1. Check if Reply Guy is enabled for this workspace
    const config = await prisma.replyGuyConfig.findUnique({
        where: { workspaceId: context.workspaceId }
    });

    if (!config || !config.enabled) {
        console.log('[ReplyGuy] Disabled or not configured for this workspace.');
        return;
    }

    if (!config.anthropicApiKey) {
        console.error('[ReplyGuy] Enabled but no API Key found.');
        return;
    }

    // Duplicate Prevention: Check if we already sent an AI reply to this lead recently (5 minute cooldown)
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
    const recentAiReply = await prisma.emailLog.findFirst({
        where: {
            leadId: context.leadId,
            type: 'AI_REPLY',
            sentAt: { gte: fiveMinutesAgo }
        }
    });

    if (recentAiReply) {
        console.log(`[ReplyGuy] Already sent AI reply to Lead ${context.leadId} within the last 5 minutes. Skipping.`);
        return;
    }

    // 2. Generate AI Response
    try {
        const aiResponse = await generateAIResponse(config, context);

        // 3. Check Sending Window
        const lead = await prisma.lead.findUnique({
            where: { id: context.leadId },
            include: { campaign: true }
        });

        // Threading info for the reply
        const threadingInfo = {
            inReplyTo: context.inReplyToMessageId,
            subject: context.emailSubject ? `Re: ${context.emailSubject.replace(/^Re:\s*/i, '')}` : undefined
        };

        if (!lead || !lead.campaign || !lead.campaign.schedule) {
            console.log('[ReplyGuy] No campaign/schedule found for lead. Sending immediately.');
            await sendReply(context.leadId, aiResponse, threadingInfo);
        } else {
            const schedule = lead.campaign.schedule as any;
            const isWindowOpen = isInSendingWindow(schedule);

            if (isWindowOpen) {
                await sendReply(context.leadId, aiResponse, threadingInfo);

                // Update log type to AI_REPLY
                const lastLog = await prisma.emailLog.findFirst({
                    where: { leadId: context.leadId, type: 'SENT' },
                    orderBy: { sentAt: 'desc' }
                });
                if (lastLog) {
                    await prisma.emailLog.update({
                        where: { id: lastLog.id },
                        data: { type: 'AI_REPLY' }
                    });
                }

            } else {
                // Out of sending window - schedule for next valid window
                console.log('[ReplyGuy] Out of sending window. Scheduling for 5 minute delay...');

                const { replyGuyQueue } = await import('../worker/reply-guy-queue');
                await replyGuyQueue.add('delayed-ai-reply', {
                    leadId: context.leadId,
                    aiResponse,
                    workspaceId: context.workspaceId,
                    threadingInfo
                }, {
                    delay: 5 * 60 * 1000, // 5 minute delay
                    removeOnComplete: true
                });

                console.log(`[ReplyGuy] Scheduled AI reply for Lead ${context.leadId} in 5 minutes.`);
            }
        }

    } catch (error) {
        console.error('[ReplyGuy] Error generating/sending response:', error);
    }
}

async function generateAIResponse(config: any, context: IncomingEmailContext): Promise<string> {
    const anthropic = getAnthropicClient(config.anthropicApiKey);

    const systemPrompt = `You are an AI assistant replying to email leads.
Business Context: ${config.businessContext || 'No context provided.'}
Custom Instructions: ${config.customPrompt || 'Be professional and concise.'}
Reply directly to the email content provided. Do not include subject lines or placeholders unless necessary.`;

    const userMessage = `Incoming Email from ${context.senderName}:
Subject: ${context.emailSubject}
Body:
${context.emailBody}

Generate a simplified plain text reply.`;

    const response = await anthropic.messages.create({
        model: 'claude-3-haiku-20240307',
        max_tokens: 300,
        system: systemPrompt,
        messages: [{ role: 'user', content: userMessage }],
    });

    // Extract text
    const content = response.content[0];
    if (content.type === 'text') {
        return content.text;
    }
    return "";
}
```

---

## Job Queue (BullMQ/Redis)

### `src/worker/reply-guy-queue.ts`

```typescript
import { Worker, Job, Queue } from 'bullmq';
import { prisma } from '../lib/prisma';
import { sendReply } from '@/actions';

const QUEUE_NAME = 'reply-guy-queue';
const connection = { host: 'localhost', port: 6379 };

// Export queue for scheduling from reply-guy.ts
export const replyGuyQueue = new Queue(QUEUE_NAME, { connection });

// Worker to process scheduled AI replies
export const replyGuyWorker = new Worker(QUEUE_NAME, async (job: Job) => {
    const { leadId, aiResponse, workspaceId, threadingInfo } = job.data;

    console.log(`[ReplyGuyWorker] Processing delayed reply for Lead: ${leadId}`);

    try {
        // Double-check cooldown hasn't been triggered by another path
        const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
        const recentAiReply = await prisma.emailLog.findFirst({
            where: {
                leadId,
                type: 'AI_REPLY',
                sentAt: { gte: fiveMinutesAgo }
            }
        });

        if (recentAiReply) {
            console.log(`[ReplyGuyWorker] Already sent AI reply to Lead ${leadId} recently. Skipping.`);
            return;
        }

        // Send the reply with threading info
        await sendReply(leadId, aiResponse, threadingInfo);

        // Update the log type to AI_REPLY
        const lastLog = await prisma.emailLog.findFirst({
            where: { leadId, type: 'SENT' },
            orderBy: { sentAt: 'desc' }
        });

        if (lastLog) {
            await prisma.emailLog.update({
                where: { id: lastLog.id },
                data: { type: 'AI_REPLY' }
            });
        }

        console.log(`[ReplyGuyWorker] Successfully sent delayed AI reply to Lead: ${leadId}`);

    } catch (error) {
        console.error(`[ReplyGuyWorker] Error sending reply to Lead ${leadId}:`, error);
        throw error; // Let BullMQ handle retries
    }
}, { connection });

console.log('[ReplyGuyWorker] Worker initialized');
```

---

## UI Components

### `src/app/reply-guy/page.tsx` (Server Component)

```tsx
import { PrismaClient } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { Bot } from "lucide-react";
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
                <div className="h-12 w-12 bg-purple-100 text-purple-600 rounded-xl flex items-center justify-center">
                    <Bot className="w-6 h-6" />
                </div>
                <div>
                    <h1 className="text-2xl font-bold text-slate-900">Reply Guy Configuration</h1>
                    <p className="text-slate-500">Automate your email responses with Claude AI</p>
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
```

### `src/app/reply-guy/ReplyGuyForm.tsx` (Client Component)

```tsx
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
        <form onSubmit={handleSubmit} className="p-8 space-y-8">
            <input type="hidden" name="workspaceId" value={workspaceId} />

            {/* Enable Toggle */}
            <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg border border-slate-200">
                <div>
                    <h3 className="font-semibold text-slate-900">Enable Auto-Responder</h3>
                    <p className="text-sm text-slate-500">Automatically reply to new leads using AI</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                    <input type="checkbox" name="enabled" className="sr-only peer" defaultChecked={initialConfig?.enabled} />
                    <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-purple-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-600"></div>
                </label>
            </div>

            {/* API Key */}
            <div className="space-y-3">
                <label className="block text-sm font-medium text-slate-700">Anthropic API Key</label>
                <div className="relative">
                    <input
                        type="password"
                        name="anthropicApiKey"
                        defaultValue={initialConfig?.anthropicApiKey || ''}
                        placeholder="sk-ant-..."
                        className="w-full pl-4 pr-4 py-3 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 font-mono text-sm"
                    />
                </div>
                {!initialConfig?.anthropicApiKey && (
                    <p className="text-xs text-amber-600 flex items-center gap-1.5">
                        <AlertTriangle className="w-3 h-3" />
                        API Key is required for Reply Guy to work.
                    </p>
                )}
            </div>

            {/* Business Context */}
            <div className="space-y-3">
                <label className="block text-sm font-medium text-slate-700">Business Context</label>
                <p className="text-xs text-slate-500">Describe your company, product, and value proposition. The AI uses this to generate relevant replies.</p>
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
                <label className="block text-sm font-medium text-slate-700">Custom System Instructions</label>
                <p className="text-xs text-slate-500">Specific instructions for tone, style, or constraints.</p>
                <RichTextEditor
                    content={customPrompt}
                    onChange={setCustomPrompt}
                    placeholder="You are a helpful and professional assistant."
                    minHeight="100px"
                    showVariables={false}
                />
            </div>

            <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-4">
                {status === 'success' && (
                    <span className="text-green-600 text-sm font-medium flex items-center gap-2 animate-in fade-in slide-in-from-bottom-2">
                        <CheckCircle2 className="w-4 h-4" />
                        Saved Successfully
                    </span>
                )}
                <button
                    type="submit"
                    disabled={isSaving}
                    className="bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white px-6 py-2.5 rounded-lg font-medium shadow-sm flex items-center gap-2 transition-colors"
                >
                    <Save className="w-4 h-4" />
                    {isSaving ? 'Saving...' : 'Save Configuration'}
                </button>
            </div>
        </form>
    );
}
```

### `src/components/RichTextEditor.tsx` (Reusable Rich Text Editor)

```tsx
'use client';

import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Link from '@tiptap/extension-link';
import Placeholder from '@tiptap/extension-placeholder';
import TextAlign from '@tiptap/extension-text-align';
import Underline from '@tiptap/extension-underline';
import { TextStyle } from '@tiptap/extension-text-style';
import { Color } from '@tiptap/extension-color';
import { useState, useCallback, useEffect } from 'react';
import {
    Bold, Italic, Underline as UnderlineIcon, Strikethrough,
    Link as LinkIcon, List, ListOrdered, AlignLeft, AlignCenter,
    AlignRight, Undo, Redo, Code, Variable, Indent, Outdent
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface RichTextEditorProps {
    content: string;
    onChange: (html: string) => void;
    placeholder?: string;
    className?: string;
    minHeight?: string;
    showVariables?: boolean;
    variables?: { label: string; value: string }[];
}

const DEFAULT_VARIABLES = [
    { label: 'First Name', value: '{firstName}' },
    { label: 'Last Name', value: '{lastName}' },
    { label: 'Company Name', value: '{companyName}' },
    { label: 'Email', value: '{email}' },
];

export function RichTextEditor({
    content,
    onChange,
    placeholder = 'Start writing...',
    className,
    minHeight = '150px',
    showVariables = true,
    variables = DEFAULT_VARIABLES
}: RichTextEditorProps) {
    const [showLinkInput, setShowLinkInput] = useState(false);
    const [linkUrl, setLinkUrl] = useState('');
    const [showVariablesDropdown, setShowVariablesDropdown] = useState(false);
    const [isHtmlMode, setIsHtmlMode] = useState(false);
    const [htmlSource, setHtmlSource] = useState(content);

    const editor = useEditor({
        extensions: [
            StarterKit.configure({
                heading: { levels: [1, 2, 3] },
            }),
            Link.configure({
                openOnClick: false,
                HTMLAttributes: { class: 'text-blue-600 underline cursor-pointer' },
            }),
            Placeholder.configure({ placeholder }),
            TextAlign.configure({ types: ['heading', 'paragraph'] }),
            Underline,
            TextStyle,
            Color,
        ],
        content,
        editorProps: {
            attributes: {
                class: 'prose prose-sm max-w-none focus:outline-none',
                style: `min-height: ${minHeight}`,
            },
        },
        onUpdate: ({ editor }) => {
            const html = editor.getHTML();
            setHtmlSource(html);
            onChange(html);
        },
    });

    useEffect(() => {
        if (editor && content !== editor.getHTML()) {
            editor.commands.setContent(content);
            setHtmlSource(content);
        }
    }, [content, editor]);

    const handleModeToggle = useCallback(() => {
        if (isHtmlMode && editor) {
            editor.commands.setContent(htmlSource);
            onChange(htmlSource);
        }
        setIsHtmlMode(!isHtmlMode);
    }, [isHtmlMode, htmlSource, editor, onChange]);

    const handleHtmlSourceChange = useCallback((value: string) => {
        setHtmlSource(value);
        onChange(value);
    }, [onChange]);

    const setLink = useCallback(() => {
        if (!editor) return;
        if (linkUrl === '') {
            editor.chain().focus().extendMarkRange('link').unsetLink().run();
            setShowLinkInput(false);
            return;
        }
        const url = linkUrl.startsWith('http') ? linkUrl : `https://${linkUrl}`;
        editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run();
        setShowLinkInput(false);
        setLinkUrl('');
    }, [editor, linkUrl]);

    const insertVariable = useCallback((variable: string) => {
        if (isHtmlMode) {
            const textarea = document.querySelector('textarea[data-html-source]') as HTMLTextAreaElement;
            if (textarea) {
                const start = textarea.selectionStart;
                const end = textarea.selectionEnd;
                const newValue = htmlSource.substring(0, start) + variable + htmlSource.substring(end);
                setHtmlSource(newValue);
                onChange(newValue);
                setTimeout(() => {
                    textarea.selectionStart = textarea.selectionEnd = start + variable.length;
                    textarea.focus();
                }, 0);
            }
        } else if (editor) {
            editor.chain().focus().insertContent(variable).run();
        }
        setShowVariablesDropdown(false);
    }, [editor, isHtmlMode, htmlSource, onChange]);

    if (!editor) return null;

    const ToolbarButton = ({ onClick, active, disabled, children, title }: {
        onClick: () => void;
        active?: boolean;
        disabled?: boolean;
        children: React.ReactNode;
        title?: string;
    }) => (
        <button
            type="button"
            onClick={onClick}
            disabled={disabled}
            title={title}
            className={cn(
                "p-1.5 rounded hover:bg-slate-100 transition-colors",
                active && "bg-slate-200 text-blue-600",
                disabled && "opacity-40 cursor-not-allowed hover:bg-transparent"
            )}
        >
            {children}
        </button>
    );

    return (
        <div className={cn("border border-slate-200 rounded-lg overflow-hidden", className)}>
            {/* Toolbar */}
            <div className="flex flex-wrap items-center gap-0.5 p-2 border-b border-slate-200 bg-slate-50">
                {/* Text formatting */}
                <div className="flex items-center gap-0.5 pr-2 border-r border-slate-200">
                    <ToolbarButton onClick={() => editor.chain().focus().toggleBold().run()} active={editor.isActive('bold')} disabled={isHtmlMode} title="Bold">
                        <Bold className="w-4 h-4" />
                    </ToolbarButton>
                    <ToolbarButton onClick={() => editor.chain().focus().toggleItalic().run()} active={editor.isActive('italic')} disabled={isHtmlMode} title="Italic">
                        <Italic className="w-4 h-4" />
                    </ToolbarButton>
                    <ToolbarButton onClick={() => editor.chain().focus().toggleUnderline().run()} active={editor.isActive('underline')} disabled={isHtmlMode} title="Underline">
                        <UnderlineIcon className="w-4 h-4" />
                    </ToolbarButton>
                    <ToolbarButton onClick={() => editor.chain().focus().toggleStrike().run()} active={editor.isActive('strike')} disabled={isHtmlMode} title="Strikethrough">
                        <Strikethrough className="w-4 h-4" />
                    </ToolbarButton>
                </div>

                {/* Lists */}
                <div className="flex items-center gap-0.5 px-2 border-r border-slate-200">
                    <ToolbarButton onClick={() => editor.chain().focus().toggleBulletList().run()} active={editor.isActive('bulletList')} disabled={isHtmlMode} title="Bullet List">
                        <List className="w-4 h-4" />
                    </ToolbarButton>
                    <ToolbarButton onClick={() => editor.chain().focus().toggleOrderedList().run()} active={editor.isActive('orderedList')} disabled={isHtmlMode} title="Numbered List">
                        <ListOrdered className="w-4 h-4" />
                    </ToolbarButton>
                </div>

                {/* Alignment */}
                <div className="flex items-center gap-0.5 px-2 border-r border-slate-200">
                    <ToolbarButton onClick={() => editor.chain().focus().setTextAlign('left').run()} active={editor.isActive({ textAlign: 'left' })} disabled={isHtmlMode} title="Align Left">
                        <AlignLeft className="w-4 h-4" />
                    </ToolbarButton>
                    <ToolbarButton onClick={() => editor.chain().focus().setTextAlign('center').run()} active={editor.isActive({ textAlign: 'center' })} disabled={isHtmlMode} title="Align Center">
                        <AlignCenter className="w-4 h-4" />
                    </ToolbarButton>
                    <ToolbarButton onClick={() => editor.chain().focus().setTextAlign('right').run()} active={editor.isActive({ textAlign: 'right' })} disabled={isHtmlMode} title="Align Right">
                        <AlignRight className="w-4 h-4" />
                    </ToolbarButton>
                </div>

                {/* Link */}
                <div className="flex items-center gap-0.5 px-2 border-r border-slate-200 relative">
                    <ToolbarButton
                        onClick={() => {
                            if (editor.isActive('link')) {
                                editor.chain().focus().unsetLink().run();
                            } else {
                                setShowLinkInput(!showLinkInput);
                            }
                        }}
                        active={editor.isActive('link')}
                        disabled={isHtmlMode}
                        title="Add Link"
                    >
                        <LinkIcon className="w-4 h-4" />
                    </ToolbarButton>
                    {showLinkInput && !isHtmlMode && (
                        <div className="absolute top-full left-0 mt-1 z-10 bg-white border border-slate-200 rounded-lg shadow-lg p-2 flex gap-2">
                            <input
                                type="text"
                                placeholder="https://..."
                                value={linkUrl}
                                onChange={(e) => setLinkUrl(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && setLink()}
                                className="px-2 py-1 text-sm border border-slate-200 rounded outline-none focus:border-blue-500 w-48"
                                autoFocus
                            />
                            <button onClick={setLink} className="px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700">
                                Add
                            </button>
                        </div>
                    )}
                </div>

                {/* Variables */}
                {showVariables && variables.length > 0 && (
                    <div className="flex items-center gap-0.5 px-2 border-r border-slate-200 relative">
                        <ToolbarButton onClick={() => setShowVariablesDropdown(!showVariablesDropdown)} title="Insert Variable">
                            <Variable className="w-4 h-4" />
                        </ToolbarButton>
                        {showVariablesDropdown && (
                            <div className="absolute top-full left-0 mt-1 z-10 bg-white border border-slate-200 rounded-lg shadow-lg py-1 min-w-[160px]">
                                {variables.map((opt) => (
                                    <button
                                        key={opt.value}
                                        onClick={() => insertVariable(opt.value)}
                                        className="w-full px-3 py-1.5 text-left text-sm hover:bg-slate-100 flex justify-between items-center"
                                    >
                                        <span>{opt.label}</span>
                                        <code className="text-xs text-slate-400">{opt.value}</code>
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                )}

                {/* HTML Toggle & Undo/Redo */}
                <div className="flex items-center gap-0.5 pl-2 ml-auto">
                    <ToolbarButton onClick={handleModeToggle} active={isHtmlMode} title={isHtmlMode ? "Switch to Visual Editor" : "Switch to HTML Source"}>
                        <Code className="w-4 h-4" />
                    </ToolbarButton>
                    <div className="w-px h-4 bg-slate-200 mx-1" />
                    <ToolbarButton onClick={() => editor.chain().focus().undo().run()} disabled={isHtmlMode} title="Undo">
                        <Undo className="w-4 h-4" />
                    </ToolbarButton>
                    <ToolbarButton onClick={() => editor.chain().focus().redo().run()} disabled={isHtmlMode} title="Redo">
                        <Redo className="w-4 h-4" />
                    </ToolbarButton>
                </div>
            </div>

            {/* Editor Content */}
            {isHtmlMode ? (
                <textarea
                    data-html-source
                    value={htmlSource}
                    onChange={(e) => handleHtmlSourceChange(e.target.value)}
                    placeholder={placeholder}
                    className="w-full p-4 font-mono text-sm bg-slate-900 text-green-400 focus:outline-none resize-none"
                    style={{ minHeight }}
                />
            ) : (
                <EditorContent editor={editor} className="p-4" />
            )}
        </div>
    );
}
```

---

## Supporting Utilities

### `src/lib/prisma.ts` (Prisma Client Singleton)

```typescript
import { PrismaClient } from "@prisma/client";

const globalForPrisma = global as unknown as { prisma: PrismaClient };

export const prisma = globalForPrisma.prisma || new PrismaClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;

export default prisma;
```

### `src/lib/utils.ts` (Tailwind Class Merger)

```typescript
import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs))
}
```

### `src/lib/sending-window.ts` (Schedule Checker)

```typescript
import { DateTime } from 'luxon';

interface ScheduleConfig {
    days: number[]; // 1 = Monday, 7 = Sunday
    start: string;  // "09:00"
    end: string;    // "17:00"
    timezone: string; // "America/New_York"
}

export function isInSendingWindow(schedule: ScheduleConfig): boolean {
    if (!schedule || !schedule.timezone) return true; // Default to always send if no schedule

    const now = DateTime.now().setZone(schedule.timezone);

    // Check Day (Luxon: 1 is Mon, 7 is Sun)
    if (!schedule.days.includes(now.weekday)) {
        return false;
    }

    // Check Time
    const startTime = DateTime.fromFormat(schedule.start, 'HH:mm', { zone: schedule.timezone });
    const endTime = DateTime.fromFormat(schedule.end, 'HH:mm', { zone: schedule.timezone });

    const todayStart = now.set({
        hour: startTime.hour,
        minute: startTime.minute,
        second: 0
    });

    const todayEnd = now.set({
        hour: endTime.hour,
        minute: endTime.minute,
        second: 0
    });

    return now >= todayStart && now <= todayEnd;
}

export function getNextSendingTime(schedule: ScheduleConfig): Date {
    const now = DateTime.now().setZone(schedule.timezone);
    let nextDate = now.plus({ minutes: 15 });
    return nextDate.toJSDate();
}
```

### `src/lib/email-engine.ts` (SMTP Email Sender)

```typescript
import nodemailer from 'nodemailer';
import { EmailAccount } from '@prisma/client';

interface EmailOptions {
    to: string;
    subject: string;
    html: string;
    inReplyTo?: string;
    references?: string;
}

export async function sendEmailViaAccount(account: EmailAccount, email: EmailOptions): Promise<string> {
    let transportConfig: any = {
        host: account.smtpHost,
        port: account.smtpPort,
        secure: account.smtpPort === 465,
    };

    if (account.accessToken && account.refreshToken) {
        // OAuth2 Configuration (Gmail)
        transportConfig.auth = {
            type: 'OAuth2',
            user: account.email,
            clientId: process.env.GOOGLE_CLIENT_ID,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET,
            refreshToken: account.refreshToken,
            accessToken: account.accessToken,
        };
    } else {
        // Password Configuration
        transportConfig.auth = {
            user: account.smtpUser,
            pass: account.smtpPass,
        };
    }

    const transporter = nodemailer.createTransport(transportConfig);

    const mailOptions: any = {
        from: `"${account.name || account.email}" <${account.email}>`,
        to: email.to,
        subject: email.subject,
        html: email.html,
    };

    // Add threading headers if replying
    if (email.inReplyTo) {
        mailOptions.inReplyTo = email.inReplyTo;
        mailOptions.references = email.references || email.inReplyTo;
        console.log(`[SMTP] Replying to thread: ${email.inReplyTo}`);
    }

    const info = await transporter.sendMail(mailOptions);
    console.log(`[SMTP] Sent email from ${account.email} to ${email.to}. MessageID: ${info.messageId}`);
    return info.messageId;
}
```

### `src/lib/tracking.ts` (Email Tracking Injection)

```typescript
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

export function injectTracking(html: string, logId: string): string {
    // 1. Inject Open Pixel
    const pixelUrl = `${APP_URL}/api/track/open?id=${logId}`;
    const pixelHtml = `<img src="${pixelUrl}" alt="" width="1" height="1" style="display:none;" />`;

    let trackedHtml = html;
    if (html.includes('</body>')) {
        trackedHtml = html.replace('</body>', `${pixelHtml}</body>`);
    } else {
        trackedHtml = html + pixelHtml;
    }

    // 2. Wrap Links for Click Tracking
    const linkRegex = /href=["'](http[^"']+)["']/g;
    trackedHtml = trackedHtml.replace(linkRegex, (match, url) => {
        const trackUrl = `${APP_URL}/api/track/click?id=${logId}&url=${encodeURIComponent(url)}`;
        return `href="${trackUrl}"`;
    });

    return trackedHtml;
}
```

### `src/actions.ts` (sendReply Server Action - Extract)

```typescript
'use server'

import { prisma } from '@/lib/prisma';
import { sendEmailViaAccount } from '@/lib/email-engine';

export async function sendReply(leadId: string, body: string, threadingInfo?: { inReplyTo?: string; subject?: string }) {
    const lead = await prisma.lead.findUnique({
        where: { id: leadId },
        include: { assignedAccount: true, logs: { orderBy: { sentAt: 'desc' }, take: 10 } }
    });
    if (!lead) throw new Error("Lead not found");

    // Use assigned account or fallback
    const emailAccount = lead.assignedAccount || await prisma.emailAccount.findFirst();
    if (!emailAccount) throw new Error("No email account available");

    // Find the most recent message to reply to (for threading)
    let inReplyTo = threadingInfo?.inReplyTo;
    let replySubject = threadingInfo?.subject || 'Re: Quick Question';

    if (!inReplyTo && lead.logs.length > 0) {
        const lastMessage = lead.logs.find(log => log.messageId && (log.type === 'REPLIED' || log.type === 'SENT'));
        if (lastMessage) {
            inReplyTo = lastMessage.messageId;
            if (lastMessage.subject) {
                replySubject = lastMessage.subject.startsWith('Re:') ? lastMessage.subject : `Re: ${lastMessage.subject}`;
            }
        }
    }

    // Build references chain
    const references = lead.logs
        .filter(log => log.messageId)
        .map(log => log.messageId)
        .filter(Boolean)
        .join(' ');

    // 1. Create Log Entry First
    const log = await prisma.emailLog.create({
        data: {
            leadId,
            emailAccountId: emailAccount.id,
            type: 'SENT',
            subject: replySubject,
            bodySnippet: body.substring(0, 100),
            sentAt: new Date()
        }
    });

    // 2. Inject Tracking
    const { injectTracking } = await import('@/lib/tracking');
    const trackedBody = injectTracking(body.replace(/\n/g, '<br/>'), log.id);

    // 3. Send Email
    try {
        const messageId = await sendEmailViaAccount(emailAccount, {
            to: lead.email,
            subject: replySubject,
            html: trackedBody,
            inReplyTo: inReplyTo || undefined,
            references: references || undefined
        });

        // 4. Update Log with Message ID
        await prisma.emailLog.update({
            where: { id: log.id },
            data: { messageId }
        });

        console.log(`[sendReply] Sent threaded reply to ${lead.email}, inReplyTo: ${inReplyTo || 'none'}`);
    } catch (error) {
        await prisma.emailLog.delete({ where: { id: log.id } });
        throw error;
    }

    return { success: true };
}
```

---

## Integration Points

### `src/instrumentation.ts` (Next.js Worker Initialization)

```typescript
export async function register() {
    if (process.env.NEXT_RUNTIME === 'nodejs') {
        // Import worker files to start them
        await import('./worker/campaign-queue');
        await import('./worker/reply-guy-queue'); // AI Reply scheduling

        // Auto-sync emails every 1 minute
        const { syncUnibox } = await import('./worker/imap-listener');
        setInterval(async () => {
            try {
                await syncUnibox();
            } catch (err) {
                console.error('[AutoSync] Error:', err);
            }
        }, 60 * 1000);

        console.log('[Instrumentation] Background Workers Started (Sync every 60s)');
    }
}
```

### IMAP Listener Integration (`src/worker/imap-listener.ts`)

Add this call in your IMAP listener when processing incoming emails from campaign leads:

```typescript
import { processIncomingEmailReply } from '../lib/reply-guy';

// Inside your email processing loop, after detecting a reply from a campaign lead:
await processIncomingEmailReply({
    leadId: lead.id,
    workspaceId: account.workspaceId,
    emailBody: parsed.text || '',
    emailSubject: subjectHeader || '',
    senderName: fromEmail,
    inReplyToMessageId: uniqueId // Pass the incoming message ID for threading
});
```

### Sidebar Navigation

Add to your sidebar navigation array:

```typescript
import { Bot } from "lucide-react";

const navItems = [
    // ... other items
    { name: "Reply Guy", href: "/reply-guy", icon: Bot },
];
```

---

## Setup Instructions

### 1. Install Dependencies

```bash
npm install @anthropic-ai/sdk @tiptap/react @tiptap/starter-kit @tiptap/extension-link \
  @tiptap/extension-placeholder @tiptap/extension-text-align @tiptap/extension-underline \
  @tiptap/extension-text-style @tiptap/extension-color bullmq luxon nodemailer \
  imap-simple mailparser clsx tailwind-merge

npm install -D @types/luxon @types/nodemailer @types/imap-simple
```

### 2. Set Up Redis

```bash
# Using Docker
docker run -d --name redis -p 6379:6379 redis:alpine

# Or install locally
# macOS: brew install redis && brew services start redis
# Ubuntu: sudo apt install redis-server && sudo systemctl start redis
```

### 3. Add Environment Variables

```env
# .env
DATABASE_URL="postgresql://user:password@localhost:5432/mydb"
NEXT_PUBLIC_APP_URL="http://localhost:3000"

# For Gmail OAuth (optional)
GOOGLE_CLIENT_ID="your-client-id"
GOOGLE_CLIENT_SECRET="your-client-secret"
```

### 4. Run Prisma Migrations

```bash
npx prisma migrate dev --name add-reply-guy
npx prisma generate
```

### 5. Configure in UI

1. Navigate to `/reply-guy` in your app
2. Enter your Anthropic API key
3. Add your business context
4. Customize the system instructions
5. Enable the toggle

### 6. Test the Flow

1. Send an email to a lead in your campaign
2. Have the lead reply
3. Watch the IMAP sync pick up the reply
4. Reply Guy will auto-generate and send a response

---

## Key Configuration Options

| Setting | Description | Default |
|---------|-------------|---------|
| `enabled` | Toggle AI responses on/off | `false` |
| `anthropicApiKey` | Your Anthropic API key | Required |
| `businessContext` | Company/product info for AI context | Empty |
| `customPrompt` | Custom system instructions | "Be professional and concise." |
| Cooldown | Minimum time between AI replies | 5 minutes |
| Model | Claude model used | `claude-3-haiku-20240307` |
| Max Tokens | Response length limit | 300 |

---

## Troubleshooting

### Common Issues

1. **"No API Key found"** - Ensure you've saved a valid Anthropic API key in the config
2. **Replies not sending** - Check Redis is running (`redis-cli ping`)
3. **Duplicate replies** - The 5-minute cooldown should prevent this; check `AI_REPLY` logs
4. **Threading broken** - Ensure `messageId` is being saved in EmailLog entries

### Logs to Check

```bash
# Look for these log prefixes:
[ReplyGuy] ...           # Main processing
[ReplyGuyWorker] ...     # Delayed queue processing
[SMTP] ...               # Email sending
```

---

## License

This implementation is provided as-is. Adapt as needed for your use case.
