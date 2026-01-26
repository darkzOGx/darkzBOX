import asyncio
import httpx
import json
from config import Config

# Known target shortcode (from previous debug output or a known one)
# Using a generic one or one found in previous logs if available. 
# "C_3D7sOvbT6" is a placeholder; ideally we'd pick one dynamic, but for now I'll use a hardcoded one or fetch one first.
# To be safe, let's fetch a fresh hashtag feed to get a real shortcode, then inspect it.

async def inspect_media_fields():
    # 1. Get a fresh shortcode
    search_url = f"https://{Config.RAPIDAPI_HOST}/search_hashtag.php"
    headers = {
        "x-rapidapi-key": Config.RAPIDAPI_KEY,
        "x-rapidapi-host": Config.RAPIDAPI_HOST
    }
    
    print("DEBUG: Fetching a fresh shortcode to inspect...")
    async with httpx.AsyncClient() as client:
        resp = await client.get(search_url, params={"hashtag": "foodie"}, headers=headers)
        if resp.status_code != 200:
            print("Failed to get feed.")
            return

        data = resp.json()
        shortcode = None
        posts = data.get("posts", {}).get("edges", [])
        if posts:
            shortcode = posts[0]["node"]["shortcode"]
        
        if not shortcode:
            print("No shortcode found.")
            return

        print(f"DEBUG: Inspecting Media Data for {shortcode}...")
        
        # 2. Inspect Media Data
        media_url = f"https://{Config.RAPIDAPI_HOST}/get_media_data_v2.php"
        media_resp = await client.get(media_url, params={"media_code": shortcode}, headers=headers)
        
        if media_resp.status_code == 200:
            media_json = media_resp.json()
            
            print("\n=== MEDIA TOP LEVEL KEYS ===")
            print(json.dumps(list(media_json.keys()), indent=2))
            
            # The structure is often data -> items -> [0] or just data
            item = media_json
            if "items" in media_json:
                item = media_json["items"][0]
            elif "data" in media_json:
                item = media_json["data"]
            
            print("\n=== ITEM KEYS ===")
            print(json.dumps(list(item.keys()), indent=2))
            
            # Valuable fields inspection
            valuable = [
                "caption", "location", "lat", "lng", 
                "taken_at", "product_type", "video_duration",
                "tagged_users", "accessibility_caption"
            ]
            
            print("\n=== VALUABLE MEDIA VALUES ===")
            for f in valuable:
                val = item.get(f, "[NOT FOUND]")
                if isinstance(val, dict) or isinstance(val, list):
                     print(f"{f}: {json.dumps(val)[:100]}...") # Truncate complex objs
                else:
                     print(f"{f}: {val}")

            with open("debug_media_dump.json", "w", encoding="utf-8") as f:
                json.dump(media_json, f, indent=2)
            print("\nFull dump saved to debug_media_dump.json")

if __name__ == "__main__":
    asyncio.run(inspect_media_fields())
