import redis
from app.config import settings

def reset_queue():
    print(f"🧹 Connecting to Queue (DB 1) at {settings.CELERY_BROKER_URL}...")
    r_queue = redis.from_url(settings.CELERY_BROKER_URL)
    r_queue.flushdb()
    
    print(f"🧹 Connecting to Cache (DB 0) at {settings.REDIS_URL}...")
    r_cache = redis.from_url(settings.REDIS_URL)
    r_cache.flushdb()
    
    print("✅ Flushed BOTH Redis Databases (0 and 1).")

if __name__ == "__main__":
    reset_queue()
