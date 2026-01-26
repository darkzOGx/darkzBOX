import asyncio
import re
import httpx
from pathlib import Path
from typing import List, AsyncGenerator
from loguru import logger
from app.config import settings
import redis

class GoogleDorker:
    """
    Strategy #3: Google Dork Discovery (Firecrawl Edition).
    Uses Firecrawl API /v1/search to find Instagram profiles.
    Reads queries from app/dork_queries.txt (one per line).
    """
    
    API_URL = "https://api.firecrawl.dev/v1/search"
    QUERIES_FILE = Path(__file__).parent / "dork_queries.txt"
    
    def __init__(self):
        self.redis = redis.from_url(settings.REDIS_URL, decode_responses=True)
        self.sem = asyncio.Semaphore(settings.FIRECRAWL_CONCURRENCY)
        self.client = httpx.AsyncClient(timeout=60.0)
        
        # Regex (matches instagram.com/username)
        # Groups: (1) username
        self.username_pattern = re.compile(r'instagram\.com/([a-zA-Z0-9_\.]+)')

    async def close(self):
        await self.client.aclose()

    def _load_queries(self) -> List[str]:
        """Loads queries from text file (one per line, skips comments/blanks)."""
        queries = []
        if self.QUERIES_FILE.exists():
            with open(self.QUERIES_FILE, 'r', encoding='utf-8') as f:
                for line in f:
                    line = line.strip()
                    if line and not line.startswith('#'):
                        queries.append(line)
            logger.info(f"📂 Loaded {len(queries)} dork queries from {self.QUERIES_FILE.name}")
        else:
            logger.warning(f"⚠️ Queries file not found: {self.QUERIES_FILE}")
        return queries

    async def dork_generator(self) -> AsyncGenerator[str, None]:
        """Yields queries from text file."""
        queries = self._load_queries()
        for q in queries:
            yield q

    async def run_search(self, query: str, platform: str = "instagram", _retry_count: int = 0) -> List[str]:
        """Runs a search via Firecrawl and returns discovered usernames."""
        MAX_RETRIES = 3

        if not settings.FIRECRAWL_API_KEY:
            logger.error("FIRECRAWL_API_KEY not set. Skipping dork.")
            return []

        if _retry_count >= MAX_RETRIES:
            logger.error(f"Max retries ({MAX_RETRIES}) reached for query: {query[:50]}...")
            return []

        discovered = []
        
        async with self.sem:
            logger.info(f"🔥 DORKING [{platform.upper()}]: {query}")
            try:
                headers = {"Authorization": f"Bearer {settings.FIRECRAWL_API_KEY}"}
                payload = {
                    "query": query,
                    "limit": 100, # Maximize yield per credit (API supports up to 100)
                    "lang": "en",
                    "country": "us"
                }
                
                resp = await self.client.post(self.API_URL, headers=headers, json=payload)
                
                if resp.status_code == 200:
                    data = resp.json()
                    # Structure: { "success": true, "data": [ { "url": "...", ... } ] }
                    
                    if data.get("success") and "data" in data:
                        results = data["data"]
                        for item in results:
                            url = item.get("url")
                            if url:
                                uname = self._extract_username(url, platform)
                                redis_key = "tiktok_seen_users" if platform == "tiktok" else "seen_usernames"
                                
                                if uname and not self.redis.sismember(redis_key, uname):
                                    self.redis.sadd(redis_key, uname)
                                    discovered.append(uname)
                                    
                        logger.info(f"✅ Query '{query[:30]}...' -> {len(discovered)} new users")
                    else:
                        logger.warning(f"Firecrawl returned success=false? {data}")
                        
                elif resp.status_code == 429:
                    backoff_time = 30 * (2 ** _retry_count)  # Exponential backoff: 30s, 60s, 120s
                    logger.warning(f"Firecrawl 429 Rate Limit Hit. Backing off for {backoff_time}s (retry {_retry_count + 1}/{MAX_RETRIES})...")
                    await asyncio.sleep(backoff_time)
                    return await self.run_search(query, platform, _retry_count + 1)
                else:
                    logger.error(f"Firecrawl Error {resp.status_code}: {resp.text[:200]}")
                    
            except Exception as e:
                logger.error(f"Dork Error: {e}")
                
        return discovered

    def _extract_username(self, url: str, platform: str = "instagram") -> str:
        """Extracts username from a single URL."""
        if platform == "tiktok":
             # Matches tiktok.com/@username
             match = re.search(r'tiktok\.com/@([a-zA-Z0-9_\.]+)', url)
             if match:
                 return match.group(1).strip('.')
        else:
             # Instagram
             match = self.username_pattern.search(url)
             if match:
                 u = match.group(1).strip('.')
                 if u.lower() not in ['p', 'reel', 'reels', 'explore', 'tags', 'stories', 'legal', 'about']:
                      return u
        return None
