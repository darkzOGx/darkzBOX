import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function cleanupDuplicatesByMessageId() {
    console.log('Starting duplicate email log cleanup (by messageId)...\n');

    // Find all REPLIED logs
    const repliedLogs = await prisma.emailLog.findMany({
        where: { type: 'REPLIED' },
        orderBy: { sentAt: 'desc' },
        select: { id: true, leadId: true, messageId: true, sentAt: true, bodySnippet: true }
    });

    // Group by messageId (or bodySnippet if messageId is null)
    const byKey = new Map<string, typeof repliedLogs>();
    for (const log of repliedLogs) {
        const key = log.messageId || log.bodySnippet || log.id;
        if (!byKey.has(key)) {
            byKey.set(key, []);
        }
        byKey.get(key)!.push(log);
    }

    let totalDuplicates = 0;
    const toDelete: string[] = [];

    for (const [key, logs] of byKey) {
        if (logs.length > 1) {
            // Keep only the first (most recent) log, delete the rest
            const [keep, ...duplicates] = logs;
            console.log(`Key "${key.substring(0, 50)}...": Keeping 1, removing ${duplicates.length} duplicates`);
            for (const dup of duplicates) {
                toDelete.push(dup.id);
            }
            totalDuplicates += duplicates.length;
        }
    }

    console.log(`\nTotal logs: ${repliedLogs.length}`);
    console.log(`Unique messages: ${byKey.size}`);
    console.log(`Duplicates to remove: ${totalDuplicates}`);

    if (toDelete.length === 0) {
        console.log('\n✓ No duplicates found!');
        return;
    }

    // Delete duplicates
    const result = await prisma.emailLog.deleteMany({
        where: { id: { in: toDelete } }
    });

    console.log(`\n✓ Deleted ${result.count} duplicate email logs`);
}

cleanupDuplicatesByMessageId()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
