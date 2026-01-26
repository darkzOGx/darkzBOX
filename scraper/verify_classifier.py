from app.classifier import Classifier

# Test Cases from Spec + Original Fails
test_cases = [
    # --- SPEC EXAMPLES ---
    {
        "username": "tasty_tacos_la", 
        "bio": "Best tacos in LA! Order now on DoorDash", 
        "expected": False, 
        "note": "Business signal",
        "profile": {"follower_count": 5000, "following_count": 50, "category_name": "Restaurant", "is_business": True, "media_count": 100}
    },
    {
        "username": "jennys_fashion", 
        "bio": "📍 LA | Fashion & Lifestyle", 
        "expected": False, 
        "note": "No food keywords",
        "profile": {"follower_count": 1000, "following_count": 500, "media_count": 100}
    },
    {
        "username": "mike_eats_la", 
        "bio": "📍 Los Angeles | Always hungry | DM for collabs", 
        "expected": True, 
        "note": "Hard pass signal",
        "profile": {"follower_count": 5000, "following_count": 400, "media_count": 100}
    },
    {
        "username": "foodie_jane", 
        "bio": "LA foodie | hidden gems", 
        "expected": True, 
        "note": "Location + persona + niche",
        "profile": {"follower_count": 2000, "following_count": 200, "media_count": 100}
    },
    {
        "username": "random_user", 
        "bio": "Living my best life in California", 
        "expected": False, 
        "note": "No food keywords",
        "profile": {"follower_count": 100, "following_count": 100, "media_count": 100}
    },
    {
        "username": "sgv_eats", 
        "bio": "626 | Eating my way through SGV 🥟 | Yelp Elite", 
        "expected": True, 
        "note": "Multiple hard pass signals",
        "profile": {"follower_count": 3000, "following_count": 300, "media_count": 100}
    },
    {
        "username": "oc_brunch_queen", 
        "bio": "📍 OC | Brunch spots & coffee ☕ | 📧 collabs", 
        "expected": True, 
        "note": "Strong across all categories",
        "profile": {"follower_count": 4500, "following_count": 400, "media_count": 100}
    },
    {
        "username": "riverside_foodie", 
        "bio": "IE food explorer | local finds | DM me", 
        "expected": True, 
        "note": "Good IE coverage",
        "profile": {"follower_count": 1200, "following_count": 500, "media_count": 100}
    },
    
    # --- ORIGINAL BAD ACTORS (Regression Testing) ---
    {
        "username": "pinkorchidbakerycafe", 
        "bio": "Cakes, pastries...", 
        "expected": False, 
        "note": "Business Username",
        "profile": {"follower_count": 8000, "following_count": 10, "media_count": 100}
    },
    {
        "username": "hannaparfumana", 
        "bio": "Perfume aficionado", 
        "expected": False, 
        "note": "Wrong Niche",
        "profile": {"media_count": 100}
    },
    {
        "username": "orangecountyvegan", 
        "bio": "Vegan eats in OC & LA", 
        "expected": True, 
        "note": "Generic Good Foodie",
        "profile": {"media_count": 100}
    }
]

print(f"{'USERNAME':<25} | {'STATUS':<10} | {'SCORE':<5} | {'REASON'}")
print("-" * 120)

for case in test_cases:
    # Construct complete profile dict as pipeline does
    profile = case.get("profile", {}).copy()
    profile["username"] = case["username"]
    profile["biography"] = case["bio"]
    profile["full_name"] = case["username"] # fallback
    
    # Verify using the REAL classifier
    is_target, score, matched = Classifier.classify(profile)
    
    status = "PASS" if is_target else "FAIL"
    match = is_target == case["expected"]
    match_icon = "✅" if match else "❌"
    
    reason = f"{score} pts (Signals: {matched})"
    
    print(f"{case['username']:<25} | {status:<10} | {score:<5} | {match_icon} {reason}")
    if not match:
        print(f"   >>> EXPECTED: {case['expected']} ({case['note']})")
