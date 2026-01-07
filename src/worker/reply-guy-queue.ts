import { Worker, Job, Queue } from 'bullmq';
import { prisma } from '../lib/prisma';
import { sendReply } from '@/actions';

const QUEUE_NAME = 'reply-guy-queue';
const connection = { host: 'localhost', port: 6379 };

// Export queue for scheduling from reply-guy.ts
export const replyGuyQueue = new Queue(QUEUE_NAME, { connection });

// Worker to process scheduled AI replies
export const replyGuyWorker = new Worker(QUEUE_NAME, async (job: Job) => {
    const { leadId, aiResponse, workspaceId } = job.data;

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

        // Send the reply
        await sendReply(leadId, aiResponse);

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
