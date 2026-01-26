import redis
from config import Config

def reset_system():
    print("🔌 Connecting to Redis...")
    try:
        r = redis.Redis.from_url(Config.CELERY_BROKER_URL)
        r.flushall()
        print("✅ Redis FLUSHED. All queues and 'seen' keys have been cleared.")
        print("   The system is now ready for a fresh run.")
    except Exception as e:
        print(f"❌ Error flushing Redis: {e}")

if __name__ == "__main__":
    reset_system()
