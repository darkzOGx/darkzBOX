import asyncio
from loguru import logger
from app.dork_discovery import GoogleDorker
from app.pipeline import task_classify_user, Session
from app.models import ScrapingRun

# Stagger settings to avoid rate limits
BATCH_SIZE = 10  # Queries per batch
BATCH_DELAY = 0.5  # Seconds between batches

async def main():
    logger.info("Starting Google Dork Discovery (Firecrawl Edition)...")
    
    # 1. Create Scraping Run Record
    session = Session()
    run = ScrapingRun(status="running") 
    session.add(run)
    session.commit()
    run_id = run.id
    session.close()
    
    logger.info(f"Initialized Run ID: {run_id}")
    
    dorker = GoogleDorker()
    total_found = 0  # Initialize here to fix finally block error
    
    try:
        # 2. Collect all queries first
        logger.info("Loading queries...")
        queries = dorker._load_queries()
        logger.info(f"Loaded {len(queries)} queries. Starting staggered execution...")
        
        # 3. Execute in staggered batches
        for i in range(0, len(queries), BATCH_SIZE):
            batch_queries = queries[i:i + BATCH_SIZE]
            batch_num = (i // BATCH_SIZE) + 1
            total_batches = (len(queries) + BATCH_SIZE - 1) // BATCH_SIZE
            
            logger.info(f"📦 Batch {batch_num}/{total_batches} ({len(batch_queries)} queries)")
            
            # Create tasks for this batch
            tasks = [dorker.run_search(q) for q in batch_queries]
            
            # Run batch concurrently
            results = await asyncio.gather(*tasks, return_exceptions=True)
            
            # Process results
            for result in results:
                if isinstance(result, list):
                    for username in result:
                        task_classify_user.delay(username, run_id)
                    total_found += len(result)
                elif isinstance(result, Exception):
                    logger.error(f"Batch error: {result}")
            
            # Stagger delay between batches
            if i + BATCH_SIZE < len(queries):
                await asyncio.sleep(BATCH_DELAY)

    except KeyboardInterrupt:
        logger.warning("Dorking interrupted by user.")
    except Exception as e:
        logger.error(f"Fatal Error during Dorking: {e}")
    finally:
        await dorker.close()
        logger.success(f"Dork Discovery Finished. Total Queued: {total_found}")

if __name__ == "__main__":
    asyncio.run(main())

