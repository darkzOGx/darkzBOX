import asyncio
import logging
import sys
import os

# Ensure app is in path
sys.path.append(os.getcwd())

from app.scrapers.instagram import GraphQLScraper

# Setup logging to see the debug prints from instagram.py
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("app.scrapers.instagram")
logger.setLevel(logging.DEBUG) # Ensure we see the DEBUG RESPONSE warning

async def main():
    scraper = GraphQLScraper()
    print("Scraping #gaming...")
    try:
        posts = await scraper.scrape_hashtag_feed("#gaming")
        print(f"Found {len(posts)} posts")
        if posts:
            print("First post:", posts[0])
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    asyncio.run(main())
