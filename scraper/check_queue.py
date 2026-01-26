import redis
from config import Config

def check_queue():
    try:
        r = redis.from_url(Config.CELERY_BROKER_URL)
        # Celery default queue key is usually 'celery'
        queue_len = r.llen('celery')
        print(f"✅ Connection successful.")
        print(f"📊 Pending Tasks in Queue: {queue_len}")
        
        # specific check for the user's question
        if queue_len > 0:
            print("🚀 The system is NOT stopped. The Worker just needs to pick them up.")
            print("   (Ensure you are running with --pool=solo on Windows)")
        else:
            print("⚠️ Queue is empty. Re-run batch_trigger.py")
            
    except Exception as e:
        print(f"❌ Error connecting to Redis: {e}")

if __name__ == "__main__":
    check_queue()
