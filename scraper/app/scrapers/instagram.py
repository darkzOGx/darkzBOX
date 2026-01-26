import asyncio
import logging
import httpx
from typing import List, Dict, Optional
from datetime import datetime
from app.config import settings
# from app.models import Influencer # Not strictly used if returning dicts

logger = logging.getLogger(__name__)

class GraphQLScraper:
    """
    Uses RapidAPI 'Instagram Scraper Stable API' (RockSolid APIs) to extract hashtag feeds.
    This replaces direct Instagram scraping to bypass Login Walls.
    """
    
    # Base URL for RockSolid API (PHP-based)
    API_URL = f"https://{settings.RAPIDAPI_HOST}/search_hashtag.php"
    # Pro Endpoints (Verified)
    USER_INFO_URL = f"https://{settings.RAPIDAPI_HOST}/ig_get_fb_profile_v3.php" 
    POST_INFO_URL = f"https://{settings.RAPIDAPI_HOST}/get_media_data_v2.php"
    
    # Location Endpoints
    LOCATION_SEARCH_URL = f"https://{settings.RAPIDAPI_HOST}/search_location.php"
    LOCATION_FEED_URL = f"https://{settings.RAPIDAPI_HOST}/get_location_feed.php"
    
    # Network Endpoints (Verified)
    FOLLOWERS_URL = f"https://{settings.RAPIDAPI_HOST}/get_ig_user_followers_v2.php"
    SIMILAR_URL = f"https://{settings.RAPIDAPI_HOST}/get_ig_similar_accounts.php"

    def __init__(self):
        self.headers = {
            "x-rapidapi-key": settings.RAPIDAPI_KEY,
            "x-rapidapi-host": settings.RAPIDAPI_HOST,
        }
        self.client = httpx.AsyncClient(
            headers=self.headers,
            timeout=30.0
        )

    # ... (existing methods) ...

    async def get_followers(self, user_id: str, count: int = 100) -> List[Dict]:
        """
        Fetches followers for a given User ID.
        Uses verified endpoint: /get_ig_user_followers_v2.php (POST)
        """
        followers = []
        try:
            # Note: Endpoint seems to return ~40-50 per page usually
            # Pagination is via 'end_cursor' inside response body usually
            
            # CRITICAL FIX: Endpoint requires 'search_query' param even if empty
            params = {
                "user_id": user_id, 
                "search_query": "" 
            }
            
            logger.info(f"Fetching followers for {user_id}...")
            response = await self.client.post(self.FOLLOWERS_URL, data=params)
             
            if response.status_code == 200:
                try:
                    data = response.json()
                except Exception as e:
                    logger.error(f"Followers response not JSON: {response.text[:200]}")
                    return []
                
                # Check structure
                # Usually: { "data": { "user": { "edge_followed_by": { "edges": [...] } } } }
                # Or flat list? 
                # Let's handle generic "data" -> "items" or "edges"
                
                items = []
                
                # CRITICAL: Check if response is a direct list
                if isinstance(data, list):
                    items = data
                elif "data" in data:
                     d = data["data"]
                     if "user" in d and "edge_followed_by" in d["user"]:
                         items = d["user"]["edge_followed_by"]["edges"] # Graph structure
                         # Extract node
                         items = [x["node"] for x in items if "node" in x]
                     elif "items" in d:
                         items = d["items"]
                     elif isinstance(d, list):
                         items = d
                elif "items" in data:
                    items = data["items"]
                    
                # Normalize a bit (we need username at least)
                for item in items:
                    u = {
                        "username": item.get("username"),
                        "full_name": item.get("full_name"),
                        "id": item.get("id"),
                        "is_private": item.get("is_private", False),
                        "is_verified": item.get("is_verified", False)
                    }
                    if u["username"]:
                        followers.append(u)
                        
                logger.info(f"Retrieved {len(followers)} followers.")
            else:
                logger.error(f"Followers error {response.status_code}: {response.text}")

        except Exception as e:
            logger.error(f"Error fetching followers for {user_id}: {e}")
            
        return followers

    async def get_similar_accounts(self, username: str) -> List[Dict]:
        """
        Fetches 'Suggested for You' accounts.
        Uses verified endpoint: /get_ig_similar_accounts.php (GET)
        """
        similar = []
        try:
            params = {"username_or_url": username}
            logger.info(f"Fetching similar accounts for @{username}...")
            response = await self.client.get(self.SIMILAR_URL, params=params)
            
            if response.status_code == 200:
                try:
                    data = response.json()
                except Exception:
                    # Often returns HTML or empty string if failed
                    logger.warning(f"Similar accounts response invalid for {username}. (Non-JSON)")
                    return []
                
                # Structure usually: { "items": [...] } or { "data": [...] }
                items = []
                if "items" in data:
                    items = data["items"]
                elif "data" in data and isinstance(data["data"], list):
                    items = data["data"]
                    
                for item in items:
                    u = {
                        "username": item.get("username"),
                        "full_name": item.get("full_name"),
                        "id": item.get("id"),
                        "is_private": item.get("is_private", False),
                        "is_verified": item.get("is_verified", False)
                    }
                    if u["username"]:
                        similar.append(u)
                        
                logger.info(f"Retrieved {len(similar)} similar accounts.")
            else:
                 logger.error(f"Similar accounts error {response.status_code}: {response.text}")
                 
        except Exception as e:
            logger.error(f"Error fetching similar accounts for {username}: {e}")
            
        return similar

    async def initialize_session(self):
        """No session init needed for RapidAPI."""
        pass

    async def scrape_hashtag_feed(self, hashtag: str, pages: int = 1) -> List[Dict]:
        """
        Scrapes posts from a hashtag feed using RapidAPI.
        """
        posts = []
        try:
            # We strip the '#' just in case
            tag = hashtag.lstrip('#').lower()
            params = {"hashtag": tag}
            
            cursor = None
            
            for page in range(pages):
                if cursor:
                    params["end_cursor"] = cursor
                
                logger.info(f"Fetching {tag} (Page {page+1}/{pages})...")
                response = await self.client.get(self.API_URL, params=params)
                
                if response.status_code != 200:
                    logger.error(f"RapidAPI Error {response.status_code}: {response.text}")
                    break
                
                data = response.json()
                
                # Parse RockSolid Response Structure (Graph vs Legacy)
                items = []
                next_cursor = None
                
                # Check for top-level pagination token (Common in this endpoint)
                if "pagination_token" in data:
                    next_cursor = data["pagination_token"]

                # Case 1: Standard Search Response (posts + top_posts)
                if "posts" in data and "edges" in data["posts"]:
                    items.extend(data["posts"]["edges"])
                    # Fallback for cursor if not at top level
                    if not next_cursor and "page_info" in data["posts"]:
                        page_info = data["posts"]["page_info"]
                        if page_info.get("has_next_page"):
                            next_cursor = page_info.get("end_cursor")
                            
                if "top_posts" in data and "edges" in data["top_posts"]:
                     # Add Top Posts (The 9 viral ones)
                     items.extend(data["top_posts"]["edges"])
                
                # Case 2: Direct Edges (Rare but possible)
                elif "edges" in data:
                    items = data["edges"]
                     # Try to find page_info adjacent to edges
                    if "page_info" in data:
                        page_info = data["page_info"]
                        if page_info.get("has_next_page"):
                             if not next_cursor:
                                 next_cursor = page_info.get("end_cursor")

                # Case 3: Legacy "items" list
                elif "items" in data:
                    items = data["items"]
                
                # Case 4: Wrapped "data" object
                elif "data" in data:
                     if isinstance(data["data"], list):
                         items = data["data"]
                     elif isinstance(data["data"], dict):
                         items = data["data"].get("items", [])
                         # Check for cursor in data dict
                         if "page_info" in data["data"]:
                             page_info = data["data"]["page_info"]
                             if page_info.get("has_next_page"):
                                  if not next_cursor:
                                     next_cursor = page_info.get("end_cursor")

                # Normalize Items
                page_posts = []
                dropped_count = 0
                
                for item in items:
                    if "node" in item:
                        item = item["node"]
                        
                    normalized = self._normalize_post(item)
                    if normalized:
                        # --- ENGAGEMENT GATE ---
                        # User Request: Prioritize Comments. Stop processing "dead" posts early.
                        # Rule: Keep if (Comments >= 2) OR (Likes >= 50) OR (Views >= 500)
                        likes = normalized.get("like_count", 0)
                        comments = normalized.get("comment_count", 0)
                        views = normalized.get("view_count", 0)
                        
                        is_engaging = False
                        if comments >= 2: is_engaging = True
                        elif likes >= 50: is_engaging = True
                        elif views >= 500: is_engaging = True
                        
                        if is_engaging:
                            page_posts.append(normalized)
                        else:
                            dropped_count += 1
                        
                posts.extend(page_posts)
                logger.info(f"Found {len(page_posts)} posts on page {page+1}. (Dropped {dropped_count} low engagement)")
                
                # Pagination Logic
                if next_cursor:
                    cursor = next_cursor
                    # Small delay to be nice to the API
                    await asyncio.sleep(1.0)
                else:
                    logger.info("No next page cursor found. Stopping.")
                    break
            
            # --- SORTING REMOVED ---
            # User Feedback: High engagement sorting was prioritizing restaurants/businesses.
            # We now process in API order (Top/Recent mix).
            # posts.sort(key=lambda x: (x.get('like_count', 0) or 0) + (x.get('view_count', 0) or 0), reverse=True)
            
            logger.info(f"RapidAPI: Total {len(posts)} posts for #{tag} after {pages} pages.")
            
        except Exception as e:
            logger.error(f"Error scraping hashtag {hashtag}: {e}")

        return posts

    async def search_location(self, query: str) -> List[Dict]:
        """
        Searches for a location (venue) by name.
        Returns list of dicts with 'id', 'name', 'address', etc.
        """
        try:
            params = {"query": query}
            logger.info(f"Searching location: {query}")
            response = await self.client.get(self.LOCATION_SEARCH_URL, params=params)
            
            if response.status_code == 200:
                data = response.json()
                # Wrapper check
                if "data" in data and isinstance(data["data"], list):
                    return data["data"]
                elif "items" in data:
                    return data["items"]
                elif isinstance(data, list):
                    return data
                return []
            else:
                logger.error(f"Location search failed: {response.status_code} | {response.text}")
                return []
        except Exception as e:
            logger.error(f"Error searching location {query}: {e}")
            return []

    async def scrape_location_feed(self, location_id: str, pages: int = 1) -> List[Dict]:
        """
        Scrapes posts from a specific Location ID.
        """
        posts = []
        try:
            params = {"location_id": location_id}
            cursor = None
            
            for page in range(pages):
                if cursor:
                    params["end_cursor"] = cursor
                
                logger.info(f"Fetching Location {location_id} (Page {page+1}/{pages})...")
                response = await self.client.get(self.LOCATION_FEED_URL, params=params)
                
                if response.status_code != 200:
                    logger.error(f"Location Feed Error {response.status_code}: {response.text}")
                    break
                
                data = response.json()
                items = []
                next_cursor = None
                
                # Normalize Feed Response
                # Usually standard edges structure or items list
                if "data" in data:
                    cdata = data["data"]
                    if "recent_media_sections" in cdata:
                        # Sometimes structured in sections
                        for section in cdata["recent_media_sections"]:
                            if "layout_content" in section and "medias" in section["layout_content"]:
                                for m in section["layout_content"]["medias"]:
                                    if "media" in m: items.append(m["media"])

                    if not items and "items" in cdata:
                        items = cdata["items"]
                    elif not items and "edges" in cdata:
                         items = [e["node"] for e in cdata["edges"]]

                    # Pagination
                    if "page_info" in cdata:
                        if cdata["page_info"].get("has_next_page"):
                            next_cursor = cdata["page_info"].get("end_cursor")

                elif "items" in data:
                    items = data["items"]
                elif "edges" in data:
                     items = [e["node"] for e in data["edges"]]
                
                if not items:
                    # Fallback deep search
                    pass

                # Normalize & Filter
                page_posts = []
                for item in items:
                    normalized = self._normalize_post(item)
                    if normalized:
                        # Same Engagement Gate? 
                        # Maybe lighter for venues since they are already geo-targeted?
                        # Let's keep it consistent: Comments >= 2 OR Likes >= 50
                        likes = normalized.get("like_count", 0)
                        comments = normalized.get("comment_count", 0)
                        
                        if comments >= 1 or likes >= 30: # Slightly relaxed for venues
                            page_posts.append(normalized)

                posts.extend(page_posts)
                logger.info(f"Location {location_id}: Found {len(page_posts)} posts on page {page+1}.")

                if next_cursor:
                    cursor = next_cursor
                    await asyncio.sleep(1.0)
                else:
                    break
                    
        except Exception as e:
            logger.error(f"Error scraping location {location_id}: {e}")
            
        return posts
        """
        Normalizes RapidAPI item to our internal Post structure.
        """
        try:
            code = item.get("code") or item.get("shortcode")
            if not code:
                return None
                
            caption_text = ""
            if "caption" in item and item["caption"]:
                caption_text = item["caption"].get("text", "")
            
            owner = item.get("user", {}) or item.get("owner", {})
            owner_id = owner.get("pk") or owner.get("id")
            
            ts = item.get("taken_at") or item.get("taken_at_timestamp")
            timestamp = datetime.fromtimestamp(ts) if ts else datetime.now()
            
            # Metrics Extraction
            likes = 0
            if "edge_media_preview_like" in item:
                likes = item["edge_media_preview_like"].get("count", 0)
            elif "edge_liked_by" in item:
                likes = item["edge_liked_by"].get("count", 0)
            elif "like_count" in item:
                 likes = item["like_count"]

            comments = 0
            if "edge_media_to_comment" in item:
                 comments = item["edge_media_to_comment"].get("count", 0)
            elif "comment_count" in item:
                 comments = item["comment_count"]

            views = item.get("video_view_count", 0) or item.get("view_count", 0)
            
            return {
                "post_url": f"https://www.instagram.com/p/{code}/",
                "shortcode": code,
                "caption": caption_text,
                "owner_id": str(owner_id) if owner_id else None,
                "timestamp": timestamp,
                "location": item.get("location", {}).get("name") if item.get("location") else None,
                "like_count": likes,
                "comment_count": comments,
                "view_count": views
            }
        except Exception as e:
            logger.warning(f"Failed to normalize post: {e}")
            return None

    async def get_post_info(self, shortcode: str) -> Optional[str]:
        """
        Fetches post details to get the username (Pro Plan feature).
        Uses 'get_media_data_v2.php' with 'media_code'.
        Returns username as string if found.
        """
        try:
            params = {"media_code": shortcode} # Correct pro param
            response = await self.client.get(self.POST_INFO_URL, params=params)
             
            if response.status_code == 200:
                data = response.json()
                
                # Check for various wrapper structures
                item = data
                if "items" in data and data["items"]:
                    item = data["items"][0]
                elif "data" in data:
                     item = data["data"]
                
                owner = item.get("owner") or item.get("user")
                if owner:
                    return owner.get("username")
            elif response.status_code == 429:
                logger.error(f"Quota Exceeded in get_post_info: {response.text}")
            else:
                logger.warning(f"Failed to get post info for {shortcode}: {response.status_code} | {response.text[:100]}")

        except Exception as e:
            logger.error(f"Error fetching post info for {shortcode}: {e}")
        return None

    async def get_user_profile(self, username: str) -> Optional[Dict]:
        """
        Fetches user info via RapidAPI (Pro Plan).
        Uses 'ig_get_fb_profile_v3.php' (Account Data V2) via POST.
        Param: 'username_or_url'
        """
        try:
            # POST Request for Account Data V2
            data = {"username_or_url": username} 
            
            # Note: We use self.client.post here
            response = await self.client.post(self.USER_INFO_URL, data=data)
             
            if response.status_code == 200:
                data = response.json()
                
                # 'ig_get_fb_profile_v3' usually returns the dict directly or in 'data'
                user = data.get("data", data)
                
                biography = user.get("biography", "")
                # Fallback if specific fields are named differently in V2
                if not biography and "about" in user:
                     biography = user["about"].get("text", "")

                return {
                    "username": username,
                    "biography": biography,
                    "full_name": user.get("full_name", ""),
                    "follower_count": user.get("follower_count", 0),
                    "following_count": user.get("following_count", 0),
                    "media_count": user.get("media_count", 0),
                    "is_business": user.get("is_business", False),
                    "is_professional_account": user.get("is_professional_account", False),
                    "is_verified": user.get("is_verified", False),
                    "category_name": user.get("category", ""),
                    "public_email": user.get("public_email"),
                    "contact_phone_number": user.get("contact_phone_number"),
                    "external_url": user.get("external_url"),
                    "city_name": user.get("city_name"),
                    "business_address_json": user.get("business_address_json")
                }
            else:
                 logger.warning(f"Failed to get profile for {username}: {response.status_code} | {response.text[:100]}")
                 
        except Exception as e:
            logger.error(f"Error fetching profile for {username}: {e}")
        return None
