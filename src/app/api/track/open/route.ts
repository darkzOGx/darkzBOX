
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
    const searchParams = request.nextUrl.searchParams;
    const id = searchParams.get('id');

    if (id) {
        try {
            // 1. Find the original SENT log to get context
            const sentLog = await prisma.emailLog.findUnique({
                where: { id },
                select: { leadId: true, campaignId: true, emailAccountId: true }
            });

            if (sentLog) {
                // 2. Record OPEN event
                // Check if already opened to avoid duplicate spam? 
                // Usually we track every open or unique opens. For stats we count unique, but log all.
                // Let's log it.
                await prisma.emailLog.create({
                    data: {
                        leadId: sentLog.leadId,
                        campaignId: sentLog.campaignId,
                        emailAccountId: sentLog.emailAccountId,
                        type: 'OPENED',
                        sentAt: new Date()
                    }
                });

                // Update Lead Last Read? (Already handled by Unibox logic somewhat, but good to have)
                if (sentLog.leadId) {
                    // We don't update lastReadAt for Opens usually, only replies/manual read?
                    // Actually, if they open, WE read it? No, THEY read it.
                    // The field is `lastReadAt` on Lead. Previous steps defined this as "User read the thread".
                    // So we do NOTHING to Lead here.
                }
            }
        } catch (error) {
            console.error("Tracking Open Error:", error);
        }
    }

    // Return 1x1 Transparent GIF
    const pixel = Buffer.from(
        'R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7',
        'base64'
    );

    return new NextResponse(pixel, {
        headers: {
            'Content-Type': 'image/gif',
            'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
            'Pragma': 'no-cache',
            'Expires': '0',
        },
    });
}
