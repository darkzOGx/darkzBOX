import asyncio
from sqlalchemy.orm import sessionmaker
from sqlalchemy import create_engine
from app.config import settings
from app.models import BlacklistedAccount, Influencer
from app.pipeline import task_classify_user
from loguru import logger

# Setup DB
engine = create_engine(settings.DATABASE_URL)
Session = sessionmaker(bind=engine)

def rescue_leads():
    session = Session()
    
    # 1. Fetch all blacklisted usernames
    # We load them all into memory to avoid cursor issues when deleting
    blacklisted = session.query(BlacklistedAccount).all()
    count = len(blacklisted)
    logger.info(f"Found {count} blacklisted accounts to re-evaluate.")
    
    usernames = [b.username for b in blacklisted]
    session.close() # Close read session
    
    re_processed = 0
    rescued = 0
    still_failed = 0
    
    print(f"{'USERNAME':<25} | {'STATUS':<15}")
    print("-" * 50)

    for username in usernames:
        session = Session()
        
        # 2. DELETE from Blacklist (to allow re-insertion or fresh failure)
        # We must do this, otherwise pipeline will crash on IntegrityError if it tries to blacklist again
        try:
            record = session.query(BlacklistedAccount).filter_by(username=username).first()
            if record:
                session.delete(record)
                session.commit()
        except Exception as e:
            logger.error(f"Error removing {username} from blacklist: {e}")
            session.close()
            continue
            
        session.close()
        
        # 3. Trigger Classification (Synchronously for immediate feedback)
        # We use the Celery task function directly but run it immediately? 
        # Actually task_classify_user is decorated. Calling .delay() queues it.
        # Calling it directly `task_classify_user(username, run_id=999)` runs it locally if eager?
        # No, Celery tasks are callable. But we need to handle the async loop inside it.
        # The task_classify_user function ALREADY creates its own async loop.
        # So we can just call it as a python function!
        
        try:
            # We use a dummy run_id=999 for "Rescue Mission"
            # Note: task_classify_user creates its own session sessions.
            # We need to capture the result. The task doesn't return IsQualified directly, 
            # it returns None or new_usernames? No, classify_user returns None.
            # So we check the DB after to see if they made it to Influencers.
            
            task_classify_user(username, run_id=999)
            
            # Check Result
            session = Session()
            is_winner = session.query(Influencer).filter_by(username=username).first()
            
            if is_winner:
                print(f"{username:<25} | ✅ RESCUED")
                rescued += 1
            else:
                # Did it go back to blacklist?
                is_loser = session.query(BlacklistedAccount).filter_by(username=username).first()
                reason = "Unknown"
                if is_loser:
                    # Parse reason for display?
                    reason = "Failed Filters"
                print(f"{username:<25} | ❌ STILL FAILED")
                still_failed += 1
                
            session.close()
            re_processed += 1
            
        except Exception as e:
            logger.error(f"Failed to process {username}: {e}")
            
    print("-" * 50)
    print(f"Rescue Mission Complete.")
    print(f"Processed: {re_processed}/{count}")
    print(f"Rescued:   {rescued}")
    print(f"Still Bad: {still_failed}")

if __name__ == "__main__":
    rescue_leads()
