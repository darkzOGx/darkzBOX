
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
    // In a real app we might want to check if they are already in another campaign and warn?
    // Or just update their campaignId. 
    // Schema defines a unique constraint on [campaignId, email]?? No, just lead ID.
    // Actually, lead has `campaignId`. Moving a lead to a new campaign?
    // Or are we creating COPIES? Usually in these tools, a Lead is unique entity.
    // If we add to campaign, we assign them.

    await prisma.lead.updateMany({
        where: { id: { in: leadIds } },
        data: { campaignId }
    });

    // Also we should probably create initial campaign steps for them if the campaign is active?
    // For now, just assigning them is the request.

    return { success: true };
}

