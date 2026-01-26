# 🕵️ darkZxOG Social Scraper

A comprehensive social media lead discovery platform for finding and qualifying influencers on **Instagram** and **TikTok**. Features Google Dork discovery, intelligent classification, email enrichment, and CSV export.

---

## 📋 Table of Contents

1. [Overview](#overview)
2. [Architecture](#architecture)
3. [Prerequisites](#prerequisites)
4. [Installation](#installation)
5. [Configuration](#configuration)
6. [Quick Start](#quick-start)
7. [Modules](#modules)
8. [Scripts Reference](#scripts-reference)
9. [Database Schema](#database-schema)
10. [Troubleshooting](#troubleshooting)

---

## 🔍 Overview

This platform discovers social media influencers using three strategies:

| Strategy | Platform | Method |
|----------|----------|--------|
| **Google Dorking** | Instagram & TikTok | Searches Google for social profiles using advanced queries |
| **Hashtag Discovery** | Instagram & TikTok | Fetches posts from target hashtags via API |
| **Email Enrichment** | Both | 3-tier system to find creator emails |

### Key Features

- ✅ **Dual Platform Support** - Instagram + TikTok
- ✅ **Intelligent Classification** - Scores users based on bio, location, engagement
- ✅ **Blacklist System** - Never re-processes rejected accounts
- ✅ **Redis Deduplication** - Prevents duplicate API calls
- ✅ **Celery Task Queue** - Async distributed processing
- ✅ **3-Tier Email Finder** - Regex → Linktree → Mobile Emulation
- ✅ **CSV Export** - Export qualified leads anytime

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                        darkZxOG_socialscraper.py                    │
│                         (Unified CLI Interface)                     │
└───────────────────────────────┬─────────────────────────────────────┘
                                │
        ┌───────────────────────┼───────────────────────┐
        ▼                       ▼                       ▼
┌───────────────┐       ┌───────────────┐       ┌───────────────┐
│  Instagram    │       │   TikTok      │       │    Email      │
│  Dorker       │       │   Dorker      │       │  Enrichment   │
└───────┬───────┘       └───────┬───────┘       └───────┬───────┘
        │                       │                       │
        ▼                       ▼                       ▼
┌───────────────────────────────────────────────────────────────────┐
│                        Celery Task Queue                          │
│                         (Redis Broker)                            │
└───────────────────────────────┬───────────────────────────────────┘
                                │
        ┌───────────────────────┼───────────────────────┐
        ▼                       ▼                       ▼
┌───────────────┐       ┌───────────────┐       ┌───────────────┐
│  RapidAPI     │       │  Firecrawl    │       │  Playwright   │
│  (Profiles)   │       │  (Google)     │       │  (Emails)     │
└───────────────┘       └───────────────┘       └───────────────┘
                                │
                                ▼
                    ┌───────────────────────┐
                    │     PostgreSQL        │
                    │   (Leads + Blacklist) │
                    └───────────────────────┘
```

---

## 📦 Prerequisites

| Requirement | Version | Purpose |
|-------------|---------|---------|
| Python | 3.10+ | Runtime |
| Docker Desktop | Latest | Redis & PostgreSQL containers |
| Node.js | 18+ | Playwright browser automation |
| Git | Any | Version control |

### API Keys Required

| Service | Purpose | Get Key |
|---------|---------|---------|
| **RapidAPI** | Instagram & TikTok data | [rapidapi.com](https://rapidapi.com) |
| **Firecrawl** | Google search API | [firecrawl.dev](https://firecrawl.dev) |

---

## 🚀 Installation

### Step 1: Clone & Navigate

```powershell
cd C:\Users\bigbi\socialscrape
```

### Step 2: Start Docker Services

Start **Docker Desktop**, then run:

```powershell
# Start Redis (message broker)
docker run -d --name redis -p 6379:6379 redis:alpine

# Start PostgreSQL (database)
docker run -d --name postgres -p 5432:5432 -e POSTGRES_PASSWORD=postgres -e POSTGRES_DB=socialscrape postgres:15
```

**Verify containers are running:**
```powershell
docker ps
```

### Step 3: Create Python Virtual Environment

```powershell
python -m venv venv
.\venv\Scripts\Activate.ps1
```

### Step 4: Install Dependencies

```powershell
pip install -r requirements.txt
```

If `requirements.txt` doesn't exist, install manually:

```powershell
pip install sqlalchemy psycopg2-binary redis celery httpx loguru pydantic-settings playwright
playwright install chromium
```

### Step 5: Configure Environment

Create a `.env` file in the project root:

```env
# Database
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/socialscrape

# Redis
REDIS_URL=redis://localhost:6379/0
CELERY_BROKER_URL=redis://localhost:6379/0
CELERY_RESULT_BACKEND=redis://localhost:6379/0

# RapidAPI (Instagram)
RAPIDAPI_KEY=your_rapidapi_key_here
RAPIDAPI_HOST=instagram-scraper-api2.p.rapidapi.com

# RapidAPI (TikTok)
TIKTOK_RAPIDAPI_KEY=your_tiktok_rapidapi_key_here
TIKTOK_HOST=tiktok-scraper7.p.rapidapi.com

# Firecrawl (Google Dorking)
FIRECRAWL_API_KEY=your_firecrawl_key_here
FIRECRAWL_CONCURRENCY=1

# Classification Settings
FOLLOWER_MIN=1000
FOLLOWER_MAX=100000
PASS_THRESHOLD=45
```

### Step 6: Initialize Database

```powershell
python apply_migration.py
python migrate_tiktok_db.py
```

### Step 7: Start Celery Worker

Open a **new terminal** and run:

```powershell
.\venv\Scripts\Activate.ps1
.\start_worker.bat
```

Keep this terminal open - it processes all queued tasks.

---

## ⚙️ Configuration

### Target Hashtags

Edit `app/config.py` to customize the hashtags for discovery:

```python
HASHTAGS: List[str] = [
    "lafoodie", "losangelesfood", "socaleats",
    "orangecountyfoodie", "sandiegofood", ...
]
```

### Classification Signals

Edit `app/utils/classifier.py` to adjust:

- **Positive signals** (boost score): `"foodie"`, `"content creator"`, `"DM for collabs"`
- **Negative signals** (reduce score): `"restaurant"`, `"official account"`, `"hiring"`
- **Location markers**: Area codes, city names, neighborhoods

### Dork Queries

- **Instagram**: `app/dork_queries.txt`
- **TikTok**: `app/tiktok_dork_queries.txt`

---

## 🎯 Quick Start

### Launch the Unified CLI

```powershell
python darkZxOG_socialscraper.py
```

This presents an interactive menu:

```
  [1]  🔍 Instagram Dorker  - Find IG leads via Google
  [2]  🎵 TikTok Dorker     - Find TikTok leads via Google
  [3]  📧 Email Enrichment  - Find emails for existing leads
  [4]  📊 Export & Enrich   - Export all + enrich emails
  [5]  👀 View Results      - Quick stats dashboard
  [0]  ❌ Exit
```

### Or Run Individual Scripts

```powershell
# Instagram Discovery
python run_dork_discovery.py

# TikTok Discovery
python run_tiktok_dork.py

# View Results
python view_results.py          # Instagram
python view_tiktok_results.py   # TikTok

# Export to CSV
python export_leads.py          # Instagram
python export_tiktok_leads.py   # TikTok

# Email Enrichment
python run_enrichment.py
```

---

## 📦 Modules

### 1. Google Dork Discovery (`app/dork_discovery.py`)

Uses Firecrawl API to search Google for social media profiles.

**Flow:**
1. Loads queries from `dork_queries.txt` or `tiktok_dork_queries.txt`
2. Executes searches in batches (respects rate limits)
3. Extracts usernames from URLs
4. Deduplicates via Redis
5. Queues for classification

**Runners:**
- `run_dork_discovery.py` - Instagram
- `run_tiktok_dork.py` - TikTok

---

### 2. Hashtag Discovery (`app/discovery.py`, `app/tiktok_discovery.py`)

Fetches posts from target hashtags via RapidAPI.

**Flow:**
1. Calls RapidAPI to get recent posts for each hashtag
2. Extracts usernames from post authors
3. Deduplicates via Redis
4. Queues for classification

---

### 3. Classification Pipeline (`app/pipeline.py`, `app/tiktok_pipeline.py`)

Celery tasks that fetch full profiles and score them.

**Classification Logic:**
- Parses bio for positive/negative signals
- Checks follower count range
- Applies location scoring (SoCal focus)
- Calculates engagement metrics

**Outcomes:**
- **Score ≥ Threshold** → Saved to `influencers` / `tiktok_influencers`
- **Score < Threshold** → Saved to `blacklisted_accounts` / `tiktok_blacklisted_accounts`

---

### 4. Email Enrichment (`app/enrichment.py`)

3-tier system to find creator emails:

| Tier | Method | Speed |
|------|--------|-------|
| 1 | Regex extraction from bio | Instant |
| 2 | Linktree/Beacons.ai scraping | 2-3 sec |
| 3 | Playwright mobile emulation | 5-10 sec |

**Runner:** `run_enrichment.py`

---

### 5. Export System

Exports qualified leads to CSV:

- `export_leads.py` - Instagram leads
- `export_tiktok_leads.py` - TikTok leads
- Option 4 in CLI - Combined export with enrichment

---

## 📜 Scripts Reference

| Script | Purpose |
|--------|---------|
| `darkZxOG_socialscraper.py` | **Main CLI** - unified interface |
| `run_dork_discovery.py` | Instagram Google Dorking |
| `run_tiktok_dork.py` | TikTok Google Dorking |
| `run_enrichment.py` | Email enrichment pipeline |
| `batch_trigger.py` | Instagram hashtag discovery (continuous) |
| `run_tiktok.py` | TikTok hashtag discovery |
| `export_leads.py` | Export Instagram leads to CSV |
| `export_tiktok_leads.py` | Export TikTok leads to CSV |
| `view_results.py` | View Instagram leads in terminal |
| `view_tiktok_results.py` | View TikTok leads in terminal |
| `view_blacklist.py` | View blacklisted accounts |
| `start_worker.bat` | Start Celery worker |
| `apply_migration.py` | Initialize Instagram DB tables |
| `migrate_tiktok_db.py` | Initialize TikTok DB tables |
| `reset_queue_v4.py` | Clear Celery queue |
| `clear_blacklist.py` | Clear blacklist tables |

---

## 🗄️ Database Schema

### Instagram Tables

```
influencers
├── id (PK)
├── username
├── full_name
├── biography
├── follower_count
├── following_count
├── media_count
├── email
├── external_url
├── score
├── matched_signals
├── is_verified
├── is_business
├── city
├── category
└── discovered_at

blacklisted_accounts
├── id (PK)
├── username
├── reason
├── failed_filters
└── blacklisted_at
```

### TikTok Tables

```
tiktok_influencers
├── id (PK)
├── username
├── nickname
├── biography
├── follower_count
├── following_count
├── heart_count
├── video_count
├── email
├── external_url
├── score
├── matched_signals
├── is_verified
└── discovered_at

tiktok_blacklisted_accounts
├── id (PK)
├── username
├── reason
├── failed_filters
└── blacklisted_at
```

---

## 🔧 Troubleshooting

### Docker Containers Not Running

```powershell
docker start redis postgres
```

### Celery Worker Not Processing

1. Check worker is running: Look for active terminal with `.\start_worker.bat`
2. Restart worker with TikTok support:
   ```powershell
   celery -A app.pipeline worker --loglevel=info --pool=solo --include=app.tiktok_pipeline
   ```

### Database Connection Errors

1. Verify PostgreSQL is running: `docker ps`
2. Check `.env` has correct `DATABASE_URL`
3. Re-run migrations: `python apply_migration.py`

### Rate Limit Errors (429)

- **Firecrawl**: Set `FIRECRAWL_CONCURRENCY=1` in `.env`
- **RapidAPI**: Upgrade plan or add delays between requests

### No Results Found

1. Verify API keys are valid
2. Check Celery worker logs for errors
3. Run manual test: `python verify_tiktok_logic.py`

### Reset Everything

```powershell
# Clear Redis (dedup cache)
docker exec redis redis-cli FLUSHALL

# Clear database
python reset_db.py

# Clear Celery queue
python reset_queue_v4.py

# Restart worker
# Close and re-run .\start_worker.bat
```

---

## 📊 Monitoring

### Check Queue Status

```powershell
python check_queue.py
```

### View Processing Stats

```powershell
python darkZxOG_socialscraper.py
# Select option [5] View Results
```

---

## 📝 License

Private project - not for redistribution.

---

## 👤 Author

**darkZxOG** - SoCal Foodie Lead Discovery Platform v1.0

---

*Last updated: December 2025*
