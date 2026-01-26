import sys
import os

# Ensure we can import from the current directory
sys.path.append(os.getcwd())

from app.utils.classifier import LocationClassifier

def test_classifier():
    print("Testing LocationClassifier...")
    
    # Test Case 1: Perfect SoCal Foodie
    bio1 = "Local Guide 📍 Los Angeles | Foodie & Lifestyle | DM for collabs"
    score1 = LocationClassifier.score_influencer(bio1)
    print(f"Test 1 (Perfect Match): Score={score1} (Expected >= 40)")
    assert score1 >= 40, "Failed to match keywords"
    
    # Test Case 2: Phone Number Detection
    bio2 = "Business inquiries: 310-555-0199 | Eats in LA"
    score2 = LocationClassifier.score_influencer(bio2)
    print(f"Test 2 (Phone + Keyword): Score={score2} (Expected >= 80)")
    assert score2 >= 80, "Failed to match phone + keyword"
    
    # Test Case 3: Geotag Logic
    # 34.0522, -118.2437 is LA
    geotags = [(34.0522, -118.2437)] * 10
    score3 = LocationClassifier.score_influencer("Just a bio", recent_geotags=geotags)
    print(f"Test 3 (Geotags Only): Score={score3} (Expected >= 30)")
    assert score3 >= 30, "Failed to match geotags"
    
    # Test Case 4: Non-Target
    bio4 = "NYC based | Fashion"
    score4 = LocationClassifier.score_influencer(bio4)
    print(f"Test 4 (Non-Target): Score={score4} (Expected 0)")
    assert score4 == 0, "False positive for NYC"
    
    print("ALL TESTS PASSED")

if __name__ == "__main__":
    test_classifier()
