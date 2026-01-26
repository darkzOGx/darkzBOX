import requests
from app.config import settings

def brute_force():
    url = f"https://{settings.RAPIDAPI_HOST}/get_ig_user_followers_v2.php"
    headers = {
        "x-rapidapi-key": settings.RAPIDAPI_KEY,
        "x-rapidapi-host": settings.RAPIDAPI_HOST,
        "content-type": "application/x-www-form-urlencoded"
    }

    user_id = "27399056332"
    username = "diningwithdamian"
    
    candidates = [
        {"user_id": user_id, "search_query": ""},
        {"user_id": user_id, "search_query": "a"},
        {"user_id": user_id, "query": ""},
        {"user_id": user_id, "query": "a"},
        {"username": username, "search_query": ""},
        {"username": username, "query": ""},
    ]
    
    print(f"Brute Forcing {url}...")
    
    for payload in candidates:
        print(f"\nTesting Payload: {payload}", flush=True)
        try:
            resp = requests.post(url, headers=headers, data=payload, timeout=15)
            # Check if success
            if "error" not in resp.text[:100].lower() and len(resp.text) > 500:
                print(f"✅ SUCCESS CANDIDATE!", flush=True)
                print(f"Status: {resp.status_code}", flush=True)
                print(f"Body Start: {resp.text[:500]}", flush=True)
            else:
                print(f"❌ Failed (Error or Small): {resp.text[:100]}", flush=True)
        except Exception as e:
            print(f"Error: {e}", flush=True)

if __name__ == "__main__":
    brute_force()
