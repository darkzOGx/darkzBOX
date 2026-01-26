
import asyncio
import httpx
from config import Config

async def test_endpoints():
    # Fresh Shortcode from the live '#food' test
    shortcode = "DSp8l_2j059"
    known_user = "instagram"
    
    base_host = Config.RAPIDAPI_HOST
    headers = {
        "x-rapidapi-key": Config.RAPIDAPI_KEY,
        "x-rapidapi-host": base_host
    }
    
    # List of potential endpoints to try
    # We mix Post endpoints (Shortcode) and User endpoints (Username check)
    endpoints_shortcode = [
        "media_info.php",
        "post_info.php",
        "get_post_info.php",
        "get_media_info.php",
        "info_media.php",
        "media.php",
        "p.php"
    ]
    
    endpoints_user = [
        "info_username.php",
        "get_user_info.php",
        "user_info.php"
    ]
    
    async with httpx.AsyncClient() as client:
        print(f"DEBUG: Testing Shortcode '{shortcode}'...")
        for ep in endpoints_shortcode:
            url = f"https://{base_host}/{ep}"
            params = {"shortcode": shortcode}
            try:
                response = await client.get(url, params=params, headers=headers, timeout=5)
                print(f"[{ep}]: {response.status_code} | {response.text[:100]}")
            except Exception as e:
                print(f"[{ep}]: Error {e}")
                
        print(f"\nDEBUG: Testing Username '{known_user}'...")
        for ep in endpoints_user:
            url = f"https://{base_host}/{ep}"
            params = {"user": known_user} # commonly 'user' or 'username'
            try:
                response = await client.get(url, params=params, headers=headers, timeout=5)
                print(f"[{ep}]: {response.status_code} | {response.text[:100]}")
            except Exception as e:
                print(f"[{ep}]: Error {e}")

if __name__ == "__main__":
    asyncio.run(test_endpoints())
