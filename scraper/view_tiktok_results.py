from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from app.models import TikTokInfluencer, TikTokBlacklistedAccount
from app.config import settings
import textwrap

def view_tiktok_results():
    """View TikTok scraping results in the terminal."""
    # Connect to DB
    try:
        engine = create_engine(settings.DATABASE_URL)
        Session = sessionmaker(bind=engine)
        session = Session()
    except Exception as e:
        print(f"Error connecting to database: {e}")
        return

    # Query Top TikTok Influencers
    results = session.query(TikTokInfluencer).order_by(TikTokInfluencer.score.desc()).limit(20).all()
    
    total_leads = session.query(TikTokInfluencer).count()
    total_blacklisted = session.query(TikTokBlacklistedAccount).count()
    
    print(f"\n{'='*90}")
    print(f"{'TIKTOK LEAD RESULTS':^90}")
    print(f"{'='*90}")
    
    if not results:
        print("\nNo TikTok leads found in database yet.")
        print("Run the TikTok Dork Discovery first: python run_tiktok_dork.py")
    else:
        print(f"{'SCORE':<8} | {'USERNAME':<20} | {'FOLLOWERS':<12} | {'HEARTS':<12} | {'BIO SNIPPET'}")
        print(f"{'-'*90}")
        
        for inf in results:
            bio = inf.biography if inf.biography else ""
            bio_snippet = textwrap.shorten(bio.replace('\n', ' '), width=30, placeholder="...")
            
            score = inf.score if inf.score is not None else 0
            followers = inf.follower_count if inf.follower_count is not None else 0
            hearts = inf.heart_count if inf.heart_count is not None else 0
            
            print(f"{score:<8} | @{inf.username:<19} | {followers:<12,} | {hearts:<12,} | {bio_snippet}")
    
    print(f"{'='*90}")
    print(f"\n📊 SUMMARY:")
    print(f"   Total Qualified Leads: {total_leads}")
    print(f"   Total Blacklisted:     {total_blacklisted}")
    print(f"\n💡 To export leads: python export_tiktok_leads.py")
    print(f"   With filter:     python export_tiktok_leads.py --min-score 30\n")

if __name__ == "__main__":
    view_tiktok_results()
