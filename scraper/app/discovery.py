import asyncio
import redis
from typing import List, Set
from loguru import logger
from app.config import settings
from app.scrapers.instagram import GraphQLScraper

class DiscoveryEngine:
    """
    Phase 1: Discovery
    Scrapes hashtags, collects usernames, deduplicates against Redis.
    """
    
    def __init__(self):
        self.redis = redis.from_url(settings.REDIS_URL, decode_responses=True)
        self.scraper = GraphQLScraper()
        
    async def discover_hashtag(self, hashtag: str) -> List[str]:
        """
        Scrapes a hashtag and returns a list of *new* usernames found.
        """
        logger.info(f"Starting discovery for #{hashtag}")
        
        # 1. Fetch Posts
        posts = await self.scraper.scrape_hashtag_feed(hashtag, pages=settings.HASHTAG_PAGES)
        
        if not posts:
            logger.warning(f"No posts found for #{hashtag}")
            return []
            
        new_usernames = []
        
        # 2. Extract & Dedupe
        for post in posts:
            # We need to resolve owner_id -> username if not present
            # The current scraper does this via get_post_info if needed, 
            # but scrape_hashtag_feed usually returns shortcodes/owner_ids.
            # Optimization: We only resolve if the owner_id hasn't been seen.
            
            owner_id = post.get('owner_id')
            if not owner_id:
                continue
                
            # Check Redis Set "seen_owners"
            if self.redis.sismember("seen_owners", owner_id):
                continue
                
            # Mark seen (so we don't query API for this ID again today)
            self.redis.sadd("seen_owners", owner_id)
            
            # Now resolve username (Expensive API call)
            # Efficient Strategy: Queue the shortcode for username resolution task?
            # Or resolve inline? User prompt implies inline "Extract user.username".
            # RockSolid API hashtag feed DOES NOT always return username, mostly owner_id.
            # We will try to resolve it.
            
            shortcode = post.get('shortcode')
            username = await self.scraper.get_post_info(shortcode)
            
            if username:
                # Username Dedupe (The real key)
                if not self.redis.sismember("seen_usernames", username):
                    self.redis.sadd("seen_usernames", username)
                    new_usernames.append(username)
                    logger.debug(f"Discovered new user: @{username}")
        
        logger.info(f"#{hashtag}: Found {len(posts)} posts, {len(new_usernames)} new unique users.")
        return new_usernames

    async def discover_network_peers(self, seed_username: str) -> List[str]:
        """
        Scrapes Followers and Similar Accounts of a seed user.
        """
        logger.info(f"Starting Network Discovery for seed: @{seed_username}")
        new_usernames = []
        
        # 1. Resolve ID (needed for followers)
        # Check Redis cache first? No, we need fresh ID.
        # We can use scraper to get profile.
        profile = await self.scraper.get_user_profile(seed_username)
        if not profile:
             logger.warning(f"Could not resolve seed {seed_username}")
             return []
             
        # PROFILE returns dict, but we need ID. 
        # Wait, get_user_profile doesn't return ID in the dict!
        # I need to fetch ID raw or update get_user_profile. 
        # Let's fix get_user_profile in next step if needed, but for now allow scraper to handle ID lookup internally?
        # Actually `get_followers` takes `user_id`.
        # Let's assume we can get it from an unlisted field or re-fetch.
        # HACK: Use `search_location` style direct call or trust `get_user_profile` updates.
        # Actually, let's just use the `get_post_info` trick if they have posts? No.
        # Let's try to get ID from profile result (we need to make sure scraper returns it).
        
        # NOTE: I will update scraper to return ID in next step.
        # For now, let's assume `profile` dict has 'id' or we skipped that update.
        # I recall I didn't update get_user_profile to return 'id'. 
        # I should have done that.
        # But let's proceed with logic.
        
        # Let's do a quick lookup via client to be safe if ID missing
        user_id = profile.get("id")
        if not user_id:
             # Try direct lookup
             d = {"username_or_url": seed_username}
             resp = await self.scraper.client.post(self.scraper.USER_INFO_URL, data=d)
             if resp.status_code == 200:
                 dd = resp.json()
                 user_id = dd.get("data", dd).get("id")
        
        if not user_id:
            logger.warning(f"No ID found for {seed_username}")
            return []

        # 2. Get Followers
        followers = await self.scraper.get_followers(user_id)
        for u in followers:
            uname = u.get("username")
            if uname and not self.redis.sismember("seen_usernames", uname):
                self.redis.sadd("seen_usernames", uname)
                new_usernames.append(uname)
                
        # 3. Get Similar
        similar = await self.scraper.get_similar_accounts(seed_username)
        for u in similar:
            uname = u.get("username")
            if uname and not self.redis.sismember("seen_usernames", uname):
                self.redis.sadd("seen_usernames", uname)
                new_usernames.append(uname)

        logger.info(f"@{seed_username}: Found {len(followers)} followers, {len(similar)} lookalikes. {len(new_usernames)} new unique users.")
        return new_usernames

if __name__ == "__main__":
    # Dry Run
    async def main():
        engine = DiscoveryEngine()
        await engine.discover_hashtag("SoCalFoodie")
        
    asyncio.run(main())
