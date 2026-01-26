import { Queue } from 'bullmq';

export const CAMPAIGN_QUEUE_NAME = 'campaign-email-queue';

export const emailQueue = new Queue(CAMPAIGN_QUEUE_NAME, {
    connection: {
        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT || '6379')
    },
    defaultJobOptions: {
        attempts: 3,
        backoff: {
            type: 'exponential',
            delay: 1000
        }
    }
});
