'use server'

import { prisma } from '@/lib/prisma';
import { Queue } from 'bullmq';
import { syncUnibox as syncImap } from './worker/imap-listener';

const emailQueue = new Queue('campaign-email-queue', {
    connection: {
        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT || '6379')
    }
});

export async function addLead(data: { email: string, firstName?: string, lastName?: string, companyName?: string, campaignId?: string }) {
    let targetCampaignId = data.campaignId;
    if (!targetCampaignId) {
        const campaign = await prisma.campaign.findFirst({ select: { id: true } });
        targetCampaignId = campaign?.id;

        if (!targetCampaignId) {
            const newCamp = await prisma.campaign.create({
                data: {
                    name: "General Leads",
                    workspaceId: (await prisma.workspace.findFirst())?.id!,
                    status: 'DRAFT'
                }
            });
            targetCampaignId = newCamp.id;
        }
    }

    const lead = await prisma.lead.create({
        data: {
            email: data.email,
            firstName: data.firstName,
            lastName: data.lastName,
            companyName: data.companyName,
            campaignId: targetCampaignId
        }
    });

    // Trigger email sending immediately (for demo purposes, usually we'd wait for campaign Start)
    // Only if campaign has steps. Using a simplified approach here.
    await emailQueue.add('send-email', {
        leadId: lead.id,
        campaignId: targetCampaignId,
        stepOrder: 1
    });

    return { success: true };
}

export async function deleteLead(id: string) {
    await prisma.lead.delete({ where: { id } });
    return { success: true };
}

export async function updateLeadStatus(id: string, status: string) {
    await prisma.lead.update({
        where: { id },
        data: { status }
    });
    return { success: true };
}

export async function getLeads() {
    const leads = await prisma.lead.findMany({
        orderBy: { id: 'desc' },
        include: {
            campaign: {
                select: { id: true, name: true }
            }
        },
        take: 100 // Limit for now
    });
    return leads;
}

export async function getDashboardStats() {
    const [
        totalSent,
        campaigns,
        leads,
        logs,
        recentLogs
    ] = await Promise.all([
        prisma.emailLog.count({ where: { type: 'SENT' } }),
        prisma.campaign.count(),
        prisma.lead.count(),
        prisma.emailLog.findMany({
            take: 1000,
            orderBy: { sentAt: 'desc' },
            select: { id: true, leadId: true, campaignId: true, type: true, sentAt: true, subject: true, bodySnippet: true, lead: true, campaign: true }
        }),
        prisma.emailLog.findMany({
            where: {
                type: { in: ['SENT', 'OPENED', 'REPLIED'] },
                sentAt: {
                    gte: new Date(new Date().setDate(new Date().getDate() - 30))
                }
            },
            select: { sentAt: true, type: true }
        })
    ])

    // Calculate Open Rate
    const totalOpened = logs.filter(l => l.type === 'OPENED').length
    const openRate = totalSent > 0 ? ((totalOpened / totalSent) * 100).toFixed(1) : '0.0'

    // Calculate Reply Rate
    const totalReplied = logs.filter(l => l.type === 'REPLIED').length
    const replyRate = totalSent > 0 ? ((totalReplied / totalSent) * 100).toFixed(1) : '0.0'

    // Calculate Past Period Stats (Last 30 days vs previous 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const sixtyDaysAgo = new Date();
    sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60);

    const pastPeriodLogs = await prisma.emailLog.findMany({
        where: {
            sentAt: {
                gte: sixtyDaysAgo,
                lt: thirtyDaysAgo
            }
        },
        select: { type: true, leadId: true }
    });

    const pastSent = pastPeriodLogs.filter(l => l.type === 'SENT').length;
    const pastOpened = pastPeriodLogs.filter(l => l.type === 'OPENED').length;
    const pastReplied = pastPeriodLogs.filter(l => l.type === 'REPLIED').length;

    const pastOpenRate = pastSent > 0 ? (pastOpened / pastSent) * 100 : 0;
    const pastReplyRate = pastSent > 0 ? (pastReplied / pastSent) * 100 : 0;

    const currentOpenRateVal = parseFloat(openRate);
    const currentReplyRateVal = parseFloat(replyRate);

    const sentChange = pastSent > 0 ? ((totalSent - pastSent) / pastSent) * 100 : 0;
    const openRateChange = currentOpenRateVal - pastOpenRate;
    const replyRateChange = currentReplyRateVal - pastReplyRate;

    // Helper to format change
    const formatChange = (val: number, isPercent = false) => {
        const sign = val >= 0 ? '+' : '';
        if (!isPercent) return `${sign}${Math.round(val)}`;
        return `${sign}${val.toFixed(1)}%`;
    };

    // Calculate Daily Stats
    const dailyStatsMap = new Map<string, { sent: number; opened: number; replied: number }>();
    const now = new Date();
    // Initialize last 7 days with 0
    for (let i = 6; i >= 0; i--) {
        const d = new Date(now);
        d.setDate(d.getDate() - i);
        dailyStatsMap.set(d.toISOString().split('T')[0], { sent: 0, opened: 0, replied: 0 });
    }

    recentLogs.forEach(log => {
        const day = log.sentAt.toISOString().split('T')[0];
        if (dailyStatsMap.has(day)) {
            const stats = dailyStatsMap.get(day)!;
            if (log.type === 'SENT') stats.sent++;
            else if (log.type === 'OPENED') stats.opened++;
            else if (log.type === 'REPLIED') stats.replied++;
        }
    });

    const dailyStats = Array.from(dailyStatsMap.entries()).map(([date, stats]) => ({
        date,
        sent: stats.sent,
        opened: stats.opened,
        replied: stats.replied
    }));


    // Activity Feed (Last 10 events)
    // We already fetched logs above, reuse them
    const activityFeed = logs.slice(0, 5);

    // Calculate Opportunities (Leads with replies)
    const opportunities = logs.filter(l => l.type === 'REPLIED').map(l => l.leadId).filter((v, i, a) => a.indexOf(v) === i).length;

    // Calculate Past Opportunities
    const pastOpportunities = pastPeriodLogs.filter(l => l.type === 'REPLIED').map(l => l.leadId).filter((v, i, a) => a.indexOf(v) === i).length;
    const opportunitiesChange = pastOpportunities > 0 ? opportunities - pastOpportunities : opportunities;

    return {
        totalSent,
        openRate,
        replyRate,
        opportunities,
        sentChange: formatChange(sentChange, true),
        openRateChange: formatChange(openRateChange, true),
        replyRateChange: formatChange(replyRateChange, true),
        opportunitiesChange: formatChange(opportunitiesChange, false),
        dailyStats,
        activityFeed: activityFeed.map(log => ({
            id: log.id,
            campaignId: log.campaignId,
            leadId: log.leadId,
            user: log.lead ? `${log.lead.firstName} ${log.lead.lastName || ''}` : 'Unknown',
            action: log.type === 'SENT' ? 'was sent' : log.type === 'OPENED' ? 'opened' : log.type.toLowerCase(),
            target: log.subject || 'Campaign',
            time: log.sentAt.toLocaleTimeString(),
            color: log.type === 'REPLIED' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'
        }))
    }
}

export async function getCampaigns() {
    const campaigns = await prisma.campaign.findMany({
        include: {
            _count: {
                select: { leads: true }
            },
            logs: {
                select: { type: true }
            }
        },
        orderBy: { createdAt: 'desc' }
    })

    return campaigns.map(c => {
        const sent = c.logs.filter(l => l.type === 'SENT').length
        const opened = c.logs.filter(l => l.type === 'OPENED').length
        const replied = c.logs.filter(l => l.type === 'REPLIED').length

        return {
            id: c.id,
            name: c.name,
            status: c.status,
            sent,
            leads: c._count.leads,
            openRate: sent > 0 ? `${((opened / sent) * 100).toFixed(1)}%` : '-',
            replyRate: sent > 0 ? `${((replied / sent) * 100).toFixed(1)}%` : '-',
            created: c.createdAt.toLocaleDateString()
        }
    })
}

export async function getUniboxThreads() {
    const logs = await prisma.emailLog.findMany({
        where: {
            type: 'REPLIED',
            leadId: { not: null } // Exclude logs without a lead
        },
        include: {
            lead: { include: { logs: true } },
        },
        orderBy: { sentAt: 'desc' },
        distinct: ['leadId']
    })

    // Filter again to ensure we only process logs with valid lead data
    return logs.filter(log => log.lead && log.leadId).map((log, i) => {
        const leadLogs = log.lead?.logs || [];
        const opens = leadLogs.filter(l => l.type === 'OPENED').length;
        const clicks = leadLogs.filter(l => l.type === 'CLICKED').length;

        // Determine read status
        const lastRead = log.lead?.lastReadAt ? new Date(log.lead.lastReadAt).getTime() : 0;
        const lastMsgTime = new Date(log.sentAt).getTime();
        const isRead = lastRead >= lastMsgTime;

        return {
            id: log.leadId!,
            leadName: log.lead ? `${log.lead.firstName || ''} ${log.lead.lastName || ''}`.trim() || log.lead.email : 'Unknown',
            leadEmail: log.lead?.email || '',
            leadCompany: log.lead?.companyName || 'Unknown Company',
            subject: log.subject || 'No Subject',
            lastMessagePreview: log.bodySnippet || 'New reply...',
            time: log.sentAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            read: isRead,
            status: log.lead?.status === 'REPLIED' ? 'REPLIED' : 'Interested',
            avatarColor: ['bg-blue-500', 'bg-purple-500', 'bg-emerald-500', 'bg-orange-500', 'bg-pink-500'][i % 5],
            stats: { opens, clicks }
        };
    })
}

export async function markLeadAsRead(leadId: string) {
    console.log(`[markLeadAsRead] Called with leadId: "${leadId}"`);
    if (!leadId) {
        console.warn('[markLeadAsRead] Called with null/undefined leadId');
        return { success: false, error: 'No leadId provided' };
    }
    try {
        await prisma.lead.update({
            where: { id: leadId },
            data: { lastReadAt: new Date() }
        });
        console.log(`[markLeadAsRead] SUCCESS for leadId: ${leadId}`);
        return { success: true };
    } catch (error) {
        console.error(`[markLeadAsRead] FAILED for leadId: ${leadId}`, error);
        return { success: false, error: String(error) };
    }
}

export async function markLeadAsUnread(leadId: string) {
    await prisma.lead.update({
        where: { id: leadId },
        data: { lastReadAt: null }
    });
    return { success: true };
}

export async function deleteEmailLog(logId: string) {
    if (!logId) {
        return { success: false, error: 'No logId provided' };
    }
    try {
        await prisma.emailLog.delete({ where: { id: logId } });
        return { success: true };
    } catch (error) {
        console.error('[deleteEmailLog] Error:', error);
        return { success: false, error: String(error) };
    }
}

export async function deleteTemplate(id: string) {
    await prisma.template.delete({ where: { id } });
    return { success: true };
}

export async function getEmailAccounts() {
    return await prisma.emailAccount.findMany({
        orderBy: { email: 'asc' },
        include: {
            _count: { select: { logs: { where: { sentAt: { gte: new Date(new Date().setHours(0, 0, 0, 0)) } } } } }
        }
    })
}

export async function addEmailAccount(data: FormData) {
    const email = data.get('email') as string
    const name = data.get('name') as string
    const provider = data.get('provider') as string
    const smtpHost = data.get('smtpHost') as string
    const smtpPort = parseInt(data.get('smtpPort') as string)
    const smtpUser = data.get('smtpUser') as string
    const smtpPass = data.get('smtpPass') as string
    const imapHost = data.get('imapHost') as string
    const imapPort = parseInt(data.get('imapPort') as string)
    const imapUser = data.get('imapUser') as string
    const imapPass = data.get('imapPass') as string

    // Get first workspace (simplified for single user demo)
    const workspace = await prisma.workspace.findFirst()
    if (!workspace) throw new Error("No workspace found")

    await prisma.emailAccount.create({
        data: {
            workspaceId: workspace.id,
            email,
            name,
            provider,
            smtpHost,
            smtpPort,
            smtpUser,
            smtpPass,
            imapHost,
            imapPort,
            imapUser,
            imapPass,
            dailyLimit: 50,
            sentToday: 0
        }
    })

    return { success: true }
}

export async function deleteEmailAccount(id: string) {
    await prisma.$transaction(async (tx) => {
        // Delete all logs associated with this account
        await tx.emailLog.deleteMany({ where: { emailAccountId: id } });

        // Remove account assignment from any leads
        await tx.lead.updateMany({
            where: { assignedAccountId: id },
            data: { assignedAccountId: null }
        });

        // Delete the account
        await tx.emailAccount.delete({ where: { id } });
    });
    return { success: true }
}

interface VariantInput {
    id?: string;
    name: string;
    subject?: string;
    body: string;
    weight: number;
}

interface StepInput {
    order: number;
    subject?: string;
    body: string;
    waitDays: number;
    enableABTest?: boolean;
    variants?: VariantInput[];
}

export async function createCampaign(data: {
    name: string;
    schedule: any;
    leads: { email: string; firstName?: string; lastName?: string; companyName?: string }[];
    steps: StepInput[];
}) {
    const workspace = await prisma.workspace.findFirst();
    if (!workspace) throw new Error("No workspace found");

    await prisma.$transaction(async (tx) => {
        const campaign = await tx.campaign.create({
            data: {
                workspaceId: workspace.id,
                name: data.name,
                status: 'DRAFT',
                schedule: data.schedule,
            }
        });

        // Create steps with variants
        for (const step of data.steps) {
            const createdStep = await tx.campaignStep.create({
                data: {
                    campaignId: campaign.id,
                    order: step.order,
                    subject: step.subject,
                    body: step.body,
                    waitDays: step.waitDays
                }
            });

            // Create variants if A/B testing is enabled
            if (step.enableABTest && step.variants && step.variants.length > 0) {
                await tx.campaignStepVariant.createMany({
                    data: step.variants.map(variant => ({
                        stepId: createdStep.id,
                        name: variant.name,
                        subject: variant.subject,
                        body: variant.body,
                        weight: variant.weight
                    }))
                });
            }
        }

        if (data.leads.length > 0) {
            await tx.lead.createMany({
                data: data.leads.map(lead => ({
                    campaignId: campaign.id,
                    email: lead.email,
                    firstName: lead.firstName,
                    lastName: lead.lastName,
                    companyName: lead.companyName,
                    status: 'PENDING'
                })),
                skipDuplicates: true
            });
        }
    });

    const createdCampaign = await prisma.campaign.findFirst({
        where: { name: data.name },
        include: { leads: true, steps: { orderBy: { order: 'asc' } } }
    });

    if (createdCampaign && createdCampaign.leads.length > 0 && createdCampaign.steps.length > 0) {
        const firstStep = createdCampaign.steps[0];
        const jobs = createdCampaign.leads.map(lead => ({
            name: `email-job-${lead.id}`,
            data: {
                leadId: lead.id,
                campaignId: createdCampaign.id,
                stepOrder: firstStep.order
            },
            opts: {
                removeOnComplete: true
            }
        }));

        await emailQueue.addBulk(jobs);
    }

    // Trigger IMAP sync to check for any existing replies from newly added leads
    if (createdCampaign && createdCampaign.leads.length > 0) {
        try {
            console.log(`[createCampaign] Triggering IMAP sync for ${createdCampaign.leads.length} new leads...`);
            // Run sync in background (don't await to avoid blocking)
            syncImap().catch(err => console.error('[createCampaign] IMAP sync error:', err));
        } catch (err) {
            console.error('[createCampaign] Failed to trigger IMAP sync:', err);
        }
    }

    return { success: true };
}

export async function updateCampaign(id: string, data: {
    name: string;
    schedule: any;
    steps: StepInput[];
}) {
    await prisma.$transaction(async (tx) => {
        // Update basic info
        await tx.campaign.update({
            where: { id },
            data: {
                name: data.name,
                schedule: data.schedule,
            }
        });

        // Get existing steps to delete their variants first
        const existingSteps = await tx.campaignStep.findMany({
            where: { campaignId: id },
            select: { id: true }
        });

        // Delete variants for existing steps
        if (existingSteps.length > 0) {
            await tx.campaignStepVariant.deleteMany({
                where: { stepId: { in: existingSteps.map(s => s.id) } }
            });
        }

        // Delete existing steps
        await tx.campaignStep.deleteMany({ where: { campaignId: id } });

        // Create new steps with variants
        for (const step of data.steps) {
            const createdStep = await tx.campaignStep.create({
                data: {
                    campaignId: id,
                    order: step.order,
                    subject: step.subject,
                    body: step.body,
                    waitDays: step.waitDays
                }
            });

            // Create variants if A/B testing is enabled
            if (step.enableABTest && step.variants && step.variants.length > 0) {
                await tx.campaignStepVariant.createMany({
                    data: step.variants.map(variant => ({
                        stepId: createdStep.id,
                        name: variant.name,
                        subject: variant.subject,
                        body: variant.body,
                        weight: variant.weight
                    }))
                });
            }
        }
    });

    return { success: true };
}

export async function getCampaign(id: string) {
    const campaign = await prisma.campaign.findUnique({
        where: { id },
        include: {
            steps: {
                orderBy: { order: 'asc' },
                include: {
                    variants: {
                        orderBy: { name: 'asc' }
                    }
                }
            },
            leads: true
        }
    });
    return campaign;
}

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

    // If no explicit inReplyTo, find the last message in the thread
    if (!inReplyTo && lead.logs.length > 0) {
        // Look for the most recent REPLIED message (incoming) or SENT message with a messageId
        const lastMessage = lead.logs.find(log => log.messageId && (log.type === 'REPLIED' || log.type === 'SENT'));
        if (lastMessage) {
            inReplyTo = lastMessage.messageId || undefined;
            // Use the original subject with Re: prefix if not already there
            if (lastMessage.subject) {
                replySubject = lastMessage.subject.startsWith('Re:') ? lastMessage.subject : `Re: ${lastMessage.subject}`;
            }
        }
    }

    // Build references chain from all messages in this thread
    const references = lead.logs
        .filter(log => log.messageId)
        .map(log => log.messageId)
        .filter(Boolean)
        .join(' ');

    // 1. Create Log Entry First (to get ID for tracking)
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

    // 3. Send Email with threading headers
    try {
        const messageId = await sendEmailViaAccount(emailAccount, {
            to: lead.email,
            subject: replySubject,
            html: trackedBody,
            inReplyTo: inReplyTo || undefined,
            references: references || undefined
        });

        // 4. Update Log with correct Message ID
        await prisma.emailLog.update({
            where: { id: log.id },
            data: { messageId }
        });

        console.log(`[sendReply] Sent threaded reply to ${lead.email}, inReplyTo: ${inReplyTo || 'none'}`);
    } catch (error) {
        // Delete failed log
        await prisma.emailLog.delete({ where: { id: log.id } });
        throw error;
    }

    return { success: true };
}

export async function getThreadMessages(leadId: string) {
    const logs = await prisma.emailLog.findMany({
        where: {
            leadId,
            type: { in: ['SENT', 'REPLIED'] }
        },
        orderBy: { sentAt: 'asc' }
    });

    return logs.map(log => ({
        id: log.id,
        content: log.bodySnippet || '',
        sender: log.type === 'SENT' ? 'us' : 'them',
        timestamp: log.sentAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        fullDate: log.sentAt.toISOString()
    }));
}

export async function toggleCampaignStatus(id: string, currentStatus: string) {
    const newStatus = currentStatus === 'ACTIVE' ? 'PAUSED' : 'ACTIVE';

    await prisma.campaign.update({
        where: { id },
        data: { status: newStatus }
    });

    // When resuming a campaign (PAUSED/DRAFT → ACTIVE), queue all pending leads
    if (newStatus === 'ACTIVE') {
        const campaign = await prisma.campaign.findUnique({
            where: { id },
            include: {
                steps: { orderBy: { order: 'asc' } },
                leads: {
                    where: {
                        status: { in: ['PENDING', 'CONTACTED'] } // Include contacted for next steps
                    }
                }
            }
        });

        if (campaign && campaign.steps.length > 0) {
            const jobs: { name: string; data: any; opts: any }[] = [];

            for (const lead of campaign.leads) {
                // Determine which step to send
                let targetStep;

                if (lead.status === 'PENDING' || lead.currentStep === 0) {
                    // Never been contacted, send first step
                    targetStep = campaign.steps[0];
                } else {
                    // Already contacted, check if there's a next step
                    const nextStepOrder = lead.currentStep + 1;
                    targetStep = campaign.steps.find(s => s.order === nextStepOrder);
                }

                if (targetStep) {
                    jobs.push({
                        name: `email-job-${lead.id}`,
                        data: {
                            leadId: lead.id,
                            campaignId: id,
                            stepOrder: targetStep.order
                        },
                        opts: {
                            removeOnComplete: true
                        }
                    });
                }
            }

            if (jobs.length > 0) {
                await emailQueue.addBulk(jobs);
                console.log(`[toggleCampaignStatus] Campaign ${id} resumed: queued ${jobs.length} emails`);
            }
        }
    }

    return { success: true, status: newStatus };
}

export async function deleteCampaign(id: string) {
    await prisma.$transaction(async (tx) => {
        // Delete logs associated with campaign
        await tx.emailLog.deleteMany({ where: { campaignId: id } });

        // Delete steps
        await tx.campaignStep.deleteMany({ where: { campaignId: id } });

        // Delete leads
        await tx.lead.deleteMany({ where: { campaignId: id } });

        // Finally delete campaign
        await tx.campaign.delete({ where: { id } });
    });

    return { success: true };
}

export async function triggerSync() {
    await syncImap();
    return { success: true };
}

// --- Templates ---

export async function saveTemplate(name: string, content: string) {
    const workspace = await prisma.workspace.findFirst();
    if (!workspace) throw new Error("No workspace found");

    const template = await prisma.template.create({
        data: {
            workspaceId: workspace.id,
            name,
            content
        }
    });

    return template;
}

export async function getTemplates() {
    const workspace = await prisma.workspace.findFirst();
    if (!workspace) return [];

    return await prisma.template.findMany({
        where: { workspaceId: workspace.id },
        orderBy: { createdAt: 'desc' }
    });
}
