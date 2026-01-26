from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from app.models import Influencer
from app.config import settings
import textwrap

def view_results():
    # Connect to DB
    try:
        engine = create_engine(settings.DATABASE_URL)
        Session = sessionmaker(bind=engine)
        session = Session()
    except Exception as e:
        print(f"Error connecting to database: {e}")
        return

    # Query Top Influencers
    # Updated to use 'score' instead of 'location_score'
    results = session.query(Influencer).order_by(Influencer.score.desc()).limit(20).all()
    
    if not results:
        print("\nNo results found in database yet.")
        print("Make sure the scraper is running and has found targets.")
        return

    print(f"\n{'='*80}")
    print(f"{'TOP 20 CONFIRMED INFLUENCERS':^80}")
    print(f"{'='*80}")
    print(f"{'SCORE':<8} | {'USERNAME':<20} | {'FOLLOWERS':<10} | {'BIO SNIPPET'}")
    print(f"{'-'*80}")
    
    for inf in results:
        # Handle None bio
        bio = inf.biography if inf.biography else ""
        bio_snippet = textwrap.shorten(bio.replace('\n', ' '), width=40, placeholder="...")
        
        # Use updated field names: score, username, follower_count
        # Handle None values for safety
        score = inf.score if inf.score is not None else 0
        followers = inf.follower_count if inf.follower_count is not None else 0
        
        print(f"{score:<8} | {inf.username:<20} | {followers:<10} | {bio_snippet}")
        
    print(f"{'='*80}\n")
    print(f"Total Influencers Found: {session.query(Influencer).count()}")

if __name__ == "__main__":
    view_results()
