import asyncio
from app.scrapers.instagram import GraphQLScraper
from app.config import settings

# Target Venues to Find IDs for
TARGETS = [
    "Grand Central Market",
    "Smorgasburg Los Angeles",
    "Bestia",
    "Bavel",
    "Republique",
    "The Grove",
    "626 Night Market",
    "Anaheim Packing District",
    "Rodeo 39 Public Market",
    "Maru Coffee",
    "Kumquat Coffee",
    "Erewhon", 
    "Courage Bagels",
    "Sqirl",
    "Gjusta",
    "Nobu Malibu",
    "Catch LA",
    "Mama Shelter Los Angeles"
]

async def find_venue_ids():
    scraper = GraphQLScraper()
    
    # Potential Endpoints to Probe
    POSSIBLE_ENDPOINTS = [
        f"https://{settings.RAPIDAPI_HOST}/search_location.php",
        f"https://{settings.RAPIDAPI_HOST}/ig_search_location.php",
        f"https://{settings.RAPIDAPI_HOST}/search_places.php",
        f"https://{settings.RAPIDAPI_HOST}/places.php",
        f"https://{settings.RAPIDAPI_HOST}/location_search.php"
    ]
    
    test_query = "Grand Central Market"
    print(f"Probing endpoints with query: {test_query}")
    print("-" * 80)
    
    for url in POSSIBLE_ENDPOINTS:
        try:
            print(f"Trying {url}...", end=" ")
            params = {"query": test_query}
            response = await scraper.client.get(url, params=params)
            
            if response.status_code == 200:
                print("✅ SUCCESS!")
                print(response.json())
                return
            else:
                print(f"❌ Failed ({response.status_code})")
        except Exception as e:
            print(f"⚠️ Error: {e}")
            
    print("All probes failed.")

if __name__ == "__main__":
    asyncio.run(find_venue_ids())
