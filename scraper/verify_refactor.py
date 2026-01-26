from app.pipeline import task_run_full_pipeline, task_discover_hashtag, task_classify_user
from app.discovery import DiscoveryEngine
from app.classifier import Classifier
from app.config import settings

# Mock Data for Dry Run
mock_user = {
    "username": "socal_test_user",
    "biography": "LA Foodie | Tacos & Sushi | DM for collabs",
    "follower_count": 5000,
    "following_count": 500,
    "media_count": 100,
    "is_business": False,
    "is_professional_account": True,
    "category_name": "Food Blogger",
    "start_year": 2020
}

def verify_components():
    print("--- 1. Testing Config ---")
    print(f"RapidAPI Host: {settings.RAPIDAPI_HOST}")
    print(f"Pass Threshold: {settings.PASS_THRESHOLD}")
    
    print("\n--- 2. Testing Classifier ---")
    is_qual, score, signals = Classifier.classify(mock_user)
    print(f"Result: Qualified={is_qual}, Score={score}, Signals={signals}")
    assert is_qual == True, "Mock user should pass"
    
    print("\n--- 3. Testing Orchestrator (Dry Run) ---")
    # We call the task directly (synchronously) for testing
    task_run_full_pipeline(dry_run=True)
    
    print("\n✅ Internal Logic Verification Complete")

if __name__ == "__main__":
    verify_components()
