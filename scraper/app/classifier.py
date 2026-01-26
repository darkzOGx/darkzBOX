from typing import Tuple, List, Dict, Any, Optional
import re
import time
from loguru import logger
from app.config import settings

class Classifier:
    """
    Tiered classification system to identify "Qualified Leads" (SoCal Food Influencers).
    v5.0 Specs: Pass Threshold = 45.
    """

    # --- POSITIVE SIGNALS (Add Points) ---
    POSITIVE_SIGNALS = {
        # 1. Identity Keywords (+10 point)
        "identity_keywords": (10, [
            "foodie", "food lover", "eats", "food diary", "food adventures", "food journal",
            "eating my way", "food recs", "blogger", "content creator", "lifestyle",
            "creator", "diaries", "influencer", "brunch", "wellness", "explore",
            "adventurer", "travel", "discover"
        ]),
        # 2. Niche Food Keywords (+10 points)
        "niche_food_keywords": (10, [
             "matcha", "coffee", "boba", "ramen", "sushi", "tacos", "pizza", "kbbq",
             "korean bbq", "birria", "poke", "acai", "omakase", "dim sum", "dumplings",
             "noodles", "desserts", "fine dining", "hidden gem", "hidden gems",
             "must try", "best eats", "food crawl", "food tour"
        ]),
        # 3. Aesthetic/Tribe Keywords (+10 points)
        "aesthetic_tribe": (10, [
            "pilates", "yoga", "wellness journey", "clean girl", "that girl",
            "matcha girl", "soft life", "romanticize", "aesthetic", "curated",
            "minimal", "slow living", "farmers market", "sunday reset", "hot girl walk"
        ]),
        # 4. Professional Role (+20 points)
        "professional_role": (20, [
            "UGC", "UGC creator", "recipe developer", "home cook", "food photographer",
            "barista", "reviewer", "social media manager", "content specialist",
            "creative strategist", "brand strategist"
        ]),
        # 5. Location Keywords (+25 points) - Includes Area Codes
        "location_strong": (25, [
            # LA
            "DTLA", "NELA", "WeHo", "Silverlake", "Silver Lake", "Echo Park",
            "Highland Park", "West Adams", "Koreatown", "Ktown", "SGV", "Los Feliz",
            "Frogtown", "Arts District", "Little Tokyo",
            "LA", "Los Angeles", "Hollywood", "Beverly Hills", "Santa Monica",
            "Culver City", "Pasadena", "Glendale", "Burbank", "Long Beach", "Torrance",
            # OC
            "Little Arabia", "Costa Mesa", "Newport", "Huntington", "Laguna",
            "Dana Point", "San Clemente",
            "Orange County", "OC", "Irvine", "Anaheim", "Fullerton", "Tustin", "Mission Viejo",
            # SD
            "North Park", "Convoy", "Convoy District", "La Jolla", "Hillcrest",
            "Little Italy", "Gaslamp", "Pacific Beach", "Encinitas",
            "San Diego", "SD", "Carlsbad", "Oceanside", "Del Mar", "Chula Vista",
            # Regional
            "SoCal", "Southern California", "Inland Empire", "IE", "South Bay", "Westside",
            # Area Codes
            "310", "323", "213", "818", "626", "424", "949", "714", "657",
            "619", "858", "760", "442", "951", "909"
        ]),
        # 6. Intent/Commercial Signals (+20 points)
        "intent_commercial": (20, [
             "collab", "collaborate", "let's collab", "open to collab", "partnership",
             "partner", "brand partner", "brand ambassador", "ambassador",
             "DM for", "inquiries", "business inquiries", "email for", "book me",
             "available for", "work with me", "hire me", "contact for",
             "PR", "PR friendly", "gifted", "sponsored", "media kit", "portfolio",
             "rate card", "managed by", "rep", "talent",
             "LTK", "LikeToKnow.it", "Amazon storefront", "affiliate", "link in bio",
             "💌", "📧", "✉️", "📩"
        ]),
        # 7. Category Signals (+10 points)
        "good_category": (10, [
            "Blogger", "Personal Blog", "Creator", "Video Creator", "Digital Creator",
            "Food Blogger", "Photographer", "Public Figure", "Writer", "Influencer",
            "Content Creator", "Social Media Personality", "Artist", "Editor"
        ])
    }
    
    # --- PHASE 3: VENUE ANCHOR SIGNALS (+15 points) ---
    VENUE_ANCHORS = (15, [
        # LA
        "Villa's Tacos", "Kumquat Coffee", "Cafe de Leche", "Kitchen Mouse",
        "Maydan Market", "Compass Rose", "Yhing Yhang BBQ", "Bestia", "Bavel",
        "Republique", "Grand Central Market", "Smorgasburg LA", "Park's BBQ",
        "Quarters", "Sun Nong Dan",
        # OC
        "Rodeo 39", "Packing District", "Forn Al Hara", "House of Mandi",
        "The Lab", "The Camp", "SteelCraft", "Lido Marina Village",
        # SD
        "Steamy Piggy", "Rakiraki", "Somisomi", "Menya Ultra", "Pigment",
        "Extraordinary Desserts", "Ironside"
    ])

    # --- NEGATIVE SIGNALS (Subtract Points) ---
    NEGATIVE_SIGNALS = {
        # 1. Business Keywords (-25 points)
        "business_keywords": (-25, [
            "shop", "order", "delivery", "shipping", "store", "buy now", "order online",
            "online ordering", "pickup", "takeout", "dine-in", "curbside",
            "menu", "reservations", "book a table", "now open", "grand opening",
            "new location", "catering", "private chef for hire",
            "discount code", "promo code", "use code", "10% off", "20% off",
            "limited time offer", "free shipping", "link in bio to shop",
            "hiring", "we're hiring", "apply now", "join our team", "careers", "job opening",
            "franchise", "wholesale", "distribution", "corporate events", "supplier",
            "vendor", "manufacturer", "ghost kitchen", "cloud kitchen", "commercial kitchen"
        ]),
        # 2. Engagement Pod / Fake Growth (-100 points, Instant Reject)
        "engagement_pod": (-100, [
            "F4F", "L4L", "FxF", "LxL", "Dx3", "follow back", "follow 4 follow",
            "like 4 like", "gain train", "gain", "engagement group", "follow loop",
            "instant follow", "nsd", "mega", "boost", "shoutout for shoutout", "s4s", "SFS"
        ]),
        # 3. Fan/Repost/Aggregator (-75 points)
        "fan_account": (-75, [
            "repost", "regram", "fan page", "fan account", "daily", "spotted", "best of",
            "top posts", "curated by", "features", "submit", "DM to be featured",
            "tag to be featured", "DM for feature", "tag us", "community page",
            "promo", "update page", "archive", "no copyright intended", "credits to owner",
            "all rights to", "dm for credit", "dm to remove", "not my photo",
            "photo by", "credit to", "aggregator", "news page", "vibes", "magazine"
        ]),
        # 4. Non-Target Professions (-30 points)
        "wrong_profession": (-30, [
            "realtor", "real estate", "agent", "broker", "lender", "mortgage",
            "clinic", "medspa", "botox", "salon", "lashes", "brows", "hair", "barber",
            "tattoo", "gym owner", "crossfit box", "coach", "consultant", "lawyer",
            "attorney", "insurance", "financial advisor"
        ]),
        # 5. Bad Categories (-40 points)
        "bad_category": (-40, [
            "Restaurant", "Grocery Store", "Local Business", "Shopping & Retail",
            "Product/Service", "E-commerce Website", "Retail Company",
            "Food Delivery Service", "Food & Beverage Company", "Food Processing",
            "Caterer", "Food Distributor", "Food Wholesaler", "Food Stand",
            "Fast Food Restaurant", "Convenience Store", "Supermarket", "Bakery",
            "Bar", "Cafe", "Food Truck", "Kitchen/Cooking", "Marketing Agency",
            "Advertising Agency", "Media/News Company"
        ]),
        # 6. AI Content (-50 points)
        "ai_content": (-50, [
            "AI Art", "Midjourney", "DALL-E", "AI generated", "virtual influencer",
            "digital human", "CGI model", "tapestry of flavors", "culinary symphony",
            "embarking on a journey"
        ]),
        # 7. Spam/Scam (-100 points)
        "spam_scam": (-100, [
            "NFT", "crypto", "forex", "bitcoin", "invest", "wealth", "trading",
            "passive income", "make money", "get rich", "MLM", "network marketing"
        ])
    }

    # --- TIER 1: HARD FILTERS (Instant Fail) ---
    @classmethod
    def passes_hard_filters(cls, user_data: Dict[str, Any]) -> Tuple[bool, List[str]]:
        fail_reasons = []
        
        # 1. Follower Range
        followers = user_data.get("follower_count", 0)
        if not (settings.FOLLOWER_MIN <= followers <= settings.FOLLOWER_MAX):
            fail_reasons.append(f"Followers ({followers}) outside range {settings.FOLLOWER_MIN}-{settings.FOLLOWER_MAX}")

        # 2. Following/Follower Ratio
        following = user_data.get("following_count", 0)
        if followers > 0:
            ratio = following / followers
            if ratio > settings.FOLLOW_RATIO_MAX:
                fail_reasons.append(f"Follow ratio {ratio:.2f} > {settings.FOLLOW_RATIO_MAX}")
        
        # 3. Privacy
        if user_data.get("is_private"):
            fail_reasons.append("Account is private")

        # 4. Media Count
        media_count = user_data.get("media_count", 0)
        if media_count < settings.MIN_MEDIA_COUNT:
            fail_reasons.append(f"Media count {media_count} < {settings.MIN_MEDIA_COUNT}")
            
        # 5. Business Check (Strict for Restaurants/Stores, but allow 'Creator' businesses)
        # Note: We now handle specific Bad Categories in scoring, so general 'is_business' check
        # might be too broad if not careful. However, 'is_business' + 'Bad Category' is the killer.
        # Spec says: "Food & Beverage (only if NOT business account)"
        # We will Rely on Negative Scores to kill Businesses, removing the hard fail here 
        # UNLESS it is an obvious business account (no specific requirement to hard fail *all* business accounts,
        # just -25 points). BUT, typically scraping influencers implies Personal accounts.
        # Current Logic: Let's remove the boolean is_business hard fail and rely on the -25 point penalty
        # plus the -40 point Bad Category penalty. This is safer for "Creator" business accounts.
        
        # 6. Post Recency Check (14 days)
        # 14 days = 14 * 24 * 3600 = 1,209,600 seconds
        import time
        latest_ts = user_data.get("latest_reel_media") # Integer timestamp
        if latest_ts:
             days_ago = (time.time() - latest_ts) / 86400
             if days_ago > 30:
                 # Soft fail or hard fail? Spec says "Engagement & Quality Filters".
                 # "At least 1 post in last 30 days" implies Hard Filter.
                 fail_reasons.append(f"Inactive: Last post {int(days_ago)} days ago (>30)")
        
        if fail_reasons:
            logger.debug(f"HARD FILTER REJECT @{user_data.get('username')}: {fail_reasons}")
            return False, fail_reasons
            
        return True, []

    @classmethod
    def classify(cls, user_data: Dict[str, Any]) -> Tuple[bool, int, List[str]]:
        # Step 1: Hard Filters
        passes, fail_reasons = cls.passes_hard_filters(user_data)
        if not passes:
            return False, 0, [f"HARD_FAIL: {r}" for r in fail_reasons]
            
        score = 0
        matched = []
        bio = (user_data.get("biography") or "").lower()
        full_name = (user_data.get("full_name") or "").lower()
        username = (user_data.get("username") or "").lower()
        text_content = f"{bio} {full_name} {username}"
        cat = user_data.get("category_name")
        
        # Step 2: Positive Scoring
        for signal_name, (points, keywords) in cls.POSITIVE_SIGNALS.items():
            if any(k.lower() in text_content for k in keywords):
                score += points
                matched.append(signal_name)
        
        # Venue Anchors
        anchor_points, anchor_keywords = cls.VENUE_ANCHORS
        if any(k.lower() in text_content for k in anchor_keywords):
             score += anchor_points
             matched.append("venue_anchor_match")
             
        # Category (Positive)
        if cat:
            if cat in cls.POSITIVE_SIGNALS["good_category"][1]:
                score += 10
                matched.append("good_category")
            elif cat.lower() == "food & beverage" and not user_data.get("is_business"):
                score += 10
                matched.append("good_category_creator")

        # Step 3: Negative Scoring
        for signal_name, (points, keywords) in cls.NEGATIVE_SIGNALS.items():
             if any(k.lower() in text_content for k in keywords):
                score += points
                matched.append(signal_name)
        
        # Category (Negative)
        if cat and cat in cls.NEGATIVE_SIGNALS["bad_category"][1]:
             score += -40
             matched.append("bad_category")
        
        # Final Score
        is_qualified = score >= settings.PASS_THRESHOLD
        
        logger.info(f"Classified @{username}: Score {score} -> {'PASS' if is_qualified else 'FAIL'} (Signals: {matched})")
        
        return is_qualified, score, matched
