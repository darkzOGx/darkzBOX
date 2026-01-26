import asyncio
from typing import List
from pathlib import Path
from loguru import logger
from app.dork_discovery import GoogleDorker
from app.models import ScrapingRun, TikTokInfluencer, TikTokBlacklistedAccount
from app.pipeline import Session
from app.scrapers.tiktok import TikTokScraper
from app.tiktok_classifier import TikTokClassifier

# Stagger settings
BATCH_SIZE = 10
BATCH_DELAY = 1.0
CLASSIFY_DELAY = 0.5  # Delay between API calls for classification

async def classify_and_save(username: str, run_id: int, scraper: TikTokScraper):
    """Classify a TikTok user and save to DB synchronously (no Celery)."""
    try:
        # 1. Fetch Profile
        profile = await scraper.get_user_profile(username)
        if not profile:
            logger.warning(f"Could not fetch profile for @{username}")
            return False

        # 2. Run Classifier
        is_qualified, score, signals = TikTokClassifier.classify(profile)

        session = Session()

        if is_qualified:
            # SAVE QUALIFIED
            exists = session.query(TikTokInfluencer).filter_by(username=username).first()
            if not exists:
                stats = profile.get("stats", {})
                lead = TikTokInfluencer(
                    username=username,
                    nickname=profile.get("nickname"),
                    biography=profile.get("signature"),
                    follower_count=stats.get("followerCount"),
                    following_count=stats.get("followingCount"),
                    heart_count=stats.get("heartCount"),
                    video_count=stats.get("videoCount"),
                    is_verified=profile.get("verified", False),
                    score=score,
                    matched_signals=signals,
                    is_business=False
                )
                session.add(lead)
                session.commit()
                logger.success(f"✅ SAVED TIKTOK LEAD: @{username} (Score: {score})")
                session.close()
                return True
            else:
                logger.info(f"Already exists: @{username}")
        else:
            # BLACKLIST
            exists = session.query(TikTokBlacklistedAccount).filter_by(username=username).first()
            if not exists:
                bl = TikTokBlacklistedAccount(
                    username=username,
                    reason=f"Score {score} < Threshold | Signals: {signals}",
                    failed_filters=signals
                )
                session.add(bl)
                session.commit()
            logger.info(f"⛔ Blacklisted @{username} (Score: {score})")

        session.close()
        return False

    except Exception as e:
        logger.error(f"Classification failed for @{username}: {e}")
        return False

async def main():
    logger.info("Starting TikTok Dork Discovery...")

    # 1. Create Run
    session = Session()
    run = ScrapingRun(status="running_tiktok_dork")
    session.add(run)
    session.commit()
    run_id = run.id
    session.close()

    logger.info(f"Initialized Run ID: {run_id}")

    dorker = GoogleDorker()
    scraper = TikTokScraper()

    # Override queries file to use TikTok-specific dorks
    dorker.QUERIES_FILE = Path(__file__).resolve().parent / "app" / "tiktok_dork_queries.txt"

    if not dorker.QUERIES_FILE.exists():
        logger.error(f"TikTok queries file not found: {dorker.QUERIES_FILE}")
        return

    total_discovered = 0
    total_saved = 0

    try:
        queries = dorker._load_queries()
        logger.info(f"Loaded {len(queries)} TikTok queries.")

        for i in range(0, len(queries), BATCH_SIZE):
            batch_queries = queries[i:i + BATCH_SIZE]
            logger.info(f"📦 Batch {(i // BATCH_SIZE) + 1}/{(len(queries) // BATCH_SIZE) + 1} ({len(batch_queries)} queries)")

            # Create tasks specifying platform='tiktok'
            tasks = [dorker.run_search(q, platform="tiktok") for q in batch_queries]

            # Run batch
            results = await asyncio.gather(*tasks, return_exceptions=True)

            # Process results - SYNCHRONOUSLY classify and save each username
            batch_usernames = []
            for result in results:
                if isinstance(result, list):
                    batch_usernames.extend(result)
                    total_discovered += len(result)
                elif isinstance(result, Exception):
                    logger.error(f"Batch error: {result}")

            # Classify each discovered username immediately
            if batch_usernames:
                logger.info(f"🔍 Classifying {len(batch_usernames)} discovered users...")
                for username in batch_usernames:
                    saved = await classify_and_save(username, run_id, scraper)
                    if saved:
                        total_saved += 1
                    await asyncio.sleep(CLASSIFY_DELAY)  # Rate limiting for API

            if i + BATCH_SIZE < len(queries):
                await asyncio.sleep(BATCH_DELAY)

            # Progress update
            logger.info(f"📊 Progress: {total_discovered} discovered, {total_saved} qualified leads saved")

    except KeyboardInterrupt:
        logger.warning("Interrupted.")
    except Exception as e:
        logger.error(f"Fatal Error: {e}")
    finally:
        await dorker.close()

        # Update run stats
        session = Session()
        run = session.query(ScrapingRun).get(run_id)
        if run:
            run.users_discovered = total_discovered
            run.users_qualified = total_saved
            run.status = "completed_tiktok_dork"
            session.commit()
        session.close()

        logger.success(f"🎉 TikTok Dorking Finished!")
        logger.success(f"📈 Results: {total_discovered} discovered → {total_saved} qualified leads SAVED to database")

if __name__ == "__main__":
    asyncio.run(main())
