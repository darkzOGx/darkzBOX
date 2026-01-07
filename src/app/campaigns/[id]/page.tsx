import { prisma } from "@/lib/prisma";
import { CampaignDetailsClient } from "@/components/CampaignDetailsClient";

export default async function CampaignDetailsPage(props: { params: Promise<{ id: string }> }) {
    const params = await props.params;
    const { id } = params;
    const campaign = await prisma.campaign.findUnique({
        where: { id },
        include: {
            steps: { orderBy: { order: 'asc' } },
            _count: { select: { leads: true } },
            logs: true
        }
    });

    if (!campaign) return <div>Campaign not found</div>;

    const sent = campaign.logs.filter(l => l.type === 'SENT').length;
    const opened = campaign.logs.filter(l => l.type === 'OPENED').length;
    const replied = campaign.logs.filter(l => l.type === 'REPLIED').length;

    return (
        <CampaignDetailsClient 
            campaign={campaign} 
            sent={sent} 
            opened={opened} 
            replied={replied} 
        />
    );
}
