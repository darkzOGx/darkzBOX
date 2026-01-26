from app.pipeline import task_run_full_pipeline

if __name__ == "__main__":
    print("🚀 Triggering V4 Scraper Pipeline...")
    # Trigger the task asynchronously
    task = task_run_full_pipeline.delay()
    print(f"✅ Pipeline started! Task ID: {task.id}")
    print("Monitor progress in the Celery Worker terminal.")
