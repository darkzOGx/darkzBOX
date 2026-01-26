import re
from typing import Tuple, List, Dict, Any

class LocationClassifier:
    """
    SOCAL INFLUENCER DETECTION SYSTEM v3.0
    
    Expanded logic to identify specific SoCal personas:
    Food, Lifestyle, Coffee, Local Discovery, College Students, Creators.
    """
    
    # ============ CONFIGURATION ============
    
    # 2A. Expanded Location Signals
    LOCATION_SIGNALS = {
        # ========== TIER 1: HIGH CONFIDENCE (25 pts) ==========
        "strict_emoji": [
            # LA
            "📍 los angeles", "📍 la", "📍 l.a.",
            "📍 dtla", "📍 downtown la",
            # OC
            "📍 orange county", "📍 oc", "📍 o.c.",
            "📍 irvine", "📍 costa mesa", "📍 newport",
            "📍 tustin", "📍 lake forest", "📍 mission viejo",
            "📍 anaheim", "📍 santa ana", "📍 fullerton",
            # SD (NEW)
            "📍 san diego", "📍 sd",
            # Regional
            "📍 socal", "📍 southern california",
            "📍 sgv", "📍 ie", "📍 inland empire",
        ],
        
        # ========== TIER 2: PIPE FORMAT (22 pts) ==========
        "pipe_format": [
            "la | oc", "oc | la", "la/oc", "oc/la",
            "la | oc | sd", "oc | la | sd",
            "la & oc", "oc & la",
            "in oc", "in la", "based in oc", "based in la",
            "based in sd", "sd based", "la based", "oc based", # Added
            "oc | la | ie", "la | sgv",
        ],
        
        # ========== TIER 3: SPECIFIC CITIES (18 pts) ==========
        "la_cities": [
            "los angeles", "dtla", "downtown la", "downtown los angeles",
            "hollywood", "west hollywood", "weho", "beverly hills",
            "santa monica", "venice", "culver city", "mar vista",
            "silver lake", "silverlake", "echo park", "los feliz",
            "highland park", "eagle rock", "pasadena", "glendale",
            "burbank", "long beach", "torrance", "el segundo",
            "koreatown", "k-town", "ktown", "little tokyo",
            "usc", "ucla", "csun", "csula", "lmu", # Added Universities as City Proxies
        ],
        "la_neighborhoods_sgv": [
            "alhambra", "monterey park", "arcadia", "san gabriel",
            "rowland heights", "hacienda heights", "temple city",
            "626", "sgv", "san gabriel valley",
        ],
        "oc_cities": [
            "orange county", "irvine", "costa mesa", "newport beach",
            "newport", "huntington beach", "hb", "anaheim", "fullerton",
            "garden grove", "westminster", "little saigon",
            "tustin", "orange", "santa ana", "laguna beach", "laguna",
            "dana point", "san clemente", "mission viejo", "lake forest",
            "aliso viejo", "yorba linda", "brea", "placentia",
            "uci", "csuf", "chapman", # Added Universities
        ],
        "ie_cities": [
            "inland empire", "riverside", "san bernardino", "ontario",
            "rancho cucamonga", "fontana", "redlands", "claremont",
            "upland", "pomona", "corona", "moreno valley",
            "temecula", "murrieta", "chino", "chino hills",
            "ucr", # Added University
        ],
        # NEW: San Diego
        "sd_cities": [
            "san diego", "la jolla", "pacific beach", "pb",
            "north park", "hillcrest", "gaslamp", "downtown sd",
            "convoy", "convoy district", "kearny mesa",
            "encinitas", "carlsbad", "oceanside", "del mar",
            "chula vista", "national city",
            "sdsu", "ucsd", "usd", # Added Universities
        ],
        
        # ========== TIER 4: REGIONAL SOFT (12 pts) ==========
        "regional_soft": [
            "socal", "so cal", "southern california",
            "west coast", "california", "cali",  # NEW: Added California/Cali
        ],
        
        # ========== TIER 5: AREA CODES (8 pts) ==========
        "area_codes": [
            "213", "310", "323", "424", "818", "626", "562",  # LA
            "714", "949", "657",  # OC
            "909", "951", "760",  # IE
            "619", "858",  # SD (NEW)
        ],
    }
    
    # Negative location signals (INSTANT REJECT)
    LOCATION_BLACKLIST = [
        "florida", "miami", "orlando", "tampa",
        "nyc", "new york", "brooklyn", "manhattan",
        "texas", "houston", "dallas", "austin",
        "vegas", "las vegas", "henderson",
        "chicago", "atlanta", "phoenix", "seattle",
        "denver", "boston", "philadelphia",
        "uk", "london", "toronto", "canada",
    ]

    # 2B. Expanded Content Signals
    CONTENT_SIGNALS = {
        # ========== FOOD SIGNALS ==========
        "food_primary": [
            "foodie", "food blogger", "food vlogger", "food creator",
            "food review", "food recs", "food lover",
            "eats", "eating", "hungry", "brunch", "dinner", "lunch",
            "restaurant", "dining", "dessert", "desserts",
            "yelp elite", "local eats",
        ],
        "food_niche": [
            "vegan", "halal", "plant-based", "gluten-free", "keto",
            "mukbang", "asmr food", "food asmr",
            "hidden gems", "hole in the wall", "local finds",
            "brunch spots", "late night eats", "date night",
            "coffee & cafes", "desserts only",
        ],
        "food_specific": [
            "tacos", "sushi", "ramen", "pho", "boba", "matcha",
            "pizza", "burgers", "bbq", "kbbq", "korean bbq",
            "dim sum", "hot pot", "noodles", "dumplings",
        ],
        
        # ========== LIFESTYLE SIGNALS (NEW) ==========
        "lifestyle_primary": [
            "lifestyle", "day in my life", "ditl", "daily vlog",
            "week in my life", "vlog", "vlogger", "digital diary",
            "life update", "come with me", "spend the day",
            "my life", "living in", # Added broad lifestyle signals
        ],
        "lifestyle_local": [
            "local spots", "local guide", "local finds",
            "things to do", "places to go", "hidden gems",
            "exploring", "adventures", "local adventures",
        ],
        
        # ========== COFFEE/CAFE SIGNALS (NEW) ==========
        "coffee_signals": [
            "coffee", "cafe", "café", "matcha", "latte",
            "coffee shop", "coffee spots", "coffee lover",
            "caffeine", "espresso", "barista",
        ],
        
        # ========== CREATOR/FORMAT SIGNALS ==========
        "creator_signals": [
            "content creator", "creator", "ugc", "ugc creator",
            "video creator", "tiktok", "reels", "short form",
            "influencer", "blogger", "vlogger",
        ],
        
        # ========== COLLAB INTENT SIGNALS ==========
        "collab_signals": [
            "dm for collabs", "email for collabs", "open to collabs",
            "collabs", "partnerships", "brand deals", "pr friendly",
            "pr", "collab inquiries", "media kit",
            "📧", "✉️", "📩", "💌",
        ],
        
        # ========== COLLEGE/STUDENT SIGNALS (NEW) ==========
        "college_signals": [
            "uci", "ucla", "usc", "csuf", "csulb", "sdsu",
            "cal state", "uc irvine", "college", "university",
            "student", "grad student", "campus life",
        ],
        
        # ========== FITNESS + FOOD CROSSOVER (NEW) ==========
        "fitness_food_signals": [
            "fitness", "gym", "workout", "healthy eats",
            "meal prep", "macros", "protein", "gains",
            "fit foodie", "healthy lifestyle",
        ],
    }
    
    # 1A: USERNAME BLACKLIST (Business types)
    USERNAME_BLACKLIST = [
        "restaurant", "bakery", "cafe", "café", "kitchen", "catering", "caterer",
        "bistro", "eatery", "grill", "pizzeria", "taqueria", "brewery",
        "taproom", "diner", "creamery", "butcher", "market", "grocer",
        "official", "brand", "shop", "store", "boutique", "supply", "supplies",
        "company", "inc", "ltd", "corporation", "properties", "realestate",
        "realty", "agent", "broker", "law", "legal", "firm", "associates",
        "clinic", "dental", "medical", "doctor", "dr", "md", "dds", "chiro",
        "spa", "salon", "barber", "studio", "nails", "lash", "beautybar",
        "news", "tv", "radio", "magazine", "media",
    ]
    
    USERNAME_WHITELIST_PATTERNS = [
        r'.*eats.*', r'.*food.*', r'.*hungry.*', r'.*belly.*', r'.*taste.*',
        r'.*bites.*', r'.*cravings.*', r'.*nom.*', r'.*yummy.*', r'.*delicious.*',
        r'.*appetite.*', r'.*feast.*', r'.*snack.*', r'.*munch.*', r'.*slurp.*',
        r'.*cook.*', r'.*chef.*', r'.*kitchen.*', r'.*bakery.*', # Sometimes home bakers
        r'.*market.*', # farmers_market_fan
    ]

    PASSING_THRESHOLD = 35

    @classmethod
    def classify_account(cls, bio_text: str, username: str = "", metrics: dict = None, profile_data: dict = None) -> Tuple[bool, str, int]:
        """
        Main evaluation function v3.0
        """
        bio_lower = bio_text.lower() if bio_text else ""
        user = username.lower() if username else ""
        
        # --- STAGE 1: HARD REJECTS ---
        
        # 1A: Username
        if cls.is_bad_username(user):
            return False, f"REJECTED: Bad username '{user}'", 0
        
        # 1B: Negative Location
        for neg in cls.LOCATION_BLACKLIST:
            if neg in bio_lower:
                return False, f"REJECTED: Negative Location '{neg}'", 0
                
        # --- STAGE 2: LOCATION SCORING ---
        loc_score, matched_loc = cls.calculate_location_score(bio_text)
        if loc_score == 0:
             return False, "REJECTED: Not in SoCal", 0
             
        # --- STAGE 3: CONTENT INTEGRITY ---
        passes_content, reason = cls.passes_content_integrity(bio_lower, user)
        if not passes_content:
             return False, f"REJECTED: {reason}", 0
             
        # --- STAGE 4: CONTENT SCORING ---
        content_score, matched_cats = cls.calculate_content_score(bio_lower, user)
        
        # --- STAGE 5: ENGAGEMENT BONUS ---
        eng_bonus = cls._calculate_engagement_bonus(metrics, content_score + loc_score) if metrics else 0
        
        total_score = loc_score + content_score + eng_bonus
        
        if total_score >= cls.PASSING_THRESHOLD:
            return True, f"PASSED: {total_score} pts ({matched_loc}, cats={matched_cats})", total_score
            
        return False, f"FAILED: {total_score} pts", total_score

    @classmethod
    def calculate_location_score(cls, bio_text: str) -> Tuple[int, str]:
        bio_lower = bio_text.lower()
        score = 0
        best_match = ""
        
        # Check Strict Emoji (High Confidence)
        for term in cls.LOCATION_SIGNALS["strict_emoji"]:
            if term in bio_lower:
                return 25, "strict_emoji"
                
        # Check Pipe Format
        for term in cls.LOCATION_SIGNALS["pipe_format"]:
            if term in bio_lower:
                return 22, "pipe_format"
        
        # Check Cities - LA
        for term in cls.LOCATION_SIGNALS["la_cities"]:
            if term in bio_lower:
                return 18, "la_city"
        # Check Cities - OC
        for term in cls.LOCATION_SIGNALS["oc_cities"]:
            if term in bio_lower:
                return 18, "oc_city"
        # Check Cities - SD
        for term in cls.LOCATION_SIGNALS["sd_cities"]:
            if term in bio_lower:
                return 18, "sd_city"
        # Check Cities - IE
        for term in cls.LOCATION_SIGNALS["ie_cities"]:
            if term in bio_lower:
                return 18, "ie_city"
        # Check SGV Neighborhoods
        for term in cls.LOCATION_SIGNALS["la_neighborhoods_sgv"]:
            if term in bio_lower:
                return 18, "sgv_hood"
        
        # Check Area Codes
        for ac in cls.LOCATION_SIGNALS["area_codes"]:
            if ac in bio_lower:
                return 8, "area_code"
                
        # Check Regional Soft (Lowest)
        for term in cls.LOCATION_SIGNALS["regional_soft"]:
            if term in bio_lower:
                 # Special check for 'california' to ensure it's not 'baja california'
                 if "baja" in bio_lower and "california" in term:
                     continue
                 return 12, "regional_soft"

        return 0, ""

    @classmethod
    def calculate_content_score(cls, bio, username):
        combined = (bio + " " + username).lower()
        score = 0
        matched_categories = []
        
        # FOOD SCORING
        if any(kw in combined for kw in cls.CONTENT_SIGNALS["food_primary"]):
            score += 15
            matched_categories.append("food_primary")
        if any(kw in combined for kw in cls.CONTENT_SIGNALS["food_niche"]):
            score += 10
            matched_categories.append("food_niche")
        
        # LIFESTYLE SCORING
        if any(kw in combined for kw in cls.CONTENT_SIGNALS["lifestyle_primary"]):
            score += 15 # Boosted to ensure pass
            matched_categories.append("lifestyle")
        if any(kw in combined for kw in cls.CONTENT_SIGNALS["lifestyle_local"]):
            score += 10
            matched_categories.append("local_discovery")
            
        # COFFEE SCORING
        if any(kw in combined for kw in cls.CONTENT_SIGNALS["coffee_signals"]):
            score += 15 # Boosted (Coffee is a strong signal)
            matched_categories.append("coffee")
            
        # CREATOR SCORING
        if any(kw in combined for kw in cls.CONTENT_SIGNALS["creator_signals"]):
            score += 12 # Boosted
            matched_categories.append("creator")
            
        # COLLAB INTENT
        if any(kw in combined for kw in cls.CONTENT_SIGNALS["collab_signals"]):
            score += 15
            matched_categories.append("collab_ready")
            
        # COLLEGE SCORING
        if any(kw in combined for kw in cls.CONTENT_SIGNALS["college_signals"]):
            score += 12 # Boosted
            matched_categories.append("college")
            
        return score, matched_categories

    @classmethod
    def passes_content_integrity(cls, bio, username):
        combined = (bio + " " + username).lower()
        
        has_food = any(kw in combined for kw in 
            cls.CONTENT_SIGNALS["food_primary"] + 
            cls.CONTENT_SIGNALS["food_niche"] + 
            cls.CONTENT_SIGNALS["food_specific"]
        )
        
        has_lifestyle = any(kw in combined for kw in 
            cls.CONTENT_SIGNALS["lifestyle_primary"] + 
            cls.CONTENT_SIGNALS["lifestyle_local"]
        )
        
        has_coffee = any(kw in combined for kw in cls.CONTENT_SIGNALS["coffee_signals"])
        has_creator = any(kw in combined for kw in cls.CONTENT_SIGNALS["creator_signals"])
        has_college = any(kw in combined for kw in cls.CONTENT_SIGNALS["college_signals"])
        
        if has_food or has_lifestyle or has_coffee or has_college:
            return True, "content_match"
        
        if has_creator:
            return True, "creator_needs_verification" # Will rely on other scores
        
        return False, "no_content_match"

    @classmethod
    def _calculate_engagement_bonus(cls, metrics: dict, bio_score: int) -> int:
        """
        Boost score based on engagement metrics.
        HEAVIEST EMPHASIS: VIEW COUNTS (Viral Reach).
        """
        bonus = 0
        likes = metrics.get("likes", 0)
        comments = metrics.get("comments", 0)
        views = metrics.get("views", 0)
        
        # 1. View Count Hierarchy
        if views > 10000:
            bonus += 20 # Viral status
        elif views > 5000:
            bonus += 15
        elif views > 1000:
            bonus += 10
            
        # 2. Secondary Signals
        if comments >= 5:
            bonus += 5
        
        if likes >= 200:
            bonus += 5
            
        return min(bonus, 30)

    @classmethod
    def is_bad_username(cls, username: str) -> bool:
        user = username.lower()
        for term in cls.USERNAME_BLACKLIST:
            if term in user:
                is_exception = False
                for pattern in cls.USERNAME_WHITELIST_PATTERNS:
                    if re.match(pattern, user):
                        is_exception = True
                        break
                if not is_exception:
                    return True 
        return False
