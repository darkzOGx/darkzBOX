from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from app.models import BlacklistedAccount
from app.config import settings
import pandas as pd

def view_all_blacklisted():
    engine = create_engine(settings.DATABASE_URL)
    
    # Use Pandas for nice formatting
    try:
        df = pd.read_sql(sessionmaker(bind=engine).query(BlacklistedAccount).statement, engine)
        if df.empty:
            print("No blacklisted users found.")
        else:
            print(f"--- ⚫ Blacklisted Users ({len(df)}) ---")
            # Show specific columns
            print(df[['username', 'reason', 'created_at']].to_string(index=False))
            
            # Export option
            df.to_csv("blacklist_export.csv", index=False)
            print("\nSaved full list to 'blacklist_export.csv'")
            
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    view_all_blacklisted()
