
from typing import Tuple, List, Dict, Any
from loguru import logger
from app.config import settings

class TikTokClassifier:
    """
    Classification system for TikTok Influencers.
    Adapted from Instagram Classifier.
    """
    
    # --- POSITIVE SIGNALS (Add Points) ---
    POSITIVE_SIGNALS = {
        # Identity
        "identity_keywords": (10, [
            "foodie", "eats", "food review", "food lover", "tasting",
            "cook", "chef", "baking", "recipe", "mukbang",
            "ugc", "creator", "influencer", "lifestyle"
        ]),
        # Niche
        "niche_keywords": (10, [
            "matcha", "boba", "sushi", "tacos", "kbbq", "hotpot",
            "ramen", "birria", "street food", "hidden gems", "la food",
            "oc food", "sd food", "socal food", "food hacks"
        ]),
        # Location (Strong)
        "location_strong": (25, [
            "los angeles", "la", "dtla", "hollywood", "santa monica",
            "orange county", "oc", "irvine", "anaheim", "huntington beach", 
            "san diego", "sd", "convoy", "north park", "socal", "california"
        ]),
        # Intent
        "intent_commercial": (20, [
            "collab", "partnership", "promo", "dm for", "email", "gmail",
            "business", "inquiries", "link in bio", "storefront", "amazon"
        ])
    }
    
    # --- NEGATIVE SIGNALS (Subtract Points) ---
    NEGATIVE_SIGNALS = {
        "business": (-25, [
            "official page", "brand", "company", "store", "shop", "app", 
            "delivery", "shipping", "order now"
        ]),
        "spam": (-50, [
            "crypto", "invest", "forex", "money", "betting", "casino"
        ])
    }
    
    @classmethod
    def classify(cls, user_data: Dict[str, Any]) -> Tuple[bool, int, List[str]]:
        """
        Returns (is_qualified, score, matched_signals)
        """
        fail_reasons = []
        stats = user_data.get("stats", {})
        
        # 1. Hard Filters
        followers = stats.get("followerCount", 0)
        following = stats.get("followingCount", 0)
        videos = stats.get("videoCount", 0)
        
        # Min Followers (Use same config/ratio or looser for TikTok?)
        # TikTok followers usually higher. Let's stick to Config limits for now or adjust.
        # Let's say Min 500 like IG.
        if not (settings.FOLLOWER_MIN <= followers):
             fail_reasons.append(f"Followers {followers} < {settings.FOLLOWER_MIN}")
             
        # Max Followers? (Maybe skip max check for TikTok as viral counts are high?)
        # Let's keep MAX check if we want micro-influencers only, but maybe bump it.
        # For now, use same config.
        if followers > settings.FOLLOWER_MAX:
            fail_reasons.append(f"Followers {followers} > {settings.FOLLOWER_MAX}")
            
        if videos < 5:
            fail_reasons.append(f"Video count {videos} < 5")
            
        if fail_reasons:
             # Fast Fail
             return False, 0, [f"HARD_FAIL: {r}" for r in fail_reasons]
             
        # 2. Scoring
        score = 0
        matched = []
        
        bio = (user_data.get("signature") or "").lower()
        nickname = (user_data.get("nickname") or "").lower()
        unique_id = (user_data.get("unique_id") or "").lower()
        text_content = f"{bio} {nickname} {unique_id}"
        
        # Positive
        for signal_name, (points, keywords) in cls.POSITIVE_SIGNALS.items():
            if any(k in text_content for k in keywords):
                score += points
                matched.append(signal_name)
                
        # Negative
        for signal_name, (points, keywords) in cls.NEGATIVE_SIGNALS.items():
            if any(k in text_content for k in keywords):
                score += points
                matched.append(signal_name)
        
        # 3. Final Check
        is_qualified = score >= settings.PASS_THRESHOLD
        
        return is_qualified, score, matched
