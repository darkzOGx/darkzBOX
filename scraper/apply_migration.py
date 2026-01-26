from sqlalchemy import create_engine, text
from config import Config

def apply_migration():
    print("Applying V3 Schema Updates to Database...")
    
    try:
        engine = create_engine(Config.DATABASE_URI)
        
        with engine.connect() as conn:
            # Transaction 1: Add Columns
            sqls = [
                "ALTER TABLE influencers ADD COLUMN IF NOT EXISTS matched_categories JSON;",
                "ALTER TABLE influencers ADD COLUMN IF NOT EXISTS persona_type VARCHAR(100);",
                "ALTER TABLE influencers ADD COLUMN IF NOT EXISTS email VARCHAR(255);",
                "ALTER TABLE influencers ADD COLUMN IF NOT EXISTS email_source VARCHAR(50);",
                "ALTER TABLE influencers ADD COLUMN IF NOT EXISTS display_name VARCHAR(255);",
                "ALTER TABLE influencers ADD COLUMN IF NOT EXISTS avg_views FLOAT DEFAULT 0;",
                "ALTER TABLE influencers ADD COLUMN IF NOT EXISTS avg_views FLOAT DEFAULT 0;",
                "ALTER TABLE influencers ADD COLUMN IF NOT EXISTS engagement_consistency FLOAT DEFAULT 0;",
                # V3.1 Migration
                "ALTER TABLE influencers ADD COLUMN IF NOT EXISTS phone_number VARCHAR(50);",
                "ALTER TABLE influencers ADD COLUMN IF NOT EXISTS category_name VARCHAR(100);",
                "ALTER TABLE influencers ADD COLUMN IF NOT EXISTS is_business BOOLEAN DEFAULT FALSE;",
                "ALTER TABLE influencers ADD COLUMN IF NOT EXISTS address_json JSON;",
                "ALTER TABLE influencers ADD COLUMN IF NOT EXISTS city VARCHAR(100);",
                "ALTER TABLE influencers ADD COLUMN IF NOT EXISTS zip_code VARCHAR(20);",
            ]
            
            for sql in sqls:
                print(f"Executing: {sql}")
                conn.execute(text(sql))
                
            # Transaction 2: Create Groups Table (Phase 4)
            print("Creating 'groups' table...")
            create_groups_sql = """
            CREATE TABLE IF NOT EXISTS groups (
                id SERIAL PRIMARY KEY,
                platform VARCHAR(50) DEFAULT 'Instagram',
                username VARCHAR(255) NOT NULL UNIQUE,
                name VARCHAR(255),
                profile_url VARCHAR(512) NOT NULL,
                member_count INTEGER DEFAULT 0,
                description TEXT,
                category VARCHAR(100),
                city VARCHAR(100),
                email VARCHAR(255),
                created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
                updated_at TIMESTAMP WITH TIME ZONE
            );
            """
            conn.execute(text(create_groups_sql))

            conn.commit()
            
        print("✅ Migration Complete.")
    except Exception as e:
        print(f"❌ Migration Failed: {e}")

if __name__ == "__main__":
    apply_migration()
