
import asyncio
import httpx
from config import Config

async def debug_rapidapi():
    tag = "food"
    url = f"https://{Config.RAPIDAPI_HOST}/search_hashtag.php"
    params = {"hashtag": tag}
    headers = {
        "x-rapidapi-key": Config.RAPIDAPI_KEY,
        "x-rapidapi-host": Config.RAPIDAPI_HOST
    }
    
    print(f"DEBUG: Fetching #{tag} from {url}...")
    
    async with httpx.AsyncClient() as client:
        response = await client.get(url, params=params, headers=headers, timeout=30)
        
        print(f"Status Code: {response.status_code}")
        print(f"Response Text (First 1000 chars):\n{response.text[:1000]}")
        
        if response.status_code == 200:
            try:
                data = response.json()
                # Correct parsing logic matching generic APIs
                posts = []
                if "posts" in data:
                    posts = data["posts"].get("edges", [])
                elif "data" in data and "posts" in data["data"]:
                    posts = data["data"]["posts"].get("edges", [])
                    
                print(f"\nParsing Check:")
                print(f"- posts found: {len(posts)}")
                
                if posts:
                    first_node = posts[0].get("node", {})
                    print("\n--- FIRST POST ANALYSIS ---")
                    print(f"ID: {first_node.get('id')}")
                    print(f"Shortcode: {first_node.get('shortcode')}")
                    print(f"Owner Field: {first_node.get('owner')}")
                    print(f"User Field: {first_node.get('user')}")
                    
                    # Test get_media with this FRESH shortcode
                    fresh_code = first_node.get('shortcode')
                    
                    print(f"Location Data: {first_node.get('location')}")
                    
                    caption_edges = first_node.get("edge_media_to_caption", {}).get("edges", [])
                    if caption_edges:
                        print(f"Full Caption: {caption_edges[0].get('node', {}).get('text')}")
                    else:
                        print("No Caption")
            except Exception as e:
                print(f"JSON Parse Error: {e}")

if __name__ == "__main__":
    asyncio.run(debug_rapidapi())
