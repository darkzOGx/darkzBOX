
import asyncio
import httpx
from config import Config

async def test_user_id_endpoints():
    # Owner ID from the live '#food' test
    user_id = "48334301581"
    
    base_host = Config.RAPIDAPI_HOST
    headers = {
        "x-rapidapi-key": Config.RAPIDAPI_KEY,
        "x-rapidapi-host": base_host
    }
    
    # List of potential ID-based endpoints
    endpoints = [
        "get_user_info_by_id.php",
        "user_info_by_id.php",
        "info_user_id.php",
        "get_profile.php",
        "profile.php",
        "get_user.php",
        "user.php"
    ]
    
    print(f"DEBUG: Testing User ID '{user_id}' against endpoints on {base_host}...\n")
    
    async with httpx.AsyncClient() as client:
        for ep in endpoints:
            url = f"https://{base_host}/{ep}"
            params = {"id": user_id}
            try:
                response = await client.get(url, params=params, headers=headers, timeout=5)
                # We mainly care if it exists (not 404 with "does not exist")
                print(f"[{ep}] ?id=... : {response.status_code} | {response.text[:100]}")
                
                # Try with 'user_id' param just in case
                response2 = await client.get(url, params={"user_id": user_id}, headers=headers, timeout=5)
                 # print(f"[{ep}] ?user_id=... : {response2.status_code}")
                 
            except Exception as e:
                print(f"[{ep}]: Error {e}")
            print("-" * 10)

if __name__ == "__main__":
    asyncio.run(test_user_id_endpoints())
