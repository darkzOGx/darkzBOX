
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

export function injectTracking(html: string, logId: string): string {
    // 1. Inject Open Pixel
    const pixelUrl = `${APP_URL}/api/track/open?id=${logId}`;
    const pixelHtml = `<img src="${pixelUrl}" alt="" width="1" height="1" style="display:none;" />`;

    // Append to body if exists, else end of string
    let trackedHtml = html;
    if (html.includes('</body>')) {
        trackedHtml = html.replace('</body>', `${pixelHtml}</body>`);
    } else {
        trackedHtml = html + pixelHtml;
    }

    // 2. Wrap Links for Click Tracking
    // Simple regex to find hrefs. Note: This is a basic implementation.
    // Matches href="http..." or href='http...'
    // We utilize a callback to encode the URL
    const linkRegex = /href=["'](http[^"']+)["']/g;

    trackedHtml = trackedHtml.replace(linkRegex, (match, url) => {
        const trackUrl = `${APP_URL}/api/track/click?id=${logId}&url=${encodeURIComponent(url)}`;
        // Preserve the quote style (detect from match or just use double quotes)
        return `href="${trackUrl}"`;
    });

    return trackedHtml;
}
