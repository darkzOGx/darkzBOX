
from app.utils.classifier import LocationClassifier

def test_tier3_logic():
    print("Testing Tier 3 Hyper-Targeting Logic...\n")
    
    test_bios = [
        ("Generic User", "I love food and travel.", 0),
        ("Target: Persona", "Just a girl who loves food", 5),
        ("Target: Location", "📍 Los Angeles based", 10),
        ("Target: Collab", "DM for collabs", 10),
        ("Super Target", "📍 LA | OC | Foodie | DM for collabs", 25) # 10 loc + 5 persona(foodie) + 10 collab
    ]
    
    for name, bio, expected_min in test_bios:
        score = LocationClassifier.score_influencer(bio)
        print(f"[{name}]")
        print(f"Bio: {bio}")
        print(f"Score: {score} (Expected >= {expected_min})")
        
        if score >= expected_min:
            print("PASS ✅\n")
        else:
            print("FAIL ❌\n")

if __name__ == "__main__":
    test_tier3_logic()
