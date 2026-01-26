from pydantic_settings import BaseSettings
import os
from typing import List, Optional

class Settings(BaseSettings):
    # API
    RAPIDAPI_KEY: str
    RAPIDAPI_HOST: str = "rocketapi-for-instagram.p.rapidapi.com"
    
    # TikTok API
    TIKTOK_RAPIDAPI_KEY: str = "99d1e03c5bmshfe977f695d2d77bp166c47jsn225f18231ffd"
    TIKTOK_HOST: str = "tiktok-scraper7.p.rapidapi.com"
    
    # Redis
    REDIS_URL: str = "redis://localhost:6379/0"
    
    # Database
    DATABASE_URL: str = "sqlite:///./influencers.db"
    
    # Scraper Settings
    HASHTAG_PAGES: int = 12
    MIN_MEDIA_COUNT: int = 30
    
    # Firecrawl Configuration
    FIRECRAWL_API_KEY: Optional[str] = os.getenv("FIRECRAWL_API_KEY")
    FIRECRAWL_CONCURRENCY: int = 30 # Reduced from 50 to avoid 429 rate limits
    
    DISCOVERY_TYPES: List[str] = ["hashtags", "network", "dork"] 
    
    # Google Dork Queries (Tier 1-6 + Advanced)
    DORK_QUERIES: List[str] = [
        # 🎯 TIER 1: HIGH-INTENT CREATOR QUERIES
        'site:instagram.com "UGC" "LA" "food" -inurl:explore -inurl:tags',
        'site:instagram.com "UGC creator" "Los Angeles" -inurl:explore',
        'site:instagram.com "UGC" "Orange County" "foodie" -inurl:tags',
        'site:instagram.com "UGC" "San Diego" "content" -inurl:explore',
        'site:instagram.com "UGC" "SoCal" "food" -inurl:tags',
        'site:instagram.com "ugc creator" "socal" "eats" -inurl:explore',
        'site:instagram.com "collab" "LA foodie" -inurl:explore',
        'site:instagram.com "DM for collab" "Los Angeles" -inurl:tags',
        'site:instagram.com "open to collab" "LA" "food" -inurl:explore',
        'site:instagram.com "let\'s collab" "Orange County" -inurl:tags',
        'site:instagram.com "collab" "San Diego" "foodie" -inurl:explore',
        'site:instagram.com "partnerships" "LA" "food blogger" -inurl:tags',
        'site:instagram.com "business inquiries" "LA foodie" -inurl:explore',
        'site:instagram.com "email for collabs" "Los Angeles" "food" -inurl:tags',
        'site:instagram.com "inquiries" "SoCal" "foodie" -inurl:explore',
        'site:instagram.com "gmail.com" "LA" "food blogger" -inurl:tags',
        'site:instagram.com "DM for rates" "Los Angeles" "content" -inurl:explore',
        'site:instagram.com "media kit" "LA" "food" -inurl:tags',
        'site:instagram.com "PR friendly" "LA" -inurl:explore',
        'site:instagram.com "PR friendly" "Orange County" "food" -inurl:tags',
        'site:instagram.com "gifted" "Los Angeles" "foodie" -inurl:explore',
        'site:instagram.com "PR" "San Diego" "blogger" -inurl:tags',

        # 📍 TIER 2: LOCATION-SPECIFIC QUERIES
        'site:instagram.com "LA foodie" "matcha" -inurl:explore',
        'site:instagram.com "Los Angeles" "food blogger" -inurl:tags',
        'site:instagram.com "LA eats" "content creator" -inurl:explore',
        'site:instagram.com "LA food" "brunch" "collab" -inurl:tags',
        'site:instagram.com "Los Angeles" "foodie" "lifestyle" -inurl:explore',
        'site:instagram.com "LA" "food content" "creator" -inurl:tags',
        'site:instagram.com "Highland Park" "foodie" -inurl:explore',
        'site:instagram.com "Highland Park" "LA" "eats" -inurl:tags',
        'site:instagram.com "Silver Lake" "food" "blogger" -inurl:explore',
        'site:instagram.com "Silverlake" "foodie" "LA" -inurl:tags',
        'site:instagram.com "Echo Park" "food" "content" -inurl:explore',
        'site:instagram.com "Los Feliz" "eats" "blogger" -inurl:tags',
        'site:instagram.com "NELA" "foodie" -inurl:explore',
        'site:instagram.com "Frogtown" "LA" "food" -inurl:tags',
        'site:instagram.com "Atwater Village" "foodie" -inurl:explore',
        'site:instagram.com "DTLA" "foodie" -inurl:explore',
        'site:instagram.com "Downtown LA" "food blogger" -inurl:tags',
        'site:instagram.com "Arts District" "LA" "food" -inurl:explore',
        'site:instagram.com "Little Tokyo" "foodie" "LA" -inurl:tags',
        'site:instagram.com "DTLA" "eats" "content creator" -inurl:explore',
        'site:instagram.com "Koreatown" "foodie" -inurl:explore',
        'site:instagram.com "Ktown" "LA" "food" -inurl:tags',
        'site:instagram.com "West Adams" "food" "blogger" -inurl:explore',
        'site:instagram.com "Mid City" "LA" "foodie" -inurl:tags',
        'site:instagram.com "Koreatown" "KBBQ" "content" -inurl:explore',
        'site:instagram.com "SGV" "foodie" -inurl:explore',
        'site:instagram.com "San Gabriel Valley" "food" -inurl:tags',
        'site:instagram.com "626" "foodie" "eats" -inurl:explore',
        'site:instagram.com "Alhambra" "food" "blogger" -inurl:tags',
        'site:instagram.com "Arcadia" "foodie" "content" -inurl:explore',
        'site:instagram.com "Pasadena" "food blogger" -inurl:tags',
        'site:instagram.com "Monrovia" "foodie" -inurl:explore',
        'site:instagram.com "Santa Monica" "foodie" -inurl:explore',
        'site:instagram.com "Venice" "food" "blogger" -inurl:tags',
        'site:instagram.com "WeHo" "foodie" "content" -inurl:explore',
        'site:instagram.com "West Hollywood" "food" "lifestyle" -inurl:tags',
        'site:instagram.com "Beverly Hills" "foodie" -inurl:explore',
        'site:instagram.com "Culver City" "food blogger" -inurl:tags',
        'site:instagram.com "Brentwood" "foodie" "LA" -inurl:explore',
        'site:instagram.com "South Bay" "LA" "foodie" -inurl:explore',
        'site:instagram.com "Torrance" "food" "blogger" -inurl:tags',
        'site:instagram.com "Manhattan Beach" "foodie" -inurl:explore',
        'site:instagram.com "Hermosa Beach" "food" "content" -inurl:tags',
        'site:instagram.com "Long Beach" "foodie" "eats" -inurl:explore',
        'site:instagram.com "OC foodie" "collab" -inurl:explore',
        'site:instagram.com "Orange County" "food blogger" -inurl:tags',
        'site:instagram.com "OC eats" "content creator" -inurl:explore',
        'site:instagram.com "Orange County" "foodie" "lifestyle" -inurl:tags',
        'site:instagram.com "OC" "food content" "DM" -inurl:explore',
        'site:instagram.com "Little Arabia" "foodie" -inurl:explore',
        'site:instagram.com "Anaheim" "food" "blogger" -inurl:tags',
        'site:instagram.com "Little Arabia" "halal" "food" -inurl:explore',
        'site:instagram.com "Anaheim" "foodie" "OC" -inurl:tags',
        'site:instagram.com "Costa Mesa" "foodie" -inurl:explore',
        'site:instagram.com "Costa Mesa" "food blogger" -inurl:tags',
        'site:instagram.com "Costa Mesa" "eats" "content" -inurl:explore',
        'site:instagram.com "The Lab" "Costa Mesa" "food" -inurl:tags',
        'site:instagram.com "The Camp" "Costa Mesa" "foodie" -inurl:explore',
        'site:instagram.com "Newport Beach" "foodie" -inurl:explore',
        'site:instagram.com "Huntington Beach" "food blogger" -inurl:tags',
        'site:instagram.com "Laguna Beach" "foodie" "lifestyle" -inurl:explore',
        'site:instagram.com "Dana Point" "food" "content" -inurl:tags',
        'site:instagram.com "San Clemente" "foodie" -inurl:explore',
        'site:instagram.com "Irvine" "foodie" -inurl:explore',
        'site:instagram.com "Fullerton" "food blogger" -inurl:tags',
        'site:instagram.com "Tustin" "foodie" "OC" -inurl:explore',
        'site:instagram.com "Brea" "food" "content creator" -inurl:tags',
        'site:instagram.com "San Diego" "foodie" "collab" -inurl:explore',
        'site:instagram.com "SD foodie" "content creator" -inurl:tags',
        'site:instagram.com "San Diego" "food blogger" -inurl:explore',
        'site:instagram.com "SD eats" "lifestyle" -inurl:tags',
        'site:instagram.com "San Diego" "food content" "DM" -inurl:explore',
        'site:instagram.com "Convoy" "San Diego" "foodie" -inurl:explore',
        'site:instagram.com "Convoy District" "food" -inurl:tags',
        'site:instagram.com "Kearny Mesa" "foodie" "SD" -inurl:explore',
        'site:instagram.com "Convoy" "SD" "eats" -inurl:tags',
        'site:instagram.com "North Park" "San Diego" "foodie" -inurl:explore',
        'site:instagram.com "North Park" "SD" "food blogger" -inurl:tags',
        'site:instagram.com "30th Street" "San Diego" "food" -inurl:explore',
        'site:instagram.com "South Park" "SD" "foodie" -inurl:tags',
        'site:instagram.com "Little Italy" "San Diego" "foodie" -inurl:explore',
        'site:instagram.com "Gaslamp" "SD" "food" -inurl:tags',
        'site:instagram.com "Hillcrest" "San Diego" "foodie" -inurl:explore',
        'site:instagram.com "Downtown" "San Diego" "food blogger" -inurl:tags',
        'site:instagram.com "Barrio Logan" "foodie" -inurl:explore',
        'site:instagram.com "La Jolla" "foodie" -inurl:explore',
        'site:instagram.com "Pacific Beach" "food" "blogger" -inurl:tags',
        'site:instagram.com "Encinitas" "foodie" "SD" -inurl:explore',
        'site:instagram.com "Carlsbad" "food" "content" -inurl:tags',
        'site:instagram.com "Oceanside" "foodie" -inurl:explore',
        'site:instagram.com "Del Mar" "food blogger" -inurl:tags',
        'site:instagram.com "310" "foodie" "LA" -inurl:explore',
        'site:instagram.com "323" "food blogger" "Los Angeles" -inurl:tags',
        'site:instagram.com "213" "LA" "foodie" -inurl:explore',
        'site:instagram.com "818" "foodie" "content" -inurl:tags',
        'site:instagram.com "626" "foodie" "SGV" -inurl:explore',
        'site:instagram.com "949" "OC" "foodie" -inurl:tags',
        'site:instagram.com "714" "Orange County" "food blogger" -inurl:explore',
        'site:instagram.com "619" "San Diego" "foodie" -inurl:tags',
        'site:instagram.com "858" "SD" "food content" -inurl:explore',

        # 🍜 TIER 3: FOOD NICHE QUERIES
        'site:instagram.com "LA" "matcha" "foodie" -inurl:explore',
        'site:instagram.com "matcha girl" "Los Angeles" -inurl:tags',
        'site:instagram.com "matcha lover" "SoCal" -inurl:explore',
        'site:instagram.com "LA" "coffee" "content creator" -inurl:tags',
        'site:instagram.com "cafe hopping" "Los Angeles" -inurl:explore',
        'site:instagram.com "latte art" "LA" "blogger" -inurl:tags',
        'site:instagram.com "home cafe" "Los Angeles" "content" -inurl:explore',
        'site:instagram.com "specialty coffee" "SoCal" -inurl:tags',
        'site:instagram.com "boba" "LA" "foodie" -inurl:explore',
        'site:instagram.com "bubble tea" "Los Angeles" "content" -inurl:tags',
        'site:instagram.com "boba" "Orange County" "blogger" -inurl:explore',
        'site:instagram.com "boba" "San Diego" "foodie" -inurl:tags',
        'site:instagram.com "boba crawl" "SoCal" -inurl:explore',
        'site:instagram.com "KBBQ" "LA" "foodie" -inurl:explore',
        'site:instagram.com "Korean BBQ" "Los Angeles" "content" -inurl:tags',
        'site:instagram.com "ramen" "LA" "blogger" -inurl:explore',
        'site:instagram.com "sushi" "Los Angeles" "foodie" -inurl:tags',
        'site:instagram.com "dim sum" "LA" "food blogger" -inurl:explore',
        'site:instagram.com "hot pot" "Los Angeles" "content" -inurl:tags',
        'site:instagram.com "omakase" "LA" "foodie" -inurl:explore',
        'site:instagram.com "pho" "SoCal" "food blogger" -inurl:tags',
        'site:instagram.com "thai food" "LA" "content creator" -inurl:explore',
        'site:instagram.com "tacos" "LA" "foodie" -inurl:explore',
        'site:instagram.com "birria" "Los Angeles" "food blogger" -inurl:tags',
        'site:instagram.com "mariscos" "LA" "content" -inurl:explore',
        'site:instagram.com "elote" "Los Angeles" "foodie" -inurl:tags',
        'site:instagram.com "street tacos" "SoCal" "blogger" -inurl:explore',
        'site:instagram.com "mexican food" "LA" "content creator" -inurl:tags',
        'site:instagram.com "brunch" "LA" "foodie" -inurl:explore',
        'site:instagram.com "brunch" "Los Angeles" "blogger" -inurl:tags',
        'site:instagram.com "brunch" "Orange County" "content" -inurl:explore',
        'site:instagram.com "brunch" "San Diego" "foodie" -inurl:tags',
        'site:instagram.com "weekend brunch" "SoCal" "lifestyle" -inurl:explore',
        'site:instagram.com "brunch spots" "LA" "content creator" -inurl:tags',
        'site:instagram.com "dessert" "LA" "foodie" -inurl:explore',
        'site:instagram.com "sweets" "Los Angeles" "blogger" -inurl:tags',
        'site:instagram.com "ice cream" "LA" "content" -inurl:explore',
        'site:instagram.com "pastry" "Los Angeles" "foodie" -inurl:tags',
        'site:instagram.com "bakery" "SoCal" "content creator" -inurl:explore',
        'site:instagram.com "cookies" "LA" "food blogger" -inurl:tags',
        'site:instagram.com "vegan" "LA" "foodie" -inurl:explore',
        'site:instagram.com "plant based" "Los Angeles" "blogger" -inurl:tags',
        'site:instagram.com "vegan" "Orange County" "content" -inurl:explore',
        'site:instagram.com "vegan" "San Diego" "foodie" -inurl:tags',
        'site:instagram.com "gluten free" "LA" "food blogger" -inurl:explore',
        'site:instagram.com "healthy eating" "SoCal" "content creator" -inurl:tags',
        'site:instagram.com "fine dining" "LA" "foodie" -inurl:explore',
        'site:instagram.com "omakase" "Los Angeles" "content" -inurl:tags',
        'site:instagram.com "tasting menu" "LA" "blogger" -inurl:explore',
        'site:instagram.com "michelin" "Los Angeles" "foodie" -inurl:tags',
        'site:instagram.com "speakeasy" "LA" "content creator" -inurl:explore',
        'site:instagram.com "Dubai chocolate" "LA" -inurl:explore',
        'site:instagram.com "Dubai chocolate" "California" "foodie" -inurl:tags',
        'site:instagram.com "pistachio" "Los Angeles" "foodie" -inurl:explore',
        'site:instagram.com "girl dinner" "LA" "content" -inurl:tags',
        'site:instagram.com "tanghulu" "Los Angeles" -inurl:explore',
        'site:instagram.com "cottage cheese" "LA" "foodie" -inurl:tags',

        # 💅 TIER 4: LIFESTYLE/AESTHETIC QUERIES
        'site:instagram.com "pilates" "LA" "foodie" -inurl:explore',
        'site:instagram.com "wellness" "Los Angeles" "food" "lifestyle" -inurl:tags',
        'site:instagram.com "pilates princess" "LA" -inurl:explore',
        'site:instagram.com "wellness journey" "Los Angeles" "content" -inurl:tags',
        'site:instagram.com "clean girl" "LA" "foodie" -inurl:explore',
        'site:instagram.com "that girl" "Los Angeles" "lifestyle" -inurl:tags',
        'site:instagram.com "hot girl walk" "LA" "content creator" -inurl:explore',
        'site:instagram.com "soft life" "LA" "lifestyle" -inurl:explore',
        'site:instagram.com "romanticize" "Los Angeles" "content" -inurl:tags',
        'site:instagram.com "coquette" "LA" "aesthetic" -inurl:explore',
        'site:instagram.com "farmers market" "Los Angeles" "lifestyle" -inurl:tags',
        'site:instagram.com "sunday reset" "LA" "content creator" -inurl:explore',
        'site:instagram.com "photo dump" "LA" "foodie" -inurl:explore',
        'site:instagram.com "life lately" "Los Angeles" "content" -inurl:tags',
        'site:instagram.com "girl dinner" "LA" "lifestyle" -inurl:explore',
        'site:instagram.com "digital diary" "Los Angeles" -inurl:tags',
        'site:instagram.com "aesthetic" "LA" "food" "content creator" -inurl:explore',
        'site:instagram.com "food" "lifestyle" "LA" "content creator" -inurl:explore',
        'site:instagram.com "foodie" "lifestyle" "Los Angeles" "collab" -inurl:tags',
        'site:instagram.com "food" "travel" "LA" "blogger" -inurl:explore',
        'site:instagram.com "foodie" "fashion" "Los Angeles" -inurl:tags',
        'site:instagram.com "food" "beauty" "LA" "content" -inurl:explore',

        # 🏢 TIER 5: PROFESSIONAL ROLE QUERIES
        'site:instagram.com "content creator" "LA" "food" -inurl:explore',
        'site:instagram.com "content creator" "Los Angeles" "foodie" -inurl:tags',
        'site:instagram.com "content creator" "Orange County" "eats" -inurl:explore',
        'site:instagram.com "content creator" "San Diego" "food" -inurl:tags',
        'site:instagram.com "digital creator" "LA" "foodie" -inurl:explore',
        'site:instagram.com "video creator" "Los Angeles" "food" -inurl:tags',
        'site:instagram.com "food blogger" "LA" "collab" -inurl:explore',
        'site:instagram.com "food blogger" "Los Angeles" "DM" -inurl:tags',
        'site:instagram.com "food blogger" "Orange County" -inurl:explore',
        'site:instagram.com "food blogger" "San Diego" "inquiries" -inurl:tags',
        'site:instagram.com "blogger" "LA" "foodie" "lifestyle" -inurl:explore',
        'site:instagram.com "food photographer" "LA" -inurl:explore',
        'site:instagram.com "food photography" "Los Angeles" "content" -inurl:tags',
        'site:instagram.com "photographer" "LA" "foodie" -inurl:explore',
        'site:instagram.com "food styling" "Los Angeles" -inurl:tags',
        'site:instagram.com "social media manager" "LA" "foodie" -inurl:explore',
        'site:instagram.com "social media" "Los Angeles" "food" "content" -inurl:tags',
        'site:instagram.com "brand strategist" "LA" "food" -inurl:explore',

        # 🏪 TIER 6: VENUE-SPECIFIC QUERIES
        'site:instagram.com "Grand Central Market" "foodie" -inurl:explore',
        'site:instagram.com "Smorgasburg" "LA" "blogger" -inurl:tags',
        'site:instagram.com "Maydan Market" "food" "content" -inurl:explore',
        'site:instagram.com "Row DTLA" "foodie" -inurl:tags',
        'site:instagram.com "Rodeo 39" "foodie" -inurl:explore',
        'site:instagram.com "Packing District" "Anaheim" "food" -inurl:tags',
        'site:instagram.com "SteelCraft" "Orange County" "blogger" -inurl:explore',
        'site:instagram.com "Liberty Station" "San Diego" "foodie" -inurl:explore',
        'site:instagram.com "Convoy" "food" "content creator" -inurl:tags'
    ]
    
    REQUEST_DELAY_MIN: float = 1.0
    REQUEST_DELAY_MIN: float = 1.0
    REQUEST_DELAY_MAX: float = 3.0
    
    # Classifier
    FOLLOWER_MIN: int = 500
    FOLLOWER_MAX: int = 150_000
    FOLLOW_RATIO_MAX: float = 2.0
    MIN_MEDIA_COUNT: int = 30
    PASS_THRESHOLD: int = 35
    
    # Enrichment
    ENRICHMENT_TIMEOUT: int = 30
    MAX_RETRIES: int = 3
    PROXY_LIST: List[str] = [] # Defaults to empty list
    
    # Target Hashtags v5.0 (Tiers 1-5)
    HASHTAGS: List[str] = [
        # --- Tier 1: High-Volume Discovery ---
        # LA Core
        "LAFoodie", "LosAngelesFood", "LAEats", "LAfoodscene", "LAFood",
        "LAFoodies", "LosAngelesFoodie", "LosAngelesEats", 
        # OC Core
        "OCFoodie", "OrangeCountyEats", "OCEats", "OCFood", "OCFoodies",
        "OrangeCountyFoodie",
        # SD Core
        "SanDiegoFoodie", "SDEats", "SanDiegoFood", "SanDiegoEats", "SDFoodie",
        # Regional
        "SoCalFoodie", "SoCalEats", "SoCalFood", "CaliforniaEats", "CaliEats",

        # --- Tier 2: Media/Publication (High Quality) ---
        "EaterLA", "InfatuationLA", "LATimesFood", "YelpLA", "DineLA", 
        "TimeOutLA", "LAEater", "EatLA", "BestFoodLA", "HungryInLA",
        "EEEEEATS", "ForkyeahLA", "DailyFoodFeed", "FoodBeast", "BuzzFeast", "Munchies",

        # --- Tier 3: Hyper-Local / Neighborhoods ---
        # LA Micro-Geos
        "HighlandParkFood", "HighlandParkLA", "YorkBlvd", "NELAeats", "EagleRockEats", "EagleRockLA",
        "SilverlakeEats", "SilverlakeFood", "EchoParkEats", "LosFelizFood", "FrogtownLA", "AtWaterVillage",
        "DTLAFood", "DTLAEats", "ArtsDistrictLA", "LittleTokyoEats", "RowDTLA", "PiñataDistrict", "DowntownLA",
        "WestAdams", "WestAdamsEats", "MidCityLA", "MaydanMarket", "CulverCityEats",
        "KoreatownLA", "KtownEats", "KtownFood", "KoreatownFood", "LAKBBQ",
        "SGVFoodie", "626Eats", "626Foodie", "SGVFood", "AlhambraEats", "ArcadiaFood", "MonroviaEats",
        "SantaMonicaFood", "SantaMonicaEats", "VeniceEats", "WeHoFood", "WestHollywoodEats", "BrentwoodLA",
        "SouthBayEats", "TorranceFood", "HermosaBeachEats", "ManhattanBeachFood",
        
        # OC Micro-Geos
        "LittleArabia", "LittleArabiaDistrict", "AnaheimEats", "BrookhurstEats",
        "Rodeo39", "PackingDistrict", "AnaheimPackingDistrict", "OCFoodHall",
        "CostaMesaEats", "CostaMesaFood", "TheLabAntiMall", "TheCampCM", "17thStreetCM",
        "NewportBeachEats", "NewportBeachFood", "HuntingtonBeachEats", "LagunaBeachFoodie",
        "SouthOCFoodies", "DanaPointEats", "SanClementeFood", "LidoMarinaVillage",
        "FullertonFood", "BreaCaFoodie", "PlacentiaCaEats", "YorbaLindaFood",
        "IrvineFoodies", "IrvineEats", "TustinEats", "GardenGroveFood",
        
        # SD Micro-Geos
        "ConvoyDistrict", "ConvoyEats", "ConvoySanDiego", "KearnyMesa", "SDNightMarket",
        "NorthParkSD", "NorthParkEats", "30thStreet", "SouthParkSD",
        "LittleItalySD", "GaslampFood", "DowntownSD", "HillcrestEats", "BarrioLogan",
        "LaJollaFood", "LaJollaEats", "PacificBeachFood", "OceanBeachSD", "EncinitasEats",
        "CarlsbadEats", "OceansideFood", "SolanaBeachEats", "DelMarFood",

        # --- Tier 4: Aesthetic & Lifestyle ---
        "PinkPilatesPrincess", "WellnessGirly", "CleanGirlAesthetic", "ThatGirl", "HotGirlWalk", "GutHealth",
        "MatchaLover", "MatchaGirl", "LACoffee", "HomeCafe", "LatteArt", "CafeHopping", "StrawberryMatcha",
        "LABrunch", "SoCalBrunch", "BrunchLA", "WeekendBrunch", "BrunchVibes",
        "VeganLA", "PlantBasedLA", "VeganOC", "VeganSD", "GlutenFreeLA",
        "OmakaseLA", "SpeakeasyLA", "FineDiningLA", "MichelinLA", "TastingMenu",
        "PhotoDump", "LifeLately", "GirlDinner", "FoodDump", "DigitalDiary",
        "FarmersMarketHaul", "CoquetteAesthetic", "SoftLife", "SundayReset",

        # --- Tier 5: 2025 Viral Trends ---
        "DubaiChocolate", "FixChocolate", "PistachioKnafeh", "FixDessertChocolatier",
        "BirriaLA", "BirriaTacos", "Mariscos", "StreetFoodLA", "EloteMan", "TacosLA",
        "KBBQLA", "HotPotLA", "RamenLA", "BobaCrawl", "DimSumLA", "626NightMarket",
        "Tanghulu", "CookieCup", "SouffléPancakes", "MatchaDessert",
        "Mukbang", "ASMRFood", "FirstBite", "FoodReview", "HiddenGems"
    ]

    # Celery
    CELERY_BROKER_URL: str = "redis://localhost:6379/1"
    CELERY_RESULT_BACKEND: str = "redis://localhost:6379/2"
    
    class Config:
        env_file = ".env"
        env_file_encoding = 'utf-8'
        extra = "ignore" # Allow extra fields in .env

# Singleton instance
settings = Settings()
