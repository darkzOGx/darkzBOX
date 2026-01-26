import { getCampaign } from "@/actions";
import { EditCampaignForm } from "@/components/EditCampaignForm";

export default async function EditCampaignPage(props: { params: Promise<{ id: string }> }) {
    const params = await props.params;
    const { id } = params;
    const campaign = await getCampaign(id);

    if (!campaign) {
        return <div>Campaign not found</div>;
    }

    return (
        <div className="p-8 max-w-5xl mx-auto h-[calc(100vh-2rem)] flex flex-col">
            <EditCampaignForm campaign={campaign} />
        </div>
    );
}

