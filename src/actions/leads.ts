
'use server'

import { prisma } from '@/lib/prisma';

export async function getUnassignedLeads(page = 1, limit = 50, search = '') {
    const skip = (page - 1) * limit;

    const where: any = {
        // We might want to filter for leads NOT in this campaign, 
        // but for now "unassigned" typically means no campaign or just "available to add".
        // The request says "ALL their available leads".
        // Let's assume we can add any lead that isn't already in THIS campaign.
        // But for simplicity/MVP, let's just fetch all leads and the UI can handle disabled state or just add them.
        // Actually, let's just search all leads.
        OR: [
            { email: { contains: search, mode: 'insensitive' } },
            { firstName: { contains: search, mode: 'insensitive' } },
            { lastName: { contains: search, mode: 'insensitive' } },
            { companyName: { contains: search, mode: 'insensitive' } },
        ]
    };

    const [leads, total] = await Promise.all([
        prisma.lead.findMany({
            where,
            take: limit,
            skip,
            orderBy: { createdAt: 'desc' },
            include: { campaign: { select: { id: true, name: true } } }
        }),
        prisma.lead.count({ where })
    ]);

    return { leads, total, totalPages: Math.ceil(total / limit) };
}

export async function addLeadsToCampaign(campaignId: string, leadIds: string[]) {
    const { Queue } = await import('bullmq');
    const emailQueue = new Queue('campaign-email-queue', { connection: { host: 'localhost', port: 6379 } });

    // Update leads: assign to campaign, reset status and step
    await prisma.lead.updateMany({
        where: { id: { in: leadIds } },
        data: {
            campaignId,
            status: 'PENDING',
            currentStep: 0
        }
    });

    // Get the campaign's first step
    const campaign = await prisma.campaign.findUnique({
        where: { id: campaignId },
        include: {
            steps: {
                orderBy: { order: 'asc' },
                take: 1
            }
        }
    });

    // Queue emails for all added leads if campaign has steps
    if (campaign && campaign.steps.length > 0) {
        const firstStep = campaign.steps[0];
        const jobs = leadIds.map(leadId => ({
            name: `email-job-${leadId}`,
            data: {
                leadId,
                campaignId,
                stepOrder: firstStep.order
            },
            opts: {
                removeOnComplete: true
            }
        }));

        await emailQueue.addBulk(jobs);
        console.log(`[addLeadsToCampaign] Queued ${jobs.length} emails for campaign ${campaignId}`);
    }

    // Trigger IMAP sync to check for any existing replies from newly added leads
    try {
        const { syncUnibox } = await import('../worker/imap-listener');
        console.log(`[addLeadsToCampaign] Triggering IMAP sync for new leads...`);
        // Run sync in background (don't await to avoid blocking)
        syncUnibox().catch(err => console.error('[addLeadsToCampaign] IMAP sync error:', err));
    } catch (err) {
        console.error('[addLeadsToCampaign] Failed to trigger IMAP sync:', err);
    }

    return { success: true };
}

