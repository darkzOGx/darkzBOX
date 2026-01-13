'use server';

import { prisma } from '@/lib/prisma';

export async function getBlockedEmails(page = 1, limit = 50, search = '') {
    const workspace = await prisma.workspace.findFirst();
    if (!workspace) return { blockedEmails: [], total: 0, totalPages: 0 };

    const skip = (page - 1) * limit;

    const where: any = {
        workspaceId: workspace.id,
    };

    if (search) {
        where.OR = [
            { email: { contains: search, mode: 'insensitive' } },
            { firstName: { contains: search, mode: 'insensitive' } },
            { lastName: { contains: search, mode: 'insensitive' } },
        ];
    }

    const [blockedEmails, total] = await Promise.all([
        prisma.blockedEmail.findMany({
            where,
            take: limit,
            skip,
            orderBy: { createdAt: 'desc' }
        }),
        prisma.blockedEmail.count({ where })
    ]);

    return {
        blockedEmails,
        total,
        totalPages: Math.ceil(total / limit)
    };
}

export async function addToBlocklist(data: {
    email: string;
    firstName?: string;
    lastName?: string;
    reason?: string;
}) {
    const workspace = await prisma.workspace.findFirst();
    if (!workspace) throw new Error("No workspace found");

    // Normalize email
    const normalizedEmail = data.email.toLowerCase().trim();

    // Check if already blocked
    const existing = await prisma.blockedEmail.findUnique({
        where: {
            workspaceId_email: {
                workspaceId: workspace.id,
                email: normalizedEmail
            }
        }
    });

    if (existing) {
        return { success: false, error: 'Email already blocked' };
    }

    await prisma.blockedEmail.create({
        data: {
            workspaceId: workspace.id,
            email: normalizedEmail,
            firstName: data.firstName,
            lastName: data.lastName,
            reason: data.reason
        }
    });

    return { success: true };
}

export async function addBulkToBlocklist(entries: {
    email: string;
    firstName?: string;
    lastName?: string;
}[]) {
    const workspace = await prisma.workspace.findFirst();
    if (!workspace) throw new Error("No workspace found");

    let added = 0;
    let skipped = 0;

    for (const entry of entries) {
        const normalizedEmail = entry.email.toLowerCase().trim();

        if (!normalizedEmail || !normalizedEmail.includes('@')) {
            skipped++;
            continue;
        }

        try {
            await prisma.blockedEmail.create({
                data: {
                    workspaceId: workspace.id,
                    email: normalizedEmail,
                    firstName: entry.firstName,
                    lastName: entry.lastName
                }
            });
            added++;
        } catch (error: any) {
            // Skip duplicates
            if (error.code === 'P2002') {
                skipped++;
            } else {
                throw error;
            }
        }
    }

    return { success: true, added, skipped };
}

export async function removeFromBlocklist(id: string) {
    await prisma.blockedEmail.delete({
        where: { id }
    });

    return { success: true };
}

export async function isEmailBlocked(email: string): Promise<boolean> {
    const workspace = await prisma.workspace.findFirst();
    if (!workspace) return false;

    const normalizedEmail = email.toLowerCase().trim();

    const blocked = await prisma.blockedEmail.findUnique({
        where: {
            workspaceId_email: {
                workspaceId: workspace.id,
                email: normalizedEmail
            }
        }
    });

    return !!blocked;
}

export async function getBlockedEmailsSet(): Promise<Set<string>> {
    const workspace = await prisma.workspace.findFirst();
    if (!workspace) return new Set();

    const blockedEmails = await prisma.blockedEmail.findMany({
        where: { workspaceId: workspace.id },
        select: { email: true }
    });

    return new Set(blockedEmails.map(b => b.email.toLowerCase()));
}
