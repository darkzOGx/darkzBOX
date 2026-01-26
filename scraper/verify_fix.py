import json
from app.classifier import Classifier
from loguru import logger

def verify():
    # Load the debug data
    with open("debug_diningwithdamian.json", "r", encoding="utf-8") as f:
        data = json.load(f)
        
    # Standardize Field Names as per scraper logic
    # The scraper normally maps 'category' -> 'category_name'
    if "category" in data and "category_name" not in data:
        data["category_name"] = data["category"]

    print(f"Testing Classification for @{data.get('username')}")
    
    is_qualified, score, signals = Classifier.classify(data)
    
    print(f"\n--- RESULT ---")
    print(f"Qualified: {is_qualified}")
    print(f"Score: {score}")
    print(f"Signals: {signals}")
    
    if is_qualified:
        print("\n✅ SUCCESS: User now PASSES the classifier.")
    else:
        print("\n❌ FAILURE: User still FAILS.")

if __name__ == "__main__":
    verify()
