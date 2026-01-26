from config import Config
from app.models import Base
from sqlalchemy import create_engine
import logging

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def init_db():
    logger.info(f"Connecting to database at {Config.DATABASE_URI}...")
    engine = create_engine(Config.DATABASE_URI)
    
    logger.info("Creating tables...")
    Base.metadata.create_all(engine)
    logger.info("Tables created successfully.")

if __name__ == "__main__":
    try:
        init_db()
    except Exception as e:
        logger.error(f"Error initializing database: {e}")
        logger.error("Please ensure PostgreSQL is running and the credentials in .env are correct.")
