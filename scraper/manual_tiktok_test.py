
import requests
import json
import os

# API Key from user
API_KEY = "99d1e03c5bmshfe977f695d2d77bp166c47jsn225f18231ffd"
HOST = "tiktok-scraper7.p.rapidapi.com"

BASE_URL = f"https://{HOST}"

headers = {
    "x-rapidapi-key": API_KEY,
    "x-rapidapi-host": HOST
}

def inspect_response():
    # Test Hashtag
    print("\n--- Inspecting Hashtag Data ---")
    url = f"{BASE_URL}/feed/search"
    params = {"keywords": "foodie", "count": 1}
    try:
        resp = requests.get(url, headers=headers, params=params)
        data = resp.json()
        if data.get("code") == 0:
            posts = data.get("data", {}).get("videos", []) # TikWM often puts videos in data.videos or just data list
            if not posts and isinstance(data.get("data"), list):
                posts = data.get("data")
            
            if posts:
                print("First Post Keys:", posts[0].keys())
                print("Author Object:", json.dumps(posts[0].get("author"), indent=2))
            else:
                print("No posts found or different structure:", data.keys())
        else:
            print("API Error:", data)
    except Exception as e:
        print(e)

    # Test User Info
    print("\n--- Inspecting User Info ---")
    url = f"{BASE_URL}/user/info"
    params = {"unique_id": "tiktok"}
    try:
        resp = requests.get(url, headers=headers, params=params)
        data = resp.json()
        if data.get("code") == 0:
            user = data.get("data", {}).get("user", data.get("data"))
            if user:
                print("User Keys:", user.keys())
                print("Stats:", user.get("stats"))
                print("Bio/Signature:", user.get("signature"))
        else:
            print("API Error:", data)
    except Exception as e:
        print(e)

if __name__ == "__main__":
    inspect_response()
