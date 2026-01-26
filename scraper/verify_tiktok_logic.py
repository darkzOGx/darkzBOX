
import asyncio
import sys
import os
sys.path.append(os.getcwd())

from app.tiktok_discovery import TikTokDiscoveryEngine
from app.tiktok_classifier import TikTokClassifier
from app.scrapers.tiktok import TikTokScraper
from app.pipeline import Session
from app.models import TikTokInfluencer
from loguru import logger

async def verify_logic():
    logger.info("Starting Verification Logic (No Celery)...")
    
    hashtag = "SoCalFoodie" # Test with our target hashtag
    
    # 1. Discovery
    discovery = TikTokDiscoveryEngine()
    usernames = await discovery.discover_hashtag(hashtag)
    
    if not usernames:
        logger.warning("No usernames found. Is API working? Or all deduped? Trying generic tag...")
        usernames = await discovery.discover_hashtag("foodie")
        
    if not usernames:
        logger.error("Still no usernames. Verification Failed at Phase 1.")
        return
        
    logger.success(f"Phase 1 Success: Found {len(usernames)} users.")
    
    # 2. Classification (Test first one)
    test_user = usernames[0]
    logger.info(f"Testing Classification on @{test_user}")
    
    scraper = TikTokScraper()
    profile = await scraper.get_user_profile(test_user)
    
    if not profile:
        logger.error("Phase 2 Failed: Could not fetch profile.")
        return
        
    is_qualified, score, signals = TikTokClassifier.classify(profile)
    logger.info(f"Classification Result: Qualified={is_qualified}, Score={score}, Signals={signals}")
    
    # 3. DB Save (Simulate)
    if is_qualified:
        logger.info("User Qualified! Attempting DB Save...")
        session = Session()
        try:
             # Check if exists
             exists = session.query(TikTokInfluencer).filter_by(username=test_user).first()
             if exists:
                 logger.info("User already exists in DB.")
             else:
                 stats = profile.get("stats", {})
                 lead = TikTokInfluencer(
                    username=test_user,
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
                 logger.success("Phase 3 Success: Saved to DB.")
        except Exception as e:
            logger.error(f"Phase 3 Failed: {e}")
        finally:
            session.close()
    else:
        logger.info("User not qualified. Skipping DB save (Logic works).")

if __name__ == "__main__":
    asyncio.run(verify_logic())
