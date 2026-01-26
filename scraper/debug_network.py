import asyncio
from app.scrapers.instagram import GraphQLScraper

async def debug_scraper_methods():
    scraper = GraphQLScraper()
    seed = "diningwithdamian"
    
    print(f"--- Debugging Network Methods for @{seed} ---")
    
    # 1. Manually resolve ID to be sure
    print("1. Resolving ID manually...")
    profile = await scraper.get_user_profile(seed)
    user_id = profile.get("id")
    if not user_id:
        print("   WARN: Profile didn't have ID. Trying direct lookup...")
        data = {"username_or_url": seed}
        resp = await scraper.client.post(scraper.USER_INFO_URL, data=data)
        if resp.status_code == 200:
            d = resp.json()
            user_id = d.get("data", d).get("id")
            
    print(f"   Resolved ID: {user_id}")
    
    if not user_id:
        print("   FATAL: Could not get ID. Aborting.")
        return

    # 2. Debug Followers
    print(f"\n2. Calling get_followers({user_id})...")
    # TRYING USERNAME AS PARAM BASED ON ERROR
    print("   [RAW CHECK] Trying payload {'username': seed}...")
    resp = await scraper.client.post(scraper.FOLLOWERS_URL, data={"username": seed})
    print(f"   Status: {resp.status_code}")
    try:
         print(f"   Response: {resp.json()}")
    except:
         print(f"   Response Text: {resp.text[:500]}")

    print("   [RAW CHECK] Trying payload {'user_id': user_id, 'search_query': 'a'}...", flush=True)
    resp = await scraper.client.post(scraper.FOLLOWERS_URL, data={"user_id": user_id, "search_query": "a"})
    print(f"   Status: {resp.status_code}", flush=True)
    
    try:
        data = resp.json()
        print(f"   Data Type: {type(data)}", flush=True)
        
        if isinstance(data, list):
             print(f"   Is LIST! Length: {len(data)}", flush=True)
             if data:
                 print(f"   First Item Keys: {list(data[0].keys()) if isinstance(data[0], dict) else 'Not Dict'}", flush=True)
                 
        elif isinstance(data, dict):
            print(f"   Top Keys: {list(data.keys())}", flush=True)
            if "data" in data:
                d = data["data"]
                print(f"   data keys: {list(d.keys())}", flush=True)
                if "user" in d:
                    print(f"   data.user keys: {list(d['user'].keys())}", flush=True)
    except Exception as e:
        print(f"   Error parsing: {e}", flush=True)
        print(f"   Raw start: {resp.text[:200]}", flush=True)

    # 3. Debug Similar
    print(f"\n3. Calling get_similar_accounts({seed})...")
    # similar = await scraper.get_similar_accounts(seed)
    # print(f"   Result Count: {len(similar)}")
    
    print("   [RAW CHECK] Calling similar endpoint directly:")
    resp = await scraper.client.get(scraper.SIMILAR_URL, params={"username_or_url": seed})
    print(f"   Status: {resp.status_code}")
    try:
        rj = resp.json()
        print(f"   Keys: {list(rj.keys())}")
        print(str(rj)[:500])
    except:
        print("   Could not parse JSON. Raw Text:")
        print(resp.text[:500])

if __name__ == "__main__":
    asyncio.run(debug_scraper_methods())
