import { prisma } from '../lib/prisma';
import imap from 'imap-simple';
import { simpleParser } from 'mailparser';
import { processIncomingEmailReply } from '../lib/reply-guy';
import { DateTime } from 'luxon';

export async function syncUnibox() {
    console.log('Starting Unibox Sync...');
    const accounts = await prisma.emailAccount.findMany();

    for (const account of accounts) {
        try {
            await checkImapForAccount(account);
        } catch (err) {
            console.error(`  - Failed to sync ${account.email}`, err);
        }
    }
}

function buildXoauth2Token(user: string, accessToken: string) {
    const authData = `user=${user}\x01auth=Bearer ${accessToken}\x01\x01`;
    return Buffer.from(authData, 'utf-8').toString('base64');
}

// Helper: Normalize for Gmail (remove dots)
function normalizeEmail(email: string): string {
    const [local, domain] = email.split('@');
    if (!domain) return email.toLowerCase().trim();
    const cleanDomain = domain.toLowerCase().trim();
    if (cleanDomain.includes('gmail.com') || cleanDomain.includes('googlemail.com')) {
        return `${local.replace(/\./g, '')}@${cleanDomain}`;
    }
    return `${local}@${cleanDomain}`;
}

async function checkImapForAccount(account: any) {
    const imapConfig: any = {
        user: account.imapUser,
        host: account.imapHost,
        port: account.imapPort,
        tls: account.imapPort === 993,
        tlsOptions: { rejectUnauthorized: false },
        authTimeout: 10000
    };

    if (account.accessToken) {
        imapConfig.xoauth2 = buildXoauth2Token(account.imapUser, account.accessToken);
    } else {
        imapConfig.password = account.imapPass;
    }

    const connection = await imap.connect({ imap: imapConfig });
    await connection.openBox('INBOX');

    // Only fetch UNSEEN emails from last 7 days
    const sinceDate = DateTime.now().minus({ days: 7 }).toFormat('dd-LLL-yyyy');
    const searchCriteria = [['SINCE', sinceDate], 'UNSEEN'];
    const fetchOptions = { bodies: ['HEADER', 'TEXT'], markSeen: false };

    let messages = await connection.search(searchCriteria, fetchOptions);

    if (messages.length === 0) {
        connection.end();
        return;
    }

    // OPTIMIZATION: Only check the 10 most recent emails for speed
    messages = messages.slice(0, 10);

    // Pre-fetch all leads for fast in-memory matching
    const allLeads = await prisma.lead.findMany({
        select: { id: true, email: true, status: true, campaignId: true }
    });

    // Create a Map for O(1) matching using normalized emails
    const leadMap = new Map<string, typeof allLeads[0]>();
    for (const l of allLeads) {
        leadMap.set(normalizeEmail(l.email), l);
    }

    // Pre-fetch ALL existing message IDs to avoid reprocessing
    const existingLogs = await prisma.emailLog.findMany({
        where: { type: 'REPLIED' },
        select: { messageId: true }
    });
    const processedMessageIds = new Set(existingLogs.map(log => log.messageId).filter(Boolean));

    let processedCount = 0;
    let skippedCount = 0;

    for (const msg of messages) {
        const uid = msg.attributes.uid;

        // Parse headers
        const fromHeader = msg.parts.find((p: any) => p.which === 'HEADER')?.body?.from?.[0];
        const subjectHeader = msg.parts.find((p: any) => p.which === 'HEADER')?.body?.subject?.[0];
        const messageIdHeader = msg.parts.find((p: any) => p.which === 'HEADER')?.body?.['message-id']?.[0];

        // Generate a unique ID for this message
        const uniqueId = messageIdHeader || `uid-${account.id}-${uid}`;

        // CRITICAL: Skip if we've already processed this message
        if (processedMessageIds.has(uniqueId)) {
            skippedCount++;
            await connection.addFlags(uid, '\\Seen');
            continue;
        }

        if (!fromHeader) {
            await connection.addFlags(uid, '\\Seen');
            continue;
        }

        let fromEmail = fromHeader.match(/<(.+)>/)?.[1] || fromHeader.replace(/"/g, '');
        if (!fromEmail) {
            await connection.addFlags(uid, '\\Seen');
            continue;
        }

        const normalizedFrom = normalizeEmail(fromEmail);
        const lead = leadMap.get(normalizedFrom);

        if (!lead) {
            // Not a lead we care about - mark as seen
            await connection.addFlags(uid, '\\Seen');
            continue;
        }

        // Parse body for content
        const rawBody = msg.parts.find((part: any) => part.which === 'TEXT')?.body;
        const parsed = await simpleParser(rawBody || '');

        console.log(`    -> NEW REPLY from ${lead.email}`);

        // Mark as SEEN FIRST
        await connection.addFlags(uid, '\\Seen');

        // Add to our in-memory set to prevent re-processing within this sync
        processedMessageIds.add(uniqueId);

        // Update Lead Status
        if (lead.status !== 'REPLIED') {
            await prisma.lead.update({
                where: { id: lead.id },
                data: { status: 'REPLIED' }
            });
        }

        // Log Reply
        await prisma.emailLog.create({
            data: {
                leadId: lead.id,
                campaignId: lead.campaignId,
                emailAccountId: account.id,
                type: 'REPLIED',
                messageId: uniqueId,
                subject: subjectHeader || 'No Subject',
                bodySnippet: parsed.text ? parsed.text.substring(0, 200) : 'No content',
                sentAt: new Date()
            }
        });

        processedCount++;

        // Reply Guy
        await processIncomingEmailReply({
            leadId: lead.id,
            workspaceId: account.workspaceId,
            emailBody: parsed.text || '',
            emailSubject: subjectHeader || '',
            senderName: fromEmail
        });
    }

    if (processedCount > 0 || skippedCount > 0) {
        console.log(`  Sync complete: ${processedCount} new, ${skippedCount} already processed`);
    }

    connection.end();
}
