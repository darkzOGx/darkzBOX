
import asyncio
from loguru import logger
from app.pipeline import CELERY_APP, Session
from app.config import settings
from app.models import TikTokInfluencer, TikTokBlacklistedAccount, ScrapingRun
from app.tiktok_discovery import TikTokDiscoveryEngine
from app.tiktok_classifier import TikTokClassifier
from app.scrapers.tiktok import TikTokScraper

# Reuse the same CELERY_APP instance

@CELERY_APP.task(bind=True, max_retries=3)
def task_tiktok_discover(self, hashtag: str, run_id: int):
    """Phase 1: TikTok Discovery Task"""
    logger.info(f"TikTok Task Phase 1: Discovering #{hashtag} (RunID: {run_id})")
    
    discovery = TikTokDiscoveryEngine()
    
    # Async Sync Bridge
    try:
        loop = asyncio.get_event_loop()
    except RuntimeError:
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
    if loop.is_closed():
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        
    try:
        new_usernames = loop.run_until_complete(discovery.discover_hashtag(hashtag))
        
        # Trigger Classification
        for username in new_usernames:
            task_tiktok_classify.delay(username, run_id)
            
        # Update Stats (Shared Run or Separate? Shared for now is fine if just counting)
        # Actually, let's just log it. Updating SQL might compete with IG scrapers if running parallel.
        # But we use ACID db so it's fine.
        session = Session()
        run = session.query(ScrapingRun).get(run_id)
        if run:
            run.users_discovered = (run.users_discovered or 0) + len(new_usernames)
            session.commit()
        session.close()
        
    except Exception as e:
        logger.error(f"TikTok Discovery failed for #{hashtag}: {e}")
        self.retry(exc=e, countdown=60)

@CELERY_APP.task(bind=True, max_retries=3)
def task_tiktok_classify(self, username: str, run_id: int):
    """Phase 2: TikTok Classification Task"""
    logger.info(f"TikTok Task Phase 2: Classifying @{username}")
    
    scraper = TikTokScraper()
    try:
        loop = asyncio.get_event_loop()
    except RuntimeError:
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
    if loop.is_closed():
         loop = asyncio.new_event_loop()
         asyncio.set_event_loop(loop)
         
    try:
        # 1. Fetch Profile
        profile = loop.run_until_complete(scraper.get_user_profile(username))
        if not profile:
            return None
            
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
                    is_business=False # API doesn't clearly say, defaulting false
                )
                session.add(lead)
                session.commit()
                logger.success(f"SAVED TIKTOK LEAD: @{username} (Score: {score})")
        else:
            # BLACKLIST
            bl = TikTokBlacklistedAccount(
                username=username,
                reason=f"Score {score} < Threshold | Signals: {signals}",
                failed_filters=signals
            )
            session.add(bl)
            session.commit()
            logger.info(f"Blacklisted TikTok @{username}")
            
        session.close()
        
    except Exception as e:
        logger.error(f"TikTok Classification failed for @{username}: {e}")
        self.retry(exc=e, countdown=60)

@CELERY_APP.task
def task_run_tiktok_pipeline(dry_run: bool = False):
    """
    TikTok Orchestrator
    """
    logger.info("Starting TikTok Pipeline...")
    
    session = Session()
    run = ScrapingRun(status="running_tiktok")
    session.add(run)
    session.commit()
    run_id = run.id
    session.close()
    
    HASHTAGS = settings.HASHTAGS
    
    for tag in HASHTAGS:
        if dry_run:
             logger.info(f"[DRY RUN] Would queue task_tiktok_discover('{tag}')")
             break # Just one for dry run
        else:
             task_tiktok_discover.delay(tag, run_id)
             
    logger.success(f"TikTok Pipeline Started! Run ID: {run_id}")
