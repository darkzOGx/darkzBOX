from app.scrapers.groups import GroupScraper

def test_groups():
    print("Testing Group Scraper Logic...\n")

    # 1. LA Run Club: Explicit match + Location
    run_club_bio = "Weekly run in Downtown LA. All paces welcome. 📍 DTLA"
    run_club_name = "Keep It Run Hundred"
    is_target, category, city, score = GroupScraper.classify_group(run_club_bio, "keepitrun_la", {"full_name": run_club_name})
    print(f"Run Club Test: {'✅ PASSED' if is_target else '❌ FAILED'} | {category} | {city} | Score: {score}")

    # 2. OC Social Club: Name match + Pipe Location
    social_bio = "A place to meet new friends. OC | LA"
    social_name = "Orange County Social Club"
    is_target, category, city, score = GroupScraper.classify_group(social_bio, "oc_social", {"full_name": social_name})
    print(f"Social Club Test: {'✅ PASSED' if is_target else '❌ FAILED'} | {category} | {city} | Score: {score}")

    # 3. Hiking Group: Keyword match
    hike_bio = "Exploring the trails of SoCal. Hiking adventures every Saturday."
    is_target, category, city, score = GroupScraper.classify_group(hike_bio, "socal_hikers", {"full_name": "SoCal Hikers"})
    print(f"Hiking Test: {'✅ PASSED' if is_target else '❌ FAILED'} | {category} | {city} | Score: {score}")
    
    # 4. Individual: "Run" in bio but not a club (should fail or be low confidence depending on tuning)
    # Actually, "Run Club" is the keyword. "Runner" is not.
    runner_bio = "Marathon Runner 🏃‍♂️ LA Based."
    is_target, category, city, score = GroupScraper.classify_group(runner_bio, "la_runner", {"full_name": "Mike Smith"})
    print(f"Individual Runner Test: {'✅ REJECTED (Expected)' if not is_target else '❌ PASSED (Unexpected)'} | {category} | {city} | Score: {score}")

    # 5. Non-Local Group
    ny_run_bio = "NYC's best run club. Central Park."
    is_target, category, city, score = GroupScraper.classify_group(ny_run_bio, "nyc_run_club", {"full_name": "NYC Run"})
    print(f"NY Run Club Test: {'✅ REJECTED (Expected)' if not is_target else '❌ PASSED (Unexpected)'} | {category} | {city} | Score: {score}")

if __name__ == "__main__":
    test_groups()
