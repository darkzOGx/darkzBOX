import { PrismaClient } from '@prisma/client';
import { replaceSpintax } from '../lib/spintax';
import { sendEmailViaAccount } from '../lib/email-engine';

const prisma = new PrismaClient();

// Simple corpus for warmup conversations
const WARMUP_SUBJECTS = [
    "{Quick question|Hello|Hi there}",
    "{Meeting|Sync|Call} next week?",
    "Thoughts on {this|the proposal}?"
];

const WARMUP_BODIES = [
    "Hi, {just checking in|wanted to follow up}. {Let me know|Hope you are well}.",
    "{Can we meet|Are you free} on {Monday|Tuesday}?",
    "I saw {your post|the news} and wanted to {reach out|say hi}."
];

/**
 * The Warmup Worker
 * Randomly picks two accounts from the pool and exchanges an email.
 */
export async function runWarmupCycle() {
    console.log('Running Warmup Cycle...');

    // 1. Fetch all warmup-enabled accounts
    const pool = await prisma.emailAccount.findMany({
        where: { warmupEnabled: true }
    });

    if (pool.length < 2) {
        console.log('Not enough accounts in warmup pool (min 2).');
        return;
    }

    // 2. Select Sender
    const senderIndex = Math.floor(Math.random() * pool.length);
    const sender = pool[senderIndex];

    // 3. Select Receiver (must be different)
    let receiverIndex = Math.floor(Math.random() * pool.length);
    while (receiverIndex === senderIndex) {
        receiverIndex = Math.floor(Math.random() * pool.length);
    }
    const receiver = pool[receiverIndex];

    // 4. Generate Content
    const subject = replaceSpintax(WARMUP_SUBJECTS[Math.floor(Math.random() * WARMUP_SUBJECTS.length)]);
    const body = replaceSpintax(WARMUP_BODIES[Math.floor(Math.random() * WARMUP_BODIES.length)]);

    // 5. Send Email
    try {
        const messageId = await sendEmailViaAccount(sender, {
            to: receiver.email,
            subject: `[WARMUP] ${subject}`, // Tagged for easier debugging, in prod hiding this tag is better
            html: body
        });

        // 6. Log
        await prisma.emailLog.create({
            data: {
                emailAccountId: sender.id,
                type: 'WARMUP_SENT',
                messageId: messageId,
                subject: subject,
                bodySnippet: body
            }
        });

        console.log(`Warmup email sent: ${sender.email} -> ${receiver.email}`);

        // NOTE: The 'receiver' side logic (marking as important/replying) would be handled 
        // by the imap-listener when it detects an incoming email from a known pool member.

    } catch (err) {
        console.error('Warmup failed', err);
    }
}
