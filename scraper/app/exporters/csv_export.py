import csv
import os
import textwrap
from datetime import datetime
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from app.models import Influencer
from config import Config

def extract_first_name(display_name):
    """
    Extract first name from display name
    "Sarah Chen | LA Foodie" -> "Sarah"
    "Mike's Food Adventures" -> "Mike"
    """
    if not display_name:
        return ""
    
    # Remove emojis (basic strip)
    # Ideally use regex or emoji lib, but basic text split works for 90%
    
    # Remove common suffixes / separators
    name = display_name.split("|")[0].strip()
    name = name.split("•")[0].strip()
    name = name.split("-")[0].strip()
    name = name.split("✨")[0].strip()
    
    # Get first word (likely first name)
    parts = name.split()
    if not parts:
        return ""
        
    first_word = parts[0]
    
    # Remove possessives
    first_word = first_word.replace("'s", "").replace("’s", "")
    
    # Heuristic: Check if it looks like a name (Capitalized, not ALL CAPS if > 3 chars)
    if not first_word.isalpha():
        return "" # Skip "100%" or numbers
        
    return first_word.capitalize()

def export_influencers(filename=None):
    """
    Export influencers to CSV.
    """
    if filename is None:
        filename = f"influencers_export_{datetime.now().strftime('%Y%m%d_%H%M')}.csv"
    
    try:
        engine = create_engine(Config.DATABASE_URI)
        Session = sessionmaker(bind=engine)
        session = Session()
        
        results = session.query(Influencer).order_by(Influencer.location_score.desc()).all()
        
        print(f"Exporting {len(results)} influencers to {filename}...")
        
        fieldnames = [
            "username",
            "first_name",
            "email",
            "email_source",
            "platform",
            "location_score",
            "persona_type",
            "categories",
            "follower_count",
            "avg_views",
            "profile_url",
            "bio"
        ]
        
        with open(filename, 'w', newline='', encoding='utf-8') as f:
            writer = csv.DictWriter(f, fieldnames=fieldnames)
            writer.writeheader()
            
            for inf in results:
                # Handle potential nulls
                cats = inf.matched_categories if inf.matched_categories else []
                if isinstance(cats, list):
                    cat_str = ",".join(cats)
                else:
                    cat_str = str(cats)

                writer.writerow({
                    "username": inf.username,
                    "first_name": extract_first_name(inf.display_name),
                    "email": inf.email or "",
                    "email_source": inf.email_source or "",
                    "platform": inf.platform,
                    "location_score": inf.location_score,
                    "persona_type": inf.persona_type or "Unknown",
                    "categories": cat_str,
                    "follower_count": inf.followers,
                    "avg_views": round(inf.avg_views or 0, 1),
                    "profile_url": inf.profile_url,
                    "bio": (inf.bio_text or "")[:500].replace('\n', ' '), # Clean bio
                })
        
        print(f"✅ Export Complete: {filename}")
        return filename
        
    except Exception as e:
        print(f"❌ Export Failed: {e}")
        return None
    finally:
        session.close()

if __name__ == "__main__":
    export_influencers()
