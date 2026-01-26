import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// POST log a sent email
export async function POST(req: NextRequest) {
    try {
        const { campaignId, email, status, error } = await req.json();

        // Create log entry
        await prisma.senderLog.create({
            data: {
                campaignId,
                email,
                status,
                error
            }
        });

        // Update campaign counters
        const updateData: any = {};
        if (status === 'SENT') {
            updateData.sentCount = { increment: 1 };
        } else if (status === 'FAILED') {
            updateData.failedCount = { increment: 1 };
            updateData.lastError = error;
        }

        const campaign = await prisma.senderCampaign.update({
            where: { id: campaignId },
            data: updateData
        });

        // Check if campaign is complete
        if (campaign.sentCount + campaign.failedCount >= campaign.totalLeads) {
            await prisma.senderCampaign.update({
                where: { id: campaignId },
                data: {
                    status: 'COMPLETED',
                    completedAt: new Date()
                }
            });
        }

        return NextResponse.json({ success: true });
    } catch (error: any) {
        console.error('Failed to log email:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
