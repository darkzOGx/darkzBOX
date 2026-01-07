import { Worker, Job } from 'bullmq';
import { prisma } from '../lib/prisma';
import { replaceSpintax, replaceVariables } from '../lib/spintax';
import { isInSendingWindow } from '../lib/sending-window';
import { sendEmailViaAccount } from '../lib/email-engine'; // Stub to be created

// removed direct new PrismaClient()

const QUEUE_NAME = 'campaign-email-queue';

export const campaignWorker = new Worker(QUEUE_NAME, async (job: Job) => {
    const { leadId, campaignId, stepOrder } = job.data;

    console.log(`Processing job for Lead: ${leadId}, Campaign: ${campaignId}, Step: ${stepOrder}`);

    // 1. Fetch Lead, Campaign, Workspace
    const lead = await prisma.lead.findUnique({
        where: { id: leadId },
        include: { campaign: { include: { workspace: { include: { emailAccounts: true } } } } }
    });

    if (!lead || !lead.campaign) {
        throw new Error('Lead or Campaign not found');
    }

    const campaign = lead.campaign;
    // Parse schedule if it exists
    const schedule = campaign.schedule ? JSON.parse(JSON.stringify(campaign.schedule)) : null;

    // 2. Check Sending Window
    if (schedule && !isInSendingWindow(schedule)) {
        // Re-schedule for later (simple delay for MVP)
        console.log('Outside sending window, snoozing job...');
        await job.moveToDelayed(Date.now() + 60 * 60 * 1000, job.token); // Try in 1 hour
        return;
    }

    // 3. Fetch the Step Content
    const step = await prisma.campaignStep.findFirst({
        where: { campaignId: campaign.id, order: stepOrder }
    });

    if (!step) {
        // End of campaign?
        console.log('No step found, campaign completed for this lead.');
        return;
    }

    // 4. Select Email Account (Round Robin / Load Balancing)
    // Simple Logic: Pick an account from the workspace that hasn't hit daily limit
    const accounts = campaign.workspace.emailAccounts;
    const validAccounts = accounts.filter(acc => acc.sentToday < acc.dailyLimit);

    if (validAccounts.length === 0) {
        console.log('All email accounts hit daily limits. Snoozing...');
        await job.moveToDelayed(Date.now() + 60 * 60 * 1000, job.token);
        return;
    }

    // Random rotation for now
    const selectedAccount = validAccounts[Math.floor(Math.random() * validAccounts.length)];

    // 5. Prepare Content (Spintax & Variables)
    const variables = {
        firstName: lead.firstName,
        lastName: lead.lastName,
        companyName: lead.companyName,
        ...((lead.variables as Record<string, any>) || {})
    };

    const subject = step.subject ? replaceVariables(replaceSpintax(step.subject), variables) : null;
    const body = replaceVariables(replaceSpintax(step.body), variables);

    console.log('[DEBUG] Prepared Email:', {
        to: lead.email,
        vars: variables,
        subjectRaw: step.subject,
        subjectFinal: subject,
        bodyFinal: body
    });

    // 6. Send Email
    // 6. Create Log & Enable Tracking
    const log = await prisma.emailLog.create({
        data: {
            leadId: lead.id,
            campaignId: campaign.id,
            emailAccountId: selectedAccount.id,
            type: 'SENT',
            subject: subject,
            bodySnippet: body.substring(0, 100),
            sentAt: new Date()
        }
    });

    // Inject Tracking
    const { injectTracking } = await import('../lib/tracking');
    const trackedBody = injectTracking(body, log.id);

    // 7. Send Email
    try {
        const messageId = await sendEmailViaAccount(selectedAccount, {
            to: lead.email,
            subject: subject || "No Subject",
            html: trackedBody
        });

        // 8. Update DB (Log MessageID, Account Stats, Lead Status)
        await prisma.$transaction([
            prisma.emailLog.update({
                where: { id: log.id },
                data: { messageId }
            }),
            prisma.emailAccount.update({
                where: { id: selectedAccount.id },
                data: {
                    sentToday: { increment: 1 },
                    lastSentAt: new Date()
                }
            }),
            prisma.lead.update({
                where: { id: lead.id },
                data: {
                    currentStep: stepOrder,
                    status: 'CONTACTED'
                }
            })
        ]);

        // 8. Schedule Next Step?
        const nextStep = await prisma.campaignStep.findFirst({
            where: { campaignId: campaign.id, order: stepOrder + 1 }
        });

        if (nextStep) {
            // Add delay
            const delayMs = nextStep.waitDays * 24 * 60 * 60 * 1000;
            // In a real app we'd add a new job to the queue
            console.log(`Scheduling next step in ${nextStep.waitDays} days`);
            // queue.add(...)
        }

        console.log(`Email sent successfully to ${lead.email} via ${selectedAccount.email}`);

    } catch (error) {
        console.error('Failed to send email:', error);
        throw error; // BullMQ will retry
    }

}, {
    connection: {
        host: 'localhost',
        port: 6379
    }
});
