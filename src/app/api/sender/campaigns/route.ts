import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// GET running campaigns for the sender script
export async function GET() {
    try {
        const campaigns = await prisma.senderCampaign.findMany({
            where: { status: 'RUNNING' },
            include: {
                template: true,
                leadGroup: {
                    include: {
                        leads: true
                    }
                }
            }
        });

        // Get config
        const workspace = await prisma.workspace.findFirst();
        const config = workspace ? await prisma.senderConfig.findUnique({
            where: { workspaceId: workspace.id }
        }) : null;

        // Get already sent emails for each campaign
        const campaignsWithProgress = await Promise.all(campaigns.map(async (campaign) => {
            const sentEmails = await prisma.senderLog.findMany({
                where: { campaignId: campaign.id },
                select: { email: true }
            });
            const sentEmailSet = new Set(sentEmails.map(e => e.email.toLowerCase()));

            // Filter out already sent leads
            const pendingLeads = campaign.leadGroup.leads.filter(
                lead => !sentEmailSet.has(lead.email.toLowerCase())
            );

            return {
                id: campaign.id,
                name: campaign.name,
                template: {
                    subject: campaign.template.subject,
                    body: campaign.template.body
                },
                pendingLeads: pendingLeads.map(lead => ({
                    email: lead.email,
                    firstName: lead.firstName,
                    lastName: lead.lastName,
                    company: lead.company
                })),
                totalLeads: campaign.totalLeads,
                sentCount: campaign.sentCount,
                failedCount: campaign.failedCount
            };
        }));

        return NextResponse.json({
            config: config ? {
                smtpHost: config.smtpHost,
                smtpPort: config.smtpPort,
                smtpUser: config.smtpUser,
                smtpPass: config.smtpPass,
                fromName: config.fromName,
                fromEmail: config.fromEmail,
                useTls: config.useTls,
                dailyLimit: config.dailyLimit,
                delayBetween: config.delayBetween
            } : null,
            campaigns: campaignsWithProgress
        });
    } catch (error: any) {
        console.error('Failed to get campaigns:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
