
import asyncio
import httpx
from config import Config

SHORTCODE = "DSp5b2ylHF6" # From the logs

ENDPOINTS = [
    "media_info.php",
    "get_media_info.php",
    "post_info.php", 
    "get_post_info.php",
    "media.php",
    "get_media.php",
    "get_post_details.php",
    "instagram_post_info.php"
]

async def probe():
    headers = {
        "x-rapidapi-key": Config.RAPIDAPI_KEY,
        "x-rapidapi-host": Config.RAPIDAPI_HOST,
    }
    async with httpx.AsyncClient(headers=headers) as client:
        for ep in ENDPOINTS:
            url = f"https://{Config.RAPIDAPI_HOST}/{ep}"
            print(f"Testing {ep}...")
            try:
                # Try 'shortcode' param
                resp = await client.get(url, params={"shortcode": SHORTCODE})
                print(f"Status: {resp.status_code}")
                if resp.status_code == 200:
                    print(f"SUCCESS with shortcode: {resp.text[:200]}")
                    return
                
                # Try 'code' param
                resp = await client.get(url, params={"code": SHORTCODE})
                if resp.status_code == 200:
                    print(f"SUCCESS with code: {resp.text[:200]}")
                    return
                    
            except Exception as e:
                print(f"Error: {e}")

if __name__ == "__main__":
    asyncio.run(probe())
