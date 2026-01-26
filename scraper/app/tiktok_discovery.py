
import asyncio
import redis
from typing import List
from loguru import logger
from app.config import settings
from app.scrapers.tiktok import TikTokScraper

class TikTokDiscoveryEngine:
    """
    TikTok Discovery Phase:
    Scrapes hashtags, collects usernames, deduplicates against Redis.
    """
    
    def __init__(self):
        self.redis = redis.from_url(settings.REDIS_URL, decode_responses=True)
        self.scraper = TikTokScraper()
        
    async def discover_hashtag(self, hashtag: str) -> List[str]:
        """
        Scrapes a hashtag feed and returns *new* usernames found.
        """
        logger.info(f"Starting TikTok discovery for #{hashtag}")
        
        # 1. Fetch Posts
        posts = await self.scraper.scrape_hashtag_feed(hashtag, count=30)
        
        if not posts:
            logger.warning(f"No posts found for #{hashtag} on TikTok")
            return []
            
        new_usernames = []
        
        # 2. Extract & Dedupe
        for post in posts:
            author = post.get("author")
            if not author:
                continue
                
            username = author.get("unique_id")
            if not username:
                continue
                
            # Redis Dedupe: "tiktok_seen_users"
            if not self.redis.sismember("tiktok_seen_users", username):
                self.redis.sadd("tiktok_seen_users", username)
                new_usernames.append(username)
                logger.debug(f"Discovered new TikTok user: @{username}")
                
        logger.info(f"#{hashtag}: Found {len(posts)} posts, {len(new_usernames)} new unique users.")
        return new_usernames
