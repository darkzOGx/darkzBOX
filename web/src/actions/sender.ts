'use server';

import { prisma } from '@/lib/prisma';

// ============================================
// SMTP CONFIG
// ============================================

export async function getSenderConfig() {
    const workspace = await prisma.workspace.findFirst();
    if (!workspace) return null;

    return prisma.senderConfig.findUnique({
        where: { workspaceId: workspace.id }
    });
}

export async function saveSenderConfig(data: {
    smtpHost: string;
    smtpPort: number;
    smtpUser: string;
    smtpPass: string;
    fromName?: string;
    fromEmail: string;
    useTls: boolean;
    dailyLimit: number;
    delayBetween: number;
}) {
    const workspace = await prisma.workspace.findFirst();
    if (!workspace) throw new Error("No workspace found");

    return prisma.senderConfig.upsert({
        where: { workspaceId: workspace.id },
        update: data,
        create: {
            workspaceId: workspace.id,
            ...data
        }
    });
}

// ============================================
// TEMPLATES
// ============================================

export async function getSenderTemplates() {
    const workspace = await prisma.workspace.findFirst();
    if (!workspace) return [];

    return prisma.senderTemplate.findMany({
        where: { workspaceId: workspace.id },
        orderBy: { createdAt: 'desc' }
    });
}

export async function createSenderTemplate(data: {
    name: string;
    subject: string;
    body: string;
}) {
    const workspace = await prisma.workspace.findFirst();
    if (!workspace) throw new Error("No workspace found");

    return prisma.senderTemplate.create({
        data: {
            workspaceId: workspace.id,
            ...data
        }
    });
}

export async function updateSenderTemplate(id: string, data: {
    name: string;
    subject: string;
    body: string;
}) {
    return prisma.senderTemplate.update({
        where: { id },
        data
    });
}

export async function deleteSenderTemplate(id: string) {
    return prisma.senderTemplate.delete({
        where: { id }
    });
}

// ============================================
// LEAD GROUPS
// ============================================

export async function getSenderLeadGroups() {
    const workspace = await prisma.workspace.findFirst();
    if (!workspace) return [];

    return prisma.senderLeadGroup.findMany({
        where: { workspaceId: workspace.id },
        include: {
            _count: { select: { leads: true } }
        },
        orderBy: { createdAt: 'desc' }
    });
}

export async function createSenderLeadGroup(name: string) {
    const workspace = await prisma.workspace.findFirst();
    if (!workspace) throw new Error("No workspace found");

    return prisma.senderLeadGroup.create({
        data: {
            workspaceId: workspace.id,
            name
        }
    });
}

export async function deleteSenderLeadGroup(id: string) {
    return prisma.senderLeadGroup.delete({
        where: { id }
    });
}

export async function getSenderLeadGroupLeads(groupId: string, page = 1, limit = 50) {
    const skip = (page - 1) * limit;

    const [leads, total] = await Promise.all([
        prisma.senderLead.findMany({
            where: { groupId },
            skip,
            take: limit,
            orderBy: { createdAt: 'desc' }
        }),
        prisma.senderLead.count({ where: { groupId } })
    ]);

    return { leads, total, totalPages: Math.ceil(total / limit) };
}

export async function addLeadsToGroup(groupId: string, leads: {
    email: string;
    firstName?: string;
    lastName?: string;
    company?: string;
}[]) {
    let added = 0;
    let skipped = 0;

    for (const lead of leads) {
        const normalizedEmail = lead.email.toLowerCase().trim();
        if (!normalizedEmail || !normalizedEmail.includes('@')) {
            skipped++;
            continue;
        }

        try {
            await prisma.senderLead.create({
                data: {
                    groupId,
                    email: normalizedEmail,
                    firstName: lead.firstName,
                    lastName: lead.lastName,
                    company: lead.company
                }
            });
            added++;
        } catch (error: any) {
            if (error.code === 'P2002') {
                skipped++;
            } else {
                throw error;
            }
        }
    }

    return { added, skipped };
}

export async function removeSenderLead(id: string) {
    return prisma.senderLead.delete({
        where: { id }
    });
}

// ============================================
// CAMPAIGNS
// ============================================

export async function getSenderCampaigns() {
    const workspace = await prisma.workspace.findFirst();
    if (!workspace) return [];

    return prisma.senderCampaign.findMany({
        where: { workspaceId: workspace.id },
        include: {
            template: { select: { name: true } },
            leadGroup: { select: { name: true } }
        },
        orderBy: { createdAt: 'desc' }
    });
}

export async function createSenderCampaign(data: {
    name: string;
    templateId: string;
    leadGroupId: string;
}) {
    const workspace = await prisma.workspace.findFirst();
    if (!workspace) throw new Error("No workspace found");

    // Get lead count
    const leadCount = await prisma.senderLead.count({
        where: { groupId: data.leadGroupId }
    });

    return prisma.senderCampaign.create({
        data: {
            workspaceId: workspace.id,
            name: data.name,
            templateId: data.templateId,
            leadGroupId: data.leadGroupId,
            totalLeads: leadCount,
            status: 'PENDING'
        }
    });
}

export async function startSenderCampaign(id: string) {
    // Update status to RUNNING
    await prisma.senderCampaign.update({
        where: { id },
        data: {
            status: 'RUNNING',
            startedAt: new Date()
        }
    });

    return { success: true };
}

export async function pauseSenderCampaign(id: string) {
    await prisma.senderCampaign.update({
        where: { id },
        data: { status: 'PAUSED' }
    });

    return { success: true };
}

export async function deleteSenderCampaign(id: string) {
    return prisma.senderCampaign.delete({
        where: { id }
    });
}

export async function getSenderCampaignStatus(id: string) {
    return prisma.senderCampaign.findUnique({
        where: { id },
        include: {
            template: true,
            leadGroup: true,
            logs: {
                orderBy: { sentAt: 'desc' },
                take: 100
            }
        }
    });
}

// Get campaigns that need processing
export async function getRunningCampaigns() {
    return prisma.senderCampaign.findMany({
        where: { status: 'RUNNING' },
        include: {
            template: true,
            leadGroup: {
                include: { leads: true }
            }
        }
    });
}

// Update campaign progress
export async function updateCampaignProgress(id: string, sentCount: number, failedCount: number, status?: string, error?: string) {
    const data: any = { sentCount, failedCount };
    if (status) {
        data.status = status;
        if (status === 'COMPLETED' || status === 'FAILED') {
            data.completedAt = new Date();
        }
    }
    if (error) {
        data.lastError = error;
    }

    return prisma.senderCampaign.update({
        where: { id },
        data
    });
}

// Log sent email
export async function logSenderEmail(campaignId: string, email: string, status: 'SENT' | 'FAILED', error?: string) {
    return prisma.senderLog.create({
        data: {
            campaignId,
            email,
            status,
            error
        }
    });
}
