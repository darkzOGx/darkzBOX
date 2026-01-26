import { Worker, Job } from 'bullmq';
import { prisma } from '../lib/prisma';
import { replaceSpintax, replaceVariables } from '../lib/spintax';
import { isInSendingWindow } from '../lib/sending-window';
import { sendEmailViaAccount } from '../lib/email-engine'; // Stub to be created
import { emailQueue } from '../lib/queues';

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

    // 3. Fetch the Step Content with variants
    const step = await prisma.campaignStep.findFirst({
        where: { campaignId: campaign.id, order: stepOrder },
        include: {
            variants: {
                orderBy: { name: 'asc' }
            }
        }
    });

    if (!step) {
        // End of campaign?
        console.log('No step found, campaign completed for this lead.');
        return;
    }

    // 3.5 Check blocklist before sending
    const blockedEmail = await prisma.blockedEmail.findFirst({
        where: {
            workspaceId: campaign.workspaceId,
            email: lead.email.toLowerCase()
        }
    });

    if (blockedEmail) {
        console.log(`[Blocklist] Lead ${lead.email} is blocked. Skipping email.`);
        // Update lead status to indicate they're blocked
        await prisma.lead.update({
            where: { id: lead.id },
            data: { status: 'UNSUBSCRIBED' }
        });
        return;
    }

    // 3.6 Select variant if A/B testing is enabled
    let selectedVariant: { id: string; name: string; subject: string | null; body: string; weight: number } | null = null;

    if (step.variants && step.variants.length > 0) {
        // Weighted random selection
        const totalWeight = step.variants.reduce((sum, v) => sum + v.weight, 0);
        let random = Math.random() * totalWeight;

        for (const variant of step.variants) {
            random -= variant.weight;
            if (random <= 0) {
                selectedVariant = variant;
                break;
            }
        }

        // Fallback to first variant if something went wrong
        if (!selectedVariant) {
            selectedVariant = step.variants[0];
        }

        console.log(`[A/B Test] Selected variant ${selectedVariant.name} for lead ${lead.email}`);
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

    // Use variant content if A/B testing, otherwise use step content
    const rawSubject = selectedVariant ? selectedVariant.subject : step.subject;
    const rawBody = selectedVariant ? selectedVariant.body : step.body;

    const subject = rawSubject ? replaceVariables(replaceSpintax(rawSubject), variables) : null;
    const body = replaceVariables(replaceSpintax(rawBody), variables);

    console.log('[DEBUG] Prepared Email:', {
        to: lead.email,
        vars: variables,
        subjectRaw: rawSubject,
        subjectFinal: subject,
        bodyFinal: body,
        variant: selectedVariant?.name || 'none'
    });

    // 6. Send Email
    // 6. Create Log & Enable Tracking (with variant tracking for A/B tests)
    const log = await prisma.emailLog.create({
        data: {
            leadId: lead.id,
            campaignId: campaign.id,
            emailAccountId: selectedAccount.id,
            type: 'SENT',
            subject: subject,
            bodySnippet: body.substring(0, 100),
            variantId: selectedVariant?.id || null,
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

        // 8. Schedule Next Step
        const nextStep = await prisma.campaignStep.findFirst({
            where: { campaignId: campaign.id, order: stepOrder + 1 }
        });

        if (nextStep) {
            // Add delay (waitDays)
            // If waitDays is 0, maybe wait 1 day minimum? Or immediate? usually cold email has gaps.
            const delayMs = Math.max(nextStep.waitDays * 24 * 60 * 60 * 1000, 60 * 1000); // Min 1 minute for safety

            await emailQueue.add('send-email', {
                leadId: lead.id,
                campaignId: campaign.id,
                stepOrder: nextStep.order
            }, {
                delay: delayMs,
                jobId: `campaign-${campaign.id}-lead-${lead.id}-step-${nextStep.order}` // Dedup
            });

            console.log(`[Scheduler] Scheduled Step ${nextStep.order} for lead ${lead.email} in ${nextStep.waitDays} days`);
        } else {
            // No more steps, maybe mark lead as COMPLETED?
            /* 
            await prisma.lead.update({
               where: { id: lead.id },
               data: { status: 'COMPLETED' } 
            });
            */
            console.log(`[Scheduler] Campaign completed for lead ${lead.email}`);
        }

        console.log(`Email sent successfully to ${lead.email} via ${selectedAccount.email}`);

    } catch (error) {
        console.error('Failed to send email:', error);
        throw error; // BullMQ will retry
    }

}, {
    connection: {
        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT || '6379')
    }
});
