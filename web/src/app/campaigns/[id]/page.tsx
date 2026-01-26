import { prisma } from "@/lib/prisma";
import { CampaignDetailsClient } from "@/components/CampaignDetailsClient";

export default async function CampaignDetailsPage(props: { params: Promise<{ id: string }> }) {
    const params = await props.params;
    const { id } = params;
    const campaign = await prisma.campaign.findUnique({
        where: { id },
        include: {
            steps: {
                orderBy: { order: 'asc' },
                include: {
                    variants: {
                        orderBy: { name: 'asc' }
                    }
                }
            },
            _count: { select: { leads: true } },
            logs: {
                include: {
                    variant: true
                }
            }
        }
    });

    if (!campaign) return <div>Campaign not found</div>;

    const sent = campaign.logs.filter(l => l.type === 'SENT').length;
    const opened = campaign.logs.filter(l => l.type === 'OPENED').length;
    const replied = campaign.logs.filter(l => l.type === 'REPLIED').length;

    // Calculate A/B test statistics per variant
    const variantStats: Record<string, { sent: number; opened: number; replied: number; name: string }> = {};

    campaign.logs.forEach(log => {
        if (log.variantId && log.variant) {
            if (!variantStats[log.variantId]) {
                variantStats[log.variantId] = {
                    name: log.variant.name,
                    sent: 0,
                    opened: 0,
                    replied: 0
                };
            }
            if (log.type === 'SENT') variantStats[log.variantId].sent++;
            if (log.type === 'OPENED') variantStats[log.variantId].opened++;
            if (log.type === 'REPLIED') variantStats[log.variantId].replied++;
        }
    });

    return (
        <CampaignDetailsClient
            campaign={campaign}
            sent={sent}
            opened={opened}
            replied={replied}
            variantStats={variantStats}
        />
    );
}
