import { Unibox } from "@/components/Unibox";
import { getUniboxThreads } from "@/actions";

export const dynamic = 'force-dynamic';

export default async function UniboxPage() {
    const threads = await getUniboxThreads();
    return <Unibox initialThreads={threads} />;
}
