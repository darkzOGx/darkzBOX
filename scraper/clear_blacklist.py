from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from app.models import BlacklistedAccount
from app.config import settings

def clear_all_blacklist():
    print(f"♻️ Clearing Blacklist from: {settings.DATABASE_URL}")
    engine = create_engine(settings.DATABASE_URL)
    Session = sessionmaker(bind=engine)
    session = Session()
    
    try:
        rows_deleted = session.query(BlacklistedAccount).delete()
        session.commit()
        print(f"✅ Deleted {rows_deleted} users from the Blacklist.")
    except Exception as e:
        print(f"❌ Error: {e}")
        session.rollback()
    finally:
        session.close()

if __name__ == "__main__":
    clear_all_blacklist()
