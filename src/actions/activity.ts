'use server';

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export async function getActivityLogs(limit = 50, offset = 0) {
    const logs = await prisma.emailLog.findMany({
        take: limit,
        skip: offset,
        orderBy: { sentAt: 'desc' },
        include: {
            lead: true,
            campaign: true
        }
    });

    return logs.map(log => ({
        id: log.id,
        campaignId: log.campaignId,
        leadId: log.leadId,
        user: log.lead ? `${log.lead.firstName} ${log.lead.lastName || ''}` : 'Unknown',
        action: log.type === 'SENT' ? 'was sent' : log.type === 'OPENED' ? 'opened' : log.type.toLowerCase(),
        target: log.subject || 'Campaign',
        time: log.sentAt.toLocaleTimeString(),
        fullTime: log.sentAt.toLocaleString(),
        color: log.type === 'REPLIED' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'
    }));
}

