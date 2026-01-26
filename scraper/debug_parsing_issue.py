import asyncio
from app.scrapers.instagram import GraphQLScraper
import json

async def inspect_user(username):
    scraper = GraphQLScraper()
    print(f"🕵️ Fetching profile for @{username}...")
    
    # 1. Fetch raw data (simulating get_user_profile logic but verifying raw)
    data = {"username_or_url": username} 
    response = await scraper.client.post(scraper.USER_INFO_URL, data=data)
    
    if response.status_code == 200:
        raw_json = response.json()
        
        # Save raw for inspection
        with open(f"debug_{username}.json", "w") as f:
            json.dump(raw_json, f, indent=2)
            
        print(f"✅ Raw JSON saved to debug_{username}.json")
        
        # 2. Test current parsing
        parsed = await scraper.get_user_profile(username)
        print("\n--- Parsed Result ---")
        print(json.dumps(parsed, indent=2))
        
        # Specific check
        print(f"\nMedia Count Check: {parsed.get('media_count')}")
    else:
        print(f"❌ API Error: {response.status_code} | {response.text}")

if __name__ == "__main__":
    asyncio.run(inspect_user("diningwithdamian"))
