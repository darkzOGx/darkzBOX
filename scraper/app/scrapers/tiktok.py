
import httpx
from typing import List, Dict, Optional
from loguru import logger
from app.config import settings

class TikTokScraper:
    def __init__(self):
        # Validate configuration
        if not settings.TIKTOK_HOST or not settings.TIKTOK_HOST.strip():
            raise ValueError("TIKTOK_HOST is not configured. Check your .env file.")
        if not settings.TIKTOK_RAPIDAPI_KEY or not settings.TIKTOK_RAPIDAPI_KEY.strip():
            raise ValueError("TIKTOK_RAPIDAPI_KEY is not configured. Check your .env file.")

        self.base_url = f"https://{settings.TIKTOK_HOST}"
        self.headers = {
            "x-rapidapi-key": settings.TIKTOK_RAPIDAPI_KEY,
            "x-rapidapi-host": settings.TIKTOK_HOST
        }

    async def scrape_hashtag_feed(self, hashtag: str, count: int = 30) -> List[Dict]:
        """
        Scrapes posts for a given hashtag. 
        Returns a list of raw post dictionaries.
        """
        url = f"{self.base_url}/feed/search"
        params = {
            "keywords": hashtag,
            "region": "US",
            "count": count,
            "cursor": 0,
            "publish_time": 0,
            "sort_type": 0
        }
        
        async with httpx.AsyncClient(timeout=30.0) as client:
            try:
                response = await client.get(url, headers=self.headers, params=params)
                if response.status_code != 200:
                    logger.error(f"TikTok API Error {response.status_code}: {response.text}")
                    return []
                
                data = response.json()
                if data.get("code") != 0:
                    logger.error(f"TikTok API Code Error: {data}")
                    return []
                    
                # Extract videos
                # Structure: data -> data -> videos (list) OR data -> data (list)
                # Based on test: data -> data -> videos
                inner_data = data.get("data", {})
                posts = []
                
                if isinstance(inner_data, dict):
                    posts = inner_data.get("videos", [])
                elif isinstance(inner_data, list):
                    posts = inner_data
                
                return posts
                
            except Exception as e:
                logger.error(f"Exception scraping #{hashtag}: {e}")
                return []

    async def get_user_profile(self, username: str) -> Optional[Dict]:
        """
        Fetches user profile details.
        """
        url = f"{self.base_url}/user/info"
        params = {
            "unique_id": username,
        }
        
        async with httpx.AsyncClient(timeout=30.0) as client:
            try:
                response = await client.get(url, headers=self.headers, params=params)
                if response.status_code != 200:
                    logger.error(f"TikTok API User Error {response.status_code}: {response.text}")
                    return None
                    
                data = response.json()
                if data.get("code") != 0:
                    logger.warning(f"TikTok User Not Found or Error: {data}")
                    return None
                    
                # Structure: data -> data -> user (dict)
                inner_data = data.get("data", {})
                user_data = inner_data.get("user")
                
                # Sometimes it might be just inner_data if structure varies, but test confirmed 'user' key
                if not user_data and "stats" in inner_data:
                     user_data = inner_data
                
                if not user_data:
                    return None
                    
                # Normalize metrics (stats are usually nested in 'stats' dict inside user or sibling)
                # Test response: user object has 'stats'? NO, test showed 'stats' might be separate or inside.
                # Let's check test output again:
                # "User Keys:", user.keys() -> includes 'stats'? 
                # Wait, my test output didn't show full keys.
                # Usually RapidAPI TikTok endpoints return:
                # { data: { user: {...}, stats: {...} } } OR { data: { user: { stats: ... } } }
                # I will assume we merge them if they are separate.
                
                stats = inner_data.get("stats")
                if stats:
                    user_data["stats"] = stats
                elif "stats" not in user_data:
                    # Maybe stats are missing?
                    pass
                    
                return user_data

            except httpx.ConnectError as e:
                logger.error(f"Connection error fetching user {username} - check network/DNS: {e}")
                return None
            except httpx.TimeoutException as e:
                logger.error(f"Timeout fetching user {username}: {e}")
                return None
            except Exception as e:
                logger.error(f"Exception fetching user {username}: {e}")
                return None
