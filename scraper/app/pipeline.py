import asyncio
from typing import List, Optional
from datetime import datetime
from loguru import logger
from celery import Celery
from sqlalchemy.orm import sessionmaker
from sqlalchemy import create_engine

from app.config import settings
from app.models import Base, Influencer, ScrapingRun, BlacklistedAccount
from app.discovery import DiscoveryEngine
from app.classifier import Classifier
from app.enrichment import EnrichmentEngine
from app.scrapers.instagram import GraphQLScraper

# Constants
CELERY_APP = Celery('socialscrape', broker=settings.CELERY_BROKER_URL, backend=settings.CELERY_RESULT_BACKEND)
CELERY_APP.conf.update(
    task_serializer='json',
    accept_content=['json'],
    result_serializer='json',
    timezone='UTC',
    enable_utc=True,
)

# DB Setup
engine = create_engine(settings.DATABASE_URL)
Session = sessionmaker(bind=engine)

@CELERY_APP.task(bind=True, max_retries=3)
def task_discover_hashtag(self, hashtag: str, run_id: int) -> List[str]:
    """Phase 1: Discovery Task"""
    logger.info(f"Task Phase 1: Discovering #{hashtag} (RunID: {run_id})")
    
    discovery = DiscoveryEngine()
    
    # Async to Sync bridge - Robust fix for Celery/Windows
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
        
        # Trigger Classification for each new user
        for username in new_usernames:
             task_classify_user.delay(username, run_id)
             
        # Update Run Stats
        session = Session()
        run = session.query(ScrapingRun).get(run_id)
        if run:
            run.hashtags_processed = (run.hashtags_processed or 0) + 1
            run.users_discovered = (run.users_discovered or 0) + len(new_usernames)
            session.commit()
        session.close()

        return new_usernames
    except Exception as e:
        logger.error(f"Discovery failed for #{hashtag}: {e}")
        self.retry(exc=e, countdown=60)

@CELERY_APP.task(bind=True, max_retries=3)
def task_classify_user(self, username: str, run_id: int) -> Optional[dict]:
    """Phase 2: Classification Task"""
    logger.info(f"Task Phase 2: Classifying @{username}")
    
    scraper = GraphQLScraper()
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
             
        # Add username to profile dict for classifier
        profile["username"] = username
        
        # 2. Run Classifier
        is_qualified, score, signals = Classifier.classify(profile)
        
        session = Session()
        
        if is_qualified:
            # SAVE QUALIFIED LEAD
            exists = session.query(Influencer).filter_by(username=username).first()
            if not exists:
                lead = Influencer(
                    username=username,
                    full_name=profile.get("full_name"),
                    biography=profile.get("biography"),
                    follower_count=profile.get("follower_count"),
                    following_count=profile.get("following_count"),
                    media_count=profile.get("media_count"),
                    category=profile.get("category_name"),
                    city=profile.get("city_name"), # From API or None
                    score=score,
                    matched_signals=signals,
                    is_business=profile.get("is_business", False),
                    is_professional=profile.get("is_professional_account", False),
                    is_verified=profile.get("is_verified", False),
                    # Contact info
                    email=profile.get("public_email"),
                    phone=profile.get("contact_phone_number"),
                    external_url=profile.get("external_url"),
                    # Address
                    address_json=profile.get("business_address_json")
                )
                session.add(lead)
                session.commit()
                logger.success(f"SAVED QUALIFIED LEAD: @{username} (Score: {score})")
                
                # Trigger Enrichment?
                if not lead.email:
                    task_enrich_lead.delay(lead.id)
            
            # Update Run Stats
            run = session.query(ScrapingRun).get(run_id)
            if run:
                run.users_qualified = (run.users_qualified or 0) + 1
            session.commit()
            
        else:
            # BLACKLIST
            bl = BlacklistedAccount(
                username=username,
                reason=f"Score {score} < {settings.PASS_THRESHOLD} | Signals: {signals}",
                failed_filters=signals
            )
            session.add(bl)
            session.commit()
            logger.info(f"Blacklisted @{username}")
            
        # Update General Stats
        run = session.query(ScrapingRun).get(run_id)
        if run:
            run.users_classified = (run.users_classified or 0) + 1
        session.commit()
        session.close()

    except Exception as e:
        logger.error(f"Classification failed for @{username}: {e}")
        self.retry(exc=e, countdown=60)

@CELERY_APP.task(bind=True)
def task_enrich_lead(self, lead_id: int):
    """Phase 3: Enrichment Task"""
    logger.info(f"Task Phase 3: Enriching Lead ID {lead_id}")
    
    session = Session()
    lead = session.query(Influencer).get(lead_id)
    if not lead:
        session.close()
        return
        
    enricher = EnrichmentEngine()
    
    try:
        loop = asyncio.get_event_loop()
    except RuntimeError:
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)

    if loop.is_closed():
         loop = asyncio.new_event_loop()
         asyncio.set_event_loop(loop)
         
    try:
        user_data = {
            "username": lead.username,
            "biography": lead.biography,
            "external_url": lead.external_url
        }
        email = loop.run_until_complete(enricher.enrich_user(user_data))
        
        if email:
            lead.email = email
            lead.email_enriched = True
            lead.enriched_at = datetime.utcnow()
            session.commit()
            logger.success(f"ENRICHMENT SUCCESS: Found {email} for @{lead.username}")
             # Update Run Stats logic omitted for brevity/locking, usually done via aggregating runs
        else:
            logger.info(f"Enrichment found no email for @{lead.username}")
            
    except Exception as e:
        logger.error(f"Enrichment error: {e}")
    finally:
        session.close()

@CELERY_APP.task
def task_run_full_pipeline(dry_run: bool = False):
    """
    Master Orchestrator.
    """
    logger.info("Starting Full Scraping Pipeline...")
    
    # 1. Create Run Record
    session = Session()
    run = ScrapingRun(status="running")
    session.add(run)
    session.commit()
    run_id = run.id
    session.close()
    
    # 2. Load Hashtags
    HASHTAGS = settings.HASHTAGS
    
    for tag in HASHTAGS:
        if dry_run:
            logger.info(f"[DRY RUN] Would queue task_discover_hashtag('{tag}')")
        else:
            task_discover_hashtag.delay(tag, run_id)
            
    logger.success(f"Pipeline started! Run ID: {run_id}")

