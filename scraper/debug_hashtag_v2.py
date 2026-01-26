
import asyncio
import httpx
from config import Config

async def test_hashtag_v2():
    # The tag that "failed" before
    hashtag = "SoCalFoodie" 
    
    base_host = Config.RAPIDAPI_HOST
    headers = {
        "x-rapidapi-key": Config.RAPIDAPI_KEY,
        "x-rapidapi-host": base_host
    }
    
    # Guessing the V2 endpoint name from "Posts & Reels V2"
    # Common RockSolid patterns: get_hashtag_posts_v2.php, hashtag_posts_v2.php
    endpoints = [
        "get_hashtag_posts_v2.php",
        "hashtag_posts_v2.php",
        "search_hashtag_v2.php",
        "get_hash_info_v2.php",
        "feed_hashtag_v2.php"
    ]
    
    print(f"--- TESTING V2 HASHTAG SEARCH (#{hashtag}) ---")
    async with httpx.AsyncClient() as client:
        for ep in endpoints:
            url = f"https://{base_host}/{ep}"
            params = {"hashtag": hashtag, "tag": hashtag}
            try:
                print(f"Testing {ep}...")
                resp = await client.get(url, params=params, headers=headers, timeout=10)
                print(f"[{ep}]: {resp.status_code}")
                if resp.status_code == 200:
                    print(f"BINGO! Body: {resp.text[:300]}")
                    return # Stop on first hit
            except Exception as e:
                print(f"Error: {e}")

if __name__ == "__main__":
    asyncio.run(test_hashtag_v2())
