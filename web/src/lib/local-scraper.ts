import { ScraperResult, DorkSearchResponse } from './firecrawl';
import puppeteer, { Browser, Page } from 'puppeteer';
import { SocialClassifier } from './classifier';

// Regex Patterns
const TIKTOK_PATTERN = /tiktok\.com\/@([a-zA-Z0-9_\.]+)/;
const IG_PATTERN = /instagram\.com\/([a-zA-Z0-9_\.]+)/;
const EMAIL_PATTERN = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/;
const IGNORED_IG_USERNAMES = new Set(['p', 'reel', 'reels', 'explore', 'tags', 'stories', 'legal', 'about', 'help', 'terms']);

function extractUsername(url: string, platform: 'tiktok' | 'instagram'): string | null {
    try {
        if (platform === 'tiktok') {
            const match = url.match(TIKTOK_PATTERN);
            if (match && match[1]) {
                return match[1].replace(/\.$/, '');
            }
        } else {
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

function extractEmail(text: string): string | null {
    if (!text) return null;
    const match = text.match(EMAIL_PATTERN);
    return match ? match[0] : null;
}

function parseCount(str: string): number {
    // "10.5k", "1M"
    if (!str) return 0;
    str = str.replace(/,/g, '')
        .replace(/followers/i, '')
        .replace(/following/i, '')
        .replace(/posts/i, '')
        .trim();
    let mult = 1;
    if (str.toLowerCase().includes('k')) {
        mult = 1000;
        str = str.replace(/k/i, '');
    } else if (str.toLowerCase().includes('m')) {
        mult = 1000000;
        str = str.replace(/m/i, '');
    }
    const val = parseFloat(str);
    return isNaN(val) ? 0 : val * mult;
}

export async function runLocalScraper(query: string, platform: 'tiktok' | 'instagram'): Promise<DorkSearchResponse> {
    let browser: Browser | null = null;
    try {
        console.log(`[LocalScraper] Starting browser for query: ${query}`);

        browser = await puppeteer.launch({
            headless: true,
            args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
            executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || undefined
        });

        const page = await browser.newPage();
        await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');

        // 1. Google Search
        const searchUrl = `https://www.google.com/search?q=${encodeURIComponent(query)}&hl=en&num=20`; // Get more results (20)
        await page.goto(searchUrl, { waitUntil: 'networkidle2' });

        const rawResults = await page.evaluate(() => {
            const items: any[] = [];
            const resultDivs = document.querySelectorAll('div.g');
            resultDivs.forEach((div) => {
                const link = div.querySelector('a');
                const titleEl = div.querySelector('h3');
                const snippetEl = div.querySelector('div[style*="-webkit-line-clamp"]');

                if (link && link.href) {
                    items.push({
                        url: link.href,
                        title: titleEl?.innerText || '',
                        description: (div as HTMLElement).innerText
                    });
                }
            });
            return items;
        });

        console.log(`[LocalScraper] Found ${rawResults.length} raw results`);

        const uniqueUsernames = new Set<string>();
        const cleanedResults: ScraperResult[] = [];
        const filteredOut: string[] = [];

        // 2. Process & Classify
        for (const item of rawResults) {
            const url = item.url;
            if (!url) continue;

            const username = extractUsername(url, platform);

            if (username && !uniqueUsernames.has(username)) {
                uniqueUsernames.add(username);

                let followers = 0;
                let bio = item.description || "";

                // Regex for snippet stats: "20K Followers, 500 Following"
                const followerMatch = bio.match(/([0-9\.,]+[KkMm]?)\s*Followers/i);
                if (followerMatch) {
                    followers = parseCount(followerMatch[1]);
                }

                const profileData = {
                    username,
                    stats: {
                        followerCount: followers,
                        videoCount: 10 // Assume met req if we can't see it (benefit of doubt in local mode)
                    },
                    signature: bio,
                    nickname: item.title
                };

                // Classify
                const classification = SocialClassifier.classify(profileData);

                if (classification.isQualified) {
                    const email = extractEmail(bio);
                    cleanedResults.push({
                        platform,
                        username,
                        url,
                        email,
                        title: item.title,
                        description: `[Score: ${classification.score}] ${bio.substring(0, 150)}...`
                    });
                } else {
                    filteredOut.push(`${username} (${classification.score})`);
                }
            }
        }

        console.log(`[LocalScraper] Qualified: ${cleanedResults.length}, Filtered: ${filteredOut.length}`);

        return {
            success: true,
            data: cleanedResults,
            totalFound: cleanedResults.length
        };

    } catch (error: any) {
        console.error('[LocalScraper] Error:', error);
        return {
            success: false,
            data: [],
            error: `Local Scraping Error: ${error.message}`,
            totalFound: 0
        };
    } finally {
        if (browser) await browser.close();
    }
}
