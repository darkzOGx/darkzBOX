
import asyncio
import httpx
from config import Config

async def test_pro_endpoints():
    # User's Example Shortcode
    shortcode = "DLUWkieNc0u" 
    username = "instagram" 
    
    base_host = Config.RAPIDAPI_HOST
    headers = {
        "x-rapidapi-key": Config.RAPIDAPI_KEY,
        "x-rapidapi-host": base_host
    }
    
    print(f"--- TESTING POST LOOKUP ({shortcode}) ---")
    async with httpx.AsyncClient() as client:
        url = f"https://{base_host}/get_media_data_v2.php"
        params = {"media_code": shortcode}
        try:
            print(f"GET {url}?media_code={shortcode}")
            resp = await client.get(url, params=params, headers=headers, timeout=10)
            print(f"Status: {resp.status_code}")
            if resp.status_code == 200:
                print(f"BINGO! Response: {resp.text[:500]}")
            else:
                print(f"Error: {resp.text[:200]}")
        except Exception as e:
            print(f"Error: {e}")

    # 2. Testing "Account Data" Endpoints (Bio Candidates)
    
    # A. Account Data V2 (POST)
    # URL: ig_get_fb_profile_v3.php
    print(f"\n--- TESTING Account Data V2 (POST) ({username}) ---")
    async with httpx.AsyncClient() as client:
        url = f"https://{base_host}/ig_get_fb_profile_v3.php"
        data = {"username_or_url": username} # Correct param
        try:
            print(f"POST {url} with username_or_url={username}")
            resp = await client.post(url, data=data, headers=headers, timeout=10)
            print(f"Status: {resp.status_code}")
            if resp.status_code == 200:
                print(f"BODY: {resp.text[:500]}")
        except Exception as e:
            print(f"Error: {e}")

    # B. Account Data (POST)
    # URL: ig_get_fb_profile.php
    print(f"\n--- TESTING Account Data (POST) ({username}) ---")
    async with httpx.AsyncClient() as client:
        url = f"https://{base_host}/ig_get_fb_profile.php"
        data = {"username_or_url": username} # Correct param
        try:
            print(f"POST {url} with username_or_url={username}")
            resp = await client.post(url, data=data, headers=headers, timeout=10)
            print(f"Status: {resp.status_code}")
            if resp.status_code == 200:
                print(f"BODY: {resp.text[:500]}")
        except Exception as e:
            print(f"Error: {e}")

    # C. Basic User + Posts (GET)
    # URL: ig_get_fb_profile_hover.php
    print(f"\n--- TESTING Profile Hover (GET) ({username}) ---")
    async with httpx.AsyncClient() as client:
        url = f"https://{base_host}/ig_get_fb_profile_hover.php"
        params = {"username_or_url": username} # Correct param
        try:
            print(f"GET {url}?username_or_url={username}")
            resp = await client.get(url, params=params, headers=headers, timeout=10)
            print(f"Status: {resp.status_code}")
            if resp.status_code == 200:
                print(f"BODY: {resp.text[:500]}")
        except Exception as e:
            print(f"Error: {e}")

if __name__ == "__main__":
    asyncio.run(test_pro_endpoints())
