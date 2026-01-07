import { Unibox } from "@/components/Unibox";
import { getUniboxThreads } from "@/actions";

export default async function UniboxPage() {
    const threads = await getUniboxThreads();
    return <Unibox initialThreads={threads} />;
}
