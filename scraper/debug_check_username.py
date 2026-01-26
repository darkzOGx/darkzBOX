import asyncio
import logging
import sys
import os
import httpx
from config import Config

# Ensure app is in path
sys.path.append(os.getcwd())

async def main():
    print("Probing media endpoints for username...")
    
    # We use a known shortcode from the #gaming log
    shortcode = "DSp2ol1jQPN"
    
    endpoints = [
        "post_info.php",
        "get_post_details.php",
        "media_details.php",
        "get_media.php",
        "get_post_info.php" # Retrying just in case
    ]
    
    headers = {
        "x-rapidapi-key": Config.RAPIDAPI_KEY,
        "x-rapidapi-host": Config.RAPIDAPI_HOST,
    }
    
    async with httpx.AsyncClient(headers=headers) as client:
        for ep in endpoints:
            url = f"https://{Config.RAPIDAPI_HOST}/{ep}"
            params = {"code": shortcode, "shortcode": shortcode}
            
            print(f"Testing {ep}...")
            try:
                resp = await client.get(url, params=params)
                print(f"Status: {resp.status_code}")
                if resp.status_code == 200:
                    print(f"Response: {resp.text[:500]}")
                    if "username" in resp.text:
                        print("SUCCESS: Username found in response!")
            except Exception as e:
                print(f"Error: {e}")

if __name__ == "__main__":
    asyncio.run(main())
