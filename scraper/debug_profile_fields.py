import asyncio
import httpx
import json
from config import Config

# Known target (likely to have rich data)
TARGET_USER = "socal_foodie" 

async def inspect_profile_fields():
    url = f"https://{Config.RAPIDAPI_HOST}/ig_get_fb_profile_v3.php"
    headers = {
        "x-rapidapi-key": Config.RAPIDAPI_KEY,
        "x-rapidapi-host": Config.RAPIDAPI_HOST
    }
    data = {"username_or_url": TARGET_USER}
    
    print(f"DEBUG: Fetching profile for @{TARGET_USER}...")
    
    async with httpx.AsyncClient() as client:
        # Note: Codebase uses POST for this endpoint
        response = await client.post(url, data=data, headers=headers, timeout=30)
        
        print(f"Status: {response.status_code}")
        
        if response.status_code == 200:
            json_data = response.json()
            
            # Print ALL top-level keys
            print("\n=== TOP LEVEL KEYS ===")
            print(json.dumps(list(json_data.keys()), indent=2))
            
            # Extract the actual user object
            user = json_data.get("data", json_data)
            
            print("\n=== USER OBJECT KEYS ===")
            print(json.dumps(list(user.keys()), indent=2))
            
            # Look for specific valuable fields
            valuable_fields = [
                "biography", "external_url", "category_name", "is_business",
                "public_email", "contact_phone_number", "business_address_json",
                "zip_code", "city_name", "address_street",
                "follower_count", "following_count", "media_count"
            ]
            
            print("\n=== VALUABLE FIELDS VALUES ===")
            for field in valuable_fields:
                if field in user:
                    print(f"{field}: {user[field]}")
                else:
                    print(f"{field}: [NOT FOUND]")

            # Dump full JSON to file for deep inspection
            with open("debug_profile_dump.json", "w", encoding="utf-8") as f:
                json.dump(json_data, f, indent=2)
            print("\nFull dump saved to debug_profile_dump.json")

if __name__ == "__main__":
    asyncio.run(inspect_profile_fields())
