'use server'

import { FirecrawlClient, ScraperResult, DorkSearchResponse } from '@/lib/firecrawl';
import { runLocalScraper } from '@/lib/local-scraper';
import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';
import fs from 'fs/promises';
import path from 'path';

// Helper to get random dork from file
async function getRandomDork(platform: 'tiktok' | 'instagram'): Promise<string | null> {
    try {
        const filename = platform === 'tiktok' ? 'tiktok.txt' : 'instagram.txt';
        const filePath = path.join(process.cwd(), 'src/lib/dorks', filename);

        const fileContent = await fs.readFile(filePath, 'utf-8');
        const lines = fileContent.split('\n').filter(line => line.trim() && !line.startsWith('#'));

        if (lines.length === 0) return null;

        // Return a random dork
        return lines[Math.floor(Math.random() * lines.length)].trim();
    } catch (error) {
        console.error(`Failed to read dork file for ${platform}`, error);
        return null;
    }
}

export async function runScraperAction(formData: FormData) {
    const query = formData.get('query') as string;
    const platform = formData.get('platform') as 'tiktok' | 'instagram';
    const enableFirecrawl = formData.get('enableFirecrawl') === 'true';
    const apiKey = formData.get('apiKey') as string | undefined;

    // Initialize client with custom key if provided
    const client = new FirecrawlClient(apiKey);

    // If no query provided (auto-mode), pick one
    let targetQuery = query;
    if (!targetQuery) {
        // Auto-dork mode
        const dork = await getRandomDork(platform);
        if (!dork) {
            return { success: false, error: 'Could not load dorks. Please ensure dork files exist.' };
        }
        targetQuery = dork;
    }

    try {
        let response: DorkSearchResponse;

        if (enableFirecrawl) {
            response = await client.runDorkSearch(targetQuery, platform);
        } else {
            // Local IP Scraping
            response = await runLocalScraper(targetQuery, platform);
        }

        return { ...response, queryUsed: targetQuery };

    } catch (error: any) {
        return { success: false, error: error.message, queryUsed: targetQuery };
    }
}

export async function importLeadsAction(leads: ScraperResult[], campaignId: string) {
    if (!campaignId) {
        return { success: false, error: 'Target Campaign is required' };
    }

    if (!leads || leads.length === 0) {
        return { success: false, error: 'No leads selected' };
    }

    let successCount = 0;
    let failCount = 0;

    for (const lead of leads) {

        let emailToUse = lead.email;
        if (!emailToUse) {
            failCount++;
            continue;
        }

        try {
            await prisma.lead.create({
                data: {
                    campaignId: campaignId,
                    email: emailToUse,
                    firstName: lead.username,
                    lastName: '',
                    status: 'PENDING',
                    variables: {
                        platform: lead.platform,
                        profileUrl: lead.url,
                        scrapedTitle: lead.title,
                        scrapedDescription: lead.description,
                        username: lead.username
                    }
                }
            });
            successCount++;
        } catch (e) {
            console.error(`Failed to import ${lead.username}`, e);
            failCount++;
        }
    }

    revalidatePath('/scraper');
    return { success: true, imported: successCount, failed: failCount };
}
