import sys
import os
import time

# Add the current directory to Python path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app.pipeline import task_discover_hashtag
from sqlalchemy.orm import sessionmaker
from sqlalchemy import create_engine
from app.config import settings
from app.models import ScrapingRun

# DB Setup for Run ID
engine = create_engine(settings.DATABASE_URL)
Session = sessionmaker(bind=engine)

HASHTAG_TIERS = {
    "tier_1_macro_regional": [
        "LAFoodie", "LAEats", "LAFood", "LosAngelesFoodie",
        "LosAngelesFood", "EaterLA", "YelpLA", "InfatuationLA",
        "LATimesFood", "BestFoodLA", "DineLA", "LAFoodScene",
        # OC
        "OCFoodie", "OCEats", "OCFood", "OrangeCountyEats",
        "OCFoodies", "OCBrunch",
        # SD (NEW)
        "SanDiegoFood", "SDFoodie", "SanDiegoEats", "EaterSD",
        # Regional
        "SoCalFoodie", "SoCalEats", "SoCalFood",
        "CaliforniaFood", "WestCoastEats",
    ],
    
    "tier_2_micro_neighborhood": [
        # LA Neighborhoods
        "SGVFood", "626Eats", "626Foodie",
        "KoreatownEats", "KTownLA", "KTownFood",
        "DTLAFood", "DTLAEats", "DowntownLA",
        "SilverLakeFood", "EchoParkEats",
        "SantaMonicaEats", "VeniceFoodie",
        "WestHollywoodFood", "WeHoEats",
        "PasadenaEats", "GlendaleEats",
        "LongBeachEats", "LongBeachFood",
        # OC Neighborhoods
        "IrvineEats", "IrvineFoodie",
        "CostaMesaFood", "CostaMesaEats",
        "NewportBeachFood", "HuntingtonBeachEats",
        "LittleSaigonEats", "FullertonFoodie",
        "AnaheimFood", "TustinEats",
        # SD Neighborhoods (NEW)
        "NorthParkSD", "ConvoyDistrict", "ConvoyEats",
        "HillcrestSD", "GaslampSD", "LaJollaEats",
        # IE
        "InlandEmpireEats", "IEFoodie", "RiversideEats",
        "RedlandsEats", "ClaremontEats",
    ],
    
    "tier_3_venue_specific": [
        "SmorgasburgLA", "626NightMarket",
        "AnaheimPackingDistrict", "PackingDistrict",
        "GrandCentralMarket", "ROWDtla",
        "TheLab", "TheCamp", "SouthCoastPlaza",
        "SantaMonicaPier", "FarmersMarketLA",
        "OCNightMarket", "SanDiegoFoodFest",
    ],
    
    "tier_4_cultural_niche": [
        "TacoTuesdayLA", "TacosLA", "MexicanFoodLA",
        "KoreanFoodLA", "KBBQla", "RamenLA",
        "SushiLA", "AsianFoodLA", "VietFoodLA",
        "BajaMed", "CalMex",
        "VeganLA", "VeganOC", "VeganSD",
        "HalalLA", "HalalOC", "PlantBasedLA",
        "GlutenFreeLA", "HealthyEatsLA",
    ],
    
    "tier_5_temporal": [
        "SundayBrunchLA", "LABrunch", "OCBrunch",
        "LateNightEats", "LateNightLA",
        "BreakfastLA", "DinnerLA",
        "HappyHourLA", "HappyHourOC",
        "WeekendVibesLA", "DateNightLA",
    ],
    
    "tier_6_lifestyle": [
        "LALifestyle", "OCLifestyle", "SoCalLifestyle",
        "DayInMyLifeLA", "LAVlog", "OCVlog",
        "ThingsToDoLA", "ThingsToDoOC", "ThingsToDoSD",
        "LAWeekend", "OCWeekend", "ExploreLA", "ExploreOC",
        "LACoffee", "CoffeeLA", "CoffeeShopsLA",
        "OCCoffee", "CoffeeOC", "MatchaLA",
        "LACreator", "OCCreator", "SoCalCreator",
        "UGCLA", "UGCOC", "ContentCreatorLA",
    ],
    
    "tier_7_college_student": [
        "UCILife", "UCLALife", "USCLife",
        "UCIEats", "UCLAEats", "USCEats",
        "CSUFLife", "SDSULife",
        "CollegeEats", "StudentFoodie",
        "CollegeLifeLA", "CollegeLifeOC",
    ],
    
    "tier_8_community_groups": [
        "LARunClub", "LArunning", "RunLA", "RunKtown",
        "VeniceRunClub", "SilverLakeTrackClub", "KoreatownRunClub",
        "OCHiking", "SoCalHiking", "HikingLA",
        "LASocialClub", "SoCalMeetup", "LADateNight",
        "OCSocial", "SanDiegoRunClub", "SDHiking",
    ]
}

ALL_HASHTAGS = []
for tier in HASHTAG_TIERS.values():
    ALL_HASHTAGS.extend(tier)
ALL_HASHTAGS = sorted(list(set(ALL_HASHTAGS)))

print(f"Loaded {len(ALL_HASHTAGS)} Targeted Hashtags from V3.0 Spec.")

def create_run_record():
    session = Session()
    run = ScrapingRun(status="running")
    session.add(run)
    session.commit()
    run_id = run.id
    session.close()
    return run_id

if __name__ == "__main__":
    print("Starting 24/7 Scraper Service...")
    
    while True:
        # Create a new Run ID for this batch
        run_id = create_run_record()
        print(f"\n[{time.strftime('%Y-%m-%d %H:%M:%S')}] Triggering batch scrape (Run ID: {run_id})...")
    
        for tier_name, tags in HASHTAG_TIERS.items():
            # scrape_mode logic is not used in task_discover_hashtag currently, defaulting to standard discovery
            
            for tag in tags:
                print(f"Queuing task for #{tag}...")
                task_discover_hashtag.delay(tag, run_id)
            
        print("All tasks queued! Sleeping for 2 hours...")
        time.sleep(7200)
