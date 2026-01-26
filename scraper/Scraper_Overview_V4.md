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
# SoCal Foodie Influencer Scraper V4.0 - System Overview

## 1. High-Level Architecture
The system is an elite-grade, asynchronous scraping pipeline designed to identify, classify, and enrich lead data for Southern California food influencers. It operates in **4 Distinct Phases**, orchestrated by **Celery** and backed by **Redis** and **SQLite/PostgreSQL**.

### The 4-Phase Pipeline
1.  **Discovery (Phase 1)**: Scrapes hashtags to find new usernames.
2.  **Classification (Phase 2)**: rigorous 3-tier analysis to score and qualify leads.
3.  **Enrichment (Phase 3)**: Uses headless mobile browsers (Playwright) to extract contact info.
4.  **Orchestration (Phase 4)**: Manages the entire workflow via `ScrapingRun` tracking.

---

## 2. Key Components

### A. Discovery Engine (`app/discovery.py`)
*   **Source**: RapidAPI (Instagram Scraper Stable API).
*   **Logic**: 
    1.  Iterates through configured hashtags (e.g., `#SoCalFoodie`, `#LAEats`).
    2.  Fetches 3 pages of posts per tag.
    3.  **Dedu-plication**: Uses Redis Sets (`seen_usernames`) to ensure we never process the same user twice.
*   **Output**: Stream of unique usernames sent to the Classifier.

### B. 3-Tier Classifier (`app/classifier.py`)
A sophisticated logic engine that filters users based on a point system (Threshold: 40 points).

| Tier | Type | Criteria | Action |
| :--- | :--- | :--- | :--- |
| **Tier 1** | **Hard Filters** | Follower count (500-500k), Privacy check, Business check, Min Media (30). | **Instant Fail** |
| **Tier 2** | **Positive Signals** | SoCal Bio Keywords (+15), Area Codes (+15), "Collab" intent (+10), Professional (+10). | **Add Points** |
| **Tier 3** | **Negative Signals** | "Shipping/Order" keywords (-20), Fan Accounts (-50), Bad Categories (-30). | **Subtract Points** |

### C. Enrichment Engine (`app/enrichment.py`)
*   **Technology**: **Playwright** (Headless Chromium).
*   **Strategy**: Emulates an **iPhone 12 Pro** user agent.
*   **Target**: Navigates to the user's profile and clicks/scrapes the "Email" or "Contact" buttons which are often hidden from standard API calls.
*   **Trigger**: Only runs for **Qualified Leads** that are missing an email address.

### D. Data Models (`app/models.py`)
*   **`Influencer`**: The core lead record. Stores profile metrics, score, `matched_signals` (JSON), and verified contact info.
*   **`ScrapingRun`**: tracks the performance of each pipeline execution (hashtags processed, users discovered vs. qualified).
*   **`BlacklistedAccount`**: Stores rejected users with the specific failure reason (e.g., "Score 25 < 40 | Signals: ['bad_category']").

---

## 3. Configuration & Tech Stack

*   **Config**: `app/config.py` using **Pydantic Settings** for type safety and `.env` management.
*   **Logging**: **Loguru** for structured, colored logs (`scraper.log`).
*   **Queue**: Celery + Redis (Broker & Backend).
*   **Database**: SQLAlchemy (SQLite dev / Postgres prod).

## 4. How to Run

### Start the Worker
The worker handles all async tasks (Discovery, Classification, Enrichment).
```bash
celery -A app.pipeline.CELERY_APP worker --loglevel=INFO --pool=solo
```

### Trigger the Pipeline
Run the orchestrator to start a new job.
```bash
python -c "from app.pipeline import task_run_full_pipeline; task_run_full_pipeline.delay()"
```
