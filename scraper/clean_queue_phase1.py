import redis
import json
from app.config import Settings

def clean_phase1():
    """
    Scans the Celery Redis queue and removes 'task_discover_hashtag' tasks (Phase 1),
    keeping 'task_classify_user' tasks (Phase 2/Dork Leads).
    """
    settings = Settings()
    r = redis.from_url(settings.CELERY_BROKER_URL, decode_responses=True)
    
    queue_key = 'celery'
    tasks = r.lrange(queue_key, 0, -1)
    
    if not tasks:
        print("Queue is empty.")
        return

    print(f"Scanning {len(tasks)} tasks...")
    
    kept = []
    removed_count = 0
    phase2_count = 0
    
    for raw_task in tasks:
        try:
            task = json.loads(raw_task)
            # Check task name in headers or body usually
            # Celery protocol v2: 'headers': {'task': 'app.pipeline.task_discover_hashtag', ...}
            # Or body might have it? standard is in headers.
            
            headers = task.get('headers', {})
            task_name = headers.get('task') or task.get('task') # fallback
            
            if task_name == 'app.pipeline.task_discover_hashtag':
                removed_count += 1
                # Skip re-adding this
            else:
                if task_name == 'app.pipeline.task_classify_user':
                    phase2_count += 1
                kept.append(raw_task)
                
        except Exception as e:
            # If parse fail, keep it to be safe
            print(f"Error parsing task: {e}")
            kept.append(raw_task)
            
    # Atomic replacement (dangerous if worker is active, but user wants this)
    if removed_count > 0:
        r.delete(queue_key)
        if kept:
            r.rpush(queue_key, *kept) # Push back kept tasks
        print(f"✅ PURGED {removed_count} Phase 1 (Discovery) tasks.")
        print(f"🚀 Kept {phase2_count} Phase 2 (Classification) tasks.")
        print("You can restart the worker now.")
    else:
        print("No Phase 1 tasks found to purge.")

if __name__ == "__main__":
    clean_phase1()
