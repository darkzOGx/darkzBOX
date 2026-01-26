from sqlalchemy import Column, Integer, String, Boolean, DateTime, Float, Text, JSON
from sqlalchemy.orm import declarative_base
from datetime import datetime

Base = declarative_base()

class Influencer(Base):
    __tablename__ = "influencers"
    
    id = Column(Integer, primary_key=True)
    username = Column(String(64), unique=True, nullable=False, index=True)
    full_name = Column(String(128))
    biography = Column(Text)
    
    # Metrics
    follower_count = Column(Integer)
    following_count = Column(Integer)
    media_count = Column(Integer)
    engagement_rate = Column(Float)
    
    # Contact Info (Unified Phase 1 & 3)
    email = Column(String(256), index=True)
    phone = Column(String(32))
    whatsapp = Column(String(32))
    external_url = Column(String(512))
    
    # Classification & V3 Logic
    category = Column(String(64)) # e.g. "Blogger"
    city = Column(String(64))
    zip_code = Column(String(20)) # Added from previous V3 work
    address_json = Column(JSON)   # Added from previous V3 work
    
    score = Column(Integer)
    matched_signals = Column(JSON)  # List of signal strings
    
    # Flags
    is_professional = Column(Boolean, default=False)
    is_business = Column(Boolean, default=False)
    is_verified = Column(Boolean, default=False)
    email_enriched = Column(Boolean, default=False) # True if Playwright found it
    is_socal_foodie = Column(Boolean, default=False)
    
    # Timestamps
    discovered_at = Column(DateTime, default=datetime.utcnow)
    enriched_at = Column(DateTime, nullable=True)
    
    def __repr__(self):
        return f"<Influencer @{self.username} | {self.follower_count} followers | score={self.score}>"


class BlacklistedAccount(Base):
    __tablename__ = "blacklisted_accounts"
    
    id = Column(Integer, primary_key=True)
    username = Column(String(64), unique=True, nullable=False, index=True)
    reason = Column(String(256))  # e.g., "HARD_FILTER: is_business=True"
    failed_filters = Column(JSON)  # Detailed breakdown
    created_at = Column(DateTime, default=datetime.utcnow)


class ScrapingRun(Base):
    __tablename__ = "scraping_runs"
    
    id = Column(Integer, primary_key=True)
    started_at = Column(DateTime, default=datetime.utcnow)
    completed_at = Column(DateTime, nullable=True)
    status = Column(String(32), default="running")  # running, completed, failed
    
    # Counts
    hashtags_processed = Column(Integer, default=0)
    users_discovered = Column(Integer, default=0)
    users_classified = Column(Integer, default=0)
    users_qualified = Column(Integer, default=0)
    users_enriched = Column(Integer, default=0)
    
    # Config snapshot
    config_snapshot = Column(JSON)  # Store filter thresholds used


class TikTokInfluencer(Base):
    __tablename__ = "tiktok_influencers"
    
    id = Column(Integer, primary_key=True)
    username = Column(String(64), unique=True, nullable=False, index=True)
    nickname = Column(String(128))
    biography = Column(Text)
    
    # Metrics
    follower_count = Column(Integer)
    following_count = Column(Integer)
    heart_count = Column(Integer) # Likes
    video_count = Column(Integer)
    
    # Contact Info
    email = Column(String(256), index=True)
    external_url = Column(String(512))
    
    # Classification
    score = Column(Integer)
    matched_signals = Column(JSON)
    
    # Flags
    is_business = Column(Boolean, default=False)
    is_verified = Column(Boolean, default=False)
    
    # Timestamps
    discovered_at = Column(DateTime, default=datetime.utcnow)
    
    def __repr__(self):
        return f"<TikTokInfluencer @{self.username} | {self.follower_count} followers>"


class TikTokBlacklistedAccount(Base):
    __tablename__ = "tiktok_blacklisted_accounts"
    
    id = Column(Integer, primary_key=True)
    username = Column(String(64), unique=True, nullable=False, index=True)
    reason = Column(String(256))
    failed_filters = Column(JSON)
    created_at = Column(DateTime, default=datetime.utcnow)


