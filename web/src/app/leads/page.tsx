import { getLeads } from "@/actions";
import { LeadsPageClient } from "@/components/LeadsPageClient";

export const dynamic = 'force-dynamic';

export default async function LeadsPage() {

    const leads = await getLeads();

    return <LeadsPageClient initialLeads={leads} />;
}

