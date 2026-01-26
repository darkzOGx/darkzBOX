import csv
import os
from datetime import datetime
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from app.models import Influencer
from app.config import settings
from loguru import logger

def export_leads():
    """
    Exports all discovered Influencers to a CSV file.
    """
    # 1. Setup DB Connection
    try:
        engine = create_engine(settings.DATABASE_URL)
        Session = sessionmaker(bind=engine)
        session = Session()
    except Exception as e:
        logger.error(f"Database connection failed: {e}")
        return

    # 2. Fetch Data
    # Get all influencers, newest first (or highest score)
    leads = session.query(Influencer).order_by(Influencer.score.desc()).all()
    
    if not leads:
        logger.warning("No leads found in database to export.")
        return

    # 3. Setup CSV File
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    filename = f"leads_export_{timestamp}.csv"
    
    # Define columns
    fieldnames = [
        "username", "full_name", "score", "email", 
        "follower_count", "following_count", "media_count", 
        "city", "category", "is_business", "is_verified",
        "biography", "external_url", "matched_signals", "discovered_at"
    ]
    
    try:
        with open(filename, mode='w', newline='', encoding='utf-8') as f:
            writer = csv.DictWriter(f, fieldnames=fieldnames)
            writer.writeheader()
            
            for lead in leads:
                writer.writerow({
                    "username": lead.username,
                    "full_name": lead.full_name,
                    "score": lead.score,
                    "email": lead.email,
                    "follower_count": lead.follower_count,
                    "following_count": lead.following_count,
                    "media_count": lead.media_count,
                    "city": lead.city,
                    "category": lead.category,
                    "is_business": lead.is_business,
                    "is_verified": lead.is_verified,
                    "biography": (lead.biography or "").replace('\n', ' '), # Cleanup bio
                    "external_url": lead.external_url,
                    "matched_signals": lead.matched_signals,
                    "discovered_at": lead.discovered_at
                })
                
        logger.success(f"✅ Successfully exported {len(leads)} leads to: {filename}")
        print(f"\n[OUTPUT] File created: {os.path.abspath(filename)}")
        
    except Exception as e:
        logger.error(f"Failed to write CSV: {e}")
    finally:
        session.close()

if __name__ == "__main__":
    export_leads()
