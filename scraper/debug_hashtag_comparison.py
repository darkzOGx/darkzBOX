
import asyncio
import httpx
from config import Config
from app.scrapers.instagram import GraphQLScraper

async def compare_hashtags():
    base_host = Config.RAPIDAPI_HOST
    headers = {
        "x-rapidapi-key": "f170dc0e15msh45782e3a77bb907p104959jsn194792336a38",
        "x-rapidapi-host": base_host
    }
    
    # 1. Test search_hashtag.php (The one user provided)
    endpoint = "search_hashtag.php"
    url = f"https://{base_host}/{endpoint}"
    
    tags_to_test = ["SoCalFoodie", "LosAngelesFood", "Foodie"]
    
    print(f"--- TESTING {endpoint} VIA SCRAPER CLASS ---")
    scraper = GraphQLScraper()
    # Override client to use local context if needed, or just let it run
    
    for tag in tags_to_test:
        print(f"Scraping #{tag}...")
        posts = await scraper.scrape_hashtag_feed(tag)
        print(f"#{tag}: Found {len(posts)} posts")
        if posts:
            print(f"Sample: {posts[0]['post_url']}")

if __name__ == "__main__":
    asyncio.run(compare_hashtags())
