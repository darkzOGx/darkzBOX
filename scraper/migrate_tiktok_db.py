
from app.models import Base, TikTokInfluencer, TikTokBlacklistedAccount
from app.config import settings
from sqlalchemy import create_engine

def migrate():
    print("Migrating Database for TikTok...")
    engine = create_engine(settings.DATABASE_URL)
    Base.metadata.create_all(engine)
    print("Migration Complete. TikTok tables created.")

if __name__ == "__main__":
    migrate()
