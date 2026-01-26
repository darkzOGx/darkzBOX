import re
import logging
from app.scrapers.instagram import GraphQLScraper
from app.utils.classifier import LocationClassifier
from app.utils.email_extractor import EmailExtractor

logger = logging.getLogger(__name__)

class GroupScraper(GraphQLScraper):
    """
    Scraper specialized for finding Communities, Run Clubs, and Social Groups.
    Inherits from GraphQLScraper for fetch logic.
    """
    
    GROUP_KEYWORDS = {
        "run_club": ["run club", "running club", "runners", "athletics club", "track club", "run crew", "running group", "weekly run", "community run"],
        "social_club": ["social club", "supper club", "dinner club", "social", "society", "collective"],
        "hiking": ["hiking", "hikers", "outdoor club", "adventure club"],
        "meetup": ["meetup", "meet up", "gathering", "community"],
        "general": ["club", "group", "association", "league", "crew", "fam"]
    }
    
    ORGANIZATION_TYPES = [
        "Community Organization", 
        "Non-Profit Organization", 
        "Sports Team", 
        "Recreation & Sports Website"
    ]

    async def scrape_groups(self, hashtag: str, pages: int = 1):
        """
        Scrapes a feed looking specifically for groups.
        """
        # Reuse existing scrape logic
        return await self.scrape_hashtag_feed(hashtag, pages)

    @classmethod
    def classify_group(cls, bio_text: str, username: str, profile_data: dict = None) -> tuple:
        """
        Classifies if an account is a valid Phase 4 Group.
        Returns: (is_target, category, city, score)
        """
        if not bio_text:
            return False, None, None, 0
            
        bio_lower = bio_text.lower()
        name_lower = (profile_data.get("full_name") or "").lower()
        category_name = (profile_data.get("category_name") or "").lower()
        
        combined_text = f"{bio_lower} {name_lower} {username.lower()}"
        
        # 1. IDENTIFY CATEGORY
        detected_category = None
        for cat, keywords in cls.GROUP_KEYWORDS.items():
            if any(kw in combined_text for kw in keywords):
                detected_category = cat
                break
        
        if not detected_category:
            # Check Instagram Category Field
            if any(org_type.lower() in category_name for org_type in cls.ORGANIZATION_TYPES):
                detected_category = "community_org"
            else:
                return False, "no_category_match", None, 0

        # 2. CHECK LOCATION (Reusing Classifier Config)
        # We need Strict Location (Tier 1, 2, or 3). Soft signals usually insufficient for groups.
        score = 0
        detected_city = "SoCal"
        
        # Tier 1 (Emoji)
        if any(w in bio_lower for w in LocationClassifier.LOCATION_SIGNALS["strict_emoji"]):
            score += 25
            
        # Tier 2 (Pipe)
        elif any(w in bio_lower for w in LocationClassifier.LOCATION_SIGNALS["pipe_format"]):
            score += 22
            
        # Tier 3 (Specific Cities)
        elif any(w in bio_lower for w in LocationClassifier.LOCATION_SIGNALS["la_cities"]):
            score += 18
            detected_city = "Los Angeles"
        elif any(w in bio_lower for w in LocationClassifier.LOCATION_SIGNALS["oc_cities"]):
            score += 18
            detected_city = "Orange County"
        elif any(w in bio_lower for w in LocationClassifier.LOCATION_SIGNALS["sd_cities"]):
            score += 18
            detected_city = "San Diego"
        
        # Tier 4 (Regional Soft) - NEW: Added for Hiking groups which are often just "SoCal"
        elif any(w in bio_lower for w in LocationClassifier.LOCATION_SIGNALS["regional_soft"]):
            score += 12
            
        # Tier 5 (Area Codes - Strong for local clubs)
        elif any(w in bio_lower for w in LocationClassifier.LOCATION_SIGNALS["area_codes"]):
            score += 10
            
        # Group Threshold: 10 points
        if score >= 10:
            return True, detected_category, detected_city, score
            
        return False, "location_mismatch", None, score
