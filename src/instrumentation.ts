export async function register() {
    if (process.env.NEXT_RUNTIME === 'nodejs') {
        // Import worker files to start them
        await import('./worker/campaign-queue');
        await import('./worker/reply-guy-queue'); // AI Reply scheduling

        // Auto-sync emails every 1 minute
        const { syncUnibox } = await import('./worker/imap-listener');
        setInterval(async () => {
            try {
                await syncUnibox();
            } catch (err) {
                console.error('[AutoSync] Error:', err);
            }
        }, 60 * 1000); // 60 seconds

        console.log('[Instrumentation] Background Workers Started (Sync every 60s)');
    }
}

