
import asyncio
import httpx
from config import Config

async def test_alternatives():
    base_host = Config.RAPIDAPI_HOST
    headers = {
        "x-rapidapi-key": Config.RAPIDAPI_KEY,
        "x-rapidapi-host": base_host
    }
    
    # Strategy A: Location Search (Find "Los Angeles" ID)
    # Common endpoint names for this API family
    loc_search_endpoints = [
        "search_location.php",
        "search_places.php",
        "ig_search_places.php",
        "locations_search.php"
    ]
    
    print("--- STRATEGY A: LOCATION SEARCH ('Los Angeles') ---")
    async with httpx.AsyncClient() as client:
        for ep in loc_search_endpoints:
            url = f"https://{base_host}/{ep}"
            params = {"query": "Los Angeles", "q": "Los Angeles"}
            try:
                resp = await client.get(url, params=params, headers=headers, timeout=5)
                print(f"[{ep}]: {resp.status_code}")
                if resp.status_code == 200:
                    print(f"BINGO! Body: {resp.text[:300]}")
            except Exception as e:
                print(f"[{ep}] Error: {e}")

    # Strategy B: General Search (search_ig.php) - RETRY with GET
    # Previous POST failed. Trying GET.
    print("\n--- STRATEGY B: GENERAL SEARCH ('SoCalFoodie') ---")
    url = f"https://{base_host}/search_ig.php"
    params = {"q": "SoCalFoodie"} # Trying GET
    try:
        async with httpx.AsyncClient() as client:
            resp = await client.get(url, params=params, headers=headers, timeout=5)
            print(f"GET search_ig.php: {resp.status_code}")
            if resp.status_code == 200:
                print(f"Body: {resp.text[:300]}")
    except Exception as e:
        print(f"Error: {e}")

    # Strategy C: V2 Hashtag Feed Guesses
    # "Posts & Reels V2"
    v2_guesses = [
        "get_hashtag_feed_v2.php",
        "hashtag_feed_v2.php",
        "get_tag_posts_v2.php",
        "tag_feed_v2.php",
        "get_hashtag_media_v2.php"
    ]
    
    print("\n--- STRATEGY C: V2 FEED GUESSES ('SoCalFoodie') ---")
    async with httpx.AsyncClient() as client:
        for ep in v2_guesses:
            url = f"https://{base_host}/{ep}"
            params = {"hashtag": "SoCalFoodie"}
            try:
                resp = await client.get(url, params=params, headers=headers, timeout=5)
                print(f"[{ep}]: {resp.status_code}")
                if resp.status_code == 200:
                    print(f"BINGO! Body: {resp.text[:300]}")
            except Exception as e:
                print(f"[{ep}] Error: {e}")

if __name__ == "__main__":
    asyncio.run(test_alternatives())
