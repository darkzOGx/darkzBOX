import { getCampaigns } from '@/actions';
import ScraperInterface from './client';

export default async function ScraperPage() {
    // Fetch campaigns for the import dropdown
    const campaigns = await getCampaigns();

    return (
        <div className="min-h-screen bg-slate-950 text-white p-8">
            <div className="max-w-7xl mx-auto">
                <div className="mb-10">
                    <h1 className="text-4xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400">
                        Social Intelligence
                    </h1>
                    <p className="text-white/50 mt-2 text-lg">
                        Discover and import leads directly from TikTok and Instagram using advanced dorking.
                    </p>
                </div>

                <ScraperInterface campaigns={campaigns} />
            </div>
        </div>
    );
}
