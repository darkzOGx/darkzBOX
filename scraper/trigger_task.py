import sys
import os

# Add project root to path
sys.path.append(os.getcwd())

try:
    from app.pipeline import scrape_instagram_feed
    print("Successfully imported task.")
    # Trigger the task
    result = scrape_instagram_feed.delay("#SoCalFoodie")
    print(f"Task ID: {result.id}")
    print("Task sent to queue. Waiting for results...")
    
    # Wait for the task to complete and get the return value
    output = result.get(timeout=30)
    print("\n=== Task Result ===")
    print(output)
    print("===================")
except ImportError as e:
    print(f"Import Error: {e}")
except Exception as e:
    print(f"Runtime Error: {e}")
