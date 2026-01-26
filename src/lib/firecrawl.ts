// Types
export interface ScraperResult {
    platform: 'tiktok' | 'instagram';
    username: string;
    url: string;
    email?: string | null;
    metadata?: any;
    title?: string;
    description?: string;
}

export interface DorkSearchResponse {
    success: boolean;
    data: ScraperResult[];
    error?: string;
    totalFound: number;
    queryUsed?: string;
}

// Configuration
const FIRECRAWL_API_URL = "https://api.firecrawl.dev/v1/search";

// Constants describing ignored usernames (port from python)
const IGNORED_IG_USERNAMES = new Set(['p', 'reel', 'reels', 'explore', 'tags', 'stories', 'legal', 'about', 'help', 'terms']);

// Regex Patterns
const TIKTOK_PATTERN = /tiktok\.com\/@([a-zA-Z0-9_\.]+)/;
const IG_PATTERN = /instagram\.com\/([a-zA-Z0-9_\.]+)/;
const EMAIL_PATTERN = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/;

export class FirecrawlClient {
    private apiKey: string;

    constructor(apiKey?: string) {
        this.apiKey = apiKey || process.env.FIRECRAWL_API_KEY || '';
        if (!this.apiKey) {
            console.warn("Firecrawl API Key is missing (FIRECRAWL_API_KEY)");
        }
    }

    private extractUsername(url: string, platform: 'tiktok' | 'instagram'): string | null {
        try {
            if (platform === 'tiktok') {
                const match = url.match(TIKTOK_PATTERN);
                if (match && match[1]) {
                    return match[1].replace(/\.$/, ''); // strip trailing dot
                }
            } else {
                // instagram
                const match = url.match(IG_PATTERN);
                if (match && match[1]) {
                    const u = match[1].replace(/\.$/, '');
                    if (!IGNORED_IG_USERNAMES.has(u.toLowerCase())) {
                        return u;
                    }
                }
            }
        } catch (e) {
            return null;
        }
        return null;
    }

    private extractEmail(text: string): string | null {
        if (!text) return null;
        const match = text.match(EMAIL_PATTERN);
        return match ? match[0] : null;
    }

    async runDorkSearch(query: string, platform: 'tiktok' | 'instagram' = 'instagram'): Promise<DorkSearchResponse> {
        if (!this.apiKey) {
            return { success: false, data: [], error: 'Configuration Error: Missing Firecrawl API Key', totalFound: 0 };
        }

        console.log(`[Firecrawl] Dorking [${platform}]: ${query}`);

        try {
            const response = await fetch(FIRECRAWL_API_URL, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${this.apiKey}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    query: query,
                    limit: 20, // Keep it reasonable for UI
                    lang: "en",
                    country: "us"
                })
            });

            if (!response.ok) {
                if (response.status === 429) {
                    return { success: false, data: [], error: 'Rate Limit Exceeded', totalFound: 0 };
                }
                const errorText = await response.text();
                return { success: false, data: [], error: `API Error: ${response.status} - ${errorText}`, totalFound: 0 };
            }

            const data = await response.json();

            if (!data.success || !data.data) {
                return { success: false, data: [], error: 'API returned unsuccessful status', totalFound: 0 };
            }

            const rawResults = data.data as any[];
            const uniqueUsernames = new Set<string>();
            const cleanedResults: ScraperResult[] = [];

            for (const item of rawResults) {
                const url = item.url;
                if (!url) continue;

                const username = this.extractUsername(url, platform);

                if (username && !uniqueUsernames.has(username)) {
                    uniqueUsernames.add(username);

                    // Attempt to find email in snippet
                    const combinedText = `${item.title || ''} ${item.description || ''}`;
                    const email = this.extractEmail(combinedText);

                    cleanedResults.push({
                        platform,
                        username,
                        url,
                        email,
                        title: item.title,
                        description: item.description
                    });
                }
            }

            console.log(`[Firecrawl] Found ${cleanedResults.length} unique users from ${rawResults.length} raw results`);

            return {
                success: true,
                data: cleanedResults,
                totalFound: cleanedResults.length
            };

        } catch (error: any) {
            console.error('[Firecrawl] Execution Error:', error);
            return { success: false, data: [], error: error.message, totalFound: 0 };
        }
    }
}
