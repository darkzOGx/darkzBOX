from sqlalchemy import create_engine
from app.models import Base, BlacklistedAccount
from config import Config

def create_tables():
    print(f"Connecting to database at {Config.DATABASE_URI}...")
    engine = create_engine(Config.DATABASE_URI)
    
    print("Creating tables if they don't exist...")
    # This will strictly create tables that are missing. It won't modify existing ones.
    Base.metadata.create_all(engine)
    
    print("✅ Tables created successfully.")
    print("Verifying BlacklistedAccount table...")
    
    try:
        from sqlalchemy import inspect
        inspector = inspect(engine)
        tables = inspector.get_table_names()
        if 'blacklisted_accounts' in tables:
             print("✅ 'blacklisted_accounts' table exists.")
        else:
             print("❌ 'blacklisted_accounts' table was NOT created.")
    except Exception as e:
        print(f"⚠️ Could not verify table existence: {e}")

if __name__ == "__main__":
    create_tables()
