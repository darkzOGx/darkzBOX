import csv
import os
from datetime import datetime
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from app.models import TikTokInfluencer
from app.config import settings
from loguru import logger

def export_tiktok_leads(min_score: int = 0):
    """
    Exports all discovered TikTok Influencers to a CSV file.
    
    Args:
        min_score: Minimum score to include in export (default: 0 = all)
    """
    # 1. Setup DB Connection
    try:
        engine = create_engine(settings.DATABASE_URL)
        Session = sessionmaker(bind=engine)
        session = Session()
    except Exception as e:
        logger.error(f"Database connection failed: {e}")
        return

    # 2. Fetch Data (filtered by score if specified)
    query = session.query(TikTokInfluencer)
    if min_score > 0:
        query = query.filter(TikTokInfluencer.score >= min_score)
    
    leads = query.order_by(TikTokInfluencer.score.desc()).all()
    
    if not leads:
        logger.warning("No TikTok leads found in database to export.")
        return

    # 3. Setup CSV File
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    filename = f"tiktok_leads_export_{timestamp}.csv"
    
    # Define columns (TikTok-specific)
    fieldnames = [
        "username", "nickname", "score",
        "follower_count", "following_count", "heart_count", "video_count",
        "is_verified", "biography", "external_url", 
        "matched_signals", "discovered_at"
    ]
    
    try:
        with open(filename, mode='w', newline='', encoding='utf-8') as f:
            writer = csv.DictWriter(f, fieldnames=fieldnames)
            writer.writeheader()
            
            for lead in leads:
                writer.writerow({
                    "username": lead.username,
                    "nickname": lead.nickname,
                    "score": lead.score,
                    "follower_count": lead.follower_count,
                    "following_count": lead.following_count,
                    "heart_count": lead.heart_count,
                    "video_count": lead.video_count,
                    "is_verified": lead.is_verified,
                    "biography": (lead.biography or "").replace('\n', ' '),
                    "external_url": lead.external_url,
                    "matched_signals": lead.matched_signals,
                    "discovered_at": lead.discovered_at
                })
                
        logger.success(f"✅ Successfully exported {len(leads)} TikTok leads to: {filename}")
        print(f"\n[OUTPUT] File created: {os.path.abspath(filename)}")
        
    except Exception as e:
        logger.error(f"Failed to write CSV: {e}")
    finally:
        session.close()

if __name__ == "__main__":
    import argparse
    parser = argparse.ArgumentParser(description="Export TikTok Leads to CSV")
    parser.add_argument("--min-score", type=int, default=0, help="Minimum score filter (default: 0)")
    args = parser.parse_args()
    
    export_tiktok_leads(min_score=args.min_score)
