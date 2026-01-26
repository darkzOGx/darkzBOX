# Instagram API Capabilities Report (via RapidAPI RockSolid)

Based on live inspection of the API responses, here is the complete list of available data points we can extract.

## 1. User Profile Data (`ig_get_fb_profile_v3`)
**Endpoint:** `/ig_get_fb_profile_v3.php`
**Status:** ✅ Working

### 🌟 Valuable Contact & Business Info
These fields are most critical for lead generation.
- `public_email`: (Often available for business accounts)
- `contact_phone_number`: (Available if public contact button is set)
- `biography`: Full bio text (often contains hidden emails/links)
- `external_url`: The "Link in Bio"
- `category_name`: e.g., "Italian Restaurant", "Personal Blog"
- `address_street`, `city_name`, `zip_code`: Physical location data
- `business_address_json`: Structured address data
- `public_phone_country_code`: Country code for phone
- `whatsapp_number`: WhatsApp specific contact

### 📊 Account Metrics & Details
- `follower_count`
- `following_count`
- `media_count`: Total posts
- `is_business`: Boolean (True/False)
- `is_professional_account`: Boolean
- `is_verified`: Blue check status
- `profile_pic_url_hd`: High-res profile image

### 🔍 Hidden / Meta Data
- `fbid`: Facebook ID linked to the account
- `id`: Instagram Numeric ID (PK)
- `username`: Handle
- `full_name`: Display Name
- `is_private`: Boolean
- `pronouns`: (e.g., he/him)

---

## 2. Media / Post Data (`get_media_data_v2`)
**Endpoint:** `/get_media_data_v2.php`
**Status:** ✅ Working

### 📝 Content Details
- `caption`: Full caption text
- `accessibility_caption`: Auto-generated alt text (e.g., "Photo by Foo containing pizza...")
- `taken_at`: Timestamp (Unix)
- `code`: Shortcode (e.g., `C_3D7sOvbT6`)
- `product_type`: e.g., `feed`, `clips` (Reel), `carousel_container`
- `video_duration`: Duration in seconds (if video/reel)

### 📍 Location & Tagging
- `location`: Structured object (`name`, `lat`, `lng`, `address`, `city`)
  - *Crucial for validating "SoCal" location even if bio is vague.*
- `tagged_users`: List of users tagged in the photo (great for finding related accounts/network)
- `coauthor_producers`: Collaborators on the post

### 📈 Engagement Metrics
- `like_count`: Total likes
- `comment_count`: Total comments
- `view_count`: Video views
- `play_count`: Reel plays
- `video_view_count`: Distinct video views

### 🖼️ Visual Assets
- `image_versions2`: List of image URLs at different resolutions
- `video_versions`: List of video URLs (if applicable)
- `carousel_media`: List of items if it's a slide show

---

## 💡 Strategic Opportunities
1.  **Ghost Email Extraction**: We scan not just `public_email`, but also regex scan `biography` and `external_url` (Linktree parsing).
2.  **Location Triangulation**: If `city_name` is missing in profile, we can check the `location` field on their last 5 posts to place them in SoCal.
3.  **Affiliate Detection**: Scan `biography` for keywords like "Code:", "Ambassador", "Collab" which are often distinct fields or patterns.
4.  **Network Mapping**: Use `tagged_users` in `media` to find their "Squad" or other local influencers they hang out with.
