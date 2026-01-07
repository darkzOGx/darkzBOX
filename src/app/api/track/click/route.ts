
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
    const searchParams = request.nextUrl.searchParams;
    const id = searchParams.get('id'); // EmailLog ID
    const url = searchParams.get('url');

    if (!url) {
        return new NextResponse("Missing URL", { status: 400 });
    }

    if (id) {
        try {
            const sentLog = await prisma.emailLog.findUnique({
                where: { id },
                select: { leadId: true, campaignId: true, emailAccountId: true }
            });

            if (sentLog) {
                await prisma.emailLog.create({
                    data: {
                        leadId: sentLog.leadId,
                        campaignId: sentLog.campaignId,
                        emailAccountId: sentLog.emailAccountId,
                        type: 'CLICKED',
                        bodySnippet: url.substring(0, 100), // Log which URL was clicked
                        sentAt: new Date()
                    }
                });
            }
        } catch (error) {
            console.error("Tracking Click Error:", error);
        }
    }

    return NextResponse.redirect(url);
}
