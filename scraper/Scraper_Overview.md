# SoCal Foodie Influencer Scraper - System Overview

## 🎯 Purpose
This system identifies valid **Southern California Food Influencers** on Instagram by finding accounts that:
1.  Post about food/restaurants in LA/OC/SD areas.
2.  Are *human* (not businesses or repost pages).
3.  Are located in Southern California (verified via Bio keywords and location scoring).

## 🏗️ Architecture
The system uses a distributed **Producer-Consumer** architecture to handle high-volume scraping without getting blocked.

### 1. The Brain (Producer)
-   **File:** `batch_trigger.py`
-   **Role:** Runs 24/7. It cycles through a "Tiered Hashtag List" (e.g., `#LAFoodie`, `#OCBrunch`, `#TacosLA`) and pushes scraping tasks to the queue every 2 hours.

### 2. The Queue (Message Broker)
-   **Technology:** Redis (running in Docker)
-   **Role:** Holds the list of hashtags to scrape. This prevents data loss if the scraper crashes.

### 3. The Muscle (Consumer/Worker)
-   **File:** `app/pipeline.py` (Celery Worker)
-   **Role:** Picks tasks from Redis and executes them.
-   **Concurrency:** Runs with `--pool=solo` on Windows (single thread per worker window) to support asyncio.

### 4. The Eyes (Scrapers)
-   **File:** `app/scrapers/instagram.py`
-   **Technology:** Uses **RapidAPI (RockSolid APIs)** to fetch data.
-   **Method:**
    1.  **Feed Scraping:** Gets 100+ posts for a hashtag.
    2.  **Deduplication:** Checks Redis to see if we've already analyzed this user in the last 24h.
    3.  **Profile Fetch:** Gets full user details (Bio, Follower Count, Is Business).

### 5. The Filter (Classifier)
-   **File:** `app/utils/classifier.py`
-   **Role:** The "Judge". It scores every user from 0-100.
    -   **Pass:** Score > 60 (Saving to DB).
    -   **Fail:** Score < 60 (Added to Blacklist).
-   **Criteria:** "LA", "OC", "949", "CALI", "FOODIE", "LIFESTYLE" in bio = Points. "Business", "Store", "Shipping" = Negative Points.

### 6. The Memory (Database)
-   **Technology:** SQLite (currently) or PostgreSQL.
-   **Models:** `Influencer` (Good users), `BlacklistedAccount` (Bad users), `Post` (Content).

---

## 📂 Key Files Map

| File | Purpose |
| :--- | :--- |
| `batch_trigger.py` | The scheduler. Run this to start the loop. |
| `start_worker.bat` | Starts the Celery background worker. |
| `app/pipeline.py` | The specific logic for "What to do with a hashtag". |
| `app/scrapers/instagram.py` | The code that talks to RapidAPI. |
| `app/utils/classifier.py` | The logic that decides who is a "SoCal Foodie". |
| `app/models.py` | Database schema definitions. |
