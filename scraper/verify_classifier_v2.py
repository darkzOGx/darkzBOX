from app.utils.classifier import LocationClassifier

def test_classifier():
    print("Testing Classifier V3.0 Logic...\n")

    # 1. Restaurant: is_business=True, No Creator Keywords -> SHOULD FAIL
    restaurant_profile = {"is_business": True, "category_name": "Italian Restaurant"}
    restaurant_bio = "Best Pasta in LA 🍝 Open Daily. 📍 Los Angeles"
    passed, reason, score = LocationClassifier.classify_account(restaurant_bio, "pasta_la", metrics={"likes": 100}, profile_data=restaurant_profile)
    print(f"Restaurant Test: {'✅ PASSED (Unexpected)' if passed else '❌ REJECTED (Expected)'} | {reason}")

    # 2. Florida User: "Florida Foodie" -> SHOULD FAIL (Negative Location)
    fl_bio = "Florida Foodie 🌴. Miami Eats."
    passed, reason, score = LocationClassifier.classify_account(fl_bio, "miamieats", metrics={"likes": 50})
    print(f"Florida Test: {'✅ PASSED (Unexpected)' if passed else '❌ REJECTED (Expected)'} | {reason}")

    # 3. College Student: "USC Student" -> SHOULD PASS (New V3 Signal)
    usc_bio = "USC '25 ✌️ | 📍 Los Angeles"
    passed, reason, score = LocationClassifier.classify_account(usc_bio, "trojan_eats", metrics={"likes": 100})
    print(f"College Test: {'✅ PASSED (Expected)' if passed else '❌ REJECTED (Unexpected)'} | {reason} (Score: {score})")

    # 4. San Diego Coffee: "Coffee in SD" -> SHOULD PASS (New Location + Coffee Signal)
    sd_bio = "Coffee lover based in SD ☕️ | Gaslamp Quarter"
    passed, reason, score = LocationClassifier.classify_account(sd_bio, "sd_coffee_lover", metrics={"likes": 100})
    print(f"SD Coffee Test: {'✅ PASSED (Expected)' if passed else '❌ REJECTED (Unexpected)'} | {reason} (Score: {score})")

    # 5. Fitness Vlogger: "Fitness in LA" -> SHOULD PASS (Fitness + Location)
    fit_bio = "Fitness & Lifestyle. Gym rat. 📍 Los Angeles"
    passed, reason, score = LocationClassifier.classify_account(fit_bio, "la_fit_fam", metrics={"likes": 100})
    print(f"Fitness Test: {'✅ PASSED (Expected)' if passed else '❌ REJECTED (Unexpected)'} | {reason} (Score: {score})")
    
    # 6. Lifestyle: "Daily Vlog + OC" -> SHOULD PASS
    life_bio = "Daily vlogs & aesthetics. ✨ OC based."
    passed, reason, score = LocationClassifier.classify_account(life_bio, "oc_vlogger", metrics={"likes": 100})
    print(f"Lifestyle Test: {'✅ PASSED (Expected)' if passed else '❌ REJECTED (Unexpected)'} | {reason}")

    # 7. Viral Video Priority: Marginal Bio + High Views -> SHOULD PASS
    # Bio: "My life in SoCal" (Content 15 + Loc 12 = 27 -> FAIL)
    # Views: 15k (+20 bonus) -> Total 47 -> PASS
    viral_bio = "My life in SoCal" 
    passed, reason, score = LocationClassifier.classify_account(viral_bio, "viral_guy", metrics={"likes": 100, "views": 15000})
    print(f"Viral Video Test: {'✅ PASSED (Expected)' if passed else '❌ REJECTED (Unexpected)'} | {reason} (Score: {score})")

    # 8. Pure Creator (No Location) -> SHOULD FAIL
    creator_bio = "UGC Creator | DM for Collabs. 📧"
    passed, reason, score = LocationClassifier.classify_account(creator_bio, "ugc_girl", metrics={"likes": 100})
    print(f"No Location Test: {'✅ PASSED (Unexpected)' if passed else '❌ REJECTED (Expected)'} | {reason}")

if __name__ == "__main__":
    test_classifier()
