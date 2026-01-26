from app.models import Base
from app.config import settings
from sqlalchemy import create_engine

def reset_db():
    print(f"♻️ Resetting Database: {settings.DATABASE_URL}")
    engine = create_engine(settings.DATABASE_URL)
    Base.metadata.drop_all(engine)
    Base.metadata.create_all(engine)
    print("✅ Database Schema Updated (All tables dropped and recreated).")

if __name__ == "__main__":
    reset_db()
