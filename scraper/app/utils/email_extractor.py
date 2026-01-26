import re
import httpx
from urllib.parse import urlparse
import logging

logger = logging.getLogger(__name__)

class EmailExtractor:
    """
    Extract email from:
    1. Bio text (Regex)
    2. Link in bio (Linktree, etc.)
    3. IG/TikTok Email button (API fields)
    """
    
    EMAIL_REGEX = r'[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}'
    
    # Common link aggregators to parse
    LINK_AGGREGATORS = [
        "linktr.ee", "linkin.bio", "tap.bio", "bio.link",
        "beacons.ai", "hoo.be", "link.bio", "campsite.bio",
        "stan.store", "koji.to", "snipfeed.co",
    ]
    
    @classmethod
    def extract_from_bio(cls, bio_text: str) -> str:
        """Method 1: Direct extraction from bio"""
        if not bio_text:
            return None
        
        matches = re.findall(cls.EMAIL_REGEX, bio_text)
        if matches:
            # Return first valid-looking email
            for email in matches:
                if cls._is_valid_email(email):
                    return email.lower()
        
        return None
    
    @classmethod
    async def extract_from_external_url(cls, external_url: str) -> str:
        """Method 2: Parse link in bio page (Async)"""
        if not external_url:
            return None
        
        try:
            domain = urlparse(external_url).netloc.lower()
            
            # Check if it's a link aggregator or standard site
            # We treat them similarly: Fetch -> Scan for Email
            
            # Use a generic user agent for this fetch
            headers = {
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
            }
            
            async with httpx.AsyncClient(headers=headers, follow_redirects=True, timeout=10.0) as client:
                response = await client.get(external_url)
                if response.status_code == 200:
                    return cls.extract_from_bio(response.text)
                
        except Exception as e:
            logger.warning(f"Error extracting email from URL {external_url}: {e}")
        
        return None
    
    @classmethod
    def extract_from_api(cls, profile_data: dict) -> str:
        """Method 3: Use API business email field"""
        # Instagram Graph API returns public_email for business accounts
        if profile_data.get("public_email"):
            return profile_data["public_email"].lower()
        
        # TikTok API might return contact info
        if profile_data.get("business_email"):
            return profile_data["business_email"].lower()
            
        return None

    @classmethod
    def extract_phone(cls, profile_data: dict) -> str:
        """Method 4: Extract phone from API"""
        if profile_data.get("contact_phone_number"):
            return profile_data["contact_phone_number"]
        return None

    @classmethod
    def extract_address(cls, profile_data: dict) -> dict:
        """Method 5: Extract structured address"""
        if profile_data.get("business_address_json"):
             return profile_data["business_address_json"]
        return None
    
    @classmethod
    async def extract_email(cls, profile_data: dict) -> tuple:
        """
        Main method: Try all extraction methods in order
        Returns: (email, source) or (None, None)
        """
        # Priority 1: API field (Most reliable)
        email = cls.extract_from_api(profile_data)
        if email and cls._is_valid_email(email):
            return email, "api"
        
        # Priority 2: Bio text (Fast)
        bio = profile_data.get("biography", "") or profile_data.get("bio", "")
        email = cls.extract_from_bio(bio)
        if email:
            return email, "bio"
        
        # Priority 3: External URL (Slowest, requires fetch)
        external_url = profile_data.get("external_url") or profile_data.get("website")
        if external_url:
             email = await cls.extract_from_external_url(external_url)
             if email:
                 return email, "link_in_bio"
        
        return None, None
    
    @staticmethod
    def _is_valid_email(email: str) -> bool:
        """Basic email validation blacklist"""
        if not email:
            return False
        
        # Exclude common non-personal emails/junk
        excluded_patterns = [
            "noreply", "no-reply", "support@", "info@", "hello@",
            "contact@", "admin@", "sales@", "help@", "wix.com",
            "sentry.io", "example.com", "domain.com", ".png", ".jpg"
        ]
        
        email_lower = email.lower()
        if any(pattern in email_lower for pattern in excluded_patterns):
            return False
            
        return True
