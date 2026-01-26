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
    if (!domain) return email ? email.toLowerCase().trim() : '';
    const cleanDomain = domain.toLowerCase().trim();
    if (cleanDomain.includes('gmail.com') || cleanDomain.includes('googlemail.com')) {
        return `${local.replace(/\./g, '')}@${cleanDomain}`;
    }
    return `${local}@${cleanDomain}`;
}

async function getSentFolderName(connection: any): Promise<string | null> {
    try {
        const boxes = await connection.getBoxes();

        // Recursive search for a box with the \\Sent attribute
        const findSentBox = (boxList: any, path: string = ''): string | null => {
            for (const key of Object.keys(boxList)) {
                const box = boxList[key];
                const fullPath = path ? `${path}${box.delimiter}${key}` : key;

                // Check attributes
                if (box.attribs && box.attribs.some((a: string) => a.toUpperCase() === '\\SENT')) {
                    return fullPath;
                }

                // Common names fallback check
                if (key.toUpperCase() === 'SENT' || key.toUpperCase() === 'SENT ITEMS' || key.toUpperCase() === 'SENT MESSAGES') {
                    return fullPath;
                }

                // Gmail specifically often puts it under [Gmail]/Sent Mail
                if (path === '[Gmail]' && key === 'Sent Mail') {
                    return fullPath;
                }

                if (box.children) {
                    const foundOriginal = findSentBox(box.children, fullPath);
                    if (foundOriginal) return foundOriginal;
                }
            }
            return null;
        };

        return findSentBox(boxes);
    } catch (e) {
        console.error("Error finding sent box:", e);
        return 'Sent'; // Default fallback
    }
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

    let connection;
    try {
        connection = await imap.connect({ imap: imapConfig });
    } catch (e) {
        console.error(`Could not connect to IMAP for ${account.email}`, e);
        return;
    }

    // --- PRE-FETCHING DATA (Shared across boxes) ---

    // Pre-fetch all leads for fast in-memory matching (Campaign leads)
    const campaignLeads = await prisma.lead.findMany({
        select: { id: true, email: true, status: true, campaignId: true }
    });

    // Pre-fetch all Sender leads
    const senderLeads = await prisma.senderLead.findMany({
        select: { id: true, email: true, groupId: true }
    });

    // Match Map
    type LeadEntry = {
        id: string;
        email: string;
        source: 'campaign' | 'sender';
        status?: string;
        campaignId?: string;
        groupId?: string;
    };

    const leadMap = new Map<string, LeadEntry>();

    for (const l of campaignLeads) {
        leadMap.set(normalizeEmail(l.email), {
            id: l.id,
            email: l.email,
            source: 'campaign',
            status: l.status,
            campaignId: l.campaignId
        });
    }

    for (const l of senderLeads) {
        const normalized = normalizeEmail(l.email);
        if (!leadMap.has(normalized)) {
            leadMap.set(normalized, {
                id: l.id,
                email: l.email,
                source: 'sender',
                groupId: l.groupId
            });
        }
    }

    // Global processed check (to prevent processing twice if moved between folders)
    // Fetch REPLIED and SENT logs
    const existingLogs = await prisma.emailLog.findMany({
        where: { OR: [{ type: 'REPLIED' }, { type: 'SENT' }, { type: 'MANUAL_SENT' }] },
        select: { messageId: true }
    });
    const processedMessageIds = new Set(existingLogs.map(log => log.messageId).filter(Boolean));

    // --- SYNC INBOX ---
    await processBox({
        connection,
        boxName: 'INBOX',
        account,
        leadMap,
        processedMessageIds,
        type: 'INBOX'
    });

    // --- SYNC SENT ---
    const sentBoxName = await getSentFolderName(connection);
    if (sentBoxName) {
        await processBox({
            connection,
            boxName: sentBoxName,
            account,
            leadMap,
            processedMessageIds,
            type: 'SENT'
        });
    } else {
        console.warn(`Could not find Sent folder for ${account.email}`);
    }

    connection.end();
}

type ProcessBoxArgs = {
    connection: any;
    boxName: string;
    account: any;
    leadMap: Map<string, any>;
    processedMessageIds: Set<string | null>;
    type: 'INBOX' | 'SENT';
};

async function processBox({ connection, boxName, account, leadMap, processedMessageIds, type }: ProcessBoxArgs) {
    try {
        await connection.openBox(boxName);
    } catch (e) {
        console.warn(`Failed to open box ${boxName}:`, e);
        return;
    }

    // Only fetch UNSEEN emails from last 7 days (or ALL if we want to catch Sent items properly, 
    // but usually 'UNSEEN' works for new items if client marks them seeing or we track strictly by ID)
    // For Sent items, they might already be SEEN by the client that sent them.
    // So for SENT box, we might need to look at time-based if UNSEEN returns nothing.
    // Strategy: For INBOX use UNSEEN. For SENT, use SINCE.

    const sinceDate = DateTime.now().minus({ days: 7 }).toFormat('dd-LLL-yyyy');

    let searchCriteria: any[] = [['SINCE', sinceDate]];
    if (type === 'INBOX') {
        searchCriteria.push('UNSEEN');
    }
    // For SENT, we don't strictly require UNSEEN because the sender (us) likely 'saw' it when sending.

    const fetchOptions = { bodies: ['HEADER', 'TEXT'], markSeen: false };

    let messages = await connection.search(searchCriteria, fetchOptions);

    if (messages.length === 0) return;

    // LIMIT to 20 to avoid bottlenecks
    messages = messages.slice(0, 20);

    let processedCount = 0;

    for (const msg of messages) {
        const uid = msg.attributes.uid;

        // Header Parsing
        const headerPart = msg.parts.find((p: any) => p.which === 'HEADER');
        const fromHeader = headerPart?.body?.from?.[0];
        const toHeader = headerPart?.body?.to?.[0]; // Needed for Sent Logic
        const subjectHeader = headerPart?.body?.subject?.[0];
        const messageIdHeader = headerPart?.body?.['message-id']?.[0];

        // Unique ID
        const uniqueId = messageIdHeader || `uid-${account.id}-${uid}`;

        if (processedMessageIds.has(uniqueId)) {
            // If INBOX, mark seen so we don't fetch again
            if (type === 'INBOX') await connection.addFlags(uid, '\\Seen');
            continue;
        }

        // --- MATCHING LOGIC ---
        // INBOX: We care about WHO SENT it (Is it a Lead?)
        // SENT: We care about WHO RECEIVED it (Is it a Lead?)

        let targetEmail = '';

        if (type === 'INBOX') {
            if (!fromHeader) continue;
            targetEmail = fromHeader.match(/<(.+)>/)?.[1] || fromHeader.replace(/"/g, '');
        } else {
            // SENT
            if (!toHeader) continue;
            // 'to' header can be multiple list, usually just take the first or check all
            // For simplicity, grab the first email found
            targetEmail = toHeader.match(/<(.+)>/)?.[1] || toHeader.replace(/"/g, '');
        }

        if (!targetEmail) continue;

        const normalizedTarget = normalizeEmail(targetEmail);
        const lead = leadMap.get(normalizedTarget);

        if (!lead) {
            // If INBOX, marks as seen if not a lead
            if (type === 'INBOX') await connection.addFlags(uid, '\\Seen');
            continue;
        }

        // --- CONTENT PARSING ---
        const rawBody = msg.parts.find((part: any) => part.which === 'TEXT')?.body;
        const parsed = await simpleParser(rawBody || '');
        const bodySnippet = parsed.text ? parsed.text.substring(0, 200) : 'No content';

        // --- ACTION ---
        console.log(`    -> [${type}] Match: ${lead.email} (${lead.source})`);

        // Add to processed set
        processedMessageIds.add(uniqueId);

        // Mark seen in IMAP
        await connection.addFlags(uid, '\\Seen');

        const logType = type === 'INBOX' ? 'REPLIED' : 'SENT'; // or 'MANUAL_SENT' matches schema? Schema has 'SENT'.

        if (lead.source === 'campaign') {
            // Update Lead Status only on REPLY
            if (type === 'INBOX' && lead.status !== 'REPLIED') {
                await prisma.lead.update({
                    where: { id: lead.id },
                    data: { status: 'REPLIED' }
                });
            }

            // Create Log
            await prisma.emailLog.create({
                data: {
                    leadId: lead.id,
                    campaignId: lead.campaignId,
                    emailAccountId: account.id,
                    type: logType,
                    messageId: uniqueId,
                    subject: subjectHeader || 'No Subject',
                    bodySnippet: bodySnippet,
                    sentAt: parsed.date || new Date()
                }
            });

            // Trigger Reply Guy ONLY for INBOX messages
            if (type === 'INBOX') {
                await processIncomingEmailReply({
                    leadId: lead.id,
                    workspaceId: account.workspaceId,
                    emailBody: parsed.text || '',
                    emailSubject: subjectHeader || '',
                    senderName: targetEmail, // This is the sender email in INBOX case
                    inReplyToMessageId: uniqueId
                });
            }

        } else {
            // Sender Lead
            await prisma.emailLog.create({
                data: {
                    leadId: null,
                    campaignId: null, // Sender leads aren't strictly attached to Campaign models this way usually
                    emailAccountId: account.id,
                    type: logType,
                    messageId: uniqueId,
                    subject: subjectHeader || 'No Subject',
                    bodySnippet: `[Sender Lead] ${bodySnippet}`,
                    sentAt: parsed.date || new Date()
                }
            });
        }
        processedCount++;
    }

    if (processedCount > 0) {
        console.log(`  [${type}] Sync processed ${processedCount} messages.`);
    }
}
