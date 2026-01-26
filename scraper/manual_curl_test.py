
import urllib.request
import json
import ssl

def manual_curl():
    url = "https://instagram-scraper-stable-api.p.rapidapi.com/search_hashtag.php?hashtag=socalfoodie"
    headers = {
        "x-rapidapi-host": "instagram-scraper-stable-api.p.rapidapi.com",
        "x-rapidapi-key": "f170dc0e15msh45782e3a77bb907p104959jsn194792336a38"
    }
    
    print(f"--- EXECUTING MANUAL CURL REPLICA (urllib) ---")
    print(f"URL: {url}")
    
    req = urllib.request.Request(url, headers=headers)
    ctx = ssl.create_default_context()
    ctx.check_hostname = False
    ctx.verify_mode = ssl.CERT_NONE
    
    try:
        with urllib.request.urlopen(req, context=ctx, timeout=15) as response:
            print(f"Status: {response.getcode()}")
            body = response.read().decode('utf-8')
            print(f"Full Body: {body[:300]}...")
            
            # Parse to count
            try:
                data = json.loads(body)
                count = 0
                if "items" in data: count = len(data["items"])
                elif "data" in data and "items" in data["data"]: count = len(data["data"]["items"])
                print(f"Calculated Item Count: {count}")
            except:
                pass
                
    except urllib.request.HTTPError as e:
        print(f"HTTPError: {e.code} {e.reason}")
        print(e.read().decode('utf-8')[:200])
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    manual_curl()
