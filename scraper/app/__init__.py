from loguru import logger
import sys

# Configure Loguru
logger.remove() # Remove default handler
logger.add(
    sys.stderr,
    format="<green>{time:YYYY-MM-DD HH:mm:ss}</green> | <level>{level: <8}</level> | <cyan>{name}</cyan>:<cyan>{function}</cyan>:<cyan>{line}</cyan> - <level>{message}</level>",
    level="INFO"
)
logger.add("scraper.log", rotation="10 MB", retention="10 days", level="DEBUG")

__all__ = ["logger"]
